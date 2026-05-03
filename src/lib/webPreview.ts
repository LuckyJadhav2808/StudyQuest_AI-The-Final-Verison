/**
 * Web Preview Utility
 * Combines project files (HTML, CSS, JS) into a single HTML document
 * for rendering in a sandboxed iframe.
 */

import { CodeFile } from '@/types';

/**
 * Detect if a project is a web project (contains at least one .html file)
 */
export function isWebProject(files: CodeFile[]): boolean {
  return files.some((f) => f.name.endsWith('.html'));
}

/**
 * Get language from file extension
 */
export function getLanguageFromExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'c': 'c',
    'h': 'c',
    'rs': 'rust',
    'go': 'go',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'txt': 'text',
    'sql': 'sql',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sh': 'bash',
    'bat': 'batch',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'dart': 'dart',
    'r': 'r',
    'lua': 'lua',
  };
  return map[ext] || 'text';
}

/**
 * Get a nice file icon emoji based on extension
 */
export function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const icons: Record<string, string> = {
    'html': '🌐',
    'htm': '🌐',
    'css': '🎨',
    'js': '⚡',
    'jsx': '⚛️',
    'ts': '💎',
    'tsx': '⚛️',
    'py': '🐍',
    'java': '☕',
    'cpp': '⚙️',
    'c': '⚙️',
    'h': '📎',
    'rs': '🦀',
    'go': '🐹',
    'json': '📋',
    'md': '📝',
    'txt': '📄',
    'sql': '🗃️',
    'xml': '📰',
    'yaml': '⚙️',
    'yml': '⚙️',
  };
  return icons[ext] || '📄';
}

/**
 * Combine HTML/CSS/JS files into a single HTML document for preview.
 * Finds the main HTML file and injects CSS + JS inline.
 */
export function buildWebPreview(files: CodeFile[]): string {
  // Find the HTML file (prefer index.html, fallback to first .html)
  const htmlFile = files.find((f) => f.name === 'index.html') ||
                   files.find((f) => f.name.endsWith('.html'));

  if (!htmlFile) {
    return `<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#888;"><p>No HTML file found in project. Create an <code>index.html</code> to see a preview.</p></body></html>`;
  }

  const cssFiles = files.filter((f) => f.name.endsWith('.css'));
  const jsFiles = files.filter((f) => f.name.endsWith('.js'));

  let htmlContent = htmlFile.content;

  // Build CSS block
  const cssBlock = cssFiles.map((f) => `/* ${f.name} */\n${f.content}`).join('\n\n');

  // Build JS block
  const jsBlock = jsFiles.map((f) => `// ${f.name}\n${f.content}`).join('\n\n');

  // Check if HTML has <head> tag — inject CSS before </head>
  if (htmlContent.includes('</head>')) {
    htmlContent = htmlContent.replace(
      '</head>',
      `<style>\n${cssBlock}\n</style>\n</head>`
    );
  } else if (htmlContent.includes('<html')) {
    // No <head>, inject after <html...>
    htmlContent = htmlContent.replace(
      /(<html[^>]*>)/i,
      `$1\n<head><style>\n${cssBlock}\n</style></head>`
    );
  } else {
    // No html structure at all, wrap it
    htmlContent = `<!DOCTYPE html><html><head><style>\n${cssBlock}\n</style></head><body>${htmlContent}</body></html>`;
  }

  // Inject JS before </body>
  if (htmlContent.includes('</body>')) {
    htmlContent = htmlContent.replace(
      '</body>',
      `<script>\n${jsBlock}\n</script>\n</body>`
    );
  } else {
    htmlContent += `\n<script>\n${jsBlock}\n</script>`;
  }

  return htmlContent;
}

/**
 * Create a blob URL for iframe rendering
 */
export function createPreviewBlobUrl(html: string): string {
  const blob = new Blob([html], { type: 'text/html' });
  return URL.createObjectURL(blob);
}
