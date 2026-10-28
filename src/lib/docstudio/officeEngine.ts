import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer,
} from 'docx';
import { ExcelWorkbookData, ExcelSheetData, WordDocData, PptxDeckData, PptxSlide } from './types';

// ============================================================
// 1. EXCEL SPREADSHEET ENGINE (.xlsx, .xls, .csv)
// ============================================================

/**
 * Reads an Excel workbook (.xlsx, .xls) and parses all worksheets into tabular data
 */
export function readExcelWorkbook(buffer: ArrayBuffer, fileName: string): ExcelWorkbookData {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetNames = wb.SheetNames;

  if (sheetNames.length === 0) {
    return {
      fileName,
      sheetNames: ['Sheet1'],
      sheets: {
        Sheet1: { name: 'Sheet1', headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', '']] },
      },
      activeSheetName: 'Sheet1',
    };
  }

  const sheets: Record<string, ExcelSheetData> = {};

  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    const rawAoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (!rawAoa || rawAoa.length === 0) {
      sheets[name] = { name, headers: ['A', 'B', 'C'], rows: [['', '', '']] };
      continue;
    }

    const firstRow = rawAoa[0] || [];
    const maxCols = Math.max(
      firstRow.length,
      ...rawAoa.map((r) => (Array.isArray(r) ? r.length : 0))
    );

    const headers: string[] = [];
    for (let c = 0; c < maxCols; c++) {
      const val = firstRow[c];
      headers.push(val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : `Col ${c + 1}`);
    }

    const dataRows = rawAoa.slice(1);
    const rows: string[][] = dataRows.map((r) => {
      const rowArr: string[] = [];
      for (let c = 0; c < maxCols; c++) {
        const val = r[c];
        rowArr.push(val !== undefined && val !== null ? String(val) : '');
      }
      return rowArr;
    });

    sheets[name] = {
      name,
      headers,
      rows: rows.length > 0 ? rows : [new Array(maxCols).fill('')],
    };
  }

  return {
    fileName,
    sheetNames,
    sheets,
    activeSheetName: sheetNames[0],
  };
}

/**
 * Serializes a multi-sheet dataset back into a downloadable Excel .xlsx binary buffer
 */
export function exportExcelWorkbook(workbook: ExcelWorkbookData): Uint8Array {
  const wb = XLSX.utils.book_new();

  for (const name of workbook.sheetNames) {
    const sheetData = workbook.sheets[name];
    if (!sheetData) continue;

    const aoa = [sheetData.headers, ...sheetData.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31)); // Excel max sheet name length is 31
  }

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

// ============================================================
// 2. WORD DOCUMENT ENGINE (.docx, .doc)
// ============================================================

/**
 * Converts a Word (.docx) document ArrayBuffer into clean HTML and extracts statistics
 */
export async function readWordDocument(buffer: ArrayBuffer, fileName: string): Promise<WordDocData> {
  const options = {
    styleMap: [
      "br[type='page'] => hr.page-break:fresh",
    ],
  };
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer }, options);
  const htmlContent = result.value || '<p>No readable content found in document.</p>';

  // Strip tags to get raw text for telemetry safely
  let rawText = '';
  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    rawText = tempDiv.textContent || tempDiv.innerText || '';
  } else {
    rawText = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const words = rawText.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const characterCount = rawText.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200)); // Average reading speed 200 wpm

  return {
    fileName,
    htmlContent,
    rawText,
    wordCount,
    characterCount,
    readingTimeMinutes,
  };
}

/**
 * Packages HTML content into a Word-compatible .doc file Blob
 */
export function exportHtmlToWordBlob(htmlContent: string, fileName: string): Blob {
  const title = fileName.replace(/\.[^/.]+$/, '');
  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.5; color: #1f2937; margin: 1in; }
          h1 { font-size: 18pt; color: #111827; margin-bottom: 8pt; }
          h2 { font-size: 14pt; color: #374151; margin-bottom: 6pt; }
          h3 { font-size: 12pt; color: #4b5563; }
          table { border-collapse: collapse; width: 100%; margin-top: 10pt; }
          th, td { border: 1px solid #d1d5db; padding: 6pt; text-align: left; }
          th { background-color: #f3f4f6; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;
  return new Blob([wordHtml], { type: 'application/msword' });
}

/**
 * High-Fidelity Binary Microsoft Word (.docx) generator
 * Serializes rich-text HTML into an authentic OpenXML .docx binary Blob using pure client-side docx.
 */
export async function exportHtmlToDocxBinary(htmlContent: string, fileName: string): Promise<Blob> {
  if (typeof document === 'undefined') {
    return exportHtmlToWordBlob(htmlContent, fileName);
  }

  try {
    const parser = new DOMParser();
    const docDom = parser.parseFromString(htmlContent, 'text/html');
    const body = docDom.body;
    const children: (Paragraph | Table)[] = [];

    const processNode = (node: Node): TextRun[] => {
      const runs: TextRun[] = [];
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text) {
          runs.push(new TextRun({ text, font: 'Calibri' }));
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        const isBold = tagName === 'strong' || tagName === 'b';
        const isItalic = tagName === 'em' || tagName === 'i';
        const isUnderline = tagName === 'u';
        const isCode = tagName === 'code';

        for (let i = 0; i < el.childNodes.length; i++) {
          const childRuns = processNode(el.childNodes[i]);
          for (const cr of childRuns) {
            runs.push(
              new TextRun({
                text: (cr as any).text || '',
                bold: isBold,
                italics: isItalic,
                underline: isUnderline ? {} : undefined,
                font: isCode ? 'Consolas' : 'Calibri',
              })
            );
          }
        }
      }
      return runs;
    };

    for (let i = 0; i < body.children.length; i++) {
      const el = body.children[i] as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'h1') {
        children.push(new Paragraph({ text: el.textContent || '', heading: HeadingLevel.HEADING_1 }));
      } else if (tag === 'h2') {
        children.push(new Paragraph({ text: el.textContent || '', heading: HeadingLevel.HEADING_2 }));
      } else if (tag === 'h3') {
        children.push(new Paragraph({ text: el.textContent || '', heading: HeadingLevel.HEADING_3 }));
      } else if (tag === 'table') {
        const tableRows: TableRow[] = [];
        const trs = el.querySelectorAll('tr');
        trs.forEach((tr) => {
          const cells: TableCell[] = [];
          const tds = tr.querySelectorAll('th, td');
          tds.forEach((td) => {
            cells.push(
              new TableCell({
                children: [new Paragraph({ text: td.textContent || '' })],
                width: { size: Math.round(100 / Math.max(1, tds.length)), type: WidthType.PERCENTAGE },
              })
            );
          });
          if (cells.length > 0) {
            tableRows.push(new TableRow({ children: cells }));
          }
        });
        if (tableRows.length > 0) {
          children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        }
      } else if (tag === 'ul' || tag === 'ol') {
        const lis = el.querySelectorAll('li');
        lis.forEach((li) => {
          children.push(
            new Paragraph({
              text: li.textContent || '',
              bullet: { level: 0 },
            })
          );
        });
      } else {
        const runs = processNode(el);
        children.push(new Paragraph({ children: runs.length > 0 ? runs : [new TextRun(el.textContent || '')] }));
      }
    }

    if (children.length === 0) {
      children.push(new Paragraph({ text: body.textContent || 'Empty Document' }));
    }

    const docxFile = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    return await Packer.toBlob(docxFile);
  } catch (err) {
    console.warn('[officeEngine] Binary docx generation fallback to HTML .doc:', err);
    return exportHtmlToWordBlob(htmlContent, fileName);
  }
}

// ============================================================
// 3. POWERPOINT SLIDE DECK ENGINE (.pptx)
// ============================================================

/**
 * Parses a PowerPoint presentation (.pptx) ZIP archive into structured slides, bullets & notes
 */
export async function readPptxDeck(buffer: ArrayBuffer, fileName: string): Promise<PptxDeckData> {
  const zip = await JSZip.loadAsync(buffer);
  const parser = new DOMParser();

  // Find all slide XML files (e.g. ppt/slides/slide1.xml)
  const slidePaths: string[] = [];
  zip.forEach((relativePath) => {
    if (/^ppt\/slides\/slide\d+\.xml$/i.test(relativePath)) {
      slidePaths.push(relativePath);
    }
  });

  // Sort slides numerically by slide number
  slidePaths.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
    const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
    return numA - numB;
  });

  // Extract embedded media images (ppt/media/image1.png, etc.)
  const mediaMap: Record<string, string> = {};
  for (const [relPath, zipEntry] of Object.entries(zip.files)) {
    if (/^ppt\/media\//i.test(relPath) && !zipEntry.dir) {
      try {
        const imgBlob = await zipEntry.async('blob');
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          const timer = setTimeout(() => resolve(''), 1500);
          reader.onload = (e) => {
            clearTimeout(timer);
            resolve((e.target?.result as string) || '');
          };
          reader.onerror = () => {
            clearTimeout(timer);
            resolve('');
          };
          reader.readAsDataURL(imgBlob);
        });
        if (dataUrl) mediaMap[relPath] = dataUrl;
      } catch (err) {
        console.warn(`Failed reading media ${relPath}`, err);
      }
    }
  }

  const slides: PptxSlide[] = [];

  for (let idx = 0; idx < slidePaths.length; idx++) {
    const path = slidePaths[idx];
    const slideNum = idx + 1;
    const xmlText = await zip.file(path)?.async('text');
    if (!xmlText) continue;

    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    // Extract text paragraphs (a:p) and runs (a:t)
    const paragraphs = xmlDoc.getElementsByTagName('a:p');
    const lines: string[] = [];

    for (let p = 0; p < paragraphs.length; p++) {
      const textNodes = paragraphs[p].getElementsByTagName('a:t');
      let pText = '';
      for (let t = 0; t < textNodes.length; t++) {
        pText += textNodes[t].textContent || '';
      }
      pText = pText.trim();
      if (pText.length > 0) {
        lines.push(pText);
      }
    }

    const title = lines.length > 0 ? lines[0] : `Slide ${slideNum}`;
    const bulletPoints = lines.length > 1 ? lines.slice(1) : [];

    // Check for speaker notes (ppt/notesSlides/notesSlide{N}.xml)
    let speakerNotes: string | undefined = undefined;
    const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    const notesFile = zip.file(notesPath);
    if (notesFile) {
      const notesXml = await notesFile.async('text');
      const notesDoc = parser.parseFromString(notesXml, 'application/xml');
      const noteTexts = notesDoc.getElementsByTagName('a:t');
      let notesAccum = '';
      for (let n = 0; n < noteTexts.length; n++) {
        notesAccum += (noteTexts[n].textContent || '') + ' ';
      }
      if (notesAccum.trim().length > 0) {
        speakerNotes = notesAccum.trim();
      }
    }

    // Extract diagrams specific to this slide via relationships
    const slideImages: string[] = [];
    const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const relsFile = zip.file(relsPath);
    if (relsFile) {
      const relsXml = await relsFile.async('text');
      const matches = relsXml.matchAll(/Target="(?:\.\.\/)?media\/([^"]+)"/g);
      for (const m of matches) {
        const fullKey = `ppt/media/${m[1]}`;
        if (mediaMap[fullKey]) {
          slideImages.push(mediaMap[fullKey]);
        }
      }
    }

    slides.push({
      slideNumber: slideNum,
      title,
      bulletPoints,
      speakerNotes,
      extractedImages: slideImages.length > 0 ? slideImages : undefined,
    });
  }

  return {
    fileName,
    totalSlides: slides.length,
    slides:
      slides.length > 0
        ? slides
        : [
            {
              slideNumber: 1,
              title: fileName.replace(/\.[^/.]+$/, ''),
              bulletPoints: ['Empty presentation or protected XML structure.'],
            },
          ],
  };
}

/**
 * Compiles PowerPoint presentation slides & speaker notes into a clean landscape study PDF handout
 */
export function compilePptxToStudyPdf(deck: PptxDeckData): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Landscape A4 dimensions in mm: 297 x 210
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 16;

      deck.slides.forEach((slide, idx) => {
        if (idx > 0) {
          pdf.addPage('a4', 'landscape');
        }

        // Header Card / Slide Header
        pdf.setFillColor(243, 244, 246);
        pdf.roundedRect(margin, margin, pageWidth - margin * 2, 24, 3, 3, 'F');

        pdf.setFontSize(10);
        pdf.setTextColor(234, 88, 12); // Orange theme
        pdf.text(`SLIDE ${slide.slideNumber} OF ${deck.totalSlides}`, margin + 6, margin + 7);

        pdf.setFontSize(13);
        pdf.setTextColor(17, 24, 39);
        const titleLines = pdf.splitTextToSize(slide.title, pageWidth - margin * 2 - 12);
        pdf.text(titleLines.slice(0, 2), margin + 6, margin + 16);

        // Slide Bullet Points
        let currentY = margin + 34;
        pdf.setFontSize(11);
        pdf.setTextColor(55, 65, 81);

        if (slide.bulletPoints.length > 0) {
          slide.bulletPoints.slice(0, 12).forEach((bullet) => {
            pdf.setFillColor(234, 88, 12); // Orange bullets
            pdf.circle(margin + 5, currentY - 1.5, 1.2, 'F');

            const splitLines = pdf.splitTextToSize(bullet, pageWidth - margin * 2 - 18);
            pdf.text(splitLines, margin + 9, currentY);
            currentY += Math.max(splitLines.length * 6, 7.5);
          });
        } else {
          pdf.setTextColor(156, 163, 175);
          pdf.text('(No text content on this slide)', margin + 6, currentY);
          currentY += 10;
        }

        // Speaker Notes Box (if available)
        if (slide.speakerNotes) {
          currentY = Math.max(currentY + 6, pageHeight - 50);
          pdf.setFillColor(254, 243, 199);
          pdf.setDrawColor(252, 211, 77);
          pdf.roundedRect(margin, currentY, pageWidth - margin * 2, 30, 2, 2, 'FD');

          pdf.setFontSize(8);
          pdf.setTextColor(180, 83, 9);
          pdf.text('SPEAKER / PROFESSOR NOTES:', margin + 4, currentY + 6);

          pdf.setFontSize(9);
          pdf.setTextColor(120, 53, 15);
          const splitNotes = pdf.splitTextToSize(slide.speakerNotes, pageWidth - margin * 2 - 10);
          pdf.text(splitNotes.slice(0, 3), margin + 4, currentY + 12);
        }

        // Footer Telemetry
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(
          `${deck.fileName} • StudyQuest DocStudio Slide Handout`,
          margin,
          pageHeight - 6
        );
      });

      resolve(pdf.output('blob'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Creates and appends a new blank slide to a PowerPoint deck
 */
export function createNewPptxSlide(deck: PptxDeckData, title = 'New Slide'): PptxDeckData {
  const newSlideNum = deck.slides.length + 1;
  const newSlide: PptxSlide = {
    slideNumber: newSlideNum,
    title,
    bulletPoints: ['Click to edit bullet points', 'Add key study concepts or lecture takeaways'],
    speakerNotes: '',
  };
  return {
    ...deck,
    totalSlides: deck.totalSlides + 1,
    slides: [...deck.slides, newSlide],
  };
}

/**
 * Updates a specific slide's title, bullets, or notes in the deck
 */
export function updatePptxSlide(
  deck: PptxDeckData,
  slideIdx: number,
  updates: Partial<PptxSlide>
): PptxDeckData {
  const newSlides = deck.slides.map((s, idx) => (idx === slideIdx ? { ...s, ...updates } : s));
  return {
    ...deck,
    slides: newSlides,
  };
}

/**
 * Deletes a slide from the deck and re-indexes remaining slide numbers
 */
export function deletePptxSlide(deck: PptxDeckData, slideIdx: number): PptxDeckData {
  if (deck.slides.length <= 1) return deck;
  const newSlides = deck.slides
    .filter((_, idx) => idx !== slideIdx)
    .map((s, idx) => ({ ...s, slideNumber: idx + 1 }));
  return {
    ...deck,
    totalSlides: newSlides.length,
    slides: newSlides,
  };
}
