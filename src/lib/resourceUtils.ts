import { ResourceType } from '@/types';

/**
 * Extracts a YouTube Video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match && match[1].length === 11 ? match[1] : null;
}

/**
 * Gets high-quality YouTube thumbnail
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Generates an embedded YouTube URL with enhanced privacy
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/**
 * Extracts Google Drive / Docs file ID and builds a clean embed preview URL
 */
export function getDrivePreviewUrl(url: string): string | null {
  if (!url) return null;

  // Standard Google Drive file URL: /file/d/{id}/view...
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }

  // Google Drive open?id={id}
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (openMatch && openMatch[1]) {
    return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  }

  // Google Docs
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (docMatch && docMatch[1]) {
    return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
  }

  // Google Spreadsheets
  const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (sheetMatch && sheetMatch[1]) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview`;
  }

  // Google Presentation
  const slideMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i);
  if (slideMatch && slideMatch[1]) {
    return `https://docs.google.com/presentation/d/${slideMatch[1]}/preview`;
  }

  return null;
}

/**
 * Automatically detects ResourceType based on URL or string content
 */
export function detectResourceType(input: string): ResourceType {
  const trimmed = (input || '').trim();
  if (!trimmed) return 'link';

  const isUrl = /^https?:\/\//i.test(trimmed);
  if (!isUrl) {
    return 'text';
  }

  // Check YouTube
  if (extractYouTubeId(trimmed) || /youtube\.com|youtu\.be/i.test(trimmed)) {
    return 'youtube';
  }

  // Check Google Drive
  if (/drive\.google\.com|docs\.google\.com/i.test(trimmed)) {
    return 'drive';
  }

  // Check GitHub
  if (/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/i.test(trimmed)) {
    return 'github';
  }

  // Check PDF
  if (/\.pdf(\?.*)?$/i.test(trimmed) || /arxiv\.org\/pdf/i.test(trimmed)) {
    return 'pdf';
  }

  return 'link';
}

/**
 * Extracts a clean domain name for badge rendering (e.g., 'github.com')
 */
export function getCleanDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
}
