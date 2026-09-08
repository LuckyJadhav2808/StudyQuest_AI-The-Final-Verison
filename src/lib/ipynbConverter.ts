/**
 * StudyQuest AI — Jupyter Notebook (.ipynb) v4 Converter
 * Handles bidirectional serialization between StudyQuest Notebook data structures
 * and the official Jupyter Notebook JSON format recognized by Google Colab and VS Code.
 */

import { Notebook, NotebookCell, NotebookOutput } from '@/types/notebook';

export function exportToIpynb(notebook: Notebook): string {
  const ipynbCells = notebook.cells.map((cell) => {
    // Split source into array of lines preserving \n
    const sourceLines = cell.source.split('\n').map((line, idx, arr) => 
      idx < arr.length - 1 ? line + '\n' : line
    );

    if (cell.cell_type === 'markdown') {
      return {
        cell_type: 'markdown',
        metadata: cell.metadata || {},
        source: sourceLines,
      };
    }

    // Process code cell outputs
    const outputs = cell.outputs.map((out) => {
      if (out.type === 'stream') {
        return {
          output_type: 'stream',
          name: out.name,
          text: out.text.split('\n').map((l, i, a) => (i < a.length - 1 ? l + '\n' : l)),
        };
      }
      if (out.type === 'display_data') {
        return {
          output_type: 'display_data',
          data: out.data,
          metadata: {},
        };
      }
      if (out.type === 'execute_result') {
        return {
          output_type: 'execute_result',
          execution_count: cell.execution_count || 1,
          data: out.data,
          metadata: {},
        };
      }
      if (out.type === 'error') {
        return {
          output_type: 'error',
          ename: out.ename,
          evalue: out.evalue,
          traceback: out.traceback,
        };
      }
      if (out.type === 'table') {
        // Fallback representation for interactive tables
        return {
          output_type: 'execute_result',
          execution_count: cell.execution_count || 1,
          data: {
            'text/plain': [`[DataFrame with ${out.totalRows} rows and ${out.totalCols} columns]`],
          },
          metadata: {},
        };
      }
      return null;
    }).filter(Boolean);

    return {
      cell_type: 'code',
      execution_count: cell.execution_count || null,
      metadata: cell.metadata || {},
      outputs,
      source: sourceLines,
    };
  });

  const ipynbObject = {
    cells: ipynbCells,
    metadata: {
      kernelspec: {
        display_name: 'Python 3 (Pyodide WASM)',
        language: 'python',
        name: 'python3',
      },
      language_info: {
        name: 'python',
        version: '3.12',
      },
      studyquest: {
        title: notebook.title,
        id: notebook.id,
        exportedAt: Date.now(),
      },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };

  return JSON.stringify(ipynbObject, null, 2);
}

export function importFromIpynb(jsonString: string, defaultTitle?: string): Notebook {
  const parsed = JSON.parse(jsonString);

  const title =
    parsed.metadata?.studyquest?.title ||
    defaultTitle ||
    'Imported Colab Notebook';

  const cells: NotebookCell[] = (parsed.cells || []).map((rawCell: any, index: number) => {
    const rawSource = Array.isArray(rawCell.source) ? rawCell.source.join('') : String(rawCell.source || '');
    const cellType = rawCell.cell_type === 'markdown' ? 'markdown' : 'code';

    const outputs: NotebookOutput[] = [];

    if (cellType === 'code' && Array.isArray(rawCell.outputs)) {
      for (const rawOut of rawCell.outputs) {
        if (rawOut.output_type === 'stream') {
          outputs.push({
            type: 'stream',
            name: rawOut.name || 'stdout',
            text: Array.isArray(rawOut.text) ? rawOut.text.join('') : String(rawOut.text || ''),
          });
        } else if (rawOut.output_type === 'display_data' || rawOut.output_type === 'execute_result') {
          if (rawOut.data) {
            outputs.push({
              type: rawOut.output_type,
              data: rawOut.data,
            });
          }
        } else if (rawOut.output_type === 'error') {
          outputs.push({
            type: 'error',
            ename: rawOut.ename || 'Error',
            evalue: rawOut.evalue || '',
            traceback: Array.isArray(rawOut.traceback) ? rawOut.traceback : [String(rawOut.evalue || '')],
          });
        }
      }
    }

    return {
      id: `cell_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
      cell_type: cellType,
      source: rawSource,
      execution_count: typeof rawCell.execution_count === 'number' ? rawCell.execution_count : null,
      outputs,
      metadata: rawCell.metadata || {},
      status: 'idle',
    };
  });

  return {
    id: `nb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    folderId: null,
    cells: cells.length > 0 ? cells : [
      {
        id: `cell_${Date.now()}_1`,
        cell_type: 'code',
        source: '# Welcome to your new Data Forge Notebook\nprint("Hello, StudyQuest Data Forge!")\n',
        execution_count: null,
        outputs: [],
        status: 'idle',
      }
    ],
    metadata: {
      kernelspec: {
        display_name: 'Python 3 (Pyodide WASM)',
        language: 'python',
        name: 'python3',
      },
      language_info: {
        name: 'python',
        version: '3.12',
      },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
