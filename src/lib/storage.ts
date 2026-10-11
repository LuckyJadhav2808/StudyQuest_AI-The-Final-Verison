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

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
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
        return resolve(source instanceof Blob ? source : dataUrlToBlob(source));
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Try modern WebP first, fallback to JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) resolve(fallbackBlob);
                else resolve(source instanceof Blob ? source : dataUrlToBlob(source));
              },
              'image/jpeg',
              quality
            );
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      resolve(source instanceof Blob ? source : dataUrlToBlob(source));
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
  const compressedBlob = await compressImage(source, 800, 800, 0.70);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(compressedBlob);
  });
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

    // 2. Upload to Firebase Storage
    const imageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(imageRef, compressedBlob, {
      contentType: 'image/webp',
      cacheControl: 'public,max-age=31536000',
    });

    // 3. Return HTTPS public download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (storageError) {
    console.warn('[storage] Firebase Storage upload unavailable or failed, applying defensive compressed fallback:', storageError);
    // Graceful fallback: produce an optimized compact data URL so it never causes Firestore's 1MB limit crash
    return await createUltraCompactDataUrl(imageSource);
  }
}

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

  // Deduplicate matches so identical diagrams/screenshots are uploaded only once
  const uniqueDataUrls = Array.from(new Set(rawMatches));

  if (uniqueDataUrls.length === 0) {
    return { sanitizedHtml: content, wasModified: false, replacedCount: 0, replacedMap: {} };
  }

  let sanitizedHtml = content;
  let replacedCount = 0;
  const replacedMap: Record<string, string> = {};

  for (const dataUrl of uniqueDataUrls) {
    try {
      const uploadedUrl = await uploadNoteImage(userId, noteId, dataUrl, 'extracted');
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
    } catch (err) {
      console.warn('[storage] Failed to lift image during note self-healing:', err);
    }
  }

  return {
    sanitizedHtml,
    wasModified: replacedCount > 0,
    replacedCount,
    replacedMap,
  };
}
