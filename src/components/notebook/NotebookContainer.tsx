/**
 * StudyQuest AI — Data Forge Master Notebook Container
 * Integrates header, collapsible sidebar, cell execution engine,
 * keyboard shortcuts, streaming outputs, and AI traceback explanation.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNotebooks } from '@/hooks/useNotebooks';
import { pyodideBridge, ExecutionResponse } from '@/lib/pyodideBridge';
import { exportToIpynb, importFromIpynb } from '@/lib/ipynbConverter';
import { KernelStatus, NotebookCell as INotebookCell, CellType, StreamOutput } from '@/types/notebook';
import NotebookHeader from './NotebookHeader';
import NotebookSidebar from './NotebookSidebar';
import NotebookCell from './NotebookCell';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { HiMenuAlt2, HiSparkles, HiPlus, HiPlay } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { askSmartAI } from '@/lib/geminiNano';

export default function NotebookContainer() {
  const {
    notebooks,
    folders,
    activeNotebook,
    activeNotebookId,
    setActiveNotebookId,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    duplicateNotebook,
    createFolder,
    deleteFolder,
    addCell,
    updateCell,
    deleteCell,
    moveCell,
    duplicateCell,
    clearOutputs,
  } = useNotebooks();

  const [kernelStatus, setKernelStatus] = useState<KernelStatus>('unloaded');
  const [kernelMessage, setKernelMessage] = useState<string>('');
  const [selectedCellId, setSelectedCellId] = useState<string>(activeNotebook.cells[0]?.id || '');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // AI Traceback Assistant Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEngine, setAiEngine] = useState<'nano' | 'cloud'>('cloud');

  // AI Auto-Fix State
  const [autoFixModalOpen, setAutoFixModalOpen] = useState(false);
  const [autoFixCellId, setAutoFixCellId] = useState<string | null>(null);
  const [autoFixLoading, setAutoFixLoading] = useState(false);
  const [autoFixFixedCode, setAutoFixFixedCode] = useState('');
  const [autoFixExplanation, setAutoFixExplanation] = useState('');

  // Ref to track currently executing cell for stream chunks
  const activeRunningCellIdRef = useRef<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const cellsContainerRef = useRef<HTMLDivElement>(null);

  // 1. Initialize Pyodide & listen to status
  useEffect(() => {
    const unsubStatus = pyodideBridge.onStatusChange((status, msg) => {
      setKernelStatus(status);
      if (msg) setKernelMessage(msg);
    });

    // Start loading Pyodide in background worker
    pyodideBridge.init().catch(() => {});

    return () => {
      unsubStatus();
    };
  }, []);

  // Helper to append stdout/stderr stream chunks
  const appendStreamChunk = (outputs: any[], name: 'stdout' | 'stderr', text: string) => {
    const next = [...outputs];
    const last = next[next.length - 1];
    if (last && last.type === 'stream' && last.name === name) {
      next[next.length - 1] = { ...last, text: last.text + text };
    } else {
      next.push({ type: 'stream', name, text } as StreamOutput);
    }
    return next;
  };

  // 2. Execute a single cell
  const executeCell = useCallback(
    async (cellId: string) => {
      const cell = activeNotebook.cells.find((c) => c.id === cellId);
      if (!cell || cell.cell_type !== 'code') return;

      activeRunningCellIdRef.current = cellId;
      let cellOutputs: any[] = [];

      // Clear previous outputs & set status to running
      updateCell(activeNotebook.id, cellId, {
        status: 'running',
        outputs: [],
        executionTimeMs: undefined,
      });

      try {
        const res: ExecutionResponse = await pyodideBridge.executeCell(
          cellId,
          cell.source,
          (name, text) => {
            cellOutputs = appendStreamChunk(cellOutputs, name, text);
            updateCell(activeNotebook.id, cellId, {
              outputs: [...cellOutputs],
            });
          }
        );

        // Append Matplotlib plots
        if (res.images && res.images.length > 0) {
          res.images.forEach((img) => {
            cellOutputs.push({
              type: 'display_data',
              data: { 'image/png': img },
            });
          });
        }

        // Append Pandas DataFrame or structured table
        if (res.tableData) {
          cellOutputs.push({
            type: 'table',
            columns: res.tableData.columns,
            rows: res.tableData.rows,
            totalRows: res.tableData.totalRows,
            totalCols: res.tableData.totalCols,
          });
        }

        // Append plain text expression evaluation
        if (res.plainText) {
          cellOutputs.push({
            type: 'execute_result',
            execution_count: (activeNotebook.cells.filter((c) => c.execution_count).length || 0) + 1,
            data: { 'text/plain': [res.plainText] },
          });
        }

        // Next execution count
        const maxExec = Math.max(0, ...activeNotebook.cells.map((c) => c.execution_count || 0));

        updateCell(activeNotebook.id, cellId, {
          status: 'success',
          execution_count: maxExec + 1,
          outputs: cellOutputs,
          executionTimeMs: res.executionTimeMs,
        });
      } catch (err: any) {
        cellOutputs.push({
          type: 'error',
          ename: err.ename || err.error?.split(':')?.[0] || 'PythonError',
          evalue: err.evalue || err.error || 'Execution failed',
          traceback: err.traceback || [err.error || 'Execution failed'],
        });

        updateCell(activeNotebook.id, cellId, {
          status: 'error',
          outputs: cellOutputs,
          executionTimeMs: err.executionTimeMs,
        });
      } finally {
        activeRunningCellIdRef.current = null;
      }
    },
    [activeNotebook.id, activeNotebook.cells, updateCell]
  );

  // 3. Run and advance / insert handlers
  const handleRunAndAdvance = useCallback(
    async (cellId: string) => {
      await executeCell(cellId);
      const currentIdx = activeNotebook.cells.findIndex((c) => c.id === cellId);
      if (currentIdx < activeNotebook.cells.length - 1) {
        setSelectedCellId(activeNotebook.cells[currentIdx + 1].id);
      } else {
        // At bottom: auto-create new cell and focus it
        addCell(activeNotebook.id, 'code', cellId);
      }
    },
    [executeCell, activeNotebook.cells, activeNotebook.id, addCell]
  );

  const handleRunAndInsert = useCallback(
    async (cellId: string) => {
      await executeCell(cellId);
      addCell(activeNotebook.id, 'code', cellId);
    },
    [executeCell, activeNotebook.id, addCell]
  );

  // 4. Run All Cells in sequential order
  const handleRunAll = useCallback(async () => {
    toast('Running all cells...', { icon: '▶️' });
    for (const cell of activeNotebook.cells) {
      if (cell.cell_type === 'code') {
        setSelectedCellId(cell.id);
        await executeCell(cell.id);
      }
    }
    toast.success('All cells finished running! ✅');
  }, [activeNotebook.cells, executeCell]);

  const handleRestartAndRunAll = useCallback(async () => {
    const toastId = toast.loading('Restarting runtime and running all cells...');
    try {
      await pyodideBridge.resetKernel();
      clearOutputs(activeNotebook.id);
      for (const cell of activeNotebook.cells) {
        if (cell.cell_type === 'code') {
          await executeCell(cell.id);
        }
      }
      toast.success('Kernel restarted & all cells executed! ⚡', { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || 'Execution failed', { id: toastId });
    }
  }, [activeNotebook.cells, activeNotebook.id, clearOutputs, executeCell]);

  // 5. Interrupt & Restart Kernel
  const handleInterrupt = useCallback(async () => {
    const toastId = toast.loading('Interrupting Python runtime...');
    try {
      await pyodideBridge.interrupt();
      toast.success('Execution interrupted! ⏹', { id: toastId });
    } catch {
      toast.error('Failed to interrupt kernel', { id: toastId });
    }
  }, []);

  const handleRestartKernel = useCallback(async () => {
    if (confirm('Restart runtime? All in-memory variables and state will be lost.')) {
      const toastId = toast.loading('Restarting kernel...');
      try {
        await pyodideBridge.resetKernel();
        toast.success('Kernel restarted & variables cleared! 🔄', { id: toastId });
      } catch {
        toast.error('Failed to restart kernel', { id: toastId });
      }
    }
  }, []);

  // 6. Export .ipynb (Jupyter / Colab)
  const handleExportIpynb = useCallback(() => {
    const ipynbStr = exportToIpynb(activeNotebook);
    const blob = new Blob([ipynbStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNotebook.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ipynb`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported valid .ipynb notebook! 🚀');
  }, [activeNotebook]);

  // 7. Export .py (Python Script)
  const handleExportPython = useCallback(() => {
    let script = `# StudyQuest AI — Data Forge Python Export\n# Notebook: ${activeNotebook.title}\n\n`;
    activeNotebook.cells.forEach((cell, i) => {
      if (cell.cell_type === 'markdown') {
        script += `\n# --- [Markdown Cell ${i + 1}] ---\n`;
        cell.source.split('\n').forEach((line) => {
          script += `# ${line}\n`;
        });
      } else {
        script += `\n# --- [Code Cell ${i + 1}] ---\n`;
        script += `${cell.source}\n`;
      }
    });

    const blob = new Blob([script], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNotebook.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.py`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported Python script! 🐍');
  }, [activeNotebook]);

  // 8. Import .ipynb
  const handleImportIpynb = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importFromIpynb(content, file.name.replace(/\.ipynb$/i, ''));
        const newId = await createNotebook(imported.title, null);
        await updateNotebook(newId, { cells: imported.cells });
        toast.success(`Imported "${imported.title}" from Colab! 📓`);
      } catch (err: any) {
        toast.error('Invalid or corrupted .ipynb file');
      }
    };
    reader.readAsText(file);
    if (importInputRef.current) importInputRef.current.value = '';
  }, [createNotebook, updateNotebook]);

  // 9. AI Error Explainer
  const handleExplainError = useCallback(async (traceback: string) => {
    setAiPrompt(traceback);
    setAiExplanation('');
    setAiModalOpen(true);
    setAiLoading(true);

    try {
      const { content, engine } = await askSmartAI(
        `Here is the Python error traceback:\n\`\`\`python\n${traceback}\n\`\`\`\nPlease explain what went wrong and how to fix it.`,
        "You are an expert Python data science mentor in StudyQuest. Explain the user's Python error concisely. Show the root cause, explain why it happened, and provide the exact fixed code block."
      );
      setAiExplanation(content);
      setAiEngine(engine);
    } catch {
      setAiExplanation('Unable to explain error at this time.');
    } finally {
      setAiLoading(false);
    }
  }, []);

  // 10. AI Auto-Fix Generator
  const handleAutoFixError = useCallback(async (cellId: string, traceback: string) => {
    const targetCell = activeNotebook.cells.find((c) => c.id === cellId);
    if (!targetCell) return;

    setAutoFixCellId(cellId);
    setAutoFixFixedCode('');
    setAutoFixExplanation('');
    setAutoFixModalOpen(true);
    setAutoFixLoading(true);

    try {
      const { content } = await askSmartAI(
        `Original Code:\n\`\`\`python\n${targetCell.source}\n\`\`\`\n\nPython Traceback:\n\`\`\`\n${traceback}\n\`\`\`\n\nPlease fix the bug so the code executes cleanly.`,
        "You are an expert Python data science debugger in StudyQuest Data Forge. The user's code cell threw an error. Fix the code. Provide the COMPLETE corrected code enclosed in a ```python ... ``` markdown block, followed by a concise 1-2 sentence explanation of what was fixed. Return ONLY the code block and explanation."
      );

      if (content) {
        const codeMatch = content.match(/```(?:python)?\s*([\s\S]*?)```/);
        const fixed = codeMatch ? codeMatch[1].trim() : content.trim();
        const explanation = content.replace(/```(?:python)?\s*[\s\S]*?```/, '').trim();
        setAutoFixFixedCode(fixed);
        setAutoFixExplanation(explanation || 'Fixed runtime exception in cell.');
      } else {
        setAutoFixExplanation('Failed to generate code repair.');
      }
    } catch {
      setAutoFixExplanation('Network error connecting to AI proxy.');
    } finally {
      setAutoFixLoading(false);
    }
  }, [activeNotebook.cells]);

  const handleApplyAutoFix = () => {
    if (!autoFixCellId || !autoFixFixedCode) return;
    updateCell(activeNotebook.id, autoFixCellId, {
      source: autoFixFixedCode,
      outputs: [],
      status: 'idle',
    });
    const cellIdToRun = autoFixCellId;
    setAutoFixModalOpen(false);
    toast.success('AI patch applied to cell! 🚀');
    setTimeout(() => {
      executeCell(cellIdToRun);
    }, 150);
  };

  // 11. Smooth Scroll to cell (Table of Contents outline)
  const handleScrollToCell = (cellId: string) => {
    setSelectedCellId(cellId);
    const el = document.getElementById(`nb-cell-${cellId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[var(--background)]">
      {/* Top Header */}
      <NotebookHeader
        title={activeNotebook.title}
        onUpdateTitle={(title) => updateNotebook(activeNotebook.id, { title })}
        kernelStatus={kernelStatus}
        kernelMessage={kernelMessage}
        onAddCell={(type) => addCell(activeNotebook.id, type, selectedCellId)}
        onRunAll={handleRunAll}
        onRestartAndRunAll={handleRestartAndRunAll}
        onInterrupt={handleInterrupt}
        onRestartKernel={handleRestartKernel}
        onClearOutputs={() => clearOutputs(activeNotebook.id)}
        onExportIpynb={handleExportIpynb}
        onExportPython={handleExportPython}
        onImportIpynb={() => importInputRef.current?.click()}
      />

      {/* Hidden File Input for .ipynb imports */}
      <input
        ref={importInputRef}
        type="file"
        accept=".ipynb"
        onChange={handleImportIpynb}
        className="hidden"
      />

      {/* Main Split: Left Sidebar Drawer + Central Notebook Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Toggle Sidebar Button when closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            title="Open Notebook Sidebar"
            className="absolute top-3 left-3 z-20 p-2 rounded-xl bg-slate-900 text-white shadow-lg hover:bg-primary transition-all"
          >
            <HiMenuAlt2 size={16} />
          </button>
        )}

        {/* Collapsible Left Drawer */}
        <NotebookSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          notebooks={notebooks}
          folders={folders}
          activeNotebookId={activeNotebookId}
          onSelectNotebook={(id) => setActiveNotebookId(id)}
          onCreateNotebook={(title, fld) => createNotebook(title, fld)}
          onDeleteNotebook={deleteNotebook}
          onDuplicateNotebook={duplicateNotebook}
          onCreateFolder={createFolder}
          onDeleteFolder={deleteFolder}
          onScrollToCell={handleScrollToCell}
          activeNotebook={activeNotebook}
          onInsertDatasetCell={(code) => addCell(activeNotebook.id, 'code', undefined, code)}
        />

        {/* Central Canvas with Notebook Cells */}
        <main
          ref={cellsContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 max-w-5xl mx-auto w-full"
        >
          {activeNotebook.cells.map((cell, idx) => (
            <div key={cell.id} id={`nb-cell-${cell.id}`}>
              <NotebookCell
                cell={cell}
                index={idx}
                totalCells={activeNotebook.cells.length}
                isSelected={selectedCellId === cell.id}
                onSelect={() => setSelectedCellId(cell.id)}
                onUpdateSource={(src) => updateCell(activeNotebook.id, cell.id, { source: src })}
                onRun={() => executeCell(cell.id)}
                onRunAndAdvance={() => handleRunAndAdvance(cell.id)}
                onRunAndInsert={() => handleRunAndInsert(cell.id)}
                onDelete={() => deleteCell(activeNotebook.id, cell.id)}
                onDuplicate={() => duplicateCell(activeNotebook.id, cell.id)}
                onMoveUp={() => moveCell(activeNotebook.id, cell.id, 'up')}
                onMoveDown={() => moveCell(activeNotebook.id, cell.id, 'down')}
                onChangeType={(type) => updateCell(activeNotebook.id, cell.id, { cell_type: type })}
                onAddCellBelow={(type) => addCell(activeNotebook.id, type, cell.id)}
                onExplainError={handleExplainError}
                onAutoFixError={handleAutoFixError}
              />
            </div>
          ))}

          {/* Bottom Add Cell Bar */}
          <div className="pt-6 pb-20 flex items-center justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => addCell(activeNotebook.id, 'code')}
              icon={<HiPlus size={14} />}
            >
              Add Code Cell
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addCell(activeNotebook.id, 'markdown')}
              icon={<HiPlus size={14} />}
            >
              Add Text Cell
            </Button>
          </div>
        </main>
      </div>

      {/* AI Error Explainer Modal */}
      <Modal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title="✨ Questie AI Error Assistant"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 font-mono text-xs max-h-36 overflow-y-auto">
            {aiPrompt}
          </div>

          <div className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] min-h-[160px] text-sm leading-relaxed space-y-2">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-[var(--muted-foreground)] font-bold">Analyzing Python traceback with AI...</p>
              </div>
            ) : (
              <>
                {aiEngine === 'nano' && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
                    <span>⚡ Generated instantly on-device via Gemini Nano (0ms network)</span>
                  </div>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {aiExplanation}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setAiModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI One-Click Auto-Fix Modal */}
      <Modal
        isOpen={autoFixModalOpen}
        onClose={() => setAutoFixModalOpen(false)}
        title="✨ Questie 1-Click Code Auto-Fix"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {autoFixLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[var(--foreground)] font-bold">
                Synthesizing code repair with Questie AI...
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Analyzing syntax, types, and logic to patch the cell.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Diagnosis Badge */}
              {autoFixExplanation && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
                  <span className="font-bold">Diagnosis: </span>
                  {autoFixExplanation}
                </div>
              )}

              {/* Proposed Code Block */}
              {autoFixFixedCode && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Repaired Code Patch
                  </span>
                  <pre className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-emerald-300 overflow-x-auto max-h-72 border border-emerald-500/30 whitespace-pre-wrap leading-relaxed">
                    {autoFixFixedCode}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--card-border)]">
                <Button variant="ghost" size="sm" onClick={() => setAutoFixModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!autoFixFixedCode}
                  onClick={handleApplyAutoFix}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md"
                >
                  <span>Apply Fix & Run Cell</span>
                  <HiPlay size={13} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
