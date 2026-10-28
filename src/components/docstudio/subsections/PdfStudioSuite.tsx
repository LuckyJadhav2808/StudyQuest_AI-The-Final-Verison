'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiDocumentText,
  HiZoomIn,
  HiZoomOut,
  HiRefresh,
  HiTrash,
  HiArrowUp,
  HiArrowDown,
  HiDownload,
  HiScissors,
  HiDocumentDuplicate,
  HiPhotograph,
  HiCheck,
  HiX,
  HiChevronLeft,
  HiChevronRight,
  HiChevronUp,
  HiChevronDown,
  HiArrowsExpand,
  HiFolderOpen,
  HiLightningBolt,
  HiEye,
  HiInformationCircle,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { renderPdfThumbnails } from '@/lib/docstudio/pdfThumbnail';
import { formatBytes, formatToastFileName } from '@/lib/docstudio/compressor';
import { mergePdfDocuments, splitAndExtractPages, compileScanPagesToPdf } from '@/lib/docstudio/pdfEngine';
import { compressPdf } from '@/lib/docstudio/universalCompressor';
import { convertDocument } from '@/lib/docstudio/universalConverter';
import { compileImagesToPptx } from '@/lib/docstudio/pptxCompiler';

export interface PdfFileState {
  name: string;
  size: number;
  buffer: ArrayBuffer;
  pageCount: number;
  blobUrl: string;
}

interface PdfStudioSuiteProps {
  initialFile?: File | null;
  onSendToNotes?: (pdfBlob: Blob, title: string) => void;
  onSwitchStudio?: (target: 'pdf' | 'word' | 'pptx' | 'xlsx') => void;
}

type ActiveToolModal = null | 'compress' | 'merge' | 'split' | 'images' | 'docx' | 'pptx';

export default function PdfStudioSuite({
  initialFile,
  onSendToNotes,
  onSwitchStudio,
}: PdfStudioSuiteProps) {
  // Master document state
  const [doc, setDoc] = useState<PdfFileState | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [fitMode, setFitMode] = useState<'actual' | 'width' | 'page'>('actual');
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(false);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);

  // Per-page modifications (client-side non-destructive preview)
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [selectedPageIndices, setSelectedPageIndices] = useState<Set<number>>(new Set());
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState<boolean>(false);

  // Active Tool Modal
  const [activeModal, setActiveModal] = useState<ActiveToolModal>(null);
  const [isProcessingTool, setIsProcessingTool] = useState<boolean>(false);
  const [toolProgress, setToolProgress] = useState<string>('');

  // Tool 1: Compress State
  const [compressPreset, setCompressPreset] = useState<'balanced' | 'portal' | 'high_quality'>('balanced');
  const [estimatedCompressedSize, setEstimatedCompressedSize] = useState<number | null>(null);

  // Tool 2: Merge State
  const [mergeFiles, setMergeFiles] = useState<{ id: string; name: string; size: number; buffer: ArrayBuffer; pageCount: number }[]>([]);

  // Tool 3: Split State
  const [splitRangeInput, setSplitRangeInput] = useState<string>('');

  // Tool 4: Images to PDF State
  const [imageFiles, setImageFiles] = useState<{ id: string; name: string; dataUrl: string; size: number }[]>([]);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<unknown>(null);
  const pdfJsDocRef = useRef<any>(null);

  // Initialize from initialFile prop if provided
  useEffect(() => {
    if (initialFile && (initialFile.type === 'application/pdf' || initialFile.name.endsWith('.pdf'))) {
      loadPdfFile(initialFile);
    }
  }, [initialFile]);

  // Load a new PDF File
  const loadPdfFile = async (file: File) => {
    setIsLoadingDoc(true);
    try {
      const buffer = await file.arrayBuffer();
      const pdfLibDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const count = pdfLibDoc.getPageCount();

      // Revoke old blobUrl if any
      if (doc?.blobUrl) {
        URL.revokeObjectURL(doc.blobUrl);
      }

      const blob = new Blob([buffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      setDoc({
        name: file.name,
        size: file.size,
        buffer,
        pageCount: count,
        blobUrl,
      });

      setCurrentPage(1);
      const initialIndices = Array.from({ length: count }, (_, i) => i);
      setPageOrder(initialIndices);
      setPageRotations({});
      setSelectedPageIndices(new Set(initialIndices));
      setSplitRangeInput(`1-${count}`);

      // Initialize PDF.js instance
      const pdfjs = await import('pdfjs-dist');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        cMapUrl: 'https://unpkg.com/pdfjs-dist/cmaps/',
        cMapPacked: true,
      });
      const loadedPdf = await loadingTask.promise;
      pdfJsDocRef.current = loadedPdf;

      // Render thumbnails
      renderPdfThumbnails(buffer, Math.min(count, 120), 220).then((thumbs) => {
        const map: Record<number, string> = {};
        thumbs.forEach((t) => {
          map[t.pageIndex] = t.dataUrl;
        });
        setThumbnails(map);
      });

      toast.success(`Loaded "${formatToastFileName(file.name)}" (${count} pages)`);
    } catch (err: unknown) {
      console.error('Failed to load PDF file:', err);
      toast.error('Could not load PDF. It may be password-protected or corrupted.');
    } finally {
      setIsLoadingDoc(false);
    }
  };

  // Render current active page to high-DPI canvas
  const renderCurrentPage = useCallback(async () => {
    if (!doc || !pdfJsDocRef.current || !canvasRef.current) return;

    // Resolve which real original page corresponds to currentPage in pageOrder
    const targetPageIndex = pageOrder[currentPage - 1];
    if (targetPageIndex === undefined) return;
    const realPageNumber = targetPageIndex + 1;

    setIsRenderingPage(true);
    try {
      // Cancel prior render if ongoing
      if (renderTaskRef.current && typeof (renderTaskRef.current as any).cancel === 'function') {
        (renderTaskRef.current as any).cancel();
      }

      const page = await pdfJsDocRef.current.getPage(realPageNumber);
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      // Determine scale based on fitMode or zoom percentage
      let effectiveScale = zoom / 100;
      if (fitMode === 'width' && canvasRef.current.parentElement) {
        const containerWidth = canvasRef.current.parentElement.clientWidth - 48;
        effectiveScale = Math.max(0.4, containerWidth / unscaledViewport.width);
      } else if (fitMode === 'page' && canvasRef.current.parentElement) {
        const containerHeight = canvasRef.current.parentElement.clientHeight - 48;
        effectiveScale = Math.max(0.4, containerHeight / unscaledViewport.height);
      }

      // High-DPI sharpness factor
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const appliedScale = effectiveScale * dpr;

      // Apply rotation if any
      const pageRotation = pageRotations[targetPageIndex] || 0;
      const viewport = page.getViewport({
        scale: appliedScale,
        rotation: (page.rotate + pageRotation) % 360,
      });

      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };
        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      }
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Canvas render error:', err);
      }
    } finally {
      setIsRenderingPage(false);
    }
  }, [doc, currentPage, zoom, fitMode, pageOrder, pageRotations]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Page reordering: Move page up
  const handleMovePageUp = (idx: number) => {
    if (idx <= 0) return;
    setPageOrder((prev) => {
      const copy = [...prev];
      const temp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
    if (currentPage === idx + 1) setCurrentPage(idx);
    toast.success(`Moved page ${idx + 1} up`);
  };

  // Page reordering: Move page down
  const handleMovePageDown = (idx: number) => {
    if (idx >= pageOrder.length - 1) return;
    setPageOrder((prev) => {
      const copy = [...prev];
      const temp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
    if (currentPage === idx + 1) setCurrentPage(idx + 2);
    toast.success(`Moved page ${idx + 1} down`);
  };

  // Rotate single page 90 degrees CW
  const handleRotatePage = (origIdx: number) => {
    setPageRotations((prev) => ({
      ...prev,
      [origIdx]: ((prev[origIdx] || 0) + 90) % 360,
    }));
  };

  // Rotate all pages 90 degrees CW
  const handleRotateAll = () => {
    setPageRotations((prev) => {
      const next: Record<number, number> = {};
      pageOrder.forEach((idx) => {
        next[idx] = ((prev[idx] || 0) + 90) % 360;
      });
      return next;
    });
    toast.success('Rotated all pages 90° clockwise');
  };

  // Delete single page
  const handleDeletePage = (displayIndex: number) => {
    if (pageOrder.length <= 1) {
      toast.error('A PDF document must have at least one page.');
      return;
    }
    const targetIdx = pageOrder[displayIndex];
    setPageOrder((prev) => prev.filter((_, i) => i !== displayIndex));
    setSelectedPageIndices((prev) => {
      const next = new Set(prev);
      next.delete(targetIdx);
      return next;
    });
    if (currentPage > pageOrder.length - 1) {
      setCurrentPage(Math.max(1, pageOrder.length - 1));
    }
    toast.success(`Removed page ${displayIndex + 1}`);
  };

  // Save / Apply modified PDF
  const handleSaveModifiedPdf = async () => {
    if (!doc) return;
    setIsProcessingTool(true);
    setToolProgress('Generating modified PDF with your page order and rotations...');
    try {
      const sourcePdf = await PDFDocument.load(doc.buffer, { ignoreEncryption: true });
      const newPdf = await PDFDocument.create();

      const validOrder = pageOrder.filter((idx) => idx >= 0 && idx < sourcePdf.getPageCount());
      const copiedPages = await newPdf.copyPages(sourcePdf, validOrder);

      copiedPages.forEach((page, i) => {
        const origIdx = validOrder[i];
        const rotDelta = pageRotations[origIdx] || 0;
        if (rotDelta !== 0) {
          const currentAngle = page.getRotation().angle;
          page.setRotation(degrees((currentAngle + rotDelta) % 360));
        }
        newPdf.addPage(page);
      });

      const savedBytes = await newPdf.save();
      const blob = new Blob([savedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `Modified_${doc.name}`;
      downloadLink.click();
      URL.revokeObjectURL(url);

      toast.success('Downloaded modified PDF successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save modified PDF');
    } finally {
      setIsProcessingTool(false);
      setToolProgress('');
    }
  };

  // -------------------------------------------------------------
  // TOOL 1: COMPRESS ENGINE
  // -------------------------------------------------------------
  const handleExecuteCompress = async (applyToCurrentDoc: boolean = false) => {
    if (!doc) return;
    setIsProcessingTool(true);
    setToolProgress('Compressing PDF streams and stripping unreferenced objects...');
    try {
      const compressedBlob = await compressPdf(doc.buffer, {
        preset: compressPreset,
        pdfMode: compressPreset === 'balanced' ? 'smart' : 'raster',
        quality: compressPreset === 'portal' ? 0.65 : 0.85,
      });

      const savings = Math.max(0, doc.size - compressedBlob.size);
      const savingsPct = Math.round((savings / doc.size) * 100);

      if (applyToCurrentDoc) {
        const newFile = new File([compressedBlob], `Compressed_${doc.name}`, { type: 'application/pdf' });
        await loadPdfFile(newFile);
        setActiveModal(null);
        toast.success(`Compressed by ${savingsPct}% (${formatBytes(savings)} saved) and reloaded!`);
      } else {
        const url = URL.createObjectURL(compressedBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Compressed_${doc.name}`;
        link.click();
        URL.revokeObjectURL(url);
        setActiveModal(null);
        toast.success(`Compressed by ${savingsPct}% (${formatBytes(savings)} saved)!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Compression failed. Please try balanced preset.');
    } finally {
      setIsProcessingTool(false);
      setToolProgress('');
    }
  };

  // -------------------------------------------------------------
  // TOOL 2: MERGE ENGINE
  // -------------------------------------------------------------
  const handleAddMergeFiles = async (files: FileList | File[]) => {
    const validPdfs = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
    );
    if (validPdfs.length === 0) {
      toast.error('Please upload valid PDF files to merge.');
      return;
    }

    try {
      const added: { id: string; name: string; size: number; buffer: ArrayBuffer; pageCount: number }[] = [];
      for (const f of validPdfs) {
        const buf = await f.arrayBuffer();
        const pDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        added.push({
          id: `merge-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: f.name,
          size: f.size,
          buffer: buf,
          pageCount: pDoc.getPageCount(),
        });
      }
      setMergeFiles((prev) => [...prev, ...added]);
      toast.success(`Added ${added.length} file${added.length > 1 ? 's' : ''} to merge list`);
    } catch (err) {
      console.error(err);
      toast.error('Failed reading some PDF files');
    }
  };

  const handleExecuteMerge = async (openDirectly: boolean = true) => {
    // If we have an active document, merge it as the first item unless already included
    const allBuffers: ArrayBuffer[] = [];
    if (doc) allBuffers.push(doc.buffer);
    mergeFiles.forEach((m) => allBuffers.push(m.buffer));

    if (allBuffers.length < 2) {
      toast.error('Please add at least one more PDF to merge.');
      return;
    }

    setIsProcessingTool(true);
    setToolProgress('Combining document streams and unifying page indices...');
    try {
      const mergedBytes = await mergePdfDocuments(allBuffers);
      const mergedBlob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const mergedName = `Merged_Document_${new Date().toISOString().slice(0, 10)}.pdf`;

      if (openDirectly) {
        const mergedFile = new File([mergedBlob], mergedName, { type: 'application/pdf' });
        await loadPdfFile(mergedFile);
        setActiveModal(null);
        setMergeFiles([]);
        toast.success(`Successfully merged ${allBuffers.length} documents!`);
      } else {
        const url = URL.createObjectURL(mergedBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = mergedName;
        link.click();
        URL.revokeObjectURL(url);
        setActiveModal(null);
        setMergeFiles([]);
        toast.success('Downloaded merged PDF!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to merge PDFs');
    } finally {
      setIsProcessingTool(false);
      setToolProgress('');
    }
  };

  // -------------------------------------------------------------
  // TOOL 3: SPLIT & EXTRACT ENGINE
  // -------------------------------------------------------------
  const parsePageRange = (input: string, maxPages: number): number[] => {
    const pages: Set<number> = new Set();
    const parts = input.split(',').map((p) => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.max(1, start); p <= Math.min(maxPages, end); p++) {
            pages.add(p - 1); // 0-based
          }
        }
      } else {
        const single = parseInt(part, 10);
        if (!isNaN(single) && single >= 1 && single <= maxPages) {
          pages.add(single - 1); // 0-based
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleExecuteSplit = async () => {
    if (!doc) return;
    const targetIndices = parsePageRange(splitRangeInput, doc.pageCount);
    if (targetIndices.length === 0) {
      toast.error('Please enter valid page numbers or ranges (e.g. 1-3, 5, 8-10)');
      return;
    }

    setIsProcessingTool(true);
    setToolProgress(`Extracting ${targetIndices.length} pages into a dedicated PDF...`);
    try {
      const extractedBytes = await splitAndExtractPages(doc.buffer, targetIndices);
      const blob = new Blob([extractedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `Extracted_Pages_${doc.name}`;
      link.click();
      URL.revokeObjectURL(url);

      setActiveModal(null);
      toast.success(`Extracted ${targetIndices.length} pages into a new PDF!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to extract pages');
    } finally {
      setIsProcessingTool(false);
      setToolProgress('');
    }
  };

  const handleExplodeAllToZip = async () => {
    if (!doc) return;
    setIsProcessingTool(true);
    setToolProgress(`Splitting all ${doc.pageCount} pages into individual PDF files...`);
    try {
      const zip = new JSZip();
      const baseName = doc.name.replace(/\.pdf$/i, '');

      for (let i = 0; i < doc.pageCount; i++) {
        setToolProgress(`Extracting page ${i + 1} of ${doc.pageCount}...`);
        const singleBytes = await splitAndExtractPages(doc.buffer, [i]);
        zip.file(`${baseName}_Page_${i + 1}.pdf`, singleBytes);
      }

      setToolProgress('Generating ZIP package...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}_All_Pages.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setActiveModal(null);
      toast.success(`Exploded ${doc.pageCount} pages into ZIP!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to explode pages to ZIP');
    } finally {
      setIsProcessingTool(false);
      setToolProgress('');
    }
  };

  // -------------------------------------------------------------
  // TOOL 4: CREATE FROM IMAGES
  // -------------------------------------------------------------
  const handleAddImages = (files: FileList | File[]) => {
    const validImages = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(f.name)
    );
    if (validImages.length === 0) {
      toast.error('Please upload valid image files (PNG, JPG, WebP).');
      return;
    }

    validImages.forEach((imgFile) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImageFiles((prev) => [
          ...prev,
          {
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: imgFile.name,
            size: imgFile.size,
            dataUrl,
          },
        ]);
      };
      reader.readAsDataURL(imgFile);
    });
    toast.success(`Added ${validImages.length} image${validImages.length > 1 ? 's' : ''}`);
  };

  const handleCompileImagesToPdf = async () => {
    if (imageFiles.length === 0) {
      toast.error('Please add at least one image to compile.');
      return;
    }

    setIsProcessingTool(true);
    setToolProgress(`Compiling ${imageFiles.length} images into an A4 PDF document...`);
    try {
      const pages = imageFiles.map((f) => ({ processedSrc: f.dataUrl }));
      const pdfBlob = await compileScanPagesToPdf(pages);
      const newFile = new File([pdfBlob], `Image_Collection_${Date.now()}.pdf`, { type: 'application/pdf' });

      await loadPdfFile(newFile);
      setActiveModal(null);
      setImageFiles([]);
      toast.success(`Compiled ${imageFiles.length} images into PDF!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to compile images to PDF');
    } finally {
      setIsProcessingTool(false);
      setToolProgress('');
    }
  };

  // -------------------------------------------------------------
  // TOOL 5: CONVERT TO DOCX
  // -------------------------------------------------------------
  const handleConvertToDocx = async () => {
    if (!doc) return;
    setIsProcessingTool(true);
    setToolProgress('Converting PDF layout and typography into OpenXML Word (.docx)...');
    try {
      const dummyFile = new File([doc.buffer], doc.name, { type: 'application/pdf' });
      const result = await convertDocument(dummyFile, 'docx', {
        onProgress: (status) => setToolProgress(status),
      });

      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      link.click();
      URL.revokeObjectURL(url);

      setActiveModal(null);
      toast.success('Successfully converted PDF to Microsoft Word (.docx)!');
    } catch (err) {
      console.error(err);
      toast.error('Could not convert to DOCX. The PDF may contain encrypted elements.');
    } finally {
      setIsProcessingTool(false);
      setToolProgress('');
    }
  };

  // -------------------------------------------------------------
  // TOOL 6: CONVERT TO PPTX
  // -------------------------------------------------------------
  const handleConvertToPptx = async () => {
    if (!doc) return;
    setIsProcessingTool(true);
    setToolProgress('Rendering high-DPI slides and assembling 16:9 PowerPoint presentation (.pptx)...');
    try {
      // Collect slide images from rendered thumbnails or render freshly
      const slideImages = [];
      const totalPages = doc.pageCount;

      for (let i = 0; i < totalPages; i++) {
        setToolProgress(`Capturing slide ${i + 1} of ${totalPages}...`);
        const thumb = thumbnails[i];
        if (thumb) {
          slideImages.push({ dataUrl: thumb, title: `Slide ${i + 1}` });
        } else {
          // If thumbnail not yet ready, fetch page snapshot
          const page = await pdfJsDocRef.current.getPage(i + 1);
          const viewport = page.getViewport({ scale: 1.5 });
          const offCanvas = document.createElement('canvas');
          offCanvas.width = viewport.width;
          offCanvas.height = viewport.height;
          const offCtx = offCanvas.getContext('2d')!;
          await page.render({ canvasContext: offCtx, viewport }).promise;
          slideImages.push({
            dataUrl: offCanvas.toDataURL('image/jpeg', 0.9),
            title: `Slide ${i + 1}`,
          });
        }
      }

      setToolProgress('Packaging OpenXML 16:9 presentation structure...');
      const presTitle = doc.name.replace(/\.pdf$/i, '');
      const pptxBlob = await compileImagesToPptx(slideImages, presTitle);

      const url = URL.createObjectURL(pptxBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${presTitle}_Slides.pptx`;
      link.click();
      URL.revokeObjectURL(url);

      setActiveModal(null);
      toast.success('Successfully converted PDF into PowerPoint (.pptx)!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to convert PDF to PPTX');
    } finally {
      setIsProcessingTool(false);
      setToolProgress('');
    }
  };

  // Send current PDF to Notes
  const handleSendToNotesLocal = () => {
    if (!doc) return;
    const blob = new Blob([doc.buffer], { type: 'application/pdf' });
    if (onSendToNotes) {
      onSendToNotes(blob, doc.name);
      toast.success('Sent document to Notes!');
    } else {
      toast.success('Ready to embed in Notes');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans select-none">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) loadPdfFile(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={mergeInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleAddMergeFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleAddImages(e.target.files);
          e.target.value = '';
        }}
      />

      {/* -------------------------------------------------------------
          TOP ACROBAT-STYLE SUITE RIBBON & ACTION TOOLBAR
      -------------------------------------------------------------- */}
      <header className="flex-shrink-0 bg-[var(--card-bg)] border-b border-[var(--card-border)] px-3 sm:px-4 py-2 z-20 min-w-0 shadow-2xs">
        <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
          {/* Left: Quick Suite Switcher & Document Metadata */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-shrink-0">
            {onSwitchStudio && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-0.5 rounded-lg border border-[var(--card-border)] flex-shrink-0 mr-0.5">
                <button
                  type="button"
                  onClick={() => onSwitchStudio('pdf')}
                  className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white shadow-2xs"
                  title="PDF Studio (Active)"
                >
                  📕
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchStudio('word')}
                  className="px-1.5 py-0.5 rounded text-[11px] font-bold text-[var(--muted-foreground)] hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                  title="Switch to Word Office Suite"
                >
                  📝
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchStudio('pptx')}
                  className="px-1.5 py-0.5 rounded text-[11px] font-bold text-[var(--muted-foreground)] hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                  title="Switch to PowerPoint Presentation Suite"
                >
                  📊
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchStudio('xlsx')}
                  className="px-1.5 py-0.5 rounded text-[11px] font-bold text-[var(--muted-foreground)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                  title="Switch to Excel Spreadsheet Suite"
                >
                  📈
                </button>
              </div>
            )}

            {doc ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold truncate max-w-[140px] sm:max-w-[220px] md:max-w-[320px]">
                  {doc.name}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap hidden sm:inline font-mono">
                  ({formatBytes(doc.size)} • {doc.pageCount} pgs)
                </span>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-7 sm:h-8 px-2.5 sm:px-3 text-xs font-bold rounded-lg bg-[var(--background)] border border-[var(--card-border)] hover:border-rose-500 text-[var(--foreground)] transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                title="Open a PDF document from disk"
              >
                <HiFolderOpen size={14} className="text-rose-500" />
                <span>Open PDF</span>
              </button>
            )}
          </div>

          {/* Right: Acrobat Swiss Army Action Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 min-w-0">
            {!isToolbarCollapsed ? (
              <>
                <button
                  onClick={() => setActiveModal('compress')}
                  disabled={!doc}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs font-medium rounded-lg hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 border border-transparent hover:border-rose-500/20 whitespace-nowrap"
                  title="Compress PDF file size"
                >
                  <HiLightningBolt size={14} className="text-amber-500" />
                  <span className="hidden sm:inline">Compress</span>
                </button>

                <button
                  onClick={handleRotateAll}
                  disabled={!doc}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs font-medium rounded-lg hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 border border-transparent hover:border-rose-500/20 whitespace-nowrap"
                  title="Rotate all pages 90° CW"
                >
                  <HiRefresh size={14} className="text-rose-500" />
                  <span className="hidden sm:inline">Rotate 90°</span>
                </button>

                <button
                  onClick={() => setActiveModal('merge')}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs font-medium rounded-lg hover:bg-rose-500/10 hover:text-rose-600 transition-colors flex items-center gap-1 border border-transparent hover:border-rose-500/20 whitespace-nowrap"
                  title="Merge multiple PDF files"
                >
                  <HiDocumentDuplicate size={14} className="text-blue-500" />
                  <span className="hidden sm:inline">Merge</span>
                </button>

                <button
                  onClick={() => setActiveModal('split')}
                  disabled={!doc}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs font-medium rounded-lg hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 border border-transparent hover:border-rose-500/20 whitespace-nowrap"
                  title="Split and extract page ranges"
                >
                  <HiScissors size={14} className="text-purple-500" />
                  <span className="hidden sm:inline">Split</span>
                </button>

                <button
                  onClick={() => setActiveModal('images')}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs font-medium rounded-lg hover:bg-rose-500/10 hover:text-rose-600 transition-colors flex items-center gap-1 border border-transparent hover:border-rose-500/20 whitespace-nowrap"
                  title="Compile photos or scans to PDF"
                >
                  <HiPhotograph size={14} className="text-emerald-500" />
                  <span className="hidden md:inline">From Images</span>
                </button>

                <div className="h-4 w-[1px] bg-[var(--card-border)] mx-0.5 sm:mx-1 flex-shrink-0" />

                {/* Conversions */}
                <button
                  onClick={handleConvertToDocx}
                  disabled={!doc || isProcessingTool}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs font-medium rounded-lg hover:bg-blue-500/10 hover:text-blue-600 text-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 border border-blue-500/20 whitespace-nowrap"
                  title="Export PDF to editable Word DOCX"
                >
                  <HiDocumentText size={14} />
                  <span className="hidden lg:inline">To Word</span>
                </button>

                <button
                  onClick={handleConvertToPptx}
                  disabled={!doc || isProcessingTool}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs font-medium rounded-lg hover:bg-orange-500/10 hover:text-orange-600 text-orange-500 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 border border-orange-500/20 whitespace-nowrap"
                  title="Export PDF pages to PowerPoint 16:9 slides"
                >
                  <HiDocumentDuplicate size={14} />
                  <span className="hidden lg:inline">To PPTX</span>
                </button>

                {/* Save / Download */}
                <button
                  onClick={handleSaveModifiedPdf}
                  disabled={!doc || isProcessingTool}
                  className="h-7 sm:h-8 px-2.5 sm:px-3 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 whitespace-nowrap flex-shrink-0"
                  title="Save modified PDF to computer"
                >
                  <HiDownload size={14} />
                  <span>Save<span className="hidden sm:inline"> PDF</span></span>
                </button>
              </>
            ) : (
              <span className="text-[11px] text-[var(--muted-foreground)] font-medium px-2 hidden sm:inline">
                Reading View Active
              </span>
            )}

            {doc && (
              <button
                onClick={() => setIsToolbarCollapsed((c) => !c)}
                className="h-7 sm:h-8 px-2 text-xs rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/50 transition-colors flex items-center gap-1 flex-shrink-0"
                title={isToolbarCollapsed ? "Expand Tools Toolbar" : "Hide Tools Toolbar (Reading Mode)"}
              >
                <span className="hidden lg:inline">{isToolbarCollapsed ? 'Show Tools' : 'Hide Tools'}</span>
                {isToolbarCollapsed ? <HiChevronDown size={14} /> : <HiChevronUp size={14} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------
          CANVAS WORKSPACE & FILMSTRIP SIDEBAR
      -------------------------------------------------------------- */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden bg-slate-100/70 dark:bg-slate-950/70">
        {/* Empty State: If no PDF is loaded */}
        {!doc ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-32 sm:pb-36 flex flex-col items-center min-h-0">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) loadPdfFile(e.dataTransfer.files[0]);
              }}
              className="max-w-3xl w-full my-auto p-5 sm:p-8 md:p-10 rounded-3xl border-2 border-dashed border-rose-500/30 hover:border-rose-500/60 bg-[var(--card-bg)] shadow-2xl transition-all relative overflow-hidden group"
            >
              {/* Decorative Subtle Background Glows */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Main Dropzone Header */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center text-center cursor-pointer select-none"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-rose-500/20 to-orange-500/15 text-rose-500 flex items-center justify-center text-3xl sm:text-4xl shadow-inner group-hover:scale-105 transition-transform mb-3">
                  📕
                </div>
                <h3 className="font-heading font-black text-xl sm:text-2xl text-[var(--foreground)] tracking-tight">
                  Full Suite PDF Reader & Swiss Army Editor
                </h3>
                <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-2 max-w-lg leading-relaxed">
                  Drop your lecture slides, textbook PDF, or assignment scans anywhere.
                  View with retina canvas rendering, compress, reorder, merge, split, or convert to DOCX/PPTX.
                </p>
              </div>

              {/* 4 Quick-Action Workflow Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-[var(--card-border)]/60">
                {/* 1. Open Document */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 rounded-2xl bg-[var(--background)] hover:bg-rose-500/5 border border-[var(--card-border)] hover:border-rose-500/50 transition-all text-left flex items-start gap-3 group/card shadow-2xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0 group-hover/card:scale-110 transition-transform">
                    <HiFolderOpen size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-heading font-bold text-xs sm:text-sm text-[var(--foreground)] block group-hover/card:text-rose-500 transition-colors">
                      Open PDF Document
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)] line-clamp-1 mt-0.5">
                      High-DPI canvas viewer & annotation
                    </span>
                  </div>
                </button>

                {/* 2. Create from Images */}
                <button
                  type="button"
                  onClick={() => setActiveModal('images')}
                  className="p-3.5 rounded-2xl bg-[var(--background)] hover:bg-emerald-500/5 border border-[var(--card-border)] hover:border-emerald-500/50 transition-all text-left flex items-start gap-3 group/card shadow-2xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover/card:scale-110 transition-transform">
                    <HiPhotograph size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-heading font-bold text-xs sm:text-sm text-[var(--foreground)] block group-hover/card:text-emerald-500 transition-colors">
                      Create from Images
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)] line-clamp-1 mt-0.5">
                      Pack camera scans & JPGs to multi-page PDF
                    </span>
                  </div>
                </button>

                {/* 3. Batch Merge PDFs */}
                <button
                  type="button"
                  onClick={() => setActiveModal('merge')}
                  className="p-3.5 rounded-2xl bg-[var(--background)] hover:bg-blue-500/5 border border-[var(--card-border)] hover:border-blue-500/50 transition-all text-left flex items-start gap-3 group/card shadow-2xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover/card:scale-110 transition-transform">
                    <HiDocumentDuplicate size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-heading font-bold text-xs sm:text-sm text-[var(--foreground)] block group-hover/card:text-blue-500 transition-colors">
                      Merge Multiple PDFs
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)] line-clamp-1 mt-0.5">
                      Combine syllabi, readings & assignment handouts
                    </span>
                  </div>
                </button>

                {/* 4. Split & Extract Pages */}
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    toast('Choose a PDF to split or extract page ranges', { icon: '✂️' });
                  }}
                  className="p-3.5 rounded-2xl bg-[var(--background)] hover:bg-purple-500/5 border border-[var(--card-border)] hover:border-purple-500/50 transition-all text-left flex items-start gap-3 group/card shadow-2xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover/card:scale-110 transition-transform">
                    <HiScissors size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-heading font-bold text-xs sm:text-sm text-[var(--foreground)] block group-hover/card:text-purple-500 transition-colors">
                      Extract / Split Pages
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)] line-clamp-1 mt-0.5">
                      Isolate chapters, single pages, or problem sets
                    </span>
                  </div>
                </button>
              </div>

              {/* Bottom Security / Privacy Badges */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[var(--muted-foreground)] pt-6 mt-6 border-t border-[var(--card-border)]/50">
                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  🔒 100% Client-Side Privacy
                </span>
                <span>•</span>
                <span>⚡ 0MB Server Footprint</span>
                <span>•</span>
                <span>📄 Unlimited Pages</span>
                <span>•</span>
                <span>🎓 Local In-Browser Processing</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* LEFT RAIL: Thumbnails & Page Manipulation Filmstrip */}
            <AnimatePresence initial={false}>
              {showThumbnails && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 250, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="flex-shrink-0 h-full border-r border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col z-10 overflow-hidden shadow-sm"
                >
                  {/* Thumbnail Bar Header */}
                  <div className="p-3 border-b border-[var(--card-border)] flex items-center justify-between">
                    <span className="text-xs font-bold font-heading flex items-center gap-1.5">
                      <HiDocumentText className="text-rose-500" size={15} />
                      Page Filmstrip ({pageOrder.length})
                    </span>
                    <button
                      onClick={() => setShowThumbnails(false)}
                      className="p-1 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40 transition-colors"
                      title="Hide filmstrip sidebar"
                    >
                      <HiChevronLeft size={16} />
                    </button>
                  </div>

                  {/* Scrollable list of thumbnails */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {pageOrder.map((origIdx, displayIdx) => {
                      const pageNum = displayIdx + 1;
                      const isCurrent = currentPage === pageNum;
                      const thumbUrl = thumbnails[origIdx];
                      const rotation = pageRotations[origIdx] || 0;

                      return (
                        <div
                          key={`page-slot-${origIdx}-${displayIdx}`}
                          className={`relative group rounded-xl border-2 p-2 transition-all ${
                            isCurrent
                              ? 'border-rose-500 bg-rose-500/5 shadow-md'
                              : 'border-[var(--card-border)] hover:border-rose-500/50 bg-[var(--background)]'
                          }`}
                        >
                          {/* Page Thumbnail Canvas/Image */}
                          <div
                            onClick={() => setCurrentPage(pageNum)}
                            className="cursor-pointer aspect-[1/1.414] bg-white rounded-lg overflow-hidden flex items-center justify-center relative shadow-sm"
                          >
                            {thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt={`Page ${pageNum}`}
                                style={{
                                  transform: `rotate(${rotation}deg)`,
                                  transition: 'transform 0.2s ease',
                                }}
                                className="w-full h-full object-contain pointer-events-none"
                              />
                            ) : (
                              <div className="text-center p-2 text-slate-400 text-xs">
                                <HiDocumentText size={24} className="mx-auto mb-1 animate-pulse" />
                                Page {pageNum}
                              </div>
                            )}

                            {/* Active Badge */}
                            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[9px] font-bold">
                              {pageNum}
                            </span>
                          </div>

                          {/* Quick Micro-Actions Row */}
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-[var(--card-border)]/50 text-[11px]">
                            <span className="font-semibold text-[var(--muted-foreground)]">
                              p.{pageNum}
                            </span>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleRotatePage(origIdx)}
                                className="p-1 rounded hover:bg-rose-500/10 hover:text-rose-600 text-[var(--muted-foreground)] transition-colors"
                                title="Rotate this page 90°"
                              >
                                <HiRefresh size={12} />
                              </button>
                              <button
                                onClick={() => handleMovePageUp(displayIdx)}
                                disabled={displayIdx === 0}
                                className="p-1 rounded hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-20 text-[var(--muted-foreground)] transition-colors"
                                title="Move page up"
                              >
                                <HiArrowUp size={12} />
                              </button>
                              <button
                                onClick={() => handleMovePageDown(displayIdx)}
                                disabled={displayIdx === pageOrder.length - 1}
                                className="p-1 rounded hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-20 text-[var(--muted-foreground)] transition-colors"
                                title="Move page down"
                              >
                                <HiArrowDown size={12} />
                              </button>
                              <button
                                onClick={() => handleDeletePage(displayIdx)}
                                className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 text-[var(--muted-foreground)] transition-colors"
                                title="Delete this page"
                              >
                                <HiTrash size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* CENTER VIEWPORT: Canvas Document View */}
            <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
              {/* Show Sidebar Toggle (when hidden) */}
              {!showThumbnails && (
                <button
                  onClick={() => setShowThumbnails(true)}
                  className="absolute left-3 top-3 z-20 px-2 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold hover:border-rose-500 shadow-md flex items-center gap-1 transition-colors"
                  title="Show thumbnails"
                >
                  <HiChevronRight size={14} /> Pages
                </button>
              )}

              {/* Central Scrollable Canvas Stage */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 md:p-6 relative">
                {isRenderingPage && (
                  <div className="absolute top-4 right-4 z-20 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur text-white text-[10px] font-mono flex items-center gap-1.5 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    Rendering Page {currentPage}...
                  </div>
                )}

                <div className="shadow-2xl rounded-lg bg-white overflow-hidden transition-all duration-150">
                  <canvas ref={canvasRef} className="block max-w-none" />
                </div>
              </div>

              {/* FLOATING RETINA VIEWER CONTROLS HUD */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[var(--card-bg)]/95 backdrop-blur-md border border-[var(--card-border)] rounded-2xl px-3 py-2 shadow-2xl">
                {/* Page Navigation */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Previous page (Left Arrow)"
                  >
                    <HiChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1 font-mono text-xs px-1">
                    <input
                      type="number"
                      min={1}
                      max={pageOrder.length}
                      value={currentPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= pageOrder.length) {
                          setCurrentPage(val);
                        }
                      }}
                      className="w-10 text-center font-bold bg-[var(--background)] border border-[var(--card-border)] rounded-md py-0.5 outline-none focus:border-rose-500"
                    />
                    <span className="text-[var(--muted-foreground)]">/ {pageOrder.length}</span>
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pageOrder.length, p + 1))}
                    disabled={currentPage >= pageOrder.length}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Next page (Right Arrow)"
                  >
                    <HiChevronRight size={16} />
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-[var(--card-border)] mx-1" />

                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setFitMode('actual');
                      setZoom((z) => Math.max(50, z - 15));
                    }}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                    title="Zoom Out"
                  >
                    <HiZoomOut size={16} />
                  </button>

                  <span className="font-mono text-xs font-bold w-12 text-center">
                    {zoom}%
                  </span>

                  <button
                    onClick={() => {
                      setFitMode('actual');
                      setZoom((z) => Math.min(250, z + 15));
                    }}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                    title="Zoom In"
                  >
                    <HiZoomIn size={16} />
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-[var(--card-border)] mx-1" />

                {/* Fit Mode Controls */}
                <button
                  onClick={() => {
                    setFitMode('width');
                    setZoom(100);
                  }}
                  className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    fitMode === 'width' ? 'bg-rose-500/20 text-rose-600' : 'hover:bg-rose-500/10 text-[var(--muted-foreground)]'
                  }`}
                  title="Fit to page width"
                >
                  Fit Width
                </button>

                <button
                  onClick={() => {
                    setFitMode('page');
                    setZoom(100);
                  }}
                  className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    fitMode === 'page' ? 'bg-rose-500/20 text-rose-600' : 'hover:bg-rose-500/10 text-[var(--muted-foreground)]'
                  }`}
                  title="Fit whole page"
                >
                  Fit Page
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* -------------------------------------------------------------
          MODAL 1: COMPRESS DIALOG
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'compress' && doc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40 transition-colors"
              >
                <HiX size={18} />
              </button>

              <div className="flex items-center gap-2.5 text-amber-500 mb-2">
                <HiLightningBolt size={24} />
                <h3 className="font-heading font-black text-lg text-[var(--foreground)]">
                  Compress PDF File
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Optimize and reduce file size client-side without degrading critical lecture diagrams or formulas.
              </p>

              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--card-border)] mb-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[var(--muted-foreground)] block">Original File Size</span>
                  <span className="text-sm font-bold font-mono">{formatBytes(doc.size)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[var(--muted-foreground)] block">Page Count</span>
                  <span className="text-sm font-bold font-mono">{doc.pageCount} pages</span>
                </div>
              </div>

              {/* Compression Preset Selection */}
              <div className="space-y-2 mb-6">
                <label className="text-xs font-bold block text-[var(--foreground)]">Select Optimization Mode:</label>

                <div
                  onClick={() => setCompressPreset('balanced')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    compressPreset === 'balanced'
                      ? 'border-rose-500 bg-rose-500/5'
                      : 'border-[var(--card-border)] hover:border-rose-500/40 bg-[var(--background)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Balanced (Lossless Vector Streams)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">Recommended</span>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                    Cleans junk metadata and compacts PDF object streams. Zero reduction in vector text or line chart quality.
                  </p>
                </div>

                <div
                  onClick={() => setCompressPreset('portal')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    compressPreset === 'portal'
                      ? 'border-rose-500 bg-rose-500/5'
                      : 'border-[var(--card-border)] hover:border-rose-500/40 bg-[var(--background)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">LMS Homework Portal Ready (&lt; 2MB)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">Portal Caps</span>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                    Optimizes embedded images to pass strict LMS submission caps (Canvas, Blackboard, Moodle).
                  </p>
                </div>

                <div
                  onClick={() => setCompressPreset('high_quality')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    compressPreset === 'high_quality'
                      ? 'border-rose-500 bg-rose-500/5'
                      : 'border-[var(--card-border)] hover:border-rose-500/40 bg-[var(--background)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">High Quality Presentation</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 font-bold">Crisp</span>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                    Light compression preserving ultra-fine font serifs and color gradients for print submissions.
                  </p>
                </div>
              </div>

              {isProcessingTool && (
                <div className="p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>{toolProgress || 'Compressing document...'}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={isProcessingTool}
                  className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--card-border)]/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteCompress(true)}
                  disabled={isProcessingTool}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--background)] border border-[var(--card-border)] hover:border-rose-500 text-[var(--foreground)] transition-all"
                >
                  Apply & Reload
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteCompress(false)}
                  disabled={isProcessingTool}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all active:scale-95"
                >
                  Download Compressed PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          MODAL 2: MERGE DIALOG
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'merge' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-6 relative max-h-[90vh] flex flex-col"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40 transition-colors"
              >
                <HiX size={18} />
              </button>

              <div className="flex items-center gap-2.5 text-blue-500 mb-2">
                <HiDocumentDuplicate size={24} />
                <h3 className="font-heading font-black text-lg text-[var(--foreground)]">
                  Merge Multiple PDFs
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Combine syllabi, assignment sheets, and lecture slides into a unified study document.
              </p>

              {/* Upload trigger */}
              <div
                onClick={() => mergeInputRef.current?.click()}
                className="p-4 rounded-xl border-2 border-dashed border-blue-500/40 hover:border-blue-500 bg-blue-500/5 cursor-pointer text-center mb-4 transition-colors"
              >
                <HiFolderOpen size={24} className="mx-auto text-blue-500 mb-1" />
                <span className="text-xs font-bold block text-[var(--foreground)]">Click to add PDF documents</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">You can select multiple files at once</span>
              </div>

              {/* Current Documents in merge pipeline */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
                {doc && (
                  <div className="p-2.5 rounded-xl bg-[var(--background)] border border-rose-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-rose-500">1.</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate max-w-[240px]">{doc.name} (Active)</span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">{doc.pageCount} pages • {formatBytes(doc.size)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">Current Doc</span>
                  </div>
                )}

                {mergeFiles.map((m, idx) => (
                  <div key={m.id} className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--card-border)] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-blue-500">{(doc ? 2 : 1) + idx}.</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate max-w-[240px]">{m.name}</span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">{m.pageCount} pages • {formatBytes(m.size)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setMergeFiles((prev) => {
                            if (idx === 0) return prev;
                            const copy = [...prev];
                            const temp = copy[idx - 1];
                            copy[idx - 1] = copy[idx];
                            copy[idx] = temp;
                            return copy;
                          });
                        }}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-blue-500/10 disabled:opacity-20 text-[var(--muted-foreground)]"
                      >
                        <HiArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setMergeFiles((prev) => {
                            if (idx === prev.length - 1) return prev;
                            const copy = [...prev];
                            const temp = copy[idx + 1];
                            copy[idx + 1] = copy[idx];
                            copy[idx] = temp;
                            return copy;
                          });
                        }}
                        disabled={idx === mergeFiles.length - 1}
                        className="p-1 rounded hover:bg-blue-500/10 disabled:opacity-20 text-[var(--muted-foreground)]"
                      >
                        <HiArrowDown size={12} />
                      </button>
                      <button
                        onClick={() => setMergeFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 rounded hover:bg-red-500/10 text-red-500"
                      >
                        <HiTrash size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {isProcessingTool && (
                <div className="p-3 mb-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <span>{toolProgress || 'Merging documents...'}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)]/50">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={isProcessingTool}
                  className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--card-border)]/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteMerge(true)}
                  disabled={isProcessingTool || mergeFiles.length === 0}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95 disabled:opacity-40"
                >
                  Merge & Open in Viewer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          MODAL 3: SPLIT & EXTRACT DIALOG
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'split' && doc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40 transition-colors"
              >
                <HiX size={18} />
              </button>

              <div className="flex items-center gap-2.5 text-purple-500 mb-2">
                <HiScissors size={24} />
                <h3 className="font-heading font-black text-lg text-[var(--foreground)]">
                  Split & Extract Pages
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Extract specific chapters or problem sets into a standalone PDF.
              </p>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs font-bold block mb-1">Page Range to Extract:</label>
                  <input
                    type="text"
                    value={splitRangeInput}
                    onChange={(e) => setSplitRangeInput(e.target.value)}
                    placeholder="e.g. 1-3, 5, 8-12"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-purple-500 font-mono"
                  />
                  <span className="text-[10px] text-[var(--muted-foreground)] mt-1 block">
                    Total pages available: {doc.pageCount}. Comma-separated single pages and dashes for ranges.
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-[11px] text-[var(--muted-foreground)]">
                  💡 Tip: You can also extract all {doc.pageCount} pages as individual standalone PDF files zipped into a single archive.
                </div>
              </div>

              {isProcessingTool && (
                <div className="p-3 mb-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  <span>{toolProgress || 'Extracting pages...'}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--card-border)]/50">
                <button
                  type="button"
                  onClick={handleExplodeAllToZip}
                  disabled={isProcessingTool}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-[var(--background)] border border-[var(--card-border)] hover:border-purple-500 text-[var(--foreground)] transition-colors"
                >
                  Explode to ZIP
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    disabled={isProcessingTool}
                    className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--card-border)]/40 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteSplit}
                    disabled={isProcessingTool || !splitRangeInput.trim()}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all active:scale-95"
                  >
                    Extract to PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          MODAL 4: IMAGES TO PDF DIALOG
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'images' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-6 relative max-h-[90vh] flex flex-col"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40 transition-colors"
              >
                <HiX size={18} />
              </button>

              <div className="flex items-center gap-2.5 text-emerald-500 mb-2">
                <HiPhotograph size={24} />
                <h3 className="font-heading font-black text-lg text-[var(--foreground)]">
                  Create PDF from Images
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Compile handwritten math assignments or whiteboard snapshots into an A4 PDF.
              </p>

              {/* Upload Trigger */}
              <div
                onClick={() => imageInputRef.current?.click()}
                className="p-4 rounded-xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 cursor-pointer text-center mb-4 transition-colors"
              >
                <HiPhotograph size={24} className="mx-auto text-emerald-500 mb-1" />
                <span className="text-xs font-bold block text-[var(--foreground)]">Click to add photo scans / images</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">PNG, JPG, WebP supported</span>
              </div>

              {/* Image Grid */}
              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4 pr-1">
                {imageFiles.map((img, idx) => (
                  <div key={img.id} className="relative rounded-xl border border-[var(--card-border)] p-1.5 bg-[var(--background)] flex flex-col items-center group">
                    <img src={img.dataUrl} alt={img.name} className="w-full aspect-[3/4] object-cover rounded-lg" />
                    <span className="text-[10px] font-bold truncate max-w-full mt-1">{img.name}</span>
                    <button
                      onClick={() => setImageFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-red-500 transition-colors"
                    >
                      <HiX size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {isProcessingTool && (
                <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{toolProgress || 'Compiling images to PDF...'}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)]/50">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={isProcessingTool}
                  className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--card-border)]/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompileImagesToPdf}
                  disabled={isProcessingTool || imageFiles.length === 0}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95 disabled:opacity-40"
                >
                  Compile {imageFiles.length} Images to PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
