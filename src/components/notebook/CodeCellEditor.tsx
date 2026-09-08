/**
 * StudyQuest AI — Data Forge Code Cell Editor
 * Lightweight, high-performance Python editor with line numbers,
 * syntax highlighting, auto-indentation, and Colab keyboard shortcuts (Shift+Enter).
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { playKeyboardClick } from '@/lib/sounds';
import { PYTHON_COMPLETIONS, PythonCompletionItem } from '@/data/pythonCompletions';

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

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<PythonCompletionItem[]>([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const [completionPrefix, setCompletionPrefix] = useState<{
    objectKey: string;
    filter: string;
    replaceStart: number;
  } | null>(null);

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

  const closeAutocomplete = () => {
    setSuggestions([]);
    setPopupPos(null);
    setCompletionPrefix(null);
  };

  const checkAutocomplete = (text: string, cursorPos: number) => {
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastLine = textBeforeCursor.split('\n').pop() || '';

    // Match patterns like "df.", "df.he", "np.ze", "plt.sc"
    const match = lastLine.match(/(?:^|[^\w])(df|pd|np|plt|sns|model|clf|reg|rf)\.([a-zA-Z0-9_]*)$/);

    if (match) {
      const objectKey = match[1].toLowerCase();
      const filter = match[2].toLowerCase();
      const available = PYTHON_COMPLETIONS[objectKey] || [];

      const filtered = available.filter((item) =>
        item.name.toLowerCase().startsWith(filter)
      );

      if (filtered.length > 0) {
        // Calculate approx line number and col position for popup
        const lineIdx = textBeforeCursor.split('\n').length - 1;
        const colIdx = lastLine.length;

        setSuggestions(filtered);
        setActiveSuggestionIdx(0);
        setPopupPos({
          top: Math.max(34, lineIdx * 24 + 32),
          left: Math.min(360, Math.max(48, colIdx * 7.8 + 44)),
        });
        setCompletionPrefix({
          objectKey,
          filter: match[2],
          replaceStart: cursorPos - match[2].length,
        });
        return;
      }
    }

    closeAutocomplete();
  };

  const applyCompletion = useCallback(
    (item: PythonCompletionItem) => {
      if (!completionPrefix || !textareaRef.current) return;

      const el = textareaRef.current;
      const cursorPos = el.selectionStart;
      const start = completionPrefix.replaceStart;

      const next = value.substring(0, start) + item.insertText + value.substring(cursorPos);
      onChange(next);

      closeAutocomplete();

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = start + item.insertText.length;
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
        }
      }, 0);
    },
    [completionPrefix, value, onChange]
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const pos = e.target.selectionStart;
    onChange(newVal);
    checkAutocomplete(newVal, pos);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    playKeyboardClick();

    // Autocomplete Navigation Keys
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIdx((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey)) {
        e.preventDefault();
        applyCompletion(suggestions[activeSuggestionIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAutocomplete();
        return;
      }
    }

    // Shift + Enter: Run and advance to next cell
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      closeAutocomplete();
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
      closeAutocomplete();
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
      closeAutocomplete();
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
    <div className="relative flex rounded-xl border border-[var(--card-border)] bg-slate-950 text-slate-100 font-mono text-[13px] group focus-within:border-primary/80 focus-within:shadow-[0_0_15px_rgba(124,58,237,0.15)] transition-all">
      {/* Line Numbers Gutter */}
      <div
        ref={lineNumbersRef}
        className="w-10 py-3.5 select-none bg-slate-900/90 text-slate-500 text-right pr-3 font-mono text-xs border-r border-slate-800/80 overflow-hidden shrink-0 rounded-l-xl"
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
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onClick={(e) => checkAutocomplete(value, (e.target as HTMLTextAreaElement).selectionStart)}
          onBlur={() => setTimeout(closeAutocomplete, 200)}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          rows={1}
          className="w-full h-full p-3.5 bg-transparent text-slate-100 font-mono text-[13px] leading-6 resize-none outline-none overflow-hidden placeholder:text-slate-600 border-none"
        />

        {/* Floating Autocomplete & Method Inspector Popover */}
        {suggestions.length > 0 && popupPos && (
          <div
            style={{ top: `${popupPos.top}px`, left: `${popupPos.left}px` }}
            className="absolute z-50 w-72 max-h-56 bg-slate-900/95 backdrop-blur-md border border-primary/40 rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans"
          >
            {/* Header pill */}
            <div className="px-2.5 py-1 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-[10px] text-text-muted">
              <span className="font-bold text-primary uppercase tracking-wider">
                {completionPrefix?.objectKey} Methods
              </span>
              <span>Tab / ↵ to insert</span>
            </div>

            {/* List */}
            <div className="overflow-y-auto custom-scrollbar p-1 space-y-0.5 max-h-36">
              {suggestions.map((item, idx) => {
                const isActive = idx === activeSuggestionIdx;
                return (
                  <div
                    key={item.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyCompletion(item);
                    }}
                    onMouseEnter={() => setActiveSuggestionIdx(idx)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                      isActive
                        ? 'bg-primary text-white font-bold'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono text-[11px] text-emerald-400">
                        {isActive ? '●' : 'ƒ'}
                      </span>
                      <span className="truncate">{item.signature}</span>
                    </div>
                    <span
                      className={`text-[9px] uppercase px-1 rounded shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Active docstring inspector */}
            {suggestions[activeSuggestionIdx] && (
              <div className="px-2.5 py-1.5 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-400 leading-snug line-clamp-2">
                {suggestions[activeSuggestionIdx].doc}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
