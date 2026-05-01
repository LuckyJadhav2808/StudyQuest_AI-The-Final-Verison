/**
 * StudyQuest Code Execution Engine
 * Browser-based execution for JS/TS, Wandbox API for compiled languages
 */

interface ExecutionResult {
  stdout: string;
  stderr: string;
}

/** Execute JavaScript in browser via sandboxed Function + console capture */
function executeJavaScript(code: string): ExecutionResult {
  const logs: string[] = [];
  const errors: string[] = [];

  const fakeConsole = {
    log: (...args: unknown[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
    error: (...args: unknown[]) => errors.push(args.map(a => String(a)).join(' ')),
    warn: (...args: unknown[]) => logs.push('[WARN] ' + args.map(a => String(a)).join(' ')),
    info: (...args: unknown[]) => logs.push(args.map(a => String(a)).join(' ')),
    table: (data: unknown) => logs.push(JSON.stringify(data, null, 2)),
    dir: (obj: unknown) => logs.push(JSON.stringify(obj, null, 2)),
    clear: () => { logs.length = 0; },
  };

  try {
    const fn = new Function('console', code);
    fn(fakeConsole);
    return { stdout: logs.join('\n'), stderr: errors.join('\n') };
  } catch (err) {
    return { stdout: logs.join('\n'), stderr: err instanceof Error ? err.message : String(err) };
  }
}

/** Execute TypeScript by stripping types and running as JS */
function executeTypeScript(code: string): ExecutionResult {
  // Simple TS → JS transform: strip type annotations
  const jsCode = code
    .replace(/:\s*(string|number|boolean|any|void|never|unknown|object|undefined|null)\b(\[\])?/g, '')
    .replace(/:\s*\{[^}]*\}/g, '')
    .replace(/:\s*[A-Z]\w*(<[^>]*>)?(\[\])?/g, '')
    .replace(/<[A-Z]\w*(,\s*[A-Z]\w*)*>/g, '')
    .replace(/\binterface\s+\w+\s*\{[^}]*\}/g, '')
    .replace(/\btype\s+\w+\s*=\s*[^;]+;/g, '')
    .replace(/\bas\s+\w+/g, '')
    .replace(/\benum\s+\w+\s*\{[^}]*\}/g, '');
  return executeJavaScript(jsCode);
}

/** Execute Python via Pyodide-like approach or Wandbox */
async function executePython(code: string): Promise<ExecutionResult> {
  try {
    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, compiler: 'cpython-3.10.2' }),
    });
    const data = await res.json();
    return {
      stdout: data.program_output || '',
      stderr: data.compiler_error || data.program_error || '',
    };
  } catch {
    return { stdout: '', stderr: '❌ Failed to connect to Python execution server. Check your network.' };
  }
}

/** Execute compiled languages via Wandbox API (free, no key needed) */
async function executeWandbox(code: string, compiler: string): Promise<ExecutionResult> {
  try {
    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, compiler }),
    });
    const data = await res.json();
    return {
      stdout: data.program_output || '',
      stderr: data.compiler_error || data.program_error || '',
    };
  } catch {
    return { stdout: '', stderr: '❌ Failed to connect to execution server. Check your network.' };
  }
}

const WANDBOX_COMPILERS: Record<string, string> = {
  python: 'cpython-3.10.2',
  java: 'openjdk-jdk-15.0.3+2',
  cpp: 'gcc-12.1.0',
  c: 'gcc-12.1.0-c',
  rust: 'rust-1.64.0',
  go: 'go-1.19.1',
};

/**
 * Main execution entry point
 * JS/TS run in-browser (instant), all others use Wandbox API (free)
 */
export async function executeCode(code: string, language: string): Promise<ExecutionResult> {
  if (language === 'javascript') {
    return executeJavaScript(code);
  }
  if (language === 'typescript') {
    return executeTypeScript(code);
  }

  const compiler = WANDBOX_COMPILERS[language];
  if (!compiler) {
    return { stdout: '', stderr: `Language "${language}" is not supported for remote execution.` };
  }

  return executeWandbox(code, compiler);
}
