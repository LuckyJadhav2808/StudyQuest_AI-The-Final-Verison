'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiLightningBolt,
  HiDownload,
  HiTrash,
  HiCheck,
  HiInformationCircle,
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
import Card from '@/components/ui/Card';
import StudioToolbar from '../shared/StudioToolbar';
import DropzoneZone from '../shared/DropzoneZone';
import {
  CompressionPreset,
  UniversalDocType,
  CompressedDocumentResult,
} from '@/lib/docstudio/types';
import {
  compressAnyDocument,
  detectDocType,
} from '@/lib/docstudio/universalCompressor';
import { formatBytes } from '@/lib/docstudio/compressor';

interface UniversalCompressorProps {
  onBack: () => void;
  onOpenInReader?: (file: { name: string; src: string; type: 'pdf' | 'image' | 'text' }) => void;
  onSendToNotes?: (contentOrBlob: string | Blob, title: string) => void;
}

interface QueuedFile {
  id: string;
  file: File;
  docType: UniversalDocType;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: CompressedDocumentResult;
  customName?: string;
  errorMessage?: string;
}

export default function UniversalCompressor({
  onBack,
  onOpenInReader,
  onSendToNotes,
}: UniversalCompressorProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [preset, setPreset] = useState<CompressionPreset>('balanced');
  const [pdfMode, setPdfMode] = useState<'smart' | 'raster'>('smart');
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);

  const activeItem = queue[activeIdx];

  // Handle uploading documents
  const handleUploadFiles = (files: File[]) => {
    if (files.length === 0) return;

    const newItems: QueuedFile[] = files.map((file, idx) => ({
      id: `file-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      file,
      docType: detectDocType(file.name, file.type),
      status: 'pending',
      customName: file.name.replace(/\.[^/.]+$/, ''),
    }));

    setQueue((prev) => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} document${newItems.length > 1 ? 's' : ''} to queue`);
  };

  // Run compression for a single item
  const processItem = async (idx: number, customPreset?: CompressionPreset) => {
    const item = queue[idx];
    if (!item) return;

    setQueue((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, status: 'processing', errorMessage: undefined } : q))
    );

    try {
      const activeOptions = {
        preset: customPreset || preset,
        pdfMode,
      };

      const result = await compressAnyDocument(item.file, activeOptions);

      setQueue((prev) =>
        prev.map((q, i) =>
          i === idx
            ? {
                ...q,
                status: 'done',
                result,
                customName: q.customName || result.fileName.replace(/\.[^/.]+$/, ''),
              }
            : q
        )
      );
      toast.success(`Compressed: ${item.file.name} (${result.savingsPercent}% saved)`);
    } catch (err) {
      console.error(err);
      setQueue((prev) =>
        prev.map((q, i) =>
          i === idx
            ? {
                ...q,
                status: 'error',
                errorMessage: 'Compression failed or file is unsupported',
              }
            : q
        )
      );
      toast.error(`Failed to compress ${item.file.name}`);
    }
  };

  // Process all pending items
  const handleProcessAll = async () => {
    if (queue.length === 0) return;
    setIsProcessingAll(true);

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status !== 'done') {
        await processItem(i);
      }
    }

    setIsProcessingAll(false);
  };

  // Download single compressed file
  const handleDownload = (idx: number) => {
    const item = queue[idx];
    if (!item || !item.result) return;

    const ext = item.result.extension;
    const baseName = (item.customName?.trim() || item.result.fileName.replace(/\.[^/.]+$/, '')).replace(
      new RegExp(`\\${ext}$`, 'i'),
      ''
    );
    const downloadName = `${baseName}_compressed${ext}`;

    const url = URL.createObjectURL(item.result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast.success(`Downloaded ${downloadName}`);
  };

  // Open in Split Reader
  const handleOpenReader = (idx: number) => {
    const item = queue[idx];
    if (!item || !item.result || !onOpenInReader) return;

    const ext = item.result.extension;
    const baseName = (item.customName?.trim() || item.result.fileName.replace(/\.[^/.]+$/, '')).replace(
      new RegExp(`\\${ext}$`, 'i'),
      ''
    );
    const downloadName = `${baseName}_compressed${ext}`;
    const url = URL.createObjectURL(item.result.blob);

    if (item.docType === 'pdf') {
      onOpenInReader({ name: downloadName, src: url, type: 'pdf' });
      toast.success('Opened compressed PDF in Split Reader!');
    } else if (item.docType === 'image') {
      onOpenInReader({ name: downloadName, src: url, type: 'image' });
      toast.success('Opened compressed Image in Split Reader!');
    } else {
      toast.error('Only PDF and Image files can be opened in the reader');
    }
  };

  // Send to StudyQuest Notes
  const handleSendToNotes = (idx: number) => {
    const item = queue[idx];
    if (!item || !item.result || !onSendToNotes) return;

    const ext = item.result.extension;
    const baseName = (item.customName?.trim() || item.result.fileName.replace(/\.[^/.]+$/, '')).replace(
      new RegExp(`\\${ext}$`, 'i'),
      ''
    );
    const downloadName = `${baseName}_compressed${ext}`;

    onSendToNotes(item.result.blob, downloadName);
    toast.success('Attached compressed document to Notes!');
  };

  // Remove item
  const handleRemove = (idx: number) => {
    setQueue((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (activeIdx >= next.length && next.length > 0) {
        setActiveIdx(next.length - 1);
      }
      return next;
    });
  };

  // Reset entire queue
  const handleReset = () => {
    setQueue([]);
    setActiveIdx(0);
  };

  // Format badge icon helper
  const renderDocIcon = (type: UniversalDocType) => {
    switch (type) {
      case 'pdf':
        return <HiDocumentText className="w-5 h-5 text-rose-500" />;
      case 'docx':
        return <HiDocumentText className="w-5 h-5 text-blue-500" />;
      case 'pptx':
        return <HiPresentationChartBar className="w-5 h-5 text-orange-500" />;
      case 'xlsx':
        return <HiTable className="w-5 h-5 text-emerald-500" />;
      case 'image':
        return <HiPhotograph className="w-5 h-5 text-sky-500" />;
      default:
        return <HiDocumentText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <StudioToolbar
        toolTitle="Universal Document & File Compressor"
        toolDescription="Compress PDFs, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), and images client-side to beat strict portal caps"
        badgeText="All Formats"
        icon={<HiLightningBolt className="text-amber-500" />}
        onBack={onBack}
        onReset={queue.length > 0 ? handleReset : undefined}
        onDownload={activeItem && activeItem.result ? () => handleDownload(activeIdx) : undefined}
        downloadLabel={
          activeItem && activeItem.result
            ? `Download (${formatBytes(activeItem.result.compressedBytes)})`
            : undefined
        }
        fileName={activeItem ? activeItem.customName : undefined}
        onFileNameChange={
          activeItem
            ? (val) =>
                setQueue((prev) =>
                  prev.map((q, i) => (i === activeIdx ? { ...q, customName: val } : q))
                )
            : undefined
        }
        fileExtension={activeItem?.result?.extension.replace('.', '')}
      />

      {queue.length === 0 ? (
        <div className="max-w-2xl mx-auto w-full py-8">
          <DropzoneZone
            onFilesSelected={handleUploadFiles}
            accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.csv,.tsv,.txt"
            multiple={true}
            title="Drop any PDF, Office document, or image here"
            description="Supports PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), Images (JPG/PNG), and CSV datasets"
            allowedFormatsText="PDF, DOCX, PPTX, XLSX, PNG, JPG, WebP, CSV"
            maxFilesText="Multi-file batch enabled"
          />

          {/* Value Propositions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
            <div className="p-4 rounded-xl bg-surface/60 border border-border flex items-start gap-3">
              <span className="text-xl">🗜️</span>
              <div>
                <h4 className="text-xs font-bold text-foreground">Deep ZIP & Media Squeeze</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Downsamples embedded 4K photos in Word & PPTX decks to shrink 80MB files by up to 90%.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface/60 border border-border flex items-start gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <h4 className="text-xs font-bold text-foreground">LMS Portal Ready</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pre-configured algorithms designed specifically to pass Blackboard, Canvas & Moodle upload caps.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface/60 border border-border flex items-start gap-3">
              <span className="text-xl">🔒</span>
              <div>
                <h4 className="text-xs font-bold text-foreground">100% In-Browser Memory</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Never uploads your documents or lecture slides to any external server. 100% private.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          {/* Main Workbench Details & Telemetry */}
          <div className="lg:col-span-8 flex flex-col min-h-0 bg-surface/40 rounded-2xl border border-border p-4 gap-4">
            {/* Top Queue Telemetry Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Queue ({queue.length} file{queue.length > 1 ? 's' : ''})
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Total Size:{' '}
                  <strong>{formatBytes(queue.reduce((acc, q) => acc + q.file.size, 0))}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleProcessAll}
                  disabled={isProcessingAll || queue.every((q) => q.status === 'done')}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <HiLightningBolt className="w-3.5 h-3.5 mr-1" />
                  {isProcessingAll ? 'Compressing Queue...' : 'Compress All Files'}
                </Button>

                <Button variant="ghost" size="sm" onClick={() => handleUploadFiles([])}>
                  + Add More
                </Button>
              </div>
            </div>

            {/* Active Document Card & Telemetry */}
            {activeItem && (
              <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
                {/* Active File Header */}
                <div className="p-4 rounded-xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 flex items-center justify-center">
                      {renderDocIcon(activeItem.docType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border text-xs">
                          <HiPencil className="w-3.5 h-3.5 text-primary shrink-0" />
                          <input
                            type="text"
                            value={activeItem.customName || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQueue((prev) =>
                                prev.map((q, i) => (i === activeIdx ? { ...q, customName: val } : q))
                              );
                            }}
                            placeholder="Output name"
                            className="bg-transparent font-bold text-foreground focus:outline-hidden text-xs w-36 sm:w-56"
                            title="Rename output file"
                          />
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">
                            {activeItem.result?.extension || activeItem.file.name.slice(activeItem.file.name.lastIndexOf('.'))}
                          </span>
                        </div>

                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                          {activeItem.docType}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Original: {formatBytes(activeItem.file.size)} • Type: {activeItem.file.type || 'Binary file'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeItem.status === 'done' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownload(activeIdx)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <HiDownload className="w-3.5 h-3.5 mr-1" />
                        Download
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => processItem(activeIdx)}
                        disabled={activeItem.status === 'processing'}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <HiLightningBolt className="w-3.5 h-3.5 mr-1" />
                        {activeItem.status === 'processing' ? 'Compressing...' : 'Compress Document'}
                      </Button>
                    )}

                    {onOpenInReader &&
                      activeItem.result &&
                      (activeItem.docType === 'pdf' || activeItem.docType === 'image') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReader(activeIdx)}
                        >
                          <HiEye className="w-3.5 h-3.5 mr-1" />
                          Split Reader
                        </Button>
                      )}

                    {onSendToNotes && activeItem.result && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendToNotes(activeIdx)}
                      >
                        To Notes
                      </Button>
                    )}
                  </div>
                </div>

                {/* Reduction Telemetry Card */}
                {activeItem.result ? (
                  <Card className="p-5 bg-emerald-500/5 border-emerald-500/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-foreground">Compression Telemetry</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          {activeItem.result.savingsPercent}% Size Reduction
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Saved {formatBytes(activeItem.result.originalBytes - activeItem.result.compressedBytes)}
                      </span>
                    </div>

                    {/* Visual Compression Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Original: {formatBytes(activeItem.result.originalBytes)}</span>
                        <span className="font-bold text-foreground">
                          Compressed: {formatBytes(activeItem.result.compressedBytes)}
                        </span>
                      </div>
                      <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                        <motion.div
                          initial={{ width: '100%' }}
                          animate={{
                            width: `${Math.max(
                              5,
                              Math.round(
                                (activeItem.result.compressedBytes / activeItem.result.originalBytes) * 100
                              )
                            )}%`,
                          }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {activeItem.result.summaryText}. Ready for immediate submission to LMS portals without exceeding attachment caps.
                    </p>
                  </Card>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center">
                    <span className="text-3xl mb-2">⚡</span>
                    <h4 className="text-xs font-bold text-foreground">Ready to Compress</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                      Select your desired quality preset on the right, then click Compress Document to optimize in memory.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => processItem(activeIdx)}
                      disabled={activeItem.status === 'processing'}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <HiLightningBolt className="w-3.5 h-3.5 mr-1" />
                      Compress {activeItem.file.name}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Control Strip & Settings */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Compression Presets */}
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <HiSparkles className="w-4 h-4 text-amber-500" />
                Compression Preset
              </h3>

              <div className="space-y-2">
                <button
                  onClick={() => setPreset('portal')}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                    preset === 'portal'
                      ? 'border-amber-500 bg-amber-500/10 font-bold shadow-xs'
                      : 'border-border bg-surface hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>🚀 LMS / Portal Squeeze</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                      &lt; 2–5 MB Cap
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight font-normal">
                    Maximum reduction. Ideal for strict Canvas, Moodle, and email attachment caps.
                  </p>
                </button>

                <button
                  onClick={() => setPreset('balanced')}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                    preset === 'balanced'
                      ? 'border-primary bg-primary/10 font-bold shadow-xs'
                      : 'border-border bg-surface hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>⚖️ Balanced Study Quality</span>
                    <span className="text-[10px] text-primary font-bold">Recommended</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight font-normal">
                    ~70% size reduction with sharp text and clear diagrams.
                  </p>
                </button>

                <button
                  onClick={() => setPreset('high_quality')}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                    preset === 'high_quality'
                      ? 'border-sky-500 bg-sky-500/10 font-bold shadow-xs'
                      : 'border-border bg-surface hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>💎 Minimal Loss / Archival</span>
                    <span className="text-[10px] text-sky-500 font-bold">Pristine</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight font-normal">
                    Cleans XML bloat & stream metadata while keeping original high-res media.
                  </p>
                </button>
              </div>

              {/* PDF Specific Mode Selector if active item is PDF */}
              {activeItem && activeItem.docType === 'pdf' && (
                <div className="pt-3 border-t border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    PDF Engine Mode
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setPdfMode('smart')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        pdfMode === 'smart'
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Smart Stream
                    </button>
                    <button
                      onClick={() => setPdfMode('raster')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        pdfMode === 'raster'
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Canvas Squeeze
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* Queue Navigator List */}
            <Card className="p-3 flex-1 flex flex-col min-h-[220px]">
              <h4 className="text-xs font-bold text-foreground mb-2 flex items-center justify-between">
                <span>File Queue</span>
                <span className="text-[10px] text-muted-foreground">{queue.length} items</span>
              </h4>

              <div className="space-y-1.5 overflow-y-auto max-h-[35vh] p-1 flex-1">
                {queue.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveIdx(idx)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      idx === activeIdx
                        ? 'border-primary bg-primary/10 shadow-2xs'
                        : 'border-border bg-surface hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {renderDocIcon(item.docType)}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate max-w-[140px] sm:max-w-[180px]">
                          {item.customName || item.file.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatBytes(item.file.size)}{' '}
                          {item.result && (
                            <strong className="text-emerald-500">
                              → {formatBytes(item.result.compressedBytes)} (-{item.result.savingsPercent}%)
                            </strong>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.status === 'processing' && (
                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                      {item.status === 'done' && (
                        <span className="text-emerald-500 text-sm">
                          <HiCheck />
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(idx);
                        }}
                        className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                        title="Remove from queue"
                      >
                        <HiTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
