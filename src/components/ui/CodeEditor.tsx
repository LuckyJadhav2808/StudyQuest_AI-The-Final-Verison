'use client';

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
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
    gutterText: '#6272a4'
  },
  monokai: {
    bg: '#272822',
    text: '#f8f8f2',
    gutterBg: '#1e1f1c',
    gutterBorder: '#3e3d32',
    gutterText: '#75715e'
  },
  nord: {
    bg: '#2e3440',
    text: '#d8dee9',
    gutterBg: '#242933',
    gutterBorder: '#3b4252',
    gutterText: '#4c566a'
  },
  synthwave: {
    bg: '#262335',
    text: '#36f9f6',
    gutterBg: '#241e30',
    gutterBorder: '#ff79c6',
    gutterText: '#ff79c6'
  },
  default: {
    bg: 'transparent',
    text: 'inherit',
    gutterBg: 'transparent',
    gutterBorder: 'var(--card-border)',
    gutterText: 'var(--muted-foreground)'
  }
};

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  language?: string;         // e.g. 'javascript', 'html', 'python'
  minHeight?: string;
  placeholder?: string;
  readOnly?: boolean;
  theme?: string;            // e.g. 'dracula', 'monokai', etc.
}

/**
 * Code editor with synchronized line numbers, syntax error gutter markers,
 * Tab indent, and Ctrl+Enter run.
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [errors, setErrors] = useState<SyntaxErr[]>([]);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update line count whenever value changes
  useEffect(() => {
    const count = value.split('\n').length;
    setLineCount(count);
  }, [value]);

  // Debounced syntax checking (300ms after last keystroke)
  useEffect(() => {
    if (!language) {
      setErrors([]);
      return;
    }
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(() => {
      const errs = checkSyntax(value, language);
      setErrors(errs);
    }, 400);

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [value, language]);

  // Build a set of error lines for O(1) lookup
  const errorLines = useMemo(() => {
    const set = new Set<number>();
    errors.forEach((e) => set.add(e.line));
    return set;
  }, [errors]);

  // Build tooltip map: line → message
  const errorMessages = useMemo(() => {
    const map = new Map<number, string>();
    errors.forEach((e) => {
      const existing = map.get(e.line);
      map.set(e.line, existing ? `${existing}\n${e.message}` : e.message);
    });
    return map;
  }, [errors]);

  // Sync scroll between line numbers and textarea
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+Enter → run
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        onRun?.();
        return;
      }
      // Tab → insert 2 spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const el = e.currentTarget;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newVal = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newVal);
        playKeyboardClick();
        // Restore cursor position after React re-renders
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange, onRun],
  );

  const styleTheme = THEME_STYLES[theme] || THEME_STYLES.default;

  return (
    <div className="flex flex-col relative overflow-hidden" style={{ minHeight, backgroundColor: styleTheme.bg, color: styleTheme.text, borderRadius: '0.75rem' }}>
      <div className="flex flex-1 min-h-0">
        {/* Line numbers gutter */}
        <div
          ref={lineNumberRef}
          className="flex-shrink-0 select-none overflow-hidden text-right pr-1 pt-4 pb-4 border-r-2 code-scroll"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            lineHeight: '1.625rem',
            width: '3.5rem',
            color: styleTheme.gutterText,
            backgroundColor: styleTheme.gutterBg,
            borderColor: styleTheme.gutterBorder,
            opacity: theme === 'default' ? 0.5 : 0.8,
          }}
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, i) => {
            const lineNum = i + 1;
            const hasError = errorLines.has(lineNum);
            return (
              <div
                key={lineNum}
                title={hasError ? errorMessages.get(lineNum) : undefined}
                style={hasError ? {
                  color: '#ef4444',
                  opacity: 1,
                  fontWeight: 700,
                  position: 'relative',
                  cursor: 'help',
                } : undefined}
              >
                {hasError && (
                  <span style={{
                    position: 'absolute',
                    left: '2px',
                    color: '#ef4444',
                    fontSize: '0.7rem',
                  }}>●</span>
                )}
                <span style={{ paddingRight: '0.25rem' }}>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            playKeyboardClick();
          }}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent resize-none outline-none text-sm px-3 py-4 code-scroll"
          style={{
            fontFamily: 'var(--font-mono)',
            lineHeight: '1.625rem',
            minHeight,
            tabSize: 2,
            color: styleTheme.text,
            backgroundColor: styleTheme.bg,
          }}
          spellCheck={false}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      </div>

      {/* Error bar — shows at bottom when errors exist */}
      {errors.length > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-t-2 text-xs font-semibold"
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
