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
import 'react-quill-new/dist/quill.snow.css';
import {
  autocorrectWord,
  isMisspelled,
  getSpellingSuggestions,
  cleanWord,
} from '@/lib/spellcheck';
import { getAutocompleteSuggestions } from '@/data/notesAutocompleteDataset';

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
  className?: string;
}

export const NoteEditorCore = forwardRef<NoteEditorCoreRef, NoteEditorCoreProps>(
  function NoteEditorCore(
    {
      noteId,
      initialHtml,
      placeholder = 'Start typing your study notes here... 💡 Hint: Type \'/compare Topic A vs Topic B\' to compare concepts!',
      autocorrectEnabled = true,
      onContentChangeDebounced,
      onHumanWordsTyped,
      onSelectionChange,
      onHistoryChange,
      onCompareCommand,
      className = '',
    },
    ref
  ) {
    const quillRef = useRef<any>(null);
    const quillWrapperRef = useRef<HTMLDivElement>(null);

    // History stack state
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Paste & Typing velocity telemetry
    const isPastingRef = useRef(false);
    const lastWordCountRef = useRef(0);
    const wordCountDebounceRef = useRef<NodeJS.Timeout | null>(null);

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

    // Listen to native paste and text change
    useEffect(() => {
      const wrapper = quillWrapperRef.current;
      if (!wrapper) return;

      const editorEl = wrapper.querySelector('.ql-editor');
      if (!editorEl) return;

      const handlePaste = () => {
        isPastingRef.current = true;
      };

      editorEl.addEventListener('paste', handlePaste, true);
      return () => {
        editorEl.removeEventListener('paste', handlePaste, true);
      };
    }, []);

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
        {/* Floating Autocomplete & Spellcheck Suggestions Popover */}
        <AnimatePresence>
          {autocorrectEnabled &&
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
