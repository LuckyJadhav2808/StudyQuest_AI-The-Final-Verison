'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiX,
  HiZoomIn,
  HiZoomOut,
  HiDocumentText,
  HiPhotograph,
  HiUpload,
  HiArrowLeft,
  HiAdjustments,
  HiBookOpen,
  HiClock,
  HiTrash,
  HiSearch,
  HiEye,
  HiCode,
  HiRefresh,
  HiTemplate,
  HiChevronLeft,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { marked } from 'marked';
import katex from 'katex';
import { ResizableSplitLayout } from '@/components/notes/MultitaskPanels';

type ReaderFileType = 'pdf' | 'image' | 'text' | 'markdown' | 'unknown';

interface LoadedFile {
  name: string;
  size: number;
  type: ReaderFileType;
  src: string; // URL.createObjectURL for PDFs/images, raw text for text/markdown
  needsReupload?: boolean;
}

interface RecentFile {
  name: string;
  size: number;
  type: ReaderFileType;
  lastOpened: number;
  cachedContent?: string; // only for small text/markdown files
}

interface DocViewerInstanceProps {
  instanceId: 'left' | 'right';
  file: LoadedFile | null;
  onFileChange: (file: LoadedFile | null) => void;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  addToHistory: (name: string, size: number, type: ReaderFileType, content?: string) => void;
  cleanUpFile: (currentFile: LoadedFile | null) => void;
  formatBytes: (bytes: number) => string;
}

function DocViewerInstance({
  instanceId,
  file,
  onFileChange,
  isActive,
  onActivate,
  onClose,
  addToHistory,
  cleanUpFile,
  formatBytes,
}: DocViewerInstanceProps) {
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [fontSize, setFontSize] = useState<number>(14);
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [mode, setMode] = useState<'preview' | 'source'>('preview');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadInputRef = useRef<HTMLInputElement>(null);

  const processFile = (nativeFile: File) => {
    const fileName = nativeFile.name.toLowerCase();
    let fileType: ReaderFileType = 'unknown';

    if (nativeFile.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      fileType = 'pdf';
    } else if (nativeFile.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/.test(fileName)) {
      fileType = 'image';
    } else if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
      fileType = 'markdown';
    } else if (
      nativeFile.type.startsWith('text/') ||
      /\.(txt|json|csv|xml|js|ts|tsx|jsx|py|cpp|c|h|cs|java|go|rs|css|html|sh|yml|yaml)$/.test(fileName)
    ) {
      fileType = 'text';
    }

    if (fileType === 'unknown') {
      toast.error('Unsupported file format. Please load a PDF, image, markdown, or text file.');
      return;
    }

    if (fileType === 'pdf' || fileType === 'image') {
      const objectUrl = URL.createObjectURL(nativeFile);
      cleanUpFile(file);
      onFileChange({
        name: nativeFile.name,
        size: nativeFile.size,
        type: fileType,
        src: objectUrl,
      });
      setZoom(100);
      addToHistory(nativeFile.name, nativeFile.size, fileType);
      toast.success(`${nativeFile.name} loaded on ${instanceId} pane! 📄`);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = e.target?.result as string;
        cleanUpFile(file);
        onFileChange({
          name: nativeFile.name,
          size: nativeFile.size,
          type: fileType,
          src: textContent,
        });
        addToHistory(nativeFile.name, nativeFile.size, fileType, textContent);
        toast.success(`${nativeFile.name} loaded on ${instanceId} pane! 📝`);
      };
      reader.onerror = () => {
        toast.error('Failed to read the file.');
      };
      reader.readAsText(nativeFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const nativeFile = e.dataTransfer.files[0];
    if (nativeFile) processFile(nativeFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nativeFile = e.target.files?.[0];
    if (nativeFile) processFile(nativeFile);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleReuploadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nativeFile = e.target.files?.[0];
    if (!nativeFile || !file) return;
    if (nativeFile.name !== file.name) {
      toast.error(`Expected "${file.name}" but you selected "${nativeFile.name}"`);
    }
    processFile(nativeFile);
  };

  const triggerReuploadSelect = () => {
    reuploadInputRef.current?.click();
  };

  // Compile markdown with KaTeX math Support
  const parsedMarkdownHTML = useMemo(() => {
    if (!file || file.type !== 'markdown' || file.needsReupload) return '';
    const text = file.src;

    const blockMath: string[] = [];
    const inlineMath: string[] = [];

    // Extract block math: $$ formula $$
    let processed = text.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, formula) => {
      try {
        const rendered = katex.renderToString(formula, { displayMode: true, throwOnError: false });
        blockMath.push(rendered);
        return `@@BLOCKMATH_${blockMath.length - 1}@@`;
      } catch (e) {
        return `<span class="text-coral">Error rendering math: ${formula}</span>`;
      }
    });

    // Extract inline math: $ formula $
    processed = processed.replace(/\$([^$\n]+?)\$/g, (_, formula) => {
      try {
        const rendered = katex.renderToString(formula, { displayMode: false, throwOnError: false });
        inlineMath.push(rendered);
        return `@@INLINEMATH_${inlineMath.length - 1}@@`;
      } catch (e) {
        return `<span class="text-coral">${formula}</span>`;
      }
    });

    let html = '';
    try {
      html = marked.parse(processed) as string;
    } catch (e) {
      html = `<pre>${processed}</pre>`;
    }

    html = html.replace(/@@BLOCKMATH_(\d+)@@/g, (_, index) => blockMath[parseInt(index)]);
    html = html.replace(/@@INLINEMATH_(\d+)@@/g, (_, index) => inlineMath[parseInt(index)]);

    return html;
  }, [file]);

  return (
    <div
      onClick={onActivate}
      className={`w-full h-full flex flex-col relative transition-all duration-200 rounded-2xl overflow-hidden border-2 ${
        isActive 
          ? 'border-primary ring-2 ring-primary/20 shadow-md' 
          : 'border-[var(--card-border)] hover:border-primary/30 shadow-sm'
      }`}
    >
      {/* Pane Active Header status indicator */}
      <div className={`px-4 py-2 border-b text-xs font-bold flex items-center justify-between transition-colors ${
        isActive 
          ? 'bg-primary/5 text-primary border-primary/20' 
          : 'bg-[var(--card-bg)] text-[var(--muted-foreground)] border-[var(--card-border)]/50'
      }`}>
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary animate-pulse' : 'bg-gray-400'}`} />
          {instanceId} Pane {file ? `— ${file.name}` : ''}
        </span>
        {file && (
          <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-0.5 shadow-sm">
            {file.type === 'markdown' && (
              <div className="flex items-center bg-[var(--background)] rounded-md p-0.5 border border-[var(--card-border)]">
                <button
                  onClick={(e) => { e.stopPropagation(); setMode('preview'); }}
                  className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-md transition-colors ${
                    mode === 'preview' ? 'bg-primary text-white' : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  <HiEye size={10} /> Preview
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMode('source'); }}
                  className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-md transition-colors ${
                    mode === 'source' ? 'bg-primary text-white' : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  <HiCode size={10} /> Source
                </button>
              </div>
            )}
            
            {file.type === 'image' && (
              <div className="flex items-center gap-0.5 px-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(25, z - 25)); }}
                  className="p-1 rounded hover:bg-[var(--background)] text-[var(--muted-foreground)]"
                >
                  <HiZoomOut size={12} />
                </button>
                <span className="text-[9px] font-bold px-1">{zoom}%</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(300, z + 25)); }}
                  className="p-1 rounded hover:bg-[var(--background)] text-[var(--muted-foreground)]"
                >
                  <HiZoomIn size={12} />
                </button>
              </div>
            )}

            {(file.type === 'text' || (file.type === 'markdown' && mode === 'source')) && (
              <div className="flex items-center gap-1 px-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setFontSize(s => Math.max(10, s - 1)); }}
                  className="w-5 h-5 rounded hover:bg-[var(--background)] font-bold text-[9px] border border-[var(--card-border)]"
                >
                  A-
                </button>
                <span className="text-[9px] font-bold w-7 text-center">{fontSize}px</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setFontSize(s => Math.min(30, s + 1)); }}
                  className="w-5 h-5 rounded hover:bg-[var(--background)] font-bold text-[9px] border border-[var(--card-border)]"
                >
                  A+
                </button>
                <label className="flex items-center gap-1 text-[9px] font-bold text-[var(--muted-foreground)] cursor-pointer ml-1 select-none">
                  <input
                    type="checkbox"
                    checked={wordWrap}
                    onChange={(e) => setWordWrap(e.target.checked)}
                    className="accent-primary w-2.5 h-2.5"
                  />
                  Wrap
                </label>
              </div>
            )}
            
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-1 rounded hover:bg-coral/10 text-coral transition-colors"
              title="Close File"
            >
              <HiX size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Pane Content body */}
      <div className="flex-1 min-h-0 relative bg-[var(--card-bg)]">
        {!file ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div
              className={`w-full max-w-sm border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                dragging
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-[var(--card-border)] hover:border-primary/50 hover:bg-[var(--card-border)]/20'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary-light">
                <HiUpload size={18} />
              </div>
              <div>
                <h4 className="font-heading font-bold text-xs mb-0.5">Drag & Drop Here</h4>
                <p className="text-[10px] text-[var(--muted-foreground)] leading-tight max-w-[200px] mx-auto">
                  Supports PDFs, images, text, and markdown files locally.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); triggerFileSelect(); }}>
                Browse File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*,text/*,.md,.markdown"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">
            {file.needsReupload ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[var(--background)]">
                <div className="max-w-xs p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-md flex flex-col items-center gap-3">
                  <span className="text-2xl">📂</span>
                  <div>
                    <h5 className="font-heading font-bold text-xs mb-0.5">Re-select File</h5>
                    <p className="text-[9px] text-[var(--muted-foreground)] leading-normal">
                      For browser safety, select <strong>{file.name}</strong> from your device again.
                    </p>
                  </div>
                  <Button variant="primary" size="sm" icon={<HiRefresh />} onClick={triggerReuploadSelect}>
                    Choose File
                  </Button>
                  <input
                    ref={reuploadInputRef}
                    type="file"
                    accept={file.type === 'pdf' ? 'application/pdf' : 'image/*'}
                    onChange={handleReuploadSelect}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="w-full h-full">
                {/* 1. PDF iframe */}
                {file.type === 'pdf' && (
                  <iframe
                    src={`${file.src}#toolbar=1`}
                    title="PDF viewer pane"
                    className="w-full h-full border-0 bg-white"
                  />
                )}

                {/* 2. Image */}
                {file.type === 'image' && (
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-4 bg-[var(--background)]">
                    <img
                      src={file.src}
                      alt={file.name}
                      style={{
                        transform: `scale(${zoom / 100})`,
                        transition: 'transform 0.1s ease-out',
                        maxHeight: zoom === 100 ? '100%' : 'none',
                        maxWidth: zoom === 100 ? '100%' : 'none',
                        objectFit: 'contain',
                      }}
                      className="rounded shadow"
                    />
                  </div>
                )}

                {/* 3. Text code */}
                {(file.type === 'text' || (file.type === 'markdown' && mode === 'source')) && (
                  <div className="w-full h-full overflow-auto p-4 bg-[var(--background)]">
                    <pre
                      style={{
                        fontSize: `${fontSize}px`,
                        whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                        wordBreak: 'break-word',
                      }}
                      className="font-mono p-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] leading-normal overflow-x-auto text-[var(--foreground)] w-full max-w-2xl mx-auto"
                    >
                      {file.src}
                    </pre>
                  </div>
                )}

                {/* 4. Markdown compiled preview */}
                {file.type === 'markdown' && mode === 'preview' && (
                  <div className="w-full h-full overflow-auto p-5 bg-[var(--card-bg)] select-text">
                    <div className="max-w-2xl mx-auto">
                      <div
                        className="studyquest-markdown prose dark:prose-invert prose-purple max-w-none text-[var(--foreground)]"
                        dangerouslySetInnerHTML={{ __html: parsedMarkdownHTML }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocReader() {
  const [showHistory, setShowHistory] = useState(true);
  const [isSplit, setIsSplit] = useState(false);
  const [activePane, setActivePane] = useState<'left' | 'right'>('left');

  // Dual file states
  const [leftFile, setLeftFile] = useState<LoadedFile | null>(null);
  const [rightFile, setRightFile] = useState<LoadedFile | null>(null);

  const [history, setHistory] = useState<RecentFile[]>([]);
  const [historySearch, setHistorySearch] = useState('');

  // Load history from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('studyquest_reader_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load history list', e);
    }
  }, []);

  const saveHistory = (newHistory: RecentFile[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem('studyquest_reader_history', JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save history list', e);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const cleanUpFile = useCallback((currentFile: LoadedFile | null) => {
    if (currentFile && (currentFile.type === 'pdf' || currentFile.type === 'image')) {
      if (currentFile.src && currentFile.src.startsWith('blob:')) {
        URL.revokeObjectURL(currentFile.src);
      }
    }
  }, []);

  // Clean up all object URLs on unmount
  useEffect(() => {
    return () => {
      cleanUpFile(leftFile);
      cleanUpFile(rightFile);
    };
  }, [leftFile, rightFile, cleanUpFile]);

  const addToHistory = (name: string, size: number, type: ReaderFileType, content?: string) => {
    const shouldCache = (type === 'text' || type === 'markdown') && size < 100 * 1024 && content;
    const record: RecentFile = {
      name,
      size,
      type,
      lastOpened: Date.now(),
      ...(shouldCache ? { cachedContent: content } : {}),
    };
    const updated = [record, ...history.filter(h => h.name !== name)].slice(0, 15);
    saveHistory(updated);
  };

  // Route file loaded from sidebar into the active pane
  const handleOpenRecent = (item: RecentFile) => {
    const targetFile = activePane === 'left' ? leftFile : rightFile;
    const setTargetFile = activePane === 'left' ? setLeftFile : setRightFile;

    if (item.cachedContent) {
      cleanUpFile(targetFile);
      setTargetFile({
        name: item.name,
        size: item.size,
        type: item.type,
        src: item.cachedContent,
      });
      toast.success(`${item.name} loaded in ${activePane} pane! ⚡`);
    } else {
      cleanUpFile(targetFile);
      setTargetFile({
        name: item.name,
        size: item.size,
        type: item.type,
        src: '',
        needsReupload: true,
      });
    }
  };

  const removeHistoryItem = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const updated = history.filter(h => h.name !== name);
    saveHistory(updated);
    toast.success('Removed from history');
  };

  const clearAllHistory = () => {
    if (confirm('Clear your document reading history?')) {
      saveHistory([]);
      toast.success('History cleared');
    }
  };

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const q = historySearch.toLowerCase();
    return history.filter(h => h.name.toLowerCase().includes(q));
  }, [history, historySearch]);

  // Split-layout configurations
  const renderLeftPane = () => (
    <DocViewerInstance
      instanceId="left"
      file={leftFile}
      onFileChange={setLeftFile}
      isActive={activePane === 'left'}
      onActivate={() => setActivePane('left')}
      onClose={() => { cleanUpFile(leftFile); setLeftFile(null); }}
      addToHistory={addToHistory}
      cleanUpFile={cleanUpFile}
      formatBytes={(b) => formatBytes(b)}
    />
  );

  const renderRightPane = () => (
    <DocViewerInstance
      instanceId="right"
      file={rightFile}
      onFileChange={setRightFile}
      isActive={activePane === 'right'}
      onActivate={() => setActivePane('right')}
      onClose={() => { cleanUpFile(rightFile); setRightFile(null); }}
      addToHistory={addToHistory}
      cleanUpFile={cleanUpFile}
      formatBytes={(b) => formatBytes(b)}
    />
  );

  return (
    <div className="w-full flex h-[calc(100vh-100px)] relative overflow-hidden">
      
      {/* SIDEBAR: History list */}
      <AnimatePresence initial={false}>
        {showHistory && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 h-full border-r-2 border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col z-20 overflow-hidden"
          >
            <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
              <span className="font-heading font-bold text-sm flex items-center gap-1.5">
                <HiClock size={16} className="text-primary" /> Recents List
              </span>
              <div className="flex items-center gap-1.5">
                {history.length > 0 && (
                  <button
                    onClick={clearAllHistory}
                    className="p-1 rounded-lg text-coral hover:bg-coral/10 text-xs transition-colors flex items-center gap-0.5 font-bold"
                    title="Clear history"
                  >
                    <HiTrash size={12} /> Clear
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40 transition-colors"
                  title="Hide sidebar"
                >
                  <HiChevronLeft size={16} />
                </button>
              </div>
            </div>

            <div className="p-3 border-b border-[var(--card-border)]/50 relative">
              <HiSearch size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search recent files..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-primary transition-colors font-medium"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-xs text-[var(--muted-foreground)] px-4">
                  {historySearch ? 'No matching files found' : 'Your recently opened files will appear here'}
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const isCached = !!item.cachedContent;
                  const isOpenedLeft = leftFile?.name === item.name;
                  const isOpenedRight = rightFile?.name === item.name;
                  const isOpened = isOpenedLeft || isOpenedRight;
                  
                  return (
                    <div
                      key={item.name}
                      onClick={() => handleOpenRecent(item)}
                      className={`flex flex-col gap-1 p-2 rounded-xl border-2 cursor-pointer transition-all hover:bg-primary/5 ${
                        isOpened
                          ? 'border-primary bg-primary/5'
                          : 'border-[var(--card-border)]/30 hover:border-primary/20 bg-[var(--card-bg)]'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex-shrink-0 text-[var(--muted-foreground)]">
                          {item.type === 'pdf' && <HiDocumentText size={14} className="text-coral" />}
                          {item.type === 'image' && <HiPhotograph size={14} className="text-sky" />}
                          {item.type === 'markdown' && <HiBookOpen size={14} className="text-primary" />}
                          {item.type === 'text' && <HiDocumentText size={14} className="text-teal" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate leading-tight hover:text-primary transition-colors">
                            {item.name}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[8px] text-[var(--muted-foreground)] font-medium">
                            <span>{formatBytes(item.size)}</span>
                            {isCached ? (
                              <span className="px-1 py-0.5 rounded bg-teal/10 text-teal text-[7px] font-bold">⚡ Cached</span>
                            ) : (
                              <span className="px-1 py-0.5 rounded bg-amber/10 text-amber-600 text-[7px] font-bold">📂 Re-open</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => removeHistoryItem(e, item.name)}
                          className="p-0.5 rounded hover:bg-coral/10 text-[var(--muted-foreground)] hover:text-coral transition-colors"
                          title="Remove"
                        >
                          <HiX size={9} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Sidebar bottom indicator for active pane target */}
            <div className="p-3 bg-[var(--background)] border-t border-[var(--card-border)]/50 text-[10px] font-bold text-[var(--muted-foreground)] flex items-center justify-between">
              <span>Recents target:</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase tracking-wider text-[8px]">
                {activePane} Pane
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN LAYOUT CONTAINER */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[var(--background)]">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)]/80 p-3 bg-[var(--card-bg)] flex-wrap gap-2 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-xl border-2 transition-colors ${
                showHistory ? 'border-primary bg-primary/5 text-primary' : 'border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-primary/30'
              }`}
              title={showHistory ? 'Hide recents' : 'Show recents'}
            >
              {showHistory ? <HiChevronLeft size={16} /> : <HiClock size={16} />}
            </button>
            <div>
              <h1 className="text-xs md:text-sm font-heading font-black flex items-center gap-1.5">
                <span>📖</span> Document Reader
              </h1>
              <p className="text-[9px] text-[var(--muted-foreground)] max-w-[120px] sm:max-w-xs truncate">
                Access your PDFs, images, or study guides side-by-side.
              </p>
            </div>
          </div>

          {/* Global Mode selectors */}
          <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-1 shadow-sm">
            {/* Split Screen button */}
            <button
              onClick={() => {
                const nextSplit = !isSplit;
                setIsSplit(nextSplit);
                setActivePane('left'); // reset active pane focus
                if (nextSplit) {
                  setShowHistory(false); // auto-collapse sidebar for screen efficiency!
                  toast.success('Split view enabled! Sidebar collapsed for extra space.');
                }
              }}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                isSplit 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'border border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-primary/30 hover:bg-primary/5'
              }`}
            >
              <HiTemplate size={14} /> {isSplit ? 'Single Screen' : 'Split Screen'}
            </button>
          </div>
        </div>

        {/* Viewports Container */}
        <div className="flex-1 p-3 md:p-4 min-h-0 overflow-hidden relative">
          {!isSplit ? (
            /* Single viewer pane */
            <div className="w-full h-full">
              {renderLeftPane()}
            </div>
          ) : (
            /* Side-by-Side draggable resizable panes */
            <ResizableSplitLayout
              editor={renderLeftPane()}
              panel={renderRightPane()}
              defaultSplit={50}
            />
          )}
        </div>
      </div>
    </div>
  );
}
