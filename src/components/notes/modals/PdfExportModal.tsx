'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { HiDownload } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { compileStudyQuestMarkdown } from '@/lib/markdownCompiler';

export type PdfTheme = 'modern' | 'editor' | 'parchment' | 'grimoire' | 'druid';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  noteContent: string;
  markdownSource?: string;
  folder?: string;
}

export default function PdfExportModal({
  isOpen,
  onClose,
  noteTitle,
  noteContent,
  markdownSource,
  folder,
}: PdfExportModalProps) {
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [theme, setTheme] = useState<PdfTheme>('editor');
  const [expandDetails, setExpandDetails] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    if (!noteContent) {
      toast.error('Nothing to export!');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Preparing high-fidelity PDF export...');
    let viewport: HTMLDivElement | null = null;
    let container: HTMLDivElement | null = null;
    let activeChunkCanvas: HTMLCanvasElement | null = null;

    try {
      const { toCanvas } = await import('html-to-image');
      const { jsPDF } = (await import('jspdf')) as any;

      // On-demand compilation if raw markdown or incomplete diagram syntax is detected
      // Compile note content into full StudyQuest Reading View Mode HTML
      let processedContent = noteContent;
      try {
        processedContent = await compileStudyQuestMarkdown(noteContent, markdownSource);
      } catch (compileErr) {
        console.warn('[PdfExportModal] Markdown compilation fallback:', compileErr);
      }

      // Theme styling configs
      const isDarkActive = theme === 'editor';
      const isGrimoire = theme === 'grimoire';
      const isParchment = theme === 'parchment';
      const isDruid = theme === 'druid';

      const themeBg =
        isDarkActive ? '#0b0d17' :
        isGrimoire ? '#12111a' :
        isParchment ? '#fdf6e2' :
        isDruid ? '#f0fdf4' :
        '#ffffff';

      const themeText =
        isDarkActive ? '#f1f1f7' :
        isGrimoire ? '#e2e8f0' :
        isParchment ? '#3d2b1f' :
        isDruid ? '#14532d' :
        '#0f172a';

      const themeFont =
        isDarkActive ? "'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" :
        isGrimoire ? 'Cinzel, Georgia, serif' :
        isParchment ? 'Georgia, serif' :
        isDruid ? 'Palatino, serif' :
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      const baseContainerWidth = pageSize === 'letter' || pageSize === 'legal' ? 816 : 794;

      // High-definition multi-resolution scaling matrix:
      // Compact (low): 1.6x (~170 DPI, fast export, smaller file)
      // Balanced (medium): 3.0x (~318 DPI print standard, razor-sharp)
      // High-Res (high): 3.8x (~400 DPI, retina crystal-clear)
      const s = quality === 'low' ? 1.6 : quality === 'medium' ? 3.0 : 3.8;
      const renderWidth = Math.round(baseContainerWidth * s);
      const px = (val: number) => `${Math.round(val * s)}px`;
      const pxf = (val: number) => `${(val * s).toFixed(1)}px`;

      viewport = document.createElement('div');
      viewport.style.cssText = `
        width: ${renderWidth}px;
        position: fixed;
        top: 0;
        left: 0;
        z-index: -9999;
        pointer-events: none;
        overflow: hidden;
        background: ${themeBg};
        box-sizing: border-box;
      `;

      container = document.createElement('div');
      container.style.cssText = `
        width: ${renderWidth}px;
        padding: ${px(36)} ${px(44)};
        box-sizing: border-box;
        font-family: ${themeFont};
        font-size: ${pxf(14.5)};
        line-height: 1.8;
        color: ${themeText};
        background: ${themeBg};
        word-wrap: break-word;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      `;

      const folderLabel = folder || 'General';
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Active Dark: Construct StudyQuest Reading View Mode CSS matching globals.css 1:1, scaled natively to target DPI
      const activeDarkStyles = `
        /* Header Card */
        .sq-pdf-header {
          margin-bottom: ${px(24)};
          padding-bottom: ${px(16)};
          border-bottom: ${px(2)} solid rgba(124, 58, 237, 0.25);
        }
        .sq-pdf-meta-bar {
          display: flex;
          align-items: center;
          gap: ${px(10)};
          margin-bottom: ${px(12)};
        }
        .sq-pdf-folder-badge {
          background: rgba(124, 58, 237, 0.2);
          color: #c4b5fd;
          border: ${px(1)} solid rgba(124, 58, 237, 0.4);
          padding: ${px(3)} ${px(12)};
          border-radius: 9999px;
          font-size: ${px(11)};
          font-weight: 700;
          font-family: 'Space Grotesk', monospace;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .sq-pdf-date {
          font-size: ${px(11)};
          font-family: 'Space Grotesk', monospace;
          color: #94a3b8;
          font-weight: 600;
        }
        .sq-pdf-title {
          font-size: ${px(30)};
          font-weight: 900;
          color: #f8fafc;
          line-height: 1.25;
          letter-spacing: -0.025em;
          margin: 0;
          font-family: 'Lexend', sans-serif;
        }

        /* Reading Mode Body Elements */
        .note-pdf-body {
          color: #e2e8f0;
          font-family: 'Lexend', sans-serif;
          line-height: 1.8;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          font-size: ${pxf(14.5)};
        }

        .note-pdf-body h1 {
          font-size: ${px(24)};
          font-weight: 900;
          color: #f8fafc;
          margin: ${px(28)} 0 ${px(12)} 0;
          padding-bottom: ${px(6)};
          border-bottom: ${px(1)} solid rgba(124, 58, 237, 0.3);
          font-family: 'Lexend', sans-serif;
        }
        .note-pdf-body h2 {
          font-size: ${px(20)};
          font-weight: 800;
          color: #f1f5f9;
          margin: ${px(24)} 0 ${px(10)} 0;
          font-family: 'Lexend', sans-serif;
        }
        .note-pdf-body h3 {
          font-size: ${px(17)};
          font-weight: 700;
          color: #e2e8f0;
          margin: ${px(20)} 0 ${px(8)} 0;
          font-family: 'Lexend', sans-serif;
        }
        .note-pdf-body h4, .note-pdf-body h5, .note-pdf-body h6 {
          font-size: ${px(15)};
          font-weight: 700;
          color: #cbd5e1;
          margin: ${px(16)} 0 ${px(6)} 0;
          font-family: 'Lexend', sans-serif;
        }
        .note-pdf-body p {
          margin: ${px(14)} 0;
          line-height: 1.8;
          color: #e2e8f0;
          font-size: ${pxf(14.5)};
        }

        /* Lists with Purple Bullet Markers */
        .note-pdf-body ul {
          list-style-type: disc !important;
          list-style-position: outside !important;
          padding-left: ${px(24)} !important;
          margin: ${px(12)} 0 !important;
        }
        .note-pdf-body ul ul {
          list-style-type: circle !important;
          padding-left: ${px(24)} !important;
          margin: ${px(6)} 0 !important;
        }
        .note-pdf-body ol {
          list-style-type: decimal !important;
          list-style-position: outside !important;
          padding-left: ${px(24)} !important;
          margin: ${px(12)} 0 !important;
        }
        .note-pdf-body li {
          display: list-item !important;
          margin: ${px(6)} 0 !important;
          line-height: 1.65 !important;
        }
        .note-pdf-body li::marker {
          color: #a78bfa !important;
          font-weight: 700 !important;
        }

        /* Task Lists */
        .note-pdf-body li.studyquest-task-item,
        .note-pdf-body li.task-list-item {
          list-style: none !important;
          display: flex !important;
          align-items: center !important;
          gap: ${px(8)} !important;
        }
        .note-pdf-body input[type="checkbox"] {
          accent-color: #7c3aed !important;
          transform: scale(${(1.15 * s).toFixed(2)}) !important;
          transform-origin: left center !important;
          margin: 0 ${px(4)} 0 0 !important;
        }
        .note-pdf-body li.studyquest-task-checked {
          text-decoration: line-through !important;
          opacity: 0.65 !important;
        }

        /* Code Blocks */
        .note-pdf-body .studyquest-code-wrapper,
        .note-pdf-body pre {
          background: #0f172a !important;
          border: ${px(1)} solid rgba(255, 255, 255, 0.12) !important;
          border-radius: ${px(12)} !important;
          padding: ${px(14)} ${px(18)} !important;
          margin: ${px(16)} 0 !important;
          overflow-x: hidden !important;
          white-space: pre-wrap !important;
          word-break: break-all !important;
          overflow-wrap: break-word !important;
          font-family: 'Space Grotesk', 'JetBrains Mono', 'Fira Code', monospace !important;
          font-size: ${px(13)} !important;
          line-height: 1.65 !important;
          color: #e2e8f0 !important;
        }
        .note-pdf-body pre code {
          white-space: pre-wrap !important;
          word-break: break-all !important;
          overflow-wrap: break-word !important;
        }
        .note-pdf-body .studyquest-code-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          padding-bottom: ${px(8)} !important;
          margin-bottom: ${px(8)} !important;
          border-bottom: ${px(1)} solid rgba(255, 255, 255, 0.08) !important;
        }
        .note-pdf-body .studyquest-code-lang {
          font-size: ${px(11)} !important;
          font-weight: 700 !important;
          color: #c4b5fd !important;
          background: rgba(124, 58, 237, 0.2) !important;
          padding: ${px(2)} ${px(8)} !important;
          border-radius: ${px(6)} !important;
          font-family: 'Space Grotesk', monospace !important;
          text-transform: uppercase !important;
        }
        .note-pdf-body code:not(pre code) {
          background: rgba(124, 58, 237, 0.18) !important;
          color: #c4b5fd !important;
          padding: ${px(2)} ${px(7)} !important;
          border-radius: ${px(6)} !important;
          font-family: 'Space Grotesk', 'JetBrains Mono', monospace !important;
          font-size: 0.9em !important;
          font-weight: 600 !important;
          border: ${px(1)} solid rgba(124, 58, 237, 0.25) !important;
        }

        /* GitHub Callouts */
        .note-pdf-body .studyquest-callout {
          margin: ${px(18)} 0 !important;
          border-radius: ${px(14)} !important;
          border: ${px(1)} solid transparent !important;
          border-left: ${px(4)} solid !important;
          padding: ${px(12)} ${px(16)} !important;
          box-shadow: 0 ${px(4)} ${px(16)} rgba(0, 0, 0, 0.2) !important;
        }
        .note-pdf-body .studyquest-callout-header {
          display: flex !important;
          align-items: center !important;
          gap: ${px(8)} !important;
          margin-bottom: ${px(6)} !important;
          font-weight: 800 !important;
          font-size: ${pxf(13.6)} !important;
          letter-spacing: 0.02em !important;
        }
        .note-pdf-body .studyquest-callout-content {
          font-size: ${pxf(14.5)} !important;
          line-height: 1.6 !important;
          color: #e2e8f0 !important;
        }
        .note-pdf-body .studyquest-callout-note {
          border-left-color: #0ea5e9 !important;
          background: rgba(14, 165, 233, 0.09) !important;
          border: ${px(1)} solid rgba(14, 165, 233, 0.25) !important;
          border-left-width: ${px(4)} !important;
        }
        .note-pdf-body .studyquest-callout-note .studyquest-callout-header { color: #0ea5e9 !important; }
        .note-pdf-body .studyquest-callout-tip {
          border-left-color: #10b981 !important;
          background: rgba(16, 185, 129, 0.09) !important;
          border: ${px(1)} solid rgba(16, 185, 129, 0.25) !important;
          border-left-width: ${px(4)} !important;
        }
        .note-pdf-body .studyquest-callout-tip .studyquest-callout-header { color: #10b981 !important; }
        .note-pdf-body .studyquest-callout-warning {
          border-left-color: #f59e0b !important;
          background: rgba(245, 158, 11, 0.09) !important;
          border: ${px(1)} solid rgba(245, 158, 11, 0.25) !important;
          border-left-width: ${px(4)} !important;
        }
        .note-pdf-body .studyquest-callout-warning .studyquest-callout-header { color: #f59e0b !important; }
        .note-pdf-body .studyquest-callout-important {
          border-left-color: #8b5cf6 !important;
          background: rgba(139, 92, 246, 0.09) !important;
          border: ${px(1)} solid rgba(139, 92, 246, 0.25) !important;
          border-left-width: ${px(4)} !important;
        }
        .note-pdf-body .studyquest-callout-important .studyquest-callout-header { color: #8b5cf6 !important; }
        .note-pdf-body .studyquest-callout-caution {
          border-left-color: #f43f5e !important;
          background: rgba(244, 63, 94, 0.09) !important;
          border: ${px(1)} solid rgba(244, 63, 94, 0.25) !important;
          border-left-width: ${px(4)} !important;
        }
        .note-pdf-body .studyquest-callout-caution .studyquest-callout-header { color: #f43f5e !important; }

        /* Tables */
        .note-pdf-body .studyquest-table-wrapper,
        .note-pdf-body table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: ${px(20)} 0 !important;
          border-radius: ${px(12)} !important;
          overflow: hidden !important;
          border: ${px(1)} solid rgba(255, 255, 255, 0.12) !important;
          font-size: ${pxf(14.0)} !important;
        }
        .note-pdf-body thead {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(99, 102, 241, 0.15)) !important;
        }
        .note-pdf-body th {
          padding: ${px(11)} ${px(16)} !important;
          text-align: left !important;
          font-weight: 700 !important;
          font-size: ${px(13)} !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: #c4b5fd !important;
          border-bottom: ${px(2)} solid rgba(124, 58, 237, 0.35) !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
        }
        .note-pdf-body td {
          padding: ${px(11)} ${px(16)} !important;
          border-bottom: ${px(1)} solid rgba(255, 255, 255, 0.06) !important;
          color: #e2e8f0 !important;
          line-height: 1.5 !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
        }
        .note-pdf-body tbody tr:nth-child(even) {
          background: rgba(124, 58, 237, 0.03) !important;
        }
        .note-pdf-body tbody tr:last-child td {
          border-bottom: none !important;
        }

        /* Collapsible Sections (Details / Summary) */
        .note-pdf-body details,
        .note-pdf-body .studyquest-details {
          margin: ${px(16)} 0 !important;
          border-radius: ${px(12)} !important;
          border: ${px(1)} solid rgba(124, 58, 237, 0.3) !important;
          background: rgba(17, 19, 40, 0.7) !important;
          overflow: hidden !important;
        }
        .note-pdf-body summary,
        .note-pdf-body .studyquest-summary {
          padding: ${px(10)} ${px(14)} !important;
          font-weight: 700 !important;
          font-size: ${px(14)} !important;
          color: #f1f1f7 !important;
          background: rgba(124, 58, 237, 0.15) !important;
          border-bottom: ${px(1)} solid rgba(124, 58, 237, 0.2) !important;
          list-style: none !important;
          display: flex !important;
          align-items: center !important;
          gap: ${px(8)} !important;
        }
        .note-pdf-body summary::-webkit-details-marker { display: none !important; }
        .note-pdf-body summary::before {
          content: '▼' !important;
          font-size: ${px(12)} !important;
          color: #a78bfa !important;
        }
        .note-pdf-body .studyquest-details-content,
        .note-pdf-body details > *:not(summary) {
          padding: ${px(12)} ${px(16)} !important;
          display: block !important;
          color: #e2e8f0 !important;
          font-size: ${pxf(14.5)} !important;
        }

        /* Mermaid Diagrams */
        .note-pdf-body .studyquest-mermaid-container {
          margin: ${px(20)} 0 !important;
          padding: ${px(16)} !important;
          border-radius: ${px(16)} !important;
          background: #090d16 !important;
          border: ${pxf(1.5)} solid rgba(124, 58, 237, 0.35) !important;
          box-shadow: 0 ${px(4)} ${px(24)} rgba(0, 0, 0, 0.3) !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }
        .note-pdf-body .mermaid-badge {
          font-size: ${px(11)} !important;
          font-weight: 800 !important;
          color: #c4b5fd !important;
          background: rgba(167, 139, 250, 0.15) !important;
          padding: ${px(3)} ${px(10)} !important;
          border-radius: 9999px !important;
          border: ${px(1)} solid rgba(167, 139, 250, 0.3) !important;
          font-family: 'Space Grotesk', monospace !important;
          margin-bottom: ${px(8)} !important;
        }
        .note-pdf-body .studyquest-mermaid-svg svg {
          max-width: 100% !important;
          height: auto !important;
        }
        .note-pdf-body .studyquest-mermaid-svg svg text,
        .note-pdf-body .studyquest-mermaid-svg svg text tspan,
        .note-pdf-body .studyquest-mermaid-svg svg .node text,
        .note-pdf-body .studyquest-mermaid-svg svg .nodeLabel,
        .note-pdf-body .studyquest-mermaid-svg svg foreignObject div,
        .note-pdf-body .studyquest-mermaid-svg svg foreignObject span {
          fill: #f8fafc !important;
          color: #f8fafc !important;
          font-family: 'Lexend', sans-serif !important;
          font-weight: 600 !important;
        }
        .note-pdf-body .studyquest-mermaid-svg svg .node rect,
        .note-pdf-body .studyquest-mermaid-svg svg .node polygon,
        .note-pdf-body .studyquest-mermaid-svg svg .node circle {
          fill: #1e293b !important;
          stroke: #8b5cf6 !important;
          stroke-width: ${pxf(1.5)} !important;
        }
        .note-pdf-body .studyquest-mermaid-svg svg .cluster rect {
          fill: #0f172a !important;
          stroke: #475569 !important;
        }

        /* KaTeX Formulas */
        .note-pdf-body .studyquest-math-block {
          text-align: center !important;
          margin: ${px(20)} 0 !important;
          padding: ${px(14)} ${px(10)} !important;
          background: rgba(124, 58, 237, 0.07) !important;
          border-radius: ${px(12)} !important;
          border: ${px(1)} dashed rgba(167, 139, 250, 0.35) !important;
          font-size: 1.15em !important;
          color: #f8fafc !important;
        }
        .note-pdf-body .studyquest-math-inline {
          display: inline-block !important;
          padding: 0 ${px(4)} !important;
          font-size: 1.05em !important;
          color: #f8fafc !important;
        }

        /* Blockquotes */
        .note-pdf-body blockquote {
          border-left: ${px(4)} solid #7c3aed !important;
          padding: ${px(10)} ${px(16)} ${px(10)} ${px(20)} !important;
          margin: ${px(16)} 0 !important;
          background: rgba(124, 58, 237, 0.08) !important;
          border-radius: 0 ${px(12)} ${px(12)} 0 !important;
          color: #cbd5e1 !important;
          font-style: italic !important;
        }

        /* Highlights */
        .note-pdf-body mark,
        .note-pdf-body .studyquest-highlight {
          background: rgba(245, 158, 11, 0.25) !important;
          color: #fef3c7 !important;
          padding: ${px(2)} ${px(6)} !important;
          border-radius: ${px(5)} !important;
          border: ${px(1)} solid rgba(245, 158, 11, 0.4) !important;
          font-weight: 600 !important;
        }

        /* Images */
        .note-pdf-body img {
          max-width: 100% !important;
          height: auto !important;
          border-radius: ${px(14)} !important;
          margin: ${px(20)} auto !important;
          display: block !important;
          border: ${px(1)} solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 ${px(8)} ${px(24)} rgba(0, 0, 0, 0.4) !important;
        }

        /* Links */
        .note-pdf-body a,
        .note-pdf-body .studyquest-link {
          color: #a78bfa !important;
          text-decoration: underline !important;
          font-weight: 600 !important;
        }

        /* Footnotes */
        .note-pdf-body .studyquest-footnotes {
          margin-top: ${px(40)} !important;
          padding-top: ${px(16)} !important;
          border-top: ${px(1)} solid rgba(124, 58, 237, 0.25) !important;
          font-size: ${pxf(13.6)} !important;
          color: #94a3b8 !important;
        }
        .note-pdf-body .studyquest-footnotes-title {
          font-size: ${px(15)} !important;
          font-weight: 800 !important;
          color: #f1f1f7 !important;
          margin-bottom: ${px(8)} !important;
        }
      `;

      // Fallback styles for lighter/other themes with matching header support, scaled natively to target DPI
      const lightThemeStyles = `
        .sq-pdf-header {
          margin-bottom: ${px(24)};
          padding-bottom: ${px(16)};
          border-bottom: ${px(2)} solid ${isParchment ? 'rgba(61, 43, 31, 0.2)' : isDruid ? 'rgba(20, 83, 45, 0.2)' : isGrimoire ? 'rgba(124, 58, 237, 0.3)' : 'rgba(124, 58, 237, 0.2)'};
        }
        .sq-pdf-meta-bar {
          display: flex;
          align-items: center;
          gap: ${px(10)};
          margin-bottom: ${px(8)};
        }
        .sq-pdf-folder-badge {
          background: ${isParchment ? 'rgba(61, 43, 31, 0.08)' : isDruid ? 'rgba(20, 83, 45, 0.08)' : isGrimoire ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.1)'};
          color: ${themeText};
          border: ${px(1)} solid ${isParchment ? 'rgba(61, 43, 31, 0.25)' : isDruid ? 'rgba(20, 83, 45, 0.25)' : isGrimoire ? 'rgba(124, 58, 237, 0.4)' : 'rgba(124, 58, 237, 0.25)'};
          padding: ${px(3)} ${px(10)};
          border-radius: 9999px;
          font-size: ${px(11)};
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .sq-pdf-date {
          font-size: ${px(11)};
          color: ${themeText};
          opacity: 0.7;
        }
        .sq-pdf-title {
          font-size: ${px(26)};
          font-weight: 900;
          color: ${themeText};
          margin: ${px(6)} 0 0 0;
          line-height: 1.25;
        }
        .note-pdf-body details {
          margin: ${px(14)} 0;
          border-radius: ${px(8)};
          border: ${px(1)} solid rgba(124, 58, 237, 0.25);
          background: rgba(124, 58, 237, 0.03);
          overflow: hidden;
        }
        .note-pdf-body summary {
          padding: ${px(8)} ${px(12)};
          font-weight: 700;
          font-size: ${px(13)};
          cursor: default;
          list-style: none;
          display: flex;
          align-items: center;
          gap: ${px(6)};
          border-bottom: ${px(1)} solid rgba(124, 58, 237, 0.15);
          background: rgba(124, 58, 237, 0.06);
        }
        .note-pdf-body summary::-webkit-details-marker { display: none; }
        .note-pdf-body .studyquest-details-content,
        .note-pdf-body details > *:not(summary) {
          padding: ${px(10)} ${px(14)};
          display: block !important;
          font-size: ${pxf(14.5)};
        }
        .note-pdf-body ul {
          list-style-type: disc !important;
          padding-left: ${px(24)} !important;
          margin: ${px(10)} 0 !important;
        }
        .note-pdf-body ol {
          list-style-type: decimal !important;
          padding-left: ${px(24)} !important;
          margin: ${px(10)} 0 !important;
        }
        .note-pdf-body li {
          display: list-item !important;
          margin: ${px(4)} 0 !important;
        }
        .note-pdf-body li.studyquest-task-item,
        .note-pdf-body li.task-list-item {
          list-style: none !important;
          display: flex !important;
          align-items: center !important;
          gap: ${px(8)} !important;
        }
        .note-pdf-body blockquote {
          border-left: ${px(4)} solid #7c3aed;
          padding: ${px(8)} ${px(14)};
          margin: ${px(12)} 0;
          background: rgba(124, 58, 237, 0.05);
        }
        .note-pdf-body table {
          width: 100%;
          border-collapse: collapse;
          margin: ${px(12)} 0;
        }
        .note-pdf-body pre {
          background: #1e293b !important;
          border: ${px(1)} solid rgba(0, 0, 0, 0.15) !important;
          border-radius: ${px(12)} !important;
          padding: ${px(14)} ${px(18)} !important;
          margin: ${px(16)} 0 !important;
          overflow-x: hidden !important;
          white-space: pre-wrap !important;
          word-break: break-all !important;
          overflow-wrap: break-word !important;
          font-family: 'Space Grotesk', 'JetBrains Mono', 'Fira Code', monospace !important;
          font-size: ${px(13)} !important;
          line-height: 1.65 !important;
          color: #f1f5f9 !important;
        }
        .note-pdf-body pre code {
          white-space: pre-wrap !important;
          word-break: break-all !important;
          overflow-wrap: break-word !important;
        }
        .note-pdf-body .studyquest-code-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          padding-bottom: ${px(8)} !important;
          margin-bottom: ${px(8)} !important;
          border-bottom: ${px(1)} solid rgba(255, 255, 255, 0.1) !important;
        }
        .note-pdf-body .studyquest-code-lang {
          font-size: ${px(11)} !important;
          font-weight: 700 !important;
          color: #c4b5fd !important;
          background: rgba(124, 58, 237, 0.25) !important;
          padding: ${px(2)} ${px(8)} !important;
          border-radius: ${px(6)} !important;
          text-transform: uppercase !important;
        }
        .note-pdf-body .studyquest-callout {
          margin: ${px(18)} 0 !important;
          border-radius: ${px(12)} !important;
          border-left: ${px(4)} solid #7c3aed !important;
          padding: ${px(12)} ${px(16)} !important;
          background: rgba(124, 58, 237, 0.06) !important;
          border: ${px(1)} solid rgba(124, 58, 237, 0.2) !important;
          border-left-width: ${px(4)} !important;
        }
        .note-pdf-body .studyquest-callout-header {
          display: flex !important;
          align-items: center !important;
          gap: ${px(8)} !important;
          margin-bottom: ${px(6)} !important;
          font-weight: 800 !important;
          font-size: ${pxf(13.6)} !important;
        }
        .note-pdf-body .studyquest-callout-note { border-left-color: #0284c7 !important; background: rgba(2, 132, 199, 0.07) !important; }
        .note-pdf-body .studyquest-callout-tip { border-left-color: #059669 !important; background: rgba(5, 150, 105, 0.07) !important; }
        .note-pdf-body .studyquest-callout-warning { border-left-color: #d97706 !important; background: rgba(217, 119, 6, 0.07) !important; }
        .note-pdf-body .studyquest-callout-important { border-left-color: #7c3aed !important; background: rgba(124, 58, 237, 0.07) !important; }
        .note-pdf-body .studyquest-callout-caution { border-left-color: #e11d48 !important; background: rgba(225, 29, 72, 0.07) !important; }
        .note-pdf-body img {
          max-width: 100%;
          height: auto;
          border-radius: ${px(10)};
          margin: ${px(12)} auto;
          display: block;
        }
      `;

      container.innerHTML = `
        <style>
          ${isDarkActive || isGrimoire ? activeDarkStyles : lightThemeStyles}
        </style>
        <div class="sq-pdf-header">
          <div class="sq-pdf-meta-bar">
            <span class="sq-pdf-folder-badge">${folderLabel}</span>
            <span class="sq-pdf-date">${dateStr}</span>
          </div>
          <h1 class="sq-pdf-title">${noteTitle}</h1>
        </div>
        <div class="note-pdf-body studyquest-markdown">${processedContent}</div>
      `;

      // Expand all details sections so html2canvas captures full inner content
      if (expandDetails) {
        const detailsEls = container.querySelectorAll('details');
        detailsEls.forEach((d) => {
          d.setAttribute('open', 'true');
          (d as HTMLDetailsElement).open = true;
        });
      }

      // Normalize task list items so bullet markers are removed cleanly for html2canvas
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((cb) => {
        const li = cb.closest('li');
        if (li) {
          li.classList.add('studyquest-task-item');
          if ((cb as HTMLInputElement).checked) {
            li.classList.add('studyquest-task-checked');
          }
          li.style.listStyle = 'none';
          li.style.display = 'flex';
          li.style.alignItems = 'center';
          li.style.gap = px(8);
          const ul = li.closest('ul');
          if (ul) {
            ul.style.listStyle = 'none';
            ul.style.paddingLeft = px(8);
          }
        }
      });

      viewport.appendChild(container);
      document.body.appendChild(viewport);

      // Await custom fonts ready so Lexend and Space Grotesk render razor sharp
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {}
      }

      // Ensure all images (including Firebase Storage URLs and local diagrams) are inlined and fully loaded
      // Pre-inlining remote images to local data URLs prevents CORS canvas-tainting (SecurityError)
      const images = Array.from(container.querySelectorAll('img'));
      if (images.length > 0) {
        await Promise.race([
          Promise.all(
            images.map(async (img) => {
              img.crossOrigin = 'anonymous';

              // If image is a remote URL (e.g. Firebase Storage), pre-convert it to a local data URL to guarantee origin-clean canvas
              if (img.src && img.src.startsWith('http')) {
                try {
                  const res = await fetch(img.src, { mode: 'cors' });
                  if (res.ok) {
                    const blob = await res.blob();
                    const reader = new FileReader();
                    await new Promise<void>((resolve) => {
                      reader.onloadend = () => {
                        if (typeof reader.result === 'string') {
                          img.src = reader.result;
                        }
                        resolve();
                      };
                      reader.readAsDataURL(blob);
                    });
                  }
                } catch {
                  // Direct fetch failed; attempt offscreen Image draw with crossOrigin
                  try {
                    const offscreen = new Image();
                    offscreen.crossOrigin = 'anonymous';
                    offscreen.src = img.src;
                    await new Promise<void>((resolve) => {
                      offscreen.onload = () => resolve();
                      offscreen.onerror = () => resolve();
                      setTimeout(resolve, 2000);
                    });
                    if (offscreen.complete && offscreen.naturalWidth > 0) {
                      const c = document.createElement('canvas');
                      c.width = offscreen.naturalWidth;
                      c.height = offscreen.naturalHeight;
                      const ctx = c.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(offscreen, 0, 0);
                        img.src = c.toDataURL('image/jpeg', 0.92);
                      }
                    }
                  } catch {}
                }
              }

              if (img.complete) {
                if ('decode' in img) {
                  return (img as HTMLImageElement).decode().catch(() => {});
                }
                return Promise.resolve();
              }
              return new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              });
            })
          ),
          new Promise<void>((resolve) => setTimeout(resolve, 4000)),
        ]);
      }

      // Allow DOM repaint
      await new Promise((r) => setTimeout(r, 150));

      const pdf = new jsPDF('p', 'mm', pageSize) as any;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      // Exact pixel height of a single page at target print DPI
      const singlePagePixelHeight = (usableHeight * renderWidth) / imgWidth;
      const totalContentHeight = Math.max(container.scrollHeight, container.offsetHeight, Math.round(singlePagePixelHeight));

      // Coordinate mapping function: returns the exact pixel Y-offset for page index p
      // Integer-floor mapping guarantees page p start == page (p-1) end with 0 pixel drift
      const getPageY = (p: number) => Math.floor((p * usableHeight * renderWidth) / imgWidth);
      const totalPages = Math.max(1, Math.ceil(totalContentHeight / singlePagePixelHeight));

      // Safe chunking: GPU/Chromium texture limit is 16,384px.
      // We set chunk height to 14,500px (~4 pages) for optimal throughput and zero-crash stability.
      const MAX_CHUNK_HEIGHT = 14500;
      const pagesPerChunk = Math.max(1, Math.floor(MAX_CHUNK_HEIGHT / singlePagePixelHeight));
      const totalChunks = Math.ceil(totalPages / pagesPerChunk);
      const jpegQuality = quality === 'low' ? 0.88 : quality === 'medium' ? 0.93 : 0.96;

      for (let c = 0; c < totalChunks; c++) {
        const startPage = c * pagesPerChunk;
        const endPage = Math.min(startPage + pagesPerChunk, totalPages);
        const pagesInChunk = endPage - startPage;

        const chunkStartY = getPageY(startPage);
        const chunkEndY = getPageY(endPage);
        const chunkHeight = chunkEndY - chunkStartY;

        if (totalChunks > 1) {
          const percent = Math.round((endPage / totalPages) * 100);
          toast.loading(
            `Rendering pages ${startPage + 1}–${endPage} of ${totalPages} (${percent}%)...`,
            { id: toastId }
          );
        }

        // Slide viewport to current chunk using negative margin-top
        viewport.style.height = `${chunkHeight}px`;
        container.style.marginTop = `-${chunkStartY}px`;

        // Allow microtask DOM repaint
        await new Promise((r) => setTimeout(r, 40));

        let chunkCanvas: HTMLCanvasElement;
        try {
          chunkCanvas = await toCanvas(viewport, {
            width: renderWidth,
            height: chunkHeight,
            pixelRatio: 1, // 1:1 native pixel match — element is already at high print resolution!
            backgroundColor: themeBg,
            skipFonts: true,
            style: {
              position: 'relative',
              top: '0',
              left: '0',
              margin: '0',
              zIndex: '1',
              visibility: 'visible',
              display: 'block',
              overflow: 'hidden',
            },
          });
        } catch (renderErr) {
          console.warn(`[PdfExportModal] Primary toCanvas retry on chunk ${c}:`, renderErr);
          chunkCanvas = await toCanvas(viewport, {
            width: renderWidth,
            height: chunkHeight,
            pixelRatio: 1,
            backgroundColor: themeBg,
            style: {
              position: 'relative',
              top: '0',
              left: '0',
              margin: '0',
              zIndex: '1',
              visibility: 'visible',
              display: 'block',
              overflow: 'hidden',
            },
          });
        }
        activeChunkCanvas = chunkCanvas;

        // Slice each page belonging to this chunk into jsPDF
        for (let p = 0; p < pagesInChunk; p++) {
          const globalPage = startPage + p;
          if (globalPage > 0) pdf.addPage();

          // 1. Fill entire page surface with matching theme background color (eliminates white borders)
          pdf.setFillColor(themeBg);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');

          // 2. Exact integer coordinate slice relative to chunk canvas
          const pageStartY = getPageY(globalPage) - chunkStartY;
          const pageEndY = getPageY(globalPage + 1) - chunkStartY;
          const srcH = Math.min(pageEndY - pageStartY, chunkCanvas.height - pageStartY);

          if (srcH <= 0) continue;

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = renderWidth;
          sliceCanvas.height = srcH;
          const sliceCtx = sliceCanvas.getContext('2d');
          if (sliceCtx) {
            // Pre-fill entire slice surface with theme background to prevent JPEG transparent black-border bleeding
            sliceCtx.fillStyle = themeBg;
            sliceCtx.fillRect(0, 0, renderWidth, srcH);
            sliceCtx.imageSmoothingEnabled = true;
            sliceCtx.imageSmoothingQuality = 'high';
            sliceCtx.drawImage(chunkCanvas, 0, pageStartY, renderWidth, srcH, 0, 0, renderWidth, srcH);
          }

          // 3. Hardware SIMD JPEG encoding (libjpeg-turbo): 50x faster than single-threaded CPU PNG
          let sliceData: string;
          try {
            sliceData = sliceCanvas.toDataURL('image/jpeg', jpegQuality);
          } catch (taintErr) {
            console.warn('[PdfExportModal] Canvas export fallback on taint:', taintErr);
            sliceCtx?.fillRect(0, 0, renderWidth, srcH);
            sliceData = sliceCanvas.toDataURL('image/jpeg', 0.85);
          }
          const sliceHeight = (srcH * imgWidth) / renderWidth;
          // Direct zero-copy DCTDecode embedding into PDF stream
          pdf.addImage(sliceData, 'JPEG', margin, margin, imgWidth, sliceHeight, undefined, 'FAST');

          // Free canvas buffer memory immediately to prevent heap spikes on long documents
          sliceCanvas.width = 0;
          sliceCanvas.height = 0;
        }

        // Free chunk canvas immediately before processing next chunk
        chunkCanvas.width = 0;
        chunkCanvas.height = 0;
        activeChunkCanvas = null;

        // Yield to event loop between chunks
        await new Promise((r) => setTimeout(r, 20));
      }

      const safeFilename = `${(noteTitle || 'note').replace(/[/\\?%*:|"<>\r\n\t]/g, '_').trim() || 'note'}.pdf`;
      pdf.save(safeFilename);
      toast.success('PDF generated successfully! 📜', { id: toastId });
      onClose();
    } catch (err: any) {
      console.error('PDF export failed:', err);
      toast.error('Failed to generate PDF. Please try again.', { id: toastId });
    } finally {
      if (activeChunkCanvas) {
        activeChunkCanvas.width = 0;
        activeChunkCanvas.height = 0;
      }
      // Prevent offscreen element memory leaks
      if (viewport && viewport.parentNode) {
        viewport.parentNode.removeChild(viewport);
      } else if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export as PDF">
      <div className="space-y-5">
        {/* Page Size */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">
            Page Size
          </label>
          <div className="flex gap-2">
            {([
              { id: 'a4' as const, label: 'A4', desc: '210 × 297 mm' },
              { id: 'letter' as const, label: 'Letter', desc: '8.5 × 11 in' },
              { id: 'legal' as const, label: 'Legal', desc: '8.5 × 14 in' },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPageSize(opt.id)}
                className={`flex-1 py-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  pageSize === opt.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'border-[var(--card-border)] hover:border-primary/30 text-[var(--foreground)]'
                }`}
              >
                <span className="text-xs font-bold block">{opt.label}</span>
                <span className={`text-[9px] block mt-0.5 ${pageSize === opt.id ? 'text-white/70' : 'text-[var(--muted-foreground)]'}`}>
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Image Quality */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">
            Image Quality
          </label>
          <div className="flex gap-2">
            {([
              { id: 'low' as const, label: 'Compact', desc: 'Fast export', emoji: '📄' },
              { id: 'medium' as const, label: 'Balanced', desc: 'Recommended', emoji: '📋' },
              { id: 'high' as const, label: 'High-Res', desc: 'Crystal clear', emoji: '✨' },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setQuality(opt.id)}
                className={`flex-1 py-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  quality === opt.id
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'border-[var(--card-border)] hover:border-teal-500/30 text-[var(--foreground)]'
                }`}
              >
                <span className="text-sm block">{opt.emoji}</span>
                <span className="text-xs font-bold block">{opt.label}</span>
                <span className={`text-[9px] block mt-0.5 ${quality === opt.id ? 'text-white/70' : 'text-[var(--muted-foreground)]'}`}>
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Scroll Theme */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">
            Scroll Style / Theme
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'editor' as const, label: 'Active Dark', desc: 'StudyQuest Reading Mode 1:1', badge: 'View Mode', emoji: '🔮' },
              { id: 'modern' as const, label: 'Modern Clean', desc: 'Clean, sans-serif layout', emoji: '📄' },
              { id: 'parchment' as const, label: 'Aether Parchment', desc: 'Vintage warm scroll', emoji: '📜' },
              { id: 'grimoire' as const, label: 'Void Grimoire', desc: 'Dark magical styling', emoji: '🌌' },
              { id: 'druid' as const, label: 'Forest Druid', desc: 'Serene botanical look', emoji: '🌿' },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                  theme === opt.id
                    ? 'bg-primary/10 text-primary border-primary shadow-sm'
                    : 'border-[var(--card-border)] hover:border-primary/20 bg-[var(--card-bg)] text-[var(--muted-foreground)]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm">{opt.emoji}</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">{opt.label}</span>
                  {opt.badge && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/35 font-mono ml-auto">
                      ✨ {opt.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] block text-[var(--muted-foreground)] opacity-80 leading-snug">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Sections Toggle */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-bold text-[var(--foreground)] block">Expand Collapsible Sections</span>
            <span className="text-[10px] text-[var(--muted-foreground)] block">Print all folded details & secret blocks expanded in the PDF</span>
          </div>
          <input
            type="checkbox"
            checked={expandDetails}
            onChange={(e) => setExpandDetails(e.target.checked)}
            className="w-4 h-4 accent-primary cursor-pointer shrink-0"
            aria-label="Expand collapsible sections in PDF"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={isExporting} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExport} loading={isExporting} className="flex-1" icon={<HiDownload size={14} />}>
            Export PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}
