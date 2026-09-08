/**
 * StudyQuest AI — Data Forge Notebook Header
 * Title editor, Colab action buttons (+Code, +Text, Run All, Interrupt, Restart),
 * and live Python WebAssembly kernel status indicators.
 */

'use client';

import React, { useState } from 'react';
import {
  HiPlay,
  HiStop,
  HiRefresh,
  HiPlus,
  HiDownload,
  HiUpload,
  HiPencil,
  HiCheck,
  HiChevronDown,
  HiTrash,
  HiLightningBolt,
  HiTerminal,
} from 'react-icons/hi';
import { KernelStatus } from '@/types/notebook';
import Button from '@/components/ui/Button';

interface NotebookHeaderProps {
  title: string;
  onUpdateTitle: (title: string) => void;
  kernelStatus: KernelStatus;
  kernelMessage?: string;
  onAddCell: (type: 'code' | 'markdown') => void;
  onRunAll: () => void;
  onRestartAndRunAll?: () => void;
  onInterrupt: () => void;
  onRestartKernel: () => void;
  onClearOutputs: () => void;
  onExportIpynb: () => void;
  onExportPython: () => void;
  onImportIpynb: () => void;
}

export default function NotebookHeader({
  title,
  onUpdateTitle,
  kernelStatus,
  kernelMessage,
  onAddCell,
  onRunAll,
  onRestartAndRunAll,
  onInterrupt,
  onRestartKernel,
  onClearOutputs,
  onExportIpynb,
  onExportPython,
  onImportIpynb,
}: NotebookHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [activeDropdown, setActiveDropdown] = useState<'file' | 'runtime' | null>(null);

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      onUpdateTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const getStatusBadge = () => {
    switch (kernelStatus) {
      case 'ready':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Python 3.12 (WASM) • Ready</span>
          </div>
        );
      case 'busy':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold">
            <div className="w-2 h-2 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Executing [*]</span>
          </div>
        );
      case 'loading':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>{kernelMessage || 'Loading Pyodide Core...'}</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Kernel Error</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Idle</span>
          </div>
        );
    }
  };

  return (
    <div className="border-b border-[var(--card-border)] bg-[var(--card-bg)]/95 backdrop-blur-md sticky top-0 z-30 select-none">
      {/* Upper Row: Title & Kernel Status */}
      <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)]/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <HiTerminal size={20} />
          </div>

          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  onBlur={handleSaveTitle}
                  autoFocus
                  className="font-black text-lg text-[var(--foreground)] bg-transparent border-b-2 border-primary outline-none px-1"
                />
                <button onClick={handleSaveTitle} className="text-primary hover:text-primary/80">
                  <HiCheck size={16} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setTempTitle(title);
                  setIsEditingTitle(true);
                }}
                className="group flex items-center gap-2 cursor-pointer"
              >
                <h1 className="font-black text-lg tracking-tight text-[var(--foreground)] group-hover:text-primary transition-colors">
                  {title}
                </h1>
                <HiPencil size={13} className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
              <span>Data Forge Notebook</span>
              <span>•</span>
              <span className="text-emerald-500 font-medium">Auto-saved to Cloud</span>
            </div>
          </div>
        </div>

        {/* Runtime Status Pill */}
        <div className="flex items-center gap-3">
          {getStatusBadge()}
        </div>
      </div>

      {/* Lower Row: Menu Bar & Action Buttons */}
      <div className="px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Dropdown Menus */}
        <div className="flex items-center gap-1">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'file' ? null : 'file')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                activeDropdown === 'file' ? 'bg-primary/10 text-primary' : 'hover:bg-[var(--card-border)]/60 text-[var(--foreground)]'
              }`}
            >
              <span>File</span>
              <HiChevronDown size={12} />
            </button>
            {activeDropdown === 'file' && (
              <div
                className="absolute top-full left-0 mt-1 w-52 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xl p-1 z-40 space-y-1"
                onClick={() => setActiveDropdown(null)}
              >
                <button
                  onClick={onImportIpynb}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center gap-2"
                >
                  <HiUpload size={14} />
                  <span>Import .ipynb</span>
                </button>
                <button
                  onClick={onExportIpynb}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center gap-2 font-bold"
                >
                  <HiDownload size={14} />
                  <span>Export as .ipynb (Colab)</span>
                </button>
                <button
                  onClick={onExportPython}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center gap-2"
                >
                  <HiDownload size={14} />
                  <span>Export as .py (Script)</span>
                </button>
              </div>
            )}
          </div>

          {/* Runtime Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'runtime' ? null : 'runtime')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                activeDropdown === 'runtime' ? 'bg-primary/10 text-primary' : 'hover:bg-[var(--card-border)]/60 text-[var(--foreground)]'
              }`}
            >
              <span>Runtime</span>
              <HiChevronDown size={12} />
            </button>
            {activeDropdown === 'runtime' && (
              <div
                className="absolute top-full left-0 mt-1 w-52 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xl p-1 z-40 space-y-1"
                onClick={() => setActiveDropdown(null)}
              >
                <button
                  onClick={onRunAll}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center gap-2 font-bold"
                >
                  <HiPlay size={14} />
                  <span>Run All Cells</span>
                </button>
                {onRestartAndRunAll && (
                  <button
                    onClick={onRestartAndRunAll}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 flex items-center gap-2"
                  >
                    <HiLightningBolt size={14} className="text-emerald-400" />
                    <span>Restart & Run All</span>
                  </button>
                )}
                <button
                  onClick={onInterrupt}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 flex items-center gap-2 text-rose-500"
                >
                  <HiStop size={14} />
                  <span>Interrupt Execution</span>
                </button>
                <button
                  onClick={onRestartKernel}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-500/10 hover:text-amber-500 flex items-center gap-2"
                >
                  <HiRefresh size={14} />
                  <span>Restart Runtime</span>
                </button>
                <div className="h-[1px] bg-[var(--card-border)] my-1" />
                <button
                  onClick={onClearOutputs}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--card-border)] flex items-center gap-2 text-slate-400"
                >
                  <HiTrash size={14} />
                  <span>Clear All Outputs</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="primary"
            onClick={() => onAddCell('code')}
            icon={<HiPlus size={13} />}
          >
            Code
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddCell('markdown')}
            icon={<HiPlus size={13} />}
          >
            Text
          </Button>

          <div className="w-[1px] h-4 bg-[var(--card-border)] mx-1" />

          <Button
            size="sm"
            variant="ghost"
            onClick={onRunAll}
            icon={<HiPlay size={13} className="text-emerald-500" />}
            title="Run All Cells (Ctrl+F9)"
          >
            Run All
          </Button>

          {kernelStatus === 'busy' && (
            <button
              onClick={onInterrupt}
              title="Interrupt Execution (Ctrl+M I)"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-sm"
            >
              <HiStop size={13} />
              <span>Interrupt</span>
            </button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onRestartKernel}
            icon={<HiRefresh size={13} />}
            title="Restart Python Runtime"
          >
            Restart
          </Button>
        </div>
      </div>
    </div>
  );
}
