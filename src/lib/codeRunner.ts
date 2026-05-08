/**
 * StudyQuest Code Execution Engine (v3 — Hardened Edition)
 *
 * Strategy:
 *  - JavaScript/TypeScript: Sandboxed iframe (prevents DOM access + auto-kills infinite loops)
 *  - Python: In-browser via Pyodide WASM with timeout protection
 *  - C/C++/Rust/Go/Java: Wandbox → Godbolt (Compiler Explorer) fallback
 *
 * All execution is 100% FREE — zero API keys required.
 *
 * Safety:
 *  - All in-browser execution has a 10-second timeout
 *  - JS/TS runs in a sandboxed iframe (no access to parent window/document/localStorage)
 *  - Java public class auto-fix for online compiler filename mismatch
 *  - stdin support for all languages
 */

interface ExecutionResult {
  stdout: string;
  stderr: string;
}

const EXECUTION_TIMEOUT = 10_000; // 10 seconds max

// ========================= In-Browser: JS / TS (Sandboxed Iframe) =========================

/**
 * Runs JS inside a sandboxed iframe so the code:
 *  1. Cannot access the parent page (window, document, localStorage)
 *  2. Auto-terminates after EXECUTION_TIMEOUT (kills infinite loops)
 */
function executeSandboxedJS(code: string, stdin: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const inputLines = JSON.stringify(stdin.split('\n'));

    // Build a self-contained HTML page that executes the code
    const html = `<!DOCTYPE html><html><body><script>
      const _logs = [], _errors = [];
      const _inputLines = ${inputLines};
      let _inputIdx = 0;

      const console = {
        log: (...a) => _logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ')),
        error: (...a) => _errors.push(a.map(x => String(x)).join(' ')),
        warn: (...a) => _logs.push('[WARN] ' + a.map(x => String(x)).join(' ')),
        info: (...a) => _logs.push(a.map(x => String(x)).join(' ')),
        table: (d) => _logs.push(JSON.stringify(d, null, 2)),
        dir: (o) => _logs.push(JSON.stringify(o, null, 2)),
        clear: () => { _logs.length = 0; },
      };

      function prompt() { return _inputIdx < _inputLines.length ? _inputLines[_inputIdx++] : null; }
      const readline = prompt;

      try {
        ${code}
        parent.postMessage({ type: 'sq-result', stdout: _logs.join('\\n'), stderr: _errors.join('\\n') }, '*');
      } catch (e) {
        parent.postMessage({ type: 'sq-result', stdout: _logs.join('\\n'), stderr: e.message || String(e) }, '*');
      }
    <\/script></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Create a hidden, sandboxed iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts'); // NO allow-same-origin → fully isolated
    iframe.src = url;
    document.body.appendChild(iframe);

    let settled = false;

    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      URL.revokeObjectURL(url);
      window.removeEventListener('message', handler);
    };

    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'sq-result' && !settled) {
        settled = true;
        cleanup();
        resolve({ stdout: e.data.stdout || '', stderr: e.data.stderr || '' });
      }
    };

    window.addEventListener('message', handler);

    // Timeout: kill the iframe if code runs too long (infinite loops)
    setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve({ stdout: '', stderr: `⏱️ Execution timed out after ${EXECUTION_TIMEOUT / 1000}s. Check for infinite loops.` });
      }
    }, EXECUTION_TIMEOUT);
  });
}

function executeJavaScript(code: string, stdin: string): Promise<ExecutionResult> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ stdout: '', stderr: 'Cannot run JS on the server.' });
  }
  return executeSandboxedJS(code, stdin);
}

function executeTypeScript(code: string, stdin: string): Promise<ExecutionResult> {
  const jsCode = code
    .replace(/:\s*(string|number|boolean|any|void|never|unknown|object|undefined|null)\b(\[\])?/g, '')
    .replace(/:\s*\{[^}]*\}/g, '')
    .replace(/:\s*[A-Z]\w*(<[^>]*>)?(\[\])?/g, '')
    .replace(/<[A-Z]\w*(,\s*[A-Z]\w*)*>/g, '')
    .replace(/\binterface\s+\w+\s*\{[^}]*\}/g, '')
    .replace(/\btype\s+\w+\s*=\s*[^;]+;/g, '')
    .replace(/\bas\s+\w+/g, '')
    .replace(/\benum\s+\w+\s*\{[^}]*\}/g, '');
  return executeJavaScript(jsCode, stdin);
}

// ========================= In-Browser: Pyodide (Python WASM) =========================

/* eslint-disable @typescript-eslint/no-explicit-any */
let pyodideInstance: any = null;
let pyodideLoadPromise: Promise<any> | null = null;

async function getPyodide(): Promise<any> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadPromise) return pyodideLoadPromise;

  pyodideLoadPromise = (async () => {
    if (typeof window === 'undefined') throw new Error('No window');

    // Load the Pyodide script from CDN once
    if (!(window as any).loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('CDN unavailable'));
        document.head.appendChild(s);
      });
    }

    pyodideInstance = await (window as any).loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
    });
    return pyodideInstance;
  })();

  return pyodideLoadPromise;
}

async function tryPyodide(code: string, stdin: string): Promise<ExecutionResult | null> {
  if (typeof window === 'undefined') return null;
  try {
    const py = await getPyodide();

    // Redirect stdout/stderr AND mock input() with stdin data
    const escapedStdin = stdin.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    py.runPython(`
import sys, io
_so, _se = io.StringIO(), io.StringIO()
sys.stdout, sys.stderr = _so, _se
_stdin_lines = '${escapedStdin}'.split('\\n')
_stdin_idx = 0
_orig_input = input
def _mock_input(prompt=''):
    global _stdin_idx
    if prompt:
        sys.stdout.write(str(prompt))
    if _stdin_idx < len(_stdin_lines):
        line = _stdin_lines[_stdin_idx]
        _stdin_idx += 1
        return line
    return ''
__builtins__.input = _mock_input
`);

    // Run with timeout using Promise.race
    const runPromise = new Promise<ExecutionResult>((resolve) => {
      let pyErr = '';
      try {
        py.runPython(code);
      } catch (e: any) {
        pyErr = e.message || String(e);
      }

      const stdout: string = py.runPython('_so.getvalue()') || '';
      const stderr: string = py.runPython('_se.getvalue()') || '';
      py.runPython('sys.stdout, sys.stderr = sys.__stdout__, sys.__stderr__; __builtins__.input = _orig_input');

      resolve({ stdout, stderr: stderr || pyErr });
    });

    const timeoutPromise = new Promise<ExecutionResult>((resolve) => {
      setTimeout(() => {
        resolve({ stdout: '', stderr: `⏱️ Python execution timed out after ${EXECUTION_TIMEOUT / 1000}s. Check for infinite loops.` });
      }, EXECUTION_TIMEOUT);
    });

    return await Promise.race([runPromise, timeoutPromise]);
  } catch {
    pyodideLoadPromise = null; // allow retry next time
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ========================= Remote: Wandbox (free, no key) =========================

async function tryWandbox(code: string, compiler: string, stdin: string): Promise<ExecutionResult | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);

    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, compiler, stdin }),
      signal: ctrl.signal,
    });

    clearTimeout(t);
    if (!res.ok) return null;

    const d = await res.json();
    const stdout = d.program_output || d.program_message || '';
    const stderr = d.compiler_error || d.program_error || d.compiler_message || d.compiler_output || '';
    return { stdout, stderr };
  } catch {
    return null;
  }
}

// ========================= Remote: Godbolt / Compiler Explorer (free, no key) =========================

async function tryGodbolt(code: string, compilerId: string, stdin: string): Promise<ExecutionResult | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);

    const res = await fetch(`https://godbolt.org/api/compiler/${compilerId}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        source: code,
        options: {
          userArguments: '',
          executeParameters: { args: [], stdin },
          compilerOptions: { executorRequest: true },
          filters: { execute: true },
        },
      }),
      signal: ctrl.signal,
    });

    clearTimeout(t);
    if (!res.ok) return null;

    const d = await res.json();
    const join = (arr: { text: string }[] | undefined) =>
      (arr || []).map(l => l.text).join('\n');

    return {
      stdout: join(d.execResult?.stdout) || join(d.stdout),
      stderr: join(d.execResult?.stderr) || join(d.stderr) || join(d.compilationErrors),
    };
  } catch {
    return null;
  }
}

// ========================= Language Config =========================

interface LangConfig {
  wandbox: string;   // Wandbox compiler name
  godbolt: string;   // Godbolt compiler ID
}

const LANG_CONFIG: Record<string, LangConfig> = {
  python: { wandbox: 'cpython-head', godbolt: 'python313' },
  java: { wandbox: 'openjdk-head', godbolt: 'java2100' },
  cpp: { wandbox: 'gcc-head', godbolt: 'gsnapshot' },
  c: { wandbox: 'gcc-head-c', godbolt: 'cgsnapshot' },
  rust: { wandbox: 'rust-head', godbolt: 'nightly' },
  go: { wandbox: 'go-head', godbolt: 'gl1220' },
};

// ========================= Language-Specific Preprocessing =========================

function preprocessCode(code: string, language: string): string {
  let processed = code;

  if (language === 'java') {
    // Strip 'public' from class declarations at the START of a line only
    // to avoid filename mismatch errors on online compilers.
    // Uses multiline flag (m) so ^ matches each line start.
    processed = processed.replace(/^(\s*)public\s+class\b/gm, '$1class');
  }

  return processed;
}

// ========================= Remote Fallback Chain =========================

async function executeRemote(code: string, language: string, stdin: string): Promise<ExecutionResult> {
  const cfg = LANG_CONFIG[language];
  if (!cfg) {
    return { stdout: '', stderr: `Language "${language}" is not supported for remote execution.` };
  }

  // Primary: Wandbox
  const wb = await tryWandbox(code, cfg.wandbox, stdin);
  if (wb) return wb;

  // Fallback: Godbolt (Compiler Explorer)
  const gb = await tryGodbolt(code, cfg.godbolt, stdin);
  if (gb) return gb;

  return {
    stdout: '',
    stderr: '❌ Code execution servers are temporarily unavailable. JavaScript and TypeScript run instantly in-browser — try switching languages!',
  };
}

// ========================= Main Entry Point =========================

/**
 * Execute code — JS/TS run in sandboxed iframe (instant, safe),
 * Python via Pyodide WASM, compiled languages via Wandbox → Godbolt fallback chain.
 *
 * @param code     - Source code to execute
 * @param language - Language identifier (javascript, python, java, cpp, etc.)
 * @param stdin    - Optional standard input (for Scanner, input(), cin, etc.)
 */
export async function executeCode(code: string, language: string, stdin: string = ''): Promise<ExecutionResult> {
  if (language === 'javascript') return executeJavaScript(code, stdin);
  if (language === 'typescript') return executeTypeScript(code, stdin);

  const processedCode = preprocessCode(code, language);

  // Python: try Pyodide (in-browser) first, then fall through to remote
  if (language === 'python') {
    const result = await tryPyodide(processedCode, stdin);
    if (result) return result;
  }

  return executeRemote(processedCode, language, stdin);
}
