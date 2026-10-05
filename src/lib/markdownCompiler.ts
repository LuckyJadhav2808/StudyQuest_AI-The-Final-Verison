// ============================================================
// StudyQuest AI — Comprehensive 19-Feature Markdown Compiler
// Full GFM + LaTeX Math + Mermaid + GitHub Callouts + Footnotes
// ============================================================

import { marked } from 'marked';
import { sanitizeNoteHtml } from '@/lib/sanitize';

// ── 1. Comprehensive Emoji Shortcode Map ──
const EMOJI_MAP: Record<string, string> = {
  ':fire:': '🔥',
  ':rocket:': '🚀',
  ':sparkles:': '✨',
  ':books:': '📚',
  ':book:': '📖',
  ':bulb:': '💡',
  ':tada:': '🎉',
  ':smile:': '😊',
  ':star:': '⭐',
  ':star2:': '🌟',
  ':memo:': '📝',
  ':warning:': '⚠️',
  ':check:': '✅',
  ':white_check_mark:': '✅',
  ':x:': '❌',
  ':heart:': '❤️',
  ':zap:': '⚡',
  ':brain:': '🧠',
  ':target:': '🎯',
  ':trophy:': '🏆',
  ':shield:': '🛡️',
  ':sword:': '⚔️',
  ':scroll:': '📜',
  ':crystal_ball:': '🔮',
  ':potion:': '🧪',
  ':hourglass:': '⏳',
  ':compass:': '🧭',
  ':map:': '🗺️',
  ':key:': '🔑',
  ':crown:': '👑',
  ':gem:': '💎',
  ':100:': '💯',
  ':art:': '🎨',
  ':pencil:': '✏️',
  ':computer:': '💻',
  ':coffee:': '☕',
};

// ── 2. Callout Types Configuration ──
interface CalloutMeta {
  title: string;
  icon: string;
  badgeClass: string;
}

const CALLOUT_CONFIG: Record<string, CalloutMeta> = {
  note: { title: 'Note', icon: 'ℹ️', badgeClass: 'callout-note' },
  tip: { title: 'Tip', icon: '💡', badgeClass: 'callout-tip' },
  warning: { title: 'Warning', icon: '⚠️', badgeClass: 'callout-warning' },
  important: { title: 'Important', icon: '⚡', badgeClass: 'callout-important' },
  caution: { title: 'Caution', icon: '🛑', badgeClass: 'callout-caution' },
};

/**
 * Preprocess raw Markdown text before running marked:
 * Handles emojis, highlights, subscript, superscript, callouts, footnotes, and :::details
 */
export function preprocessMarkdown(raw: string): {
  text: string;
  footnoteDefs: Array<{ id: string; note: string }>;
} {
  let text = raw;

  // Replace emoji shortcodes
  for (const [code, emoji] of Object.entries(EMOJI_MAP)) {
    text = text.replaceAll(code, emoji);
  }

  // Highlight: ==text== -> <mark class="studyquest-highlight">text</mark>
  text = text.replace(/==([^=\n]+)==/g, '<mark class="studyquest-highlight">$1</mark>');

  // Subscript: ~text~ (avoiding strikethrough ~~)
  text = text.replace(/(?<!~)\~([^~\n\s]+)\~(?!~)/g, '<sub>$1</sub>');

  // Superscript: ^text^
  text = text.replace(/\^([^\^\n\s]+)\^/g, '<sup>$1</sup>');

  // GitHub callout alerts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT], > [!CAUTION]
  text = text.replace(
    /^>[ ]*\[\!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\][ ]*\n((?:>[ ].*\n?)+)/gim,
    (_match, type, content) => {
      const cleanContent = content.replace(/^>[ ]?/gm, '').trim();
      const key = type.toLowerCase();
      const meta = CALLOUT_CONFIG[key] || CALLOUT_CONFIG.note;

      return `\n<div class="studyquest-callout studyquest-callout-${key}">\n<div class="studyquest-callout-header"><span class="studyquest-callout-icon">${meta.icon}</span><span class="studyquest-callout-title">${meta.title}</span></div>\n<div class="studyquest-callout-content">\n\n${cleanContent}\n\n</div>\n</div>\n\n`;
    }
  );

  // Footnote definitions: [^id]: footnote content
  const footnoteDefs: Array<{ id: string; note: string }> = [];
  text = text.replace(/^\[\^([a-zA-Z0-9_-]+)\]:[ ]*(.+)$/gm, (_match, id, note) => {
    footnoteDefs.push({ id: id.trim(), note: note.trim() });
    return '';
  });

  // Footnote references in text: [^id]
  text = text.replace(/\[\^([a-zA-Z0-9_-]+)\]/g, (_match, id) => {
    const cleanId = id.trim();
    return `<sup><a href="#fn-${cleanId}" id="fnref-${cleanId}" class="studyquest-footnote-ref">[${cleanId}]</a></sup>`;
  });

  // Collapsible section :::details Title \n ... \n :::
  text = text.replace(
    /:::details[ ]*(.*?)\n([\s\S]*?):::/gi,
    (_match, title, inner) => {
      const cleanTitle = title.trim() || 'Details & Spells';
      return `<details class="studyquest-details"><summary class="studyquest-summary">${cleanTitle}</summary><div class="studyquest-details-content">\n\n${inner.trim()}\n\n</div></details>`;
    }
  );

  return { text, footnoteDefs };
}

/**
 * Configure marked with custom renderers for code blocks (language badge + copy button),
 * responsive table wrappers, and sanitized links.
 */
function createCustomMarkedInstance() {
  const renderer = new marked.Renderer();

  // Custom code block renderer with language badge and copy button
  renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
    const language = (lang || 'code').toLowerCase().trim();

    if (language === 'mermaid') {
      // Keep mermaid blocks untouched for post-processing with mermaid.js
      return `<pre><code class="language-mermaid">${escapeHtml(text)}</code></pre>`;
    }

    const displayLang = language.toUpperCase();
    const encodedCode = encodeURIComponent(text);

    return `
<div class="studyquest-code-wrapper" data-language="${displayLang}">
  <div class="studyquest-code-header">
    <span class="studyquest-code-badge">${displayLang}</span>
    <button
      type="button"
      class="studyquest-copy-btn"
      data-code="${encodedCode}"
      title="Copy to clipboard"
      aria-label="Copy code"
    >
      <span class="copy-icon">📋</span>
      <span class="copy-text">Copy</span>
    </button>
  </div>
  <pre class="studyquest-code-pre"><code class="language-${language}">${escapeHtml(text)}</code></pre>
</div>`;
  };

  // Custom table renderer wrapped in a responsive overflow container
  const defaultTable = renderer.table.bind(renderer);
  renderer.table = function (token: any) {
    const tableHtml = defaultTable(token);
    return `<div class="studyquest-table-wrapper">${tableHtml}</div>`;
  };

  // Custom link renderer with security attributes
  renderer.link = function ({ href, title, text }: { href: string; title?: string | null; text: string }) {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    const isExternal = href.startsWith('http://') || href.startsWith('https://');
    const targetAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
    return `<a href="${escapeHtml(href)}"${titleAttr}${targetAttrs} class="studyquest-link">${text}</a>`;
  };

  return renderer;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Process KaTeX mathematical formulas:
 * $$...$$ -> display block formula
 * $...$   -> inline formula
 */
async function processMathFormulas(html: string): Promise<string> {
  if (!html.includes('$')) return html;

  try {
    const katex = (await import('katex')).default;

    // 1. KaTeX Block formulas: $$...$$
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula) => {
      try {
        const decoded = formula
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/<[^>]*>/g, '')
          .trim();

        const rendered = katex.renderToString(decoded, {
          displayMode: true,
          throwOnError: false,
          output: 'html',
        });
        return `<div class="studyquest-math-block">${rendered}</div>`;
      } catch {
        return _match;
      }
    });

    // 2. KaTeX Inline formulas: $...$ (negative lookbehind and lookahead to avoid $$)
    html = html.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)/g, (_match, formula) => {
      try {
        const decoded = formula
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/<[^>]*>/g, '')
          .trim();

        const rendered = katex.renderToString(decoded, {
          displayMode: false,
          throwOnError: false,
          output: 'html',
        });
        return `<span class="studyquest-math-inline">${rendered}</span>`;
      } catch {
        return _match;
      }
    });

    return html;
  } catch (err) {
    console.warn('[MarkdownCompiler] KaTeX load failed:', err);
    return html;
  }
}

/**
 * Render Mermaid code blocks (<code class="language-mermaid">) into interactive SVGs.
 * Supports flowcharts, timelines, mindmaps, sequence diagrams, and class diagrams.
 */
async function processMermaidDiagrams(html: string): Promise<string> {
  if (!html.includes('language-mermaid')) return html;

  const mermaidRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi;
  const matches = [...html.matchAll(mermaidRegex)];
  if (matches.length === 0) return html;

  // Only run in client browser
  if (typeof window === 'undefined') return html;

  try {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        darkMode: true,
        background: '#090d16',
        primaryColor: '#7c3aed',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#8b5cf6',
        lineColor: '#94a3b8',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        nodeTextColor: '#ffffff',
        textColor: '#f8fafc',
        mainBkg: '#1e293b',
        nodeBorder: '#8b5cf6',
        clusterBkg: '#0f172a',
        clusterBorder: '#334155',
        titleColor: '#f8fafc',
        edgeLabelBackground: '#090d16',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
      },
      mindmap: {
        useMaxWidth: true,
      },
      securityLevel: 'loose',
    });

    for (let i = 0; i < matches.length; i++) {
      const fullMatch = matches[i][0];
      const rawCode = matches[i][1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      // Determine diagram title from code (flowchart, timeline, mindmap, etc.)
      let diagramType = 'Diagram';
      if (/^flowchart|^graph/i.test(rawCode)) diagramType = 'Flowchart';
      else if (/^timeline/i.test(rawCode)) diagramType = 'Timeline';
      else if (/^mindmap/i.test(rawCode)) diagramType = 'Mindmap';
      else if (/^sequenceDiagram/i.test(rawCode)) diagramType = 'Sequence';
      else if (/^classDiagram/i.test(rawCode)) diagramType = 'Class';
      else if (/^gantt/i.test(rawCode)) diagramType = 'Gantt';

      const uniqueId = `mermaid-render-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;

      try {
        const { svg } = await mermaid.render(uniqueId, rawCode);
        const container = `
<div class="studyquest-mermaid-container" data-type="${diagramType.toLowerCase()}">
  <div class="studyquest-mermaid-header">
    <span class="mermaid-badge">📊 ${diagramType}</span>
  </div>
  <div class="studyquest-mermaid-svg">${svg}</div>
</div>`;
        html = html.replace(fullMatch, container);
      } catch (err: any) {
        console.warn(`[MarkdownCompiler] Mermaid render error on diagram ${i}:`, err);
        // Fallback: Show formatted diagram card with raw code
        const fallback = `
<div class="studyquest-mermaid-container studyquest-mermaid-error">
  <div class="studyquest-mermaid-header">
    <span class="mermaid-badge text-amber-400">⚠️ ${diagramType} (Draft)</span>
  </div>
  <pre class="p-3 text-xs font-mono bg-slate-900/80 rounded-xl overflow-x-auto text-slate-300"><code>${escapeHtml(rawCode)}</code></pre>
</div>`;
        html = html.replace(fullMatch, fallback);
      }
    }
  } catch (err) {
    console.warn('[MarkdownCompiler] Mermaid engine loading exception:', err);
  }

  return html;
}

/**
 * Main StudyQuest Markdown compilation pipeline:
 * Compiles markdown or hybrid note content into rich, fully-styled, sanitized HTML
 * supporting all 19 elements requested.
 */
export async function compileStudyQuestMarkdown(
  content: string,
  rawMarkdownSource?: string
): Promise<string> {
  if (!content && !rawMarkdownSource) return '';

  // Determine which source to use:
  // If content has images or active rich edits that rawMarkdownSource lacks, content takes precedence!
  const contentHasImages = /<img\b|data:image\/|blob:/i.test(content || '');
  const rawHasImages = rawMarkdownSource ? /!\[|<img\b|data:image\/|blob:/i.test(rawMarkdownSource) : false;

  let sourceToUse = content;
  if (rawMarkdownSource && rawMarkdownSource.trim().length > 0) {
    if (contentHasImages && !rawHasImages) {
      sourceToUse = content;
    } else if (!content || content === '<p><br></p>') {
      sourceToUse = rawMarkdownSource;
    } else {
      sourceToUse = content;
    }
  }

  // Protect all <img> tags so base64 / data URLs are never broken by marked line breaks or preprocessing
  const imgPlaceholders: string[] = [];
  const protectedSource = sourceToUse.replace(/<img\b[^>]*>/gi, (match) => {
    const token = `@@@SQ_IMG_TOKEN_${imgPlaceholders.length}@@@`;
    imgPlaceholders.push(match);
    return token;
  });

  // 1. Preprocess custom syntax: emojis, callouts, highlights, sub/sup, footnotes, :::details
  const { text: preprocessed, footnoteDefs } = preprocessMarkdown(protectedSource);

  // 2. Compile via marked with custom renderers
  const customRenderer = createCustomMarkedInstance();
  let compiledHtml = await marked.parse(preprocessed, {
    renderer: customRenderer,
    gfm: true,
    breaks: true,
  });

  // Restore protected <img> tags intact
  imgPlaceholders.forEach((imgTag, idx) => {
    compiledHtml = compiledHtml.replace(`@@@SQ_IMG_TOKEN_${idx}@@@`, imgTag);
  });

  // 3. Append footnotes section if footnotes were declared
  if (footnoteDefs.length > 0) {
    let fnHtml = '<section class="studyquest-footnotes"><hr class="studyquest-footnotes-divider" /><h4 class="studyquest-footnotes-title">Footnotes</h4><ol>';
    for (const fn of footnoteDefs) {
      fnHtml += `<li id="fn-${fn.id}"><span class="fn-text">${fn.note}</span> <a href="#fnref-${fn.id}" class="studyquest-footnote-back" title="Back to reference">↩</a></li>`;
    }
    fnHtml += '</ol></section>';
    compiledHtml += fnHtml;
  }

  // 4. Render KaTeX math formulas ($...$ and $$...$$)
  compiledHtml = await processMathFormulas(compiledHtml);

  // 5. Security sanitization (DOMPurify with modern whitelisting & data/blob URI preservation)
  let safeHtml = sanitizeNoteHtml(compiledHtml);

  // 6. Render Mermaid diagrams (flowcharts, timelines, mindmaps) on safe code blocks
  safeHtml = await processMermaidDiagrams(safeHtml);

  return safeHtml;
}
