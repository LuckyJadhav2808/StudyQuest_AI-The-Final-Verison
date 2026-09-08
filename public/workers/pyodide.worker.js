/**
 * StudyQuest AI — Data Forge Python Web Worker (Pyodide Engine)
 * Runs off-thread CPython in WebAssembly with preloaded scientific libraries,
 * persistent global namespace, virtual file I/O, Matplotlib rendering, and DataFrame inspection.
 */

/* eslint-disable no-restricted-globals */
let pyodide = null;
let pyGlobals = null;
let isBusy = false;
let initPromise = null;

// Post message helper
function sendMsg(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

// Initialize Pyodide
async function initPyodide(loadPackages = true) {
  try {
    sendMsg('STATUS', { status: 'loading', message: 'Downloading Python WebAssembly core...' });

    // Load Pyodide CDN
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');

    pyodide = await self.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
    });

    sendMsg('STATUS', { status: 'loading', message: 'Setting up virtual workspace filesystem...' });

    // Setup working directory in Emscripten FS
    try {
      pyodide.FS.mkdir('/workspace');
    } catch (e) {
      // already exists
    }
    pyodide.FS.chdir('/workspace');

    // Restore persistent virtual files from IndexedDB
    try {
      await restoreAllPersistedFiles();
    } catch (e) {
      console.warn('[Pyodide Worker] VFS restore notice:', e);
    }

    // Create custom globals dictionary
    pyGlobals = pyodide.toPy({});

    // Setup Python stream redirectors and hooks
    sendMsg('STATUS', { status: 'loading', message: 'Configuring Python stream handlers & graphics...' });

    await pyodide.runPythonAsync(`
import sys, io, base64, os
try:
    os.chdir('/workspace')
except Exception:
    pass

class _JupyterStream(io.TextIOBase):
    def __init__(self, stream_name):
        self.stream_name = stream_name
    def write(self, s):
        if s:
            from js import postStreamChunk
            postStreamChunk(self.stream_name, s)
        return len(s)
    def flush(self):
        pass

_stdout_stream = _JupyterStream('stdout')
_stderr_stream = _JupyterStream('stderr')
sys.stdout = _stdout_stream
sys.stderr = _stderr_stream

def _extract_figures():
    try:
        import matplotlib.pyplot as plt
        figs = [plt.figure(n) for n in plt.get_fignums()]
        images = []
        for fig in figs:
            buf = io.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', dpi=140)
            buf.seek(0)
            images.append(base64.b64encode(buf.read()).decode('utf-8'))
            plt.close(fig)
        return images
    except Exception:
        return []

def _serialize_result(val):
    if val is None:
        return None
    try:
        import pandas as pd
        if isinstance(val, pd.DataFrame):
            preview = val.head(100)
            cols = [str(c) for c in preview.columns]
            rows = preview.values.tolist()
            clean_rows = []
            for r in rows:
                clean_rows.append([str(x) if x is not None and not isinstance(x, (int, float, bool, str)) else x for x in r])
            return {
                'is_dataframe': True,
                'columns': cols,
                'rows': clean_rows,
                'total_rows': len(val),
                'total_cols': len(val.columns)
            }
        if isinstance(val, pd.Series):
            df = val.reset_index()
            return _serialize_result(df)
    except Exception:
        pass
    return None

def _get_active_variables(g):
    vars_info = []
    for k, v in g.items():
        if k.startswith('_') or k in ('sys', 'io', 'base64', 'matplotlib', 'plt', 'json', 'postStreamChunk'):
            continue
        tname = type(v).__name__
        val_str = str(v)
        if len(val_str) > 100:
            val_str = val_str[:97] + '...'
        shape_str = ''
        if hasattr(v, 'shape'):
            shape_str = str(getattr(v, 'shape'))
        elif hasattr(v, '__len__'):
            try:
                shape_str = f"len: {len(v)}"
            except Exception:
                pass
        vars_info.append({
            'name': k,
            'type': tname,
            'value': val_str,
            'shape': shape_str
        })
    return vars_info
`, { globals: pyGlobals });

    // Expose postStreamChunk to JS
    self.postStreamChunk = (name, text) => {
      sendMsg('STREAM', { name, text });
    };

    if (loadPackages) {
      try {
        sendMsg('STATUS', { status: 'loading', message: 'Loading core DS & ML stack (NumPy, Pandas, Scikit-Learn, SciPy, Matplotlib)...' });
        await pyodide.loadPackage(['micropip', 'numpy', 'pandas', 'matplotlib', 'scipy', 'scikit-learn', 'joblib']);

        // Set Agg backend for Matplotlib
        await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
`, { globals: pyGlobals });

        // Preload Seaborn from PyPI
        try {
          sendMsg('STATUS', { status: 'loading', message: 'Preloading Seaborn...' });
          const micropip = pyodide.pyimport('micropip');
          await micropip.install(['seaborn']);
        } catch (pipErr) {
          console.warn('[Pyodide Worker] Seaborn auto-preload warning:', pipErr);
        }
      } catch (pkgErr) {
        console.error('[Pyodide Worker] Core packages load warning:', pkgErr);
      }
    }

    sendMsg('STATUS', { status: 'ready', message: 'Python 3.12 (WASM) is ready.' });
    sendMsg('INIT_SUCCESS');

    // Tier 2: Background Pre-Warming of Extended ML, Math, Graph, and Visualization Stack
    // Downloads and populates the browser's persistent disk cache without blocking user interaction
    if (loadPackages && pyodide) {
      setTimeout(async () => {
        try {
          await pyodide.loadPackage([
            'statsmodels',
            'networkx',
            'sympy',
            'pillow',
            'tqdm',
            'regex',
            'wordcloud',
            'nltk',
            'imageio',
          ]);
          try {
            const micropip = pyodide.pyimport('micropip');
            await micropip.install(['tabulate']);
          } catch {}
          console.log('[Pyodide Worker] Extended ML/DS libraries (Statsmodels, NetworkX, SymPy, Pillow, TQDM, NLTK, WordCloud, Tabulate) pre-warmed successfully.');
        } catch (extErr) {
          console.warn('[Pyodide Worker] Extended background pre-warm notice:', extErr);
        }
      }, 500);
    }
  } catch (err) {
    console.error('[Pyodide Worker] Init Error:', err);
    sendMsg('STATUS', { status: 'error', message: err?.message || 'Failed to load Pyodide runtime.' });
  }
}

// Run code cell
async function runCode(requestId, cellId, code, isRetry = false) {
  if (initPromise) {
    try {
      await initPromise;
    } catch {
      // Ignored
    }
  }

  if (!pyodide) {
    sendMsg('RUN_ERROR', {
      requestId,
      cellId,
      error: 'Kernel is initializing. Please wait a moment.',
      ename: 'RuntimeError',
      evalue: 'Python WebAssembly kernel is still initializing.',
      traceback: ['Kernel is initializing. Please wait a moment.'],
    });
    return;
  }

  isBusy = true;
  sendMsg('STATUS', { status: 'busy' });
  const startTime = Date.now();

  try {
    let execCode = code;

    // 1. Check and handle !pip install or %pip install lines without syntax errors
    if (code.includes('pip install')) {
      const lines = code.split('\n');
      const cleanLines = [];
      for (const line of lines) {
        const match = line.match(/^[!%]pip\s+install\s+(.+)$/);
        if (match) {
          const packages = match[1].split(' ').filter(Boolean);
          sendMsg('STREAM', { name: 'stdout', text: `Installing ${packages.join(', ')} via micropip...\n` });
          try {
            const micropip = pyodide.pyimport('micropip');
            await micropip.install(packages);
            sendMsg('STREAM', { name: 'stdout', text: `Successfully installed ${packages.join(', ')}!\n` });
          } catch (pipErr) {
            sendMsg('STREAM', { name: 'stderr', text: `Failed to install ${packages.join(', ')}: ${pipErr.message}\n` });
          }
          cleanLines.push(`# ${line}  # executed via micropip`);
        } else {
          cleanLines.push(line);
        }
      }
      execCode = cleanLines.join('\n');
    }

    // 2. Automatically inspect and auto-load any imported packages (like seaborn, scikit-learn, joblib, etc.)
    try {
      await pyodide.loadPackagesFromImports(execCode, {
        messageCallback: (msg) => {
          sendMsg('STREAM', { name: 'stdout', text: `[WASM Package Manager] ${msg}\n` });
        },
      });
    } catch (loadErr) {
      // Ignored: If package is not on Pyodide CDN, let Python runtime or micropip report standard import error
    }

    // 3. Execute Python code in persistent globals
    const resultProxy = await pyodide.runPythonAsync(execCode, { globals: pyGlobals });

    // Check for Matplotlib plots
    const figuresProxy = await pyodide.runPythonAsync('_extract_figures()', { globals: pyGlobals });
    const images = figuresProxy ? figuresProxy.toJs() : [];
    if (figuresProxy && typeof figuresProxy.destroy === 'function') figuresProxy.destroy();

    // Check for DataFrame or rich tabular output
    let tableData = null;
    let plainText = null;

    if (resultProxy !== undefined) {
      try {
        pyGlobals.set('_last_result', resultProxy);
        const serializedProxy = await pyodide.runPythonAsync('_serialize_result(_last_result)', { globals: pyGlobals });
        if (serializedProxy) {
          const serialized = serializedProxy.toJs({ dict_converter: Object.fromEntries });
          if (serialized?.is_dataframe) {
            tableData = {
              type: 'table',
              columns: serialized.columns,
              rows: serialized.rows,
              totalRows: serialized.total_rows,
              totalCols: serialized.total_cols,
            };
          }
          if (typeof serializedProxy.destroy === 'function') serializedProxy.destroy();
        }

        if (!tableData) {
          plainText = String(resultProxy);
          if (plainText === 'None') plainText = null;
        }
      } catch (e) {
        plainText = String(resultProxy);
      } finally {
        if (typeof resultProxy?.destroy === 'function') resultProxy.destroy();
      }
    }

    const duration = Date.now() - startTime;

    sendMsg('RUN_SUCCESS', {
      requestId,
      cellId,
      images,
      tableData,
      plainText,
      executionTimeMs: duration,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const fullMsg = err?.message || String(err);
    const lines = fullMsg.trim().split('\n');

    // Auto-Healing: ModuleNotFoundError retry loop
    const moduleMatch = fullMsg.match(/No module named ['"]([^'"]+)['"]/);
    if (moduleMatch && !isRetry) {
      const missingPkg = moduleMatch[1].split('.')[0];
      const builtins = ['sys', 'os', 'math', 'time', 'json', 'io', 're', 'copy', 'typing'];
      if (!builtins.includes(missingPkg)) {
        sendMsg('STREAM', {
          name: 'stdout',
          text: `\n[📦 Auto-Resolver] Missing module '${missingPkg}' detected. Auto-installing from PyPI via micropip...\n`,
        });
        try {
          const micropip = pyodide.pyimport('micropip');
          await micropip.install(missingPkg);
          sendMsg('STREAM', {
            name: 'stdout',
            text: `[📦 Auto-Resolver] Successfully installed '${missingPkg}'! Re-running cell...\n\n`,
          });
          return await runCode(requestId, cellId, code, true);
        } catch (installErr) {
          sendMsg('STREAM', {
            name: 'stderr',
            text: `[📦 Auto-Resolver] Auto-install failed for '${missingPkg}': ${installErr?.message || installErr}\n`,
          });
        }
      }
    }

    // Extract exact exception name and error message from Python traceback
    let ename = 'PythonError';
    let evalue = fullMsg;
    const lastLine = lines[lines.length - 1] || '';
    if (lastLine.includes(':')) {
      const idx = lastLine.indexOf(':');
      ename = lastLine.slice(0, idx).trim();
      evalue = lastLine.slice(idx + 1).trim();
    } else if (lastLine) {
      ename = lastLine.trim();
      evalue = '';
    }

    sendMsg('RUN_ERROR', {
      requestId,
      cellId,
      error: fullMsg,
      ename,
      evalue,
      traceback: lines,
      executionTimeMs: duration,
    });
  } finally {
    isBusy = false;
    sendMsg('STATUS', { status: 'ready' });
  }
}

// Variable Inspector
async function getVariables(requestId) {
  if (!pyodide || !pyGlobals) {
    sendMsg('VARIABLES_RESULT', { requestId, variables: [] });
    return;
  }
  try {
    const varsProxy = await pyodide.runPythonAsync('_get_active_variables(globals())', { globals: pyGlobals });
    const vars = varsProxy ? varsProxy.toJs() : [];
    if (varsProxy && typeof varsProxy.destroy === 'function') varsProxy.destroy();
    sendMsg('VARIABLES_RESULT', { requestId, variables: vars });
  } catch (err) {
    sendMsg('VARIABLES_RESULT', { requestId, variables: [] });
  }
}

// Package Manager Handlers
async function getPackages(requestId) {
  if (!pyodide) {
    sendMsg('PACKAGES_RESULT', { requestId, packages: [] });
    return;
  }
  try {
    const listProxy = await pyodide.runPythonAsync(`
import importlib.metadata
_pkgs = []
for dist in importlib.metadata.distributions():
    _pkgs.append({
        'name': dist.metadata['Name'],
        'version': dist.version,
    })
_pkgs.sort(key=lambda x: x['name'].lower())
_pkgs
`, { globals: pyGlobals });
    const pkgs = listProxy ? listProxy.toJs() : [];
    if (listProxy && typeof listProxy.destroy === 'function') listProxy.destroy();
    sendMsg('PACKAGES_RESULT', { requestId, packages: pkgs });
  } catch (err) {
    const loaded = Object.keys(pyodide.loadedPackages || {}).map((p) => ({ name: p, version: 'installed' }));
    sendMsg('PACKAGES_RESULT', { requestId, packages: loaded });
  }
}

async function installPackage(requestId, name) {
  if (!pyodide) {
    sendMsg('PACKAGE_INSTALL_ERROR', { requestId, error: 'Kernel is not initialized.' });
    return;
  }
  try {
    sendMsg('STREAM', { name: 'stdout', text: `Installing '${name}' via micropip...\n` });
    const micropip = pyodide.pyimport('micropip');
    await micropip.install(name);
    sendMsg('STREAM', { name: 'stdout', text: `Successfully installed '${name}'! ✅\n` });
    sendMsg('PACKAGE_INSTALL_SUCCESS', { requestId, name });
    await getPackages(requestId);
  } catch (err) {
    sendMsg('STREAM', { name: 'stderr', text: `Failed to install '${name}': ${err?.message || err}\n` });
    sendMsg('PACKAGE_INSTALL_ERROR', { requestId, name, error: err?.message || 'Installation failed' });
  }
}

// Virtual File System Handlers
function listFiles(requestId) {
  if (!pyodide) {
    sendMsg('FILES_LIST_RESULT', { requestId, files: [] });
    return;
  }
  try {
    const entries = pyodide.FS.readdir('/workspace');
    const files = [];
    for (const name of entries) {
      if (name === '.' || name === '..') continue;
      const stat = pyodide.FS.stat(`/workspace/${name}`);
      const isDir = pyodide.FS.isDir(stat.mode);
      files.push({
        name,
        path: `/workspace/${name}`,
        size: stat.size,
        type: isDir ? 'directory' : 'file',
        updatedAt: stat.mtime ? new Date(stat.mtime).getTime() : Date.now(),
        extension: name.includes('.') ? name.split('.').pop() : '',
      });
    }
    sendMsg('FILES_LIST_RESULT', { requestId, files });
  } catch (err) {
    sendMsg('FILES_LIST_RESULT', { requestId, files: [] });
  }
}

// --- Persistent IndexedDB VFS Store ---
const VFS_DB_NAME = 'studyquest_notebook_vfs';
const VFS_DB_VERSION = 1;
const VFS_STORE_NAME = 'virtual_files';

function openVfsDb() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(null);
    }
    try {
      const req = indexedDB.open(VFS_DB_NAME, VFS_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(VFS_STORE_NAME)) {
          db.createObjectStore(VFS_STORE_NAME, { keyPath: 'name' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function persistFileToDb(name, data, isBinary) {
  try {
    const db = await openVfsDb();
    if (!db) return;
    const tx = db.transaction(VFS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(VFS_STORE_NAME);
    const storedData = data instanceof Uint8Array ? data.buffer : data;
    store.put({
      name,
      data: storedData,
      isBinary: Boolean(isBinary),
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn('[VFS DB] Failed to persist file:', name, e);
  }
}

async function removeFileFromDb(name) {
  try {
    const db = await openVfsDb();
    if (!db) return;
    const tx = db.transaction(VFS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(VFS_STORE_NAME);
    store.delete(name);
  } catch (e) {
    console.warn('[VFS DB] Failed to delete file:', name, e);
  }
}

async function restoreAllPersistedFiles() {
  try {
    const db = await openVfsDb();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(VFS_STORE_NAME, 'readonly');
      const store = tx.objectStore(VFS_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const files = req.result || [];
        for (const f of files) {
          try {
            if (f.isBinary) {
              pyodide.FS.writeFile(`/workspace/${f.name}`, new Uint8Array(f.data));
            } else {
              pyodide.FS.writeFile(`/workspace/${f.name}`, f.data);
            }
          } catch (writeErr) {
            console.warn('[VFS DB] Failed to restore file:', f.name, writeErr);
          }
        }
        if (files.length > 0) {
          console.log(`[Pyodide Worker] Successfully restored ${files.length} workspace file(s) from IndexedDB.`);
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('[VFS DB] Error restoring files:', e);
  }
}

async function writeFile(requestId, name, data, isBinary = false) {
  if (!pyodide) return;
  try {
    if (isBinary) {
      pyodide.FS.writeFile(`/workspace/${name}`, new Uint8Array(data));
    } else {
      pyodide.FS.writeFile(`/workspace/${name}`, data);
    }
    // Persist to IndexedDB so it survives browser refreshes
    await persistFileToDb(name, data, isBinary);
    sendMsg('FILE_WRITE_SUCCESS', { requestId, name });
    listFiles(requestId);
  } catch (err) {
    sendMsg('FILE_OP_ERROR', { requestId, error: err?.message || 'Failed to write file.' });
  }
}

function readFile(requestId, name, isBinary = false) {
  if (!pyodide) return;
  try {
    const content = isBinary
      ? pyodide.FS.readFile(`/workspace/${name}`, { encoding: 'binary' })
      : pyodide.FS.readFile(`/workspace/${name}`, { encoding: 'utf8' });
    sendMsg('FILE_READ_RESULT', { requestId, name, content, isBinary });
  } catch (err) {
    sendMsg('FILE_OP_ERROR', { requestId, error: err?.message || 'Failed to read file.' });
  }
}

async function deleteFile(requestId, name) {
  if (!pyodide) return;
  try {
    pyodide.FS.unlink(`/workspace/${name}`);
    // Permanently remove from IndexedDB
    await removeFileFromDb(name);
    sendMsg('FILE_DELETE_SUCCESS', { requestId, name });
    listFiles(requestId);
  } catch (err) {
    sendMsg('FILE_OP_ERROR', { requestId, error: err?.message || 'Failed to delete file.' });
  }
}

// Reset runtime namespace
async function resetKernel(requestId) {
  if (!pyodide) return;
  try {
    await pyodide.runPythonAsync(`
# Clear custom non-internal variables
_keys = [k for k in list(globals().keys()) if not k.startswith('_') and k not in ('sys', 'io', 'base64', 'matplotlib', 'plt', 'json', 'postStreamChunk', '_extract_figures', '_serialize_result', '_get_active_variables')]
for k in _keys:
    del globals()[k]
`, { globals: pyGlobals });
    sendMsg('RESET_SUCCESS', { requestId });
    sendMsg('STATUS', { status: 'ready', message: 'Kernel variables reset.' });
  } catch (err) {
    sendMsg('STATUS', { status: 'error', message: err?.message || 'Failed to reset kernel.' });
  }
}

// Message Router
self.onmessage = async (e) => {
  const { type, requestId, ...data } = e.data || {};
  switch (type) {
    case 'INIT':
      initPromise = initPyodide(data.loadPackages !== false);
      await initPromise;
      break;
    case 'RUN_CODE':
      if (initPromise) {
        try {
          await initPromise;
        } catch {}
      }
      await runCode(requestId, data.cellId, data.code);
      break;
    case 'GET_VARIABLES':
      await getVariables(requestId);
      break;
    case 'GET_PACKAGES':
      await getPackages(requestId);
      break;
    case 'INSTALL_PACKAGE':
      await installPackage(requestId, data.name);
      break;
    case 'LIST_FILES':
      listFiles(requestId);
      break;
    case 'WRITE_FILE':
      writeFile(requestId, data.name, data.data, data.isBinary);
      break;
    case 'READ_FILE':
      readFile(requestId, data.name, data.isBinary);
      break;
    case 'DELETE_FILE':
      deleteFile(requestId, data.name);
      break;
    case 'RESET_KERNEL':
      await resetKernel(requestId);
      break;
    default:
      break;
  }
};
