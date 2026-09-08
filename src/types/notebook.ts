// ============================================================
// StudyQuest AI — Data Forge / Python Notebook Type Definitions
// Compliant with Jupyter Notebook .ipynb v4 Specification
// ============================================================

export type CellType = 'code' | 'markdown';

export type OutputType = 'stream' | 'display_data' | 'execute_result' | 'error' | 'table';

export interface StreamOutput {
  type: 'stream';
  name: 'stdout' | 'stderr';
  text: string;
}

export interface DisplayDataOutput {
  type: 'display_data';
  data: {
    'image/png'?: string;
    'image/jpeg'?: string;
    'image/svg+xml'?: string;
    'text/html'?: string;
    'text/plain'?: string;
    'application/json'?: any;
  };
}

export interface ExecuteResultOutput {
  type: 'execute_result';
  execution_count?: number;
  data: {
    'text/plain'?: string;
    'text/html'?: string;
    'image/png'?: string;
    'application/json'?: any;
  };
}

export interface ErrorOutput {
  type: 'error';
  ename: string;
  evalue: string;
  traceback: string[];
}

export interface TableOutput {
  type: 'table';
  columns: string[];
  rows: (string | number | boolean | null)[][];
  totalRows: number;
  totalCols: number;
}

export type NotebookOutput = StreamOutput | DisplayDataOutput | ExecuteResultOutput | ErrorOutput | TableOutput;

export interface NotebookCell {
  id: string;
  cell_type: CellType;
  source: string;
  execution_count: number | null;
  outputs: NotebookOutput[];
  executionTimeMs?: number;
  status?: 'idle' | 'running' | 'success' | 'error';
  metadata?: Record<string, any>;
}

export interface NotebookFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  title: string;
  folderId: string | null;
  cells: NotebookCell[];
  metadata: {
    kernelspec: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info: {
      name: string;
      version: string;
    };
  };
  createdAt: number;
  updatedAt: number;
}

export interface VirtualFile {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  updatedAt: number;
  extension?: string;
}

export interface VariableInfo {
  name: string;
  type: string;
  value: string;
  shape?: string;
}

export interface InstalledPackage {
  name: string;
  version: string;
}

export type KernelStatus = 'unloaded' | 'loading' | 'ready' | 'busy' | 'error';
