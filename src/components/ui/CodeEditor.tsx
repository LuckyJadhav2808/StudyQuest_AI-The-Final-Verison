'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import CodeMirror, { Extension } from '@uiw/react-codemirror';
import { keymap } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { sql } from '@codemirror/lang-sql';
import { rust } from '@codemirror/lang-rust';
import { oneDark } from '@codemirror/theme-one-dark';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { monokai } from '@uiw/codemirror-theme-monokai';
import { nord } from '@uiw/codemirror-theme-nord';
import { checkSyntax, SyntaxError as SyntaxErr } from '@/lib/syntaxChecker';
import { playKeyboardClick } from '@/lib/sounds';

export interface ThemeStyle {
  bg: string;
  text: string;
  gutterBg: string;
  gutterBorder: string;
  gutterText: string;
}

export const THEME_STYLES: Record<string, ThemeStyle> = {
  dracula: {
    bg: '#282a36',
    text: '#f8f8f2',
    gutterBg: '#21222c',
    gutterBorder: '#44475a',
    gutterText: '#6272a4',
  },
  monokai: {
    bg: '#272822',
    text: '#f8f8f2',
    gutterBg: '#1e1f1c',
    gutterBorder: '#3e3d32',
    gutterText: '#75715e',
  },
  nord: {
    bg: '#2e3440',
    text: '#d8dee9',
    gutterBg: '#242933',
    gutterBorder: '#3b4252',
    gutterText: '#4c566a',
  },
  synthwave: {
    bg: '#262335',
    text: '#36f9f6',
    gutterBg: '#241e30',
    gutterBorder: '#ff79c6',
    gutterText: '#ff79c6',
  },
  default: {
    bg: '#0b0f19',
    text: '#f1f5f9',
    gutterBg: 'rgba(15, 23, 42, 0.7)',
    gutterBorder: 'rgba(124, 58, 237, 0.25)',
    gutterText: '#64748b',
  },
};

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  language?: string; // e.g. 'javascript', 'html', 'python'
  minHeight?: string;
  placeholder?: string;
  readOnly?: boolean;
  theme?: string; // e.g. 'dracula', 'monokai', etc.
}

function resolveLanguageExtension(lang: string): Extension {
  const l = (lang || '').toLowerCase().trim();
  switch (l) {
    case 'js':
    case 'javascript':
    case 'jsx':
      return javascript({ jsx: true });
    case 'ts':
    case 'typescript':
    case 'tsx':
      return javascript({ jsx: true, typescript: true });
    case 'py':
    case 'python':
      return python();
    case 'cpp':
    case 'c++':
    case 'c':
      return cpp();
    case 'java':
      return java();
    case 'rust':
    case 'rs':
      return rust();
    case 'sql':
      return sql();
    default:
      return javascript({ jsx: true, typescript: true });
  }
}

function resolveThemeExtension(themeName: string): Extension {
  switch (themeName?.toLowerCase()) {
    case 'dracula':
      return dracula;
    case 'monokai':
      return monokai;
    case 'nord':
      return nord;
    case 'synthwave':
    case 'onedark':
    case 'one-dark':
      return oneDark;
    default:
      return oneDark;
  }
}

/**
 * Production CodeMirror 6 Editor
 * - Full AST syntax highlighting (JS/TS, Python, C++, Java, Rust, SQL)
 * - Auto-close brackets, quotes, and intelligent indentation
 * - Code folding, search & replace (Ctrl+F), line numbers
 * - Multi-theme support (One Dark, Dracula, Monokai, Nord)
 * - Ctrl+Enter execution shortcut and tactile audio clicks
 * - Zero hydration mismatch and responsive mobile support
 */
export default function CodeEditor({
  value,
  onChange,
  onRun,
  language = '',
  minHeight = '300px',
  placeholder = '',
  readOnly = false,
  theme = 'default',
}: CodeEditorProps) {
  const [errors, setErrors] = useState<SyntaxErr[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounced syntax checking (400ms after last keystroke)
  useEffect(() => {
    if (!language) {
      setErrors([]);
      return;
    }
    const timer = setTimeout(() => {
      const errs = checkSyntax(value, language);
      setErrors(errs);
    }, 400);

    return () => clearTimeout(timer);
  }, [value, language]);

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
      playKeyboardClick();
    },
    [onChange],
  );

  const styleTheme = THEME_STYLES[theme] || THEME_STYLES.default;

  const extensions = useMemo(() => {
    const list: Extension[] = [
      resolveLanguageExtension(language),
      resolveThemeExtension(theme),
      EditorView.theme({
        '&': {
          fontSize: '0.875rem',
          height: '100%',
          backgroundColor: styleTheme.bg,
          color: styleTheme.text,
        },
        '.cm-scroller': {
          fontFamily: "var(--font-mono, 'Space Mono', 'Fira Code', 'Courier New', monospace)",
          lineHeight: '1.65rem',
          overflow: 'auto',
        },
        '.cm-gutters': {
          backgroundColor: styleTheme.gutterBg,
          color: styleTheme.gutterText,
          borderRight: `1px solid ${styleTheme.gutterBorder}`,
          paddingRight: '4px',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'rgba(124, 58, 237, 0.15)',
          color: '#c4b5fd',
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(124, 58, 237, 0.05)',
        },
        '&.cm-focused .cm-cursor': {
          borderLeftColor: '#a78bfa',
          borderLeftWidth: '2px',
        },
        '&.cm-focused .cm-selectionBackground, ::selection': {
          backgroundColor: 'rgba(124, 58, 237, 0.35) !important',
        },
      }),
    ];

    if (onRun) {
      list.push(
        keymap.of([
          {
            key: 'Mod-Enter',
            run: () => {
              onRun();
              return true;
            },
          },
        ]),
      );
    }

    return list;
  }, [language, theme, onRun, styleTheme]);

  return (
    <div
      className="flex flex-col relative overflow-hidden w-full h-full border border-white/10 rounded-xl"
      style={{
        minHeight,
        height: '100%',
        backgroundColor: styleTheme.bg,
        color: styleTheme.text,
      }}
    >
      <div className="flex-1 min-h-0 h-full overflow-hidden">
        {mounted ? (
          <CodeMirror
            value={value}
            height="100%"
            minHeight={minHeight}
            extensions={extensions}
            onChange={handleChange}
            placeholder={placeholder}
            readOnly={readOnly}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightSpecialChars: true,
              history: true,
              foldGutter: true,
              drawSelection: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              syntaxHighlighting: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              crosshairCursor: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              closeBracketsKeymap: true,
              defaultKeymap: true,
              searchKeymap: true,
              historyKeymap: true,
              foldKeymap: true,
              completionKeymap: true,
              lintKeymap: true,
            }}
          />
        ) : (
          <div
            className="flex items-center justify-center h-full text-slate-500 font-mono text-xs"
            style={{ minHeight }}
          >
            Loading code engine...
          </div>
        )}
      </div>

      {/* Syntax error status bar */}
      {errors.length > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-t text-xs font-semibold select-none"
          style={{
            borderColor: 'rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#ef4444',
          }}
        >
          <span>●</span>
          <span>
            {errors.length} syntax error{errors.length > 1 ? 's' : ''} detected
            {errors[0] && ` — Line ${errors[0].line}: ${errors[0].message}`}
          </span>
        </div>
      )}
    </div>
  );
}

