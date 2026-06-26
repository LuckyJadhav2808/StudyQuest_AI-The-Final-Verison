'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiTrash, HiPencil, HiSearch,
  HiEye, HiCode, HiDocumentText, HiFolder,
  HiChevronLeft, HiClock, HiDownload, HiSparkles,
  HiLightningBolt, HiRefresh, HiInformationCircle, HiShare,
  HiClipboardCopy, HiX, HiReply, HiCheck, HiAcademicCap,
  HiBeaker, HiMicrophone,
} from 'react-icons/hi';
import QuizModal from '@/components/notes/QuizModal';
import { marked } from 'marked';
import 'react-quill-new/dist/quill.snow.css';
import { autocorrectWord, isMisspelled, getSpellingSuggestions, cleanWord, addToCustomDictionary } from '@/lib/spellcheck';

const sanitizeHtmlForQuill = (html: string): string => {
  if (!html) return '';
  // Quick pre-check: if it has no elements/classes that could crash Quill, return as-is
  if (!html.includes('katex') && !html.includes('studyquest-math-embed') && !html.includes('math-field')) {
    return html;
  }

  if (typeof window === 'undefined') return html;

  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 1. Clean up studyquest-math-embed / math-field: strip all internal children so it's a clean leaf
    const mathEmbeds = tempDiv.querySelectorAll('.studyquest-math-embed, math-field');
    mathEmbeds.forEach((el) => {
      el.innerHTML = '';
    });

    // 2. Remove standard KaTeX rendered elements (which may have been pasted or saved)
    const katexElements = tempDiv.querySelectorAll('.katex');
    katexElements.forEach((el) => {
      const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
      if (annotation && annotation.textContent) {
        const latex = annotation.textContent.trim();
        const parent = el.parentElement;
        const isBlock = parent?.classList.contains('katex-block') || parent?.classList.contains('katex-display') || el.classList.contains('katex-display');

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

const ReactQuill = dynamic(
  async () => {
    const module = await import('react-quill-new');
    const Quill = module.default.Quill || (module as any).Quill;
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

        // Check if shadow root already exists (to avoid duplicate attachment)
        let shadow = node.shadowRoot;
        let container;
        if (!shadow && node.attachShadow) {
          shadow = node.attachShadow({ mode: 'open' });
          
          // Load KaTeX stylesheet inside shadow root
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
          shadow.appendChild(link);

          // Inline styles for display layouts and color inheritance
          const style = document.createElement('style');
          style.textContent = `
            .katex-display {
              margin: 8px 0;
              display: block;
            }
            .studyquest-math-container {
              display: inline-block;
              color: inherit !important;
            }
            .katex {
              color: inherit !important;
            }
          `;
          shadow.appendChild(style);

          container = document.createElement('span');
          container.className = 'studyquest-math-container';
          shadow.appendChild(container);
        } else if (shadow) {
          container = shadow.querySelector('.studyquest-math-container');
        }

        if (container) {
          // Render KaTeX
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
          // Fallback
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
    return module.default;
  },
  {
    ssr: false,
    loading: () => <div className="h-[400px] flex items-center justify-center text-sm text-[var(--muted-foreground)]">Loading editor...</div>
  }
) as any;

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
  history: { delay: 500, maxStack: 100, userOnly: true },
  keyboard: {
    bindings: {
      heading1: { key: '1', shortKey: true, handler: function(this: any) { this.quill.format('header', 1); } },
      heading2: { key: '2', shortKey: true, handler: function(this: any) { this.quill.format('header', 2); } },
      heading3: { key: '3', shortKey: true, handler: function(this: any) { this.quill.format('header', 3); } },
      normalText: { key: '0', shortKey: true, handler: function(this: any) { this.quill.format('header', false); } },
    },
  },
};
const QUILL_FORMATS = [
  'header', 'size', 'bold', 'italic', 'underline', 'strike',
  'list', 'indent', 'align', 'blockquote', 'code-block',
  'link', 'image', 'color', 'background',
  'table', 'math'
];
import toast from 'react-hot-toast';
import { useNotes } from '@/hooks/useNotes';
import { useGamification } from '@/hooks/useGamification';
import { useAuthContext } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';
import DiagramModal from '@/components/notes/DiagramModal';
import MathPalette from '@/components/notes/MathPalette';
import { YouTubePanel, AITutorPanel, ReferenceViewerPanel, ResizableSplitLayout } from '@/components/notes/MultitaskPanels';
import { useGroups, useGroupResources } from '@/hooks/useGroups';
import { XP_AWARDS } from '@/lib/constants';
import { Note } from '@/types';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Flashcard { question: string; answer: string; }

export default function NotesContent() {
  const { notes, loading, addNote, updateNote, deleteNote } = useNotes();
  const { awardXP } = useGamification();
  const { profile } = useAuthContext();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFolder, setNewFolder] = useState('General');
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Autosave & editor state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quillWrapperRef = useRef<HTMLDivElement>(null);
  const lastSavedAt = useRef<number>(0);

  // ── Spellcheck & Autocorrect states & effects for Quill ──
  const quillRef = useRef<any>(null);
  const [quillSuggestions, setQuillSuggestions] = useState<string[]>([]);
  const [quillActiveWord, setQuillActiveWord] = useState('');
  const [quillActiveWordRange, setQuillActiveWordRange] = useState<{ start: number; end: number } | null>(null);
  const quillActiveWordRangeRef = useRef<{ start: number; end: number } | null>(null);
  const isReplacingRef = useRef(false);
  const lastSelectionIndexRef = useRef<number | null>(null);
  const quillSuggestionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkQuillSpelling = useCallback(() => {
    if (isReplacingRef.current) return;

    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (!range) {
      setQuillActiveWord('');
      setQuillSuggestions([]);
      setQuillActiveWordRange(null);
      // Note: We do not clear quillActiveWordRangeRef.current on blur (when range is null)
      // to preserve the range bounds of the misspelled word for the click handler.
      return;
    }

    const pos = range.index;
    lastSelectionIndexRef.current = pos;
    const text = quill.getText();

    // Find start of current word
    let start = pos;
    while (start > 0 && !/\s/.test(text[start - 1])) {
      start--;
    }

    // Find end of current word
    let end = pos;
    while (end < text.length && !/\s/.test(text[end])) {
      end++;
    }

    const word = text.slice(start, end);
    // Only check if we have a non-empty word (skip pure whitespace)
    if (!word || !word.trim()) {
      setQuillActiveWord('');
      setQuillSuggestions([]);
      setQuillActiveWordRange(null);
      return;
    }
    const clean = cleanWord(word);

    // Clear any pending suggestions calculation
    if (quillSuggestionsTimeoutRef.current) {
      clearTimeout(quillSuggestionsTimeoutRef.current);
      quillSuggestionsTimeoutRef.current = null;
    }

    if (clean.base && isMisspelled(word)) {
      setQuillActiveWord(word);
      setQuillActiveWordRange({ start, end });
      quillActiveWordRangeRef.current = { start, end };

      // Debounce the heavy suggestions lookup (Levenshtein search over 97k words)
      quillSuggestionsTimeoutRef.current = setTimeout(() => {
        setQuillSuggestions(getSpellingSuggestions(word));
      }, 150);
    } else {
      setQuillActiveWord('');
      setQuillSuggestions([]);
      setQuillActiveWordRange(null);
    }
  }, []);

  const replaceQuillWord = useCallback((replacement: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    // Use the active misspelled word range directly from ref if available.
    let start: number;
    let end: number;

    if (quillActiveWordRangeRef.current) {
      start = quillActiveWordRangeRef.current.start;
      end = quillActiveWordRangeRef.current.end;
    } else {
      // Fallback: Get current selection dynamically (or fall back to last focused selection ref)
      const range = quill.getSelection();
      const pos = range ? range.index : lastSelectionIndexRef.current;
      
      if (pos === null || pos === undefined) {
        return;
      }

      const text = quill.getText();
      
      // Find start of current word dynamically based on pos
      start = pos;
      while (start > 0 && !/\s/.test(text[start - 1])) {
        start--;
      }

      // Find end of current word dynamically based on pos
      end = pos;
      while (end < text.length && !/\s/.test(text[end])) {
        end++;
      }
    }

    isReplacingRef.current = true;

    // Re-read current text to ensure boundaries match
    const text = quill.getText();
    
    // Validate range against current text
    if (start < 0 || end > text.length || start >= end) {
      isReplacingRef.current = false;
      return;
    }

    const wordText = text.slice(start, end);
    const clean = cleanWord(wordText);

    const fullReplacement = clean.leading + replacement + clean.trailing;
    
    // Always place cursor right after the replaced word
    const newCursorPos = start + fullReplacement.length;

    // Perform update in a single atomic Delta operation
    quill.updateContents({
      ops: [
        { retain: start },
        { delete: end - start },
        { insert: fullReplacement }
      ]
    });

    // Update selection immediately
    quill.setSelection(newCursorPos);

    // Update React state synchronously to prevent controlled value override race conditions
    setEditContent(quill.root.innerHTML);

    // Clear suggestions and restore state after Quill finishes its internal update
    requestAnimationFrame(() => {
      setTimeout(() => {
        quill.setSelection(newCursorPos);
        setQuillActiveWord('');
        setQuillSuggestions([]);
        setQuillActiveWordRange(null);
        quillActiveWordRangeRef.current = null;
        lastSelectionIndexRef.current = null;
        isReplacingRef.current = false;
      }, 0);
    });
  }, [checkQuillSpelling]);

  const addQuillWordToDictionary = useCallback((word: string) => {
    addToCustomDictionary(word);
    setQuillActiveWord('');
    setQuillSuggestions([]);
    setQuillActiveWordRange(null);
    quillActiveWordRangeRef.current = null;
    lastSelectionIndexRef.current = null;

    const quill = quillRef.current?.getEditor();
    if (quill) {
      setTimeout(() => {
        checkQuillSpelling();
      }, 0);
    }
  }, [checkQuillSpelling]);

  // Re-check spelling when custom dictionary updates elsewhere
  useEffect(() => {
    const handleDictUpdate = () => {
      checkQuillSpelling();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('studyquest_custom_dict_update', handleDictUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('studyquest_custom_dict_update', handleDictUpdate);
      }
    };
  }, [checkQuillSpelling]);

  // Clean up spelling suggestions timer on unmount
  useEffect(() => {
    return () => {
      if (quillSuggestionsTimeoutRef.current) {
        clearTimeout(quillSuggestionsTimeoutRef.current);
      }
    };
  }, []);

  // Keydown listener for space and punctuation autocorrect in Quill
  useEffect(() => {
    if (!isEditing || !quillWrapperRef.current) return;
    
    let editorEl: HTMLElement | null = null;
    let listener: ((e: KeyboardEvent) => void) | null = null;

    const setupListener = () => {
      editorEl = quillWrapperRef.current?.querySelector('.ql-editor') || null;
      if (!editorEl) {
        setTimeout(setupListener, 100);
        return;
      }

      listener = (e: KeyboardEvent) => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        const triggers = [' ', '.', ',', '!', '?', ';', ':', 'Enter'];
        if (!triggers.includes(e.key)) return;

        const range = quill.getSelection();
        if (!range || range.index === 0) return;

        const pos = range.index;
        const text = quill.getText(0, pos);
        
        // Find the word immediately before the cursor
        // First find the end of the word (skip trailing whitespace before cursor)
        let wordEnd = pos;
        while (wordEnd > 0 && /\s/.test(text[wordEnd - 1])) {
          wordEnd--;
        }
        // Now find the start of the word
        let wordStart = wordEnd;
        while (wordStart > 0 && !/\s/.test(text[wordStart - 1])) {
          wordStart--;
        }

        if (wordStart === wordEnd) return; // No word found

        const wordWithPunc = text.slice(wordStart, wordEnd);
        const corrected = autocorrectWord(wordWithPunc);
        
        if (corrected !== wordWithPunc) {
          const appendChar = e.key === 'Enter' ? '' : e.key;
          if (e.key !== 'Enter') {
            e.preventDefault();
          }

          // Use updateContents for atomic change
          quill.updateContents({
            ops: [
              { retain: wordStart },
              { delete: wordEnd - wordStart },
              { insert: corrected + appendChar }
            ]
          });

          const newCursorPos = wordStart + corrected.length + appendChar.length;

          // Set selection immediately
          quill.setSelection(newCursorPos);

          // Update React state synchronously to prevent controlled overwrite
          setEditContent(quill.root.innerHTML);

          requestAnimationFrame(() => {
            setTimeout(() => {
              quill.setSelection(newCursorPos);
              checkQuillSpelling();
            }, 0);
          });
        }
      };

      editorEl.addEventListener('keydown', listener);
    };

    setupListener();

    return () => {
      if (editorEl && listener) {
        editorEl.removeEventListener('keydown', listener);
      }
    };
  }, [isEditing, checkQuillSpelling]);

  // Hook up text-change and selection-change events
  useEffect(() => {
    if (!isEditing) return;
    
    let quill: any = null;
    const setupEvents = () => {
      quill = quillRef.current?.getEditor();
      if (!quill) {
        setTimeout(setupEvents, 100);
        return;
      }

      quill.on('selection-change', checkQuillSpelling);
      quill.on('text-change', checkQuillSpelling);
    };

    setupEvents();

    return () => {
      if (quill) {
        quill.off('selection-change', checkQuillSpelling);
        quill.off('text-change', checkQuillSpelling);
      }
    };
  }, [isEditing, checkQuillSpelling]);

  // Dynamically inject native HTML title tooltips for Quill toolbar elements to guide users
  useEffect(() => {
    if (!isEditing) return;

    let attempts = 0;
    const injectTooltips = () => {
      const quill = quillRef.current?.getEditor();
      if (!quill) {
        if (attempts < 20) {
          attempts++;
          setTimeout(injectTooltips, 100);
        }
        return;
      }

      const toolbar = quill.getModule('toolbar');
      if (toolbar && toolbar.container) {
        const container = toolbar.container;
        const tooltips: Record<string, string> = {
          'ql-bold': 'Bold (Ctrl+B) — Style text thicker',
          'ql-italic': 'Italic (Ctrl+I) — Slant text for emphasis',
          'ql-underline': 'Underline (Ctrl+U) — Add underline to text',
          'ql-strike': 'Strikethrough (Ctrl+Shift+S) — Cross out text',
          'ql-list[value="ordered"]': 'Numbered List (Ctrl+Shift+7) — Create list of items with numbers',
          'ql-list[value="bullet"]': 'Bulleted List (Ctrl+Shift+8) — Create list of items with bullets',
          'ql-indent[value="-1"]': 'Outdent (Shift+Tab) — Move text margins outwards',
          'ql-indent[value="+1"]': 'Indent (Tab) — Move text margins inwards',
          'ql-blockquote': 'Blockquote — Highlight a quote or reference block',
          'ql-code-block': 'Code Block — Write syntax-highlighted code',
          'ql-link': 'Insert Link (Ctrl+K) — Hyperlink selected text',
          'ql-image': 'Insert Image — Embed images in notes',
          'ql-clean': 'Clear Formatting — Strip styles back to plain text',
          'ql-header': 'Heading Level (Ctrl+1/2/3) — Change title/heading size',
          'ql-size': 'Font Size — Make text small, normal, large, or huge',
          'ql-color': 'Text Color — Change writing color',
          'ql-background': 'Text Highlight Color — Change background highlight color',
          'ql-align': 'Text Alignment — Left, center, right, or justified alignment'
        };

        Object.entries(tooltips).forEach(([selector, tooltip]) => {
          const query = selector.startsWith('ql-') ? `.${selector}` : selector;
          const elements = container.querySelectorAll(query);
          elements.forEach((el: any) => {
            if (el) {
              el.setAttribute('title', tooltip);
              el.setAttribute('aria-label', tooltip);
            }
          });
        });
      }
    };

    injectTooltips();
  }, [isEditing, selectedNote]);

  // Markdown import / edit
  const [showMarkdownImport, setShowMarkdownImport] = useState(false);
  const [markdownInput, setMarkdownInput] = useState('');
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false);

  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [pdfQuality, setPdfQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showShareGroup, setShowShareGroup] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [multitaskPanel, setMultitaskPanel] = useState<'youtube' | 'tutor' | 'reference' | null>(null);

  // ── AI Beautify states ──
  const [showBeautifyPreview, setShowBeautifyPreview] = useState(false);
  const [beautifyResult, setBeautifyResult] = useState('');
  const [beautifyBeforeHtml, setBeautifyBeforeHtml] = useState('');
  const [beautifyLoading, setBeautifyLoading] = useState(false);
  const [beautifySavedImages, setBeautifySavedImages] = useState<string[]>([]);
  const [beautifySelectionRange, setBeautifySelectionRange] = useState<{ index: number; length: number } | null>(null);

  // ── Voice Dictation states ──
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ── Math Palette state ──
  const [showMathPalette, setShowMathPalette] = useState(false);
  const [mathPaletteEditNode, setMathPaletteEditNode] = useState<HTMLElement | null>(null);
  const [mathPaletteEditLatex, setMathPaletteEditLatex] = useState('');
  const [mathPaletteEditIsBlock, setMathPaletteEditIsBlock] = useState(false);

  const { groups } = useGroups();

  const noteRef = useRef<HTMLDivElement>(null);

  // Filter + group
  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.folder.toLowerCase().includes(q));
  }, [notes, search]);

  const folders = useMemo(() => {
    const map = new Map<string, Note[]>();
    filteredNotes.forEach((n) => { const g = map.get(n.folder) || []; g.push(n); map.set(n.folder, g); });
    return map;
  }, [filteredNotes]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const id = await addNote({ title: newTitle.trim(), content: '', folder: newFolder.trim() || 'General', tags: [] });
    await awardXP(XP_AWARDS.NOTE_CREATED, 'New note created');
    toast.success('Scroll created! +10 XP 📝');
    setShowNewModal(false); setNewTitle(''); setNewFolder('General');
    if (id) {
      const note = { id, title: newTitle.trim(), content: '', folder: newFolder.trim() || 'General', tags: [], createdAt: Date.now(), updatedAt: Date.now() };
      setSelectedNote(note); setEditContent(''); setEditTitle(newTitle.trim()); setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!selectedNote) return;
    setSaveStatus('saving');
    await updateNote(selectedNote.id, { title: editTitle, content: editContent });
    setSelectedNote({ ...selectedNote, title: editTitle, content: editContent, updatedAt: Date.now() });
    lastSavedAt.current = Date.now();
    setSaveStatus('saved');
    setIsEditing(false);
    toast.success('Note saved! 💾');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // Autosave: fires 5 seconds after last change
  const triggerAutosave = useCallback(async (content: string, title: string) => {
    if (!selectedNote) return;
    setSaveStatus('saving');
    await updateNote(selectedNote.id, { title, content });
    setSelectedNote((prev) => prev ? { ...prev, title, content, updatedAt: Date.now() } : prev);
    lastSavedAt.current = Date.now();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [selectedNote, updateNote]);

  const handleContentChange = useCallback((content: string) => {
    setEditContent(content);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      triggerAutosave(content, editTitle);
    }, 5000);

    // ── Detect compare/slash compare command ──
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const text = quill.getText();
      const range = quill.getSelection();
      if (range) {
        const compareRegex = /(?:^|\n)(?:\/)?compare\s+(.+?)\s+(?:vs|and|versus|with)\s+([^\r\n]+)(?:\r?\n)/i;
        const match = text.match(compareRegex);
        if (match) {
          const commandText = match[0].trim();
          const topicA = match[1].trim();
          const topicB = match[2].trim();
          if (topicA && topicB) {
            // Immediately replace the command text with a placeholder
            const matchStart = text.lastIndexOf(commandText, range.index);
            if (matchStart !== -1) {
              const placeholderText = `⏳ Generating comparison: ${topicA} vs ${topicB}...`;
              quill.deleteText(matchStart, commandText.length);
              quill.insertText(matchStart, placeholderText);
              handleCompareCommand(topicA, topicB, placeholderText);
            }
          }
        }
      }
    }
  }, [editTitle, triggerAutosave]);

  // Cleanup autosave timer
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);



  // Listen to clicks inside the editor to allow editing math equations
  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const handleEditorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const mathNode = target.closest('.studyquest-math-embed');
      if (mathNode) {
        const latex = mathNode.getAttribute('data-latex') || '';
        const isBlock = mathNode.getAttribute('data-block') === 'true';

        setMathPaletteEditNode(mathNode as HTMLElement);
        setMathPaletteEditLatex(latex);
        setMathPaletteEditIsBlock(isBlock);
        setShowMathPalette(true);
      }
    };

    quill.root.addEventListener('click', handleEditorClick);
    return () => {
      quill.root.removeEventListener('click', handleEditorClick);
    };
  }, [selectedNote, isEditing]);

  // Undo / Redo via Quill history (accessed through DOM)
  const getQuillEditor = useCallback(() => {
    const wrapper = quillWrapperRef.current;
    if (!wrapper) return null;
    // react-quill-new stores the instance on the component; access via DOM
    const quillEl = wrapper.querySelector('.ql-editor');
    // @ts-ignore - Quill attaches __quill to the container
    return (wrapper.querySelector('.ql-container') as any)?.__quill || null;
  }, []);

  const handleUndo = () => {
    const editor = getQuillEditor();
    if (editor) editor.history.undo();
  };
  const handleRedo = () => {
    const editor = getQuillEditor();
    if (editor) editor.history.redo();
  };

  // Word count & reading time
  const wordCount = useMemo(() => {
    const text = editContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!text) return { words: 0, chars: 0, readingTime: '0 min' };
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const mins = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readingTime: `${mins} min read` };
  }, [editContent]);

  const openNote = (note: Note) => { setSelectedNote(note); setEditContent(note.content); setEditTitle(note.title); setIsEditing(false); setPreview(false); setViewMode(false); setSaveStatus('idle'); };
  const backToList = () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); setSelectedNote(null); setIsEditing(false); setPreview(false); setViewMode(false); setSaveStatus('idle'); };

  // Convert markdown to HTML (with Mermaid diagram rendering) and save into the note
  const handleMarkdownImport = async () => {
    if (!markdownInput.trim() || !selectedNote) return;
    let html = await marked.parse(markdownInput);

    // ── Render Mermaid code blocks into SVG images ──
    // marked.parse() turns ```mermaid ... ``` into <pre><code class="language-mermaid">...</code></pre>
    // We find each one, compile it with mermaid, and replace with an inline <img> of the SVG.
    const mermaidBlockRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi;
    const mermaidMatches = [...html.matchAll(mermaidBlockRegex)];

    if (mermaidMatches.length > 0) {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#7C3AED',
            primaryTextColor: '#fff',
            primaryBorderColor: '#a78bfa',
            lineColor: '#a78bfa',
            secondaryColor: '#EC4899',
            tertiaryColor: '#10B981',
            background: '#1a1a2e',
            mainBkg: '#1a1a2e',
            nodeBorder: '#a78bfa',
            fontFamily: 'system-ui, sans-serif',
          },
          securityLevel: 'loose',
        });

        for (let i = 0; i < mermaidMatches.length; i++) {
          const match = mermaidMatches[i];
          const fullMatch = match[0];
          // Decode HTML entities back to plain text for the mermaid compiler
          const rawCode = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();

          try {
            const diagramId = `mermaid-import-${Date.now()}-${i}`;
            const { svg } = await mermaid.render(diagramId, rawCode);
            // Convert the SVG string to a base64 data URL so it embeds cleanly in Quill
            const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(svgBlob);
            });
            const imgTag = `<p><img src="${dataUrl}" alt="Mermaid Diagram" style="max-width:100%;border-radius:12px;margin:12px 0;background:#1a1a2e;padding:16px;" /></p>`;
            html = html.replace(fullMatch, imgTag);
          } catch (mermaidErr) {
            console.warn(`Mermaid render failed for block ${i}:`, mermaidErr);
            // Leave the code block as-is if rendering fails
          }
        }
      } catch (importErr) {
        console.warn('Failed to load mermaid library:', importErr);
      }
    }

    // Save the raw markdown source so users can re-edit it later
    const rawSource = markdownInput;

    const quill = quillRef.current?.getEditor();
    if (isEditingMarkdown) {
      // Editing existing markdown — replace entire content
      if (quill) {
        quill.root.innerHTML = html;
        const newContent = quill.root.innerHTML;
        setEditContent(newContent);
        await updateNote(selectedNote.id, { content: newContent, markdownSource: rawSource });
        setSelectedNote({ ...selectedNote, content: newContent, markdownSource: rawSource, updatedAt: Date.now() });
      } else {
        setEditContent(html);
        await updateNote(selectedNote.id, { content: html, markdownSource: rawSource });
        setSelectedNote({ ...selectedNote, content: html, markdownSource: rawSource, updatedAt: Date.now() });
      }
    } else {
      // First import — append to existing content
      if (quill) {
        const length = quill.getLength();
        quill.clipboard.dangerouslyPasteHTML(length - 1, html);
        const newContent = quill.root.innerHTML;
        setEditContent(newContent);
        await updateNote(selectedNote.id, { content: newContent, markdownSource: rawSource });
        setSelectedNote({ ...selectedNote, content: newContent, markdownSource: rawSource, updatedAt: Date.now() });
      } else {
        const newContent = (editContent || '') + html;
        setEditContent(newContent);
        await updateNote(selectedNote.id, { content: newContent, markdownSource: rawSource });
        setSelectedNote({ ...selectedNote, content: newContent, markdownSource: rawSource, updatedAt: Date.now() });
      }
    }
    
    setMarkdownInput('');
    setShowMarkdownImport(false);
    setIsEditingMarkdown(false);
    toast.success(isEditingMarkdown ? 'Markdown updated! ✅' : 'Markdown imported! 📄');
  };

  // Insert diagram image into note content
  const handleInsertDiagram = (dataUrl: string) => {
    const imgTag = `<p><img src="${dataUrl}" alt="Diagram" style="max-width:100%;border-radius:12px;margin:8px 0;" /></p>`;
    
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      const index = range ? range.index : quill.getLength() - 1;
      quill.clipboard.dangerouslyPasteHTML(index, imgTag);
      const newContent = quill.root.innerHTML;
      setEditContent(newContent);
      if (selectedNote) {
        updateNote(selectedNote.id, { content: newContent });
        setSelectedNote({ ...selectedNote, content: newContent, updatedAt: Date.now() });
      }
    } else {
      const newContent = (editContent || '') + imgTag;
      setEditContent(newContent);
      if (selectedNote) {
        updateNote(selectedNote.id, { content: newContent });
        setSelectedNote({ ...selectedNote, content: newContent, updatedAt: Date.now() });
      }
    }
  };

  // =================== PDF EXPORT ===================
  const exportPdf = async () => {
    if (!selectedNote || !selectedNote.content) { toast.error('Nothing to export'); return; }
    setShowPdfModal(false);

    const qualityScale = pdfQuality === 'low' ? 1 : pdfQuality === 'medium' ? 2 : 3;
    const jpegQuality = pdfQuality === 'low' ? 0.5 : pdfQuality === 'medium' ? 0.75 : 0.85;

    const toastId = toast.loading('Generating PDF...');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = (await import('jspdf')) as any;

      // Create offscreen rendering element — match editor styling exactly
      const container = document.createElement('div');
      container.style.cssText = `width:794px;padding:40px;position:absolute;left:-9999px;font-family:system-ui;font-size:14px;line-height:1.8;color:#222;background:#fff;white-space:pre-wrap;word-wrap:break-word;`;
      // Include Quill indent CSS so indentation renders in PDF
      const styleTag = document.createElement('style');
      styleTag.textContent = `
        .ql-indent-1 { padding-left: 3em; }
        .ql-indent-2 { padding-left: 6em; }
        .ql-indent-3 { padding-left: 9em; }
        .ql-indent-4 { padding-left: 12em; }
        p, li, div { white-space: pre-wrap; word-wrap: break-word; }
        pre { background: #f4f4f5; padding: 12px 16px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 13px; }
        code { background: #f4f4f5; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 13px; }
        blockquote { border-left: 4px solid #7C3AED; padding: 8px 16px; margin: 12px 0; background: #f5f3ff; border-radius: 0 8px 8px 0; }
        h1 { font-size: 22px; font-weight: 700; margin: 16px 0 8px; }
        h2 { font-size: 18px; font-weight: 700; margin: 14px 0 6px; }
        h3 { font-size: 16px; font-weight: 600; margin: 12px 0 4px; }
        ul, ol { padding-left: 1.5em; margin: 8px 0; }
        li { margin: 4px 0; }
        img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        .katex-display { margin: 8px 0; display: block; text-align: center; }
        .katex-inline { display: inline-block; }
      `;
      container.appendChild(styleTag);

      // 1. Process $...$ and $$...$$ math delimiters in note content
      let processedContent = await renderMathInHtml(selectedNote.content);

      // 2. Setup the HTML inside the PDF export container
      container.innerHTML += `<h1 style="font-size:24px;font-weight:800;margin-bottom:8px;">${selectedNote.title}</h1>
        <p style="font-size:10px;color:#888;margin-bottom:20px;">Exported from StudyQuest AI · ${new Date().toLocaleDateString()}</p>
        <div style="line-height:1.8;white-space:pre-wrap;">${processedContent}</div>`;
      document.body.appendChild(container);

      // 3. Render all <math-field> tags (custom embeds) statically using KaTeX
      const katexMod = await import('katex');
      const katex = katexMod.default;
      const mathFields = container.querySelectorAll('math-field, .studyquest-math-embed');
      mathFields.forEach((el) => {
        const latex = el.getAttribute('data-latex') || '';
        const isBlock = el.getAttribute('data-block') === 'true';
        try {
          const renderedSpan = document.createElement(isBlock ? 'div' : 'span');
          renderedSpan.className = isBlock ? 'katex-block' : 'katex-inline';
          renderedSpan.innerHTML = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: isBlock,
          });
          el.parentNode?.replaceChild(renderedSpan, el);
        } catch {
          el.textContent = latex;
        }
      });

      // 4. Remove empty blockquotes (which render as empty purple boxes)
      const emptyBlockquotes = container.querySelectorAll('blockquote');
      emptyBlockquotes.forEach((el) => {
        const text = el.textContent?.trim() || '';
        if (!text) {
          el.parentNode?.removeChild(el);
        }
      });

      // 5. Avoid splitting elements across pages by dynamically inserting spacers
      const pdf = new jsPDF('p', 'mm', pdfPageSize) as any;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - 32;
      
      const pagePixelHeight = (usableHeight * 794) / imgWidth;
      const contentDiv = container.querySelector('div');
      if (contentDiv) {
        const blocks = Array.from(contentDiv.querySelectorAll('p, li, h1, h2, h3, blockquote, pre, .studyquest-math-embed, .katex-block, .katex-display'));
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i] as HTMLElement;
          const rect = block.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const top = rect.top - containerRect.top;
          const bottom = rect.bottom - containerRect.top;
          
          const pageIndex = Math.floor(top / pagePixelHeight);
          const endPageIndex = Math.floor(bottom / pagePixelHeight);
          
          if (endPageIndex > pageIndex) {
            const pageBoundary = (pageIndex + 1) * pagePixelHeight;
            const spacerHeight = pageBoundary - top;
            // Only add spacer if it fits within a page
            if (spacerHeight > 0 && block.offsetHeight < pagePixelHeight) {
              const spacer = document.createElement('div');
              spacer.style.height = `${spacerHeight}px`;
              spacer.className = 'pdf-page-spacer';
              block.parentNode?.insertBefore(spacer, block);
            }
          }
        }
      }

      const canvas = await html2canvas(container, { scale: qualityScale, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(container);

      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const totalPages = Math.ceil(imgHeight / usableHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        const srcY = (page * usableHeight * canvas.width) / imgWidth;
        const srcH = Math.min((usableHeight * canvas.width) / imgWidth, canvas.height - srcY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        sliceCanvas.getContext('2d')!.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const sliceData = sliceCanvas.toDataURL('image/jpeg', jpegQuality);
        const sliceHeight = (srcH * imgWidth) / canvas.width;
        
        // Draw note content centered vertically within usable area
        pdf.addImage(sliceData, 'JPEG', margin, 16, imgWidth, sliceHeight, undefined, 'FAST');

        // ══════════ DRAW BEAUTIFIED BORDERS & BRANDING ══════════
        
        // 1. Draw outer page border (soft rounded lavender border)
        pdf.setDrawColor(220, 210, 235); // Soft lavender-grey
        pdf.setLineWidth(0.3);
        pdf.roundedRect(6, 6, pageWidth - 12, pageHeight - 12, 4, 4, 'D');

        // 2. Draw Header
        pdf.setFont("Helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(124, 58, 237); // Purple primary
        pdf.text("STUDYQUEST AI", 12, 11);

        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(100, 100, 100);
        const titleText = selectedNote.title.length > 50 ? selectedNote.title.substring(0, 47) + '...' : selectedNote.title;
        pdf.text(`·  ${titleText.toUpperCase()}`, 38, 11);

        pdf.text(new Date().toLocaleDateString(), pageWidth - 12, 11, { align: "right" });

        // Header separator line
        pdf.setDrawColor(235, 230, 245);
        pdf.line(12, 13, pageWidth - 12, 13);

        // 3. Draw Footer
        // Footer separator line
        pdf.setDrawColor(235, 230, 245);
        pdf.line(12, pageHeight - 13, pageWidth - 12, pageHeight - 13);

        pdf.setFont("Helvetica", "italic");
        pdf.setFontSize(6.5);
        pdf.setTextColor(140, 140, 140);
        pdf.text("Level Up Your Learning · studyquest.ai", 12, pageHeight - 9);

        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text(`Page ${page + 1} of ${totalPages}`, pageWidth - 12, pageHeight - 9, { align: "right" });
      }

      pdf.save(`${selectedNote.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      toast.success('PDF exported! 📄', { id: toastId });
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('PDF export failed', { id: toastId });
    }
  };

  // =================== VOICE DICTATION ===================
  const handleVoiceInput = async (transcript: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    const index = range ? range.index : quill.getLength() - 1;

    // Replace spoken punctuation names with actual characters
    let processedTranscript = transcript
      .replace(/\b(?:full\s*stop|period)\b/gi, '.')
      .replace(/\bquestion\s*marks?\b/gi, '?')
      .replace(/\bcomma\b/gi, ',')
      .replace(/\bexclamation\s*(?:mark|point)\b/gi, '!')
      .replace(/\bcolon\b/gi, ':')
      .replace(/\bsemi\s*colon\b/gi, ';')
      .replace(/\b(?:next\s*line|new\s*line|newline)\b/gi, '\n');

    // Clean up spaces before punctuation
    processedTranscript = processedTranscript.replace(/\s+([.,!?:;\n])/g, '$1');
    // Remove space right before or after a newline character
    processedTranscript = processedTranscript.replace(/\s*\n\s*/g, '\n');
    // Remove punctuation at the start of a newline (often speech recognition artifacts)
    processedTranscript = processedTranscript.replace(/\n[.,!?:;]+/g, '\n');

    // Trim leading/trailing spaces but PRESERVE leading/trailing newlines!
    const cleanTranscript = processedTranscript.replace(/^[ \t\r]+|[ \t\r]+$/g, '');

    // If it consists only of newlines (e.g. user said "next line")
    if (/^\n+$/.test(cleanTranscript)) {
      quill.insertText(index, cleanTranscript);
      quill.setSelection(index + cleanTranscript.length);
      return;
    }

    if (!cleanTranscript) return;

    // 1. "header 1 [topic]"
    const headerMatch = cleanTranscript.match(/^header\s+1\s+(.+)$/i);
    if (headerMatch) {
      const topicName = headerMatch[1].replace(/[.?]+$/, '').trim();
      quill.insertText(index, `\n${topicName}\n`);
      quill.formatLine(index + 1, topicName.length, 'header', 1);
      quill.setSelection(index + topicName.length + 2);
      toast.success(`Formatted header: "${topicName}" 🎙️`);
      return;
    }

    // 2. "compare [A] vs [B]"
    const compareMatch = cleanTranscript.match(/^(?:please\s+)?compare\s+(.+?)\s+(?:vs|versus|and|with)\s+(.+?)[.?]?$/i);
    if (compareMatch) {
      const topicA = compareMatch[1].replace(/^[^\w'-]+|[^\w'-]+$/g, '').trim();
      const topicB = compareMatch[2].replace(/^[^\w'-]+|[^\w'-]+$/g, '').trim();
      const placeholderText = `⏳ Generating comparison: ${topicA} vs ${topicB}...`;
      
      quill.insertText(index, placeholderText + '\n');
      quill.setSelection(index + placeholderText.length + 1);
      
      await handleCompareCommand(topicA, topicB, placeholderText);
      return;
    }

    // 3. "bold [text]" / "write bold [text]" / "bold the [text]"
    const boldMatch = cleanTranscript.match(/^(?:write\s+)?bold\s+(?:the\s+)?(.+)$/i);
    if (boldMatch) {
      const textToBold = boldMatch[1].replace(/[.?]+$/, '').trim();
      quill.insertText(index, textToBold);
      quill.formatText(index, textToBold.length, 'bold', true);
      quill.insertText(index + textToBold.length, ' ');
      quill.formatText(index + textToBold.length, 1, 'bold', false);
      quill.setSelection(index + textToBold.length + 1);
      toast.success('Formatted bold text 🎙️');
      return;
    }

    // 4. "italic [text]" / "write italic [text]" / "italic the [text]"
    const italicMatch = cleanTranscript.match(/^(?:write\s+)?italic\s+(?:the\s+)?(.+)$/i);
    if (italicMatch) {
      const textToItalic = italicMatch[1].replace(/[.?]+$/, '').trim();
      quill.insertText(index, textToItalic);
      quill.formatText(index, textToItalic.length, 'italic', true);
      quill.insertText(index + textToItalic.length, ' ');
      quill.formatText(index + textToItalic.length, 1, 'italic', false);
      quill.setSelection(index + textToItalic.length + 1);
      toast.success('Formatted italic text 🎙️');
      return;
    }

    // 5. "bullet [text]" / "bullet point [text]" / "write bullet [text]"
    const bulletMatch = cleanTranscript.match(/^(?:write\s+)?bullet\s+(?:point\s+)?(.+)$/i);
    if (bulletMatch) {
      const listItemText = bulletMatch[1].replace(/[.?]+$/, '').trim();
      quill.insertText(index, `\n${listItemText}\n`);
      quill.formatLine(index + 1, listItemText.length, 'list', 'bullet');
      quill.setSelection(index + listItemText.length + 2);
      toast.success('Added bullet point 🎙️');
      return;
    }

    // 6. Default: normal dictation
    const insertSuffix = cleanTranscript.endsWith('\n') ? '' : ' ';
    quill.insertText(index, cleanTranscript + insertSuffix);
    quill.setSelection(index + cleanTranscript.length + insertSuffix.length);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      toast('Microphone turned off', { icon: '🎙️' });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice dictation is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      toast.success('Listening... Start speaking! 🎙️', { id: 'dictation' });
    };

    rec.onresult = (event: any) => {
      const resultIndex = event.resultIndex;
      const result = event.results[resultIndex];
      if (result.isFinal) {
        const transcript = result[0].transcript;
        handleVoiceInput(transcript);
      }
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Microphone permission blocked. Please enable it in browser settings.', { id: 'dictation' });
      } else {
        toast.error('Dictation encountered an error.', { id: 'dictation' });
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  // Clean up voice recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // =================== AI SUMMARIZE ===================
  const aiSummarize = async () => {
    if (!selectedNote?.content) { toast.error('Nothing to summarize'); return; }
    if (!profile?.openRouterKey) { toast.error('Set your API key in Settings first'); return; }

    setAiLoading(true);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${profile.openRouterKey}`, 'HTTP-Referer': window.location.origin },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: 'You are a study assistant. Summarize the following notes concisely into key points with bullet points. Keep it focused and useful for revision.' }, { role: 'user', content: selectedNote.content }],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      const summary = data.choices?.[0]?.message?.content || 'Could not generate summary.';
      setSummaryText(summary);
      setShowSummary(true);
      toast.success('Summary generated! ✨');
    } catch { toast.error('Failed to summarize'); }
    finally { setAiLoading(false); }
  };

  // =================== AI FLASHCARDS ===================
  const aiFlashcards = async () => {
    if (!selectedNote?.content) { toast.error('Nothing to create flashcards from'); return; }
    if (!profile?.openRouterKey) { toast.error('Set your API key in Settings first'); return; }

    setAiLoading(true);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${profile.openRouterKey}`, 'HTTP-Referer': window.location.origin },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: 'Create 5-8 flashcards from the following notes. Return ONLY valid JSON array with objects having "question" and "answer" fields. No markdown, no explanation, just JSON.' }, { role: 'user', content: selectedNote.content }],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '[]';
      // Extract JSON from response
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const cards: Flashcard[] = JSON.parse(jsonMatch[0]);
        setFlashcards(cards);
        setCardIndex(0);
        setCardFlipped(false);
        setShowFlashcards(true);
        toast.success(`${cards.length} flashcards created! 🃏`);
      } else { toast.error('Could not parse flashcards'); }
    } catch { toast.error('Failed to generate flashcards'); }
    finally { setAiLoading(false); }
  };

  // =================== AI BEAUTIFY NOTES ===================
  const aiBeautify = async () => {
    if (!selectedNote) return;
    if (!profile?.openRouterKey) { toast.error('Set your API key in Settings first'); return; }

    const quill = quillRef.current?.getEditor();
    let currentHtml = quill ? quill.root.innerHTML : (editContent || selectedNote.content || '');
    let range: { index: number; length: number } | null = null;

    if (quill) {
      const sel = quill.getSelection();
      if (sel && sel.length > 0) {
        range = sel;
        // Convert selected Delta to HTML using a temporary Quill editor
        const QuillClass = quill.constructor;
        const tempDiv = document.createElement('div');
        const tempQuill = new (QuillClass as any)(tempDiv);
        tempQuill.setContents(quill.getContents(sel.index, sel.length));
        currentHtml = tempQuill.root.innerHTML;
      }
    }

    // Extract the plain text and check if note/selection is empty
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHtml;

    const hasImages = tempDiv.querySelectorAll('img').length > 0;
    const checkText = tempDiv.textContent || tempDiv.innerText || '';

    if (!checkText.trim() && !hasImages) {
      toast.error(range ? 'Selected text appears empty' : 'Note appears empty');
      return;
    }

    setBeautifyLoading(true);
    try {
      // Find all images and replace them with placeholders
      const savedImages: string[] = [];
      const imgElements = tempDiv.querySelectorAll('img');
      imgElements.forEach((img, idx) => {
        savedImages.push(img.outerHTML);
        const placeholderText = `[[IMG_PLACEHOLDER_${idx}]]`;
        const placeholderNode = document.createTextNode(placeholderText);
        img.parentNode?.replaceChild(placeholderNode, img);
      });

      // HTML content with placeholders to send to AI
      const contentWithPlaceholders = tempDiv.innerHTML;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${profile.openRouterKey}`, 'HTTP-Referer': window.location.origin },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'system',
            content: `You are a note formatting assistant for a rich text editor (Quill.js).

Your job is to take note content (or a selected portion of it) in HTML format and return a beautifully structured, clean HTML version.

CRITICAL RULES:
1. DO NOT remove, omit, or skip ANY content from the original notes. Every single word, fact, formula, and detail must be preserved.
2. DO NOT delete, alter, or relocate any image placeholders like [[IMG_PLACEHOLDER_0]]. They must remain exactly where they were in the flow of the text.
3. Use ONLY these HTML tags for formatting:
   - <h1>, <h2>, <h3> for headings (only if appropriate for structure)
   - <strong> for bold key terms and definitions
   - <em> for emphasis
   - <ul><li> for unordered lists (bullet points)
   - <ol><li> for ordered/numbered lists
   - <blockquote> for important quotes, definitions, or comparison cards
   - <pre class="ql-syntax"> for code blocks
   - <code> for inline code
   - <p> for paragraphs
4. DO NOT use Markdown syntax (no #, no *, no -). Use only HTML tags.
5. DO NOT use <table>, <tr>, <td> tags. Format any comparisons using separate blockquotes for aspect titles, followed by bulleted lists. DO NOT nest lists or other tags inside blockquotes.
6. Identify natural groupings and add appropriate headings or list styling.
7. Bold key terms, definitions, and important concepts.
8. Convert any list-like content into proper <ul> or <ol> lists.
9. Preserve any existing math formulas wrapped in $ or $$ delimiters exactly as they are.
10. DO NOT use <br> tags.

Return ONLY the formatted HTML. No explanations, no markdown, no wrapper.`
          }, {
            role: 'user',
            content: `Here are the notes (in HTML format) to beautify:\n\n${contentWithPlaceholders}`
          }],
          max_tokens: 4096,
        }),
      });
      const data = await res.json();
      let result = data.choices?.[0]?.message?.content || '';

      // Strip markdown code fences if the AI wrapped it
      result = result.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

      if (result) {
        // Restore images
        let finalResult = result;
        savedImages.forEach((imgHtml, idx) => {
          const placeholder = `[[IMG_PLACEHOLDER_${idx}]]`;
          if (finalResult.includes(placeholder)) {
            finalResult = finalResult.replaceAll(placeholder, imgHtml);
          } else {
            // Case-insensitive regex replacement in case AI changed case
            const escapedPlaceholder = placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escapedPlaceholder, 'gi');
            finalResult = finalResult.replace(regex, imgHtml);
          }
        });

        // Defensive check: append any images that were completely deleted by AI
        let missingImagesHtml = '';
        savedImages.forEach((imgHtml, idx) => {
          const placeholder = `[[IMG_PLACEHOLDER_${idx}]]`;
          const escapedPlaceholder = placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(escapedPlaceholder, 'i');
          if (!regex.test(result)) {
            missingImagesHtml += `<p>${imgHtml}</p>`;
          }
        });
        if (missingImagesHtml) {
          finalResult += `<p><br></p>${missingImagesHtml}`;
        }

        setBeautifyResult(finalResult);
        setBeautifyBeforeHtml(currentHtml);
        setBeautifySelectionRange(range);
        setShowBeautifyPreview(true);
      } else {
        toast.error('Could not beautify notes');
      }
    } catch { toast.error('Failed to beautify notes'); }
    finally { setBeautifyLoading(false); }
  };

  const applyBeautify = async () => {
    if (!beautifyResult || !selectedNote) return;
    const quill = quillRef.current?.getEditor();
    if (quill) {
      if (beautifySelectionRange) {
        const { index, length } = beautifySelectionRange;
        quill.deleteText(index, length);
        quill.clipboard.dangerouslyPasteHTML(index, beautifyResult);
      } else {
        quill.root.innerHTML = beautifyResult;
      }
      const newContent = quill.root.innerHTML;
      setEditContent(newContent);
      await updateNote(selectedNote.id, { content: newContent });
      setSelectedNote({ ...selectedNote, content: newContent, updatedAt: Date.now() });
    } else {
      setEditContent(beautifyResult);
      await updateNote(selectedNote.id, { content: beautifyResult });
      setSelectedNote({ ...selectedNote, content: beautifyResult, updatedAt: Date.now() });
    }
    setShowBeautifyPreview(false);
    setBeautifyResult('');
    setBeautifyBeforeHtml('');
    setBeautifySelectionRange(null);
    toast.success('Notes beautified! ✨');
  };

  // =================== /COMPARE SLASH COMMAND ===================
  const handleCompareCommand = async (topicA: string, topicB: string, placeholderText: string) => {
    if (!profile?.openRouterKey) {
      toast.error('Set your API key in Settings first');
      // Remove placeholder on failure
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const fullText = quill.getText();
        const start = fullText.indexOf(placeholderText);
        if (start !== -1) {
          quill.deleteText(start, placeholderText.length);
        }
      }
      return false;
    }

    toast.loading(`Generating comparison: ${topicA} vs ${topicB}...`, { id: 'compare' });

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${profile.openRouterKey}`, 'HTTP-Referer': window.location.origin },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'system',
            content: `You are a study assistant. Generate a beautifully structured comparison block comparing two topics.

Return ONLY valid HTML using this structure:
<h3>📊 Comparison: [Topic A] vs [Topic B]</h3>
<blockquote>🔍 Aspect 1: [Name of Aspect]</blockquote>
<ul>
  <li><strong>[Topic A]</strong>: [Explanation for Topic A, max 2 sentences]</li>
  <li><strong>[Topic B]</strong>: [Explanation for Topic B, max 2 sentences]</li>
</ul>
<blockquote>🔍 Aspect 2: [Name of Aspect]</blockquote>
<ul>
  <li><strong>[Topic A]</strong>: [Explanation for Topic A, max 2 sentences]</li>
  <li><strong>[Topic B]</strong>: [Explanation for Topic B, max 2 sentences]</li>
</ul>
... (Include 5-7 key comparison aspects)

Rules:
- DO NOT use Markdown (no #, no *, no -). Use only the specified HTML tags.
- DO NOT use <table>, <tr>, <td> tags.
- DO NOT use <br> tags.
- DO NOT nest lists or other elements inside <blockquote>. Use <blockquote> ONLY for the aspect header lines.
- Keep comparisons concise and highly informative.
- Return ONLY the HTML code. No explanation or code fences.`
          }, {
            role: 'user',
            content: `Compare: ${topicA} vs ${topicB}`
          }],
          max_tokens: 2048,
        }),
      });

      const data = await res.json();
      let tableHtml = data.choices?.[0]?.message?.content || '';
      tableHtml = tableHtml.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

      if (!tableHtml.includes('<blockquote')) {
        toast.error('Could not generate comparison card', { id: 'compare' });
        // Clean up placeholder
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const fullText = quill.getText();
          const start = fullText.indexOf(placeholderText);
          if (start !== -1) {
            quill.deleteText(start, placeholderText.length);
          }
        }
        return false;
      }

      // Remove the placeholder and insert the comparison HTML
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const fullText = quill.getText();
        const matchStart = fullText.indexOf(placeholderText);
        if (matchStart !== -1) {
          quill.deleteText(matchStart, placeholderText.length);
          quill.clipboard.dangerouslyPasteHTML(matchStart, `<p><br></p>${tableHtml}<p><br></p>`);
          const newContent = quill.root.innerHTML;
          setEditContent(newContent);
          if (selectedNote) {
            await updateNote(selectedNote.id, { content: newContent });
            setSelectedNote({ ...selectedNote, content: newContent, updatedAt: Date.now() });
          }
        }
      }

      toast.success('Comparison card inserted! 📊', { id: 'compare' });
      return true;
    } catch {
      toast.error('Failed to generate comparison', { id: 'compare' });
      // Clean up placeholder on error
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const fullText = quill.getText();
        const start = fullText.indexOf(placeholderText);
        if (start !== -1) {
          quill.deleteText(start, placeholderText.length);
        }
      }
      return false;
    }
  };

  // =================== MATH FORMULA INSERT ===================
  const handleInsertMath = (latex: string, isBlock: boolean, nodeToEdit?: HTMLElement | null) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    if (nodeToEdit) {
      // Editing an existing node
      nodeToEdit.setAttribute('data-latex', latex);
      nodeToEdit.setAttribute('data-block', isBlock ? 'true' : 'false');

      // Re-render KaTeX in that node
      import('katex').then((katexMod) => {
        katexMod.default.render(latex, nodeToEdit, {
          displayMode: isBlock,
          throwOnError: false,
        });

        // Sync editor state
        const newContent = quill.root.innerHTML;
        setEditContent(newContent);
        if (selectedNote) {
          updateNote(selectedNote.id, { content: newContent });
          setSelectedNote({ ...selectedNote, content: newContent, updatedAt: Date.now() });
        }
      });
      toast.success('Formula updated! 🧮');
    } else {
      // Inserting a new node
      const range = quill.getSelection();
      const index = range ? range.index : quill.getLength() - 1;

      quill.insertText(index, ' ');
      quill.insertEmbed(index + 1, 'math', { latex, isBlock });
      quill.insertText(index + 2, ' ');
      quill.setSelection(index + 3, 0);

      const newContent = quill.root.innerHTML;
      setEditContent(newContent);
      if (selectedNote) {
        updateNote(selectedNote.id, { content: newContent });
        setSelectedNote({ ...selectedNote, content: newContent, updatedAt: Date.now() });
      }
      toast.success('Formula inserted! 🧮');
    }
  };

  // =================== KATEX RENDERING HELPER ===================
  /**
   * Post-process HTML to render $...$ (inline) and $$...$$ (block) math
   * formulas using KaTeX. Returns a promise since we dynamically import KaTeX.
   */
  const renderMathInHtml = useCallback(async (html: string): Promise<string> => {
    // Quick check: does the HTML contain any $ delimiters?
    if (!html.includes('$')) return html;

    try {
      const katex = (await import('katex')).default;

      // First render block math: $$...$$
      html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, latex) => {
        try {
          // Decode HTML entities that Quill may have inserted
          const decoded = latex
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
            .replace(/<[^>]*>/g, '').trim();
          return `<div class="katex-block" style="text-align:center;margin:12px 0;font-size:1.2em;">${katex.renderToString(decoded, { throwOnError: false, displayMode: true, output: 'html' })}</div>`;
        } catch {
          return _match;
        }
      });

      // Then render inline math: $...$  (but not $$ which was already handled)
      html = html.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)/g, (_match, latex) => {
        try {
          const decoded = latex
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
            .replace(/<[^>]*>/g, '').trim();
          return `<span class="katex-inline">${katex.renderToString(decoded, { throwOnError: false, displayMode: false, output: 'html' })}</span>`;
        } catch {
          return _match;
        }
      });

      return html;
    } catch {
      return html;
    }
  }, []);

  // ── State for rendered math content in view mode ──
  const [renderedViewContent, setRenderedViewContent] = useState('');
  const [mathRenderKey, setMathRenderKey] = useState(0);

  // Re-render math when note content changes or view mode is entered
  useEffect(() => {
    if (!selectedNote?.content) { setRenderedViewContent(''); return; }
    if (!isEditing || viewMode) {
      let cancelled = false;
      renderMathInHtml(selectedNote.content).then((rendered) => {
        if (!cancelled) setRenderedViewContent(rendered);
      });
      return () => { cancelled = true; };
    }
  }, [selectedNote?.content, isEditing, viewMode, renderMathInHtml, mathRenderKey]);

  // ----- Note Detail View -----
  if (selectedNote) {
    return (
      <PageTransition>
        <div className={`${multitaskPanel && isEditing ? 'max-w-[95vw]' : 'max-w-4xl'} mx-auto space-y-4 transition-all duration-300`}>
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={backToList} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors"><HiChevronLeft size={20} /></button>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-2xl font-heading font-bold bg-transparent border-none outline-none w-full" placeholder="Note title..." />
              ) : (
                <h1 className="text-2xl font-heading font-bold truncate">{selectedNote.title}</h1>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="primary" size="sm">{selectedNote.folder}</Badge>
                <span className="text-[10px] text-[var(--muted-foreground)]"><HiClock className="inline mr-0.5" size={12} />{timeAgo(selectedNote.updatedAt)}</span>
                {isEditing && saveStatus !== 'idle' && (
                  <span className={`save-indicator ${saveStatus === 'saving' ? 'text-amber' : 'text-teal'}`}>
                    {saveStatus === 'saving' ? (<><HiRefresh className="animate-spin" size={10} /> Saving...</>) : (<><HiCheck size={10} /> Saved</>)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
                </>
              ) : viewMode ? (
                <>
                  <Button variant="ghost" size="sm" icon={<HiX size={14} />} onClick={() => setViewMode(false)}>Exit View</Button>
                </>
              ) : (
                <>
                  <Button variant="teal" size="sm" icon={<HiEye size={14} />} onClick={() => setViewMode(true)}>View Mode</Button>
                  <Button variant="ghost" size="sm" icon={<HiClipboardCopy size={14} />} onClick={() => { setIsEditingMarkdown(false); setMarkdownInput(''); setShowMarkdownImport(true); }}>Import MD</Button>
                  {selectedNote?.markdownSource && <Button variant="ghost" size="sm" icon={<HiCode size={14} />} onClick={() => { setIsEditingMarkdown(true); setMarkdownInput(selectedNote.markdownSource || ''); setShowMarkdownImport(true); }}>Edit MD Source</Button>}
                  <Button variant="primary" size="sm" icon={<HiPencil size={14} />} onClick={() => setIsEditing(true)}>Edit</Button>
                  <button onClick={() => setConfirmDelete(selectedNote.id)} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-coral/30 hover:text-coral transition-colors"><HiTrash size={18} /></button>
                </>
              )}
            </div>
          </div>

          {/* Toolbar — hidden in View Mode */}
          {!isEditing && !viewMode && selectedNote.content && selectedNote.content !== '<p><br></p>' && (
            <Card padding="sm" hover={false}>
              <div className="flex flex-wrap gap-2">
                <Button variant="teal" size="sm" icon={<HiDownload size={14} />} onClick={() => setShowPdfModal(true)}>Export PDF</Button>
                <Button variant="primary" size="sm" icon={<HiSparkles size={14} />} onClick={aiSummarize} loading={aiLoading}>AI Summarize</Button>
                <Button variant="amber" size="sm" icon={<HiLightningBolt size={14} />} onClick={aiFlashcards} loading={aiLoading}>AI Flashcards</Button>
                <Button variant="ghost" size="sm" icon={<HiAcademicCap size={14} />} onClick={() => setShowQuiz(true)}>Quiz Me</Button>
                <Button variant="coral" size="sm" icon={<HiCode size={14} />} onClick={() => setShowDiagram(true)}>Diagram</Button>
                {groups.length > 0 && <Button variant="ghost" size="sm" icon={<HiShare size={14} />} onClick={() => setShowShareGroup(true)}>Share to Group</Button>}
              </div>
            </Card>
          )}
          {/* Editing toolbar: Undo/Redo + Multitask + Diagram + Shortcuts */}
          {isEditing && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1.5">
                <button onClick={handleUndo} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors" title="Undo (Ctrl+Z)"><HiReply size={16} /></button>
                <button onClick={handleRedo} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors" title="Redo (Ctrl+Y)"><HiReply size={16} className="scale-x-[-1]" /></button>
              </div>
              <div className="multitask-toggle-bar">
                <button className={`multitask-toggle ${multitaskPanel === 'youtube' ? 'active' : ''}`} onClick={() => setMultitaskPanel(multitaskPanel === 'youtube' ? null : 'youtube')} title="YouTube Lecture">
                  📺 YouTube
                </button>
                <button className={`multitask-toggle ${multitaskPanel === 'tutor' ? 'active' : ''}`} onClick={() => setMultitaskPanel(multitaskPanel === 'tutor' ? null : 'tutor')} title="AI Tutor">
                  🤖 AI Tutor
                </button>
                <button className={`multitask-toggle ${multitaskPanel === 'reference' ? 'active' : ''}`} onClick={() => setMultitaskPanel(multitaskPanel === 'reference' ? null : 'reference')} title="Reference Viewer">
                  📄 Reference
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="amber" size="sm" icon={<HiSparkles size={14} />} onClick={aiBeautify} loading={beautifyLoading}>✨ Beautify</Button>
                <Button variant="primary" size="sm" onClick={() => setShowMathPalette(true)}>∑ Math</Button>
                <Button 
                  variant={isListening ? "coral" : "ghost"} 
                  size="sm" 
                  icon={<HiMicrophone size={14} className={isListening ? "animate-pulse text-white" : "text-primary"} />} 
                  onClick={toggleListening}
                  title="Voice Dictation (dictate notes, bold formatting, compare)"
                >
                  {isListening ? 'Listening...' : 'Dictate'}
                </Button>
                <button onClick={() => setShowShortcuts(!showShortcuts)} className={`p-2 rounded-xl border-2 transition-all text-xs ${showShortcuts ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--card-border)] hover:border-primary/30 text-[var(--muted-foreground)]'}`} title="Keyboard Shortcuts"><HiInformationCircle size={18} /></button>
                <Button variant="coral" size="sm" icon={<HiCode size={14} />} onClick={() => setShowDiagram(true)}>Insert Diagram</Button>
              </div>
            </div>
          )}

          {/* Editor / Preview / View Mode — wrapped in split layout when multitask panel is active */}
          {(() => {
            const editorCard = (
              <Card padding="none" hover={false}>
                <div ref={noteRef}>
                  {isEditing ? (
                    <div className="quill-wrapper" ref={quillWrapperRef}>
                       <ReactQuill
                        key={selectedNote?.id || 'new'}
                        ref={quillRef}
                        theme="snow"
                        defaultValue={sanitizeHtmlForQuill(selectedNote?.content || '')}
                        onChange={handleContentChange}
                        modules={QUILL_MODULES}
                        formats={QUILL_FORMATS}
                        placeholder="Start typing your study notes here... 💡 Hint: Type '/compare Topic A vs Topic B' and press Enter to instantly generate a comparison card, or use the 🎙️ Dictate button for voice commands!"
                        preserveWhitespace={true}
                        useSemanticHTML={false}
                      />
                      {/* Editor footer: word count & stats */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 border-t border-[var(--card-border)] text-[10px] text-[var(--muted-foreground)] font-semibold gap-2">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span>{wordCount.words} words</span>
                          <span>{wordCount.chars} chars</span>
                          <span>{wordCount.readingTime}</span>

                          {/* Spelling suggestions */}
                          {quillSuggestions.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 ml-0 sm:ml-4 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                              <span className="text-purple-400">💡 Did you mean:</span>
                              {quillSuggestions.map((suggestion, idx) => (
                                <button
                                  key={`${suggestion}-${idx}`}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    replaceQuillWord(suggestion);
                                  }}
                                  className="text-purple-300 hover:text-white hover:underline transition-colors px-1 bg-purple-500/25 rounded cursor-pointer"
                                >
                                  {suggestion}
                                </button>
                              ))}
                              <span className="text-[var(--muted-foreground)]/30 mx-1">|</span>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  addQuillWordToDictionary(quillActiveWord);
                                }}
                                className="text-purple-400 hover:text-purple-300 transition-colors font-bold underline cursor-pointer"
                              >
                                ➕ Add "{quillActiveWord.replace(/^[^\w'-]+|[^\w'-]+$/g, '') || quillActiveWord}"
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3 shrink-0 self-end sm:self-auto">
                          {saveStatus === 'saving' && <span className="text-amber flex items-center gap-1"><HiRefresh className="animate-spin" size={10} /> Autosaving...</span>}
                          {saveStatus === 'saved' && <span className="text-teal flex items-center gap-1"><HiCheck size={10} /> Autosaved</span>}
                        </div>
                      </div>
                    </div>
                  ) : viewMode ? (
                    /* ===== Distraction-Free View Mode ===== */
                    <div className="p-8 md:p-12 min-h-[500px] bg-[var(--card-bg)]">
                      <div className="max-w-2xl mx-auto">
                        <h1 className="text-3xl font-heading font-bold mb-2">{selectedNote.title}</h1>
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--card-border)]">
                          <Badge variant="primary" size="sm">{selectedNote.folder}</Badge>
                          <span className="text-xs text-[var(--muted-foreground)]"><HiClock className="inline mr-1" size={12} />{timeAgo(selectedNote.updatedAt)}</span>
                        </div>
                        {selectedNote.content && selectedNote.content !== '<p><br></p>' ? (
                          <div className="prose prose-lg max-w-none dark:prose-invert leading-relaxed studyquest-markdown" dangerouslySetInnerHTML={{ __html: renderedViewContent || selectedNote.content }} />
                        ) : (
                          <p className="text-sm text-[var(--muted-foreground)] italic">This note is empty.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 min-h-[300px]">
                      {selectedNote.content && selectedNote.content !== '<p><br></p>' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed studyquest-markdown" dangerouslySetInnerHTML={{ __html: renderedViewContent || selectedNote.content }} />
                      ) : (
                        <div className="text-center py-12">
                          <span className="text-4xl mb-3 block">📝</span>
                          <p className="text-sm text-[var(--muted-foreground)]">This note is empty.</p>
                          <Button variant="primary" size="sm" className="mt-3" onClick={() => setIsEditing(true)}>Start Writing</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );

            // If a multitask panel is active, wrap in resizable split layout
            if (multitaskPanel && isEditing) {
              const panelComponent = multitaskPanel === 'youtube' ? (
                <YouTubePanel
                  onClose={() => setMultitaskPanel(null)}
                  onInsertTimestamp={(ts) => {
                    const timestampHtml = `<p><strong style="color: #EF4444;">[⏱️ ${ts}]</strong> </p>`;
                    const quill = quillRef.current?.getEditor();
                    if (quill) {
                      const range = quill.getSelection();
                      const index = range ? range.index : quill.getLength() - 1;
                      quill.clipboard.dangerouslyPasteHTML(index, timestampHtml);
                      setEditContent(quill.root.innerHTML);
                    } else {
                      setEditContent(prev => prev + timestampHtml);
                    }
                  }}
                />
              ) : multitaskPanel === 'tutor' ? (
                <AITutorPanel
                  onClose={() => setMultitaskPanel(null)}
                  onInsertText={(text) => {
                    const insertHtml = `<blockquote><p>${text.replace(/\n/g, '</p><p>')}</p></blockquote>`;
                    const quill = quillRef.current?.getEditor();
                    if (quill) {
                      const range = quill.getSelection();
                      const index = range ? range.index : quill.getLength() - 1;
                      quill.clipboard.dangerouslyPasteHTML(index, insertHtml);
                      setEditContent(quill.root.innerHTML);
                    } else {
                      setEditContent(prev => prev + insertHtml);
                    }
                  }}
                  noteContent={editContent}
                  apiKey={profile?.openRouterKey}
                />
              ) : (
                <ReferenceViewerPanel onClose={() => setMultitaskPanel(null)} />
              );

              return (
                <ResizableSplitLayout
                  editor={editorCard}
                  panel={panelComponent}
                />
              );
            }

            return editorCard;
          })()}

          {/* Keyboard Shortcuts Panel */}
          <AnimatePresence>
            {isEditing && showShortcuts && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                <Card padding="md" hover={false}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">⌨️</span>
                    <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Keyboard Shortcuts</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">
                    {[
                      ['Ctrl + 1', 'Heading 1'],
                      ['Ctrl + 2', 'Heading 2'],
                      ['Ctrl + 3', 'Heading 3'],
                      ['Ctrl + 0', 'Normal Text'],
                      ['Ctrl + B', 'Bold'],
                      ['Ctrl + I', 'Italic'],
                      ['Ctrl + U', 'Underline'],
                      ['Ctrl + Shift + S', 'Strikethrough'],
                      ['Ctrl + Shift + 7', 'Ordered List'],
                      ['Ctrl + Shift + 8', 'Bullet List'],
                      ['Ctrl + K', 'Insert Link'],
                      ['Ctrl + Z', 'Undo'],
                      ['Ctrl + Y', 'Redo'],
                      ['Tab', 'Indent'],
                      ['Shift + Tab', 'Outdent'],
                    ].map(([key, action]) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[var(--muted-foreground)]">{action}</span>
                        <kbd className="text-[9px] font-mono bg-[var(--card-border)]/50 px-1.5 py-0.5 rounded-md border border-[var(--card-border)] font-semibold whitespace-nowrap">{key}</kbd>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--card-border)]">
                    <h5 className="text-[10px] font-heading font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">💡 StudyQuest Commands</h5>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[var(--muted-foreground)]">AI Topic Comparison</span>
                        <kbd className="text-[9px] font-mono bg-[var(--card-border)]/50 px-1.5 py-0.5 rounded-md border border-[var(--card-border)] font-semibold whitespace-nowrap">/compare Topic A vs Topic B</kbd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[var(--muted-foreground)]">Voice Command Trigger</span>
                        <span className="text-[9px] font-medium text-purple-400">🎙️ Say "compare Topic A versus Topic B"</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Delete confirm */}
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Note">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">This will permanently delete this note. This cannot be undone.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
            <Button variant="coral" onClick={async () => { if (confirmDelete) { await deleteNote(confirmDelete); setConfirmDelete(null); backToList(); toast.success('Note deleted'); } }} className="flex-1">Delete</Button>
          </div>
        </Modal>

        {/* PDF Export Modal */}
        <Modal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)} title="Export as PDF">
          <div className="space-y-5">
            {/* Page Size */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Page Size</label>
              <div className="flex gap-2">
                {([
                  { id: 'a4' as const, label: 'A4', desc: '210 × 297 mm' },
                  { id: 'letter' as const, label: 'Letter', desc: '8.5 × 11 in' },
                  { id: 'legal' as const, label: 'Legal', desc: '8.5 × 14 in' },
                ]).map((opt) => (
                  <button key={opt.id} onClick={() => setPdfPageSize(opt.id)} className={`flex-1 py-3 rounded-xl border-2 text-center transition-all ${pdfPageSize === opt.id ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]' : 'border-[var(--card-border)] hover:border-primary/30'}`}>
                    <span className="text-xs font-bold block">{opt.label}</span>
                    <span className={`text-[9px] block mt-0.5 ${pdfPageSize === opt.id ? 'text-white/70' : 'text-[var(--muted-foreground)]'}`}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Quality */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Image Quality</label>
              <div className="flex gap-2">
                {([
                  { id: 'low' as const, label: 'Low', desc: 'Small file', emoji: '📄' },
                  { id: 'medium' as const, label: 'Medium', desc: 'Balanced', emoji: '📋' },
                  { id: 'high' as const, label: 'High', desc: 'Crystal clear', emoji: '✨' },
                ]).map((opt) => (
                  <button key={opt.id} onClick={() => setPdfQuality(opt.id)} className={`flex-1 py-3 rounded-xl border-2 text-center transition-all ${pdfQuality === opt.id ? 'bg-teal text-white border-teal shadow-[0_3px_0_rgba(16,185,129,0.3)]' : 'border-[var(--card-border)] hover:border-teal/30'}`}>
                    <span className="text-sm block">{opt.emoji}</span>
                    <span className="text-xs font-bold block">{opt.label}</span>
                    <span className={`text-[9px] block mt-0.5 ${pdfQuality === opt.id ? 'text-white/70' : 'text-[var(--muted-foreground)]'}`}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" onClick={() => setShowPdfModal(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={exportPdf} className="flex-1" icon={<HiDownload size={14} />}>Export PDF</Button>
            </div>
          </div>
        </Modal>

        {/* AI Summary Modal */}
        <Modal isOpen={showSummary} onClose={() => setShowSummary(false)} title="AI Summary">
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-primary/5 border-2 border-primary/15 max-h-[400px] overflow-y-auto">
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{summaryText}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(summaryText); toast.success('Summary copied!'); }}>Copy Summary</Button>
          </div>
        </Modal>

        {/* Flashcards Modal */}
        <Modal isOpen={showFlashcards} onClose={() => setShowFlashcards(false)} title={`Flashcards (${cardIndex + 1}/${flashcards.length})`}>
          {flashcards.length > 0 && (
            <div className="space-y-4">
              <motion.div
                className="min-h-[180px] p-6 rounded-2xl border-2 border-[var(--card-border)] flex items-center justify-center cursor-pointer"
                style={{ background: cardFlipped ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(76,201,240,0.1))' : 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(236,72,153,0.1))' }}
                onClick={() => setCardFlipped(!cardFlipped)}
                key={`${cardIndex}-${cardFlipped}`}
                initial={{ rotateY: 90 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-2">{cardFlipped ? 'Answer' : 'Question'}</p>
                  <p className="text-sm font-semibold">{cardFlipped ? flashcards[cardIndex].answer : flashcards[cardIndex].question}</p>
                </div>
              </motion.div>
              <p className="text-[10px] text-center text-[var(--muted-foreground)]">Click card to flip</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setCardIndex(Math.max(0, cardIndex - 1)); setCardFlipped(false); }} disabled={cardIndex === 0} className="flex-1">← Previous</Button>
                <Button variant="primary" size="sm" onClick={() => { setCardIndex(Math.min(flashcards.length - 1, cardIndex + 1)); setCardFlipped(false); }} disabled={cardIndex >= flashcards.length - 1} className="flex-1">Next →</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Diagram Modal */}
        <DiagramModal isOpen={showDiagram} onClose={() => setShowDiagram(false)} onInsert={handleInsertDiagram} />

        {/* Quiz Modal */}
        {selectedNote && (
          <QuizModal
            isOpen={showQuiz}
            onClose={() => setShowQuiz(false)}
            noteTitle={selectedNote.title}
            noteContent={selectedNote.content}
          />
        )}

        {/* Markdown / README Import & Edit Modal */}
        <Modal isOpen={showMarkdownImport} onClose={() => { setShowMarkdownImport(false); setMarkdownInput(''); setIsEditingMarkdown(false); }} title={isEditingMarkdown ? 'Edit Markdown Source' : 'Import Markdown / README'}>
          <div className="space-y-4">
            <p className="text-xs text-[var(--muted-foreground)]">
              {isEditingMarkdown
                ? 'Edit the raw Markdown source below. Mermaid diagrams (```mermaid) will be re-rendered. This will replace the entire note content.'
                : 'Paste raw Markdown or README.md content below. It will be converted to rich text and appended to this note. Mermaid diagrams (```mermaid) will be rendered as visual diagrams.'}
            </p>
            <textarea
              value={markdownInput}
              onChange={(e) => setMarkdownInput(e.target.value)}
              placeholder={`# My README\n\nPaste your markdown here...\n\n## Features\n- Feature 1\n- Feature 2\n\n\`\`\`mermaid\ngraph TD\n  A[Start] --> B[Process]\n  B --> C{Decision}\n  C -->|Yes| D[Done]\n\`\`\`\n\n\`\`\`js\nconsole.log("Hello!");\n\`\`\``}
              className="w-full h-80 p-4 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-mono focus:border-primary focus:outline-none transition-colors resize-y"
            />
            {isEditingMarkdown && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <HiLightningBolt className="text-amber-500 flex-shrink-0" size={14} />
                <p className="text-[10px] text-amber-500 font-semibold">This will replace the entire note content with the re-rendered markdown.</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setShowMarkdownImport(false); setMarkdownInput(''); setIsEditingMarkdown(false); }} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleMarkdownImport} className="flex-1" icon={<HiDocumentText size={14} />} disabled={!markdownInput.trim()}>
                {isEditingMarkdown ? 'Update & Render' : 'Import & Render'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* AI Beautify Preview Modal */}
        <Modal isOpen={showBeautifyPreview} onClose={() => { setShowBeautifyPreview(false); setBeautifyResult(''); setBeautifyBeforeHtml(''); setBeautifySelectionRange(null); }} title="✨ Beautify Preview">
          <div className="space-y-4">
            <p className="text-xs text-[var(--muted-foreground)]">
              {beautifySelectionRange 
                ? 'Review the formatted version of your selected text below. Only the highlighted selection will be updated.'
                : 'Review the formatted version below. All your content has been preserved — only the formatting has been improved using Quill-native styles (headers, bold, bullets, tables).'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Before */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1.5">📄 Before</span>
                <div className="p-3 rounded-xl border-2 border-[var(--card-border)] max-h-[300px] overflow-y-auto bg-red-500/5">
                  <div className="prose prose-sm max-w-none dark:prose-invert text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: beautifyBeforeHtml }} />
                </div>
              </div>
              {/* After */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal block mb-1.5">✨ After</span>
                <div className="p-3 rounded-xl border-2 border-teal/30 max-h-[300px] overflow-y-auto bg-teal/5">
                  <div className="prose prose-sm max-w-none dark:prose-invert text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: beautifyResult }} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <HiLightningBolt className="text-amber-500 flex-shrink-0" size={14} />
              <p className="text-[10px] text-amber-500 font-semibold">
                {beautifySelectionRange 
                  ? 'This will replace only the selected text range in your editor. The rest of the note remains untouched.' 
                  : 'This will replace the current note formatting. The content itself is preserved.'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setShowBeautifyPreview(false); setBeautifyResult(''); setBeautifyBeforeHtml(''); setBeautifySelectionRange(null); }} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={applyBeautify} className="flex-1" icon={<HiSparkles size={14} />}>Apply Beautify</Button>
            </div>
          </div>
        </Modal>

        {/* Math Formula Palette */}
        <MathPalette
          isOpen={showMathPalette}
          onClose={() => {
            setShowMathPalette(false);
            setMathPaletteEditNode(null);
            setMathPaletteEditLatex('');
            setMathPaletteEditIsBlock(false);
          }}
          onInsert={(latex, isBlock) => handleInsertMath(latex, isBlock, mathPaletteEditNode)}
          editLatex={mathPaletteEditLatex}
          editIsBlock={mathPaletteEditIsBlock}
        />

        {/* Share to Group Modal */}
        <Modal isOpen={showShareGroup} onClose={() => setShowShareGroup(false)} title="Share to Group">
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted-foreground)] mb-3">Choose a group to share this note as a resource.</p>
            {groups.map((g) => (
              <ShareToGroupButton key={g.id} groupId={g.id} groupName={g.name} note={selectedNote} onDone={() => setShowShareGroup(false)} />
            ))}
          </div>
        </Modal>
      </PageTransition>
    );
  }

  // ----- Notes List View -----
  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Notes & Scrolls</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Your knowledge base. Write, organize, remember.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<HiPencil size={14} />} onClick={() => window.location.href = '/whiteboard'}>Whiteboard</Button>
            <Button variant="primary" size="sm" icon={<HiPlus />} onClick={() => setShowNewModal(true)}>New Note</Button>
          </div>
        </div>

        <div className="relative">
          <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
          <input type="text" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-medium focus:border-primary focus:outline-none transition-colors" />
        </div>

        {notes.length === 0 && !loading ? (
          <Card padding="lg" hover={false}>
            <div className="text-center py-8">
              <motion.span className="text-5xl block mb-4" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>📝</motion.span>
              <h3 className="text-lg font-heading font-bold mb-2">No notes yet!</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">Create your first note to start your knowledge base.</p>
              <Button variant="primary" icon={<HiPlus />} onClick={() => setShowNewModal(true)}>Create First Note</Button>
            </div>
          </Card>
        ) : (
          Array.from(folders.entries()).map(([folder, folderNotes]) => (
            <div key={folder}>
              <div className="flex items-center gap-2 mb-2">
                <HiFolder className="text-primary" size={16} />
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{folder}</h3>
                <Badge variant="muted" size="sm">{folderNotes.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {folderNotes.map((note, i) => (
                  <motion.div key={note.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card padding="md" className="cursor-pointer group" onClick={() => openNote(note)}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-heading font-bold group-hover:text-primary transition-colors truncate">{note.title}</h4>
                        <HiDocumentText className="text-[var(--muted-foreground)] flex-shrink-0" size={16} />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] line-clamp-3 mb-3">{note.content || 'Empty note...'}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[var(--muted-foreground)] font-semibold"><HiClock className="inline mr-0.5" size={10} />{timeAgo(note.updatedAt)}</span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}

        <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="Create New Note">
          <div className="space-y-4">
            <Input label="Title" placeholder="e.g. Physics Chapter 4 Notes" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Input label="Folder" placeholder="e.g. Physics, General" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} icon={<HiFolder size={16} />} />
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowNewModal(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleCreate} className="flex-1">Create</Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

// Helper component: shares a note to a specific group's resources
function ShareToGroupButton({ groupId, groupName, note, onDone }: { groupId: string; groupName: string; note: Note | null; onDone: () => void }) {
  const { user, profile } = useAuthContext();
  const { addResource } = useGroupResources(groupId);

  const handleShare = async () => {
    if (!note || !user || !profile) return;
    await addResource({
      groupId,
      title: note.title,
      type: 'note',
      url: '',
      content: note.content,
      addedBy: user.uid,
      addedByName: profile.displayName,
    });
    toast.success(`Shared "${note.title}" to ${groupName}! 📤`);
    onDone();
  };

  return (
    <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 hover:bg-primary/5 transition-all">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm">🏰</div>
      <span className="text-sm font-heading font-bold flex-1 text-left">{groupName}</span>
      <HiShare className="text-[var(--muted-foreground)]" size={16} />
    </button>
  );
}
