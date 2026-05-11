/**
 * Lightweight client-side syntax checker.
 * Returns error objects with line numbers for gutter highlighting.
 * Runs in-browser — no dependencies.
 */

export interface SyntaxError {
  line: number;        // 1-indexed line number
  message: string;     // Human-readable error message
}

/**
 * Check JavaScript / TypeScript for syntax errors.
 * Uses `new Function()` which triggers the browser's JS parser.
 */
function checkJS(code: string): SyntaxError[] {
  try {
    // Wrap in function body to catch syntax errors without executing
    new Function(code);
    return [];
  } catch (e: unknown) {
    if (e instanceof globalThis.SyntaxError) {
      // Try to extract line number from the error
      // V8 (Chrome): "Unexpected token '}' at line 5"
      // SpiderMonkey (Firefox): various formats
      const msg = e.message || '';
      const stack = (e as { stack?: string }).stack || '';

      // Try to find line number from the stack trace or message
      let line = 0;

      // Pattern: "<anonymous>:LINE:COL"
      const stackMatch = stack.match(/<anonymous>:(\d+):/);
      if (stackMatch) {
        // new Function() wraps code, so line 1 in the error = line 2 in the code body
        line = Math.max(1, parseInt(stackMatch[1], 10) - 2);
      }

      // Fallback: check message for line references
      if (!line) {
        const msgMatch = msg.match(/line\s+(\d+)/i);
        if (msgMatch) line = parseInt(msgMatch[1], 10);
      }

      // If we still don't have a line, default to last line
      if (!line) line = code.split('\n').length;

      return [{ line, message: msg }];
    }
    return [];
  }
}

/**
 * Check JSON for syntax errors.
 */
function checkJSON(code: string): SyntaxError[] {
  if (!code.trim()) return [];
  try {
    JSON.parse(code);
    return [];
  } catch (e: unknown) {
    if (e instanceof globalThis.SyntaxError) {
      const msg = e.message || '';
      // Chrome: "at position 123" — map position to line
      const posMatch = msg.match(/position\s+(\d+)/i);
      let line = 1;
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        line = code.substring(0, pos).split('\n').length;
      }
      return [{ line, message: msg }];
    }
    return [];
  }
}

/**
 * Check HTML for unclosed or mismatched tags.
 * Basic heuristic — not a full parser, but catches common issues.
 */
function checkHTML(code: string): SyntaxError[] {
  const errors: SyntaxError[] = [];
  const lines = code.split('\n');
  const stack: { tag: string; line: number }[] = [];

  // Self-closing tags that don't need a closing tag
  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);

  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g;

  lines.forEach((line, idx) => {
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1].toLowerCase();

      // Skip void/self-closing tags
      if (voidTags.has(tagName) || fullMatch.endsWith('/>')) continue;
      // Skip comments, doctype
      if (fullMatch.startsWith('<!--') || fullMatch.startsWith('<!')) continue;

      if (fullMatch.startsWith('</')) {
        // Closing tag
        if (stack.length === 0) {
          errors.push({ line: idx + 1, message: `Unexpected closing tag </${tagName}>` });
        } else {
          const top = stack[stack.length - 1];
          if (top.tag === tagName) {
            stack.pop();
          } else {
            errors.push({ line: idx + 1, message: `Mismatched tag: expected </${top.tag}>, found </${tagName}>` });
          }
        }
      } else {
        // Opening tag
        stack.push({ tag: tagName, line: idx + 1 });
      }
    }
  });

  // Any unclosed tags left on stack
  for (const unclosed of stack) {
    errors.push({ line: unclosed.line, message: `Unclosed tag <${unclosed.tag}>` });
  }

  return errors;
}

/**
 * Main entry point: check code for syntax errors based on language.
 * Returns an array of errors with line numbers.
 */
export function checkSyntax(code: string, language: string): SyntaxError[] {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return checkJS(code);
    case 'json':
      return checkJSON(code);
    case 'html':
      return checkHTML(code);
    default:
      // No client-side checker for Python, Java, C++, etc.
      return [];
  }
}
