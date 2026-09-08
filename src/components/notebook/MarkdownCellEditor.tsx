/**
 * StudyQuest AI — Data Forge Markdown Cell Editor
 * Renders rich Markdown notes with live KaTeX mathematical equations ($$, $),
 * headings, checklists, and code snippets. Supports double-click to edit.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { HiPencilAlt, HiCheck } from 'react-icons/hi';

interface MarkdownCellEditorProps {
  value: string;
  onChange: (value: string) => void;
  onAdvance?: () => void;
}

export default function MarkdownCellEditor({ value, onChange, onAdvance }: MarkdownCellEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(48, textareaRef.current.scrollHeight)}px`;
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift + Enter: Finish editing & advance
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      onAdvance?.();
      return;
    }
    // Escape: Finish editing
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  // Render markdown with KaTeX math
  const renderedHtml = React.useMemo(() => {
    if (!value.trim()) {
      return '<p class="text-slate-400 italic">Empty markdown cell. Double click to add notes or math...</p>';
    }

    try {
      // 1. Replace display math $$ ... $$
      let processed = value.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
        try {
          return `<div class="my-3 text-center">${katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })}</div>`;
        } catch {
          return `$$${tex}$$`;
        }
      });

      // 2. Replace inline math $ ... $
      processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, tex) => {
        try {
          return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
        } catch {
          return `$${tex}$`;
        }
      });

      // 3. Convert markdown to HTML via marked
      return marked.parse(processed, { async: false }) as string;
    } catch {
      return value;
    }
  }, [value]);

  if (isEditing) {
    return (
      <div className="relative rounded-xl border-2 border-primary bg-[var(--card-bg)] overflow-hidden shadow-md">
        <div className="flex items-center justify-between px-3 py-1.5 bg-primary/10 border-b border-primary/20 text-xs text-primary font-bold">
          <span>Editing Markdown / Math (Press Shift+Enter to render)</span>
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-white text-[11px] hover:opacity-90"
          >
            <HiCheck size={12} />
            <span>Render</span>
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.max(48, e.target.scrollHeight)}px`;
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setIsEditing(false)}
          rows={3}
          placeholder="# Heading\nWrite notes or LaTeX math ($$ E = mc^2 $$)..."
          className="w-full p-4 bg-transparent text-[var(--foreground)] font-mono text-sm leading-relaxed resize-none outline-none border-none"
        />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      title="Double click to edit"
      className="relative group rounded-xl p-4 bg-[var(--card-bg)]/60 border border-[var(--card-border)] hover:border-primary/40 cursor-text transition-all"
    >
      <div
        className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-[var(--foreground)]"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
      <button
        onClick={() => setIsEditing(true)}
        title="Edit cell"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-[var(--card-border)] hover:bg-primary hover:text-white text-xs text-[var(--muted-foreground)] flex items-center gap-1"
      >
        <HiPencilAlt size={13} />
        <span className="text-[11px] font-sans font-bold">Edit</span>
      </button>
    </div>
  );
}
