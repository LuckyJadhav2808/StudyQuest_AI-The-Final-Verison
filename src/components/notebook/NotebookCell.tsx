/**
 * StudyQuest AI — Data Forge Notebook Cell Wrapper
 * Encapsulates code/markdown editors, execution state, execution indicators,
 * cell action toolbars, and rich output displays.
 */

'use client';

import React, { useState } from 'react';
import {
  HiPlay,
  HiChevronUp,
  HiChevronDown,
  HiTrash,
  HiDuplicate,
  HiCode,
  HiBookOpen,
  HiPlus,
  HiClock,
} from 'react-icons/hi';
import { NotebookCell as INotebookCell, CellType } from '@/types/notebook';
import CodeCellEditor from './CodeCellEditor';
import MarkdownCellEditor from './MarkdownCellEditor';
import CellOutputViewer from './CellOutputViewer';

interface NotebookCellProps {
  cell: INotebookCell;
  index: number;
  totalCells: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateSource: (source: string) => void;
  onRun: () => void;
  onRunAndAdvance: () => void;
  onRunAndInsert: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChangeType: (type: CellType) => void;
  onAddCellBelow: (type: CellType) => void;
  onExplainError?: (traceback: string) => void;
  onAutoFixError?: (cellId: string, traceback: string) => void;
}

export default function NotebookCell({
  cell,
  index,
  totalCells,
  isSelected,
  onSelect,
  onUpdateSource,
  onRun,
  onRunAndAdvance,
  onRunAndInsert,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onChangeType,
  onAddCellBelow,
  onExplainError,
  onAutoFixError,
}: NotebookCellProps) {
  const [hovered, setHovered] = useState(false);
  const isCode = cell.cell_type === 'code';
  const isRunning = cell.status === 'running';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      className={`relative group rounded-2xl transition-all ${
        isSelected
          ? 'ring-2 ring-primary/60 shadow-[0_4px_20px_rgba(124,58,237,0.1)]'
          : 'hover:border-[var(--card-border)]'
      }`}
    >
      {/* Top Cell Actions Floating Toolbar */}
      <div
        className={`absolute -top-3.5 right-4 z-20 flex items-center gap-0.5 px-2 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-700/80 shadow-lg text-xs transition-opacity ${
          hovered || isSelected ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Type Switcher */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChangeType(isCode ? 'markdown' : 'code');
          }}
          title={`Convert to ${isCode ? 'Markdown' : 'Code'}`}
          className="p-1 hover:text-primary rounded transition-colors flex items-center gap-1 font-sans text-[11px] font-bold"
        >
          {isCode ? <HiBookOpen size={13} /> : <HiCode size={13} />}
          <span>{isCode ? 'Text' : 'Code'}</span>
        </button>

        <div className="w-[1px] h-3.5 bg-slate-700 mx-1" />

        {/* Move Up */}
        <button
          disabled={index === 0}
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          title="Move Cell Up"
          className="p-1 hover:text-primary rounded disabled:opacity-30 transition-colors"
        >
          <HiChevronUp size={14} />
        </button>

        {/* Move Down */}
        <button
          disabled={index === totalCells - 1}
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          title="Move Cell Down"
          className="p-1 hover:text-primary rounded disabled:opacity-30 transition-colors"
        >
          <HiChevronDown size={14} />
        </button>

        {/* Duplicate */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate Cell"
          className="p-1 hover:text-primary rounded transition-colors"
        >
          <HiDuplicate size={13} />
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete Cell"
          className="p-1 hover:text-rose-400 rounded transition-colors"
        >
          <HiTrash size={13} />
        </button>
      </div>

      {/* Main Cell Body */}
      <div className="flex items-start gap-3 p-2">
        {/* Left Gutter: Run Button & Execution Number */}
        <div className="flex flex-col items-center gap-1 pt-1.5 w-11 shrink-0 select-none font-mono">
          {isCode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRun();
              }}
              disabled={isRunning}
              title="Run Cell (Shift+Enter)"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                isRunning
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                  : 'bg-primary text-white shadow-md hover:scale-105 active:scale-95'
              }`}
            >
              {isRunning ? (
                <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <HiPlay size={15} className="ml-0.5" />
              )}
            </button>
          )}

          {/* Execution Counter [1], [*] */}
          {isCode && (
            <span className="text-[10px] font-bold text-slate-500">
              {isRunning ? '[*]' : cell.execution_count ? `[${cell.execution_count}]` : '[ ]'}
            </span>
          )}

          {/* Duration Pill */}
          {isCode && cell.executionTimeMs !== undefined && (
            <span className="text-[9px] text-slate-400 font-sans flex items-center gap-0.5 opacity-80" title={`Ran in ${cell.executionTimeMs}ms`}>
              <HiClock size={9} />
              <span>{cell.executionTimeMs > 1000 ? `${(cell.executionTimeMs / 1000).toFixed(1)}s` : `${cell.executionTimeMs}ms`}</span>
            </span>
          )}
        </div>

        {/* Editor & Outputs Canvas */}
        <div className="flex-1 min-w-0">
          {isCode ? (
            <CodeCellEditor
              value={cell.source}
              onChange={onUpdateSource}
              onRun={onRun}
              onRunAndAdvance={onRunAndAdvance}
              onRunAndInsert={onRunAndInsert}
              disabled={isRunning}
            />
          ) : (
            <MarkdownCellEditor
              value={cell.source}
              onChange={onUpdateSource}
              onAdvance={onRunAndAdvance}
            />
          )}

          {/* Output Viewer for Code Cells */}
          {isCode && (
            <CellOutputViewer
              outputs={cell.outputs}
              onExplainError={onExplainError}
              onAutoFixError={onAutoFixError ? (tb) => onAutoFixError(cell.id, tb) : undefined}
            />
          )}
        </div>
      </div>

      {/* Bottom Between-Cell Quick Inserter Line on Hover */}
      <div className="relative py-2 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
        <div className="absolute inset-x-4 h-[1px] bg-[var(--card-border)]" />
        <div className="relative z-10 flex gap-2 bg-[var(--card-bg)] px-3 font-sans">
          <button
            onClick={() => onAddCellBelow('code')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            <HiPlus size={11} />
            <span>Code</span>
          </button>
          <button
            onClick={() => onAddCellBelow('markdown')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-[var(--card-border)] hover:bg-slate-200 transition-all shadow-sm"
          >
            <HiPlus size={11} />
            <span>Text</span>
          </button>
        </div>
      </div>
    </div>
  );
}
