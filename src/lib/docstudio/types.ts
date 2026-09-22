export type StudioToolId = 'hub' | 'scanner' | 'pdf' | 'image' | 'csv' | 'redact' | 'office' | 'compressor' | 'converter';

export interface Point2D {
  x: number;
  y: number;
}

export type ScanFilterMode = 'magic' | 'bw' | 'color' | 'original';

export interface ScanPage {
  id: string;
  name: string;
  originalSrc: string;
  processedSrc: string;
  rotation: number; // 0, 90, 180, 270
  filterMode: ScanFilterMode;
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  corners?: [Point2D, Point2D, Point2D, Point2D]; // Top-left, Top-right, Bottom-right, Bottom-left
  width: number;
  height: number;
}

export type ImageCropAspect = 'free' | '1:1' | '4:3' | '16:9' | 'a4';

export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  savingsPercent: number;
}

export interface PdfPageMeta {
  pageIndex: number;
  rotation: number;
  selected: boolean;
  thumbnailUrl?: string;
}

export interface CsvDataset {
  headers: string[];
  rows: string[][];
  fileName: string;
}

export interface NumericColumnStats {
  count: number;
  sum: number;
  mean: number;
  min: number;
  max: number;
}

export interface RedactionBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  opacity: number;
  angle: number; // degrees
  color: string;
  repeat: boolean;
}

// ==========================================
// Microsoft Office Suite Domain Types
// ==========================================

export type OfficeSubTool = 'excel' | 'word' | 'pptx';

export interface ExcelSheetData {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface ExcelWorkbookData {
  fileName: string;
  sheetNames: string[];
  sheets: Record<string, ExcelSheetData>;
  activeSheetName: string;
}

export interface WordDocData {
  fileName: string;
  htmlContent: string;
  rawText: string;
  wordCount: number;
  characterCount: number;
  readingTimeMinutes: number;
}

export interface PptxSlide {
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  speakerNotes?: string;
  extractedImages?: string[]; // data URLs
}

export interface PptxDeckData {
  fileName: string;
  totalSlides: number;
  slides: PptxSlide[];
}

// ==========================================
// Universal Document Compression Types
// ==========================================

export type CompressionPreset = 'portal' | 'balanced' | 'high_quality';

export type UniversalDocType = 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'image' | 'csv' | 'unknown';

export interface DocumentCompressOptions {
  preset: CompressionPreset;
  quality?: number; // 0.1 to 1.0
  maxDimension?: number; // e.g. 1280, 1920
  pdfMode?: 'smart' | 'raster';
  targetKB?: number;
}

export interface CompressedDocumentResult {
  blob: Blob;
  originalBytes: number;
  compressedBytes: number;
  savingsPercent: number;
  fileName: string;
  fileType: UniversalDocType;
  extension: string;
  previewUrl?: string;
  summaryText: string;
}

// ==========================================
// Universal Document Conversion Types
// ==========================================

export type ConversionFormat = 
  | 'pdf' 
  | 'docx' 
  | 'xlsx' 
  | 'csv' 
  | 'txt' 
  | 'md' 
  | 'json' 
  | 'html' 
  | 'png' 
  | 'jpg' 
  | 'webp';

export interface ConversionTargetOption {
  format: ConversionFormat;
  label: string;
  extension: string;
  icon: string;
  badge: string;
  description: string;
}

export interface ConvertOptions {
  imageFormat?: 'png' | 'jpeg' | 'webp';
  quality?: number; // 0.1 to 1.0
  includeNotes?: boolean; // for pptx
  includeHeaders?: boolean; // for csv/xlsx
  orientation?: 'portrait' | 'landscape';
  onProgress?: (step: string, current: number, total: number) => void;
}

export interface ConvertedDocumentResult {
  blob: Blob;
  originalBytes: number;
  convertedBytes: number;
  fileName: string;
  sourceType: UniversalDocType;
  targetFormat: ConversionFormat;
  extension: string;
  previewUrl?: string;
  summaryText: string;
  dataUrl?: string;
}

