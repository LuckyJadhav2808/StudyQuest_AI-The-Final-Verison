'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiTable,
  HiDocumentText,
  HiPresentationChartBar,
  HiDownload,
  HiPlus,
  HiTrash,
  HiSearch,
  HiBookOpen,
  HiCalculator,
  HiClipboardCopy,
  HiArrowLeft,
  HiArrowRight,
  HiArrowsExpand,
  HiLightBulb,
  HiPencil,
  HiEye,
  HiX,
  HiZoomIn,
  HiZoomOut,
  HiPhotograph,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StudioToolbar from '../shared/StudioToolbar';
import DropzoneZone from '../shared/DropzoneZone';
import { OfficeSubTool, ExcelWorkbookData, WordDocData, PptxDeckData } from '@/lib/docstudio/types';
import {
  readExcelWorkbook,
  exportExcelWorkbook,
  readWordDocument,
  exportHtmlToWordBlob,
  readPptxDeck,
  compilePptxToStudyPdf,
} from '@/lib/docstudio/officeEngine';
import { computeColumnStats, generateTablePdf } from '@/lib/docstudio/csvEngine';
import { convertDocument } from '@/lib/docstudio/universalConverter';

// Dynamically import ReactQuill to prevent SSR window issues
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center bg-surface/50 border border-border rounded-xl">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});
import 'react-quill-new/dist/quill.snow.css';

interface OfficeStudioProps {
  onBack: () => void;
  onOpenInReader?: (file: { name: string; src: string; type: 'pdf' | 'image' | 'text' }) => void;
  onSendToNotes?: (contentOrBlob: string | Blob, title: string) => void;
}

/**
 * Converts zero-based column index to Excel column letters (0 -> A, 25 -> Z, 26 -> AA)
 */
function getExcelColumnLetter(colIndex: number): string {
  let label = '';
  let temp = colIndex;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
}

export default function OfficeStudio({ onBack, onOpenInReader, onSendToNotes }: OfficeStudioProps) {
  const [activeTab, setActiveTab] = useState<OfficeSubTool>('excel');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 1. Excel State
  const [workbook, setWorkbook] = useState<ExcelWorkbookData | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>('Workbook');
  const [activeSheetName, setActiveSheetName] = useState<string>('Sheet1');
  const [excelSearch, setExcelSearch] = useState<string>('');
  const [selectedColIdx, setSelectedColIdx] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rIdx: number; cIdx: number } | null>({ rIdx: 0, cIdx: 0 });

  // 2. Word State
  const [wordDoc, setWordDoc] = useState<WordDocData | null>(null);
  const [wordFileName, setWordFileName] = useState<string>('Document');
  const [wordBuffer, setWordBuffer] = useState<ArrayBuffer | null>(null);
  const [wordViewMode, setWordViewMode] = useState<'preview' | 'editor'>('preview');
  const [editorHtml, setEditorHtml] = useState<string>('');
  const [docZoom, setDocZoom] = useState<number>(1);
  const [isRenderingDocx, setIsRenderingDocx] = useState<boolean>(false);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  // 3. PowerPoint State
  const [pptxDeck, setPptxDeck] = useState<PptxDeckData | null>(null);
  const [pptxBuffer, setPptxBuffer] = useState<ArrayBuffer | null>(null);
  const [pptxFileName, setPptxFileName] = useState<string>('Slide_Handout');
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isRenderingPptx, setIsRenderingPptx] = useState<boolean>(false);
  const pptxContainerRef = useRef<HTMLDivElement>(null);
  const fullScreenPptxRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pptxViewerRef = useRef<any>(null);

  // ==========================================
  // EXCEL HANDLERS
  // ==========================================
  const handleUploadExcel = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const buffer = await file.arrayBuffer();
      const parsed = readExcelWorkbook(buffer, file.name);
      setWorkbook(parsed);
      setExcelFileName(file.name.replace(/\.[^/.]+$/, ''));
      setActiveSheetName(parsed.sheetNames[0]);
      setSelectedColIdx(0);
      setSelectedCell({ rIdx: 0, cIdx: 0 });
      toast.success(`Workbook loaded: ${parsed.sheetNames.length} sheets`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse Excel workbook');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentSheet = workbook ? workbook.sheets[activeSheetName] : null;

  const handleCellEdit = (rIdx: number, cIdx: number, val: string) => {
    if (!workbook || !currentSheet) return;
    const copy = { ...workbook };
    const sheetCopy = { ...currentSheet };
    sheetCopy.rows = sheetCopy.rows.map((r, i) => (i === rIdx ? r.map((c, j) => (j === cIdx ? val : c)) : r));
    copy.sheets[activeSheetName] = sheetCopy;
    setWorkbook(copy);
  };

  const handleAddRow = () => {
    if (!workbook || !currentSheet) return;
    const copy = { ...workbook };
    const sheetCopy = { ...currentSheet };
    sheetCopy.rows = [...sheetCopy.rows, new Array(sheetCopy.headers.length).fill('')];
    copy.sheets[activeSheetName] = sheetCopy;
    setWorkbook(copy);
    toast.success('Row added');
  };

  const handleAddColumn = () => {
    if (!workbook || !currentSheet) return;
    const copy = { ...workbook };
    const sheetCopy = { ...currentSheet };
    sheetCopy.headers = [...sheetCopy.headers, `Col ${sheetCopy.headers.length + 1}`];
    sheetCopy.rows = sheetCopy.rows.map((r) => [...r, '']);
    copy.sheets[activeSheetName] = sheetCopy;
    setWorkbook(copy);
    toast.success('Column added');
  };

  const handleAddSheet = () => {
    if (!workbook) return;
    const newName = `Sheet${workbook.sheetNames.length + 1}`;
    const copy = { ...workbook };
    copy.sheetNames.push(newName);
    copy.sheets[newName] = { name: newName, headers: ['A', 'B', 'C'], rows: [['', '', '']] };
    setWorkbook(copy);
    setActiveSheetName(newName);
    toast.success(`Created ${newName}`);
  };

  const exportExcel = () => {
    if (!workbook) return;
    try {
      const u8 = exportExcelWorkbook(workbook);
      const blob = new Blob([u8 as unknown as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (excelFileName.trim() || workbook.fileName.replace(/\.[^/.]+$/, '')).replace(/\.xlsx$/i, '');
      a.download = `${cleanName}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast.success('Excel workbook downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  };

  // ==========================================
  // WORD HANDLERS & HIGH-FIDELITY DOCX PREVIEW
  // ==========================================
  const handleUploadWord = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const buffer = await file.arrayBuffer();
      setWordBuffer(buffer);

      const parsed = await readWordDocument(buffer, file.name);
      setWordDoc(parsed);
      setWordFileName(file.name.replace(/\.[^/.]+$/, ''));
      setEditorHtml(parsed.htmlContent);
      setWordViewMode('preview');
      toast.success(`Word document loaded: ${parsed.wordCount} words`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse Word document');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render high-fidelity DOCX paper document into DOM when wordBuffer or preview mode changes
  useEffect(() => {
    if (activeTab === 'word' && wordBuffer && wordViewMode === 'preview') {
      let isMounted = true;

      const renderDocx = async () => {
        try {
          setIsRenderingDocx(true);
          const { renderAsync } = await import('docx-preview');

          // Wait for DOM container
          await new Promise((r) => setTimeout(r, 60));

          if (docxContainerRef.current && isMounted) {
            docxContainerRef.current.innerHTML = '';
            await renderAsync(wordBuffer, docxContainerRef.current, undefined, {
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              breakPages: true,
              renderHeaders: true,
              renderFooters: true,
              useBase64URL: true,
            });
          }
        } catch (err) {
          console.error('Failed rendering DOCX high-fidelity view', err);
        } finally {
          if (isMounted) setIsRenderingDocx(false);
        }
      };

      renderDocx();
      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, wordBuffer, wordViewMode]);

  const exportWordDoc = () => {
    if (!wordDoc) return;
    const blob = exportHtmlToWordBlob(editorHtml, wordDoc.fileName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = (wordFileName.trim() || wordDoc.fileName.replace(/\.[^/.]+$/, '')).replace(/\.doc$/i, '');
    a.download = `${cleanName}.doc`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast.success('Word document downloaded!');
  };

  // ==========================================
  // POWERPOINT HANDLERS
  // ==========================================
  const handleUploadPptx = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const buffer = await file.arrayBuffer();
      setPptxBuffer(buffer);
      const parsed = await readPptxDeck(buffer, file.name);
      setPptxDeck(parsed);
      setPptxFileName(`${file.name.replace(/\.[^/.]+$/, '')}_Slide_Handout`);
      setActiveSlideIdx(0);
      toast.success(`Loaded presentation: ${parsed.totalSlides} slides`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse PowerPoint presentation');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render authentic 1:1 PowerPoint slide using PptxViewer
  useEffect(() => {
    if (activeTab === 'pptx' && pptxBuffer) {
      let isMounted = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let viewerInstance: any = null;

      const renderSlide = async () => {
        try {
          setIsRenderingPptx(true);
          const { PptxViewer } = await import('@aiden0z/pptx-renderer');

          await new Promise((r) => setTimeout(r, 60));
          const targetContainer = isFullScreen ? fullScreenPptxRef.current : pptxContainerRef.current;
          if (!targetContainer || !isMounted) return;

          targetContainer.innerHTML = '';
          viewerInstance = await PptxViewer.open(pptxBuffer, targetContainer, {
            renderMode: 'slide',
            fitMode: 'contain',
          });

          if (!isMounted) {
            viewerInstance.destroy();
            return;
          }

          pptxViewerRef.current = viewerInstance;
          await viewerInstance.goToSlide(activeSlideIdx);
        } catch (err) {
          console.error('Failed rendering PPTX authentic slide:', err);
        } finally {
          if (isMounted) setIsRenderingPptx(false);
        }
      };

      renderSlide();
      return () => {
        isMounted = false;
        if (viewerInstance) {
          try {
            viewerInstance.destroy();
          } catch {}
        }
      };
    }
  }, [activeTab, pptxBuffer, isFullScreen]);

  // Navigate slides without re-parsing presentation model
  useEffect(() => {
    if (pptxViewerRef.current && activeTab === 'pptx') {
      try {
        pptxViewerRef.current.goToSlide(activeSlideIdx);
      } catch (err) {
        console.warn('Error navigating slide:', err);
      }
    }
  }, [activeSlideIdx, activeTab]);

  // Full Screen Presenter Keyboard Listener
  useEffect(() => {
    if (!isFullScreen || !pptxDeck) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setActiveSlideIdx((i) => Math.min(pptxDeck.totalSlides - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        setActiveSlideIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, pptxDeck]);

  const exportPptxPdf = async (destination: 'download' | 'reader' | 'notes') => {
    if (!pptxDeck) return;

    try {
      setIsProcessing(true);
      let pdfBlob: Blob;
      if (pptxBuffer) {
        const file = new File([pptxBuffer], pptxDeck.fileName, {
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        });
        const conversion = await convertDocument(file, 'pdf');
        pdfBlob = conversion.blob;
      } else {
        pdfBlob = await compilePptxToStudyPdf(pptxDeck);
      }

      const cleanName = (pptxFileName.trim() || pptxDeck.fileName.replace(/\.[^/.]+$/, '')).replace(/\.pdf$/i, '');
      const name = `${cleanName}.pdf`;

      if (destination === 'download') {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast.success('1:1 Visual Clone Study PDF downloaded!');
      } else if (destination === 'reader' && onOpenInReader) {
        const url = URL.createObjectURL(pdfBlob);
        onOpenInReader({ name, src: url, type: 'pdf' });
        toast.success('Opened slide handout in Split Reader!');
      } else if (destination === 'notes' && onSendToNotes) {
        onSendToNotes(pdfBlob, name);
        toast.success('Attached slide deck to Notes!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed compiling study PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportPptxImages = async () => {
    if (!pptxDeck || !pptxBuffer) return;
    try {
      setIsProcessing(true);
      const file = new File([pptxBuffer], pptxDeck.fileName, {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      const conversion = await convertDocument(file, 'png');
      const url = URL.createObjectURL(conversion.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = conversion.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast.success('1:1 Visual Clone Slide Images downloaded (PNG)!');
    } catch (err) {
      console.error(err);
      toast.error('Failed exporting slide images');
    } finally {
      setIsProcessing(false);
    }
  };

  // Stats calculation for current Excel sheet
  const excelColStats = useMemo(() => {
    if (!currentSheet || selectedColIdx === null || selectedColIdx >= currentSheet.headers.length) {
      return null;
    }
    return computeColumnStats(currentSheet.rows, selectedColIdx);
  }, [currentSheet, selectedColIdx]);

  // Filter displayed Excel rows based on excelSearch while preserving originalIdx for safe in-place cell editing
  const displayedExcelRows = useMemo(() => {
    if (!currentSheet) return [];
    if (!excelSearch.trim()) {
      return currentSheet.rows.map((row, originalIdx) => ({ row, originalIdx }));
    }
    const q = excelSearch.toLowerCase();
    return currentSheet.rows
      .map((row, originalIdx) => ({ row, originalIdx }))
      .filter(({ row }) => row.some((cell) => String(cell).toLowerCase().includes(q)));
  }, [currentSheet, excelSearch]);

  return (
    <div className="flex flex-col h-full">
      <StudioToolbar
        toolTitle="Microsoft Office Studio"
        toolDescription="Edit multi-sheet Excel workbooks, view original Word document layouts, and present PowerPoint slide decks"
        badgeText="Office Suite"
        icon={<HiPresentationChartBar className="text-indigo-500" />}
        onBack={onBack}
        onReset={() => {
          setWorkbook(null);
          setWordDoc(null);
          setWordBuffer(null);
          setPptxDeck(null);
          setPptxBuffer(null);
          if (pptxViewerRef.current) {
            try {
              pptxViewerRef.current.destroy();
            } catch {}
            pptxViewerRef.current = null;
          }
        }}
        fileName={
          activeTab === 'excel' && workbook
            ? excelFileName
            : activeTab === 'word' && wordDoc
            ? wordFileName
            : activeTab === 'pptx' && pptxDeck
            ? pptxFileName
            : undefined
        }
        onFileNameChange={
          activeTab === 'excel' && workbook
            ? setExcelFileName
            : activeTab === 'word' && wordDoc
            ? setWordFileName
            : activeTab === 'pptx' && pptxDeck
            ? setPptxFileName
            : undefined
        }
        fileExtension={activeTab === 'excel' ? 'xlsx' : activeTab === 'word' ? 'doc' : 'pdf'}
      />

      {/* Top Office Format Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-surface border border-border mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('excel')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'excel'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <HiTable className="w-4 h-4" />
          <span>Excel (.xlsx / .csv)</span>
        </button>

        <button
          onClick={() => setActiveTab('word')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'word'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <HiDocumentText className="w-4 h-4" />
          <span>Word (.docx)</span>
        </button>

        <button
          onClick={() => setActiveTab('pptx')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'pptx'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <HiPresentationChartBar className="w-4 h-4" />
          <span>PowerPoint (.pptx)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. EXCEL WORKBOOK WORKBENCH (AUTHENTIC EXCEL STYLING)     */}
      {/* ======================================================== */}
      {activeTab === 'excel' && (
        <div className="flex flex-col flex-1 min-h-0">
          {!workbook ? (
            <div className="max-w-2xl mx-auto w-full py-8">
              <DropzoneZone
                onFilesSelected={handleUploadExcel}
                accept=".xlsx,.xls,.csv"
                title="Drop an Excel (.xlsx, .xls) workbook here"
                description="View and edit multi-sheet spreadsheets with authentic formula bars, cell coordinate selection, and statistics"
                allowedFormatsText="XLSX, XLS, CSV"
              />
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 gap-2.5">
              {/* Excel Action Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-surface border border-border">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={excelSearch}
                      onChange={(e) => setExcelSearch(e.target.value)}
                      placeholder="Filter sheet..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background border border-border text-xs">
                    <HiPencil className="w-3 h-3 text-muted-foreground" />
                    <input
                      type="text"
                      value={excelFileName}
                      onChange={(e) => setExcelFileName(e.target.value)}
                      placeholder="Workbook name"
                      className="bg-transparent font-medium text-foreground focus:outline-hidden text-xs w-28 sm:w-36"
                      title="Rename Excel workbook"
                    />
                    <span className="text-[10px] text-muted-foreground font-mono">.xlsx</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={handleAddRow}>
                    <HiPlus className="w-3.5 h-3.5 mr-1" /> Row
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAddColumn}>
                    <HiPlus className="w-3.5 h-3.5 mr-1" /> Col
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportExcel}>
                    <HiDownload className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Download .xlsx
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!currentSheet) return;
                      const pdfBlob = generateTablePdf(currentSheet.headers, currentSheet.rows, activeSheetName);
                      const url = URL.createObjectURL(pdfBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${workbook.fileName}_${activeSheetName}.pdf`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 10000);
                      toast.success('PDF Table downloaded!');
                    }}
                  >
                    PDF Table
                  </Button>
                </div>
              </div>

              {/* Excel Authentic Formula Bar */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-xs">
                <div className="w-14 text-center font-bold font-mono bg-background py-1 px-1.5 rounded-lg border border-border text-emerald-600 dark:text-emerald-400">
                  {selectedCell && currentSheet ? `${getExcelColumnLetter(selectedCell.cIdx)}${selectedCell.rIdx + 1}` : 'A1'}
                </div>
                <span className="text-muted-foreground font-bold italic font-serif px-1 text-sm select-none">fx</span>
                <input
                  type="text"
                  value={
                    selectedCell && currentSheet && currentSheet.rows[selectedCell.rIdx]
                      ? currentSheet.rows[selectedCell.rIdx][selectedCell.cIdx] ?? ''
                      : ''
                  }
                  onChange={(e) => {
                    if (selectedCell) {
                      handleCellEdit(selectedCell.rIdx, selectedCell.cIdx, e.target.value);
                    }
                  }}
                  placeholder="Enter formula or cell value..."
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-1 font-mono text-xs text-foreground focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Authentic Excel Spreadsheet Grid */}
              {currentSheet && (
                <div className="flex-1 min-h-[350px] overflow-auto rounded-xl border border-border bg-background shadow-inner">
                  <table className="w-full border-collapse text-xs select-none">
                    <thead className="sticky top-0 bg-muted/95 backdrop-blur-xs z-10">
                      <tr>
                        {/* Top-left Corner */}
                        <th className="p-1.5 w-12 text-center font-mono text-[10px] text-muted-foreground border-b border-r border-border bg-muted/60">
                          ◢
                        </th>
                        {/* Column Letters (A, B, C...) */}
                        {currentSheet.headers.map((h, cIdx) => (
                          <th
                            key={cIdx}
                            onClick={() => {
                              setSelectedColIdx(cIdx);
                              setSelectedCell({ rIdx: 0, cIdx });
                            }}
                            className={`p-1.5 min-w-[100px] text-center font-mono font-bold border-b border-r border-border cursor-pointer transition-colors ${
                              selectedColIdx === cIdx ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted/40 text-foreground'
                            }`}
                          >
                            <span className="text-[11px] block">{getExcelColumnLetter(cIdx)}</span>
                            <span className="text-[10px] text-muted-foreground font-normal truncate block max-w-[110px]">
                              {h}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayedExcelRows.map(({ row, originalIdx }) => (
                        <tr key={originalIdx} className="hover:bg-muted/20 border-b border-border/60">
                          {/* Row Index (1, 2, 3...) */}
                          <td className="p-1 text-center text-[10px] text-muted-foreground font-mono border-r border-border/80 bg-muted/30 select-none">
                            {originalIdx + 1}
                          </td>

                          {/* Interactive Excel Cells */}
                          {row.map((cell, cIdx) => {
                            const isSelected = selectedCell?.rIdx === originalIdx && selectedCell?.cIdx === cIdx;
                            const isNumeric = !isNaN(Number(cell)) && cell.trim() !== '';

                            return (
                              <td
                                key={cIdx}
                                onClick={() => setSelectedCell({ rIdx: originalIdx, cIdx })}
                                className={`p-0 border-r border-border/60 relative transition-all ${
                                  isSelected ? 'ring-2 ring-emerald-500 bg-emerald-500/10 z-10' : ''
                                }`}
                              >
                                <input
                                  type="text"
                                  value={cell}
                                  onFocus={() => setSelectedCell({ rIdx: originalIdx, cIdx })}
                                  onChange={(e) => handleCellEdit(originalIdx, cIdx, e.target.value)}
                                  className={`w-full px-2 py-1.5 bg-transparent text-foreground text-xs focus:outline-hidden ${
                                    isNumeric ? 'text-right font-mono' : 'text-left'
                                  }`}
                                />
                                {isSelected && (
                                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-emerald-600 rounded-2xs pointer-events-none" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Authentic Excel Worksheet Tabs & Status Bar */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {workbook.sheetNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setActiveSheetName(name);
                        setSelectedColIdx(0);
                        setSelectedCell({ rIdx: 0, cIdx: 0 });
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all border ${
                        activeSheetName === name
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                          : 'bg-background text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                  <button
                    onClick={handleAddSheet}
                    className="p-1 rounded-lg border border-dashed border-border hover:border-emerald-500 text-muted-foreground hover:text-emerald-500 text-xs flex items-center gap-1 px-2"
                  >
                    <HiPlus className="w-3 h-3" /> New Sheet
                  </button>
                </div>

                {/* Bottom Excel Telemetry Status */}
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">READY</span>
                  {selectedCell && (
                    <span className="text-muted-foreground">
                      Pos: <strong className="text-foreground">{getExcelColumnLetter(selectedCell.cIdx)}{selectedCell.rIdx + 1}</strong>
                    </span>
                  )}
                  {excelColStats && (
                    <div className="hidden sm:flex items-center gap-3 text-xs">
                      <span>Count: <strong>{excelColStats.count}</strong></span>
                      <span>Avg: <strong>{excelColStats.mean}</strong></span>
                      <span>Sum: <strong className="text-emerald-600 dark:text-emerald-400">{excelColStats.sum}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. WORD DOCUMENT WORKBENCH (ORIGINAL PAPER VIEW)         */}
      {/* ======================================================== */}
      {activeTab === 'word' && (
        <div className="flex flex-col flex-1 min-h-0">
          {!wordDoc ? (
            <div className="max-w-2xl mx-auto w-full py-8">
              <DropzoneZone
                onFilesSelected={handleUploadWord}
                accept=".docx,.doc"
                title="Drop a Word (.docx) document here"
                description="Renders high-fidelity Word document layout with authentic pagination, tables, and images"
                allowedFormatsText="DOCX, DOC"
              />
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 gap-3">
              {/* Word Header Telemetry & Mode Switch */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-border">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border text-xs">
                    <HiPencil className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <input
                      type="text"
                      value={wordFileName}
                      onChange={(e) => setWordFileName(e.target.value)}
                      placeholder="Document name"
                      className="bg-transparent font-bold text-foreground focus:outline-hidden text-xs w-36 sm:w-48"
                      title="Rename Word Document"
                    />
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
                      .doc
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground hidden sm:block">
                    {wordDoc.wordCount.toLocaleString()} words • ~{wordDoc.readingTimeMinutes} min read
                  </p>
                </div>

                {/* View Mode Toggle & Actions */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center p-1 rounded-lg bg-muted/60 border border-border text-xs font-semibold">
                    <button
                      onClick={() => setWordViewMode('preview')}
                      className={`px-3 py-1 rounded-md transition-all ${
                        wordViewMode === 'preview'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      📄 Document View
                    </button>
                    <button
                      onClick={() => setWordViewMode('editor')}
                      className={`px-3 py-1 rounded-md transition-all ${
                        wordViewMode === 'editor'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      ✏️ Rich Editor
                    </button>
                  </div>

                  {wordViewMode === 'preview' && (
                    <div className="hidden sm:flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setDocZoom((z) => Math.max(0.7, z - 0.1))}>
                        <HiZoomOut className="w-3.5 h-3.5" />
                      </Button>
                      <span className="text-[10px] font-mono font-bold px-1">{Math.round(docZoom * 100)}%</span>
                      <Button variant="ghost" size="sm" onClick={() => setDocZoom((z) => Math.min(1.5, z + 0.1))}>
                        <HiZoomIn className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}

                  <Button variant="outline" size="sm" onClick={exportWordDoc}>
                    <HiDownload className="w-3.5 h-3.5 mr-1 text-blue-600" /> Export Word
                  </Button>

                  {onSendToNotes && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const clean = (wordFileName.trim() || wordDoc.fileName.replace(/\.[^/.]+$/, '')).replace(/\.doc$/i, '');
                        onSendToNotes(editorHtml, `${clean}.doc`);
                        toast.success('Document copied to Notes!');
                      }}
                    >
                      <HiClipboardCopy className="w-3.5 h-3.5 mr-1 text-primary" /> To Notes
                    </Button>
                  )}
                </div>
              </div>

              {/* Mode A: High-Fidelity Paper Document View (the way it is) */}
              {wordViewMode === 'preview' ? (
                <div className="flex-1 min-h-[400px] overflow-auto rounded-2xl border border-border bg-neutral-100 dark:bg-neutral-900/70 p-4 sm:p-8 flex justify-center relative shadow-inner">
                  {isRenderingDocx && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-foreground">Rendering original Word pages...</span>
                      </div>
                    </div>
                  )}

                  <div
                    style={{ transform: `scale(${docZoom})`, transformOrigin: 'top center' }}
                    className="transition-transform duration-150 max-w-4xl w-full flex flex-col items-center"
                  >
                    <div
                      ref={docxContainerRef}
                      className="docx-render-host w-full [&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-0 [&_.docx-wrapper]:flex [&_.docx-wrapper]:flex-col [&_.docx-wrapper]:items-center [&_.docx]:bg-white [&_.docx]:text-neutral-900 [&_.docx]:shadow-xl [&_.docx]:rounded-xs [&_.docx]:mb-8"
                    />
                  </div>
                </div>
              ) : (
                /* Mode B: Rich-Text Editor */
                <div className="flex-1 min-h-[350px] flex flex-col bg-surface rounded-xl border border-border overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={editorHtml}
                    onChange={setEditorHtml}
                    className="flex-1 flex flex-col h-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. POWERPOINT SLIDE DECK WORKBENCH (16:9 WIDESCREEN)     */}
      {/* ======================================================== */}
      {activeTab === 'pptx' && (
        <div className="flex flex-col flex-1 min-h-0">
          {!pptxDeck ? (
            <div className="max-w-2xl mx-auto w-full py-8">
              <DropzoneZone
                onFilesSelected={handleUploadPptx}
                accept=".pptx,.ppt"
                title="Drop a PowerPoint (.pptx) presentation here"
                description="Renders authentic 16:9 widescreen presentation slides with diagrams, figures, and professor notes"
                allowedFormatsText="PPTX, PPT"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
              {/* Main Slide Viewer — Authentic 16:9 Stage */}
              <div className="lg:col-span-8 flex flex-col min-h-0 bg-surface/40 rounded-2xl border border-border p-4">
                {/* Slide Stage Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Slide {activeSlideIdx + 1} of {pptxDeck.totalSlides}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate max-w-xs">
                      ({pptxDeck.fileName})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
                      disabled={activeSlideIdx === 0}
                    >
                      <HiArrowLeft className="w-3.5 h-3.5 mr-1" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveSlideIdx((i) => Math.min(pptxDeck.totalSlides - 1, i + 1))}
                      disabled={activeSlideIdx === pptxDeck.totalSlides - 1}
                    >
                      Next <HiArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsFullScreen(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      title="Present Full Screen"
                    >
                      <HiArrowsExpand className="w-3.5 h-3.5 mr-1" /> Full Screen
                    </Button>
                  </div>
                </div>

                {/* 16:9 Authentic Presentation Slide Canvas ("Render As It Is") */}
                {pptxDeck.slides[activeSlideIdx] && (
                  <div className="flex-1 flex flex-col justify-center items-center p-2 min-h-0 overflow-y-auto">
                    <div className="aspect-video w-full max-w-3xl bg-neutral-950 rounded-2xl shadow-2xl border border-neutral-700/80 p-2 flex items-center justify-center relative overflow-hidden">
                      {isRenderingPptx && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-900/85 backdrop-blur-xs">
                          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                          <p className="text-xs text-orange-300 font-medium">Rendering Authentic Slide...</p>
                        </div>
                      )}
                      <div
                        ref={pptxContainerRef}
                        className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-white"
                      />
                    </div>

                    {/* Teacher Speaker Notes Drawer */}
                    {pptxDeck.slides[activeSlideIdx].speakerNotes && (
                      <div className="w-full max-w-3xl mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                        <span className="font-bold text-amber-500 dark:text-amber-300 flex items-center gap-1 mb-0.5">
                          <HiLightBulb className="w-3.5 h-3.5" /> Professor / Speaker Notes:
                        </span>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {pptxDeck.slides[activeSlideIdx].speakerNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Slide Thumbnail Matrix & Actions */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <Card className="p-4 bg-orange-500/5 border-orange-500/20 space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-foreground mb-1">Export Slide Handout</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Compiles all {pptxDeck.totalSlides} slides and professor speaker notes into a printable landscape PDF.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs">
                    <HiPencil className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <input
                      type="text"
                      value={pptxFileName}
                      onChange={(e) => setPptxFileName(e.target.value)}
                      placeholder="Handout name"
                      className="bg-transparent font-semibold text-foreground focus:outline-hidden text-xs flex-1"
                      title="Rename handout PDF"
                    />
                    <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded font-mono">
                      .pdf
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full justify-center bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => exportPptxPdf('download')}
                    disabled={isProcessing}
                  >
                    <HiDownload className="w-4 h-4 mr-1.5" /> Download 1:1 PDF Handout
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-center border-orange-500/30 text-foreground hover:bg-orange-500/10 text-xs"
                    onClick={exportPptxImages}
                    disabled={isProcessing}
                  >
                    <HiPhotograph className="w-4 h-4 mr-1.5 text-orange-500" /> Export Slide Images (PNG)
                  </Button>
                </Card>

                {/* Thumbnails Grid */}
                <Card className="p-3 flex-1 flex flex-col min-h-0">
                  <h4 className="text-xs font-bold text-foreground mb-2">Slide Navigator</h4>
                  <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[40vh] p-1">
                    {pptxDeck.slides.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlideIdx(idx)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          idx === activeSlideIdx
                            ? 'border-orange-500 bg-orange-500/10 shadow-2xs'
                            : 'border-border bg-surface hover:bg-muted/50'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Slide {s.slideNumber}
                        </span>
                        <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight">
                          {s.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. FULL SCREEN PRESENTER MODAL (FIXED NON-CLIPPING BARS)  */}
      {/* ======================================================== */}
      {isFullScreen && pptxDeck && (
        <div className="fixed inset-0 z-50 bg-neutral-950 text-white flex flex-col h-screen w-screen overflow-hidden select-none">
          {/* Fixed Top Bar (Always Visible) */}
          <div className="shrink-0 h-14 px-6 flex items-center justify-between border-b border-white/10 bg-neutral-900/90 backdrop-blur-md z-20">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-orange-400 bg-orange-500/15 px-2.5 py-1 rounded-full border border-orange-500/30">
                Presenter Mode
              </span>
              <span className="text-xs text-white/70 font-semibold truncate max-w-sm">
                {pptxDeck.slides[activeSlideIdx].title}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullScreen(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <HiX className="w-4 h-4 mr-1" /> Exit (Esc)
            </Button>
          </div>

          {/* Middle 16:9 Slide Stage */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden relative">
            <div className="aspect-video max-h-[calc(100vh-140px)] max-w-5xl w-full bg-neutral-950 border border-white/15 rounded-2xl shadow-2xl p-2 flex items-center justify-center overflow-hidden relative">
              {isRenderingPptx && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-900/85 backdrop-blur-xs">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-orange-300 font-medium">Rendering Full Screen Slide...</p>
                </div>
              )}
              <div
                ref={fullScreenPptxRef}
                className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-white"
              />
            </div>
          </div>

          {/* Fixed Bottom Controls Bar (NEVER Clipped) */}
          <div className="shrink-0 h-16 px-6 flex items-center justify-between border-t border-white/10 bg-neutral-900/95 backdrop-blur-md z-20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
              disabled={activeSlideIdx === 0}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <HiArrowLeft className="w-4 h-4 mr-1.5" /> Previous
            </Button>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-white/80">
                Slide {activeSlideIdx + 1} / {pptxDeck.totalSlides}
              </span>
              <div className="hidden sm:flex items-center gap-1">
                {pptxDeck.slides.slice(0, 20).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlideIdx(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === activeSlideIdx ? 'bg-orange-400 w-4' : 'bg-white/20 hover:bg-white/40'
                    }`}
                    title={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSlideIdx((i) => Math.min(pptxDeck.totalSlides - 1, i + 1))}
              disabled={activeSlideIdx === pptxDeck.totalSlides - 1}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Next <HiArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
