'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiUpload,
  HiTrash,
  HiRefresh,
  HiAdjustments,
  HiSparkles,
  HiDocumentText,
  HiColorSwatch,
  HiArrowLeft,
  HiArrowRight,
  HiPhotograph,
  HiDownload,
  HiCheck,
  HiEye,
  HiPencil,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StudioToolbar from '../shared/StudioToolbar';
import DropzoneZone from '../shared/DropzoneZone';
import { Point2D, ScanFilterMode, ScanPage } from '@/lib/docstudio/types';
import { processScanPage, loadImage } from '@/lib/docstudio/imageEngine';
import { compileScanPagesToPdf } from '@/lib/docstudio/pdfEngine';

interface HomeworkScannerProps {
  onBack: () => void;
  onOpenInReader?: (file: { name: string; src: string; type: 'pdf' }) => void;
  onSendToNotes?: (pdfBlob: Blob, title: string) => void;
}

export default function HomeworkScanner({ onBack, onOpenInReader, onSendToNotes }: HomeworkScannerProps) {
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [exportFileName, setExportFileName] = useState<string>(() => `Homework_Submission_${new Date().toISOString().slice(0, 10)}`);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCornerMode, setIsCornerMode] = useState<boolean>(false);
  const [cornerPins, setCornerPins] = useState<[Point2D, Point2D, Point2D, Point2D] | null>(null);
  const [activeCornerIdx, setActiveCornerIdx] = useState<number | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const activePage = pages[activePageIndex];

  const handleCornerPointerDown = (idx: number, e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setActiveCornerIdx(idx);
  };

  const handleCornerPointerMove = (idx: number, e: React.PointerEvent) => {
    if (activeCornerIdx !== idx || !cornerPins || !imageWrapperRef.current || !activePage) return;
    const rect = imageWrapperRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const newPins = [...cornerPins] as [Point2D, Point2D, Point2D, Point2D];
    newPins[idx] = {
      x: Math.round(relX * activePage.width),
      y: Math.round(relY * activePage.height),
    };
    setCornerPins(newPins);
  };

  const handleCornerPointerUp = () => {
    setActiveCornerIdx(null);
  };

  // Handle uploading photos
  const handleUploadPhotos = async (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      toast.error('Please upload image files (JPG, PNG, WebP).');
      return;
    }

    setIsProcessing(true);
    const newPages: ScanPage[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const img = await loadImage(dataUrl);

      // Process initial magic clean
      const initialProcessed = await processScanPage(dataUrl, 'magic', 0, 0, 0);

      newPages.push({
        id: `scan-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        originalSrc: dataUrl,
        processedSrc: initialProcessed,
        rotation: 0,
        filterMode: 'magic',
        brightness: 0,
        contrast: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    }

    setPages((prev) => {
      if (prev.length === 0 && newPages.length > 0) {
        setExportFileName(`${newPages[0].name}_Submission`);
      }
      return [...prev, ...newPages];
    });
    setIsProcessing(false);
    toast.success(`Added ${newPages.length} homework page${newPages.length > 1 ? 's' : ''}`);
  };

  // Re-process current page whenever filter, rotation, or corners change
  const refreshActivePage = useCallback(
    async (override?: Partial<ScanPage>) => {
      if (!activePage) return;
      const target = { ...activePage, ...override };

      try {
        setIsProcessing(true);
        const updatedSrc = await processScanPage(
          target.originalSrc,
          target.filterMode,
          target.rotation,
          target.brightness,
          target.contrast,
          target.corners
        );

        setPages((prev) =>
          prev.map((p, idx) => (idx === activePageIndex ? { ...target, processedSrc: updatedSrc } : p))
        );
      } catch (err) {
        console.error('Failed to process scan page', err);
        toast.error('Processing error');
      } finally {
        setIsProcessing(false);
      }
    },
    [activePage, activePageIndex]
  );

  const setFilter = (mode: ScanFilterMode) => {
    if (!activePage) return;
    refreshActivePage({ filterMode: mode });
  };

  const rotateActivePage = (deg: number) => {
    if (!activePage) return;
    const newRot = (activePage.rotation + deg + 360) % 360;
    refreshActivePage({ rotation: newRot });
  };

  const deleteActivePage = () => {
    if (!activePage) return;
    const updated = pages.filter((_, idx) => idx !== activePageIndex);
    setPages(updated);
    setActivePageIndex(Math.max(0, activePageIndex - 1));
    toast.success('Page removed');
  };

  const removePage = (indexToRemove: number) => {
    setPages((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (activePageIndex >= next.length && next.length > 0) {
        setActivePageIndex(next.length - 1);
      }
      return next;
    });
    toast.success('Page removed');
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    setPages((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
    setActivePageIndex(toIndex);
  };

  // Initialize 4-corner perspective unskew pins
  const toggleCornerMode = () => {
    if (!activePage) return;
    if (!isCornerMode) {
      const w = activePage.width;
      const h = activePage.height;
      const marginX = w * 0.05;
      const marginY = h * 0.05;
      const defaultCorners: [Point2D, Point2D, Point2D, Point2D] = activePage.corners || [
        { x: marginX, y: marginY }, // TL
        { x: w - marginX, y: marginY }, // TR
        { x: w - marginX, y: h - marginY }, // BR
        { x: marginX, y: h - marginY }, // BL
      ];
      setCornerPins(defaultCorners);
      setIsCornerMode(true);
    } else {
      setIsCornerMode(false);
      setCornerPins(null);
    }
  };

  const applyPerspectiveUnskew = () => {
    if (!cornerPins || !activePage) return;
    refreshActivePage({ corners: cornerPins });
    setIsCornerMode(false);
    toast.success('Perspective unskew applied!');
  };

  // Export to clean A4 PDF
  const handleExportPdf = async (destination: 'download' | 'reader' | 'notes') => {
    if (pages.length === 0) {
      toast.error('No pages to export');
      return;
    }

    try {
      setIsExporting(true);
      const pdfBlob = await compileScanPagesToPdf(pages);
      const clean = (exportFileName.trim() || 'Homework_Submission').replace(/\.pdf$/i, '');
      const fileName = `${clean}.pdf`;

      if (destination === 'download') {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast.success('Homework PDF downloaded!');
      } else if (destination === 'reader' && onOpenInReader) {
        const url = URL.createObjectURL(pdfBlob);
        onOpenInReader({ name: fileName, src: url, type: 'pdf' });
        toast.success('Opened in Split Reader!');
      } else if (destination === 'notes' && onSendToNotes) {
        onSendToNotes(pdfBlob, fileName);
        toast.success('Sent to StudyQuest Notes!');
      }
    } catch (err) {
      console.error('Failed to export PDF', err);
      toast.error('PDF export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <StudioToolbar
        toolTitle="CamScanner Homework Enhancer"
        toolDescription="Turn phone photos of notebooks & worksheets into clean, shadow-free, portal-ready A4 PDFs"
        badgeText="Clean Scan"
        icon={<HiSparkles className="text-amber-500" />}
        onBack={onBack}
        onReset={pages.length > 0 ? () => setPages([]) : undefined}
        onDownload={pages.length > 0 ? () => handleExportPdf('download') : undefined}
        downloadLabel={isExporting ? 'Compiling PDF...' : `Export PDF (${pages.length}p)`}
        isDownloadDisabled={pages.length === 0 || isExporting}
        onOpenInReader={pages.length > 0 && onOpenInReader ? () => handleExportPdf('reader') : undefined}
        onSendToNotes={pages.length > 0 && onSendToNotes ? () => handleExportPdf('notes') : undefined}
        fileName={pages.length > 0 ? exportFileName : undefined}
        onFileNameChange={pages.length > 0 ? setExportFileName : undefined}
        fileExtension="pdf"
      />

      {pages.length === 0 ? (
        <div className="max-w-2xl mx-auto w-full py-8">
          <DropzoneZone
            onFilesSelected={handleUploadPhotos}
            accept="image/jpeg,image/png,image/webp"
            multiple={true}
            title="Drop notebook or worksheet photos here"
            description="Take photos of your handwritten homework, problem sets, or book pages and drop them all together"
            allowedFormatsText="JPG, PNG, WebP"
            maxFilesText="Multi-page upload"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
            <div className="p-4 rounded-xl bg-surface/60 border border-border flex items-start gap-3">
              <span className="text-xl">🪄</span>
              <div>
                <h4 className="text-xs font-bold text-foreground">Shadow Removal</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Eliminates desk lamp shadows and dirty paper folds automatically.
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface/60 border border-border flex items-start gap-3">
              <span className="text-xl">📐</span>
              <div>
                <h4 className="text-xs font-bold text-foreground">4-Corner Unskew</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Straighten crooked or angled desk camera shots with corner pinning.
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface/60 border border-border flex items-start gap-3">
              <span className="text-xl">📄</span>
              <div>
                <h4 className="text-xs font-bold text-foreground">A4 Submission Ready</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  1-click export to high-contrast multi-page PDF formatted for Canvas/Moodle.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          {/* Main Workspace Preview Canvas */}
          <div className="lg:col-span-8 flex flex-col min-h-0 bg-surface/40 rounded-2xl border border-border p-4 relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Page {activePageIndex + 1} of {pages.length}
                </span>
                <span className="text-[11px] text-muted-foreground">({activePage.name})</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant={isCornerMode ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={toggleCornerMode}
                  title="Straighten perspective corner pinning"
                >
                  📐 {isCornerMode ? 'Cancel Unskew' : '4-Corner Unskew'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => rotateActivePage(90)} title="Rotate 90° clockwise">
                  ↻ Rotate 90°
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteActivePage}
                  title="Delete page"
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                >
                  <HiTrash className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Canvas / Image Display Container */}
            <div
              ref={previewContainerRef}
              className="flex-1 min-h-[350px] relative flex items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-black/40 border border-border/40 p-2"
            >
              {isProcessing && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-20">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border shadow-lg">
                    <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-xs font-semibold text-foreground">Applying Magic Filters...</span>
                  </div>
                </div>
              )}

              {/* Display Processed Image */}
              <div
                ref={imageWrapperRef}
                className="relative max-w-full max-h-full shadow-md rounded-sm overflow-hidden flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={isCornerMode ? activePage.originalSrc : activePage.processedSrc}
                  alt={`Page ${activePageIndex + 1}`}
                  className="max-h-[62vh] max-w-full object-contain rounded-sm select-none"
                />

                {/* 4 Corner Pinning Overlay in Corner Mode */}
                {isCornerMode && cornerPins && (
                  <>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                      <polygon
                        points={`${(cornerPins[0].x / activePage.width) * 100}%,${
                          (cornerPins[0].y / activePage.height) * 100
                        }% ${(cornerPins[1].x / activePage.width) * 100}%,${
                          (cornerPins[1].y / activePage.height) * 100
                        }% ${(cornerPins[2].x / activePage.width) * 100}%,${
                          (cornerPins[2].y / activePage.height) * 100
                        }% ${(cornerPins[3].x / activePage.width) * 100}%,${
                          (cornerPins[3].y / activePage.height) * 100
                        }%`}
                        fill="rgba(59, 130, 246, 0.18)"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    </svg>

                    {cornerPins.map((pin, idx) => {
                      const leftPct = (pin.x / activePage.width) * 100;
                      const topPct = (pin.y / activePage.height) * 100;
                      const labels = ['TL', 'TR', 'BR', 'BL'];
                      return (
                        <div
                          key={idx}
                          onPointerDown={(e) => handleCornerPointerDown(idx, e)}
                          onPointerMove={(e) => handleCornerPointerMove(idx, e)}
                          onPointerUp={handleCornerPointerUp}
                          style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                          className="absolute z-30 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary border-2 border-white shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing text-[9px] font-bold text-white touch-none select-none hover:scale-110 transition-transform"
                          title={`Drag ${labels[idx]} corner`}
                        >
                          {labels[idx]}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* Corner Unskew Confirmation Bar */}
            {isCornerMode && (
              <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <span className="text-xs text-primary font-medium">
                  Corner pins active: Drag corners or click Apply to straighten the photo.
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsCornerMode(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={applyPerspectiveUnskew}>
                    <HiCheck className="w-3.5 h-3.5 mr-1" />
                    Apply Straighten
                  </Button>
                </div>
              </div>
            )}

            {/* Page Thumbnail Strip */}
            <div className="mt-4 pt-3 border-t border-border flex items-center gap-3 overflow-x-auto pb-1">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => setActivePageIndex(idx)}
                  className={`relative cursor-pointer shrink-0 rounded-lg p-1 border-2 transition-all group ${
                    idx === activePageIndex
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border/60 hover:border-border bg-surface/50'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.processedSrc} alt={`Thumb ${idx + 1}`} className="w-14 h-18 object-cover rounded" />
                  <span className="absolute bottom-1 right-1 text-[9px] font-bold px-1 rounded bg-black/70 text-white">
                    {idx + 1}
                  </span>

                  {/* Reorder Left/Right Buttons */}
                  <div className="absolute inset-0 bg-black/60 rounded opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                    {idx > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(idx, idx - 1);
                        }}
                        className="p-1 rounded bg-white/20 text-white hover:bg-white/40"
                        title="Move left"
                      >
                        <HiArrowLeft className="w-3 h-3" />
                      </button>
                    )}
                    {idx < pages.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(idx, idx + 1);
                        }}
                        className="p-1 rounded bg-white/20 text-white hover:bg-white/40"
                        title="Move right"
                      >
                        <HiArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add More Photos */}
              <label className="cursor-pointer shrink-0 w-14 h-18 rounded-lg border-2 border-dashed border-border/80 hover:border-primary/60 flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleUploadPhotos(Array.from(e.target.files))}
                />
                <HiUpload className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] font-bold">+ Add</span>
              </label>
            </div>
          </div>

          {/* Right Controls Panel */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Filter Mode Card */}
            <Card className="p-4">
              <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                <HiSparkles className="w-4 h-4 text-primary" />
                Adaptive Scan Filter
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFilter('magic')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activePage.filterMode === 'magic'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                      : 'border-border bg-surface hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <span>🪄</span>
                    <span>Magic Clean</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                    Removes desk shadows & sharpens dark ink.
                  </p>
                </button>

                <button
                  onClick={() => setFilter('bw')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activePage.filterMode === 'bw'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                      : 'border-border bg-surface hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <span>📄</span>
                    <span>B&W Document</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                    Crisp monochrome binary for worksheets.
                  </p>
                </button>

                <button
                  onClick={() => setFilter('color')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activePage.filterMode === 'color'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                      : 'border-border bg-surface hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <span>🎨</span>
                    <span>Color Boost</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                    White paper with colored pens & highlighters.
                  </p>
                </button>

                <button
                  onClick={() => setFilter('original')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activePage.filterMode === 'original'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                      : 'border-border bg-surface hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <span>🖼️</span>
                    <span>Original</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                    Natural photo with manual slider tweaks.
                  </p>
                </button>
              </div>

              {/* Brightness & Contrast Fine-Tuning */}
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Shadow Whitening (Brightness)</span>
                    <span className="font-semibold text-foreground">{activePage.brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-80"
                    max="80"
                    value={activePage.brightness}
                    onChange={(e) => refreshActivePage({ brightness: Number(e.target.value) })}
                    className="w-full accent-primary h-1.5 rounded bg-muted cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Ink Darkening (Contrast)</span>
                    <span className="font-semibold text-foreground">{activePage.contrast}</span>
                  </div>
                  <input
                    type="range"
                    min="-80"
                    max="80"
                    value={activePage.contrast}
                    onChange={(e) => refreshActivePage({ contrast: Number(e.target.value) })}
                    className="w-full accent-primary h-1.5 rounded bg-muted cursor-pointer"
                  />
                </div>
              </div>
            </Card>

            {/* Quick Export Summary Card */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h3 className="text-xs font-bold text-foreground mb-2 flex items-center justify-between">
                <span>Export Submission</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  A4 Multi-page
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Packages all {pages.length} processed page{pages.length > 1 ? 's' : ''} into a single, clean PDF
                ready for submission to university portals.
              </p>

              <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-3 rounded-lg bg-background border border-border text-xs">
                <HiPencil className="w-3.5 h-3.5 text-primary shrink-0" />
                <input
                  type="text"
                  value={exportFileName}
                  onChange={(e) => setExportFileName(e.target.value)}
                  placeholder="Submission filename"
                  className="bg-transparent font-semibold text-foreground focus:outline-hidden text-xs flex-1"
                  title="Rename Homework PDF"
                />
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">
                  .pdf
                </span>
              </div>

              <div className="space-y-2">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => handleExportPdf('download')}
                  disabled={isExporting}
                >
                  <HiDownload className="w-4 h-4 mr-1.5" />
                  {isExporting ? 'Generating PDF...' : 'Download Clean PDF'}
                </Button>

                {onOpenInReader && (
                  <Button
                    variant="outline"
                    className="w-full justify-center text-xs"
                    onClick={() => handleExportPdf('reader')}
                    disabled={isExporting}
                  >
                    Open in Split Reader
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
