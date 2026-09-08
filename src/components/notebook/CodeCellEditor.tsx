/**
 * StudyQuest AI — Data Forge Code Cell Editor
 * Lightweight, high-performance Python editor with line numbers,
 * syntax highlighting, auto-indentation, and Colab keyboard shortcuts (Shift+Enter).
 */

'use client';

import React, { useRef, useEffect } from 'react';
import { playKeyboardClick } from '@/lib/sounds';

interface CodeCellEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onRunAndAdvance?: () => void;
  onRunAndInsert?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function CodeCellEditor({
  value,
  onChange,
  onRun,
  onRunAndAdvance,
  onRunAndInsert,
  placeholder = '# Type Python code here...',
  disabled = false,
}: CodeCellEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');
  const lineCount = Math.max(1, lines.length);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.max(48, el.scrollHeight)}px`;
    }
  }, [value]);

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    playKeyboardClick();

    // Shift + Enter: Run and advance to next cell
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (onRunAndAdvance) {
        onRunAndAdvance();
      } else {
        onRun();
      }
      return;
    }

    // Alt + Enter: Run and insert new cell below
    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      if (onRunAndInsert) {
        onRunAndInsert();
      } else {
        onRun();
      }
      return;
    }

    // Ctrl + Enter (or Cmd + Enter): Run in place
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onRun();
      return;
    }

    // Tab: Insert 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = value.substring(0, start) + '    ' + value.substring(end);
      onChange(next);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      }, 0);
      return;
    }

    // Auto-indent on Enter
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const el = e.currentTarget;
      const start = el.selectionStart;
      const currentLine = value.substring(0, start).split('\n').pop() || '';
      const match = currentLine.match(/^(\s+)/);
      const indent = match ? match[1] : '';
      const extraIndent = currentLine.trimEnd().endsWith(':') ? '    ' : '';

      if (indent || extraIndent) {
        e.preventDefault();
        const addition = '\n' + indent + extraIndent;
        const next = value.substring(0, start) + addition + value.substring(start);
        onChange(next);
        setTimeout(() => {
          el.selectionStart = el.selectionEnd = start + addition.length;
        }, 0);
      }
    }
  };

  return (
    <div className="relative flex rounded-xl border border-[var(--card-border)] bg-slate-950 text-slate-100 font-mono text-[13px] overflow-hidden group focus-within:border-primary/80 focus-within:shadow-[0_0_15px_rgba(124,58,237,0.15)] transition-all">
      {/* Line Numbers Gutter */}
      <div
        ref={lineNumbersRef}
        className="w-10 py-3.5 select-none bg-slate-900/90 text-slate-500 text-right pr-3 font-mono text-xs border-r border-slate-800/80 overflow-hidden shrink-0"
      >
        {Array.from({ length: lineCount }).map((_, i) => (
          <div key={i} className="leading-6">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Code Textarea */}
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          rows={1}
          className="w-full h-full p-3.5 bg-transparent text-slate-100 font-mono text-[13px] leading-6 resize-none outline-none overflow-hidden placeholder:text-slate-600 border-none"
        />
      </div>
    </div>
  );
}
