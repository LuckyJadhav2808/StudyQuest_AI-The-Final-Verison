'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiSwitchHorizontal,
  HiDownload,
  HiTrash,
  HiCheck,
  HiSparkles,
  HiPencil,
  HiDocumentText,
  HiTable,
  HiPhotograph,
  HiPresentationChartBar,
  HiShieldCheck,
  HiEye,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import StudioToolbar from '../shared/StudioToolbar';
import DropzoneZone from '../shared/DropzoneZone';
import {
  UniversalDocType,
  ConversionFormat,
  ConversionTargetOption,
  ConvertedDocumentResult,
} from '@/lib/docstudio/types';
import {
  detectDocumentType,
  getAvailableConversionTargets,
  convertDocument,
} from '@/lib/docstudio/universalConverter';
import { formatBytes } from '@/lib/docstudio/compressor';

interface UniversalConverterProps {
  onBack: () => void;
  onOpenInReader?: (file: { name: string; src: string; type: 'pdf' | 'image' | 'text' }) => void;
  onSendToNotes?: (contentOrBlob: string | Blob, title: string) => void;
}

interface QueuedConvertFile {
  id: string;
  file: File;
  docType: UniversalDocType;
  selectedTarget: ConversionFormat;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: ConvertedDocumentResult;
  customName?: string;
  errorMessage?: string;
  progressText?: string;
  progressPercent?: number;
}

export default function UniversalConverter({
  onBack,
  onOpenInReader,
  onSendToNotes,
}: UniversalConverterProps) {
  const [queue, setQueue] = useState<QueuedConvertFile[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);

  const activeItem = queue[activeIdx];

  // Handle uploading documents
  const handleUploadFiles = (files: File[]) => {
    if (files.length === 0) return;

    const newItems: QueuedConvertFile[] = files.map((file, idx) => {
      const docType = detectDocumentType(file);
      const targets = getAvailableConversionTargets(docType, file.name);
      const defaultTarget = targets.length > 0 ? targets[0].format : 'pdf';

      return {
        id: `convert-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        file,
        docType,
        selectedTarget: defaultTarget,
        status: 'pending',
        customName: file.name.replace(/\.[^/.]+$/, ''),
      };
    });

    setQueue((prev) => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} document${newItems.length > 1 ? 's' : ''} to converter queue`);
  };

  // Run conversion for a single item
  const processItem = async (idx: number, specificTarget?: ConversionFormat) => {
    const item = queue[idx];
    if (!item) return;

    const targetFormat = specificTarget || item.selectedTarget;

    setQueue((prev) =>
      prev.map((q, i) =>
        i === idx
          ? {
              ...q,
              status: 'processing',
              selectedTarget: targetFormat,
              errorMessage: undefined,
              progressText: 'Initializing conversion...',
              progressPercent: 5,
            }
          : q
      )
    );

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Conversion took longer than expected. Please try again or select another format.')),
          90000
        )
      );

      const result = await Promise.race([
        convertDocument(item.file, targetFormat, {
          onProgress: (step, current, total) => {
            const percent = total > 0 ? Math.min(98, Math.max(5, Math.round((current / total) * 100))) : 50;
            setQueue((prev) =>
              prev.map((q, i) =>
                i === idx ? { ...q, progressText: step, progressPercent: percent } : q
              )
            );
          },
        }),
        timeoutPromise,
      ]);

      if (item.customName && item.customName.trim().length > 0) {
        result.fileName = `${item.customName.trim()}${result.extension}`;
      }

      setQueue((prev) =>
        prev.map((q, i) =>
          i === idx
            ? {
                ...q,
                status: 'done',
                result,
                selectedTarget: targetFormat,
                progressPercent: 100,
                progressText: 'Completed',
              }
            : q
        )
      );

      toast.success(`Converted ${item.file.name} to ${result.extension.toUpperCase()}`);
    } catch (err: unknown) {
      console.error('Conversion failed', err);
      const msg = err instanceof Error ? err.message : 'Conversion failed';
      setQueue((prev) =>
        prev.map((q, i) => (i === idx ? { ...q, status: 'error', errorMessage: msg } : q))
      );
      toast.error(msg);
    }
  };

  // Convert all pending files sequentially
  const handleConvertAll = async () => {
    if (queue.length === 0 || isProcessingAll) return;
    setIsProcessingAll(true);

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status !== 'done') {
        setActiveIdx(i);
        await processItem(i);
      }
    }

    setIsProcessingAll(false);
    toast.success('Batch conversion complete!');
  };

  // Remove item from queue
  const handleRemove = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const removed = queue[idx];
    if (removed?.result?.previewUrl) {
      URL.revokeObjectURL(removed.result.previewUrl);
    }

    setQueue((prev) => prev.filter((_, i) => i !== idx));
    if (activeIdx >= idx && activeIdx > 0) {
      setActiveIdx((prev) => prev - 1);
    }
  };

  // Download converted document
  const handleDownloadResult = (item: QueuedConvertFile) => {
    if (!item.result) return;
    const url = URL.createObjectURL(item.result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.customName
      ? `${item.customName}${item.result.extension}`
      : item.result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast.success(`Downloaded ${a.download}`);
  };

  // Open in StudyQuest Split Reader
  const handleOpenInReader = async (item: QueuedConvertFile) => {
    if (!item.result || !onOpenInReader) return;

    let readerType: 'pdf' | 'image' | 'text' = 'text';
    if (item.result.extension === '.pdf') readerType = 'pdf';
    else if (['.png', '.jpg', '.jpeg', '.webp'].includes(item.result.extension)) readerType = 'image';

    let src = '';
    if (readerType === 'text') {
      try {
        src = await item.result.blob.text();
      } catch {
        src = URL.createObjectURL(item.result.blob);
      }
    } else {
      src = URL.createObjectURL(item.result.blob);
    }

    onOpenInReader({
      name: item.result.fileName,
      src,
      type: readerType,
    });
    toast.success(`Opened ${item.result.fileName} in Split Reader`);
  };

  // Send to StudyQuest Notes
  const handleSendToNotes = (item: QueuedConvertFile) => {
    if (!item.result || !onSendToNotes) return;
    onSendToNotes(item.result.blob, item.customName || item.result.fileName);
    toast.success(`Sent ${item.result.fileName} to Notes`);
  };

  // Get type icon
  const getDocTypeIcon = (type: UniversalDocType, name: string) => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.txt') || lower.endsWith('.md')) {
      return <HiDocumentText className="w-4 h-4 text-emerald-500" />;
    }
    switch (type) {
      case 'pdf':
        return <HiDocumentText className="w-4 h-4 text-rose-500" />;
      case 'docx':
        return <HiDocumentText className="w-4 h-4 text-blue-500" />;
      case 'pptx':
        return <HiPresentationChartBar className="w-4 h-4 text-orange-500" />;
      case 'xlsx':
      case 'csv':
        return <HiTable className="w-4 h-4 text-emerald-500" />;
      case 'image':
        return <HiPhotograph className="w-4 h-4 text-sky-500" />;
      default:
        return <HiSwitchHorizontal className="w-4 h-4 text-primary" />;
    }
  };

  const availableTargets: ConversionTargetOption[] = activeItem
    ? getAvailableConversionTargets(activeItem.docType, activeItem.file.name)
    : [];

  return (
    <div className="flex flex-col h-full text-foreground">
      {/* Studio Header Toolbar */}
      <StudioToolbar
        toolTitle="Universal Document & File Converter"
        toolDescription="Convert any document to any document 100% in-browser with zero server uploads"
        badgeText="Any to Any"
        icon={<HiSwitchHorizontal className="text-cyan-500" />}
        onBack={onBack}
        fileName={activeItem?.customName || activeItem?.file.name.replace(/\.[^/.]+$/, '') || ''}
        onFileNameChange={(newName) => {
          if (activeItem) {
            setQueue((prev) =>
              prev.map((q, i) => (i === activeIdx ? { ...q, customName: newName } : q))
            );
          }
        }}
        fileExtension={activeItem?.result?.extension.replace('.', '') || activeItem?.selectedTarget || 'pdf'}
        extraActions={
          activeItem?.status === 'done' && activeItem.result ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleDownloadResult(activeItem)}
              className="flex items-center gap-1.5 shadow-sm shadow-primary/20"
            >
              <HiDownload className="w-4 h-4" />
              <span>Download Converted File</span>
            </Button>
          ) : activeItem ? (
            <Button
              size="sm"
              variant="primary"
              disabled={activeItem.status === 'processing'}
              onClick={() => processItem(activeIdx)}
              className="flex items-center gap-1.5 shadow-sm shadow-primary/20"
            >
              <HiSwitchHorizontal className={`w-4 h-4 ${activeItem.status === 'processing' ? 'animate-spin' : ''}`} />
              <span>
                {activeItem.status === 'processing'
                  ? 'Converting...'
                  : `Convert to ${activeItem.selectedTarget.toUpperCase()}`}
              </span>
            </Button>
          ) : undefined
        }
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {queue.length === 0 ? (
          /* Empty State: Drag and Drop Upload Hub */
          <div className="max-w-2xl mx-auto w-full py-8 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full text-center space-y-5"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 text-primary border border-primary/25 shadow-lg shadow-primary/10">
                <HiSwitchHorizontal className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Universal Document & File Converter
                </h2>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  Convert between <strong>PDF</strong>, <strong>Word (.docx)</strong>,{' '}
                  <strong>PowerPoint (.pptx)</strong>, <strong>Excel (.xlsx)</strong>,{' '}
                  <strong>CSV</strong>, <strong>Images</strong>, and <strong>Markdown</strong> without
                  subscriptions or file size limits.
                </p>
              </div>

              {/* Dropzone Upload Component */}
              <DropzoneZone
                onFilesSelected={handleUploadFiles}
                accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.csv,.tsv,.txt,.md"
                multiple={true}
                title="Drop files here to convert"
                description="Accepts PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), CSV, Images, and Text"
                allowedFormatsText="PDF, DOCX, PPTX, XLSX, PNG, JPG, WebP, CSV, TXT, MD"
                maxFilesText="Multi-file batch enabled"
              />

              {/* Privacy & Conversion Matrix Feature Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-left">
                <div className="p-3.5 rounded-xl bg-surface/60 border border-border">
                  <div className="text-base mb-1">📕 ➔ 📝</div>
                  <div className="font-bold text-xs text-foreground">PDF to Word</div>
                  <div className="text-[11px] text-muted-foreground">Editable .DOCX</div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface/60 border border-border">
                  <div className="text-base mb-1">💼 ➔ 📕</div>
                  <div className="font-bold text-xs text-foreground">Office to PDF</div>
                  <div className="text-[11px] text-muted-foreground">DOCX, PPTX & Excel</div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface/60 border border-border">
                  <div className="text-base mb-1">📊 ➔ 📗</div>
                  <div className="font-bold text-xs text-foreground">CSV to Excel</div>
                  <div className="text-[11px] text-muted-foreground">XLSX, JSON & Tables</div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface/60 border border-border">
                  <div className="text-base mb-1">🛡️ ➔ 🔒</div>
                  <div className="font-bold text-xs text-foreground">100% In-Memory</div>
                  <div className="text-[11px] text-muted-foreground">Zero Server Uploads</div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Active Converter Multi-File Workbench */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
            {/* Left Column: Conversion Queue (4 Columns) */}
            <div className="lg:col-span-4 flex flex-col min-h-0 bg-surface/40 rounded-2xl border border-border p-4 gap-3">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    Files Queue ({queue.length})
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Select document to configure
                  </p>
                </div>

                {queue.length > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConvertAll}
                    disabled={isProcessingAll}
                    className="text-xs py-1 px-2.5 h-auto"
                  >
                    <HiSwitchHorizontal className={`w-3.5 h-3.5 mr-1 ${isProcessingAll ? 'animate-spin' : ''}`} />
                    <span>{isProcessingAll ? 'Converting...' : 'Convert All'}</span>
                  </Button>
                )}
              </div>

              {/* Queue Item List */}
              <div className="divide-y divide-border/40 max-h-[440px] overflow-y-auto -mx-1 px-1">
                {queue.map((item, idx) => {
                  const isSelected = idx === activeIdx;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveIdx(idx)}
                      className={`group relative flex items-center justify-between p-2.5 my-1 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary/15 border border-primary/40 shadow-xs'
                          : 'hover:bg-surface/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="p-2 rounded-lg bg-surface shrink-0 border border-border/40">
                          {getDocTypeIcon(item.docType, item.file.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {item.customName ? `${item.customName}.${item.file.name.split('.').pop()}` : item.file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {formatBytes(item.file.size)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">➔</span>
                            <span className="text-[10px] font-bold text-primary uppercase">
                              {item.selectedTarget}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge & Remove */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'processing' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                            Converting
                          </span>
                        )}
                        {item.status === 'done' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <HiCheck className="w-3 h-3 mr-0.5" /> Done
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            Error
                          </span>
                        )}
                        <button
                          onClick={(e) => handleRemove(idx, e)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Remove file"
                        >
                          <HiTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add More Files Trigger */}
              <div className="mt-auto pt-3 border-t border-border/60">
                <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl border border-dashed border-border hover:border-primary/50 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors bg-surface/30 hover:bg-surface/60">
                  <HiSparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Add More Documents</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleUploadFiles(Array.from(e.target.files));
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Right Column: Active Conversion Workbench (8 Columns) */}
            <div className="lg:col-span-8 flex flex-col min-h-0 bg-surface/40 rounded-2xl border border-border p-4 gap-4 overflow-y-auto">
              {activeItem && (
                <>
                  {/* File Metadata & Custom Rename Header */}
                  <div className="p-4 rounded-xl bg-surface/60 border border-border space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                          {getDocTypeIcon(activeItem.docType, activeItem.file.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono uppercase tracking-wider">
                              {activeItem.docType}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatBytes(activeItem.file.size)}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-foreground truncate mt-0.5">
                            {activeItem.file.name}
                          </h3>
                        </div>
                      </div>

                      {/* Rename Input Capsule */}
                      <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-xl border border-border">
                        <HiPencil className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          value={activeItem.customName || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQueue((prev) =>
                              prev.map((q, i) => (i === activeIdx ? { ...q, customName: val } : q))
                            );
                          }}
                          placeholder="Output file name..."
                          className="bg-transparent border-none text-xs text-foreground focus:outline-hidden w-36 sm:w-44 font-medium"
                        />
                        <span className="text-xs font-mono font-bold text-primary uppercase">
                          {activeItem.result?.extension || `.${activeItem.selectedTarget}`}
                        </span>
                      </div>
                    </div>

                    {/* Available Target Formats Matrix */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Select Target Output Format
                        </label>
                        <span className="text-xs text-muted-foreground">
                          {availableTargets.length} formats available
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {availableTargets.map((target) => {
                          const isSelected = activeItem.selectedTarget === target.format;
                          return (
                            <button
                              key={target.format}
                              type="button"
                              onClick={() => {
                                setQueue((prev) =>
                                  prev.map((q, i) =>
                                    i === activeIdx
                                      ? {
                                          ...q,
                                          selectedTarget: target.format,
                                          status: q.result?.targetFormat === target.format ? 'done' : 'pending',
                                        }
                                      : q
                                  )
                                );
                              }}
                              className={`relative text-left p-3 rounded-xl border transition-all ${
                                isSelected
                                  ? 'bg-primary/15 border-primary shadow-sm ring-1 ring-primary/40'
                                  : 'bg-surface/50 border-border hover:border-primary/40 hover:bg-surface/80'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xl shrink-0">{target.icon}</span>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-xs text-foreground">
                                        {target.label}
                                      </span>
                                      <span className="font-mono text-[10px] font-bold text-primary">
                                        {target.extension}
                                      </span>
                                    </div>
                                    <span className="inline-block mt-0.5 text-[10px] font-medium text-muted-foreground">
                                      {target.badge}
                                    </span>
                                  </div>
                                </div>

                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                                    <HiCheck className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>

                              <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">
                                {target.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Convert Trigger */}
                    <div className="pt-3 border-t border-border/60 flex flex-col gap-2.5">
                      {activeItem.status === 'processing' && (
                        <div className="space-y-1.5 p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 font-medium text-primary">
                              <HiSwitchHorizontal className="w-3.5 h-3.5 animate-spin" />
                              <span>{activeItem.progressText || 'Converting presentation...'}</span>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-primary">
                              {activeItem.progressPercent || 10}%
                            </span>
                          </div>
                          <div className="w-full bg-primary/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all duration-300 rounded-full"
                              style={{ width: `${Math.max(5, activeItem.progressPercent || 10)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <HiShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Processed 100% locally in browser memory</span>
                        </div>

                        <Button
                          size="md"
                          variant="primary"
                          disabled={activeItem.status === 'processing'}
                          onClick={() => processItem(activeIdx)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                        >
                          <HiSwitchHorizontal className={`w-4 h-4 ${activeItem.status === 'processing' ? 'animate-spin' : ''}`} />
                          <span>
                            {activeItem.status === 'processing'
                              ? activeItem.progressText || 'Processing Conversion...'
                              : activeItem.status === 'done'
                              ? `Re-convert to ${activeItem.selectedTarget.toUpperCase()}`
                              : `Convert to ${activeItem.selectedTarget.toUpperCase()}`}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Conversion Result Showcase Deck */}
                  <AnimatePresence>
                    {activeItem.status === 'done' && activeItem.result && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 shadow-xs">
                          <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/60">
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                                <HiCheck className="w-3.5 h-3.5" />
                                <span>Conversion Ready</span>
                              </div>
                              <h4 className="text-sm font-bold text-foreground">
                                {activeItem.customName
                                  ? `${activeItem.customName}${activeItem.result.extension}`
                                  : activeItem.result.fileName}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {activeItem.result.summaryText}
                              </p>
                            </div>

                            {/* Output Size Pill */}
                            <div className="text-right shrink-0">
                              <div className="text-[10px] text-muted-foreground uppercase font-bold">Output Size</div>
                              <div className="text-xs font-mono font-bold text-foreground">
                                {formatBytes(activeItem.result.convertedBytes)}
                              </div>
                            </div>
                          </div>

                          {/* Action Hub: Download, Split Reader, Notes */}
                          <div className="pt-1 flex flex-wrap items-center gap-2.5">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleDownloadResult(activeItem)}
                              className="flex items-center gap-1.5 shadow-sm shadow-primary/20"
                            >
                              <HiDownload className="w-4 h-4" />
                              <span>Download File</span>
                            </Button>

                            {/* Split Reader Integration */}
                            {(activeItem.result.extension === '.pdf' ||
                              ['.png', '.jpg', '.jpeg', '.webp'].includes(activeItem.result.extension) ||
                              activeItem.result.extension === '.txt') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenInReader(activeItem)}
                                className="flex items-center gap-1.5"
                              >
                                <HiEye className="w-4 h-4 text-sky-500" />
                                <span>Open in Split Reader</span>
                              </Button>
                            )}

                            {/* Notes Integration */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendToNotes(activeItem)}
                              className="flex items-center gap-1.5"
                            >
                              <HiDocumentText className="w-4 h-4 text-emerald-500" />
                              <span>Send to Notes</span>
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
