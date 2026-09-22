'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiDocumentDuplicate,
  HiScissors,
  HiRefresh,
  HiTrash,
  HiArrowUp,
  HiArrowDown,
  HiDownload,
  HiBookOpen,
  HiArchive,
  HiCheck,
  HiEye,
  HiX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StudioToolbar from '../shared/StudioToolbar';
import DropzoneZone from '../shared/DropzoneZone';
import {
  mergePdfDocuments,
  splitAndExtractPages,
  rotatePdfPages,
  reorderPdfDocument,
  getPdfPageCount,
  packageImagesToZip,
} from '@/lib/docstudio/pdfEngine';
import { formatBytes } from '@/lib/docstudio/compressor';
import { renderPdfThumbnails } from '@/lib/docstudio/pdfThumbnail';

type PdfSubTool = 'merge' | 'split' | 'rotate' | 'zip';

interface PdfFileItem {
  id: string;
  name: string;
  size: number;
  buffer: ArrayBuffer;
  pageCount: number;
}

interface PdfSwissArmyProps {
  onBack: () => void;
  onOpenInReader?: (file: { name: string; src: string; type: 'pdf' }) => void;
  onSendToNotes?: (pdfBlob: Blob, title: string) => void;
}

export default function PdfSwissArmy({ onBack, onOpenInReader, onSendToNotes }: PdfSwissArmyProps) {
  const [subTool, setSubTool] = useState<PdfSubTool>('merge');
  const [mergeList, setMergeList] = useState<PdfFileItem[]>([]);
  const [singlePdf, setSinglePdf] = useState<PdfFileItem | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // High-fidelity page preview thumbnails state
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [isRenderingThumbnails, setIsRenderingThumbnails] = useState<boolean>(false);
  const [previewModalPage, setPreviewModalPage] = useState<number | null>(null);
  const [activeInspectorPage, setActiveInspectorPage] = useState<number>(0);

  // Output Filename Renaming State
  const [mergeFileName, setMergeFileName] = useState<string>(
    `Merged_Document_${new Date().toISOString().slice(0, 10)}`
  );
  const [splitFileName, setSplitFileName] = useState<string>('Extracted_Pages');
  const [rotateFileName, setRotateFileName] = useState<string>('Modified_Document');

  // Handle uploading PDFs for merge
  const handleUploadForMerge = async (files: File[]) => {
    const pdfs = files.filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfs.length === 0) {
      toast.error('Please upload valid PDF files.');
      return;
    }

    setIsProcessing(true);
    try {
      const items: PdfFileItem[] = [];
      for (const file of pdfs) {
        const buffer = await file.arrayBuffer();
        const pageCount = await getPdfPageCount(buffer);
        items.push({
          id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          size: file.size,
          buffer,
          pageCount,
        });
      }
      setMergeList((prev) => [...prev, ...items]);
      toast.success(`Added ${items.length} PDF${items.length > 1 ? 's' : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Could not read PDF structure');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle upload for single PDF tools (split, rotate, zip)
  const handleUploadSinglePdf = async (files: File[]) => {
    const file = files.find((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (!file) {
      toast.error('Please upload a valid PDF file.');
      return;
    }

    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const pageCount = await getPdfPageCount(buffer);
      setSinglePdf({
        id: `single-${Date.now()}`,
        name: file.name,
        size: file.size,
        buffer,
        pageCount,
      });

      // Default all pages selected for split
      const allIndices = Array.from({ length: pageCount }, (_, i) => i);
      setSelectedPages(allIndices);
      setPageOrder(allIndices);
      setPageRotations({});
      setActiveInspectorPage(0);
      setThumbnails({});

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      setSplitFileName(`${baseName}_Extracted`);
      setRotateFileName(`${baseName}_Modified`);

      toast.success(`Loaded ${file.name} (${pageCount} pages)`);

      // Asynchronously render visual thumbnails of pages
      setIsRenderingThumbnails(true);
      renderPdfThumbnails(buffer, Math.min(pageCount, 150), 240)
        .then((rendered) => {
          const map: Record<number, string> = {};
          rendered.forEach((r) => {
            map[r.pageIndex] = r.dataUrl;
          });
          setThumbnails(map);
        })
        .catch((thumbErr) => {
          console.warn('PDF thumbnail generation error (falling back to icons):', thumbErr);
        })
        .finally(() => {
          setIsRenderingThumbnails(false);
        });
    } catch (err) {
      console.error(err);
      toast.error('Failed to read PDF file');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Merge
  const executeMerge = async (dest: 'download' | 'reader' | 'notes') => {
    if (mergeList.length < 2) {
      toast.error('Add at least 2 PDFs to merge');
      return;
    }

    setIsProcessing(true);
    try {
      const buffers = mergeList.map((item) => item.buffer);
      const mergedBytes = await mergePdfDocuments(buffers);
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const name = `${(mergeFileName.trim() || 'Merged_Document').replace(/\.pdf$/i, '')}.pdf`;

      handleOutput(blob, name, dest);
    } catch (err) {
      console.error(err);
      toast.error('Failed to merge PDFs');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Split / Extract
  const executeSplit = async (dest: 'download' | 'reader' | 'notes') => {
    if (!singlePdf) return;
    if (selectedPages.length === 0) {
      toast.error('Select at least 1 page to extract');
      return;
    }

    setIsProcessing(true);
    try {
      const splitBytes = await splitAndExtractPages(singlePdf.buffer, selectedPages);
      const blob = new Blob([splitBytes as unknown as BlobPart], { type: 'application/pdf' });
      const name = `${(splitFileName.trim() || 'Extracted_Pages').replace(/\.pdf$/i, '')}.pdf`;

      handleOutput(blob, name, dest);
    } catch (err) {
      console.error(err);
      toast.error('Failed to split PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Rotate & Reorder
  const executeRotateAndReorder = async (dest: 'download' | 'reader' | 'notes') => {
    if (!singlePdf) return;

    setIsProcessing(true);
    try {
      let workingBuffer = singlePdf.buffer;

      // 1. Reorder if modified (either length changed or any page order differed)
      const isOrderModified =
        pageOrder.length > 0 &&
        (pageOrder.length !== singlePdf.pageCount || pageOrder.some((p, i) => p !== i));

      if (isOrderModified) {
        const reordered = await reorderPdfDocument(workingBuffer, pageOrder);
        workingBuffer = reordered.buffer.slice(
          reordered.byteOffset,
          reordered.byteOffset + reordered.byteLength
        ) as ArrayBuffer;
      }

      // 2. Rotate
      if (Object.keys(pageRotations).length > 0) {
        const rotated = await rotatePdfPages(workingBuffer, pageRotations);
        workingBuffer = rotated.buffer.slice(
          rotated.byteOffset,
          rotated.byteOffset + rotated.byteLength
        ) as ArrayBuffer;
      }

      const blob = new Blob([workingBuffer], { type: 'application/pdf' });
      const name = `${(rotateFileName.trim() || 'Modified_Document').replace(/\.pdf$/i, '')}.pdf`;

      handleOutput(blob, name, dest);
    } catch (err) {
      console.error(err);
      toast.error('Failed to process rotation/reorder');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOutput = (blob: Blob, name: string, dest: 'download' | 'reader' | 'notes') => {
    if (dest === 'download') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast.success('PDF downloaded!');
    } else if (dest === 'reader' && onOpenInReader) {
      const url = URL.createObjectURL(blob);
      onOpenInReader({ name, src: url, type: 'pdf' });
      toast.success('Opened in Split Reader!');
    } else if (dest === 'notes' && onSendToNotes) {
      onSendToNotes(blob, name);
      toast.success('Sent to StudyQuest Notes!');
    }
  };

  const rotateSinglePage = (pageIdx: number, delta: number) => {
    setPageRotations((prev) => ({
      ...prev,
      [pageIdx]: ((prev[pageIdx] || 0) + delta) % 360,
    }));
  };

  const togglePageSelection = (idx: number) => {
    setSelectedPages((prev) =>
      prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx].sort((a, b) => a - b)
    );
  };

  return (
    <div className="flex flex-col h-full">
      <StudioToolbar
        toolTitle="PDF Swiss Army Workbench"
        toolDescription="Merge, split pages, rotate orientations, reorder, and export PDFs client-side without limits"
        badgeText="100% Free"
        icon={<HiDocumentDuplicate className="text-rose-500" />}
        onBack={onBack}
        onReset={() => {
          setMergeList([]);
          setSinglePdf(null);
          setThumbnails({});
          setPreviewModalPage(null);
        }}
      />

      {/* Sub-tool Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-surface border border-border mb-5 overflow-x-auto">
        <button
          onClick={() => setSubTool('merge')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTool === 'merge'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <HiDocumentDuplicate className="w-4 h-4" />
          <span>Merge PDFs</span>
        </button>

        <button
          onClick={() => setSubTool('split')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTool === 'split'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <HiScissors className="w-4 h-4" />
          <span>Split & Extract Pages</span>
        </button>

        <button
          onClick={() => setSubTool('rotate')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTool === 'rotate'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <HiRefresh className="w-4 h-4" />
          <span>Rotate & Reorder</span>
        </button>
      </div>

      {/* SUB-TOOL 1: MERGE PDFS */}
      {subTool === 'merge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <DropzoneZone
              onFilesSelected={handleUploadForMerge}
              accept="application/pdf"
              multiple={true}
              title="Add PDFs to combine into one"
              description="Drop lecture slides, syllabus, and reading notes to merge in order"
              allowedFormatsText="PDF"
              maxFilesText="Multiple files"
              compact={mergeList.length > 0}
            />

            {mergeList.length > 0 && (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {mergeList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-muted text-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.pageCount} pages • {formatBytes(item.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        disabled={idx === 0}
                        onClick={() => {
                          const copy = [...mergeList];
                          const cur = copy[idx];
                          copy[idx] = copy[idx - 1];
                          copy[idx - 1] = cur;
                          setMergeList(copy);
                        }}
                        className="p-1 rounded bg-muted hover:bg-muted/80 text-foreground disabled:opacity-30"
                        title="Move up"
                      >
                        <HiArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        disabled={idx === mergeList.length - 1}
                        onClick={() => {
                          const copy = [...mergeList];
                          const cur = copy[idx];
                          copy[idx] = copy[idx + 1];
                          copy[idx + 1] = cur;
                          setMergeList(copy);
                        }}
                        className="p-1 rounded bg-muted hover:bg-muted/80 text-foreground disabled:opacity-30"
                        title="Move down"
                      >
                        <HiArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setMergeList((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 rounded hover:bg-rose-500/10 text-rose-500"
                        title="Remove file"
                      >
                        <HiTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            <Card className="p-4 bg-surface">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                Merge Summary
              </h3>
              <div className="space-y-2 text-xs mb-4">
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-bold text-foreground">{mergeList.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-muted-foreground">Total Pages</span>
                  <span className="font-bold text-foreground">
                    {mergeList.reduce((acc, item) => acc + item.pageCount, 0)} pages
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Total Size</span>
                  <span className="font-bold text-foreground">
                    {formatBytes(mergeList.reduce((acc, item) => acc + item.size, 0))}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => executeMerge('download')}
                  disabled={mergeList.length < 2 || isProcessing}
                >
                  <HiDownload className="w-4 h-4 mr-1.5" />
                  {isProcessing ? 'Merging...' : 'Merge & Download PDF'}
                </Button>

                {onOpenInReader && (
                  <Button
                    variant="outline"
                    className="w-full justify-center text-xs"
                    onClick={() => executeMerge('reader')}
                    disabled={mergeList.length < 2 || isProcessing}
                  >
                    Open in Split Reader
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SUB-TOOL 2: SPLIT & EXTRACT */}
      {subTool === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          <div className="lg:col-span-8 flex flex-col gap-4">
            {!singlePdf ? (
              <DropzoneZone
                onFilesSelected={handleUploadSinglePdf}
                accept="application/pdf"
                title="Drop a PDF to extract pages"
                description="Select which specific pages to keep into a new lightweight PDF"
                allowedFormatsText="PDF"
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{singlePdf.name}</h4>
                    <p className="text-[10px] text-muted-foreground">
                      {singlePdf.pageCount} total pages • {selectedPages.length} selected
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedPages(
                          selectedPages.length === singlePdf.pageCount
                            ? []
                            : Array.from({ length: singlePdf.pageCount }, (_, i) => i)
                        )
                      }
                    >
                      {selectedPages.length === singlePdf.pageCount ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSinglePdf(null)}>
                      Change File
                    </Button>
                  </div>
                </div>

                {/* Visual Thumbnail Rendering Progress Bar */}
                {isRenderingThumbnails && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium shadow-2xs">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Rendering crisp visual page thumbnails in browser memory...</span>
                  </div>
                )}

                {/* Page Selection Matrix with Visual Previews */}
                <div className="p-4 rounded-xl bg-surface border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-foreground">
                      Click any page thumbnail to include or exclude it from the extracted PDF:
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {selectedPages.length} of {singlePdf.pageCount} pages selected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[55vh] overflow-y-auto p-1">
                    {Array.from({ length: singlePdf.pageCount }, (_, i) => {
                      const isSelected = selectedPages.includes(i);
                      const thumbUrl = thumbnails[i];

                      return (
                        <div
                          key={i}
                          onClick={() => {
                            togglePageSelection(i);
                            setActiveInspectorPage(i);
                          }}
                          className={`group relative rounded-xl border-2 p-2 flex flex-col items-center justify-between transition-all cursor-pointer shadow-xs select-none ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border/60 bg-muted/20 opacity-55 hover:opacity-85'
                          }`}
                        >
                          {/* Header Badge */}
                          <div className="w-full flex items-center justify-between mb-1.5 z-10">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {isSelected ? <HiCheck className="w-3 h-3" /> : <HiX className="w-3 h-3" />}
                              <span>{isSelected ? 'Keep' : 'Skip'}</span>
                            </span>

                            <span className="text-[10px] font-bold text-muted-foreground font-mono">
                              #{i + 1}
                            </span>
                          </div>

                          {/* Visual Thumbnail Box */}
                          <div className="w-full h-36 relative rounded-md overflow-hidden bg-white dark:bg-zinc-900 flex items-center justify-center border border-border/40">
                            {thumbUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumbUrl}
                                alt={`Page ${i + 1}`}
                                className="max-h-full max-w-full object-contain select-none"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-muted/40 text-muted-foreground">
                                <div className="w-4 h-4 border-2 border-primary/60 border-t-transparent rounded-full animate-spin mb-1" />
                                <span className="text-[10px] font-medium">Page {i + 1}</span>
                              </div>
                            )}

                            {/* Quick Zoom Button */}
                            {thumbUrl && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewModalPage(i);
                                }}
                                className="absolute bottom-1 right-1 p-1 rounded-md bg-black/75 text-white hover:bg-black opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                title="Inspect page"
                              >
                                <HiEye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Bottom Action bar */}
                          <div className="w-full mt-2 flex items-center justify-between text-[10px]">
                            <span className={isSelected ? 'font-bold text-primary' : 'text-muted-foreground'}>
                              Page {i + 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewModalPage(i);
                              }}
                              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                            >
                              <HiEye className="w-3 h-3" /> Preview
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <Card className="p-4 bg-surface">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                Extract Summary
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Extracts only selected pages into a new compact document.
              </p>

              <div className="space-y-2">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => executeSplit('download')}
                  disabled={!singlePdf || selectedPages.length === 0 || isProcessing}
                >
                  <HiDownload className="w-4 h-4 mr-1.5" />
                  {isProcessing ? 'Extracting...' : `Extract ${selectedPages.length} Pages`}
                </Button>

                {onOpenInReader && (
                  <Button
                    variant="outline"
                    className="w-full justify-center text-xs"
                    onClick={() => executeSplit('reader')}
                    disabled={!singlePdf || selectedPages.length === 0 || isProcessing}
                  >
                    Open in Split Reader
                  </Button>
                )}
              </div>

              {/* Active Inspected Page Preview on the right deck */}
              {singlePdf && thumbnails[activeInspectorPage] && (
                <div className="mt-5 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-foreground">
                      Active Preview: Page {activeInspectorPage + 1}
                    </span>
                    <button
                      onClick={() => setPreviewModalPage(activeInspectorPage)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-semibold"
                    >
                      <HiEye className="w-3 h-3" /> Enlarge
                    </button>
                  </div>
                  <div className="h-44 rounded-lg bg-white dark:bg-zinc-900 border border-border/60 overflow-hidden flex items-center justify-center p-1.5 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnails[activeInspectorPage]}
                      alt={`Page ${activeInspectorPage + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* SUB-TOOL 3: ROTATE & REORDER */}
      {subTool === 'rotate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          <div className="lg:col-span-8 flex flex-col gap-4">
            {!singlePdf ? (
              <DropzoneZone
                onFilesSelected={handleUploadSinglePdf}
                accept="application/pdf"
                title="Drop PDF to rotate or reorder"
                description="Fix upside-down scanned pages or reorder document sequence"
                allowedFormatsText="PDF"
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{singlePdf.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{singlePdf.pageCount} pages in document</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newRots: Record<number, number> = {};
                        for (let i = 0; i < singlePdf.pageCount; i++) {
                          newRots[i] = ((pageRotations[i] || 0) + 90) % 360;
                        }
                        setPageRotations(newRots);
                      }}
                    >
                      Rotate All 90°
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSinglePdf(null)}>
                      Change File
                    </Button>
                  </div>
                </div>

                {/* Progress banner while rendering previews */}
                {isRenderingThumbnails && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Rendering page previews for reordering and rotation...</span>
                  </div>
                )}

                {/* Page Rotation & Reorder Matrix with Visual Thumbnails */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[55vh] overflow-y-auto p-1">
                  {pageOrder.map((pageIdx, displayIdx) => {
                    const rot = pageRotations[pageIdx] || 0;
                    const thumbUrl = thumbnails[pageIdx];

                    return (
                      <div
                        key={pageIdx}
                        className="p-2.5 rounded-xl bg-surface border border-border shadow-xs flex flex-col items-center text-center group hover:border-primary/50 transition-all select-none"
                      >
                        {/* Header with Slot Position & Original Index */}
                        <div className="w-full flex items-center justify-between mb-1.5 text-[10px]">
                          <span className="font-bold px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">
                            Pos #{displayIdx + 1}
                          </span>
                          <span className="text-muted-foreground font-medium">
                            Orig #{pageIdx + 1}
                          </span>
                        </div>

                        {/* Visual Thumbnail with Live Dynamic Rotation */}
                        <div className="w-full h-36 relative rounded-md overflow-hidden bg-white dark:bg-zinc-900 flex items-center justify-center border border-border/40 p-1 mb-2">
                          {thumbUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbUrl}
                              alt={`Page ${pageIdx + 1}`}
                              className="max-h-full max-w-full object-contain select-none transition-transform duration-300"
                              style={{ transform: `rotate(${rot}deg)` }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-muted/40 text-muted-foreground">
                              <span className="text-xs font-bold">Page {pageIdx + 1}</span>
                              <span className="text-[10px] text-muted-foreground">{rot}°</span>
                            </div>
                          )}

                          {rot !== 0 && (
                            <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground shadow-xs">
                              {rot}°
                            </span>
                          )}

                          {thumbUrl && (
                            <button
                              onClick={() => setPreviewModalPage(pageIdx)}
                              className="absolute bottom-1 right-1 p-1 rounded-md bg-black/75 text-white hover:bg-black opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                              title="Inspect page"
                            >
                              <HiEye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Action Bar: Reorder Left/Right, Rotate, Remove */}
                        <div className="flex items-center gap-1 w-full justify-between pt-1 border-t border-border/50">
                          <div className="flex items-center gap-0.5">
                            <button
                              disabled={displayIdx === 0}
                              onClick={() => {
                                const copy = [...pageOrder];
                                const cur = copy[displayIdx];
                                copy[displayIdx] = copy[displayIdx - 1];
                                copy[displayIdx - 1] = cur;
                                setPageOrder(copy);
                              }}
                              className="p-1 rounded bg-muted hover:bg-muted/80 text-foreground disabled:opacity-20 text-xs"
                              title="Move earlier in sequence"
                            >
                              ←
                            </button>

                            <button
                              disabled={displayIdx === pageOrder.length - 1}
                              onClick={() => {
                                const copy = [...pageOrder];
                                const cur = copy[displayIdx];
                                copy[displayIdx] = copy[displayIdx + 1];
                                copy[displayIdx + 1] = cur;
                                setPageOrder(copy);
                              }}
                              className="p-1 rounded bg-muted hover:bg-muted/80 text-foreground disabled:opacity-20 text-xs"
                              title="Move later in sequence"
                            >
                              →
                            </button>
                          </div>

                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => rotateSinglePage(pageIdx, 90)}
                              className="p-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-bold px-1.5"
                              title="Rotate 90° clockwise"
                            >
                              ↻ 90°
                            </button>

                            <button
                              onClick={() => {
                                setPageOrder((prev) => prev.filter((idx) => idx !== pageIdx));
                              }}
                              className="p-1 rounded hover:bg-rose-500/10 text-rose-500 text-xs"
                              title="Remove this page"
                            >
                              <HiTrash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            <Card className="p-4 bg-surface">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                Export Rotated PDF
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Saves permanent rotation and page order modifications directly to a new PDF file.
              </p>

              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => executeRotateAndReorder('download')}
                disabled={!singlePdf || isProcessing}
              >
                <HiDownload className="w-4 h-4 mr-1.5" />
                {isProcessing ? 'Processing...' : 'Save & Download PDF'}
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Full Screen Page Zoom / Preview Modal */}
      {previewModalPage !== null && singlePdf && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col p-4 sm:p-8">
          <div className="flex items-center justify-between pb-3 border-b border-border max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                Preview: Page {previewModalPage + 1} of {singlePdf.pageCount}
              </span>
              <span className="text-[11px] text-muted-foreground truncate max-w-xs">
                ({singlePdf.name})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={previewModalPage === 0}
                onClick={() => setPreviewModalPage((p) => (p !== null ? Math.max(0, p - 1) : 0))}
              >
                ← Prev Page
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={previewModalPage === singlePdf.pageCount - 1}
                onClick={() =>
                  setPreviewModalPage((p) =>
                    p !== null ? Math.min(singlePdf.pageCount - 1, p + 1) : 0
                  )
                }
              >
                Next Page →
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPreviewModalPage(null)}>
                <HiX className="w-4 h-4 mr-1" /> Close
              </Button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 overflow-auto max-w-4xl mx-auto w-full">
            {thumbnails[previewModalPage] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnails[previewModalPage]}
                alt={`Page ${previewModalPage + 1}`}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl border border-border/80 bg-white dark:bg-zinc-900 transition-transform duration-300"
                style={{
                  transform: pageRotations[previewModalPage]
                    ? `rotate(${pageRotations[previewModalPage]}deg)`
                    : undefined,
                }}
              />
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Generating high-resolution page view...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
