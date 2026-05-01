'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  minHeight?: string;
  placeholder?: string;
  readOnly?: boolean;
}

/**
 * Code editor with synchronized line numbers, Tab indent, and Ctrl+Enter run.
 * Uses a textarea overlaid on a line-number gutter — lightweight, no deps.
 */
export default function CodeEditor({
  value,
  onChange,
  onRun,
  minHeight = '300px',
  placeholder = '',
  readOnly = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);

  // Update line count whenever value changes
  useEffect(() => {
    const count = value.split('\n').length;
    setLineCount(count);
  }, [value]);

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
        // Restore cursor position after React re-renders
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange, onRun],
  );

  return (
    <div className="flex relative" style={{ minHeight }}>
      {/* Line numbers gutter */}
      <div
        ref={lineNumberRef}
        className="flex-shrink-0 select-none overflow-hidden text-right pr-2 pt-4 pb-4 border-r-2 border-[var(--card-border)]"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          lineHeight: '1.625rem',
          width: '3rem',
          color: 'var(--muted-foreground)',
          opacity: 0.5,
        }}
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1}>{i + 1}</div>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent resize-none outline-none text-sm px-3 py-4"
        style={{
          fontFamily: 'var(--font-mono)',
          lineHeight: '1.625rem',
          minHeight,
          tabSize: 2,
        }}
        spellCheck={false}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}
