'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { HiSparkles, HiCheck } from 'react-icons/hi';
import {
  autocorrectWord,
  isMisspelled,
  getSpellingSuggestions,
  cleanWord,
} from '@/lib/spellcheck';
import { getAutocompleteSuggestions } from '@/data/notesAutocompleteDataset';
import { useAuthContext } from '@/context/AuthContext';
import { uploadNoteImage } from '@/lib/storage';
import toast from 'react-hot-toast';

const ReactQuill = dynamic(
  async () => {
    const quillModule = await import('react-quill-new');
    const Quill = quillModule.default.Quill || (quillModule as any).Quill;
    const Embed = Quill.import('blots/embed') as any;

    class MathEmbed extends Embed {
      static blotName = 'math';
      static tagName = 'math-field';

      static create(value: any) {
        const node = value instanceof HTMLElement ? value : super.create(value);
        let latex = '';
        let isBlock = false;

        if (value instanceof HTMLElement) {
          latex = value.getAttribute('data-latex') || '';
          isBlock = value.getAttribute('data-block') === 'true';
        } else if (value && typeof value === 'object') {
          latex = value.latex || '';
          isBlock = value.isBlock === true;
        } else if (typeof value === 'string') {
          latex = value;
        }

        node.setAttribute('data-latex', latex);
        node.setAttribute('data-block', isBlock ? 'true' : 'false');
        node.className = 'studyquest-math-embed';
        node.contentEditable = 'false';

        let shadow = node.shadowRoot;
        let container;
        if (!shadow && node.attachShadow) {
          shadow = node.attachShadow({ mode: 'open' });
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
          shadow.appendChild(link);

          const style = document.createElement('style');
          style.textContent = `
            .katex-display { margin: 8px 0; display: block; }
            .studyquest-math-container { display: inline-block; color: inherit !important; }
            .katex { color: inherit !important; }
          `;
          shadow.appendChild(style);

          container = document.createElement('span');
          container.className = 'studyquest-math-container';
          shadow.appendChild(container);
        } else if (shadow) {
          container = shadow.querySelector('.studyquest-math-container');
        }

        if (container) {
          import('katex').then((katexMod) => {
            const katex = katexMod.default;
            try {
              katex.render(latex, container, {
                displayMode: isBlock,
                throwOnError: false,
              });
            } catch {
              container.textContent = latex;
            }
          });
        } else if (!node.attachShadow) {
          node.textContent = latex;
        }
        return node;
      }

      static value(node: HTMLElement) {
        return {
          latex: node.getAttribute('data-latex') || '',
          isBlock: node.getAttribute('data-block') === 'true',
        };
      }
    }

    Quill.register(MathEmbed, true);
    return quillModule.default;
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] flex items-center justify-center text-sm text-[var(--muted-foreground)] animate-pulse">
        Initializing StudyQuest Editor...
      </div>
    ),
  }
) as any;

export const sanitizeHtmlForQuill = (html: string): string => {
  if (!html) return '';
  if (
    !html.includes('katex') &&
    !html.includes('studyquest-math-embed') &&
    !html.includes('math-field')
  ) {
    return html;
  }

  if (typeof window === 'undefined') return html;

  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 1. Clean up studyquest-math-embed / math-field: strip all internal children
    const mathEmbeds = tempDiv.querySelectorAll('.studyquest-math-embed, math-field');
    mathEmbeds.forEach((el) => {
      el.innerHTML = '';
    });

    // 2. Remove standard KaTeX rendered elements
    const katexElements = tempDiv.querySelectorAll('.katex');
    katexElements.forEach((el) => {
      const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
      if (annotation && annotation.textContent) {
        const latex = annotation.textContent.trim();
        const parent = el.parentElement;
        const isBlock =
          parent?.classList.contains('katex-block') ||
          parent?.classList.contains('katex-display') ||
          el.classList.contains('katex-display');

        const newText = isBlock ? `$$${latex}$$` : `$${latex}$`;
        const textNode = document.createTextNode(newText);
        el.parentNode?.replaceChild(textNode, el);
      } else {
        el.parentNode?.removeChild(el);
      }
    });

    // 3. Remove other loose KaTeX wraps
    const katexWraps = tempDiv.querySelectorAll('.katex-block, .katex-inline, .katex-display');
    katexWraps.forEach((el) => {
      if (el.parentNode) {
        if (!el.textContent?.trim()) {
          el.parentNode.removeChild(el);
        } else {
          const textNode = document.createTextNode(el.textContent);
          el.parentNode.replaceChild(textNode, el);
        }
      }
    });

    return tempDiv.innerHTML;
  } catch (e) {
    console.warn('Failed to sanitize HTML for Quill:', e);
    return html;
  }
};

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    [{ color: [] }, { background: [] }],
    ['clean'],
  ],
  table: true,
  history: { delay: 400, maxStack: 100, userOnly: true },
  keyboard: {
    bindings: {
      heading1: {
        key: '1',
        shortKey: true,
        handler: function (this: any) {
          this.quill.format('header', 1);
        },
      },
      heading2: {
        key: '2',
        shortKey: true,
        handler: function (this: any) {
          this.quill.format('header', 2);
        },
      },
      heading3: {
        key: '3',
        shortKey: true,
        handler: function (this: any) {
          this.quill.format('header', 3);
        },
      },
      normalText: {
        key: '0',
        shortKey: true,
        handler: function (this: any) {
          this.quill.format('header', false);
        },
      },
    },
  },
};

const QUILL_FORMATS = [
  'header',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'indent',
  'align',
  'blockquote',
  'code-block',
  'link',
  'image',
  'color',
  'background',
  'table',
  'math',
];

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'Visual Callouts' | 'Media & Math' | 'Basic Blocks' | 'AI & Tools';
  keywords: string[];
  action: (quill: any, index: number, onOpenDiagram?: () => void) => void;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: 'tip',
    title: 'Tip Callout',
    description: 'Highlighted card with green accent and tip icon',
    icon: '💡',
    category: 'Visual Callouts',
    keywords: ['tip', 'callout', 'box', 'note', 'alert'],
    action: (quill, index) => {
      quill.clipboard.dangerouslyPasteHTML(
        index,
        '<div class="studyquest-callout studyquest-callout-tip"><div class="studyquest-callout-header"><span class="studyquest-callout-icon">💡</span><span class="studyquest-callout-title">Tip</span></div><div class="studyquest-callout-content"><p>Enter your key insight, formula, or tip...</p></div></div><p><br></p>',
        'user'
      );
    },
  },
  {
    id: 'important',
    title: 'Important Callout',
    description: 'Crucial concept card with purple accent',
    icon: '⚡',
    category: 'Visual Callouts',
    keywords: ['important', 'alert', 'callout', 'crucial', 'exam'],
    action: (quill, index) => {
      quill.clipboard.dangerouslyPasteHTML(
        index,
        '<div class="studyquest-callout studyquest-callout-important"><div class="studyquest-callout-header"><span class="studyquest-callout-icon">⚡</span><span class="studyquest-callout-title">Important</span></div><div class="studyquest-callout-content"><p>Crucial exam concept or core takeaway...</p></div></div><p><br></p>',
        'user'
      );
    },
  },
  {
    id: 'warning',
    title: 'Warning Callout',
    description: 'Caution alert for common edge cases',
    icon: '⚠️',
    category: 'Visual Callouts',
    keywords: ['warning', 'caution', 'alert', 'beware', 'danger'],
    action: (quill, index) => {
      quill.clipboard.dangerouslyPasteHTML(
        index,
        '<div class="studyquest-callout studyquest-callout-warning"><div class="studyquest-callout-header"><span class="studyquest-callout-icon">⚠️</span><span class="studyquest-callout-title">Warning</span></div><div class="studyquest-callout-content"><p>Common misconception or edge case to avoid...</p></div></div><p><br></p>',
        'user'
      );
    },
  },
  {
    id: 'math',
    title: 'Math Formula',
    description: 'KaTeX LaTeX math equation block',
    icon: '🧮',
    category: 'Media & Math',
    keywords: ['math', 'latex', 'formula', 'equation', 'integral', 'katex'],
    action: (quill, index) => {
      quill.clipboard.dangerouslyPasteHTML(
        index,
        '<p class="studyquest-math-embed" data-latex="f(x) = \\int_{0}^{\\infty} e^{-x^2} dx" data-block="true"></p><p><br></p>',
        'user'
      );
    },
  },
  {
    id: 'table',
    title: 'Data Table',
    description: '3x3 structured comparison table',
    icon: '📊',
    category: 'Media & Math',
    keywords: ['table', 'grid', 'matrix', 'data', 'comparison'],
    action: (quill, index) => {
      quill.clipboard.dangerouslyPasteHTML(
        index,
        '<div class="studyquest-table-wrapper"><table class="studyquest-table"><thead><tr><th>Property / Concept</th><th>Definition / Formula</th><th>Notes</th></tr></thead><tbody><tr><td>Concept A</td><td>Description or Value</td><td>Key nuance</td></tr><tr><td>Concept B</td><td>Description or Value</td><td>Key nuance</td></tr></tbody></table></div><p><br></p>',
        'user'
      );
    },
  },
  {
    id: 'code',
    title: 'Code Block',
    description: 'Syntax highlighted monospace block',
    icon: '💻',
    category: 'Media & Math',
    keywords: ['code', 'snippet', 'syntax', 'programming', 'pre', 'function'],
    action: (quill, index) => {
      quill.clipboard.dangerouslyPasteHTML(
        index,
        '<pre class="ql-syntax" spellcheck="false">// Code block&#10;function solve() {&#10;  return true;&#10;}&#10;</pre><p><br></p>',
        'user'
      );
    },
  },
  {
    id: 'h1',
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    category: 'Basic Blocks',
    keywords: ['h1', 'heading', 'title', 'header'],
    action: (quill, index) => {
      quill.formatLine(index, 1, 'header', 1, 'user');
    },
  },
  {
    id: 'h2',
    title: 'Heading 2',
    description: 'Medium subsection heading',
    icon: 'H2',
    category: 'Basic Blocks',
    keywords: ['h2', 'heading', 'subtitle'],
    action: (quill, index) => {
      quill.formatLine(index, 1, 'header', 2, 'user');
    },
  },
  {
    id: 'h3',
    title: 'Heading 3',
    description: 'Small subsection heading',
    icon: 'H3',
    category: 'Basic Blocks',
    keywords: ['h3', 'heading', 'subheading'],
    action: (quill, index) => {
      quill.formatLine(index, 1, 'header', 3, 'user');
    },
  },
  {
    id: 'todo',
    title: 'To-Do / Checklist',
    description: 'Trackable task item',
    icon: '☑️',
    category: 'Basic Blocks',
    keywords: ['todo', 'task', 'checklist', 'check'],
    action: (quill, index) => {
      quill.clipboard.dangerouslyPasteHTML(
        index,
        '<p>☐ <strong>Task:</strong> Add action item here...</p>',
        'user'
      );
    },
  },
  {
    id: 'bullet',
    title: 'Bulleted List',
    description: 'Unordered bullet point list',
    icon: '•',
    category: 'Basic Blocks',
    keywords: ['bullet', 'list', 'ul', 'unordered'],
    action: (quill, index) => {
      quill.formatLine(index, 1, 'list', 'bullet', 'user');
    },
  },
  {
    id: 'number',
    title: 'Numbered List',
    description: 'Sequential ordered list',
    icon: '1.',
    category: 'Basic Blocks',
    keywords: ['number', 'ordered', 'ol', 'list', '1'],
    action: (quill, index) => {
      quill.formatLine(index, 1, 'list', 'ordered', 'user');
    },
  },
  {
    id: 'quote',
    title: 'Blockquote',
    description: 'Quotation block with left accent',
    icon: '💬',
    category: 'Basic Blocks',
    keywords: ['quote', 'blockquote', 'saying'],
    action: (quill, index) => {
      quill.formatLine(index, 1, 'blockquote', true, 'user');
    },
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Clean visual horizontal separator',
    icon: '➖',
    category: 'Basic Blocks',
    keywords: ['divider', 'hr', 'line', 'separator'],
    action: (quill, index) => {
      quill.clipboard.dangerouslyPasteHTML(
        index,
        '<hr class="studyquest-hr" /><p><br></p>',
        'user'
      );
    },
  },
  {
    id: 'diagram',
    title: 'Mermaid Diagram',
    description: 'Architecture flowchart or mindmap',
    icon: '🗺️',
    category: 'AI & Tools',
    keywords: ['diagram', 'mermaid', 'flowchart', 'architecture', 'mindmap'],
    action: (_quill, _index, onOpenDiagram) => {
      onOpenDiagram?.();
    },
  },
  {
    id: 'compare',
    title: 'AI Concept Compare',
    description: 'Side-by-side concept comparison table',
    icon: '⚖️',
    category: 'AI & Tools',
    keywords: ['compare', 'vs', 'versus', 'diff'],
    action: (quill, index) => {
      quill.insertText(index, '/compare Concept A vs Concept B\n', 'user');
    },
  },
];

export interface NoteEditorCoreRef {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  getQuill: () => any;
  getHtml: () => string;
  setHtml: (html: string) => void;
  insertText: (text: string) => void;
  insertHtml: (html: string) => void;
  focus: () => void;
}

export interface NoteEditorCoreProps {
  noteId: string;
  initialHtml: string;
  placeholder?: string;
  autocorrectEnabled?: boolean;
  onContentChangeDebounced?: (
    html: string,
    stats: { words: number; chars: number; readingTime: string }
  ) => void;
  onHumanWordsTyped?: (count: number) => void;
  onSelectionChange?: (selectedText: string) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onCompareCommand?: (topicA: string, topicB: string, placeholder: string) => void;
  onOpenDiagram?: () => void;
  className?: string;
}

export const NoteEditorCore = forwardRef<NoteEditorCoreRef, NoteEditorCoreProps>(
  function NoteEditorCore(
    {
      noteId,
      initialHtml,
      placeholder = 'Start typing your study notes here... 💡 Hint: Type \'/\' for Notion-style slash commands or \'/compare\' to compare concepts!',
      autocorrectEnabled = true,
      onContentChangeDebounced,
      onHumanWordsTyped,
      onSelectionChange,
      onHistoryChange,
      onCompareCommand,
      onOpenDiagram,
      className = '',
    },
    ref
  ) {
    const quillRef = useRef<any>(null);
    const quillWrapperRef = useRef<HTMLDivElement>(null);
    const { user } = useAuthContext();

    // History stack state
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Paste & Typing velocity telemetry
    const isPastingRef = useRef(false);
    const lastWordCountRef = useRef(0);
    const wordCountDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Notion-style Slash Command state & refs
    const [isSlashOpen, setIsSlashOpen] = useState(false);
    const [slashQuery, setSlashQuery] = useState('');
    const [slashActiveIndex, setSlashActiveIndex] = useState(0);
    const [slashCaretPos, setSlashCaretPos] = useState<{ top: number; left: number } | null>(null);

    const isSlashOpenRef = useRef(false);
    const slashQueryRef = useRef('');
    const slashActiveIndexRef = useRef(0);
    const filteredSlashCommandsRef = useRef<SlashCommandItem[]>(SLASH_COMMANDS);

    useEffect(() => {
      isSlashOpenRef.current = isSlashOpen;
    }, [isSlashOpen]);

    useEffect(() => {
      slashQueryRef.current = slashQuery;
    }, [slashQuery]);

    useEffect(() => {
      slashActiveIndexRef.current = slashActiveIndex;
    }, [slashActiveIndex]);

    const filteredSlashCommands = useMemo(() => {
      if (!slashQuery.trim()) return SLASH_COMMANDS;
      const q = slashQuery.toLowerCase().trim();
      return SLASH_COMMANDS.filter(
        (cmd) =>
          cmd.title.toLowerCase().includes(q) ||
          cmd.id.toLowerCase().includes(q) ||
          cmd.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }, [slashQuery]);

    useEffect(() => {
      filteredSlashCommandsRef.current = filteredSlashCommands;
    }, [filteredSlashCommands]);

    // Autocorrect / Autocomplete floating popover state
    const [quillActiveWord, setQuillActiveWord] = useState('');
    const [quillSuggestions, setQuillSuggestions] = useState<string[]>([]);
    const [quillAutocomplete, setQuillAutocomplete] = useState<string[]>([]);
    const [caretPosition, setCaretPosition] = useState<{ top: number; left: number } | null>(null);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

    const quillSuggestionsRef = useRef<string[]>([]);
    const quillAutocompleteRef = useRef<string[]>([]);
    const activeSuggestionIndexRef = useRef(0);
    const quillActiveWordRangeRef = useRef<{ start: number; end: number } | null>(null);
    const lastSelectionIndexRef = useRef<number | null>(null);
    const isReplacingRef = useRef(false);
    const spellingDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const autocorrectEnabledRef = useRef(autocorrectEnabled);

    useEffect(() => {
      autocorrectEnabledRef.current = autocorrectEnabled;
    }, [autocorrectEnabled]);

    useEffect(() => {
      quillSuggestionsRef.current = quillSuggestions;
    }, [quillSuggestions]);

    useEffect(() => {
      quillAutocompleteRef.current = quillAutocomplete;
    }, [quillAutocomplete]);

    useEffect(() => {
      activeSuggestionIndexRef.current = activeSuggestionIndex;
    }, [activeSuggestionIndex]);

    // Initial sanitized content memoized ONLY by noteId
    const memoizedInitialContent = useMemo(() => {
      const sanitized = sanitizeHtmlForQuill(initialHtml || '');
      const textOnly = sanitized.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
      lastWordCountRef.current = textOnly ? textOnly.split(/\s+/).filter(Boolean).length : 0;
      return sanitized;
    }, [noteId, initialHtml]);

    // Execute a selected slash command
    const executeSlashCommand = useCallback(
      (cmd: SlashCommandItem) => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        const range = quill.getSelection();
        const pos = range ? range.index : quill.getLength() - 1;
        const text = quill.getText(0, pos);

        const lastSlashIndex = text.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
          const charsToDelete = pos - lastSlashIndex;
          quill.deleteText(lastSlashIndex, charsToDelete, 'user');
          cmd.action(quill, lastSlashIndex, onOpenDiagram);
        } else {
          cmd.action(quill, pos, onOpenDiagram);
        }

        setIsSlashOpen(false);
        setSlashQuery('');
        setSlashActiveIndex(0);
      },
      [onOpenDiagram]
    );

    // Detect when user types / at line start or after whitespace
    const checkSlashTrigger = useCallback(() => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      const range = quill.getSelection();
      if (!range) {
        setIsSlashOpen(false);
        return;
      }

      const pos = range.index;
      const text = quill.getText(0, pos);

      const lastNewline = text.lastIndexOf('\n');
      const lineText = lastNewline === -1 ? text : text.slice(lastNewline + 1);
      const slashIdx = lineText.lastIndexOf('/');

      if (slashIdx !== -1) {
        const charBefore = slashIdx > 0 ? lineText[slashIdx - 1] : ' ';
        if (/\s/.test(charBefore) || slashIdx === 0) {
          const query = lineText.slice(slashIdx + 1);
          if (!/\s/.test(query) && query.length <= 15) {
            setSlashQuery(query);
            setIsSlashOpen(true);
            setSlashActiveIndex(0);

            try {
              const bounds = quill.getBounds(pos);
              if (bounds) {
                const toolbarEl = quillWrapperRef.current?.querySelector('.ql-toolbar');
                const toolbarHeight = toolbarEl ? toolbarEl.getBoundingClientRect().height : 42;
                setSlashCaretPos({
                  top: bounds.bottom + toolbarHeight + 10,
                  left: Math.max(16, Math.min(bounds.left + 16, 400)),
                });
              }
            } catch {}
            return;
          }
        }
      }

      setIsSlashOpen(false);
    }, []);

    // Update history indicators
    const updateHistoryState = useCallback(() => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const history = quill.getModule('history') || quill.history;
      const u = Boolean(history?.stack?.undo && history.stack.undo.length > 0);
      const r = Boolean(history?.stack?.redo && history.stack.redo.length > 0);
      setCanUndo(u);
      setCanRedo(r);
      onHistoryChange?.(u, r);
    }, [onHistoryChange]);

    // Undo / Redo handlers
    const handleUndo = useCallback(() => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const history = quill.getModule('history') || quill.history;
      if (history) {
        history.undo();
        updateHistoryState();
      }
    }, [updateHistoryState]);

    const handleRedo = useCallback(() => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const history = quill.getModule('history') || quill.history;
      if (history) {
        history.redo();
        updateHistoryState();
      }
    }, [updateHistoryState]);

    // Expose imperative API to parent
    useImperativeHandle(
      ref,
      () => ({
        undo: handleUndo,
        redo: handleRedo,
        canUndo,
        canRedo,
        getQuill: () => quillRef.current?.getEditor(),
        getHtml: () => {
          const quill = quillRef.current?.getEditor();
          return quill ? quill.root.innerHTML : '';
        },
        setHtml: (html: string) => {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            quill.clipboard.dangerouslyPasteHTML(0, html);
          }
        },
        insertText: (text: string) => {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection();
            const index = range ? range.index : quill.getLength() - 1;
            quill.insertText(index, text);
          }
        },
        insertHtml: (html: string) => {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection();
            const index = range ? range.index : quill.getLength() - 1;
            quill.clipboard.dangerouslyPasteHTML(index, html);
          }
        },
        focus: () => {
          quillRef.current?.getEditor()?.focus();
        },
      }),
      [handleUndo, handleRedo, canUndo, canRedo]
    );

    // Spellcheck calculation
    const performQuillSpellingCheck = useCallback(() => {
      if (isReplacingRef.current || !autocorrectEnabledRef.current) {
        if (!autocorrectEnabledRef.current) {
          setQuillActiveWord('');
          setQuillSuggestions([]);
          setQuillAutocomplete([]);
          quillActiveWordRangeRef.current = null;
          setCaretPosition(null);
          setActiveSuggestionIndex(0);
        }
        return;
      }

      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      const range = quill.getSelection();
      if (!range) {
        setQuillActiveWord('');
        setQuillSuggestions([]);
        setQuillAutocomplete([]);
        quillActiveWordRangeRef.current = null;
        setCaretPosition(null);
        setActiveSuggestionIndex(0);
        return;
      }

      const pos = range.index;
      lastSelectionIndexRef.current = pos;
      const text = quill.getText();

      let start = pos;
      while (start > 0 && !/\s/.test(text[start - 1])) {
        start--;
      }

      let end = pos;
      while (end < text.length && !/\s/.test(text[end])) {
        end++;
      }

      const word = text.slice(start, end);
      if (!word || !word.trim() || word.trim().length < 2) {
        setQuillActiveWord('');
        setQuillSuggestions([]);
        setQuillAutocomplete([]);
        quillActiveWordRangeRef.current = null;
        setCaretPosition(null);
        setActiveSuggestionIndex(0);
        return;
      }
      const clean = cleanWord(word);

      if (clean.base && clean.base.length >= 2) {
        const autoMatches = getAutocompleteSuggestions(clean.base, 4).filter(
          (w) => w.toLowerCase() !== clean.base.toLowerCase()
        );
        const misspelled = isMisspelled(word);
        const suggestions = misspelled ? getSpellingSuggestions(word) : [];

        if (autoMatches.length === 0 && suggestions.length === 0) {
          setQuillActiveWord('');
          setQuillSuggestions([]);
          setQuillAutocomplete([]);
          quillActiveWordRangeRef.current = null;
          setCaretPosition(null);
          setActiveSuggestionIndex(0);
          return;
        }

        setQuillActiveWord(word);
        quillActiveWordRangeRef.current = { start, end };
        setActiveSuggestionIndex(0);
        setQuillAutocomplete(autoMatches);
        setQuillSuggestions(suggestions);

        try {
          const bounds = quill.getBounds(pos);
          if (bounds) {
            const toolbarEl = quillWrapperRef.current?.querySelector('.ql-toolbar');
            const toolbarHeight = toolbarEl ? toolbarEl.getBoundingClientRect().height : 42;
            setCaretPosition({
              top: bounds.bottom + toolbarHeight + 10,
              left: Math.max(16, bounds.left + 16),
            });
          }
        } catch {
          // Graceful fallback
        }
      } else {
        setQuillActiveWord('');
        setQuillSuggestions([]);
        setQuillAutocomplete([]);
        quillActiveWordRangeRef.current = null;
        setCaretPosition(null);
        setActiveSuggestionIndex(0);
      }
    }, []);

    const replaceQuillWord = useCallback((replacement: string) => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      let start: number;
      let end: number;

      if (quillActiveWordRangeRef.current) {
        start = quillActiveWordRangeRef.current.start;
        end = quillActiveWordRangeRef.current.end;
      } else {
        const range = quill.getSelection();
        const pos = range ? range.index : lastSelectionIndexRef.current;
        if (pos === null || pos === undefined) return;

        const text = quill.getText();
        start = pos;
        while (start > 0 && !/\s/.test(text[start - 1])) start--;
        end = pos;
        while (end < text.length && !/\s/.test(text[end])) end++;
      }

      isReplacingRef.current = true;
      const text = quill.getText();
      if (start < 0 || end > text.length || start >= end) {
        isReplacingRef.current = false;
        return;
      }

      const wordText = text.slice(start, end);
      const clean = cleanWord(wordText);
      const fullReplacement = clean.leading + replacement + clean.trailing;
      const newCursorPos = start + fullReplacement.length;

      quill.updateContents({
        ops: [
          { retain: start },
          { delete: end - start },
          { insert: fullReplacement },
        ],
      });

      quill.setSelection(newCursorPos);

      requestAnimationFrame(() => {
        setTimeout(() => {
          quill.setSelection(newCursorPos);
          setQuillActiveWord('');
          setQuillSuggestions([]);
          setQuillAutocomplete([]);
          quillActiveWordRangeRef.current = null;
          setCaretPosition(null);
          lastSelectionIndexRef.current = null;
          isReplacingRef.current = false;
        }, 0);
      });
    }, []);

    // Listen to native paste and text change (with full-resolution image interception)
    useEffect(() => {
      const wrapper = quillWrapperRef.current;
      if (!wrapper) return;

      const editorEl = wrapper.querySelector('.ql-editor');
      if (!editorEl) return;

      const handlePaste = async (e: Event) => {
        isPastingRef.current = true;
        const clipEvent = e as ClipboardEvent;
        const items = clipEvent.clipboardData?.items;
        if (!items) return;

        const imageFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
          }
        }

        // Only intercept and prevent default if the clipboard is purely an image (e.g. Snipping Tool).
        // If the paste contains text or HTML, allow Quill to paste the text naturally so words are never lost!
        const htmlText = clipEvent.clipboardData?.getData('text/html') || '';
        const plainText = clipEvent.clipboardData?.getData('text/plain') || '';
        const isPureImagePaste = imageFiles.length > 0 && !htmlText && (!plainText || plainText.trim().length === 0);

        if (isPureImagePaste) {
          clipEvent.preventDefault();
          clipEvent.stopPropagation();
          const quill = quillRef.current?.getEditor();
          if (!quill) return;

          const toastId = toast.loading('Uploading full-resolution image...', { id: 'note-img-upload' });
          try {
            for (const file of imageFiles) {
              const url = await uploadNoteImage(user?.uid || '', noteId, file, 'pasted');
              const range = quill.getSelection(true) || { index: quill.getLength() - 1, length: 0 };
              quill.insertEmbed(range.index, 'image', url, 'user');
              quill.setSelection(range.index + 1, 0, 'silent');
            }
            toast.success('Image added! 🖼️', { id: 'note-img-upload' });
          } catch (err) {
            console.warn('[NoteEditorCore] Image paste upload error:', err);
            toast.error('Failed to upload image.', { id: 'note-img-upload' });
          }
        }
      };

      const handleDrop = async (e: Event) => {
        const dragEvent = e as DragEvent;
        const files = dragEvent.dataTransfer?.files;
        if (!files || files.length === 0) return;

        const imageFiles: File[] = [];
        for (let i = 0; i < files.length; i++) {
          if (files[i].type && files[i].type.startsWith('image/')) {
            imageFiles.push(files[i]);
          }
        }

        if (imageFiles.length > 0) {
          dragEvent.preventDefault();
          dragEvent.stopPropagation();
          const quill = quillRef.current?.getEditor();
          if (!quill) return;

          const toastId = toast.loading('Uploading full-resolution image...', { id: 'note-img-upload' });
          try {
            for (const file of imageFiles) {
              const url = await uploadNoteImage(user?.uid || '', noteId, file, 'dropped');
              const range = quill.getSelection(true) || { index: quill.getLength() - 1, length: 0 };
              quill.insertEmbed(range.index, 'image', url, 'user');
              quill.setSelection(range.index + 1, 0, 'silent');
            }
            toast.success('Image added! 🖼️', { id: 'note-img-upload' });
          } catch (err) {
            console.warn('[NoteEditorCore] Image drop upload error:', err);
            toast.error('Failed to upload image.', { id: 'note-img-upload' });
          }
        }
      };

      editorEl.addEventListener('paste', handlePaste, true);
      editorEl.addEventListener('drop', handleDrop, true);
      return () => {
        editorEl.removeEventListener('paste', handlePaste, true);
        editorEl.removeEventListener('drop', handleDrop, true);
      };
    }, [noteId, user?.uid]);

    // Override Quill toolbar 'image' button to upload to Firebase Storage directly
    useEffect(() => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      const toolbar = quill.getModule('toolbar');
      if (toolbar) {
        toolbar.addHandler('image', () => {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();
          input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
              const toastId = toast.loading('Uploading full-resolution image...', { id: 'note-img-upload' });
              try {
                const url = await uploadNoteImage(user?.uid || '', noteId, file, 'toolbar');
                const range = quill.getSelection(true) || { index: quill.getLength() - 1, length: 0 };
                quill.insertEmbed(range.index, 'image', url, 'user');
                quill.setSelection(range.index + 1, 0, 'silent');
                toast.success('Image added! 🖼️', { id: 'note-img-upload' });
              } catch (err) {
                console.warn('[NoteEditorCore] Toolbar image upload error:', err);
                toast.error('Failed to upload image.', { id: 'note-img-upload' });
              }
            }
          };
        });
      }
    }, [noteId, user?.uid]);

    // Listen to keydown for Tab / Shift+Tab autocomplete and space autocorrect
    useEffect(() => {
      const wrapper = quillWrapperRef.current;
      if (!wrapper) return;

      let editorEl: HTMLElement | null = null;
      let listener: ((e: KeyboardEvent) => void) | null = null;

      const setupListener = () => {
        editorEl = wrapper.querySelector('.ql-editor') || null;
        if (!editorEl) {
          setTimeout(setupListener, 100);
          return;
        }

        listener = (e: KeyboardEvent) => {
          const quill = quillRef.current?.getEditor();
          if (!quill) return;

          // 0. Notion-Style Slash Command Menu Interception
          if (isSlashOpenRef.current && filteredSlashCommandsRef.current.length > 0) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              setSlashActiveIndex((prev) => (prev + 1) % filteredSlashCommandsRef.current.length);
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              setSlashActiveIndex(
                (prev) => (prev - 1 + filteredSlashCommandsRef.current.length) % filteredSlashCommandsRef.current.length
              );
              return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              const target =
                filteredSlashCommandsRef.current[slashActiveIndexRef.current] ||
                filteredSlashCommandsRef.current[0];
              if (target) {
                executeSlashCommand(target);
              }
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              setIsSlashOpen(false);
              return;
            }
          }

          const allSuggestions = [
            ...quillAutocompleteRef.current,
            ...quillSuggestionsRef.current,
          ];

          if (!autocorrectEnabledRef.current) return;

          // 1. Tab / Shift+Tab for suggestions
          if (e.key === 'Tab' && allSuggestions.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (e.shiftKey) {
              setActiveSuggestionIndex(
                (prev) => (prev - 1 + allSuggestions.length) % allSuggestions.length
              );
            } else {
              const selected =
                allSuggestions[activeSuggestionIndexRef.current] || allSuggestions[0];
              if (selected) {
                replaceQuillWord(selected);
              }
            }
            return;
          }

          // 2. Escape dismisses suggestions
          if (e.key === 'Escape') {
            if (allSuggestions.length > 0) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
            }
            setCaretPosition(null);
            setQuillAutocomplete([]);
            setQuillSuggestions([]);
            setActiveSuggestionIndex(0);
            return;
          }

          // 3. Autocorrect triggers
          const triggers = [' ', '.', ',', '!', '?', ';', ':', 'Enter'];
          if (!triggers.includes(e.key)) return;

          const range = quill.getSelection();
          if (!range || range.index === 0) return;

          const pos = range.index;
          const text = quill.getText(0, pos);

          let wordEnd = pos;
          while (wordEnd > 0 && /\s/.test(text[wordEnd - 1])) {
            wordEnd--;
          }
          let wordStart = wordEnd;
          while (wordStart > 0 && !/\s/.test(text[wordStart - 1])) {
            wordStart--;
          }

          if (wordStart === wordEnd) return;

          const wordWithPunc = text.slice(wordStart, wordEnd);
          const corrected = autocorrectWord(wordWithPunc);

          if (corrected !== wordWithPunc) {
            const appendChar = e.key === 'Enter' ? '\n' : e.key;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            quill.updateContents({
              ops: [
                { retain: wordStart },
                { delete: wordEnd - wordStart },
                { insert: corrected + appendChar },
              ],
            });

            const newCursorPos = wordStart + corrected.length + appendChar.length;
            quill.setSelection(newCursorPos);

            requestAnimationFrame(() => {
              setTimeout(() => {
                quill.setSelection(newCursorPos);
                performQuillSpellingCheck();
              }, 0);
            });
          }
        };

        editorEl.addEventListener('keydown', listener, true);
      };

      setupListener();

      return () => {
        if (editorEl && listener) {
          editorEl.removeEventListener('keydown', listener, true);
        }
      };
    }, [replaceQuillWord, performQuillSpellingCheck]);

    // Handle content change & typing velocity rate-limiting
    const handleContentChange = useCallback(
      (content: string) => {
        updateHistoryState();
        checkSlashTrigger();

        // Throttled spellcheck trigger (350ms)
        if (spellingDebounceRef.current) clearTimeout(spellingDebounceRef.current);
        spellingDebounceRef.current = setTimeout(() => {
          performQuillSpellingCheck();
        }, 350);

        // Word count & Human typing velocity telemetry (400ms debounce)
        if (wordCountDebounceRef.current) clearTimeout(wordCountDebounceRef.current);
        wordCountDebounceRef.current = setTimeout(() => {
          const textOnly = content
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .trim();
          const currentWordCount = textOnly
            ? textOnly.split(/\s+/).filter(Boolean).length
            : 0;
          const chars = textOnly.length;
          const mins = Math.max(1, Math.ceil(currentWordCount / 200));

          onContentChangeDebounced?.(content, {
            words: currentWordCount,
            chars,
            readingTime: `${mins} min read`,
          });

          // Check word difference
          const diff = currentWordCount - lastWordCountRef.current;
          const wasPaste = isPastingRef.current || diff > 20; // > 20 words in 400ms is a paste

          if (diff > 0) {
            if (wasPaste) {
              // Silently accept words for document word count, but AWARD 0 MANA & NO TOAST
              lastWordCountRef.current = currentWordCount;
              isPastingRef.current = false;
            } else {
              // Genuine human typing: award words to session mana
              onHumanWordsTyped?.(diff);
              lastWordCountRef.current = currentWordCount;
            }
          } else {
            lastWordCountRef.current = currentWordCount;
            isPastingRef.current = false;
          }
        }, 400);

        // Fast check for /compare command
        if (content.includes('compare') && onCompareCommand) {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const text = quill.getText();
            const range = quill.getSelection();
            if (range) {
              const compareRegex =
                /(?:^|\n)(?:\/)?compare\s+(.+?)\s+(?:vs|and|versus|with)\s+([^\r\n]+)(?:\r?\n)/i;
              const match = text.match(compareRegex);
              if (match) {
                const commandText = match[0].trim();
                const topicA = match[1].trim();
                const topicB = match[2].trim();
                if (topicA && topicB) {
                  const matchStart = text.lastIndexOf(commandText, range.index);
                  if (matchStart !== -1) {
                    const placeholderText = `⏳ Generating comparison: ${topicA} vs ${topicB}...`;
                    quill.deleteText(matchStart, commandText.length);
                    quill.insertText(matchStart, placeholderText);
                    onCompareCommand(topicA, topicB, placeholderText);
                  }
                }
              }
            }
          }
        }
      },
      [
        updateHistoryState,
        performQuillSpellingCheck,
        onContentChangeDebounced,
        onHumanWordsTyped,
        onCompareCommand,
      ]
    );

    return (
      <div
        className={`quill-wrapper relative flex-1 min-h-0 flex flex-col ${className}`}
        ref={quillWrapperRef}
      >
        {/* Notion / Obsidian Style Floating Slash Command Palette */}
        <AnimatePresence>
          {isSlashOpen && filteredSlashCommands.length > 0 && slashCaretPos && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              style={{
                top: slashCaretPos.top,
                left: slashCaretPos.left,
              }}
              className="absolute z-50 bg-slate-900/95 border-2 border-primary/50 rounded-2xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.5)] p-2 flex flex-col gap-1 w-[300px] sm:w-[340px] max-h-[340px] backdrop-blur-xl select-none"
            >
              <div className="flex items-center justify-between px-2.5 py-1 border-b border-slate-800 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-primary">
                  <span>⚡</span> Slash Commands
                </span>
                <span className="font-mono text-slate-500">Esc to close</span>
              </div>

              <div className="flex flex-col gap-0.5 overflow-y-auto pr-0.5 custom-scrollbar max-h-[280px]">
                {filteredSlashCommands.map((cmd, idx) => {
                  const isSelected = idx === slashActiveIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onMouseEnter={() => setSlashActiveIndex(idx)}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        executeSlashCommand(cmd);
                      }}
                      className={`text-left px-2.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]'
                          : 'hover:bg-slate-800/60 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border ${
                          isSelected ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-800 border-slate-700/60 text-slate-300'
                        }`}>
                          {cmd.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate text-xs">{cmd.title}</div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {cmd.description}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md border shrink-0 ${
                        isSelected ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        /{cmd.id.split('-')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Autocomplete & Spellcheck Suggestions Popover */}
        <AnimatePresence>
          {autocorrectEnabled &&
            !isSlashOpen &&
            caretPosition &&
            (quillSuggestions.length > 0 || quillAutocomplete.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                style={{
                  top: caretPosition.top,
                  left: caretPosition.left,
                }}
                className="absolute z-50 bg-[var(--card-bg)] border-2 border-primary/40 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] p-1.5 flex flex-col gap-1 min-w-[190px] max-w-[280px] backdrop-blur-md"
              >
                <div className="flex items-center justify-between px-2 py-0.5 border-b border-[var(--card-border)]/50">
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                    <HiSparkles size={11} />
                    {quillAutocomplete.length > 0 ? 'Autocomplete' : (quillActiveWord ? `Fix: ${quillActiveWord}` : 'Correction')}
                  </span>
                  <span className="text-[9px] text-[var(--muted-foreground)] font-mono">
                    Tab ⇥
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto no-scrollbar">
                  {[...quillAutocomplete, ...quillSuggestions].map((sug, idx) => {
                    const isSelected = idx === activeSuggestionIndex;
                    return (
                      <button
                        key={sug + idx}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          replaceQuillWord(sug);
                        }}
                        className={`text-left px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary text-white font-bold shadow-sm'
                            : 'hover:bg-primary/10 text-foreground'
                        }`}
                      >
                        <span className="truncate">{sug}</span>
                        {isSelected && <HiCheck size={12} className="shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        <ReactQuill
          key={noteId}
          ref={quillRef}
          theme="snow"
          defaultValue={memoizedInitialContent}
          onChange={handleContentChange}
          onChangeSelection={(range: any, _source: any, editor: any) => {
            updateHistoryState();
            checkSlashTrigger();
            if (range) {
              if (range.length > 0) {
                onSelectionChange?.(editor.getText(range.index, range.length));
              } else {
                onSelectionChange?.('');
              }
            }
          }}
          modules={QUILL_MODULES}
          formats={QUILL_FORMATS}
          placeholder={placeholder}
          preserveWhitespace={true}
          useSemanticHTML={false}
        />
      </div>
    );
  }
);
