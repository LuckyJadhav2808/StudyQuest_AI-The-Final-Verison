/**
 * StudyQuest AI — Client-Side PDF Thumbnail Generator
 * Renders individual pages of a PDF to high-performance base64 image thumbnails
 */

export interface RenderedPdfThumbnail {
  pageIndex: number; // 0-based
  pageNumber: number; // 1-based
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Loads a PDF buffer and renders page thumbnails in-browser
 */
export async function renderPdfThumbnails(
  buffer: ArrayBuffer,
  maxPages: number = 100,
  targetWidth: number = 200
): Promise<RenderedPdfThumbnail[]> {
  if (typeof window === 'undefined') return [];

  const pdfjsLib = await import('pdfjs-dist');

  // Configure worker if not already configured
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    cMapUrl: 'https://unpkg.com/pdfjs-dist/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const thumbnails: RenderedPdfThumbnail[] = [];

  for (let i = 1; i <= pageCount; i++) {
    try {
      const page = await pdf.getPage(i);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const scale = targetWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        }).promise;
        thumbnails.push({
          pageIndex: i - 1,
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          width: canvas.width,
          height: canvas.height,
        });
      }
    } catch (err) {
      console.warn(`Failed rendering thumbnail for page ${i}`, err);
    }
  }

  return thumbnails;
}
