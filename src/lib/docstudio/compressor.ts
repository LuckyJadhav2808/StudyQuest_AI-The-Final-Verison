import { CompressionResult, ImageCropAspect, ImageFormat } from './types';
import { createOffscreenCanvas, loadImage } from './imageEngine';

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(sizes.length - 1, Math.max(0, Math.floor(Math.log(bytes) / Math.log(k))));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Converts a canvas to a Blob with specified format and quality
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat = 'image/jpeg',
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas blob generation failed'));
      },
      format,
      quality
    );
  });
}

/**
 * Crops a canvas to the specified bounding box
 */
export function cropCanvas(
  sourceCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  cropWidth: number,
  cropHeight: number
): HTMLCanvasElement {
  const { canvas, ctx } = createOffscreenCanvas(cropWidth, cropHeight);
  ctx.drawImage(sourceCanvas, x, y, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return canvas;
}

/**
 * Calculates crop dimensions for standard preset aspect ratios
 */
export function getAspectDimensions(
  aspect: ImageCropAspect,
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  if (aspect === 'free') return { width: originalWidth, height: originalHeight };

  let targetRatio = 1;
  if (aspect === '1:1') targetRatio = 1;
  else if (aspect === '4:3') targetRatio = 4 / 3;
  else if (aspect === '16:9') targetRatio = 16 / 9;
  else if (aspect === 'a4') targetRatio = 1 / 1.414; // Portrait A4

  const origRatio = originalWidth / originalHeight;

  if (origRatio > targetRatio) {
    return {
      width: Math.round(originalHeight * targetRatio),
      height: originalHeight,
    };
  } else {
    return {
      width: originalWidth,
      height: Math.round(originalWidth / targetRatio),
    };
  }
}

/**
 * Flips a canvas horizontally or vertically
 */
export function flipCanvas(
  sourceCanvas: HTMLCanvasElement,
  horizontal: boolean,
  vertical: boolean
): HTMLCanvasElement {
  const { canvas, ctx } = createOffscreenCanvas(sourceCanvas.width, sourceCanvas.height);
  ctx.translate(horizontal ? sourceCanvas.width : 0, vertical ? sourceCanvas.height : 0);
  ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
  ctx.drawImage(sourceCanvas, 0, 0);
  return canvas;
}

/**
 * Compresses an image with smart quality optimization and calculates size savings
 */
export async function optimizeImage(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  originalByteSize: number,
  format: ImageFormat = 'image/jpeg',
  quality: number = 0.8
): Promise<CompressionResult> {
  let canvas: HTMLCanvasElement;
  if (imageSource instanceof HTMLCanvasElement) {
    canvas = imageSource;
  } else {
    const pair = createOffscreenCanvas(imageSource.naturalWidth, imageSource.naturalHeight);
    pair.ctx.drawImage(imageSource, 0, 0);
    canvas = pair.canvas;
  }

  const blob = await canvasToBlob(canvas, format, quality);
  const dataUrl = canvas.toDataURL(format, quality);
  const compressedBytes = blob.size;
  const savings =
    originalByteSize > 0
      ? Math.max(0, Math.round(((originalByteSize - compressedBytes) / originalByteSize) * 100))
      : 0;

  return {
    blob,
    dataUrl,
    originalBytes: originalByteSize,
    compressedBytes,
    width: canvas.width,
    height: canvas.height,
    savingsPercent: savings,
  };
}

/**
 * Automatically solves for target file size limit (e.g. < 500 KB for LMS uploads)
 * using binary search over quality and scale down if needed.
 */
export async function compressToTargetLimit(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  targetLimitKB: number,
  format: ImageFormat = 'image/jpeg'
): Promise<CompressionResult> {
  const targetBytes = targetLimitKB * 1024;
  const origW = imageSource instanceof HTMLImageElement ? imageSource.naturalWidth : imageSource.width;
  const origH = imageSource instanceof HTMLImageElement ? imageSource.naturalHeight : imageSource.height;

  let bestBlob: Blob | null = null;
  let bestDataUrl: string = '';
  let scale = 1.0;

  for (let iteration = 0; iteration < 3; iteration++) {
    const currentW = Math.round(origW * scale);
    const currentH = Math.round(origH * scale);
    const { canvas, ctx } = createOffscreenCanvas(currentW, currentH);
    ctx.drawImage(imageSource, 0, 0, currentW, currentH);

    // Binary search quality between 0.1 and 0.95
    let lowQ = 0.1;
    let highQ = 0.95;
    let optimalQuality = 0.8;

    for (let qStep = 0; qStep < 6; qStep++) {
      const midQ = (lowQ + highQ) / 2;
      const testBlob = await canvasToBlob(canvas, format, midQ);

      if (testBlob.size <= targetBytes) {
        optimalQuality = midQ;
        bestBlob = testBlob;
        bestDataUrl = canvas.toDataURL(format, midQ);
        lowQ = midQ; // Try to get higher quality while still under target
      } else {
        highQ = midQ; // File too large, reduce quality
      }
    }

    if (bestBlob && bestBlob.size <= targetBytes) {
      break;
    }

    // Still too large, scale down image dimensions by 25% and retry
    scale *= 0.75;
  }

  // Fallback if not met
  if (!bestBlob) {
    const { canvas, ctx } = createOffscreenCanvas(Math.round(origW * 0.5), Math.round(origH * 0.5));
    ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
    bestBlob = await canvasToBlob(canvas, format, 0.4);
    bestDataUrl = canvas.toDataURL(format, 0.4);
  }

  let baselineCanvas: HTMLCanvasElement;
  if (imageSource instanceof HTMLCanvasElement) {
    baselineCanvas = imageSource;
  } else {
    const pair = createOffscreenCanvas(origW, origH);
    pair.ctx.drawImage(imageSource, 0, 0);
    baselineCanvas = pair.canvas;
  }

  const rawTest = await canvasToBlob(baselineCanvas, 'image/jpeg', 0.95);
  const origSize = Math.max(bestBlob.size, rawTest.size);
  const savings =
    origSize > 0 ? Math.max(0, Math.round(((origSize - bestBlob.size) / origSize) * 100)) : 0;

  return {
    blob: bestBlob,
    dataUrl: bestDataUrl,
    originalBytes: origSize,
    compressedBytes: bestBlob.size,
    width: Math.round(origW * scale),
    height: Math.round(origH * scale),
    savingsPercent: savings,
  };
}
