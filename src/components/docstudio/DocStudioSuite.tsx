'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiDocumentText,
  HiTable,
  HiClock,
  HiUpload,
  HiTrash,
  HiSparkles,
  HiExternalLink,
  HiTemplate,
  HiOutlineViewGrid,
  HiQuestionMarkCircle,
  HiX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import PdfStudioSuite from './subsections/PdfStudioSuite';
import WordStudioSuite from './subsections/WordStudioSuite';
import PptxStudioSuite from './subsections/PptxStudioSuite';
import XlsxStudioSuite from './subsections/XlsxStudioSuite';
import DocStudioHub from './DocStudioHub';
import { formatBytes } from '@/lib/docstudio/compressor';

export type StudioAppTab = 'pdf' | 'word' | 'pptx' | 'xlsx' | 'classic_hub';

interface RecentDocItem {
  id: string;
  name: string;
  size: number;
  type: StudioAppTab;
  lastOpened: number;
}

interface DocStudioSuiteProps {
  initialFile?: File | null;
  onSendToNotes?: (contentOrBlob: string | Blob, title: string) => void;
  onOpenClassicReader?: () => void;
}

export default function DocStudioSuite({
  initialFile,
  onSendToNotes,
  onOpenClassicReader,
}: DocStudioSuiteProps) {
  const [activeApp, setActiveApp] = useState<StudioAppTab>('pdf');
  const [droppedFile, setDroppedFile] = useState<File | null>(initialFile || null);
  const [showRecents, setShowRecents] = useState<boolean>(false);
  const [recents, setRecents] = useState<RecentDocItem[]>([]);
  const [isDragOverGlobal, setIsDragOverGlobal] = useState<boolean>(false);

  const globalFileInputRef = useRef<HTMLInputElement>(null);

  // Load recents from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('studyquest_docstudio_recents');
      if (saved) {
        setRecents(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load recents from localStorage', e);
    }
  }, []);

  const saveRecent = (name: string, size: number, type: StudioAppTab) => {
    try {
      const newItem: RecentDocItem = {
        id: `recent-${Date.now()}`,
        name,
        size,
        type,
        lastOpened: Date.now(),
      };
      setRecents((prev) => {
        const filtered = prev.filter((item) => item.name !== name);
        const next = [newItem, ...filtered].slice(0, 10);
        localStorage.setItem('studyquest_docstudio_recents', JSON.stringify(next));
        return next;
      });
    } catch (e) {
      console.warn('Could not save recent to localStorage', e);
    }
  };

  const clearRecents = () => {
    setRecents([]);
    localStorage.removeItem('studyquest_docstudio_recents');
    toast.success('Cleared recent document history');
  };

  // Automatic file type sniffer
  const routeAndOpenFile = (file: File) => {
    const name = file.name.toLowerCase();

    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      setActiveApp('pdf');
      setDroppedFile(file);
      saveRecent(file.name, file.size, 'pdf');
      toast.success(`Opening "${file.name}" in PDF Studio`);
    } else if (
      name.endsWith('.docx') ||
      name.endsWith('.doc') ||
      name.endsWith('.txt') ||
      name.endsWith('.rtf')
    ) {
      setActiveApp('word');
      setDroppedFile(file);
      saveRecent(file.name, file.size, 'word');
      toast.success(`Routing "${file.name}" to Word Office Suite`);
    } else if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
      setActiveApp('pptx');
      setDroppedFile(file);
      saveRecent(file.name, file.size, 'pptx');
      toast.success(`Routing "${file.name}" to PowerPoint Presentation Stage`);
    } else if (
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      name.endsWith('.csv') ||
      name.endsWith('.tsv')
    ) {
      setActiveApp('xlsx');
      setDroppedFile(file);
      saveRecent(file.name, file.size, 'xlsx');
      toast.success(`Routing "${file.name}" to Excel Formula Grid`);
    } else if (file.type.startsWith('image/')) {
      setActiveApp('pdf');
      setDroppedFile(file);
      saveRecent(file.name, file.size, 'pdf');
      toast.success(`Loaded image into PDF Studio`);
    } else {
      setActiveApp('pdf');
      setDroppedFile(file);
    }
  };

  // Global Drag and Drop Handlers
  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOverGlobal) setIsDragOverGlobal(true);
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOverGlobal(false);
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverGlobal(false);
    if (e.dataTransfer.files?.[0]) {
      routeAndOpenFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
      className="flex flex-col h-full w-full bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans relative"
    >
      {/* Hidden Universal File Input */}
      <input
        ref={globalFileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.pptx,.ppt,.xlsx,.xls,.csv,image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            routeAndOpenFile(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* Global Drag Overlay */}
      <AnimatePresence>
        {isDragOverGlobal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-primary/20 backdrop-blur-md border-4 border-dashed border-primary flex flex-col items-center justify-center p-6 text-center pointer-events-none"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary text-white flex items-center justify-center text-4xl shadow-2xl mb-4 animate-bounce">
              📂
            </div>
            <h2 className="text-2xl font-black font-heading text-white drop-shadow-md">
              Drop Document Anywhere
            </h2>
            <p className="text-sm text-white/90 font-medium max-w-md mt-1">
              DocStudio will automatically route your file to PDF, Word, PowerPoint, or Excel.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          OFFICE 365 SUITE HEADER: APP SWITCHER PILLS & MASTER CONTROLS
      -------------------------------------------------------------- */}
      <header className="flex-shrink-0 bg-[var(--card-bg)] border-b border-[var(--card-border)] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3 z-30 shadow-xs min-w-0 no-print">
        {/* Left: Suite Logo & App Switcher Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          <div className="flex items-center gap-1.5 pr-2 border-r border-[var(--card-border)] flex-shrink-0">
            <span className="text-base sm:text-lg">💼</span>
            <span className="font-heading font-black text-xs sm:text-sm tracking-tight hidden lg:inline">
              DocStudio
            </span>
          </div>

          {/* App Switcher Segmented Control */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-[var(--card-border)] flex-shrink-0">
            {/* 1. PDF Studio */}
            <button
              onClick={() => setActiveApp('pdf')}
              className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                activeApp === 'pdf'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-[var(--muted-foreground)] hover:text-rose-500 hover:bg-rose-500/10'
              }`}
            >
              <span>📕</span>
              <span>PDF<span className="hidden sm:inline"> Studio</span></span>
            </button>

            {/* 2. Word Studio */}
            <button
              onClick={() => setActiveApp('word')}
              className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                activeApp === 'word'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--muted-foreground)] hover:text-blue-500 hover:bg-blue-500/10'
              }`}
            >
              <span>📝</span>
              <span>Word<span className="hidden sm:inline"> Office</span></span>
            </button>

            {/* 3. PowerPoint Studio */}
            <button
              onClick={() => setActiveApp('pptx')}
              className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                activeApp === 'pptx'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-[var(--muted-foreground)] hover:text-orange-500 hover:bg-orange-500/10'
              }`}
            >
              <span>📊</span>
              <span><span className="hidden sm:inline">Power</span>Point</span>
            </button>

            {/* 4. Excel Studio */}
            <button
              onClick={() => setActiveApp('xlsx')}
              className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                activeApp === 'xlsx'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--muted-foreground)] hover:text-emerald-500 hover:bg-emerald-500/10'
              }`}
            >
              <span>📈</span>
              <span>Excel<span className="hidden sm:inline"> Grid</span></span>
            </button>

            {/* 5. Classic Tools Hub */}
            <button
              onClick={() => setActiveApp('classic_hub')}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
                activeApp === 'classic_hub'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/50'
              }`}
              title="All 8 Standalone Student Utility Tools"
            >
              <HiOutlineViewGrid size={14} />
              <span className="hidden md:inline">Tools</span>
            </button>
          </div>
        </div>

        {/* Right: Universal Open Button, Recents & Classic Reader */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => globalFileInputRef.current?.click()}
            className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-xs transition-all flex items-center gap-1 sm:gap-1.5 active:scale-95 whitespace-nowrap"
            title="Open any supported document"
          >
            <HiUpload size={14} />
            <span className="hidden sm:inline">Open Document</span>
          </button>

          <button
            onClick={() => setShowRecents((r) => !r)}
            className={`h-8 w-8 rounded-lg border transition-colors flex items-center justify-center relative ${
              showRecents
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-[var(--card-border)] hover:border-primary text-[var(--muted-foreground)]'
            }`}
            title="Recent Documents"
          >
            <HiClock size={16} />
            {recents.length > 0 && (
              <span className="absolute 1.5 -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
            )}
          </button>

          {onOpenClassicReader && (
            <button
              onClick={onOpenClassicReader}
              className="h-8 px-2.5 rounded-lg text-xs font-medium border border-[var(--card-border)] hover:bg-[var(--card-border)]/40 text-[var(--muted-foreground)] transition-colors hidden md:flex items-center gap-1 whitespace-nowrap"
              title="Switch to Dual-Pane Split Reader"
            >
              <span>Split Reader</span>
              <HiExternalLink size={12} />
            </button>
          )}
        </div>
      </header>

      {/* -------------------------------------------------------------
          RECENTS DRAWER DROPDOWN
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {showRecents && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 right-4 z-40 w-80 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--card-border)] mb-2">
              <span className="text-xs font-bold font-heading flex items-center gap-1.5">
                <HiClock className="text-primary" size={14} /> Recent Documents
              </span>
              <div className="flex items-center gap-1">
                {recents.length > 0 && (
                  <button
                    onClick={clearRecents}
                    className="text-[10px] text-red-500 hover:underline font-bold"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setShowRecents(false)}
                  className="p-1 rounded text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40"
                >
                  <HiX size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {recents.length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--muted-foreground)]">
                  No recently opened documents yet. Drag & drop files anytime!
                </div>
              ) : (
                recents.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveApp(item.type);
                      setShowRecents(false);
                      toast('Document selected from recents');
                    }}
                    className="p-2 rounded-xl border border-[var(--card-border)] hover:border-primary/50 bg-[var(--background)] cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate max-w-[200px]">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase">
                        {item.type} Studio • {formatBytes(item.size)}
                      </span>
                    </div>
                    <span className="text-sm opacity-60 group-hover:opacity-100">
                      {item.type === 'pdf' ? '📕' : item.type === 'word' ? '📝' : item.type === 'pptx' ? '📊' : '📈'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          ACTIVE APP MOUNTING CONTAINER
      -------------------------------------------------------------- */}
      <main className="flex-1 min-h-0 relative overflow-hidden">
        {/* SUBSECTION 1: PDF STUDIO SUITE */}
        {activeApp === 'pdf' && (
          <PdfStudioSuite
            initialFile={droppedFile}
            onSendToNotes={(blob, title) => {
              if (onSendToNotes) onSendToNotes(blob, title);
            }}
            onSwitchStudio={(target) => setActiveApp(target)}
          />
        )}

        {/* SUBSECTION 2: WORD OFFICE SUITE */}
        {activeApp === 'word' && (
          <WordStudioSuite
            initialFile={droppedFile}
            onSendToNotes={(contentOrBlob, title) => {
              if (onSendToNotes) onSendToNotes(contentOrBlob, title);
            }}
            onSwitchStudio={(target) => setActiveApp(target)}
          />
        )}

        {/* SUBSECTION 3: POWERPOINT STUDIO */}
        {activeApp === 'pptx' && (
          <PptxStudioSuite
            initialFile={droppedFile}
            onSendToNotes={(contentOrBlob, title) => {
              if (onSendToNotes) onSendToNotes(contentOrBlob, title);
            }}
            onSwitchStudio={(target) => setActiveApp(target)}
          />
        )}

        {/* SUBSECTION 4: EXCEL STUDIO */}
        {activeApp === 'xlsx' && (
          <XlsxStudioSuite
            initialFile={droppedFile}
            onSendToNotes={(contentOrBlob, title) => {
              if (onSendToNotes) onSendToNotes(contentOrBlob, title);
            }}
            onSwitchStudio={(target) => setActiveApp(target)}
          />
        )}

        {/* SUBSECTION 5: CLASSIC TOOLS HUB */}
        {activeApp === 'classic_hub' && (
          <div className="h-full overflow-y-auto p-4 md:p-6 bg-[var(--background)]">
            <DocStudioHub
              onOpenInReader={(f) => {
                // If it is a PDF or other file, route into suite
                setActiveApp('pdf');
              }}
              onSendToNotes={(content, title) => {
                if (onSendToNotes) onSendToNotes(content, title);
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
