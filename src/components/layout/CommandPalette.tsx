'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiSearch, HiLightningBolt, HiHome, HiClipboardCheck, HiPencilAlt,
  HiClock, HiCalendar, HiChatAlt2, HiChartBar, HiUserGroup,
  HiDatabase, HiCode, HiCubeTransparent, HiBookmark, HiCog,
  HiCollection, HiTerminal, HiMoon, HiSun, HiX, HiPlus,
  HiSparkles, HiPencil, HiAcademicCap, HiDocumentText,
} from 'react-icons/hi';
import { useTheme } from '@/context/ThemeContext';
import { useNotes } from '@/hooks/useNotes';
import { useTasks } from '@/hooks/useTasks';
import { playClick } from '@/lib/sounds';

/* ============================================================
   AI Command Palette — Ctrl+K / Cmd+K
   Fuzzy search + notes/tasks search + recent actions + quick-create
   ============================================================ */

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'recent' | 'create' | 'search' | 'navigation' | 'action' | 'theme';
  keywords: string[];
  action: () => void;
}

const CATEGORY_ORDER: CommandItem['category'][] = ['recent', 'create', 'search', 'action', 'navigation', 'theme'];

const CATEGORY_LABELS: Record<string, string> = {
  recent: '🕐 Recent',
  create: '✨ Quick Create',
  search: '🔍 Search Results',
  navigation: '📍 Navigate',
  action: '⚡ Quick Actions',
  theme: '🎨 Appearance',
};

const RECENT_KEY = 'sq_cmd_recent';
const MAX_RECENT = 5;

/** Simple fuzzy match — returns score (higher = better), -1 = no match */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 100 + (q.length / t.length) * 50; // substring match is best
  let score = 0;
  let qi = 0;
  let lastIdx = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10;
      if (lastIdx >= 0 && ti === lastIdx + 1) score += 5; // consecutive bonus
      if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-') score += 8; // word-start bonus
      lastIdx = ti;
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

function getRecentIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

function saveRecent(id: string) {
  const recent = getRecentIds().filter((r) => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme, setTheme } = useTheme();
  const { notes } = useNotes();
  const { tasks } = useTasks();

  // ── Static commands ─────────────────────────────────────
  const staticCommands: CommandItem[] = useMemo(() => [
    // Quick create
    { id: 'create-note', label: 'New Note', description: 'Create a new note', icon: <HiPlus size={18} />, category: 'create', keywords: ['new', 'note', 'create', 'write', 'add'], action: () => router.push('/notes?create=1') },
    { id: 'create-task', label: 'New Task', description: 'Add a new quest', icon: <HiPlus size={18} />, category: 'create', keywords: ['new', 'task', 'create', 'add', 'quest', 'todo'], action: () => router.push('/tasks?create=1') },
    { id: 'create-timer', label: 'Start Focus Session', description: 'Jump to Pomodoro timer', icon: <HiClock size={18} />, category: 'create', keywords: ['start', 'timer', 'focus', 'pomodoro', 'study'], action: () => router.push('/timer') },
    { id: 'create-whiteboard', label: 'New Whiteboard', description: 'Start sketching', icon: <HiPencil size={18} />, category: 'create', keywords: ['new', 'whiteboard', 'draw', 'sketch'], action: () => router.push('/whiteboard') },

    // Navigation
    { id: 'nav-home', label: 'Dashboard', description: 'Your adventure hub', icon: <HiHome size={18} />, category: 'navigation', keywords: ['home', 'dashboard', 'main', 'overview'], action: () => router.push('/') },
    { id: 'nav-tasks', label: 'Quest Log', description: 'Manage your tasks', icon: <HiClipboardCheck size={18} />, category: 'navigation', keywords: ['tasks', 'quests', 'todo', 'quest log'], action: () => router.push('/tasks') },
    { id: 'nav-notes', label: 'Notes & Scrolls', description: 'Write and organize notes', icon: <HiPencilAlt size={18} />, category: 'navigation', keywords: ['notes', 'scrolls', 'write', 'journal'], action: () => router.push('/notes') },
    { id: 'nav-habits', label: 'Daily Quests', description: 'Track your habits', icon: <HiLightningBolt size={18} />, category: 'navigation', keywords: ['habits', 'daily', 'quests', 'routine', 'streak'], action: () => router.push('/habits') },
    { id: 'nav-exams', label: 'Exam Countdown', description: 'Track upcoming exams', icon: <HiAcademicCap size={18} />, category: 'navigation', keywords: ['exams', 'countdown', 'test', 'exam'], action: () => router.push('/exams') },
    { id: 'nav-timer', label: 'Focus Timer', description: 'Start a Pomodoro session', icon: <HiClock size={18} />, category: 'navigation', keywords: ['timer', 'pomodoro', 'focus', 'study', 'concentrate'], action: () => router.push('/timer') },
    { id: 'nav-timetable', label: 'Timetable', description: 'View your schedule', icon: <HiCalendar size={18} />, category: 'navigation', keywords: ['timetable', 'schedule', 'calendar', 'classes'], action: () => router.push('/timetable') },
    { id: 'nav-resources', label: 'Resources Vault', description: 'Your saved links & files', icon: <HiCollection size={18} />, category: 'navigation', keywords: ['resources', 'vault', 'links', 'pdfs', 'bookmarks'], action: () => router.push('/resources') },
    { id: 'nav-whiteboard', label: 'Whiteboard', description: 'Sketch and diagram', icon: <HiPencil size={18} />, category: 'navigation', keywords: ['whiteboard', 'draw', 'sketch', 'diagram'], action: () => router.push('/whiteboard') },
    { id: 'nav-chat', label: 'Questie Chat', description: 'Chat with AI', icon: <HiChatAlt2 size={18} />, category: 'navigation', keywords: ['chat', 'ai', 'questie', 'ask', 'help'], action: () => router.push('/chat') },
    { id: 'nav-analytics', label: 'Hall of Fame', description: 'View your stats', icon: <HiChartBar size={18} />, category: 'navigation', keywords: ['analytics', 'stats', 'hall of fame', 'achievements', 'progress'], action: () => router.push('/analytics') },
    { id: 'nav-groups', label: 'Study Groups', description: 'Collaborate with friends', icon: <HiUserGroup size={18} />, category: 'navigation', keywords: ['groups', 'friends', 'guild', 'collaborate', 'team'], action: () => router.push('/groups') },
    { id: 'nav-sql', label: 'SQL Lab', description: 'Practice SQL queries', icon: <HiDatabase size={18} />, category: 'navigation', keywords: ['sql', 'database', 'query', 'lab'], action: () => router.push('/sql') },
    { id: 'nav-code', label: 'Code Runner', description: 'Quick code execution', icon: <HiCode size={18} />, category: 'navigation', keywords: ['code', 'runner', 'execute', 'run'], action: () => router.push('/code') },
    { id: 'nav-ide', label: 'Code Arena IDE', description: 'Full project IDE', icon: <HiTerminal size={18} />, category: 'navigation', keywords: ['ide', 'arena', 'project', 'editor', 'build'], action: () => router.push('/ide') },
    { id: 'nav-dsa', label: 'DSA Dungeon', description: 'Data structures & algorithms', icon: <HiCubeTransparent size={18} />, category: 'navigation', keywords: ['dsa', 'dungeon', 'algorithms', 'data structures', 'leetcode'], action: () => router.push('/dsa') },
    { id: 'nav-snippets', label: 'Spell Book', description: 'Your code snippets', icon: <HiBookmark size={18} />, category: 'navigation', keywords: ['snippets', 'spellbook', 'spell book', 'saved code'], action: () => router.push('/snippets') },
    { id: 'nav-arcade', label: 'Typing Arcade', description: 'Practice typing speed', icon: <HiSparkles size={18} />, category: 'navigation', keywords: ['arcade', 'typing', 'speed', 'type', 'wpm'], action: () => router.push('/arcade') },
    { id: 'nav-settings', label: 'Settings', description: 'Configure your profile', icon: <HiCog size={18} />, category: 'navigation', keywords: ['settings', 'profile', 'configure', 'preferences'], action: () => router.push('/settings') },

    // Theme actions
    { id: 'theme-toggle', label: 'Toggle Theme', description: `Currently: ${theme} mode`, icon: theme === 'dark' ? <HiSun size={18} /> : <HiMoon size={18} />, category: 'theme', keywords: ['theme', 'dark', 'light', 'mode', 'toggle', 'switch'], action: toggleTheme },
    { id: 'theme-dark', label: 'Dark Mode', description: 'Enable dark theme', icon: <HiMoon size={18} />, category: 'theme', keywords: ['dark', 'mode', 'night'], action: () => setTheme('dark') },
    { id: 'theme-light', label: 'Light Mode', description: 'Enable light theme', icon: <HiSun size={18} />, category: 'theme', keywords: ['light', 'mode', 'day', 'bright'], action: () => setTheme('light') },

    // Quick actions
    { id: 'action-study', label: 'Start Studying', description: 'Jump to focus timer', icon: <HiClock size={18} />, category: 'action', keywords: ['start', 'study', 'studying', 'begin', 'focus'], action: () => router.push('/timer') },
  ], [router, theme, toggleTheme, setTheme]);

  // ── Dynamic search results (notes + tasks) ─────────────
  const dynamicResults: CommandItem[] = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    const results: CommandItem[] = [];

    // Search notes
    notes.forEach((note) => {
      const score = Math.max(
        fuzzyScore(q, note.title),
        fuzzyScore(q, note.folder),
      );
      if (score > 0) {
        results.push({
          id: `note-${note.id}`,
          label: note.title || 'Untitled Note',
          description: `📁 ${note.folder} · Note`,
          icon: <HiDocumentText size={18} />,
          category: 'search',
          keywords: [],
          action: () => router.push('/notes'),
        });
      }
    });

    // Search tasks
    tasks.forEach((task) => {
      const score = Math.max(
        fuzzyScore(q, task.title),
        fuzzyScore(q, task.description || ''),
      );
      if (score > 0) {
        results.push({
          id: `task-${task.id}`,
          label: task.title,
          description: `${task.status === 'done' ? '✅' : '⬜'} ${task.priority} priority · Task`,
          icon: <HiClipboardCheck size={18} />,
          category: 'search',
          keywords: [],
          action: () => router.push('/tasks'),
        });
      }
    });

    return results.slice(0, 6); // Limit to 6 results
  }, [query, notes, tasks, router]);

  // ── Recent commands ────────────────────────────────────
  const recentCommands: CommandItem[] = useMemo(() => {
    if (query.trim()) return []; // Don't show recents when searching
    const recentIds = getRecentIds();
    return recentIds
      .map((id) => {
        const cmd = staticCommands.find((c) => c.id === id);
        if (!cmd) return null;
        return { ...cmd, category: 'recent' as const };
      })
      .filter(Boolean) as CommandItem[];
  }, [query, staticCommands]);

  // ── Filter & rank all commands ─────────────────────────
  const filteredCommands = useMemo(() => {
    let results: (CommandItem & { _score?: number })[] = [];

    if (!query.trim()) {
      // No query: show recents + create + all others
      results = [...recentCommands, ...staticCommands.filter((c) => c.category !== 'theme' || true)];
    } else {
      // Score and filter static commands
      const scored = staticCommands.map((cmd) => {
        const s = Math.max(
          fuzzyScore(query, cmd.label),
          fuzzyScore(query, cmd.description || ''),
          ...cmd.keywords.map((k) => fuzzyScore(query, k)),
        );
        return { ...cmd, _score: s };
      }).filter((cmd) => cmd._score > 0);

      scored.sort((a, b) => (b._score || 0) - (a._score || 0));
      results = [...dynamicResults, ...scored];
    }

    // Dedupe by id
    const seen = new Set<string>();
    return results.filter((cmd) => {
      if (seen.has(cmd.id)) return false;
      seen.add(cmd.id);
      return true;
    });
  }, [query, staticCommands, dynamicResults, recentCommands]);

  // ── Group by category with priority ordering ───────────
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    // Return in priority order
    const ordered: [string, CommandItem[]][] = [];
    for (const cat of CATEGORY_ORDER) {
      if (groups[cat] && groups[cat].length > 0) {
        ordered.push([cat, groups[cat]]);
      }
    }
    return ordered;
  }, [filteredCommands]);

  // ── Flat index for keyboard navigation ────────────────
  const flatItems = useMemo(() => {
    const items: CommandItem[] = [];
    grouped.forEach(([, catItems]) => catItems.forEach((cmd) => items.push(cmd)));
    return items;
  }, [grouped]);

  // ── Keyboard shortcut: Ctrl+K / Cmd+K ─────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Focus input when opened ───────────────────────────
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  // ── Scroll into view ──────────────────────────────────
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement;
      if (selected) selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // ── Execute command ───────────────────────────────────
  const executeCommand = useCallback((cmd: CommandItem) => {
    playClick();
    saveRecent(cmd.id);
    cmd.action();
    setIsOpen(false);
  }, []);

  // ── Keyboard navigation ───────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) executeCommand(flatItems[selectedIndex]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          {/* Palette */}
          <motion.div
            className="relative w-full max-w-[600px] mx-4 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b-2 border-[var(--card-border)]">
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-lg">🦉</span>
                <HiSearch size={18} className="text-[var(--muted-foreground)]" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search notes, tasks, pages, or actions..."
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[var(--muted-foreground)]"
              />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <kbd className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[var(--background)] border border-[var(--card-border)] text-[var(--muted-foreground)]">
                  ESC
                </kbd>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-[var(--muted)]/20 text-[var(--muted-foreground)]">
                  <HiX size={14} />
                </button>
              </div>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="max-h-[400px] overflow-y-auto py-2 custom-scrollbar"
              style={{ scrollBehavior: 'smooth', overscrollBehavior: 'contain' }}
            >
              {flatItems.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-2xl">🦉</span>
                  <p className="text-sm text-[var(--muted-foreground)] mt-2">
                    No results for &quot;{query}&quot;
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Try &quot;notes&quot;, &quot;new task&quot;, or &quot;dark mode&quot;
                  </p>
                </div>
              ) : (() => {
                let idx = 0;
                return grouped.map(([category, items]) => (
                  <div key={category}>
                    <p className="px-4 py-1.5 text-[9px] uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)]">
                      {CATEGORY_LABELS[category] || category}
                    </p>
                    {items.map((cmd) => {
                      const currentIdx = idx;
                      idx++;
                      const isSelected = currentIdx === selectedIndex;

                      return (
                        <button
                          key={cmd.id}
                          data-idx={currentIdx}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(currentIdx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'text-[var(--foreground)] hover:bg-[var(--card-border)]/30'
                          }`}
                        >
                          <span className={`flex-shrink-0 ${isSelected ? 'text-primary' : 'text-[var(--muted-foreground)]'}`}>
                            {cmd.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{cmd.label}</p>
                            {cmd.description && (
                              <p className="text-[11px] text-[var(--muted-foreground)] truncate">{cmd.description}</p>
                            )}
                          </div>
                          {isSelected && (
                            <kbd className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded bg-primary/20 text-primary">
                              ↵
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--card-border)] text-[10px] text-[var(--muted-foreground)]">
              <div className="flex items-center gap-3">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Esc Close</span>
              </div>
              <span className="flex items-center gap-1">
                <span className="text-xs">🦉</span> Questie Command Palette
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
