import { PDFDocument, degrees } from 'pdf-lib';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

/**
 * Merges multiple PDF ArrayBuffers into a single unified PDF
 */
export async function mergePdfDocuments(pdfBuffers: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const donorPdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  return await mergedPdf.save();
}

/**
 * Extracts specified 0-based page indices from a PDF into a new PDF
 */
export async function splitAndExtractPages(
  sourcePdfBuffer: ArrayBuffer,
  pageIndicesToKeep: number[]
): Promise<Uint8Array> {
  const sourcePdf = await PDFDocument.load(sourcePdfBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  const validIndices = pageIndicesToKeep.filter(
    (idx) => idx >= 0 && idx < sourcePdf.getPageCount()
  );

  if (validIndices.length === 0) {
    throw new Error('At least one valid page must be selected to extract a PDF');
  }

  const copiedPages = await newPdf.copyPages(sourcePdf, validIndices);
  for (const page of copiedPages) {
    newPdf.addPage(page);
  }

  return await newPdf.save();
}

/**
 * Rotates specific pages or all pages of a PDF by delta degrees (e.g. 90, 180, 270)
 */
export async function rotatePdfPages(
  sourcePdfBuffer: ArrayBuffer,
  pageRotations: Record<number, number>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(sourcePdfBuffer, { ignoreEncryption: true });
  const total = pdfDoc.getPageCount();

  for (let i = 0; i < total; i++) {
    const delta = pageRotations[i] || 0;
    if (delta !== 0) {
      const page = pdfDoc.getPage(i);
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + delta) % 360));
    }
  }

  return await pdfDoc.save();
}

/**
 * Reorders pages in a PDF based on an array of 0-based page indices
 */
export async function reorderPdfDocument(
  sourcePdfBuffer: ArrayBuffer,
  newOrderIndices: number[]
): Promise<Uint8Array> {
  const sourcePdf = await PDFDocument.load(sourcePdfBuffer, { ignoreEncryption: true });
  const reorderedPdf = await PDFDocument.create();

  const totalPages = sourcePdf.getPageCount();
  const validIndices = newOrderIndices.filter((idx) => idx >= 0 && idx < totalPages);
  if (validIndices.length === 0) {
    throw new Error('At least one valid page index is required to reorder a PDF');
  }

  const copiedPages = await reorderedPdf.copyPages(sourcePdf, validIndices);
  for (const page of copiedPages) {
    reorderedPdf.addPage(page);
  }

  return await reorderedPdf.save();
}

/**
 * Returns the page count of a PDF
 */
export async function getPdfPageCount(buffer: ArrayBuffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

/**
 * Compiles an array of processed homework scan image data URLs into a clean A4 PDF
 * Preloads all images deterministically to eliminate async race conditions during page assembly.
 */
export async function compileScanPagesToPdf(
  pages: { processedSrc: string; rotation?: number }[]
): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error('No pages to compile into PDF');
  }

  // Preload all images deterministically
  const loadedImages: HTMLImageElement[] = await Promise.all(
    pages.map((p) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load page image for PDF compilation'));
        img.src = p.processedSrc;
      });
    })
  );

  // A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const a4Width = 210;
  const a4Height = 297;
  const margin = 8; // 8mm neat margin
  const printW = a4Width - margin * 2;
  const printH = a4Height - margin * 2;

  loadedImages.forEach((img, idx) => {
    if (idx > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // Calculate aspect ratio fitting inside printable area
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const targetRatio = printW / printH;

    let drawW = printW;
    let drawH = printH;
    let offsetX = margin;
    let offsetY = margin;

    if (imgRatio > targetRatio) {
      // Wider than A4
      drawH = printW / imgRatio;
      offsetY = margin + (printH - drawH) / 2;
    } else {
      // Taller than A4
      drawW = printH * imgRatio;
      offsetX = margin + (printW - drawW) / 2;
    }

    pdf.addImage(img, 'JPEG', offsetX, offsetY, drawW, drawH, undefined, 'FAST');
  });

  return pdf.output('blob');
}

/**
 * Packages an array of image blobs/dataUrls into a downloadable ZIP archive
 */
export async function packageImagesToZip(
  images: { name: string; dataUrl: string }[]
): Promise<Blob> {
  const zip = new JSZip();

  for (const img of images) {
    const base64Data = img.dataUrl.split(',')[1] || img.dataUrl;
    zip.file(img.name, base64Data, { base64: true });
  }

  return await zip.generateAsync({ type: 'blob' });
}
