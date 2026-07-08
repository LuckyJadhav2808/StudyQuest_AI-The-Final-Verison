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

// ========================= Remote: Piston API (stable, isolated, free) =========================

async function tryPiston(code: string, language: string, stdin: string): Promise<ExecutionResult | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000); // 12 second execution limit

    const pistonLangMap: Record<string, string> = {
      cpp: 'cpp',
      c: 'c',
      java: 'java',
      python: 'python',
      rust: 'rust',
      go: 'go',
    };

    const lang = pistonLangMap[language] || language;

    const fileExtensionMap: Record<string, string> = {
      cpp: 'cpp',
      c: 'c',
      java: 'java',
      python: 'py',
      rust: 'rs',
      go: 'go',
    };

    const ext = fileExtensionMap[lang] || 'txt';
    const filename = lang === 'java' ? 'Main.java' : `main.${ext}`;

    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: lang,
        version: '*',
        files: [
          {
            name: filename,
            content: code,
          }
        ],
        stdin,
      }),
      signal: ctrl.signal,
    });

    clearTimeout(t);
    if (!res.ok) return null;

    const d = await res.json();
    if (!d.run) return null;

    return {
      stdout: d.run.stdout || '',
      stderr: d.run.stderr || '',
    };
  } catch {
    return null;
  }
}

// ========================= Remote: Wandbox (free, no key) =========================

async function tryWandbox(code: string, compiler: string, stdin: string): Promise<ExecutionResult | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);

    const body: Record<string, any> = { code, compiler, stdin };
    if (compiler.includes('gcc') || compiler.includes('clang')) {
      body.options = 'warning,gnu++20'; // Enable C++20 features on Wandbox GCC compiler
    }

    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

    let userArguments = '';
    if (compilerId.includes('gcc') || compilerId.includes('clang') || compilerId.includes('snapshot')) {
      userArguments = '-std=c++20 -O3'; // Enable C++20 and compiler optimizations
    }

    const res = await fetch(`https://godbolt.org/api/compiler/${compilerId}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        source: code,
        options: {
          userArguments,
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

function preprocessCppCode(code: string, methodNameHint: string = ''): string {
  // If the user already wrote a main function, do not wrap it
  if (code.includes('int main') || code.includes('void main')) {
    return code;
  }

  // Strip comments first to avoid matching commented-out code
  const cleanCode = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  // Extract the contents of class Solution (make closing }; optional)
  const classMatch = cleanCode.match(/class\s+Solution\s*\{([\s\S]*)/);
  if (!classMatch) {
    return code; // If no class Solution matches, return unmodified
  }

  const classBody = classMatch[1];
  let targetMethod = null;

  // If methodNameHint is specified, look for it specifically
  if (methodNameHint) {
    const escapedHint = methodNameHint.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`([^\\s{()]+)\\s+(${escapedHint})\\s*\\(([^)]*)\\)`);
    const m = classBody.match(regex);
    if (m) {
      targetMethod = {
        returnType: m[1].trim(),
        methodName: m[2].trim(),
        paramStr: m[3].trim()
      };
    }
  }

  // Otherwise, find all method definitions inside the class body
  if (!targetMethod) {
    const methodRegex = /([a-zA-Z0-9_:<>]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    let m;
    const methods = [];
    while ((m = methodRegex.exec(classBody)) !== null) {
      const returnType = m[1].trim();
      const methodName = m[2].trim();
      const paramStr = m[3].trim();
      
      if (methodName.toLowerCase() !== 'solution' && !methodName.startsWith('~')) {
        methods.push({ returnType, methodName, paramStr });
      }
    }
    if (methods.length > 0) {
      targetMethod = methods[0];
    }
  }

  if (!targetMethod) {
    return code; // If no target method matches, return unmodified
  }

  const { methodName, paramStr } = targetMethod;

  // Split and parse parameters
  const paramList = paramStr.split(',').map(p => p.trim()).filter(Boolean);
  const parsedParams = paramList.map(p => {
    // strip reference and const modifiers
    p = p.replace(/&/g, '').replace(/\bconst\b/g, '').trim();
    const parts = p.split(/\s+/);
    const name = parts.pop() || '';
    const type = parts.join(' ');
    return { type, name };
  });

  // Build main wrapper
  let mainCode = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
#include <list>
#include <numeric>
#include <map>
#include <set>

using namespace std;

// --- Original User Solution ---
${code}
// -----------------------------

// --- Helper Parsers ---
string trim(const string& s) {
    size_t first = s.find_first_not_of(" \\t\\r\\n");
    if (first == string::npos) return "";
    size_t last = s.find_last_not_of(" \\t\\r\\n");
    return s.substr(first, last - first + 1);
}

vector<int> parseVectorInt(string s) {
    s = trim(s);
    if (s.empty()) return {};
    if (s.front() == '[') s.erase(s.begin());
    if (s.back() == ']') s.pop_back();
    vector<int> res;
    size_t pos = 0;
    while ((pos = s.find(',')) != string::npos) {
        res.push_back(stoi(trim(s.substr(0, pos))));
        s.erase(0, pos + 1);
    }
    string last = trim(s);
    if (!last.empty()) {
        res.push_back(stoi(last));
    }
    return res;
}

vector<string> parseVectorString(string s) {
    s = trim(s);
    if (s.empty()) return {};
    if (s.front() == '[') s.erase(s.begin());
    if (s.back() == ']') s.pop_back();
    vector<string> res;
    size_t pos = 0;
    while ((pos = s.find(',')) != string::npos) {
        string item = trim(s.substr(0, pos));
        if (!item.empty() && (item.front() == '"' || item.front() == '\\'')) item.erase(item.begin());
        if (!item.empty() && (item.back() == '"' || item.back() == '\\'')) item.pop_back();
        res.push_back(item);
        s.erase(0, pos + 1);
    }
    string last = trim(s);
    if (!last.empty() && (last.front() == '"' || last.front() == '\\'')) last.erase(last.begin());
    if (!last.empty() && (last.back() == '"' || last.back() == '\\'')) last.pop_back();
    if (!last.empty()) res.push_back(last);
    return res;
}

vector<vector<int>> parseVectorVectorInt(string s) {
    s = trim(s);
    if (s.empty()) return {};
    if (s.front() == '[') s.erase(s.begin());
    if (s.back() == ']') s.pop_back();
    vector<vector<int>> res;
    int brackets = 0;
    string current = "";
    for (char c : s) {
        if (c == '[') {
            brackets++;
            if (brackets == 1) {
                current = "";
                continue;
            }
        }
        if (c == ']') {
            brackets--;
            if (brackets == 0) {
                res.push_back(parseVectorInt(current));
                current = "";
                continue;
            }
        }
        current += c;
    }
    return res;
}

// --- Overloaded Print Helpers ---
void print(int val) { cout << val << endl; }
void print(long long val) { cout << val << endl; }
void print(double val) { cout << val << endl; }
void print(string val) { cout << "\\"" << val << "\\"" << endl; }
void print(bool val) { cout << (val ? "true" : "false") << endl; }

void print(const vector<int>& vec) {
    cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        cout << vec[i] << (i < vec.size() - 1 ? "," : "");
    }
    cout << "]" << endl;
}

void print(const vector<vector<int>>& vec2d) {
    cout << "[";
    for (size_t i = 0; i < vec2d.size(); ++i) {
        cout << "[";
        for (size_t j = 0; j < vec2d[i].size(); ++j) {
            cout << vec2d[i][j] << (j < vec2d[i].size() - 1 ? "," : "");
        }
        cout << "]" << (i < vec2d.size() - 1 ? "," : "");
    }
    cout << "]" << endl;
}

int main() {
    Solution solver;
`;

  // Append C++ input parsers based on parameter types
  parsedParams.forEach(p => {
    // Determine default fallback string for empty stdin
    let defaultValue = '""';
    if (p.type === 'vector<int>') {
      if (methodName === 'fourSum') defaultValue = '"[1,0,-1,0,-2,2]"';
      else if (methodName === 'twoSum') defaultValue = '"[2,7,11,15]"';
      else if (methodName === 'mergeSorted') defaultValue = '"[1,3,5]"';
      else if (methodName === 'binarySearch' || methodName === 'search') defaultValue = '"[-1,0,3,5,9,12]"';
      else defaultValue = '"[]"';
    } else if (p.type === 'vector<vector<int>>') {
      defaultValue = '"[[]]"';
    } else if (p.type === 'int') {
      if (methodName === 'fourSum') defaultValue = '"0"';
      else if (methodName === 'twoSum') defaultValue = '"9"';
      else if (methodName === 'search' || methodName === 'binarySearch') defaultValue = '"9"';
      else defaultValue = '"0"';
    } else if (p.type === 'double' || p.type === 'float') {
      defaultValue = '"0.0"';
    } else if (p.type === 'string') {
      if (methodName === 'isValid') defaultValue = '"()[]{}"';
      else if (methodName === 'lengthOfLongestSubstring') defaultValue = '"abcabcbb"';
      else defaultValue = '""';
    } else if (p.type === 'char') {
      defaultValue = '"a"';
    } else if (p.type === 'bool') {
      defaultValue = '"true"';
    }

    if (p.type === 'vector<int>') {
      mainCode += `    string line_${p.name};\n`;
      mainCode += `    if (!getline(cin, line_${p.name}) || line_${p.name}.empty()) line_${p.name} = ${defaultValue};\n`;
      mainCode += `    vector<int> ${p.name} = parseVectorInt(line_${p.name});\n`;
    } else if (p.type === 'vector<vector<int>>') {
      mainCode += `    string line_${p.name};\n`;
      mainCode += `    if (!getline(cin, line_${p.name}) || line_${p.name}.empty()) line_${p.name} = ${defaultValue};\n`;
      mainCode += `    vector<vector<int>> ${p.name} = parseVectorVectorInt(line_${p.name});\n`;
    } else if (p.type === 'vector<string>') {
      mainCode += `    string line_${p.name};\n`;
      mainCode += `    if (!getline(cin, line_${p.name}) || line_${p.name}.empty()) line_${p.name} = ${defaultValue};\n`;
      mainCode += `    vector<string> ${p.name} = parseVectorString(line_${p.name});\n`;
    } else if (p.type === 'int') {
      mainCode += `    string line_${p.name};\n`;
      mainCode += `    if (!getline(cin, line_${p.name}) || line_${p.name}.empty()) line_${p.name} = ${defaultValue};\n`;
      mainCode += `    int ${p.name} = stoi(trim(line_${p.name}));\n`;
    } else if (p.type === 'long long') {
      mainCode += `    string line_${p.name};\n`;
      mainCode += `    if (!getline(cin, line_${p.name}) || line_${p.name}.empty()) line_${p.name} = ${defaultValue};\n`;
      mainCode += `    long long ${p.name} = stoll(trim(line_${p.name}));\n`;
    } else if (p.type === 'double') {
      mainCode += `    string line_${p.name};\n`;
      mainCode += `    if (!getline(cin, line_${p.name}) || line_${p.name}.empty()) line_${p.name} = ${defaultValue};\n`;
      mainCode += `    double ${p.name} = stod(trim(line_${p.name}));\n`;
    } else if (p.type === 'string') {
      mainCode += `    string line_${p.name};\n`;
      mainCode += `    if (!getline(cin, line_${p.name}) || line_${p.name}.empty()) line_${p.name} = ${defaultValue};\n`;
      mainCode += `    string ${p.name} = trim(line_${p.name});\n`;
      mainCode += `    if (!${p.name}.empty() && (${p.name}.front() == '"' || ${p.name}.front() == '\\'')) ${p.name}.erase(${p.name}.begin());\n`;
      mainCode += `    if (!${p.name}.empty() && (${p.name}.back() == '"' || ${p.name}.back() == '\\'')) ${p.name}.pop_back();\n`;
    } else if (p.type === 'char') {
      mainCode += `    string line_${p.name};\n`;
      mainCode += `    if (!getline(cin, line_${p.name}) || line_${p.name}.empty()) line_${p.name} = ${defaultValue};\n`;
      mainCode += `    char ${p.name} = trim(line_${p.name}).front();\n`;
    } else if (p.type === 'bool') {
      mainCode += `    string line_${p.name};\n`;
      mainCode += `    if (!getline(cin, line_${p.name}) || line_${p.name}.empty()) line_${p.name} = ${defaultValue};\n`;
      mainCode += `    string val_${p.name} = trim(line_${p.name});\n`;
      mainCode += `    bool ${p.name} = (val_${p.name} == "true" || val_${p.name} == "1");\n`;
    } else {
      mainCode += `    ${p.type} ${p.name};\n`;
    }
  });

  const args = parsedParams.map(p => p.name).join(', ');
  mainCode += `    auto result = solver.${methodName}(${args});\n`;
  mainCode += `    print(result);\n`;
  mainCode += `    return 0;\n}\n`;

  return mainCode;
}

function preprocessCode(code: string, language: string, methodNameHint: string = ''): string {
  let processed = code;

  if (language === 'java') {
    // Strip 'public' from class declarations at the START of a line only
    // to avoid filename mismatch errors on online compilers.
    // Uses multiline flag (m) so ^ matches each line start.
    processed = processed.replace(/^(\s*)public\s+class\b/gm, '$1class');
  } else if (language === 'cpp') {
    processed = preprocessCppCode(processed, methodNameHint);
  }

  return processed;
}

// ========================= Remote Fallback Chain =========================

async function executeRemote(code: string, language: string, stdin: string): Promise<ExecutionResult> {
  const cfg = LANG_CONFIG[language];
  if (!cfg) {
    return { stdout: '', stderr: `Language "${language}" is not supported for remote execution.` };
  }

  // 1. Primary remote runner: Wandbox compiler API (fast, free compilation)
  const wb = await tryWandbox(code, cfg.wandbox, stdin);
  if (wb) return wb;

  // 2. Fallback 1: Godbolt (Compiler Explorer)
  const gb = await tryGodbolt(code, cfg.godbolt, stdin);
  if (gb) return gb;

  // 3. Fallback 2: Piston API (only as last backup)
  const ps = await tryPiston(code, language, stdin);
  if (ps) return ps;

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
export async function executeCode(code: string, language: string, stdin: string = '', methodNameHint: string = ''): Promise<ExecutionResult> {
  let finalStdin = stdin;
  if (!finalStdin.trim() && methodNameHint) {
    const defaults: Record<string, string> = {
      twoSum: '[2,7,11,15]\n9',
      fourSum: '[1,0,-1,0,-2,2]\n0',
      reverseString: '["h","e","l","l","o"]',
      isValid: '"()[]{}"',
      search: '[-1,0,3,5,9,12]\n9',
      lengthOfLongestSubstring: '"abcabcbb"',
      mergeSorted: '[1,3,5]\n[2,4,6]',
    };
    finalStdin = defaults[methodNameHint] || '';
  }

  if (language === 'javascript') return executeJavaScript(code, finalStdin);
  if (language === 'typescript') return executeTypeScript(code, finalStdin);

  const processedCode = preprocessCode(code, language, methodNameHint);

  // Python: try Pyodide (in-browser) first, then fall through to remote
  if (language === 'python') {
    const result = await tryPyodide(processedCode, finalStdin);
    if (result) return result;
  }

  return executeRemote(processedCode, language, finalStdin);
}
