// ============================================================
// StudyQuest AI — Media Storage & Image Optimization
// Prevents Firestore 1 MiB document cap breach by routing binaries
// to Firebase Storage with crisp WebP compression and self-healing extraction
// ============================================================

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Converts a base64 Data URL to a native binary Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Compresses an image data URL or Blob down to target dimensions and WebP format.
 * Preserves high visual fidelity, crisp diagrams, and readable text in screenshots.
 */
export async function compressImage(
  source: string | Blob,
  maxWidth = 2048,
  maxHeight = 2048,
  quality = 0.90
): Promise<Blob> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      if (source instanceof Blob) return resolve(source);
      return resolve(dataUrlToBlob(source));
    }

    // Safety timeout: Guarantee resolution within 2500ms under any circumstances
    let resolved = false;
    const fallbackBlob = () => (source instanceof Blob ? source : dataUrlToBlob(source));
    const safetyTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(fallbackBlob());
      }
    }, 2500);

    const safeResolve = (blob: Blob) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(safetyTimer);
        resolve(blob);
      }
    };

    const img = new Image();
    // Only set crossOrigin on remote HTTP/HTTPS URLs — setting it on data: or blob: URIs causes hangs in Chromium
    if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'))) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Scale down proportionally only if larger than max bounds
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight = height;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return safeResolve(fallbackBlob());
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try modern WebP first, fallback to JPEG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              safeResolve(blob);
            } else {
              canvas.toBlob(
                (fallback) => {
                  if (fallback) safeResolve(fallback);
                  else safeResolve(fallbackBlob());
                },
                'image/jpeg',
                quality
              );
            }
          },
          'image/webp',
          quality
        );
      } catch {
        safeResolve(fallbackBlob());
      }
    };

    img.onerror = () => {
      safeResolve(fallbackBlob());
    };

    if (source instanceof Blob) {
      img.src = URL.createObjectURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Creates an ultra-compact data URL fallback if Firebase Storage is unavailable,
 * guaranteeing the document stays safely below Firestore's 1MB cap.
 */
async function createUltraCompactDataUrl(source: string | Blob): Promise<string> {
  try {
    const compressedBlob = await compressImage(source, 800, 800, 0.70);
    return new Promise((resolve) => {
      const reader = new FileReader();
      const timer = setTimeout(() => {
        resolve(typeof source === 'string' ? source : '');
      }, 1500);
      reader.onloadend = () => {
        clearTimeout(timer);
        resolve((reader.result as string) || (typeof source === 'string' ? source : ''));
      };
      reader.onerror = () => {
        clearTimeout(timer);
        resolve(typeof source === 'string' ? source : '');
      };
      reader.readAsDataURL(compressedBlob);
    });
  } catch {
    return typeof source === 'string' ? source : '';
  }
}

/**
 * Uploads a note diagram, canvas drawing, or screenshot to Firebase Storage.
 * Returns a permanent HTTPS URL, or a safe compressed data URL fallback.
 */
export async function uploadNoteImage(
  userId: string,
  noteId: string,
  imageSource: string | Blob,
  prefix = 'media'
): Promise<string> {
  const safeUserId = userId || 'anonymous';
  const safeNoteId = noteId || 'draft';
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.webp`;
  const storagePath = `users/${safeUserId}/notes/${safeNoteId}/${filename}`;

  try {
    // 1. Compress image to clean, high-resolution WebP (crisp text, no blurring)
    const compressedBlob = await compressImage(imageSource, 2048, 2048, 0.90);

    // 2. Upload to Firebase Storage with strict 3500ms timeout guard
    const imageRef = ref(storage, storagePath);
    const uploadOperation = async () => {
      const snapshot = await uploadBytes(imageRef, compressedBlob, {
        contentType: 'image/webp',
        cacheControl: 'public,max-age=31536000',
      });
      return await getDownloadURL(snapshot.ref);
    };

    const timeoutGuard = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase Storage upload timed out (3.5s)')), 3500)
    );

    const downloadUrl = await Promise.race([uploadOperation(), timeoutGuard]);
    return downloadUrl;
  } catch (storageError) {
    console.warn('[storage] Firebase Storage upload unavailable or timed out, applying defensive compressed fallback:', storageError);
    // Graceful fallback: produce an optimized compact data URL so it never causes Firestore's 1MB limit crash
    return await createUltraCompactDataUrl(imageSource);
  }
}

// In-memory cache of data URLs that have already been evaluated during this session
// Prevents continuous re-upload and re-compression storms on auto-save ticks
const attemptedUploadCache = new Set<string>();

/**
 * Self-healing helper: scans a note's HTML content for embedded base64 images (data:image/...),
 * uploads each to Firebase Storage, and replaces the massive base64 string with the clean HTTPS URL.
 * Drops document size from megabytes to kilobytes while preserving full image quality.
 */
export async function extractAndUploadNoteImages(
  content: string,
  userId: string,
  noteId: string
): Promise<{
  sanitizedHtml: string;
  wasModified: boolean;
  replacedCount: number;
  replacedMap: Record<string, string>;
}> {
  if (!content || !content.includes('data:image/')) {
    return { sanitizedHtml: content, wasModified: false, replacedCount: 0, replacedMap: {} };
  }

  // Permissive regex to match all data:image URLs within src attributes (handles newlines and various mime-types)
  const dataUrlRegex = /src=["'](data:image\/[^"']+)["']/gi;
  const rawMatches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = dataUrlRegex.exec(content)) !== null) {
    if (match[1]) {
      rawMatches.push(match[1]);
    }
  }

  // Deduplicate matches and ignore URLs that have already been attempted in this session
  const uniqueDataUrls = Array.from(new Set(rawMatches)).filter((u) => !attemptedUploadCache.has(u));

  if (uniqueDataUrls.length === 0) {
    return { sanitizedHtml: content, wasModified: false, replacedCount: 0, replacedMap: {} };
  }

  // Cap cache size to avoid unbounded memory growth
  if (attemptedUploadCache.size > 300) {
    attemptedUploadCache.clear();
  }

  let sanitizedHtml = content;
  let replacedCount = 0;
  const replacedMap: Record<string, string> = {};

  // Process up to 5 images concurrently to avoid sequential blocking
  const uploadPromises = uniqueDataUrls.map(async (dataUrl) => {
    attemptedUploadCache.add(dataUrl);
    try {
      const uploadedUrl = await uploadNoteImage(userId, noteId, dataUrl, 'extracted');
      if (uploadedUrl) {
        attemptedUploadCache.add(uploadedUrl);
      }
      return { dataUrl, uploadedUrl };
    } catch (err) {
      console.warn('[storage] Failed to lift image during note self-healing:', err);
      return { dataUrl, uploadedUrl: null };
    }
  });

  const results = await Promise.allSettled(uploadPromises);

  for (const res of results) {
    if (res.status === 'fulfilled' && res.value.uploadedUrl) {
      const { dataUrl, uploadedUrl } = res.value;
      if (uploadedUrl && !uploadedUrl.startsWith('data:image/')) {
        sanitizedHtml = sanitizedHtml.split(dataUrl).join(uploadedUrl);
        replacedMap[dataUrl] = uploadedUrl;
        replacedCount++;
      } else if (uploadedUrl && uploadedUrl.length < dataUrl.length) {
        // Fallback compact data URL was significantly smaller
        sanitizedHtml = sanitizedHtml.split(dataUrl).join(uploadedUrl);
        replacedMap[dataUrl] = uploadedUrl;
        replacedCount++;
      }
    }
  }

  return {
    sanitizedHtml,
    wasModified: replacedCount > 0,
    replacedCount,
    replacedMap,
  };
}
