import { Point2D, ScanFilterMode } from './types';

/**
 * Loads an image from a URL or data URI safely into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image: ' + err));
    img.src = src;
  });
}

/**
 * Creates an in-memory canvas of specified dimensions
 */
export function createOffscreenCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not acquire 2D canvas context');
  }
  return { canvas, ctx };
}

/**
 * CamScanner-style "Magic Clean" adaptive contrast algorithm.
 * Whitens gray/yellow desk shadows and paper creases while darkening pen & pencil ink.
 */
export function applyMagicClean(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  brightnessOffset: number = 0,
  contrastOffset: number = 0
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  const safeContrast = Math.max(-250, Math.min(250, contrastOffset));
  const contrastFactor = (259 * (safeContrast + 255)) / (255 * (259 - safeContrast));

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Perceptual grayscale luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    let targetLum: number;
    // Magic Clean piecewise curve:
    // If pixel is background paper (> 150), stretch to pure white (255).
    // If pixel is ink (< 130), push toward black.
    if (lum > 160) {
      // Paper background whitening
      const ratio = (lum - 160) / 95; // 0 to 1
      targetLum = 230 + ratio * 25; // 230 -> 255
    } else if (lum < 110) {
      // Pencil / pen darkening
      const ratio = lum / 110;
      targetLum = ratio * 70; // 0 -> 70
    } else {
      // Transition midtones
      targetLum = lum;
    }

    // Apply manual brightness & contrast
    let adjusted = targetLum + brightnessOffset;
    adjusted = contrastFactor * (adjusted - 128) + 128;
    adjusted = Math.min(255, Math.max(0, adjusted));

    data[i] = adjusted;
    data[i + 1] = adjusted;
    data[i + 2] = adjusted;
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Crisp Monochrome Black-and-White threshold filter for printed worksheets & typed text
 */
export function applyBwFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  threshold: number = 135,
  brightnessOffset: number = 0
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  const effectiveThreshold = Math.min(245, Math.max(10, threshold - brightnessOffset));

  for (let i = 0; i < len; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const val = lum >= effectiveThreshold ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Color Boost filter: Cleans up gray paper background while preserving colored pens & highlighters
 */
export function applyColorBoost(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  brightnessOffset: number = 0,
  contrastOffset: number = 0
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  const safeContrast = Math.max(-250, Math.min(250, contrastOffset));
  const contrastFactor = (259 * (safeContrast + 255)) / (255 * (259 - safeContrast));

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Calculate saturation / color difference from grayscale
    const maxVal = Math.max(r, g, b);
    const minVal = Math.min(r, g, b);
    const delta = maxVal - minVal;

    if (delta < 20 && lum > 140) {
      // It's paper background - brighten to near pure white
      const boost = Math.min(255, lum + 40 + brightnessOffset);
      r = boost;
      g = boost;
      b = boost;
    } else {
      // It has color ink (pen/highlighter) - boost vibrancy
      r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128 + brightnessOffset));
      g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128 + brightnessOffset));
      b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128 + brightnessOffset));
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Rotates an image by specified degrees (0, 90, 180, 270)
 */
export function rotateCanvas(
  sourceCanvas: HTMLCanvasElement,
  degrees: number
): HTMLCanvasElement {
  const normDeg = ((degrees % 360) + 360) % 360;
  if (normDeg === 0) return sourceCanvas;

  const is90or270 = normDeg === 90 || normDeg === 270;
  const targetW = is90or270 ? sourceCanvas.height : sourceCanvas.width;
  const targetH = is90or270 ? sourceCanvas.width : sourceCanvas.height;

  const { canvas, ctx } = createOffscreenCanvas(targetW, targetH);
  ctx.translate(targetW / 2, targetH / 2);
  ctx.rotate((normDeg * Math.PI) / 180);
  ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);

  return canvas;
}

/**
 * Triangle texture-mapping helper for Canvas 2D quad perspective unskewing
 */
function drawTriangle(
  ctx: CanvasRenderingContext2D,
  im: HTMLCanvasElement | HTMLImageElement,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  sx0: number, sy0: number,
  sx1: number, sy1: number,
  sx2: number, sy2: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();

  const denom = sx0 * (sy2 - sy1) - sx1 * sy2 + sx2 * sy1 + (sx1 - sx2) * sy0;
  if (Math.abs(denom) < 0.0001) {
    ctx.restore();
    return;
  }

  const m11 = -(sy0 * (x2 - x1) - sy1 * x2 + sy2 * x1 + (sy1 - sy2) * x0) / denom;
  const m12 = (sy1 * y2 + sy0 * (y1 - y2) - sy2 * y1 + (sy2 - sy1) * y0) / denom;
  const m21 = (sx0 * (x2 - x1) - sx1 * x2 + sx2 * x1 + (sx1 - sx2) * x0) / denom;
  const m22 = -(sx1 * y2 + sx0 * (y1 - y2) - sx2 * y1 + (sx2 - sx1) * y0) / denom;
  const dx = (sx0 * (sy2 * x1 - sy1 * x2) + sy0 * (sx1 * x2 - sx2 * x1) + (sx2 * sy1 - sx1 * sy2) * x0) / denom;
  const dy = (sx0 * (sy2 * y1 - sy1 * y2) + sy0 * (sx1 * y2 - sx2 * y1) + (sx2 * sy1 - sx1 * sy2) * y0) / denom;

  ctx.transform(m11, m12, m21, m22, dx, dy);
  ctx.drawImage(im, 0, 0);
  ctx.restore();
}

/**
 * Straightens an angled phone photo using 4-corner perspective unskewing
 * corners: [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
 */
export function warpPerspectiveQuad(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  corners: [Point2D, Point2D, Point2D, Point2D],
  outputWidth?: number,
  outputHeight?: number
): HTMLCanvasElement {
  const [tl, tr, br, bl] = corners;

  // Compute bounding box or natural A4 aspect ratio if not specified
  const topWidth = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const bottomWidth = Math.hypot(br.x - bl.x, br.y - bl.y);
  const avgWidth = Math.max(100, Math.round(Math.max(topWidth, bottomWidth)));

  const leftHeight = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightHeight = Math.hypot(br.x - tr.x, br.y - tr.y);
  const avgHeight = Math.max(100, Math.round(Math.max(leftHeight, rightHeight)));

  const outW = outputWidth || avgWidth;
  const outH = outputHeight || avgHeight;

  const { canvas, ctx } = createOffscreenCanvas(outW, outH);

  // Split quad into two triangles: (TL, TR, BL) and (TR, BR, BL)
  drawTriangle(ctx, imageSource, 0, 0, outW, 0, 0, outH, tl.x, tl.y, tr.x, tr.y, bl.x, bl.y);
  drawTriangle(ctx, imageSource, outW, 0, outW, outH, 0, outH, tr.x, tr.y, br.x, br.y, bl.x, bl.y);

  return canvas;
}

/**
 * Master processor applying perspective unskewing + selected filter mode
 */
export async function processScanPage(
  src: string,
  filterMode: ScanFilterMode,
  rotation: number,
  brightness: number,
  contrast: number,
  corners?: [Point2D, Point2D, Point2D, Point2D]
): Promise<string> {
  const img = await loadImage(src);

  let currentCanvas: HTMLCanvasElement;
  if (corners && corners.length === 4) {
    currentCanvas = warpPerspectiveQuad(img, corners);
  } else {
    const { canvas, ctx } = createOffscreenCanvas(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, 0, 0);
    currentCanvas = canvas;
  }

  // Apply Rotation
  if (rotation % 360 !== 0) {
    currentCanvas = rotateCanvas(currentCanvas, rotation);
  }

  const { width, height } = currentCanvas;
  const ctx = currentCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return currentCanvas.toDataURL('image/jpeg', 0.92);

  // Apply selected filter
  if (filterMode === 'magic') {
    applyMagicClean(ctx, width, height, brightness, contrast);
  } else if (filterMode === 'bw') {
    applyBwFilter(ctx, width, height, 135, brightness);
  } else if (filterMode === 'color') {
    applyColorBoost(ctx, width, height, brightness, contrast);
  } else if (filterMode === 'original' && (brightness !== 0 || contrast !== 0)) {
    applyColorBoost(ctx, width, height, brightness, contrast);
  }

  return currentCanvas.toDataURL('image/jpeg', 0.92);
}
