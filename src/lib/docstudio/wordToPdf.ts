'use client';

import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';

export interface WordToPdfOptions {
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margins?: 'normal' | 'narrow' | 'wide';
  includeHeaderFooter?: boolean;
}

/**
 * Analyzes rendered DOM geometry and inserts page-break spacers to prevent awkward cutoffs
 * across page boundaries (zero-cut pagination for tables, math, headings, callouts, and paragraphs).
 */
function applySmartPageBreaks(
  container: HTMLElement,
  containerTop: number,
  pageHeightPx: number
) {
  let currentPageTop = 0;
  const maxIterations = 60; // Safety limit to avoid infinite loops on huge documents
  let iteration = 0;

  while (iteration++ < maxIterations) {
    const targetCut = currentPageTop + pageHeightPx;
    const containerRect = container.getBoundingClientRect();
    const currentContainerHeight = containerRect.height;

    // If remaining content comfortably fits within this page, we're done
    if (currentContainerHeight - currentPageTop <= pageHeightPx + 4) {
      break;
    }

    // Candidate blocks that should avoid being sliced in half
    const candidates = Array.from(
      container.querySelectorAll<HTMLElement>(
        'table, tr, .studyquest-math-block, .katex-display, blockquote, pre, h1, h2, h3, h4, h5, h6, img, figure, [style*="border-left"]'
      )
    );

    let foundCutCrossing = false;

    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const elTop = rect.top - containerTop;
      const elBottom = rect.bottom - containerTop;

      // Check if this indivisible element straddles the page fold
      if (elTop < targetCut - 8 && elBottom > targetCut + 8) {
        // Element crosses cut! Push it cleanly to the top of the next page
        const spaceNeeded = Math.max(0, Math.ceil(targetCut - elTop));

        if (spaceNeeded > 0 && spaceNeeded < pageHeightPx - 20) {
          const spacerDiv = document.createElement('div');
          spacerDiv.className = 'sq-word-pdf-page-break-spacer';
          spacerDiv.style.cssText = `
            height: ${spaceNeeded}px !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            display: block !important;
            pointer-events: none !important;
          `;

          // If inside a table row, push the entire row or parent table
          if (el.tagName === 'TR') {
            const table = el.closest('table');
            if (table && table.parentNode) {
              const tableRect = table.getBoundingClientRect();
              const tableTop = tableRect.top - containerTop;
              const tableSpace = Math.max(0, Math.ceil(targetCut - tableTop));
              if (tableSpace > 0 && tableSpace < pageHeightPx - 20) {
                spacerDiv.style.height = `${tableSpace}px !important`;
                table.parentNode.insertBefore(spacerDiv, table);
                foundCutCrossing = true;
                break;
              }
            }
          } else if (el.parentNode) {
            el.parentNode.insertBefore(spacerDiv, el);
            foundCutCrossing = true;
            break;
          }
        }
      }
    }

    currentPageTop = targetCut;
  }
}

/**
 * Compiles rich Word HTML content into an authentic, publication-grade academic PDF
 * with zero app UI chrome, high-DPI font rendering, preserved tables, and KaTeX math.
 */
export async function compileWordHtmlToPdf(
  htmlContent: string,
  docName: string,
  options: WordToPdfOptions = {}
): Promise<Blob> {
  const {
    pageSize = 'a4',
    orientation = 'portrait',
    margins = 'normal',
    includeHeaderFooter = true,
  } = options;

  let viewport: HTMLDivElement | null = null;
  let container: HTMLDivElement | null = null;

  try {
    // 1. Calculate dimensions in mm and CSS pixels at 96 DPI
    // ISO A4: 210 x 297 mm. US Letter: 215.9 x 279.4 mm.
    const isLandscape = orientation === 'landscape';
    const isLetter = pageSize === 'letter';

    const widthMm = isLetter ? (isLandscape ? 279.4 : 215.9) : (isLandscape ? 297 : 210);
    const heightMm = isLetter ? (isLandscape ? 215.9 : 279.4) : (isLandscape ? 210 : 297);

    // Standard 96 DPI base width
    const baseWidthPx = isLandscape ? 1123 : (isLetter ? 816 : 794);
    // 2.5x retina supersampling factor for razor-sharp text and borders
    const scale = 2.5;
    const renderWidthPx = Math.round(baseWidthPx * scale);

    // Padding based on margins
    const padTopBottomPx = margins === 'narrow' ? 28 * scale : margins === 'wide' ? 56 * scale : 42 * scale;
    const padLeftRightPx = margins === 'narrow' ? 32 * scale : margins === 'wide' ? 64 * scale : 48 * scale;

    // Expected content height per page in render pixels
    const renderPageHeightPx = Math.round((heightMm / widthMm) * renderWidthPx);
    const usablePageHeightPx = renderPageHeightPx - (padTopBottomPx * 2);

    // 2. Create offscreen sandbox container
    viewport = document.createElement('div');
    viewport.style.cssText = `
      width: ${renderWidthPx}px;
      position: fixed;
      top: 0;
      left: 0;
      z-index: -99999;
      pointer-events: none;
      overflow: hidden;
      background: #ffffff;
      box-sizing: border-box;
    `;

    container = document.createElement('div');
    container.style.cssText = `
      width: ${renderWidthPx}px;
      padding: ${padTopBottomPx}px ${padLeftRightPx}px;
      box-sizing: border-box;
      font-family: 'Times New Roman', 'Liberation Serif', Georgia, serif;
      font-size: ${14 * scale}px;
      line-height: 1.75;
      color: #0f172a;
      background: #ffffff;
      word-wrap: break-word;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    `;

    // 3. Document Styling
    const docStyles = `
      .word-pdf-wrapper {
        font-family: 'Times New Roman', 'Liberation Serif', Georgia, serif;
        color: #0f172a;
        line-height: 1.75;
      }
      .word-pdf-header-band {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: ${10 * scale}px;
        margin-bottom: ${20 * scale}px;
        border-bottom: ${1.5 * scale}px solid #cbd5e1;
        font-size: ${10.5 * scale}px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #64748b;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .word-pdf-wrapper h1 {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: ${24 * scale}px;
        font-weight: 800;
        color: #0f172a;
        margin: ${18 * scale}px 0 ${10 * scale}px 0;
        line-height: 1.25;
        letter-spacing: -0.02em;
        break-after: avoid;
        page-break-after: avoid;
      }
      .word-pdf-wrapper h2 {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: ${19 * scale}px;
        font-weight: 700;
        color: #1e293b;
        margin: ${16 * scale}px 0 ${8 * scale}px 0;
        line-height: 1.3;
        break-after: avoid;
        page-break-after: avoid;
      }
      .word-pdf-wrapper h3 {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: ${15.5 * scale}px;
        font-weight: 700;
        color: #334155;
        margin: ${14 * scale}px 0 ${6 * scale}px 0;
        line-height: 1.35;
        break-after: avoid;
        page-break-after: avoid;
      }
      .word-pdf-wrapper p {
        margin: ${8 * scale}px 0;
        text-align: justify;
      }
      .word-pdf-wrapper table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin: ${14 * scale}px 0 !important;
        border: ${1.5 * scale}px solid #cbd5e1 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .word-pdf-wrapper th {
        background-color: #f1f5f9 !important;
        border: ${1 * scale}px solid #cbd5e1 !important;
        padding: ${8 * scale}px ${12 * scale}px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: ${12 * scale}px !important;
        font-weight: 700 !important;
        text-align: left !important;
        color: #1e293b !important;
      }
      .word-pdf-wrapper td {
        border: ${1 * scale}px solid #e2e8f0 !important;
        padding: ${7 * scale}px ${12 * scale}px !important;
        font-size: ${12 * scale}px !important;
        color: #334155 !important;
      }
      .word-pdf-wrapper blockquote {
        border-left: ${4 * scale}px solid #2563eb !important;
        padding: ${8 * scale}px ${16 * scale}px !important;
        margin: ${12 * scale}px 0 !important;
        background-color: #f8fafc !important;
        color: #1e3a8a !important;
        font-style: italic !important;
      }
      .word-pdf-wrapper pre {
        background-color: #f8fafc !important;
        border: ${1 * scale}px solid #e2e8f0 !important;
        border-radius: ${6 * scale}px !important;
        padding: ${10 * scale}px ${14 * scale}px !important;
        font-family: 'Courier New', Courier, monospace !important;
        font-size: ${12 * scale}px !important;
        overflow-x: hidden !important;
        white-space: pre-wrap !important;
        word-break: break-all !important;
      }
      .word-pdf-wrapper .katex-display,
      .word-pdf-wrapper .studyquest-math-block {
        text-align: center !important;
        margin: ${14 * scale}px 0 !important;
        padding: ${8 * scale}px 0 !important;
      }
      .word-pdf-wrapper img {
        max-width: 100% !important;
        height: auto !important;
        border-radius: ${6 * scale}px !important;
        margin: ${12 * scale}px auto !important;
        display: block !important;
      }
    `;

    const cleanTitle = (docName || 'Document').replace(/\.docx?$/i, '');

    container.innerHTML = `
      <style>${docStyles}</style>
      <div class="word-pdf-wrapper">
        ${
          includeHeaderFooter
            ? `
          <div class="word-pdf-header-band">
            <span>StudyQuest Academic Office</span>
            <span>${cleanTitle}</span>
          </div>
        `
            : ''
        }
        <div class="word-pdf-body">${htmlContent}</div>
      </div>
    `;

    viewport.appendChild(container);
    document.body.appendChild(viewport);

    // Ensure custom fonts are ready
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    // 4. Run Smart Page Break Analysis
    const containerTop = container.getBoundingClientRect().top;
    applySmartPageBreaks(container, containerTop, usablePageHeightPx);

    // Yield to render cycle
    await new Promise((r) => setTimeout(r, 40));

    // 5. Render High-DPI Canvas
    const canvas = await toCanvas(container, {
      pixelRatio: 1, // Already supersampled by renderWidthPx
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipAutoScale: true,
    });

    const totalRenderHeight = canvas.height;
    const numPages = Math.max(1, Math.ceil(totalRenderHeight / renderPageHeightPx));

    // 6. Assemble jsPDF Document
    const pdf = new jsPDF({
      orientation: isLandscape ? 'l' : 'p',
      unit: 'mm',
      format: isLetter ? 'letter' : 'a4',
      compress: true,
    });

    const marginMm = margins === 'narrow' ? 8 : margins === 'wide' ? 18 : 12;
    const printWidthMm = widthMm - marginMm * 2;
    const printHeightMm = heightMm - marginMm * 2;

    for (let page = 0; page < numPages; page++) {
      if (page > 0) {
        pdf.addPage(isLetter ? 'letter' : 'a4', isLandscape ? 'l' : 'p');
      }

      // Fill page background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, widthMm, heightMm, 'F');

      const srcY = page * renderPageHeightPx;
      const srcH = Math.min(renderPageHeightPx, totalRenderHeight - srcY);

      if (srcH <= 0) break;

      // Extract slice canvas for this page
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = renderWidthPx;
      pageCanvas.height = srcH;
      const ctx = pageCanvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, renderWidthPx, srcH);
        ctx.drawImage(canvas, 0, srcY, renderWidthPx, srcH, 0, 0, renderWidthPx, srcH);
      }

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      pageCanvas.width = 0;
      pageCanvas.height = 0;

      const destHeightMm = (srcH * printWidthMm) / renderWidthPx;
      pdf.addImage(imgData, 'JPEG', marginMm, marginMm, printWidthMm, destHeightMm, undefined, 'FAST');

      // Add Vector Footer (Page numbering)
      if (includeHeaderFooter) {
        pdf.setFontSize(8.5);
        pdf.setTextColor(100, 116, 139); // #64748b slate-500
        const footerY = heightMm - 5;
        pdf.text(`${cleanTitle}`, marginMm, footerY, { align: 'left' });
        pdf.text(`Page ${page + 1} of ${numPages}`, widthMm - marginMm, footerY, { align: 'right' });
      }
    }

    // Clean up canvas memory
    canvas.width = 0;
    canvas.height = 0;

    return pdf.output('blob');
  } finally {
    if (viewport && viewport.parentNode) {
      viewport.parentNode.removeChild(viewport);
    }
  }
}
