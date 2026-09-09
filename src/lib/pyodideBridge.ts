/**
 * StudyQuest AI — Data Forge Python Bridge Client
 * Manages the Pyodide Web Worker, cell execution promises, streaming outputs,
 * hard kernel interrupts (worker termination), and virtual file system sync.
 */

import { KernelStatus, VariableInfo, VirtualFile, TableOutput, InstalledPackage } from '@/types/notebook';

export interface ExecutionResponse {
  cellId: string;
  images: string[];
  tableData: TableOutput | null;
  plainText: string | null;
  executionTimeMs: number;
  error?: string;
  traceback?: string[];
}

type StatusListener = (status: KernelStatus, message?: string) => void;
type StreamListener = (name: 'stdout' | 'stderr', text: string) => void;

class PyodideBridgeManager {
  private worker: Worker | null = null;
  private status: KernelStatus = 'unloaded';
  private statusMessage: string = '';
  private statusListeners: Set<StatusListener> = new Set();
  private streamListeners: Set<StreamListener> = new Set();
  private pendingRequests: Map<string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private isClient: boolean = typeof window !== 'undefined';

  constructor() {
    // Lazy initialized when first accessed or mounted in browser
  }

  public getStatus(): { status: KernelStatus; message: string } {
    return { status: this.status, message: this.statusMessage };
  }

  public onStatusChange(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    fn(this.status, this.statusMessage);
    return () => this.statusListeners.delete(fn);
  }

  public onStream(fn: StreamListener): () => void {
    this.streamListeners.add(fn);
    return () => this.streamListeners.delete(fn);
  }

  private initPromise: Promise<void> | null = null;

  private setStatus(status: KernelStatus, message: string = '') {
    this.status = status;
    this.statusMessage = message;
    this.statusListeners.forEach((fn) => fn(status, message));
  }

  public init(): Promise<void> {
    if (!this.isClient) return Promise.resolve();
    if (this.status === 'ready') return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.setStatus('loading', 'Spawning Python Web Worker...');
        this.worker = new Worker('/workers/pyodide.worker.js');

        this.worker.onmessage = (e: MessageEvent) => {
          this.handleWorkerMessage(e);
        };

        this.worker.onerror = async (err) => {
          console.error('[Pyodide Bridge] Worker Error:', err);
          const isOomOrFatal =
            err?.message?.includes('memory') ||
            err?.message?.includes('out of bounds') ||
            err?.message?.includes('aborted') ||
            err?.message?.includes('unhandled');

          if (this.status === 'ready' || this.status === 'busy') {
            await this.recoverKernel(
              isOomOrFatal
                ? 'Kernel auto-recovered from memory limit / WASM crash. Files & code are safe.'
                : 'Kernel auto-recovered from unexpected worker crash.'
            );
          } else {
            this.setStatus('error', err.message || 'Worker initialization failed');
            this.initPromise = null;
            reject(err);
          }
        };

        // Listen for initial ready signal
        const initListener = (status: KernelStatus) => {
          if (status === 'ready') {
            this.statusListeners.delete(initListener);
            resolve();
          } else if (status === 'error') {
            this.statusListeners.delete(initListener);
            this.initPromise = null;
            reject(new Error(this.statusMessage || 'Kernel initialization failed'));
          }
        };
        this.statusListeners.add(initListener);

        this.worker.postMessage({ type: 'INIT', loadPackages: true });
      } catch (err: any) {
        this.setStatus('error', err?.message || 'Failed to construct Web Worker');
        this.initPromise = null;
        reject(err);
      }
    });

    return this.initPromise;
  }

  private handleWorkerMessage(e: MessageEvent) {
    const { type, requestId, ...data } = e.data || {};

    switch (type) {
      case 'STATUS':
        this.setStatus(data.status, data.message || '');
        break;

      case 'STREAM':
        if (data.name === 'stderr') {
          const filtered = (data.text || '')
            .split('\n')
            .filter((line: string) => !line.includes('non-GUI backend') && !line.includes('currently using agg'))
            .join('\n');
          if (filtered.trim().length > 0) {
            this.streamListeners.forEach((fn) => fn(data.name, filtered));
          }
        } else {
          this.streamListeners.forEach((fn) => fn(data.name, data.text));
        }
        break;

      case 'RUN_SUCCESS':
        if (requestId && this.pendingRequests.has(requestId)) {
          const req = this.pendingRequests.get(requestId)!;
          this.pendingRequests.delete(requestId);
          req.resolve(data);
        }
        break;

      case 'RUN_ERROR':
        if (requestId && this.pendingRequests.has(requestId)) {
          const req = this.pendingRequests.get(requestId)!;
          this.pendingRequests.delete(requestId);
          req.reject(data);

          // Detect fatal Emscripten runtime abort or OOM
          const errMsg = data.error || '';
          if (
            errMsg.includes('memory access out of bounds') ||
            errMsg.includes('Cannot enlarge memory arrays') ||
            errMsg.includes('Aborted(native code called abort())')
          ) {
            this.recoverKernel(
              'Kernel auto-recovered from fatal WASM memory limit. Your code & files in /workspace are preserved.'
            ).catch(() => {});
          }
        }
        break;

      case 'VARIABLES_RESULT':
      case 'PACKAGES_RESULT':
      case 'PACKAGE_INSTALL_SUCCESS':
      case 'FILES_LIST_RESULT':
      case 'FILE_READ_RESULT':
      case 'FILE_WRITE_SUCCESS':
      case 'FILE_DELETE_SUCCESS':
      case 'RESET_SUCCESS':
        if (requestId && this.pendingRequests.has(requestId)) {
          const req = this.pendingRequests.get(requestId)!;
          this.pendingRequests.delete(requestId);
          req.resolve(data);
        }
        break;

      case 'PACKAGE_INSTALL_ERROR':
      case 'FILE_OP_ERROR':
        if (requestId && this.pendingRequests.has(requestId)) {
          const req = this.pendingRequests.get(requestId)!;
          this.pendingRequests.delete(requestId);
          req.reject(new Error(data.error));
        }
        break;

      default:
        break;
    }
  }

  private executionQueue: Promise<any> = Promise.resolve();

  public executeCell(
    cellId: string,
    code: string,
    onStream?: (name: 'stdout' | 'stderr', text: string) => void
  ): Promise<ExecutionResponse> {
    const task = async (): Promise<ExecutionResponse> => {
      if (!this.worker || this.status !== 'ready') {
        await this.init();
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      let removeStreamListener: (() => void) | null = null;
      if (onStream) {
        removeStreamListener = this.onStream(onStream);
      }

      try {
        return await new Promise<ExecutionResponse>((resolve, reject) => {
          this.pendingRequests.set(requestId, { resolve, reject });
          this.worker!.postMessage({
            type: 'RUN_CODE',
            requestId,
            cellId,
            code,
          });
        });
      } finally {
        if (removeStreamListener) removeStreamListener();
      }
    };

    // Chain into FIFO sequential queue
    const result = this.executionQueue.then(task, task);
    this.executionQueue = result.catch(() => {});
    return result;
  }

  public async interrupt(): Promise<void> {
    if (!this.worker) return;

    // Hard kill running worker to break infinite loops
    this.worker.terminate();
    this.worker = null;
    this.initPromise = null;
    this.pendingRequests.forEach((req) => req.reject({ error: 'Kernel was interrupted by user.' }));
    this.pendingRequests.clear();

    this.setStatus('unloaded', 'Kernel interrupted. Re-initializing...');
    await this.init();
  }

  public async recoverKernel(reason = 'Kernel auto-recovered from unexpected crash.'): Promise<void> {
    console.warn('[Pyodide Bridge] Initiating kernel auto-recovery:', reason);
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
    this.initPromise = null;

    // Fail in-flight pending requests with an informative message
    this.pendingRequests.forEach((req) => {
      req.reject({
        error: reason,
        ename: 'KernelRecoveryNotice',
        evalue: reason,
        traceback: [
          reason,
          'The Python WebAssembly worker was automatically restarted.',
          'Your notebook code and virtual files in /workspace remain intact.',
        ],
      });
    });
    this.pendingRequests.clear();

    this.setStatus('loading', 'Auto-recovering Python kernel...');
    try {
      await this.init();
      this.setStatus('ready', reason);
    } catch {
      this.setStatus('error', 'Kernel auto-recovery failed. Please refresh the page.');
    }
  }

  public async resetKernel(): Promise<void> {
    if (!this.worker) return;
    const requestId = `reset_${Date.now()}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.worker!.postMessage({ type: 'RESET_KERNEL', requestId });
    });
  }

  public async getVariables(): Promise<VariableInfo[]> {
    if (!this.worker || this.status !== 'ready') return [];
    const requestId = `vars_${Date.now()}`;
    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, {
        resolve: (data) => resolve(data.variables || []),
        reject: () => resolve([]),
      });
      this.worker!.postMessage({ type: 'GET_VARIABLES', requestId });
    });
  }

  public async getPackages(): Promise<InstalledPackage[]> {
    if (!this.worker || (this.status !== 'ready' && this.status !== 'busy')) return [];
    const requestId = `pkgs_${Date.now()}`;
    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, {
        resolve: (data) => resolve(data.packages || []),
        reject: () => resolve([]),
      });
      this.worker!.postMessage({ type: 'GET_PACKAGES', requestId });
    });
  }

  public async installPackage(name: string): Promise<void> {
    if (!this.worker) await this.init();
    const requestId = `install_${Date.now()}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve: () => resolve(),
        reject: (err) => reject(new Error(err?.error || 'Package installation failed')),
      });
      this.worker!.postMessage({ type: 'INSTALL_PACKAGE', requestId, name });
    });
  }

  public async listFiles(): Promise<VirtualFile[]> {
    if (!this.worker) return [];
    const requestId = `files_${Date.now()}`;
    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, {
        resolve: (data) => resolve(data.files || []),
        reject: () => resolve([]),
      });
      this.worker!.postMessage({ type: 'LIST_FILES', requestId });
    });
  }

  public async writeFile(name: string, data: string | ArrayBuffer, isBinary = false): Promise<void> {
    if (!this.worker) await this.init();
    const requestId = `write_${Date.now()}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.worker!.postMessage({
        type: 'WRITE_FILE',
        requestId,
        name,
        data,
        isBinary,
      });
    });
  }

  public async readFile(name: string, isBinary = false): Promise<any> {
    if (!this.worker) return null;
    const requestId = `read_${Date.now()}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve: (d) => resolve(d.content), reject });
      this.worker!.postMessage({
        type: 'READ_FILE',
        requestId,
        name,
        isBinary,
      });
    });
  }

  public async deleteFile(name: string): Promise<void> {
    if (!this.worker) return;
    const requestId = `del_${Date.now()}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.worker!.postMessage({
        type: 'DELETE_FILE',
        requestId,
        name,
      });
    });
  }
}

// Export singleton instance
export const pyodideBridge = new PyodideBridgeManager();
