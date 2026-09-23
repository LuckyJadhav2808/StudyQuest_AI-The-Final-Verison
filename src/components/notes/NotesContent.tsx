'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  HiPlus, HiTrash, HiPencil, HiSearch,
  HiEye, HiCode, HiDocumentText, HiFolder,
  HiChevronLeft, HiChevronRight, HiClock, HiDownload, HiSparkles,
  HiLightningBolt, HiRefresh, HiInformationCircle, HiShare,
  HiClipboardCopy, HiX, HiReply, HiCheck, HiAcademicCap,
  HiBeaker, HiMicrophone, HiArrowsExpand,
} from 'react-icons/hi';
import QuizModal from '@/components/notes/QuizModal';
import { marked } from 'marked';
import 'react-quill-new/dist/quill.snow.css';
import { autocorrectWord, isMisspelled, getSpellingSuggestions, cleanWord, addToCustomDictionary } from '@/lib/spellcheck';
import { getAutocompleteSuggestions } from '@/data/notesAutocompleteDataset';
import { callAiCompletion, resolveOpenRouterKey, parseAiJsonResponse } from '@/lib/ai';

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

const getPlainTextPreview = (html: string): string => {
  if (!html) return 'Empty note...';
  try {
    const clean = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    return clean || 'Empty note...';
  } catch {
    return 'Empty note...';
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
import { useNotesAutosave } from '@/hooks/useNotesAutosave';
import { sanitizeNoteHtml, prepareContentForAi, stripHtml } from '@/lib/sanitize';
import { uploadNoteImage } from '@/lib/storage';
import { useGamification } from '@/hooks/useGamification';
import { useAuthContext } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';
import DiagramModal from '@/components/notes/DiagramModal';
import MathPalette from '@/components/notes/MathPalette';
import PdfExportModal from '@/components/notes/modals/PdfExportModal';
import FlashcardsModal from '@/components/notes/modals/FlashcardsModal';
import SummaryModal from '@/components/notes/modals/SummaryModal';
import MarkdownImportModal from '@/components/notes/modals/MarkdownImportModal';
import BeautifyPreviewModal from '@/components/notes/modals/BeautifyPreviewModal';
import AlchemyCauldronModal from '@/components/notes/modals/AlchemyCauldronModal';
import { CreateNoteModal, RenameNoteModal } from '@/components/notes/modals/NoteOrganizeModal';
import NotesCatalogDrawer from '@/components/notes/catalog/NotesCatalogDrawer';
import { YouTubePanel, AITutorPanel, ReferenceViewerPanel, WhiteboardSplitPanel, ResizableSplitLayout } from '@/components/notes/MultitaskPanels';
import { useGroups, useGroupResources } from '@/hooks/useGroups';
import { useSidebar } from '@/context/SidebarContext';
import ExpressiveOwlMascot from '@/components/gamification/ExpressiveOwlMascot';
import { MascotMood } from '@/components/gamification/QuestieMascot';
import { playClick, playSuccess } from '@/lib/sounds';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notes, loading, addNote, updateNote, deleteNote } = useNotes();
  const { awardXP } = useGamification();
  const { profile } = useAuthContext();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [latexConverting, setLatexConverting] = useState(false);
  const [renameNoteObj, setRenameNoteObj] = useState<Note | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [catalogCollapsed, setCatalogCollapsed] = useState<boolean>(false);
  const [isScrollsDrawerOpen, setIsScrollsDrawerOpen] = useState<boolean>(false);
  const { collapsed, focusMode, setFocusMode } = useSidebar();
  const isZenMode = focusMode;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const drawerLeft = focusMode || isMobile ? 0 : collapsed ? 72 : 292;
  const drawerTop = focusMode ? 0 : isMobile ? 56 : 64;

  // Close drawer on Escape key
  useEffect(() => {
    if (!isScrollsDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsScrollsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScrollsDrawerOpen]);

  const toggleZenMode = useCallback(() => {
    setFocusMode(!focusMode);
    if (!focusMode) {
      setIsScrollsDrawerOpen(false);
    }
  }, [focusMode, setFocusMode]);

  // Clean up global focusMode when navigating away
  useEffect(() => {
    return () => {
      setFocusMode(false);
    };
  }, [setFocusMode]);

  // ── Questie Interactive Companion Mascot states (mascot-character-companion) ──
  const [mascotMood, setMascotMood] = useState<MascotMood>('active');
  const [mascotBubble, setMascotBubble] = useState<string | null>('Ready to write some great notes? 🦉');
  const [showMascotBubble, setShowMascotBubble] = useState(false);
  const [mascotSquish, setMascotSquish] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);

  // ── Mana Writing Bar & Alchemy Cauldron states ──
  const [mana, setMana] = useState(0);
  const [wordsWrittenSession, setWordsWrittenSession] = useState(0);
  const [lastWordCount, setLastWordCount] = useState(0);
  const [showCauldron, setShowCauldron] = useState(false);
  const [brewingRecipe, setBrewingRecipe] = useState<'scroll' | 'cards' | null>(null);
  const [brewCountdown, setBrewCountdown] = useState(0);

  // ── Autosave hook with beforeunload and unmount flush ──
  const quillWrapperRef = useRef<HTMLDivElement>(null);
  const actionToolbarRef = useRef<HTMLDivElement>(null);
  const [actionToolbarHeight, setActionToolbarHeight] = useState(0);
  const lastSavedAt = useRef<number>(0);

  const onAutosaveNote = useCallback(async (noteId: string, data: { title: string; content: string }) => {
    await updateNote(noteId, data);
    setSelectedNote((prev) => (prev && prev.id === noteId ? { ...prev, ...data, updatedAt: Date.now() } : prev));
    lastSavedAt.current = Date.now();
  }, [updateNote]);

  const {
    saveStatus,
    setSaveStatus,
    scheduleAutosave,
    flushAutosave,
  } = useNotesAutosave({
    selectedNote,
    onSave: onAutosaveNote,
    debounceMs: 3500,
  });

  // Resize observer to track action toolbar height in real-time
  useEffect(() => {
    if (isEditing && actionToolbarRef.current) {
      if (typeof window === 'undefined') return;
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setActionToolbarHeight(entry.target.clientHeight);
        }
      });
      observer.observe(actionToolbarRef.current);
      return () => observer.disconnect();
    } else {
      setActionToolbarHeight(0);
    }
  }, [isEditing]);

  // Load and save mana/session count state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMana = localStorage.getItem('studyquest_mana');
      if (savedMana) setMana(parseInt(savedMana, 10));
      const savedWords = localStorage.getItem('studyquest_session_words');
      if (savedWords) setWordsWrittenSession(parseInt(savedWords, 10));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studyquest_mana', mana.toString());
    }
  }, [mana]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studyquest_session_words', wordsWrittenSession.toString());
    }
  }, [wordsWrittenSession]);

  const finishBrew = async (recipe: 'scroll' | 'cards') => {
    setAiLoading(true);
    try {
      if (recipe === 'scroll') {
        const result = await callAiCompletion({
          apiKey: profile?.openRouterKey,
          title: 'StudyQuest Mastery Scroll Brewing',
          feature: 'notes',
          max_tokens: 1500,
          messages: [
            {
              role: 'system',
              content:
                'You are a grand wizard alchemist. Summarize the user note content into a visually gorgeous, comprehensive "Mastery Scroll" revision guide. Use markdown tables, bold key points, bullet groups, and clear section dividers. Wrap the final output inside clean HTML (do not include markdown ticks like ```html).'
            },
            { role: 'user', content: prepareContentForAi(editContent, 4000) }
          ],
        });

        if (!result.success || !result.content) {
          throw new Error(result.error || 'Could not brew mastery scroll.');
        }

        const scrollHtml = sanitizeNoteHtml(result.content);

        const newId = await addNote({
          title: `${editTitle} - Mastery Scroll 📜`,
          content: scrollHtml,
          folder: selectedNote?.folder || 'General',
          tags: ['Mastery Scroll', 'Alchemy']
        });

        await awardXP(25, 'Brewed Mastery Scroll');
        toast.success('Successfully transmuted note into a Mastery Scroll! +25 XP 📜', { icon: '🧪' });
      } else if (recipe === 'cards') {
        await aiFlashcards();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Brewing failed - check OpenRouter key');
    } finally {
      setAiLoading(false);
      setBrewingRecipe(null);
      setShowCauldron(false);
    }
  };

  const startBrewing = (recipe: 'scroll' | 'cards') => {
    const cost = recipe === 'scroll' ? 50 : 30;
    if (mana < cost) {
      toast.error(`Not enough Mana! Requires ${cost} Mana (You have ${mana}). Write more notes to channel Mana!`);
      return;
    }

    setMana(prev => Math.max(0, prev - cost));
    setBrewingRecipe(recipe);
    setBrewCountdown(2);

    const interval = setInterval(() => {
      setBrewCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          finishBrew(recipe);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  // ── Spellcheck & Autocorrect & Autocomplete states for Quill ──
  const quillRef = useRef<any>(null);
  const [autocorrectEnabled, setAutocorrectEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('studyquest_notes_autocorrect_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const autocorrectEnabledRef = useRef(true);
  const [quillSuggestions, setQuillSuggestions] = useState<string[]>([]);
  const [quillAutocomplete, setQuillAutocomplete] = useState<string[]>([]);
  const [quillActiveWord, setQuillActiveWord] = useState('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [quillActiveWordRange, setQuillActiveWordRange] = useState<{ start: number; end: number } | null>(null);
  const [caretPosition, setCaretPosition] = useState<{ top: number; left: number } | null>(null);
  const quillActiveWordRangeRef = useRef<{ start: number; end: number } | null>(null);
  const activeSuggestionIndexRef = useRef(0);
  const quillAutocompleteRef = useRef<string[]>([]);
  const quillSuggestionsRef = useRef<string[]>([]);
  const isReplacingRef = useRef(false);
  const lastSelectionIndexRef = useRef<number | null>(null);
  const quillSuggestionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spellingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordCountDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mascotMoodRef = useRef<MascotMood>('active');

  useEffect(() => { autocorrectEnabledRef.current = autocorrectEnabled; }, [autocorrectEnabled]);
  useEffect(() => { quillAutocompleteRef.current = quillAutocomplete; }, [quillAutocomplete]);
  useEffect(() => { quillSuggestionsRef.current = quillSuggestions; }, [quillSuggestions]);
  useEffect(() => { activeSuggestionIndexRef.current = activeSuggestionIndex; }, [activeSuggestionIndex]);
  useEffect(() => { mascotMoodRef.current = mascotMood; }, [mascotMood]);

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      if (spellingDebounceRef.current) clearTimeout(spellingDebounceRef.current);
      if (wordCountDebounceRef.current) clearTimeout(wordCountDebounceRef.current);
    };
  }, []);

  const performQuillSpellingCheck = useCallback(() => {
    if (isReplacingRef.current || !autocorrectEnabledRef.current) {
      if (!autocorrectEnabledRef.current) {
        setQuillActiveWord('');
        setQuillSuggestions([]);
        setQuillAutocomplete([]);
        setQuillActiveWordRange(null);
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
      setQuillActiveWordRange(null);
      setCaretPosition(null);
      setActiveSuggestionIndex(0);
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
    // Only check if we have a non-empty word of at least 2 characters
    if (!word || !word.trim() || word.trim().length < 2) {
      setQuillActiveWord('');
      setQuillSuggestions([]);
      setQuillAutocomplete([]);
      setQuillActiveWordRange(null);
      setCaretPosition(null);
      setActiveSuggestionIndex(0);
      return;
    }
    const clean = cleanWord(word);

    if (clean.base && clean.base.length >= 2) {
      // 1. Instant Autocomplete Suggestions from vocabulary dataset
      const autoMatches = getAutocompleteSuggestions(clean.base, 4).filter(
        (w) => w.toLowerCase() !== clean.base.toLowerCase()
      );

      // 2. Spellcheck suggestions if misspelled
      const misspelled = isMisspelled(word);
      const suggestions = misspelled ? getSpellingSuggestions(word) : [];

      // Performance guard: if no suggestions match, reset state without triggering layout reflow
      if (autoMatches.length === 0 && suggestions.length === 0) {
        setQuillActiveWord('');
        setQuillSuggestions([]);
        setQuillAutocomplete([]);
        setQuillActiveWordRange(null);
        setCaretPosition(null);
        setActiveSuggestionIndex(0);
        return;
      }

      setQuillActiveWord(word);
      setQuillActiveWordRange({ start, end });
      quillActiveWordRangeRef.current = { start, end };
      setActiveSuggestionIndex(0);
      setQuillAutocomplete(autoMatches);
      setQuillSuggestions(suggestions);

      // Calculate pixel bounds for floating caret popover ONLY when suggestions exist
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
      } catch (e) {
        // Fallback gracefully without throwing
      }
    } else {
      setQuillActiveWord('');
      setQuillSuggestions([]);
      setQuillAutocomplete([]);
      setQuillActiveWordRange(null);
      setCaretPosition(null);
      setActiveSuggestionIndex(0);
    }
  }, []);

  const checkQuillSpelling = useCallback((immediate = false) => {
    if (spellingDebounceRef.current) {
      clearTimeout(spellingDebounceRef.current);
      spellingDebounceRef.current = null;
    }

    if (immediate) {
      performQuillSpellingCheck();
    } else {
      // 160ms debounce: keystrokes fly at full native speed with 0ms lag
      spellingDebounceRef.current = setTimeout(() => {
        performQuillSpellingCheck();
      }, 160);
    }
  }, [performQuillSpellingCheck]);





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
        setQuillAutocomplete([]);
        setQuillActiveWordRange(null);
        setCaretPosition(null);
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
    setQuillAutocomplete([]);
    setQuillActiveWordRange(null);
    setCaretPosition(null);
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

  // Global Escape & shortcut listener (Escape to close drawer/popover/zen, Ctrl+[ to toggle drawer)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (focusMode) {
          setFocusMode(false);
        }
        setIsScrollsDrawerOpen(false);
        setShowAiDropdown(false);
        setShowMoreDropdown(false);
        if (isEditing) {
          setCaretPosition(null);
          setQuillAutocomplete([]);
          setQuillSuggestions([]);
          setQuillActiveWord('');
          setActiveSuggestionIndex(0);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        setIsScrollsDrawerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts, true);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts, true);
  }, [isEditing, focusMode, setFocusMode]);


  // Keydown listener for space and punctuation autocorrect in Quill + Tab autocomplete
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

        const allSuggestions = [
          ...quillAutocompleteRef.current,
          ...quillSuggestionsRef.current,
        ];

        // If autocorrect is disabled, don't intercept suggestions
        if (!autocorrectEnabledRef.current) return;

        // 1. Tab / Shift+Tab: Accept suggestion on Tab or cycle backwards on Shift+Tab
        if (e.key === 'Tab' && allSuggestions.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          if (e.shiftKey) {
            // Shift+Tab: cycle backward
            setActiveSuggestionIndex((prev) => (prev - 1 + allSuggestions.length) % allSuggestions.length);
          } else {
            // Tab: accept currently highlighted suggestion
            const selected = allSuggestions[activeSuggestionIndexRef.current] || allSuggestions[0];
            if (selected) {
              replaceQuillWord(selected);
            }
          }
          return;
        }

        // 2. Escape key: Dismiss floating suggestions popover
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
          // Preserve newline when user hits Enter to trigger autocorrect!
          const appendChar = e.key === 'Enter' ? '\n' : e.key;
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

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

      // Capture phase: ensures we intercept Enter and Tab BEFORE Quill's internal Keyboard module splits the line!
      editorEl.addEventListener('keydown', listener, true);
    };

    setupListener();

    return () => {
      if (editorEl && listener) {
        editorEl.removeEventListener('keydown', listener, true);
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
  const [multitaskPanel, setMultitaskPanel] = useState<'youtube' | 'tutor' | 'reference' | 'whiteboard' | null>(null);

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

  // Unique folders for filter pills
  const uniqueFolders = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => set.add(n.folder || 'General'));
    return Array.from(set).sort();
  }, [notes]);

  // Filter + group
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.folder || '').toLowerCase().includes(q);
      const matchesFolder = selectedFolder === 'all' || (n.folder || 'General') === selectedFolder;
      return matchesSearch && matchesFolder;
    });
  }, [notes, search, selectedFolder]);

  const folders = useMemo(() => {
    const map = new Map<string, Note[]>();
    filteredNotes.forEach((n) => {
      const f = n.folder || 'General';
      const g = map.get(f) || [];
      g.push(n);
      map.set(f, g);
    });
    return map;
  }, [filteredNotes]);


  const handleSave = async () => {
    if (!selectedNote) return;
    setSaveStatus('saving');
    await updateNote(selectedNote.id, { title: editTitle, content: editContent });
    setSelectedNote({ ...selectedNote, title: editTitle, content: editContent, updatedAt: Date.now() });
    lastSavedAt.current = Date.now();
    setSaveStatus('saved');
    setIsEditing(false);
    toast.success('Note saved! 💾');
    playSuccess();

    // Questie celebration reaction
    setMascotMood('celebration');
    setMascotBubble('✨ Saved to your grimoire! Keep leveling up! 🦉');
    setShowMascotBubble(true);
    setTimeout(() => {
      setMascotMood('active');
      setShowMascotBubble(false);
    }, 4000);

    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleMascotClick = () => {
    setMascotSquish(true);
    playClick();
    setTimeout(() => setMascotSquish(false), 260);

    const tips = [
      "Need a summary? Try AI Summarize! 📝",
      "Highlight formulas and click 'Text to LaTeX' to beautify! 📐",
      "Open 🎨 Sketch to draw diagrams and insert them into your notes!",
      "Multitask with YouTube lets you watch lectures side-by-side! 📺",
      "Ask the 🤖 AI Tutor anything about this topic beside your text!",
      "You're in the zone! Protect that flame streak! 🔥",
    ];
    setMascotBubble(tips[Math.floor(Math.random() * tips.length)]);
    setShowMascotBubble((prev) => !prev);
  };


  const handleContentChange = useCallback((content: string) => {
    setEditContent(content);
    scheduleAutosave(content, editTitle);

    // Mascot focus state & typing detection (avoid redundant state dispatches if already focusing)
    if (mascotMoodRef.current !== 'focus') {
      setMascotMood('focus');
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setMascotMood('active');
    }, 2500);

    // Debounce word count, reading time & mana calculation (400ms) to ensure 60fps typing speed
    if (wordCountDebounceRef.current) clearTimeout(wordCountDebounceRef.current);
    wordCountDebounceRef.current = setTimeout(() => {
      const textOnly = content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
      const currentWordCount = textOnly ? textOnly.split(/\s+/).filter(Boolean).length : 0;
      const chars = textOnly.length;
      const mins = Math.max(1, Math.ceil(currentWordCount / 200));
      setWordCount({ words: currentWordCount, chars, readingTime: `${mins} min read` });

      if (lastWordCount > 0) {
        const diff = currentWordCount - lastWordCount;
        if (diff > 0) {
          const newSessionCount = wordsWrittenSession + diff;
          setWordsWrittenSession(newSessionCount);
          setLastWordCount(currentWordCount);

          // Check if we hit a 100-word milestone!
          if (newSessionCount >= 100) {
            const awardMana = Math.floor(newSessionCount / 100) * 10;
            setMana(prev => Math.min(100, prev + awardMana));
            setWordsWrittenSession(newSessionCount % 100);

            // Award XP, Gold, and a random Ingredient!
            awardXP(10, 'Focused Note Writing');
            
            // Random alchemy ingredient
            const ingredients = ['ether_shard', 'dragon_scale', 'phoenix_feather', 'mana_core', 'sun_stone', 'mercury_dew'];
            const randomIng = ingredients[Math.floor(Math.random() * ingredients.length)];
            
            toast.success(`🔮 Mana Infused! +${awardMana} Mana, +10 XP, and found 1x ${randomIng.replace('_', ' ')}!`, {
              icon: '✨',
              duration: 4000
            });

            // Questie milestone speech bubble & celebration
            setMascotMood('celebration');
            setMascotBubble(`🔥 100 words written! Mana infused! Keep going! 🦉`);
            setShowMascotBubble(true);
            playSuccess();
            setTimeout(() => {
              setMascotMood('active');
              setShowMascotBubble(false);
            }, 4500);
          }
        } else {
          setLastWordCount(currentWordCount);
        }
      } else {
        setLastWordCount(currentWordCount);
      }
    }, 400);

    // ── Fast check for compare/slash compare command only if 'compare' exists in text ──
    if (content.includes('compare')) {
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
    }
  }, [editTitle, scheduleAutosave, lastWordCount, wordsWrittenSession, awardXP]);

  // Word count & reading time (state-managed to eliminate synchronous regex on every keypress)
  const [wordCount, setWordCount] = useState<{ words: number; chars: number; readingTime: string }>({
    words: 0,
    chars: 0,
    readingTime: '0 min',
  });

  const openNote = useCallback(async (note: Note) => {
    await flushAutosave();
    setSelectedNote(note);
    setEditContent(note.content);
    setEditTitle(note.title);
    setIsEditing(false);
    setPreview(false);
    setViewMode(false);
    setSaveStatus('idle');
    setIsScrollsDrawerOpen(false);

    // Sync baseline word count
    const text = note.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    const count = text ? text.split(/\s+/).filter(Boolean).length : 0;
    setLastWordCount(count);
    setWordsWrittenSession(0);
    const mins = Math.max(1, Math.ceil(count / 200));
    setWordCount({ words: count, chars: text.length, readingTime: `${mins} min read` });

    // Sync URL without reload
    if (typeof window !== 'undefined') {
      router.replace(`/notes?id=${note.id}`, { scroll: false });
    }
  }, [flushAutosave, router]);

  const backToList = useCallback(async () => {
    await flushAutosave();
    setSelectedNote(null);
    setIsEditing(false);
    setPreview(false);
    setViewMode(false);
    setSaveStatus('idle');
    setIsScrollsDrawerOpen(true);

    if (typeof window !== 'undefined') {
      router.replace('/notes', { scroll: false });
    }
  }, [flushAutosave, router]);

  // Hydrate selectedNote from ?id=... URL query parameter or auto-select latest note
  const noteIdParam = searchParams.get('id');
  const hasHydratedUrlRef = useRef(false);
  useEffect(() => {
    if (loading || notes.length === 0) return;
    if (!hasHydratedUrlRef.current) {
      hasHydratedUrlRef.current = true;
      if (noteIdParam) {
        const target = notes.find((n) => n.id === noteIdParam);
        if (target) {
          openNote(target);
          return;
        }
      }
      if (!selectedNote) {
        openNote(notes[0]);
      }
    }
  }, [noteIdParam, loading, notes, selectedNote, openNote]);

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

  // Insert diagram image into note content
  const handleInsertDiagram = (dataUrl: string) => {
    const imgTag = `<p><img src="${dataUrl}" alt="Flowchart Diagram" style="max-width:100%;height:auto;border-radius:12px;margin:12px 0;display:block;box-shadow:0 4px 16px rgba(0,0,0,0.08);" /></p><p><br></p>`;
    
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      const index = range ? range.index : quill.getLength() - 1;
      quill.clipboard.dangerouslyPasteHTML(index, imgTag);
      const newContent = quill.root.innerHTML;
      setEditContent(newContent);
      try {
        quill.setSelection(index + 2, 0);
      } catch {}
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

    setAiLoading(true);
    try {
      const cleanContent = prepareContentForAi(selectedNote.content, 4000);
      const result = await callAiCompletion({
        apiKey: profile?.openRouterKey,
        title: 'StudyQuest Note Summarizer',
        feature: 'notes',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: 'You are a study assistant. Summarize the following notes concisely into key points with bullet points. Keep it focused and useful for revision.' },
          { role: 'user', content: cleanContent }
        ],
      });

      if (result.success && result.content) {
        setSummaryText(result.content);
        setShowSummary(true);
        toast.success('Summary generated! ✨');
      } else {
        toast.error(result.error || 'Failed to summarize');
      }
    } catch { toast.error('Failed to summarize'); }
    finally { setAiLoading(false); }
  };

  // =================== AI FLASHCARDS ===================
  const aiFlashcards = async () => {
    if (!selectedNote?.content) { toast.error('Nothing to create flashcards from'); return; }

    setAiLoading(true);
    try {
      const cleanContent = prepareContentForAi(selectedNote.content, 4000);
      const result = await callAiCompletion({
        apiKey: profile?.openRouterKey,
        title: 'StudyQuest Flashcard Generator',
        feature: 'notes',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: 'Create 5-8 flashcards from the following notes. Return ONLY valid JSON array with objects having "question" and "answer" fields. No markdown, no explanation, just JSON.' },
          { role: 'user', content: cleanContent }
        ],
      });

      if (result.success && result.content) {
        const cards = parseAiJsonResponse<Flashcard[]>(result.content);
        if (Array.isArray(cards) && cards.length > 0) {
          setFlashcards(cards);
          setCardIndex(0);
          setCardFlipped(false);
          setShowFlashcards(true);
          toast.success(`${cards.length} flashcards created! 🃏`);
        } else {
          toast.error('Could not parse flashcards');
        }
      } else {
        toast.error(result.error || 'Failed to generate flashcards');
      }
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

      const result = await callAiCompletion({
        apiKey: profile?.openRouterKey,
        title: 'StudyQuest AI Note Beautifier',
        feature: 'notes',
        max_tokens: 4096,
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
      });

      if (!result.success || !result.content) {
        throw new Error(result.error || 'Could not beautify notes');
      }

      let resultHtml = result.content;
      resultHtml = resultHtml.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

      if (resultHtml) {
        // Restore images
        let finalResult = resultHtml;
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
          if (!regex.test(resultHtml)) {
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
    toast.loading(`Generating comparison: ${topicA} vs ${topicB}...`, { id: 'compare' });

    try {
      const result = await callAiCompletion({
        apiKey: profile?.openRouterKey,
        title: 'StudyQuest Note Comparison Generator',
        feature: 'notes',
        max_tokens: 2048,
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
      });

      if (!result.success || !result.content) {
        throw new Error(result.error || 'Could not generate comparison card');
      }

      let tableHtml = result.content;
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

  const handleConvertSelectionToLaTeX = async () => {
    if (!selectedText.trim()) {
      toast.error('Highlight a plain-text formula (e.g. x^2 + y^2 = 3) in your notes first! 📝');
      return;
    }

    setLatexConverting(true);
    const toastId = toast.loading('Converting text to LaTeX formula...');

    try {
      const result = await callAiCompletion({
        apiKey: profile?.openRouterKey,
        title: 'StudyQuest Text to LaTeX Converter',
        feature: 'notes',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Convert the following plain-text or handwritten-style math expression into clean LaTeX code. Output ONLY the raw LaTeX string. Do not wrap in markdown, code blocks, or delimiters like $ or $$. Here is the math expression:\n\n${selectedText}`
          }
        ]
      });

      const latex = result.content?.trim();
      if (latex) {
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection();
          if (range && range.length > 0) {
            // Replace the highlighted text with the math embed
            quill.deleteText(range.index, range.length);
            quill.insertEmbed(range.index, 'math', { latex, isBlock: false });
            quill.insertText(range.index + 1, ' ');
            setEditContent(quill.root.innerHTML);
            toast.success('Converted to LaTeX! 🧮', { id: toastId });
          } else {
            // Fallback: insert it at the current index
            const index = quill.getLength() - 1;
            quill.insertEmbed(index, 'math', { latex, isBlock: false });
            setEditContent(quill.root.innerHTML);
            toast.success('Converted to LaTeX! 🧮', { id: toastId });
          }
        }
      } else {
        toast.error('Could not translate to LaTeX.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('LaTeX conversion failed.', { id: toastId });
    } finally {
      setLatexConverting(false);
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

  return (
    <PageTransition className="h-full flex flex-col min-h-0">
      <div className="w-full h-full flex flex-col min-h-0 space-y-2 relative">
        {/* ═══ Off-Canvas Slide-Out Scrolls Drawer ═══ */}
        <NotesCatalogDrawer
          isOpen={isScrollsDrawerOpen}
          onClose={() => setIsScrollsDrawerOpen(false)}
          notes={notes}
          selectedNoteId={selectedNote?.id || null}
          onSelectNote={(note) => {
            openNote(note);
            setIsScrollsDrawerOpen(false);
          }}
          onNewNote={() => {
            setShowNewModal(true);
            setIsScrollsDrawerOpen(false);
          }}
          onRenameNote={(note) => setRenameNoteObj(note)}
          loading={loading}
        />

        {/* ═══ Workspace Detail Area (100% Full-Width) ═══ */}
        <div className="flex-1 min-h-0 w-full flex flex-col space-y-2">
          {selectedNote ? (
            <div className="flex flex-col h-full min-h-0 space-y-2 w-full flex-1">
              {/* ═══ Executive Consolidated Header ═══ */}
              <div className="card-glass rounded-2xl border-2 border-[var(--card-border)] p-2 px-3 flex items-center justify-between gap-3 shadow-sm min-w-0 shrink-0">
                {/* Left: Nav, Title & Save Status (Bounded & Truncated) */}
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                  {/* Executive Scrolls Switcher / Drawer Trigger */}
                  <button
                    onClick={() => setIsScrollsDrawerOpen((prev) => !prev)}
                    className="px-2.5 py-1.5 rounded-xl border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary transition-all text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95 cursor-pointer"
                    title="Open Scrolls Catalog (Ctrl + [)"
                  >
                    <span className="text-sm">📜</span>
                    <span className="hidden sm:inline font-heading font-black">Scrolls</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/25 text-primary">
                      {notes.length}
                    </span>
                    <span className="text-[10px]">▾</span>
                  </button>

                  {/* Quick New Scroll button */}
                  <button
                    onClick={() => setShowNewModal(true)}
                    className="p-1.5 rounded-xl border border-[var(--card-border)] hover:border-primary/40 text-[var(--muted-foreground)] hover:text-primary transition-colors shrink-0 cursor-pointer"
                    title="Forge New Scroll"
                  >
                    <HiPlus size={15} />
                  </button>

                    <Badge variant="primary" size="sm" className="hidden sm:inline-flex shrink-0">
                      {selectedNote.folder || 'General'}
                    </Badge>

                    {/* Inline Title Input */}
                    <div className="min-w-0 flex-1 max-w-xs md:max-w-sm">
                      {isEditing ? (
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full text-base sm:text-lg font-heading font-bold bg-transparent border-b border-dashed border-[var(--card-border)] focus:border-primary outline-none px-1 py-0.5 text-[var(--foreground)] transition-colors truncate"
                          placeholder="Note title..."
                        />
                      ) : (
                        <h1 className="text-base sm:text-lg font-heading font-bold text-[var(--foreground)] truncate">
                          {selectedNote.title}
                        </h1>
                      )}
                    </div>

                    {/* Save indicator */}
                    {isEditing && saveStatus !== 'idle' && (
                      <span className={`text-[10px] font-bold flex items-center gap-1 shrink-0 ${saveStatus === 'saving' ? 'text-amber-400' : 'text-teal-400'}`}>
                        {saveStatus === 'saving' ? <HiRefresh className="animate-spin" size={11} /> : <HiCheck size={11} />}
                        <span className="hidden md:inline">{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
                      </span>
                    )}
                  </div>

                  {/* Center: Multitask Segmented Glass Dock (Responsive & Bounded) */}
                  <div className="hidden md:flex items-center gap-1 p-1 bg-slate-900/70 dark:bg-slate-950/80 border border-[var(--card-border)] rounded-xl shadow-inner shrink-0 z-10">
                    <button
                      type="button"
                      onClick={() => {
                        const next = multitaskPanel === 'youtube' ? null : 'youtube';
                        setMultitaskPanel(next);
                        if (next) setCatalogCollapsed(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        multitaskPanel === 'youtube'
                          ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                          : 'text-[var(--muted-foreground)] hover:text-white hover:bg-white/5'
                      }`}
                      title="YouTube Lecture side-by-side"
                    >
                      <span>📺</span>
                      <span className="hidden xl:inline">YouTube</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = multitaskPanel === 'tutor' ? null : 'tutor';
                        setMultitaskPanel(next);
                        if (next) setCatalogCollapsed(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        multitaskPanel === 'tutor'
                          ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                          : 'text-[var(--muted-foreground)] hover:text-white hover:bg-white/5'
                      }`}
                      title="AI Tutor side-by-side"
                    >
                      <span>🤖</span>
                      <span className="hidden xl:inline">AI Tutor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = multitaskPanel === 'reference' ? null : 'reference';
                        setMultitaskPanel(next);
                        if (next) setCatalogCollapsed(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        multitaskPanel === 'reference'
                          ? 'bg-teal-500 text-white shadow-[0_0_12px_rgba(20,184,166,0.4)]'
                          : 'text-[var(--muted-foreground)] hover:text-white hover:bg-white/5'
                      }`}
                      title="Reference Document/PDF side-by-side"
                    >
                      <span>📄</span>
                      <span className="hidden xl:inline">Reference</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = multitaskPanel === 'whiteboard' ? null : 'whiteboard';
                        setMultitaskPanel(next);
                        if (next) setCatalogCollapsed(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        multitaskPanel === 'whiteboard'
                          ? 'bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                          : 'text-[var(--muted-foreground)] hover:text-white hover:bg-white/5'
                      }`}
                      title="Whiteboard Sketch side-by-side"
                    >
                      <span>🎨</span>
                      <span className="hidden xl:inline">Sketch</span>
                    </button>
                  </div>

                  {/* Right: Actions, AI Suite, Zen & Questie Companion */}
                  <div className="flex items-center gap-1.5 shrink-0 justify-end">
                    {/* AI Suite Popover Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAiDropdown((prev) => !prev)}
                        className="px-2.5 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1 transition-all"
                        title="AI Power Tools"
                      >
                        <HiSparkles size={14} />
                        <span className="hidden sm:inline">AI Suite</span>
                        <span className="text-[10px]">▾</span>
                      </button>

                      {showAiDropdown && (
                        <div className="absolute right-0 top-10 z-40 w-48 py-1.5 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl backdrop-blur-xl">
                          <button
                            onClick={() => { setShowAiDropdown(false); aiSummarize(); }}
                            className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary/15 text-[var(--foreground)] flex items-center gap-2 transition-colors font-medium"
                          >
                            <span>📝</span> AI Summarize
                          </button>
                          <button
                            onClick={() => { setShowAiDropdown(false); aiFlashcards(); }}
                            className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary/15 text-[var(--foreground)] flex items-center gap-2 transition-colors font-medium"
                          >
                            <span>⚡</span> AI Flashcards
                          </button>
                          <button
                            onClick={() => { setShowAiDropdown(false); setShowQuiz(true); }}
                            className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary/15 text-[var(--foreground)] flex items-center gap-2 transition-colors font-medium"
                          >
                            <span>🎓</span> Quiz Me
                          </button>
                          <button
                            onClick={() => { setShowAiDropdown(false); aiBeautify(); }}
                            className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary/15 text-[var(--foreground)] flex items-center gap-2 transition-colors font-medium"
                          >
                            <span>✨</span> AI Beautify
                          </button>
                          <button
                            onClick={() => { setShowAiDropdown(false); setShowMathPalette(true); }}
                            className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary/15 text-[var(--foreground)] flex items-center gap-2 transition-colors font-medium"
                          >
                            <span>∑</span> Math Palette
                          </button>
                          <button
                            onClick={() => { setShowAiDropdown(false); setShowDiagram(true); }}
                            className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary/15 text-[var(--foreground)] flex items-center gap-2 transition-colors font-medium"
                          >
                            <span>📐</span> Insert Diagram
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mode switcher: View vs Edit */}
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          variant={viewMode ? "teal" : "ghost"}
                          size="sm"
                          icon={<HiEye size={13} />}
                          onClick={() => setViewMode(!viewMode)}
                        >
                          {viewMode ? 'Reading' : 'View'}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<HiPencil size={13} />}
                          onClick={() => { setIsEditing(true); setViewMode(false); }}
                        >
                          Edit
                        </Button>
                      </div>
                    )}

                    {/* Zen Full-Width Button */}
                    <button
                      type="button"
                      onClick={toggleZenMode}
                      className={`p-1.5 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                        isZenMode
                          ? 'border-purple-500 bg-purple-500/25 text-purple-300 ring-2 ring-purple-500/40 shadow-md shadow-purple-500/20'
                          : 'border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-white hover:border-primary/40'
                      }`}
                      title={isZenMode ? "Exit Zen Focus Mode (Esc)" : "Zen Focus Mode (Hide sidebar & headers)"}
                    >
                      <HiArrowsExpand size={15} className={isZenMode ? 'rotate-45 text-purple-400' : ''} />
                    </button>

                    {/* Interactive Questie Mascot Companion */}
                    <div className="relative flex items-center">
                      <button
                        type="button"
                        onClick={handleMascotClick}
                        className="relative p-1 rounded-full hover:bg-primary/10 transition-transform active:scale-95 cursor-pointer flex items-center justify-center"
                        title="Click Questie for companion wisdom & cheer! 🦉"
                      >
                        <ExpressiveOwlMascot size={32} mood={mascotMood} isSquishing={mascotSquish} />
                        {mascotMood === 'focus' && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[var(--card-bg)] animate-pulse" />
                        )}
                        {mascotMood === 'celebration' && (
                          <span className="absolute -top-1 -right-1 text-xs animate-bounce">✨</span>
                        )}
                      </button>

                      <AnimatePresence>
                        {showMascotBubble && mascotBubble && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 10 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                            className="absolute right-0 top-11 z-50 p-3 rounded-2xl bg-[var(--card-bg)] border-2 border-primary/30 shadow-2xl backdrop-blur-xl w-64 text-left"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Questie says:</span>
                              <button onClick={() => setShowMascotBubble(false)} className="text-[var(--muted-foreground)] hover:text-white p-0.5"><HiX size={12} /></button>
                            </div>
                            <p className="text-xs font-semibold text-[var(--foreground)] leading-snug">{mascotBubble}</p>
                            <div className="mt-2.5 pt-2 border-t border-[var(--card-border)]/60 flex items-center justify-between text-[10px]">
                              <button onClick={() => { setShowMascotBubble(false); aiSummarize(); }} className="text-primary hover:underline font-bold">✨ Summarize</button>
                              <button onClick={() => { setShowMascotBubble(false); aiFlashcards(); }} className="text-amber-400 hover:underline font-bold">⚡ Flashcards</button>
                              <button onClick={() => { setShowMascotBubble(false); setMultitaskPanel('tutor'); }} className="text-indigo-400 hover:underline font-bold">🤖 AI Tutor</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* More Options Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowMoreDropdown((prev) => !prev)}
                        className="p-1.5 rounded-xl border border-[var(--card-border)] hover:border-primary/40 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                        title="More options"
                      >
                        <span className="text-xs font-bold">⋯</span>
                      </button>

                      {showMoreDropdown && (
                        <div className="absolute right-0 top-9 z-40 w-48 py-1.5 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl backdrop-blur-xl">
                          {/* Mobile-only Multitask quick options */}
                          <div className="md:hidden pb-1 border-b border-[var(--card-border)] mb-1">
                            <span className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">Multitask Panels</span>
                            <button
                              onClick={() => { setShowMoreDropdown(false); setMultitaskPanel('youtube'); }}
                              className="w-full px-3 py-1.5 text-xs text-left hover:bg-rose-500/15 text-[var(--foreground)] flex items-center gap-2 transition-colors"
                            >
                              <span>📺</span> YouTube Lecture
                            </button>
                            <button
                              onClick={() => { setShowMoreDropdown(false); setMultitaskPanel('tutor'); }}
                              className="w-full px-3 py-1.5 text-xs text-left hover:bg-indigo-500/15 text-[var(--foreground)] flex items-center gap-2 transition-colors"
                            >
                              <span>🤖</span> AI Tutor
                            </button>
                            <button
                              onClick={() => { setShowMoreDropdown(false); setMultitaskPanel('reference'); }}
                              className="w-full px-3 py-1.5 text-xs text-left hover:bg-teal-500/15 text-[var(--foreground)] flex items-center gap-2 transition-colors"
                            >
                              <span>📄</span> Reference Document
                            </button>
                            <button
                              onClick={() => { setShowMoreDropdown(false); setMultitaskPanel('whiteboard'); }}
                              className="w-full px-3 py-1.5 text-xs text-left hover:bg-purple-500/15 text-[var(--foreground)] flex items-center gap-2 transition-colors"
                            >
                              <span>🎨</span> Whiteboard Sketch
                            </button>
                          </div>
                          <button
                            onClick={() => { setShowMoreDropdown(false); setShowPdfModal(true); }}
                            className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary/15 text-[var(--foreground)] flex items-center gap-2 transition-colors"
                          >
                            <HiDownload size={14} /> Export PDF
                          </button>
                          <button
                            onClick={() => { setShowMoreDropdown(false); setIsEditingMarkdown(false); setMarkdownInput(''); setShowMarkdownImport(true); }}
                            className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary/15 text-[var(--foreground)] flex items-center gap-2 transition-colors"
                          >
                            <HiClipboardCopy size={14} /> Import Markdown
                          </button>
                          {selectedNote?.markdownSource && (
                            <button
                              onClick={() => { setShowMoreDropdown(false); setIsEditingMarkdown(true); setMarkdownInput(selectedNote.markdownSource || ''); setShowMarkdownImport(true); }}
                              className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary/15 text-[var(--foreground)] flex items-center gap-2 transition-colors"
                            >
                              <HiCode size={14} /> Edit MD Source
                            </button>
                          )}
                          <div className="h-[1px] bg-[var(--card-border)] my-1" />
                          <button
                            onClick={() => { setShowMoreDropdown(false); setConfirmDelete(selectedNote.id); }}
                            className="w-full px-3 py-1.5 text-xs text-left hover:bg-red-500/15 text-red-400 flex items-center gap-2 transition-colors"
                          >
                            <HiTrash size={14} /> Delete Note
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ═══ Workstation Main Body (Editor & Split Panels) ═══ */}
                {(() => {
                  const editorCard = (
                    <div ref={noteRef} className="flex flex-col h-full min-h-0 relative overflow-hidden">
                      {isEditing ? (
                        <>
                          {/* Pinned Action Bar at top of editor */}
                          <div
                            ref={actionToolbarRef}
                            className="notes-action-toolbar flex items-center justify-between flex-wrap gap-2 p-2 px-3 bg-[var(--card-bg)] border-b border-[var(--card-border)] z-25 flex-shrink-0"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                <button onClick={handleUndo} className="p-1.5 rounded-lg border border-[var(--card-border)] hover:border-primary/40 text-[var(--foreground)] transition-colors" title="Undo (Ctrl+Z)">
                                  <HiReply size={14} />
                                </button>
                                <button onClick={handleRedo} className="p-1.5 rounded-lg border border-[var(--card-border)] hover:border-primary/40 text-[var(--foreground)] transition-colors" title="Redo (Ctrl+Y)">
                                  <HiReply size={14} className="scale-x-[-1]" />
                                </button>
                              </div>

                              <div className="h-4 w-[1px] bg-[var(--card-border)] mx-1" />

                              <Button
                                variant={isListening ? "coral" : "ghost"}
                                size="sm"
                                icon={<HiMicrophone size={13} className={isListening ? "animate-pulse text-white" : "text-primary"} />}
                                onClick={toggleListening}
                                title="Voice Dictation"
                              >
                                {isListening ? 'Listening...' : 'Dictate'}
                              </Button>

                              <Button variant="ghost" size="sm" onClick={() => setShowMathPalette(true)}>∑ Math</Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<HiSparkles size={12} />}
                                onClick={handleConvertSelectionToLaTeX}
                                loading={latexConverting}
                                title="Convert selected text formula into LaTeX"
                              >
                                Text to LaTeX
                              </Button>

                              {/* Autocorrect & Autocomplete Tool Toggle */}
                              <button
                                type="button"
                                onClick={() => {
                                  const nextState = !autocorrectEnabled;
                                  setAutocorrectEnabled(nextState);
                                  if (typeof window !== 'undefined') {
                                    localStorage.setItem('studyquest_notes_autocorrect_enabled', String(nextState));
                                  }
                                  if (!nextState) {
                                    setCaretPosition(null);
                                    setQuillAutocomplete([]);
                                    setQuillSuggestions([]);
                                    setQuillActiveWord('');
                                    setActiveSuggestionIndex(0);
                                    toast('🪄 Autocorrect & Autocomplete: OFF', { icon: '🔕' });
                                  } else {
                                    toast.success('🪄 Autocorrect & Autocomplete: ON', { icon: '✨' });
                                  }
                                }}
                                className={`px-2 py-1 rounded-lg border transition-all text-xs font-bold flex items-center gap-1 cursor-pointer select-none ${
                                  autocorrectEnabled
                                    ? 'border-teal-500/50 bg-teal-500/15 text-teal-400'
                                    : 'border-[var(--card-border)] text-[var(--muted-foreground)] opacity-70 hover:opacity-100'
                                }`}
                                title="Toggle Autocorrect & Autocomplete"
                              >
                                <span>{autocorrectEnabled ? '🪄' : '🪄⃠'}</span>
                                <span className="hidden sm:inline text-[10px]">{autocorrectEnabled ? 'Spell: ON' : 'Spell: OFF'}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setShowShortcuts(!showShortcuts)}
                                className="p-1.5 rounded-lg border border-[var(--card-border)] hover:border-primary/40 text-[var(--muted-foreground)] hover:text-white transition-colors text-xs flex items-center gap-1"
                                title="Keyboard Shortcuts"
                              >
                                <span>⌨️</span>
                              </button>
                            </div>
                          </div>

                          {/* Quill Editor Component */}
                          <div className="quill-wrapper relative flex-1 min-h-0 flex flex-col" ref={quillWrapperRef}>
                            {/* Floating Caret Popover for Autocomplete & Spellcheck */}
                            <AnimatePresence>
                              {autocorrectEnabled && (quillAutocomplete.length > 0 || quillSuggestions.length > 0) && caretPosition && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                  transition={{ duration: 0.12 }}
                                  style={{
                                    position: 'absolute',
                                    top: `${Math.max(10, caretPosition.top - 8)}px`,
                                    left: `${Math.max(16, caretPosition.left)}px`,
                                    zIndex: 40,
                                  }}
                                  className="floating-caret-popover flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 border border-purple-500/40 shadow-2xl backdrop-blur-xl text-slate-100 font-sans text-xs max-w-sm pointer-events-auto"
                                >
                                  {quillSuggestions.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 px-1 border-b border-rose-500/20 pb-1">
                                      <span>⚠️ Possible misspelling:</span>
                                      <span className="font-mono underline text-slate-200">{quillActiveWord}</span>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap items-center gap-1 max-h-32 overflow-y-auto">
                                    {(quillSuggestions.length > 0 ? quillSuggestions : quillAutocomplete).slice(0, 5).map((suggestion, idx) => {
                                      const isFocused = idx === activeSuggestionIndex;
                                      return (
                                        <button
                                          key={`sugg-${suggestion}-${idx}`}
                                          type="button"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            replaceQuillWord(suggestion);
                                          }}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                                            isFocused
                                              ? 'bg-purple-600 text-white shadow-md scale-105 ring-1 ring-purple-400'
                                              : 'bg-slate-800/80 hover:bg-purple-700/60 text-slate-200'
                                          }`}
                                        >
                                          <span>{suggestion}</span>
                                          {isFocused && (
                                            <kbd className="ml-1 px-1 py-0.2 text-[8px] bg-purple-400 text-slate-950 font-bold rounded font-mono">
                                              ↵
                                            </kbd>
                                          )}
                                        </button>
                                      );
                                    })}

                                    {quillSuggestions.length > 0 && (
                                      <button
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          addQuillWordToDictionary(quillActiveWord);
                                        }}
                                        className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-purple-300 font-semibold transition-colors cursor-pointer"
                                      >
                                        + Add word
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <ReactQuill
                              key={selectedNote?.id || 'new'}
                              ref={quillRef}
                              theme="snow"
                              defaultValue={sanitizeHtmlForQuill(selectedNote?.content || '')}
                              onChange={handleContentChange}
                              onChangeSelection={(range: any, source: any, editor: any) => {
                                if (range) {
                                  if (range.length > 0) {
                                    setSelectedText(editor.getText(range.index, range.length));
                                  } else {
                                    setSelectedText('');
                                  }
                                }
                              }}
                              modules={QUILL_MODULES}
                              formats={QUILL_FORMATS}
                              placeholder="Start typing your study notes here... 💡 Hint: Type '/compare Topic A vs Topic B' and press Enter to compare concepts!"
                              preserveWhitespace={true}
                              useSemanticHTML={false}
                            />
                          </div>

                          {/* Editor Stats Footer */}
                          <div className="bg-[var(--card-bg)] border-t border-[var(--card-border)] px-4 py-2 text-[11px] text-[var(--muted-foreground)] flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-mono font-bold text-[var(--foreground)]">{wordCount.words} words</span>
                              <span>•</span>
                              <span className="font-mono">{wordCount.chars} chars</span>
                              <span>•</span>
                              <span>{wordCount.readingTime}</span>

                              {/* Autocomplete chips */}
                              {autocorrectEnabled && quillAutocomplete.length > 0 && (
                                <div className="flex items-center gap-1 ml-2 bg-teal-500/10 px-2.5 py-0.5 rounded-lg border border-teal-500/30">
                                  <span className="text-teal-400 text-[10px] font-bold">✨ Autocomplete:</span>
                                  {quillAutocomplete.slice(0, 3).map((word, idx) => (
                                    <button
                                      key={`chip-${word}-${idx}`}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        replaceQuillWord(word);
                                      }}
                                      className="text-teal-200 hover:text-white px-1.5 py-0.5 rounded text-[10px] font-mono font-bold hover:bg-teal-500/30 transition-colors cursor-pointer"
                                    >
                                      {word}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Mana progress strip */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs">🔮</span>
                              <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                                  animate={{ width: `${wordsWrittenSession}%` }}
                                  transition={{ type: 'spring', stiffness: 80 }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-purple-400">{wordsWrittenSession}% Mana</span>
                            </div>
                          </div>
                        </>
                      ) : viewMode ? (
                        /* ===== Reading View Mode ===== */
                        <div className="p-8 md:p-12 overflow-y-auto h-full max-w-3xl mx-auto w-full">
                          <h1 className="text-3xl font-heading font-black mb-2 text-[var(--foreground)]">{selectedNote.title}</h1>
                          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--card-border)]">
                            <Badge variant="primary" size="sm">{selectedNote.folder || 'General'}</Badge>
                            <span className="text-xs text-[var(--muted-foreground)] font-mono">
                              <HiClock className="inline mr-1" size={12} />{timeAgo(selectedNote.updatedAt)}
                            </span>
                          </div>
                          {selectedNote.content && selectedNote.content !== '<p><br></p>' ? (
                            <div
                              className="prose prose-lg max-w-none dark:prose-invert leading-relaxed studyquest-markdown"
                              dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(renderedViewContent || selectedNote.content) }}
                            />
                          ) : (
                            <p className="text-sm text-[var(--muted-foreground)] italic">This note is currently empty.</p>
                          )}
                        </div>
                      ) : (
                        /* ===== Default Preview Mode ===== */
                        <div className="p-6 md:p-8 overflow-y-auto h-full flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--card-border)]">
                              <div>
                                <h2 className="text-xl font-heading font-bold text-[var(--foreground)]">{selectedNote.title}</h2>
                                <span className="text-[11px] text-[var(--muted-foreground)]">{timeAgo(selectedNote.updatedAt)} • {selectedNote.folder || 'General'}</span>
                              </div>
                              <Button variant="primary" size="sm" icon={<HiPencil size={13} />} onClick={() => setIsEditing(true)}>
                                Edit Note
                              </Button>
                            </div>

                            {selectedNote.content && selectedNote.content !== '<p><br></p>' ? (
                              <div
                                className="prose prose-sm max-w-none dark:prose-invert leading-relaxed studyquest-markdown"
                                dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(renderedViewContent || selectedNote.content) }}
                              />
                            ) : (
                              <div className="text-center py-16">
                                <span className="text-4xl mb-2 block">📝</span>
                                <p className="text-sm text-[var(--muted-foreground)]">This note is empty.</p>
                                <Button variant="primary" size="sm" className="mt-3" onClick={() => setIsEditing(true)}>
                                  Start Writing
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );

                  // If a multitask panel is active, wrap in resizable split layout
                  if (multitaskPanel) {
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
                        selectedText={selectedText}
                        apiKey={profile?.openRouterKey}
                      />
                    ) : multitaskPanel === 'reference' ? (
                      <ReferenceViewerPanel
                        onClose={() => setMultitaskPanel(null)}
                        onInsertText={(text) => {
                          const quill = quillRef.current?.getEditor();
                          if (quill) {
                            const range = quill.getSelection();
                            const index = range ? range.index : quill.getLength() - 1;
                            quill.insertText(index, text);
                            setEditContent(quill.root.innerHTML);
                          } else {
                            setEditContent(prev => prev + '\n' + text);
                          }
                        }}
                        apiKey={profile?.openRouterKey}
                      />
                    ) : (
                      <WhiteboardSplitPanel
                        noteId={selectedNote?.id}
                        onClose={() => setMultitaskPanel(null)}
                        onInsertDrawing={(dataUrl) => {
                          const imgHtml = `<p><img src="${dataUrl}" alt="Whiteboard Sketch" style="max-width:100%;border-radius:12px;margin:12px 0;border:1px solid rgba(255,255,255,0.12);" /></p>`;
                          const quill = quillRef.current?.getEditor();
                          if (quill) {
                            const range = quill.getSelection();
                            const index = range ? range.index : quill.getLength() - 1;
                            quill.clipboard.dangerouslyPasteHTML(index, imgHtml);
                            setEditContent(quill.root.innerHTML);
                          } else {
                            setEditContent(prev => prev + imgHtml);
                          }
                          toast.success('Sketch inserted into notes! 🎨');
                        }}
                      />
                    );

                    return (
                      <ResizableSplitLayout
                        editor={editorCard}
                        panel={panelComponent}
                        onToggleZen={toggleZenMode}
                        isZenMode={isZenMode}
                      />
                    );
                  }

                  // Single Workstation View
                  return (
                    <div className="notes-single-workstation">
                      {editorCard}
                    </div>
                  );
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
            ) : (
              /* Empty Workspace State with Questie Mascot */
              <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[560px] p-8 text-center rounded-2xl border-2 border-dashed border-[var(--card-border)] bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-lg space-y-5 flex flex-col items-center"
                >
                  <div className="p-3 rounded-full bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10 animate-bounce">
                    <ExpressiveOwlMascot size={64} mood="active" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-black text-[var(--foreground)] tracking-tight">
                      Select a Scroll or Forge a New Grimoire
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed mt-1.5">
                      Choose any study note from the catalog on the left to read, annotate, or transmute with AI. Or forge a brand-new parchment to begin capturing knowledge.
                    </p>
                  </div>
                  <div className="pt-1 flex justify-center gap-3 flex-wrap">
                    {notes.length > 0 && (
                      <Button variant="outline" icon={<HiDocumentText size={16} />} onClick={() => setIsScrollsDrawerOpen(true)}>
                        Browse Scrolls ({notes.length})
                      </Button>
                    )}
                    <Button variant="primary" icon={<HiPlus size={16} />} onClick={() => setShowNewModal(true)}>
                      Create New Scroll
                    </Button>
                    <Button variant="ghost" icon={<HiPencil size={14} />} onClick={() => window.location.href = '/whiteboard'}>
                      Open Whiteboard Studio
                    </Button>
                  </div>

                  {/* Feature Highlights Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-6 text-left border-t border-[var(--card-border)]/70 w-full">
                    <div className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                      <div className="text-xs font-heading font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <span className="text-base">∑</span> KaTeX & Math
                      </div>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-1 leading-normal">
                        Inline equations & blocks with live KaTeX rendering.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                      <div className="text-xs font-heading font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <span className="text-base">✨</span> AI Beautifier
                      </div>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-1 leading-normal">
                        Transforms raw notes into structured study guides.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                      <div className="text-xs font-heading font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <span className="text-base">📺</span> Multitask Dock
                      </div>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-1 leading-normal">
                        Split-screen with YouTube, PDF references, or AI Tutor.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                      <div className="text-xs font-heading font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <span className="text-base">🧪</span> Alchemy Cauldron
                      </div>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-1 leading-normal">
                        Channel writing Mana into flashcards & cheat scrolls.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>

{/* Delete confirm */}
        <ConfirmDialog
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={async () => {
            if (confirmDelete) {
              await deleteNote(confirmDelete);
              setConfirmDelete(null);
              backToList();
              toast.success('Note deleted');
            }
          }}
          title="Delete Note"
          message="This will permanently delete this note. This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
        />

        {/* PDF Export Modal */}
        {selectedNote && (
          <PdfExportModal
            isOpen={showPdfModal}
            onClose={() => setShowPdfModal(false)}
            noteTitle={selectedNote.title}
            noteContent={selectedNote.content}
            folder={selectedNote.folder}
          />
        )}

        {/* AI Summary Modal */}
        <SummaryModal
          isOpen={showSummary}
          onClose={() => setShowSummary(false)}
          summaryText={summaryText}
        />

        {/* Flashcards Modal */}
        <FlashcardsModal
          isOpen={showFlashcards}
          onClose={() => setShowFlashcards(false)}
          flashcards={flashcards}
        />

        {/* Diagram Modal */}
        <DiagramModal
          isOpen={showDiagram}
          onClose={() => setShowDiagram(false)}
          onInsert={handleInsertDiagram}
          noteId={selectedNote?.id}
        />

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
        <MarkdownImportModal
          isOpen={showMarkdownImport}
          onClose={() => {
            setShowMarkdownImport(false);
            setIsEditingMarkdown(false);
          }}
          isEditingSource={isEditingMarkdown}
          initialValue={isEditingMarkdown ? (selectedNote?.markdownSource || '') : ''}
          onImport={async (compiledHtml, rawMarkdown) => {
            if (!selectedNote) return;
            const quill = quillRef.current?.getEditor();
            if (isEditingMarkdown) {
              if (quill) {
                quill.root.innerHTML = compiledHtml;
                setEditContent(quill.root.innerHTML);
              } else {
                setEditContent(compiledHtml);
              }
              await updateNote(selectedNote.id, { content: compiledHtml, markdownSource: rawMarkdown });
              setSelectedNote({ ...selectedNote, content: compiledHtml, markdownSource: rawMarkdown, updatedAt: Date.now() });
            } else {
              if (quill) {
                const len = quill.getLength();
                quill.clipboard.dangerouslyPasteHTML(len - 1, compiledHtml);
                setEditContent(quill.root.innerHTML);
                await updateNote(selectedNote.id, { content: quill.root.innerHTML, markdownSource: rawMarkdown });
                setSelectedNote({ ...selectedNote, content: quill.root.innerHTML, markdownSource: rawMarkdown, updatedAt: Date.now() });
              } else {
                const updated = (editContent || '') + compiledHtml;
                setEditContent(updated);
                await updateNote(selectedNote.id, { content: updated, markdownSource: rawMarkdown });
                setSelectedNote({ ...selectedNote, content: updated, markdownSource: rawMarkdown, updatedAt: Date.now() });
              }
            }
          }}
        />

        {/* AI Beautify Preview Modal */}
        <BeautifyPreviewModal
          isOpen={showBeautifyPreview}
          onClose={() => {
            setShowBeautifyPreview(false);
            setBeautifyResult('');
            setBeautifyBeforeHtml('');
            setBeautifySelectionRange(null);
          }}
          beforeHtml={beautifyBeforeHtml}
          afterHtml={beautifyResult}
          hasSelection={!!beautifySelectionRange}
          onApply={applyBeautify}
        />

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
          apiKey={profile?.openRouterKey}
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

        {/* Alchemy Cauldron Modal */}
        <AlchemyCauldronModal
          isOpen={showCauldron}
          onClose={() => { if (!brewingRecipe) setShowCauldron(false); }}
          mana={mana}
          brewingRecipe={brewingRecipe}
          brewCountdown={brewCountdown}
          onStartBrewing={startBrewing}
        />

        {/* Create New Note Modal */}
        <CreateNoteModal
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          onCreate={async (title, folder) => {
            const id = await addNote({ title, content: '', folder, tags: [] });
            await awardXP(XP_AWARDS.NOTE_CREATED, 'New note created');
            toast.success('Scroll created! +10 XP 📝');
            if (id) {
              const note = { id, title, content: '', folder, tags: [], createdAt: Date.now(), updatedAt: Date.now() };
              openNote(note);
              setIsEditing(true);
            }
          }}
        />

        {/* Rename Note / Move Folder Modal */}
        <RenameNoteModal
          isOpen={!!renameNoteObj}
          onClose={() => setRenameNoteObj(null)}
          initialTitle={renameNoteObj?.title || ''}
          initialFolder={renameNoteObj?.folder || 'General'}
          onRename={async (newTitle: string, newFolder: string) => {
            if (!renameNoteObj) return;
            const targetId = renameNoteObj.id;
            await updateNote(targetId, { title: newTitle, folder: newFolder });
            if (selectedNote?.id === targetId) {
              setSelectedNote((prev) => (prev ? {
                ...prev,
                title: newTitle,
                folder: newFolder,
                updatedAt: Date.now(),
              } : null));
              setEditTitle(newTitle);
            }
            toast.success('Note updated! 📝');
          }}
        />
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
