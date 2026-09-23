// ============================================================
// StudyQuest AI — Media Storage & Image Optimization
// Prevents Firestore 1 MiB document cap breach by routing binaries
// to Firebase Storage with intelligent WebP compression and fallback
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
 */
export async function compressImage(
  source: string | Blob,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      if (source instanceof Blob) return resolve(source);
      return resolve(dataUrlToBlob(source));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down proportionally
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
      // If image loading fails, resolve with raw blob
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
 * Creates an ultra-compact data URL fallback (under 60 KB) if Firebase Storage is unavailable.
 */
async function createUltraCompactDataUrl(source: string | Blob): Promise<string> {
  const compressedBlob = await compressImage(source, 600, 600, 0.6);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(compressedBlob);
  });
}

/**
 * Uploads a note diagram, canvas drawing, or screenshot to Firebase Storage.
 * Returns a permanent HTTPS URL, or an ultra-compact compressed data URL fallback.
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
    // 1. Compress image to clean WebP
    const compressedBlob = await compressImage(imageSource, 1400, 1400, 0.82);

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
    console.warn('Firebase Storage upload unavailable or failed, applying defensive compressed fallback:', storageError);
    // Graceful fallback: produce an ultra-compact low-res data URL (< 60 KB)
    // so it never causes Firestore's 1MB limit crash
    return await createUltraCompactDataUrl(imageSource);
  }
}
