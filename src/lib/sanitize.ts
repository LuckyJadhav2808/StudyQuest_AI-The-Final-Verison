// ============================================================
// StudyQuest AI — Robust Content Sanitization & AI Preparation
// Protects against stored XSS, script injection, and token waste
// ============================================================

import DOMPurify from 'isomorphic-dompurify';

/**
 * Whitelist configuration for rich-text note HTML.
 * Preserves Quill formatting, KaTeX math-fields, inline SVGs, and diagram embeds
 * while strictly stripping scripts, javascript: links, and executable handlers.
 */
const NOTE_DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'blockquote', 'pre', 'code',
    'ul', 'ol', 'li',
    'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup',
    'span', 'div', 'br', 'hr',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'a', 'img',
    // KaTeX & custom StudyQuest blots
    'math-field', 'annotation',
    // SVG diagrams
    'svg', 'g', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'text',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'style',
    'width', 'height', 'target', 'rel',
    // Custom data attributes for KaTeX math blot
    'data-latex', 'data-block', 'encoding',
    // SVG attributes
    'viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
    'd', 'x', 'y', 'r', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2', 'points', 'transform',
  ],
  ALLOW_DATA_ATTR: true,
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target', 'rel'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

// Configure DOMPurify hook to ensure external links safely open in new tabs with noopener
if (typeof DOMPurify.addHook === 'function') {
  DOMPurify.addHook('afterSanitizeAttributes', (node: any) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      const href = node.getAttribute('href') || '';
      if (href.startsWith('http://') || href.startsWith('https://')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    }
  });
}

/**
 * Sanitize rich text note HTML before rendering with dangerouslySetInnerHTML.
 */
export function sanitizeNoteHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  try {
    return (DOMPurify.sanitize(rawHtml, NOTE_DOMPURIFY_CONFIG as any) as unknown) as string;
  } catch (err) {
    console.error('Note HTML sanitization failed:', err);
    // Safe fallback: strip all tags if parser failed unexpectedly
    return rawHtml.replace(/<[^>]*>/g, '');
  }
}

/**
 * Strip all HTML tags and convert entities into clean, readable text.
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean and truncate note content for AI prompts (summaries, flashcards, quizzes).
 * Strips HTML tags, removes raw base64 data URLs to prevent token blowing,
 * and caps the string at a safe length limit.
 */
export function prepareContentForAi(html: string, maxChars: number = 6000): string {
  if (!html) return '';

  // 1. Remove base64 data URIs first (images, canvas) to avoid massive token drain
  const withoutDataUrls = html.replace(/src=["']data:image\/[^"']+["']/gi, 'src="[image]"');

  // 2. Strip HTML tags and clean whitespace
  const plainText = stripHtml(withoutDataUrls);

  // 3. Truncate to maximum characters safely
  if (plainText.length <= maxChars) {
    return plainText;
  }

  return plainText.slice(0, maxChars) + '... [Content truncated for AI context]';
}
