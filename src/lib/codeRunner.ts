/**
 * StudyQuest Code Execution Engine
 * Browser-based execution for JS/TS
 * Wandbox API (with -head compilers) + Rextester fallback for compiled languages
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

// =================== Remote Execution APIs ===================

/** Wandbox API — use `-head` compilers that always exist */
async function tryWandbox(code: string, compiler: string): Promise<ExecutionResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, compiler }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null; // fallback on HTTP errors (500, etc.)

    const data = await res.json();
    return {
      stdout: data.program_output || '',
      stderr: data.compiler_error || data.program_error || '',
    };
  } catch {
    return null; // network error or timeout → try fallback
  }
}

/** Rextester API — free fallback, no key needed */
async function tryRextester(code: string, langId: number): Promise<ExecutionResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const formData = new URLSearchParams();
    formData.append('LanguageChoice', String(langId));
    formData.append('Program', code);
    formData.append('Input', '');
    formData.append('CompilerArgs', '');

    const res = await fetch('https://rextester.com/rundotnet/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    return {
      stdout: data.Result || '',
      stderr: data.Errors || data.Warnings || '',
    };
  } catch {
    return null;
  }
}

// Language configurations with primary (Wandbox) and fallback (Rextester) compilers
interface LangConfig {
  wandbox: string;       // Wandbox compiler name (use -head for latest)
  rextesterId: number;   // Rextester language ID
}

const LANG_CONFIG: Record<string, LangConfig> = {
  python:  { wandbox: 'cpython-head',  rextesterId: 24 },
  java:    { wandbox: 'openjdk-head',  rextesterId: 4 },
  cpp:     { wandbox: 'gcc-head',      rextesterId: 7 },
  c:       { wandbox: 'gcc-head-c',    rextesterId: 6 },
  rust:    { wandbox: 'rust-head',     rextesterId: 46 },
  go:      { wandbox: 'go-head',       rextesterId: 20 },
};

/**
 * Execute code with fallback chain: Wandbox → Rextester
 */
async function executeRemote(code: string, language: string): Promise<ExecutionResult> {
  const config = LANG_CONFIG[language];
  if (!config) {
    return { stdout: '', stderr: `Language "${language}" is not supported for remote execution.` };
  }

  // Try Wandbox first (generally faster, better output)
  const wandboxResult = await tryWandbox(code, config.wandbox);
  if (wandboxResult) return wandboxResult;

  // Fallback to Rextester
  const rextesterResult = await tryRextester(code, config.rextesterId);
  if (rextesterResult) return rextesterResult;

  // Both failed
  return {
    stdout: '',
    stderr: '❌ Code execution servers are temporarily unavailable. JavaScript and TypeScript run instantly in-browser — try switching languages!',
  };
}

/**
 * Main execution entry point
 * JS/TS run in-browser (instant, always works), others use remote APIs with fallback
 */
export async function executeCode(code: string, language: string): Promise<ExecutionResult> {
  if (language === 'javascript') {
    return executeJavaScript(code);
  }
  if (language === 'typescript') {
    return executeTypeScript(code);
  }

  return executeRemote(code, language);
}
