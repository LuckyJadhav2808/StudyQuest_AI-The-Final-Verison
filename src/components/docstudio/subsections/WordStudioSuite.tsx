'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiDocumentText,
  HiFolderOpen,
  HiDownload,
  HiPrinter,
  HiLightningBolt,
  HiCalculator,
  HiBookmark,
  HiTable,
  HiExclamationCircle,
  HiPhotograph,
  HiRefresh,
  HiCheck,
  HiX,
  HiChevronDown,
  HiChevronUp,
  HiSearch,
  HiZoomIn,
  HiZoomOut,
  HiEye,
  HiCode,
  HiMinus,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { readWordDocument, exportHtmlToDocxBinary, exportHtmlToWordBlob } from '@/lib/docstudio/officeEngine';
import { compileWordHtmlToPdf } from '@/lib/docstudio/wordToPdf';
import { formatBytes } from '@/lib/docstudio/compressor';

// Dynamic import for ReactQuill to prevent SSR window issues
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div className="h-96 flex flex-col items-center justify-center bg-white rounded-lg shadow-sm">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-xs font-semibold text-slate-500">Loading Word Office Engine...</span>
    </div>
  ),
});
import 'react-quill-new/dist/quill.snow.css';

interface WordStudioSuiteProps {
  initialFile?: File | null;
  onSendToNotes?: (contentOrBlob: string | Blob, title: string) => void;
  onSwitchStudio?: (target: 'pdf' | 'word' | 'pptx' | 'xlsx') => void;
}

type RibbonTab = 'home' | 'insert' | 'layout' | 'references' | 'review' | 'view';

const SAMPLE_DOCUMENT_HTML = `
<h1>Deep Learning & Neural Architectures</h1>
<h2>Abstract & Introduction</h2>
<p>Artificial neural networks represent a foundational paradigm in machine learning, modeled loosely after biological neuronal connections in the human brain. This research paper evaluates feedforward multilayer perceptrons (MLPs), convolutional networks, and multi-head attention transformers.</p>

<div style="background-color: #EFF6FF; border-left: 4px solid #2563EB; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
  <strong style="color: #1D4ED8;">💡 Core Definition:</strong>
  <p style="margin: 4px 0 0 0; color: #1E3A8A; font-size: 13px;">A neural network with at least one non-linear hidden layer is a universal approximator (Cybenko, 1989).</p>
</div>

<h3>1. Mathematical Formulations</h3>
<p>The standard backpropagation gradient calculation optimizes parameters through stochastic gradient descent across loss functions:</p>
<p style="text-align: center; font-family: monospace; font-size: 15px; background: #F8FAFC; padding: 10px; border-radius: 6px;">
  L(θ) = - \sum_{i=1}^{N} y_i \log(\hat{y}_i) + \lambda ||θ||^2
</p>

<h3>2. Empirical Benchmark Results</h3>
<table style="width: 100%; border-collapse: collapse; margin: 14px 0;">
  <thead>
    <tr style="background-color: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
      <th style="padding: 8px 12px; text-align: left; font-size: 13px;">Architecture</th>
      <th style="padding: 8px 12px; text-align: left; font-size: 13px;">Parameters (M)</th>
      <th style="padding: 8px 12px; text-align: left; font-size: 13px;">Accuracy (%)</th>
      <th style="padding: 8px 12px; text-align: left; font-size: 13px;">Inference Latency (ms)</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 8px 12px; font-size: 13px;">ResNet-50</td>
      <td style="padding: 8px 12px; font-size: 13px;">25.6</td>
      <td style="padding: 8px 12px; font-size: 13px;">76.1%</td>
      <td style="padding: 8px 12px; font-size: 13px;">12.4 ms</td>
    </tr>
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 8px 12px; font-size: 13px;">ViT-Base/16</td>
      <td style="padding: 8px 12px; font-size: 13px;">86.4</td>
      <td style="padding: 8px 12px; font-size: 13px;">81.8%</td>
      <td style="padding: 8px 12px; font-size: 13px;">24.8 ms</td>
    </tr>
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 8px 12px; font-size: 13px;">ConvNeXt-T</td>
      <td style="padding: 8px 12px; font-size: 13px;">28.5</td>
      <td style="padding: 8px 12px; font-size: 13px;">82.1%</td>
      <td style="padding: 8px 12px; font-size: 13px;">13.1 ms</td>
    </tr>
  </tbody>
</table>

<p><em>References: Vaswani et al. (2017). Attention is All You Need. NeurIPS.</em></p>
`;

export default function WordStudioSuite({
  initialFile,
  onSendToNotes,
  onSwitchStudio,
}: WordStudioSuiteProps) {
  // Document state
  const [docName, setDocName] = useState<string>('Document 1.docx');
  const [contentHtml, setContentHtml] = useState<string>(SAMPLE_DOCUMENT_HTML);
  const [savedStatus, setSavedStatus] = useState<'saved' | 'saving'>('saved');
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [zoom, setZoom] = useState<number>(100);
  const [viewMode, setViewMode] = useState<'print' | 'web'>('print');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margins, setMargins] = useState<'normal' | 'narrow' | 'wide'>('normal');
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Keyboard shortcut: Ctrl+F1 or Cmd+F1 to toggle ribbon tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'F1' || e.key === 'f1')) {
        e.preventDefault();
        setIsRibbonCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTabClick = (tab: RibbonTab) => {
    if (activeTab === tab) {
      setIsRibbonCollapsed((prev) => !prev);
    } else {
      setActiveTab(tab);
      setIsRibbonCollapsed(false);
    }
  };

  // Modals & Academic Tools State
  const [activeModal, setActiveModal] = useState<null | 'math' | 'citation' | 'table' | 'callout' | 'compress'>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Tool 1: Math KaTeX modal
  const [mathInput, setMathInput] = useState<string>('\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}');
  const [mathPreview, setMathPreview] = useState<string>('');

  // Tool 2: Citation modal
  const [citationAuthor, setCitationAuthor] = useState<string>('Turing, A. M.');
  const [citationYear, setCitationYear] = useState<string>('1936');
  const [citationTitle, setCitationTitle] = useState<string>('On Computable Numbers, with an Application to the Entscheidungsproblem');
  const [citationJournal, setCitationJournal] = useState<string>('Proceedings of the London Mathematical Society');
  const [citationStyle, setCitationStyle] = useState<'APA' | 'MLA' | 'IEEE'>('APA');

  // Tool 3: Table Builder
  const [tableRows, setTableRows] = useState<number>(3);
  const [tableCols, setTableCols] = useState<number>(3);
  const [tableHasHeader, setTableHasHeader] = useState<boolean>(true);

  // Tool 4: Callout Alert Box
  const [calloutType, setCalloutType] = useState<'note' | 'warning' | 'definition' | 'theorem'>('note');
  const [calloutTitle, setCalloutTitle] = useState<string>('Key Takeaway');
  const [calloutText, setCalloutText] = useState<string>('Important concept for the upcoming examination.');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Load initial file if provided
  useEffect(() => {
    if (initialFile) {
      handleOpenDocx(initialFile);
    }
  }, [initialFile]);

  // Compute live reading telemetry
  const telemetry = useMemo(() => {
    if (typeof document === 'undefined') {
      return { words: 0, characters: 0, readingMinutes: 1, totalPages: 1 };
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentHtml;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const characterCount = text.length;
    const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));
    const totalPages = Math.max(1, Math.ceil(wordCount / 350));

    return {
      words: wordCount,
      characters: characterCount,
      readingMinutes,
      totalPages,
    };
  }, [contentHtml]);

  // Render KaTeX preview live
  useEffect(() => {
    if (mathInput.trim()) {
      try {
        const rendered = katex.renderToString(mathInput, {
          displayMode: true,
          throwOnError: false,
        });
        setMathPreview(rendered);
      } catch (err) {
        setMathPreview('<span style="color:red">Syntax error in LaTeX equation</span>');
      }
    } else {
      setMathPreview('');
    }
  }, [mathInput]);

  // Autosave simulation
  useEffect(() => {
    setSavedStatus('saving');
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('studyquest_word_draft', contentHtml);
        localStorage.setItem('studyquest_word_name', docName);
      } catch (e) {}
      setSavedStatus('saved');
    }, 600);

    return () => clearTimeout(timer);
  }, [contentHtml, docName]);

  // Open & Parse native DOCX
  const handleOpenDocx = async (file: File) => {
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = await readWordDocument(buffer, file.name);
      setContentHtml(result.htmlContent);
      setDocName(file.name);
      toast.success(`Opened "${file.name}" (${result.wordCount} words)`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse .docx file. The document may be encrypted.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export to Native Binary DOCX
  const handleExportDocx = async () => {
    setIsProcessing(true);
    try {
      const blob = await exportHtmlToDocxBinary(contentHtml, docName);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = docName.endsWith('.docx') ? docName : `${docName}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded Microsoft Word (.docx) document!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export DOCX. Falling back to .doc format.');
      const fallbackBlob = exportHtmlToWordBlob(contentHtml, docName);
      const url = URL.createObjectURL(fallbackBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docName.replace(/\.[^/.]+$/, '')}.doc`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export directly to pure academic PDF (Vector / High-DPI A4)
  const handleDirectExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    const toastId = toast.loading('Compiling academic PDF...');
    try {
      const pdfBlob = await compileWordHtmlToPdf(contentHtml, docName, {
        pageSize,
        orientation: pageOrientation,
        margins,
        includeHeaderFooter: true,
      });

      const cleanDocName = docName.replace(/\.docx?$/i, '');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cleanDocName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded "${cleanDocName}.pdf"! 📜`, { id: toastId });
    } catch (err) {
      console.error('[WordStudio] Direct PDF export failed:', err);
      toast.error('Failed to generate PDF. You can also try Print to PDF.', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // System Print Dialog (styled via @media print)
  const handlePrintPdf = () => {
    toast('Opening clean print preview...', { icon: '🖨️' });
    window.print();
  };

  // Insert Rich Snippet into Quill Editor
  const insertHtmlIntoEditor = (htmlSnippet: string) => {
    if (typeof document === 'undefined') {
      setContentHtml((prev) => prev + htmlSnippet);
      return;
    }
    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        document.execCommand('insertHTML', false, htmlSnippet);
      } else {
        const qlEditor = document.querySelector('.word-quill-stage .ql-editor');
        if (qlEditor) {
          qlEditor.innerHTML += htmlSnippet;
          setContentHtml(qlEditor.innerHTML);
        } else {
          setContentHtml((prev) => prev + htmlSnippet);
        }
      }
    } catch (err) {
      setContentHtml((prev) => prev + htmlSnippet);
    }
  };

  // Insert KaTeX formula
  const handleInsertMath = () => {
    if (!mathInput.trim()) return;
    const mathBlockHtml = `
      <div class="katex-equation-block" style="text-align: center; margin: 16px 0; padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
        ${mathPreview}
      </div>
    `;
    insertHtmlIntoEditor(mathBlockHtml);
    setActiveModal(null);
    toast.success('Inserted equation into document');
  };

  // Insert Academic Citation
  const handleInsertCitation = (type: 'in-text' | 'bibliography') => {
    let snippet = '';

    if (citationStyle === 'APA') {
      const authorLastName = citationAuthor.split(',')[0].trim() || citationAuthor;
      if (type === 'in-text') {
        snippet = ` <em>(${authorLastName}, ${citationYear})</em> `;
      } else {
        snippet = `
          <p style="padding-left: 24px; text-indent: -24px; margin: 6px 0;">
            ${citationAuthor} (${citationYear}). <em>${citationTitle}</em>. ${citationJournal}.
          </p>
        `;
      }
    } else if (citationStyle === 'MLA') {
      const authorLastName = citationAuthor.split(',')[0].trim() || citationAuthor;
      if (type === 'in-text') {
        snippet = ` <em>(${authorLastName})</em> `;
      } else {
        snippet = `
          <p style="padding-left: 24px; text-indent: -24px; margin: 6px 0;">
            ${citationAuthor}. "${citationTitle}." <em>${citationJournal}</em>, ${citationYear}.
          </p>
        `;
      }
    } else {
      // IEEE
      if (type === 'in-text') {
        snippet = ` <strong>[1]</strong> `;
      } else {
        snippet = `
          <p style="margin: 6px 0;">
            [1] ${citationAuthor}, "${citationTitle}," <em>${citationJournal}</em>, ${citationYear}.
          </p>
        `;
      }
    }

    insertHtmlIntoEditor(snippet);
    setActiveModal(null);
    toast.success(`Inserted ${type === 'in-text' ? 'in-text citation' : 'bibliography entry'}`);
  };

  // Insert Table
  const handleInsertTable = () => {
    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 14px 0; border: 1px solid #CBD5E1;">`;

    if (tableHasHeader) {
      tableHtml += `<thead><tr style="background-color: #F1F5F9; border-bottom: 2px solid #94A3B8;">`;
      for (let c = 0; c < tableCols; c++) {
        tableHtml += `<th style="border: 1px solid #CBD5E1; padding: 8px 12px; text-align: left; font-size: 13px;">Header ${c + 1}</th>`;
      }
      tableHtml += `</tr></thead>`;
    }

    tableHtml += `<tbody>`;
    for (let r = 0; r < tableRows; r++) {
      tableHtml += `<tr style="border-bottom: 1px solid #E2E8F0;">`;
      for (let c = 0; c < tableCols; c++) {
        tableHtml += `<td style="border: 1px solid #CBD5E1; padding: 8px 12px; font-size: 13px;">Cell ${r + 1},${c + 1}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br></p>`;

    insertHtmlIntoEditor(tableHtml);
    setActiveModal(null);
    toast.success(`Inserted ${tableRows}×${tableCols} table`);
  };

  // Insert Callout Alert Box
  const handleInsertCallout = () => {
    let bgColor = '#EFF6FF';
    let borderColor = '#2563EB';
    let textColor = '#1E3A8A';
    let icon = '💡';

    if (calloutType === 'warning') {
      bgColor = '#FFFBEB';
      borderColor = '#D97706';
      textColor = '#92400E';
      icon = '⚠️';
    } else if (calloutType === 'definition') {
      bgColor = '#ECFDF5';
      borderColor = '#059669';
      textColor = '#065F46';
      icon = '📖';
    } else if (calloutType === 'theorem') {
      bgColor = '#FAF5FF';
      borderColor = '#9333EA';
      textColor = '#6B21A8';
      icon = '📐';
    }

    const calloutHtml = `
      <div style="background-color: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
        <strong style="color: ${borderColor};">${icon} ${calloutTitle}:</strong>
        <p style="margin: 4px 0 0 0; color: ${textColor}; font-size: 13px;">${calloutText}</p>
      </div>
      <p><br></p>
    `;

    insertHtmlIntoEditor(calloutHtml);
    setActiveModal(null);
    toast.success('Inserted callout alert box');
  };

  // Compress Document Markup & Embedded Images
  const handleCompressDocument = () => {
    const originalBytes = new Blob([contentHtml]).size;
    let compressed = contentHtml;

    // Clean redundant spacing inside tags
    compressed = compressed.replace(/>\s+</g, '><');

    const newBytes = new Blob([compressed]).size;
    const savings = Math.max(0, originalBytes - newBytes);

    setContentHtml(compressed);
    setActiveModal(null);
    toast.success(`Optimized document markup! Saved ${formatBytes(savings)}`);
  };

  // Direct formatting helpers
  const applyFormat = (formatName: string, value?: any) => {
    if (typeof document === 'undefined') return;
    try {
      if (formatName === 'bold') document.execCommand('bold', false);
      else if (formatName === 'italic') document.execCommand('italic', false);
      else if (formatName === 'underline') document.execCommand('underline', false);
      else if (formatName === 'strike') document.execCommand('strikeThrough', false);
      else if (formatName === 'align') {
        if (value === 'center') document.execCommand('justifyCenter', false);
        else if (value === 'right') document.execCommand('justifyRight', false);
        else if (value === 'justify') document.execCommand('justifyFull', false);
        else document.execCommand('justifyLeft', false);
      } else if (formatName === 'list') {
        if (value === 'bullet') document.execCommand('insertUnorderedList', false);
        else if (value === 'ordered') document.execCommand('insertOrderedList', false);
      } else if (formatName === 'header') {
        if (value === 1) document.execCommand('formatBlock', false, '<h1>');
        else if (value === 2) document.execCommand('formatBlock', false, '<h2>');
        else if (value === 3) document.execCommand('formatBlock', false, '<h3>');
        else document.execCommand('formatBlock', false, '<p>');
      } else if (formatName === 'font') {
        document.execCommand('fontName', false, value);
      } else if (formatName === 'size') {
        document.execCommand('fontSize', false, value);
      }
    } catch (e) {
      console.warn('Formatting execution skipped:', e);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans select-none">
      {/* Hidden DOCX File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.doc,.txt,.rtf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleOpenDocx(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {/* -------------------------------------------------------------
          1. MICROSOFT WORD TITLE BAR
      -------------------------------------------------------------- */}
      <div className="flex-shrink-0 bg-blue-700 dark:bg-blue-900 text-white px-3 py-1.5 flex items-center justify-between text-xs border-b border-blue-800 z-30 shadow-xs word-title-bar">
        {/* Left: Quick Access Toolbar & Title */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Quick Suite Switcher (Failsafe) */}
          {onSwitchStudio && (
            <div className="flex items-center bg-blue-900/80 p-0.5 rounded border border-blue-600/50 mr-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onSwitchStudio('pdf')}
                className="px-1 py-0.5 rounded text-[10px] hover:bg-blue-600/80 transition-colors"
                title="Switch to PDF Studio"
              >
                📕
              </button>
              <button
                type="button"
                onClick={() => onSwitchStudio('word')}
                className="px-1 py-0.5 rounded text-[10px] bg-blue-600 font-bold shadow-2xs"
                title="Word Office (Active)"
              >
                📝
              </button>
              <button
                type="button"
                onClick={() => onSwitchStudio('pptx')}
                className="px-1 py-0.5 rounded text-[10px] hover:bg-blue-600/80 transition-colors"
                title="Switch to PowerPoint Presentation Suite"
              >
                📊
              </button>
              <button
                type="button"
                onClick={() => onSwitchStudio('xlsx')}
                className="px-1 py-0.5 rounded text-[10px] hover:bg-blue-600/80 transition-colors"
                title="Switch to Excel Spreadsheet Suite"
              >
                📈
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-800/80 font-bold">
            <span className="text-base">📝</span>
            <span className="font-heading tracking-wider hidden sm:inline">WORD</span>
          </div>

          {/* Quick Access Icons */}
          <button
            onClick={handleExportDocx}
            className="p-1 rounded hover:bg-blue-600/80 text-white/90 hover:text-white transition-colors"
            title="Save Document (.docx)"
          >
            <HiDownload size={14} />
          </button>
          <button
            onClick={handleDirectExportPdf}
            disabled={isExportingPdf}
            className="p-1 rounded hover:bg-blue-600/80 text-white/90 hover:text-white transition-colors disabled:opacity-50"
            title="Export Clean Academic PDF (.pdf)"
          >
            {isExportingPdf ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              <HiDocumentText size={14} />
            )}
          </button>
          <button
            onClick={handlePrintPdf}
            className="p-1 rounded hover:bg-blue-600/80 text-white/90 hover:text-white transition-colors"
            title="Print Document (Ctrl+P)"
          >
            <HiPrinter size={14} />
          </button>

          <div className="h-3 w-[1px] bg-blue-500/50 mx-1" />

          {/* Editable Document Title */}
          <input
            type="text"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            className="bg-transparent hover:bg-blue-800/60 focus:bg-blue-800 px-2 py-0.5 rounded font-bold text-white text-xs outline-none border border-transparent focus:border-blue-400 transition-colors truncate max-w-[180px] sm:max-w-[280px]"
            title="Click to rename document"
          />

          <span className="text-[10px] text-blue-200/80 font-medium hidden md:inline">
            • {savedStatus === 'saving' ? 'Saving...' : 'Saved to LocalStorage'}
          </span>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-xs"
          >
            <HiFolderOpen size={13} />
            <span className="hidden sm:inline">Open .docx</span>
          </button>

          <button
            onClick={handleExportDocx}
            className="px-2.5 py-1 rounded bg-white text-blue-700 hover:bg-blue-50 font-bold text-[11px] transition-colors flex items-center gap-1 shadow-xs"
          >
            <HiDownload size={13} />
            <span>Export DOCX</span>
          </button>

          <button
            onClick={handleDirectExportPdf}
            disabled={isExportingPdf}
            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
            title="Download formatted academic PDF"
          >
            {isExportingPdf ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <HiDocumentText size={13} />
            )}
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. MICROSOFT WORD RIBBON TABS (Home, Insert, Layout, Ref, View)
      -------------------------------------------------------------- */}
      <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-900 border-b border-[var(--card-border)] px-3 pt-1 z-20 word-ribbon-bar">
        {/* Ribbon Tab Header Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold py-0.5 min-w-0">
          <button
            onClick={() => handleTabClick('home')}
            className={`px-3 py-1.5 rounded-t-lg transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'home'
                ? 'bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 border-blue-600 font-bold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-transparent'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => handleTabClick('insert')}
            className={`px-3 py-1.5 rounded-t-lg transition-colors border-b-2 flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'insert'
                ? 'bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 border-blue-600 font-bold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-transparent'
            }`}
          >
            <span>Insert</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </button>

          <button
            onClick={() => handleTabClick('layout')}
            className={`px-3 py-1.5 rounded-t-lg transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'layout'
                ? 'bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 border-blue-600 font-bold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-transparent'
            }`}
          >
            Layout & Margins
          </button>

          <button
            onClick={() => handleTabClick('references')}
            className={`px-3 py-1.5 rounded-t-lg transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'references'
                ? 'bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 border-blue-600 font-bold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-transparent'
            }`}
          >
            References & Citations
          </button>

          <button
            onClick={() => handleTabClick('review')}
            className={`px-3 py-1.5 rounded-t-lg transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'review'
                ? 'bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 border-blue-600 font-bold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-transparent'
            }`}
          >
            Review & Tools
          </button>

          {/* Collapse/Expand Ribbon Button */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto pl-2">
            <button
              onClick={() => setIsRibbonCollapsed((c) => !c)}
              className="p-1 sm:px-2 py-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/50 transition-colors flex items-center gap-1 text-[11px] font-medium"
              title={isRibbonCollapsed ? "Show Tools Ribbon (Ctrl+F1)" : "Hide Tools Ribbon (Ctrl+F1)"}
            >
              <span className="hidden md:inline">{isRibbonCollapsed ? 'Show Tools' : 'Hide Tools'}</span>
              {isRibbonCollapsed ? <HiChevronDown size={14} /> : <HiChevronUp size={14} />}
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------------
            RIBBON TOOLBAR PANELS (Context-Sensitive)
        -------------------------------------------------------------- */}
        <AnimatePresence initial={false}>
          {!isRibbonCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="py-2 px-2 bg-[var(--card-bg)] border-t border-[var(--card-border)] rounded-b-xl flex items-center gap-3 overflow-x-auto text-xs min-h-[52px]">
          {/* TAB 1: HOME RIBBON */}
          {activeTab === 'home' && (
            <div className="flex items-center gap-3">
              {/* Group: Font & Style */}
              <div className="flex items-center gap-1.5 pr-3 border-r border-[var(--card-border)]">
                <select
                  onChange={(e) => applyFormat('font', e.target.value)}
                  className="px-2 py-1 bg-[var(--background)] border border-[var(--card-border)] rounded-md text-xs font-medium outline-none"
                  defaultValue="sans-serif"
                >
                  <option value="sans-serif">Calibri / Sans</option>
                  <option value="serif">Times New Roman</option>
                  <option value="monospace">JetBrains Mono</option>
                </select>

                <select
                  onChange={(e) => applyFormat('size', e.target.value)}
                  className="px-1.5 py-1 bg-[var(--background)] border border-[var(--card-border)] rounded-md text-xs font-mono outline-none w-14"
                  defaultValue="14px"
                >
                  <option value="12px">10</option>
                  <option value="13px">11</option>
                  <option value="14px">12</option>
                  <option value="16px">14</option>
                  <option value="18px">16</option>
                  <option value="22px">18</option>
                  <option value="28px">24</option>
                </select>

                <button
                  onClick={() => applyFormat('bold', true)}
                  className="p-1.5 rounded hover:bg-[var(--background)] border border-transparent hover:border-[var(--card-border)] font-bold text-xs"
                  title="Bold (Ctrl+B)"
                >
                  B
                </button>
                <button
                  onClick={() => applyFormat('italic', true)}
                  className="p-1.5 rounded hover:bg-[var(--background)] border border-transparent hover:border-[var(--card-border)] italic text-xs"
                  title="Italic (Ctrl+I)"
                >
                  I
                </button>
                <button
                  onClick={() => applyFormat('underline', true)}
                  className="p-1.5 rounded hover:bg-[var(--background)] border border-transparent hover:border-[var(--card-border)] underline text-xs"
                  title="Underline (Ctrl+U)"
                >
                  U
                </button>
                <button
                  onClick={() => applyFormat('strike', true)}
                  className="p-1.5 rounded hover:bg-[var(--background)] border border-transparent hover:border-[var(--card-border)] line-through text-xs"
                  title="Strikethrough"
                >
                  S
                </button>
              </div>

              {/* Group: Paragraph & Alignment */}
              <div className="flex items-center gap-1 pr-3 border-r border-[var(--card-border)]">
                <button
                  onClick={() => applyFormat('align', '')}
                  className="px-2 py-1 rounded hover:bg-[var(--background)] text-xs font-medium"
                  title="Align Left"
                >
                  Left
                </button>
                <button
                  onClick={() => applyFormat('align', 'center')}
                  className="px-2 py-1 rounded hover:bg-[var(--background)] text-xs font-medium"
                  title="Align Center"
                >
                  Center
                </button>
                <button
                  onClick={() => applyFormat('align', 'right')}
                  className="px-2 py-1 rounded hover:bg-[var(--background)] text-xs font-medium"
                  title="Align Right"
                >
                  Right
                </button>
                <button
                  onClick={() => applyFormat('align', 'justify')}
                  className="px-2 py-1 rounded hover:bg-[var(--background)] text-xs font-medium"
                  title="Justify"
                >
                  Justify
                </button>

                <div className="h-4 w-[1px] bg-[var(--card-border)] mx-1" />

                <button
                  onClick={() => applyFormat('list', 'bullet')}
                  className="p-1.5 rounded hover:bg-[var(--background)] text-xs"
                  title="Bullet List"
                >
                  • List
                </button>
                <button
                  onClick={() => applyFormat('list', 'ordered')}
                  className="p-1.5 rounded hover:bg-[var(--background)] text-xs font-mono"
                  title="Numbered List"
                >
                  1. List
                </button>
              </div>

              {/* Group: Headings & Styles */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => applyFormat('header', false)}
                  className="px-2 py-1 rounded hover:bg-blue-500/10 hover:text-blue-600 text-xs font-medium"
                >
                  Normal
                </button>
                <button
                  onClick={() => applyFormat('header', 1)}
                  className="px-2 py-1 rounded hover:bg-blue-500/10 hover:text-blue-600 text-xs font-bold"
                >
                  Heading 1
                </button>
                <button
                  onClick={() => applyFormat('header', 2)}
                  className="px-2 py-1 rounded hover:bg-blue-500/10 hover:text-blue-600 text-xs font-bold"
                >
                  Heading 2
                </button>
                <button
                  onClick={() => applyFormat('header', 3)}
                  className="px-2 py-1 rounded hover:bg-blue-500/10 hover:text-blue-600 text-xs font-bold"
                >
                  Heading 3
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: INSERT RIBBON (STUDENT ACADEMIC TOOLS) */}
          {activeTab === 'insert' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModal('math')}
                className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5 transition-colors"
                title="Insert LaTeX mathematical equation"
              >
                <HiCalculator size={15} />
                <span>KaTeX Equation</span>
              </button>

              <button
                onClick={() => setActiveModal('citation')}
                className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1.5 transition-colors"
                title="Generate and insert APA/MLA/IEEE academic citation"
              >
                <HiBookmark size={15} />
                <span>Citation Generator</span>
              </button>

              <button
                onClick={() => setActiveModal('table')}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 transition-colors"
                title="Insert data table"
              >
                <HiTable size={15} />
                <span>Insert Table</span>
              </button>

              <button
                onClick={() => setActiveModal('callout')}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5 transition-colors"
                title="Insert callout or exam alert block"
              >
                <HiExclamationCircle size={15} />
                <span>Callout Box</span>
              </button>

              <div className="h-4 w-[1px] bg-[var(--card-border)] mx-1" />

              <button
                onClick={() => insertHtmlIntoEditor('<hr style="margin: 20px 0; border: none; border-top: 2px dashed #CBD5E1;" /><p><br></p>')}
                className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--card-border)]/40 font-medium text-xs flex items-center gap-1"
                title="Insert Horizontal Divider"
              >
                <HiMinus size={14} /> Divider
              </button>
            </div>
          )}

          {/* TAB 3: LAYOUT & MARGINS */}
          {activeTab === 'layout' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 pr-3 border-r border-[var(--card-border)]">
                <span className="text-xs text-[var(--muted-foreground)] font-semibold">Orientation:</span>
                <button
                  onClick={() => setPageOrientation('portrait')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                    pageOrientation === 'portrait' ? 'bg-blue-600 text-white' : 'hover:bg-[var(--card-border)]/50'
                  }`}
                >
                  Portrait (A4)
                </button>
                <button
                  onClick={() => setPageOrientation('landscape')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                    pageOrientation === 'landscape' ? 'bg-blue-600 text-white' : 'hover:bg-[var(--card-border)]/50'
                  }`}
                >
                  Landscape
                </button>
              </div>

              <div className="flex items-center gap-2 pr-3 border-r border-[var(--card-border)]">
                <span className="text-xs text-[var(--muted-foreground)] font-semibold">Margins:</span>
                <button
                  onClick={() => setMargins('normal')}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    margins === 'normal' ? 'bg-blue-500/20 text-blue-600 font-bold' : 'hover:bg-[var(--card-border)]/50'
                  }`}
                >
                  Normal (1 in)
                </button>
                <button
                  onClick={() => setMargins('narrow')}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    margins === 'narrow' ? 'bg-blue-500/20 text-blue-600 font-bold' : 'hover:bg-[var(--card-border)]/50'
                  }`}
                >
                  Narrow (0.5 in)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted-foreground)] font-semibold">Paper Size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="px-2 py-1 bg-[var(--background)] border border-[var(--card-border)] rounded-md text-xs font-semibold"
                >
                  <option value="a4">ISO A4 (210 × 297 mm)</option>
                  <option value="letter">US Letter (8.5 × 11 in)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 4: REFERENCES & CITATIONS */}
          {activeTab === 'references' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModal('citation')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
              >
                <HiBookmark size={15} />
                <span>Add Citation</span>
              </button>

              <button
                onClick={() => {
                  insertHtmlIntoEditor(`
                    <h2 style="margin-top: 32px; border-bottom: 2px solid #CBD5E1; padding-bottom: 6px;">References & Bibliography</h2>
                    <p style="padding-left: 24px; text-indent: -24px; margin: 6px 0;">
                      Cybenko, G. (1989). Approximation by superpositions of a sigmoidal function. <em>Mathematics of Control, Signals and Systems</em>, 2(4), 303–314.
                    </p>
                    <p style="padding-left: 24px; text-indent: -24px; margin: 6px 0;">
                      Vaswani, A., et al. (2017). Attention is all you need. In <em>Advances in Neural Information Processing Systems</em> (pp. 5998–6008).
                    </p>
                  `);
                  toast.success('Inserted References section');
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-border)]/40 text-xs font-semibold"
              >
                Insert Works Cited Block
              </button>
            </div>
          )}

          {/* TAB 5: REVIEW & TOOLS */}
          {activeTab === 'review' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModal('compress')}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5"
              >
                <HiLightningBolt size={15} />
                <span>Compress Document</span>
              </button>

              <button
                onClick={handleExportDocx}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
              >
                <HiDownload size={15} />
                <span>Save to DOCX</span>
              </button>

              <button
                onClick={handleDirectExportPdf}
                disabled={isExportingPdf}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                title="Download formatted academic PDF"
              >
                {isExportingPdf ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiDocumentText size={15} />
                )}
                <span>Export to PDF</span>
              </button>

              <button
                onClick={handlePrintPdf}
                className="px-3 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-border)]/40 font-semibold flex items-center gap-1.5"
                title="Print Document to Printer or System Print Dialog (Ctrl+P)"
              >
                <HiPrinter size={15} />
                <span>Print Document</span>
              </button>
            </div>
          )}
        </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* -------------------------------------------------------------
          3. REALISTIC A4 PAPER WORKSPACE STAGE
      -------------------------------------------------------------- */}
      <div className="flex-1 overflow-auto bg-slate-200/80 dark:bg-slate-950 p-4 md:p-8 flex justify-center relative word-editor-stage">
        {/* Printable/Exportable Paper Container */}
        <div
          ref={printContainerRef}
          id="word-printable-stage"
          style={{
            width: viewMode === 'print' ? (pageOrientation === 'portrait' ? '794px' : '1123px') : '100%',
            minHeight: viewMode === 'print' ? '1123px' : 'auto',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
          className={`bg-white text-slate-900 rounded-sm shadow-2xl transition-all relative flex flex-col word-printable-stage ${
            margins === 'narrow' ? 'p-8' : margins === 'wide' ? 'p-16' : 'p-12'
          }`}
        >
          {/* Top Paper Header Guide */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 text-[11px] text-slate-400 font-serif italic select-none">
            <span>StudyQuest Academic Office</span>
            <span>{docName}</span>
          </div>

          {/* ReactQuill Editor mounted directly in A4 paper boundary */}
          <div className="flex-1 text-slate-800 word-quill-stage">
            <ReactQuill
              theme="snow"
              value={contentHtml}
              onChange={setContentHtml}
              modules={{
                toolbar: false, // We use the authentic Word Ribbon above
              }}
              className="border-0"
            />
          </div>

          {/* Bottom Paper Footer Guide */}
          <div className="pt-6 mt-8 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-serif select-none">
            <span>Page 1 – {telemetry.totalPages}</span>
            <span>StudyQuest AI Document Studio</span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          4. MICROSOFT WORD STATUS BAR (Docked at Bottom)
      -------------------------------------------------------------- */}
      <footer className="flex-shrink-0 bg-blue-700 dark:bg-blue-900 text-white px-3 sm:px-4 py-1.5 pr-28 sm:pr-32 md:pr-36 flex items-center justify-between text-[11px] border-t border-blue-800 z-30 select-none min-w-0 word-status-bar">
        {/* Left: Document Telemetry */}
        <div className="flex items-center gap-2 sm:gap-3 truncate min-w-0">
          <span className="font-semibold whitespace-nowrap">Page 1 of {telemetry.totalPages}</span>
          <span className="h-3 w-[1px] bg-blue-500/50 flex-shrink-0" />
          <span className="whitespace-nowrap">{telemetry.words.toLocaleString()} words</span>
          <span className="h-3 w-[1px] bg-blue-500/50 hidden sm:inline flex-shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">{telemetry.characters.toLocaleString()} characters</span>
          <span className="h-3 w-[1px] bg-blue-500/50 hidden md:inline flex-shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">{telemetry.readingMinutes} min read</span>
        </div>

        {/* Center: View Layout Switcher (hidden on extra small screens) */}
        <div className="hidden sm:flex items-center gap-1 bg-blue-800/80 px-1 py-0.5 rounded flex-shrink-0 mx-2">
          <button
            onClick={() => {
              setViewMode('print');
              setIsRibbonCollapsed(false);
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
              viewMode === 'print' && !isRibbonCollapsed ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-200 hover:text-white'
            }`}
            title="Print Layout (A4 Paper Stage)"
          >
            Print Layout
          </button>
          <button
            onClick={() => {
              setViewMode('web');
              setIsRibbonCollapsed(false);
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
              viewMode === 'web' && !isRibbonCollapsed ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-200 hover:text-white'
            }`}
            title="Web Layout (Full Width)"
          >
            Web Layout
          </button>
          <button
            onClick={() => {
              setIsRibbonCollapsed(true);
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
              isRibbonCollapsed ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-200 hover:text-white'
            }`}
            title="Reading View (Hide Tools Line for Maximum Canvas)"
          >
            📖 Reading View
          </button>
        </div>

        {/* Right: Zoom Slider */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="p-0.5 hover:bg-blue-600 rounded"
            title="Zoom Out"
          >
            <HiZoomOut size={13} />
          </button>

          <input
            type="range"
            min={50}
            max={150}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            className="w-14 sm:w-20 md:w-24 accent-white cursor-pointer h-1"
          />

          <button
            onClick={() => setZoom((z) => Math.min(150, z + 10))}
            className="p-0.5 hover:bg-blue-600 rounded"
            title="Zoom In"
          >
            <HiZoomIn size={13} />
          </button>

          <span className="font-mono text-[10px] font-bold w-9 text-right">{zoom}%</span>
        </div>
      </footer>

      {/* -------------------------------------------------------------
          MODAL: KATEX MATH EQUATION INSERT
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'math' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40"
              >
                <HiX size={18} />
              </button>

              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <HiCalculator size={24} />
                <h3 className="font-heading font-black text-lg text-[var(--foreground)]">
                  KaTeX Math Equation Editor
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Type standard LaTeX math syntax to render publication-ready equations.
              </p>

              {/* Quick Formula Templates */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setMathInput('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}')}
                  className="px-2 py-1 rounded bg-[var(--background)] border border-[var(--card-border)] hover:border-blue-500 text-[11px] font-mono"
                >
                  Quadratic
                </button>
                <button
                  type="button"
                  onClick={() => setMathInput('\\int_{a}^{b} f(x) \\, dx')}
                  className="px-2 py-1 rounded bg-[var(--background)] border border-[var(--card-border)] hover:border-blue-500 text-[11px] font-mono"
                >
                  Definite Integral
                </button>
                <button
                  type="button"
                  onClick={() => setMathInput('\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}')}
                  className="px-2 py-1 rounded bg-[var(--background)] border border-[var(--card-border)] hover:border-blue-500 text-[11px] font-mono"
                >
                  Summation
                </button>
                <button
                  type="button"
                  onClick={() => setMathInput('\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}')}
                  className="px-2 py-1 rounded bg-[var(--background)] border border-[var(--card-border)] hover:border-blue-500 text-[11px] font-mono"
                >
                  Matrix
                </button>
              </div>

              {/* LaTeX Code Input */}
              <div className="mb-4">
                <label className="text-xs font-bold block mb-1">LaTeX Code:</label>
                <textarea
                  rows={3}
                  value={mathInput}
                  onChange={(e) => setMathInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-blue-500"
                  placeholder="e.g. E = mc^2"
                />
              </div>

              {/* Live KaTeX Preview */}
              <div className="mb-6">
                <label className="text-xs font-bold block mb-1">Live Formula Preview:</label>
                <div
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--card-border)] min-h-[60px] flex items-center justify-center overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: mathPreview || '<span class="text-xs text-slate-400">Formula preview will render here</span>' }}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--card-border)]/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInsertMath}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95"
                >
                  Insert Equation into Paper
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          MODAL: ACADEMIC CITATION GENERATOR
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'citation' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-6 relative max-h-[90vh] flex flex-col"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40"
              >
                <HiX size={18} />
              </button>

              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <HiBookmark size={24} />
                <h3 className="font-heading font-black text-lg text-[var(--foreground)]">
                  Academic Citation Generator
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Generate APA 7th, MLA 9th, or IEEE citations from paper metadata.
              </p>

              {/* Style selector */}
              <div className="flex items-center gap-2 mb-4">
                {(['APA', 'MLA', 'IEEE'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setCitationStyle(style)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      citationStyle === style
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'border-[var(--card-border)] bg-[var(--background)] hover:border-purple-500/50'
                    }`}
                  >
                    {style} Format
                  </button>
                ))}
              </div>

              {/* Input Fields */}
              <div className="space-y-3 mb-6 overflow-y-auto pr-1">
                <div>
                  <label className="text-xs font-bold block mb-1">Author(s):</label>
                  <input
                    type="text"
                    value={citationAuthor}
                    onChange={(e) => setCitationAuthor(e.target.value)}
                    placeholder="e.g. Turing, A. M."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-bold block mb-1">Paper / Book Title:</label>
                    <input
                      type="text"
                      value={citationTitle}
                      onChange={(e) => setCitationTitle(e.target.value)}
                      placeholder="e.g. Computing Machinery and Intelligence"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Year:</label>
                    <input
                      type="text"
                      value={citationYear}
                      onChange={(e) => setCitationYear(e.target.value)}
                      placeholder="1950"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Journal / Publisher / Conference:</label>
                  <input
                    type="text"
                    value={citationJournal}
                    onChange={(e) => setCitationJournal(e.target.value)}
                    placeholder="e.g. Mind, 59(236), 433-460"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)]/50">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--card-border)]/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertCitation('in-text')}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-[var(--background)] border border-purple-500/50 hover:border-purple-500 text-purple-600 transition-colors"
                >
                  Insert In-Text
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertCitation('bibliography')}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all active:scale-95"
                >
                  Insert Bibliography Entry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          MODAL: TABLE BUILDER
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'table' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40"
              >
                <HiX size={18} />
              </button>

              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <HiTable size={24} />
                <h3 className="font-heading font-black text-lg text-[var(--foreground)]">
                  Insert Table Grid
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Define the dimensions for your data table.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-bold block mb-1">Rows:</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tableRows}
                    onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Columns:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={tableCols}
                    onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] font-mono outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer mb-6">
                <input
                  type="checkbox"
                  checked={tableHasHeader}
                  onChange={(e) => setTableHasHeader(e.target.checked)}
                  className="rounded accent-emerald-600"
                />
                <span>Include styled table header row</span>
              </label>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--card-border)]/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInsertTable}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95"
                >
                  Insert Table
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          MODAL: CALLOUT ALERT BOX
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'callout' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40"
              >
                <HiX size={18} />
              </button>

              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <HiExclamationCircle size={24} />
                <h3 className="font-heading font-black text-lg text-[var(--foreground)]">
                  Insert Callout Alert Box
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Highlight key theorems, exam warnings, or definitions in styled academic callout blocks.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setCalloutType('note');
                    setCalloutTitle('Key Takeaway');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    calloutType === 'note' ? 'bg-blue-500/10 border-blue-500 text-blue-600' : 'border-[var(--card-border)] bg-[var(--background)]'
                  }`}
                >
                  💡 Key Takeaway
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCalloutType('warning');
                    setCalloutTitle('Exam Warning');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    calloutType === 'warning' ? 'bg-amber-500/10 border-amber-500 text-amber-600' : 'border-[var(--card-border)] bg-[var(--background)]'
                  }`}
                >
                  ⚠️ Exam Warning
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCalloutType('definition');
                    setCalloutTitle('Formal Definition');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    calloutType === 'definition' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'border-[var(--card-border)] bg-[var(--background)]'
                  }`}
                >
                  📖 Formal Definition
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCalloutType('theorem');
                    setCalloutTitle('Theorem & Proof');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    calloutType === 'theorem' ? 'bg-purple-500/10 border-purple-500 text-purple-600' : 'border-[var(--card-border)] bg-[var(--background)]'
                  }`}
                >
                  📐 Theorem & Proof
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs font-bold block mb-1">Header Title:</label>
                  <input
                    type="text"
                    value={calloutTitle}
                    onChange={(e) => setCalloutTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Callout Text Content:</label>
                  <textarea
                    rows={2}
                    value={calloutText}
                    onChange={(e) => setCalloutText(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--card-border)]/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInsertCallout}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all active:scale-95"
                >
                  Insert Callout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          MODAL: COMPRESS DOCUMENT
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'compress' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40"
              >
                <HiX size={18} />
              </button>

              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <HiLightningBolt size={24} />
                <h3 className="font-heading font-black text-lg text-[var(--foreground)]">
                  Compress Document
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Compact document markup and strip redundant whitespace to reduce file size.
              </p>

              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--card-border)] mb-6">
                <span className="text-[11px] text-[var(--muted-foreground)] block">Estimated Document Size</span>
                <span className="text-sm font-bold font-mono">{formatBytes(new Blob([contentHtml]).size)}</span>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--card-border)]/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompressDocument}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all active:scale-95"
                >
                  Optimize & Compress
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
