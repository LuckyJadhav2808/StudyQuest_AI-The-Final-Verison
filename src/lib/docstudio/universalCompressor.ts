/**
 * StudyQuest AI — Universal Document & File Compressor Engine
 * 100% Client-Side In-Browser Memory Execution (Zero Cloud Fees, Zero Server Uploads)
 * Supports: PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), Images (.png, .jpg, .webp), and CSV/Text
 */

import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import jsPDF from 'jspdf';
import {
  UniversalDocType,
  DocumentCompressOptions,
  CompressedDocumentResult,
} from './types';
import { formatBytes, optimizeImage, compressToTargetLimit } from './compressor';
import { createOffscreenCanvas, loadImage } from './imageEngine';
import { parseCsv, serializeCsv } from './csvEngine';

/**
 * Detect universal document type from file name and optional MIME type
 */
export function detectDocType(fileName: string, mimeType?: string): UniversalDocType {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

  if (ext === '.pdf' || mimeType === 'application/pdf') return 'pdf';
  if (ext === '.docx' || ext === '.doc') return 'docx';
  if (ext === '.pptx' || ext === '.ppt') return 'pptx';
  if (ext === '.xlsx' || ext === '.xls') return 'xlsx';
  if (['.png', '.jpg', '.jpeg', '.webp', '.bmp'].includes(ext) || mimeType?.startsWith('image/')) return 'image';
  if (['.csv', '.tsv', '.txt', '.json', '.md'].includes(ext) || mimeType?.includes('csv') || mimeType?.includes('text')) return 'csv';

  return 'unknown';
}

/**
 * Downscale and compress an image ArrayBuffer inside a ZIP container (for DOCX/PPTX media)
 */
async function downscaleImageBuffer(
  buffer: ArrayBuffer,
  originalExt: string,
  quality: number,
  maxDimension: number
): Promise<Uint8Array> {
  if (typeof window === 'undefined') return new Uint8Array(buffer);

  try {
    const blob = new Blob([buffer]);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const img = await loadImage(dataUrl);
    let { naturalWidth: width, naturalHeight: height } = img;

    if (width <= 0 || height <= 0) return new Uint8Array(buffer);

    // Calculate proportional downscaling
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const { canvas, ctx } = createOffscreenCanvas(width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Export as JPEG for high compression ratio
    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64Data = compressedDataUrl.split(',')[1];
    if (!base64Data) return new Uint8Array(buffer);

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8[i] = binaryString.charCodeAt(i);
    }

    // Only return the compressed version if it is genuinely smaller than the original
    if (u8.byteLength < buffer.byteLength) {
      return u8;
    }
    return new Uint8Array(buffer);
  } catch (err) {
    console.warn('Could not downsample embedded image, keeping original', err);
    return new Uint8Array(buffer);
  }
}

/**
 * 1. Word Document (.docx) Compression
 * Unpacks the DOCX zip container, downsamples oversized images in word/media/, and repacks with Deflate level 9.
 */
export async function compressDocx(buffer: ArrayBuffer, options: DocumentCompressOptions): Promise<Blob> {
  const zip = await JSZip.loadAsync(buffer);

  const quality = options.preset === 'portal' ? 0.65 : options.preset === 'high_quality' ? 0.88 : 0.78;
  const maxDim = options.preset === 'portal' ? 1280 : options.preset === 'high_quality' ? 1920 : 1600;

  const mediaFiles = Object.keys(zip.files).filter(
    (name) =>
      name.startsWith('word/media/') &&
      (name.endsWith('.png') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.jpg') ||
        name.endsWith('.webp') ||
        name.endsWith('.tiff') ||
        name.endsWith('.bmp'))
  );

  for (const fileName of mediaFiles) {
    const file = zip.files[fileName];
    if (!file || file.dir) continue;

    const fileBuffer = await file.async('arraybuffer');
    // Only compress images that are larger than 40 KB
    if (fileBuffer.byteLength > 40 * 1024) {
      const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
      const compressedU8 = await downscaleImageBuffer(fileBuffer, ext, quality, maxDim);
      zip.file(fileName, compressedU8);
    }
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 2. PowerPoint Presentation (.pptx) Compression
 * Unpacks PPTX zip container, optimizes slide images in ppt/media/, and repacks with Deflate level 9.
 */
export async function compressPptx(buffer: ArrayBuffer, options: DocumentCompressOptions): Promise<Blob> {
  const zip = await JSZip.loadAsync(buffer);

  const quality = options.preset === 'portal' ? 0.65 : options.preset === 'high_quality' ? 0.85 : 0.75;
  const maxDim = options.preset === 'portal' ? 1280 : options.preset === 'high_quality' ? 1920 : 1600;

  const mediaFiles = Object.keys(zip.files).filter(
    (name) =>
      name.startsWith('ppt/media/') &&
      (name.endsWith('.png') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.jpg') ||
        name.endsWith('.webp') ||
        name.endsWith('.tiff') ||
        name.endsWith('.bmp'))
  );

  for (const fileName of mediaFiles) {
    const file = zip.files[fileName];
    if (!file || file.dir) continue;

    const fileBuffer = await file.async('arraybuffer');
    if (fileBuffer.byteLength > 40 * 1024) {
      const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
      const compressedU8 = await downscaleImageBuffer(fileBuffer, ext, quality, maxDim);
      zip.file(fileName, compressedU8);
    }
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
}

/**
 * 3. Excel Spreadsheet (.xlsx) Compression
 * Repacks XML tables with maximum Deflate level 9.
 */
export async function compressXlsx(buffer: ArrayBuffer): Promise<Blob> {
  const zip = await JSZip.loadAsync(buffer);

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * 4. PDF Document Compression
 * Supports Smart Vector Stream Optimization (Zero loss) and Extreme Portal Squeeze (Canvas JPEG rasterization).
 */
export async function compressPdf(buffer: ArrayBuffer, options: DocumentCompressOptions): Promise<Blob> {
  const isPortalMode = options.preset === 'portal' || options.pdfMode === 'raster';

  // Mode A: Smart Vector Stream Optimization (lossless for text/vectors)
  if (!isPortalMode) {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      // Strip unnecessary bloat metadata
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('StudyQuest PDF Engine');
      pdfDoc.setCreator('StudyQuest AI');

      const savedBytes = await pdfDoc.save({ useObjectStreams: true });
      const smartBlob = new Blob([savedBytes as unknown as BlobPart], { type: 'application/pdf' });

      // If smart stream saved noticeable space, return it; otherwise, if user wants balanced, proceed to canvas squeeze if desired
      if (smartBlob.size < buffer.byteLength * 0.95 || options.pdfMode === 'smart') {
        return smartBlob;
      }
    } catch (e) {
      console.warn('Smart PDF compaction skipped, falling back to rasterization', e);
    }
  }

  // Mode B: Extreme Portal Squeeze (Canvas & JPEG Rasterization)
  if (typeof window === 'undefined') {
    return new Blob([buffer], { type: 'application/pdf' });
  }

  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    cMapUrl: 'https://unpkg.com/pdfjs-dist/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const targetScale = options.preset === 'portal' ? 0.9 : 1.25;
  const jpegQuality = options.preset === 'portal' ? 0.6 : 0.75;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (page.render({ canvasContext: ctx as any, viewport } as any)).promise;

    const imgDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);

    if (pageNum > 1) {
      doc.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'l' : 'p');
    } else {
      // Re-set initial page size to match first page aspect
      doc.deletePage(1);
      doc.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'l' : 'p');
    }

    doc.addImage(imgDataUrl, 'JPEG', 0, 0, viewport.width, viewport.height, undefined, 'FAST');
  }

  return doc.output('blob');
}

/**
 * 5. Image Compression
 */
export async function compressImageDocument(file: File, options: DocumentCompressOptions): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await loadImage(dataUrl);
  const { canvas, ctx } = createOffscreenCanvas(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);

  if (options.preset === 'portal' && options.targetKB) {
    const solved = await compressToTargetLimit(img, options.targetKB, 'image/jpeg');
    return solved.blob;
  }

  const quality = options.preset === 'portal' ? 0.65 : options.preset === 'high_quality' ? 0.88 : 0.78;
  const result = await optimizeImage(canvas, file.size, 'image/jpeg', quality);
  return result.blob;
}

/**
 * 6. CSV / Tabular Data Compression
 */
export async function compressCsvDocument(file: File): Promise<Blob> {
  const text = await file.text();
  const parsed = parseCsv(text);
  const cleanCsv = serializeCsv(parsed.headers, parsed.rows);
  return new Blob([cleanCsv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Universal Dispatcher: Compresses ANY supported document client-side
 */
export async function compressAnyDocument(
  file: File,
  options: DocumentCompressOptions
): Promise<CompressedDocumentResult> {
  const docType = detectDocType(file.name, file.type);
  const originalBytes = file.size;
  const buffer = await file.arrayBuffer();

  let compressedBlob: Blob;
  let extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

  switch (docType) {
    case 'docx':
      compressedBlob = await compressDocx(buffer, options);
      extension = '.docx';
      break;

    case 'pptx':
      compressedBlob = await compressPptx(buffer, options);
      extension = '.pptx';
      break;

    case 'xlsx':
      compressedBlob = await compressXlsx(buffer);
      extension = '.xlsx';
      break;

    case 'pdf':
      compressedBlob = await compressPdf(buffer, options);
      extension = '.pdf';
      break;

    case 'image':
      compressedBlob = await compressImageDocument(file, options);
      extension = '.jpg';
      break;

    case 'csv':
      compressedBlob = await compressCsvDocument(file);
      extension = '.csv';
      break;

    default: {
      // Fallback: maximum Deflate zip compression
      const zip = new JSZip();
      zip.file(file.name, buffer);
      compressedBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });
      extension = '.zip';
      break;
    }
  }

  const compressedBytes = compressedBlob.size;
  const savingsPercent =
    originalBytes > 0
      ? Math.max(0, Math.round(((originalBytes - compressedBytes) / originalBytes) * 100))
      : 0;

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const finalFileName = `${baseName}_compressed${extension}`;

  const summaryText =
    savingsPercent > 0
      ? `Shrunk from ${formatBytes(originalBytes)} to ${formatBytes(compressedBytes)} (${savingsPercent}% saved)`
      : `Optimized structure (${formatBytes(compressedBytes)})`;

  return {
    blob: compressedBlob,
    originalBytes,
    compressedBytes,
    savingsPercent,
    fileName: finalFileName,
    fileType: docType,
    extension,
    summaryText,
  };
}
