'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiSearch, HiLightningBolt, HiHome, HiClipboardCheck, HiPencilAlt,
  HiClock, HiCalendar, HiChatAlt2, HiChartBar, HiUserGroup,
  HiDatabase, HiCode, HiCubeTransparent, HiBookmark, HiCog,
  HiCollection, HiTerminal, HiMoon, HiSun, HiX,
} from 'react-icons/hi';
import { useTheme } from '@/context/ThemeContext';
import { playClick } from '@/lib/sounds';

/* ============================================================
   AI Command Palette — Ctrl+K to "talk" to Questie
   Quick search + navigate + execute actions across StudyQuest
   ============================================================ */

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'navigation' | 'action' | 'theme';
  keywords: string[];
  action: () => void;
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

  // ── Build command list ─────────────────────────────────────
  const commands: CommandItem[] = useMemo(() => [
    // Navigation commands
    { id: 'nav-home', label: 'Go to Dashboard', description: 'Your adventure hub', icon: <HiHome size={18} />, category: 'navigation', keywords: ['home', 'dashboard', 'main', 'overview'], action: () => router.push('/') },
    { id: 'nav-tasks', label: 'Go to Quest Log', description: 'Manage your tasks', icon: <HiClipboardCheck size={18} />, category: 'navigation', keywords: ['tasks', 'quests', 'todo', 'quest log'], action: () => router.push('/tasks') },
    { id: 'nav-notes', label: 'Go to Notes & Scrolls', description: 'Write and organize notes', icon: <HiPencilAlt size={18} />, category: 'navigation', keywords: ['notes', 'scrolls', 'write', 'journal'], action: () => router.push('/notes') },
    { id: 'nav-habits', label: 'Go to Daily Quests', description: 'Track your habits', icon: <HiLightningBolt size={18} />, category: 'navigation', keywords: ['habits', 'daily', 'quests', 'routine', 'streak'], action: () => router.push('/habits') },
    { id: 'nav-timer', label: 'Go to Focus Timer', description: 'Start a Pomodoro session', icon: <HiClock size={18} />, category: 'navigation', keywords: ['timer', 'pomodoro', 'focus', 'study', 'concentrate'], action: () => router.push('/timer') },
    { id: 'nav-timetable', label: 'Go to Timetable', description: 'View your schedule', icon: <HiCalendar size={18} />, category: 'navigation', keywords: ['timetable', 'schedule', 'calendar', 'classes'], action: () => router.push('/timetable') },
    { id: 'nav-resources', label: 'Go to Resources Vault', description: 'Your saved links & files', icon: <HiCollection size={18} />, category: 'navigation', keywords: ['resources', 'vault', 'links', 'pdfs', 'bookmarks'], action: () => router.push('/resources') },
    { id: 'nav-chat', label: 'Go to Questie Chat', description: 'Chat with AI', icon: <HiChatAlt2 size={18} />, category: 'navigation', keywords: ['chat', 'ai', 'questie', 'ask', 'help'], action: () => router.push('/chat') },
    { id: 'nav-analytics', label: 'Go to Hall of Fame', description: 'View your stats', icon: <HiChartBar size={18} />, category: 'navigation', keywords: ['analytics', 'stats', 'hall of fame', 'achievements', 'progress'], action: () => router.push('/analytics') },
    { id: 'nav-groups', label: 'Go to Study Groups', description: 'Collaborate with friends', icon: <HiUserGroup size={18} />, category: 'navigation', keywords: ['groups', 'friends', 'guild', 'collaborate', 'team'], action: () => router.push('/groups') },
    { id: 'nav-sql', label: 'Go to SQL Lab', description: 'Practice SQL queries', icon: <HiDatabase size={18} />, category: 'navigation', keywords: ['sql', 'database', 'query', 'lab'], action: () => router.push('/sql') },
    { id: 'nav-code', label: 'Go to Code Runner', description: 'Quick code execution', icon: <HiCode size={18} />, category: 'navigation', keywords: ['code', 'runner', 'execute', 'run'], action: () => router.push('/code') },
    { id: 'nav-ide', label: 'Go to Code Arena IDE', description: 'Full project IDE', icon: <HiTerminal size={18} />, category: 'navigation', keywords: ['ide', 'arena', 'project', 'editor', 'build'], action: () => router.push('/ide') },
    { id: 'nav-dsa', label: 'Go to DSA Dungeon', description: 'Data structures & algorithms', icon: <HiCubeTransparent size={18} />, category: 'navigation', keywords: ['dsa', 'dungeon', 'algorithms', 'data structures', 'leetcode'], action: () => router.push('/dsa') },
    { id: 'nav-snippets', label: 'Go to Spell Book', description: 'Your code snippets', icon: <HiBookmark size={18} />, category: 'navigation', keywords: ['snippets', 'spellbook', 'spell book', 'saved code'], action: () => router.push('/snippets') },
    { id: 'nav-settings', label: 'Go to Settings', description: 'Configure your profile', icon: <HiCog size={18} />, category: 'navigation', keywords: ['settings', 'profile', 'configure', 'preferences'], action: () => router.push('/settings') },

    // Theme actions
    { id: 'theme-toggle', label: 'Toggle Theme', description: `Currently: ${theme} mode`, icon: theme === 'dark' ? <HiSun size={18} /> : <HiMoon size={18} />, category: 'theme', keywords: ['theme', 'dark', 'light', 'mode', 'toggle', 'switch'], action: toggleTheme },
    { id: 'theme-dark', label: 'Switch to Dark Mode', description: 'Enable dark theme', icon: <HiMoon size={18} />, category: 'theme', keywords: ['dark', 'mode', 'night'], action: () => setTheme('dark') },
    { id: 'theme-light', label: 'Switch to Light Mode', description: 'Enable light theme', icon: <HiSun size={18} />, category: 'theme', keywords: ['light', 'mode', 'day', 'bright'], action: () => setTheme('light') },

    // Quick actions
    { id: 'action-study', label: 'Start Studying', description: 'Jump to focus timer', icon: <HiClock size={18} />, category: 'action', keywords: ['start', 'study', 'studying', 'begin', 'focus'], action: () => router.push('/timer') },
    { id: 'action-add-task', label: 'Add a Task', description: 'Go to Quest Log', icon: <HiClipboardCheck size={18} />, category: 'action', keywords: ['add', 'task', 'new', 'create', 'todo'], action: () => router.push('/tasks') },
    { id: 'action-add-note', label: 'Write a Note', description: 'Go to Notes', icon: <HiPencilAlt size={18} />, category: 'action', keywords: ['add', 'note', 'write', 'new', 'create'], action: () => router.push('/notes') },
    { id: 'action-new-project', label: 'Create a Code Project', description: 'Open Code Arena IDE', icon: <HiTerminal size={18} />, category: 'action', keywords: ['create', 'project', 'new', 'code', 'build'], action: () => router.push('/ide') },
  ], [router, theme, toggleTheme, setTheme]);

  // ── Filter commands ────────────────────────────────────────
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter((cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.includes(q))
    );
  }, [query, commands]);

  // ── Keyboard shortcut: Ctrl+K / Cmd+K ──────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Focus input when opened ────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ── Reset selection on query change ────────────────────────
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ── Scroll selected into view ──────────────────────────────
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // ── Execute command ────────────────────────────────────────
  const executeCommand = useCallback((cmd: CommandItem) => {
    playClick();
    cmd.action();
    setIsOpen(false);
  }, []);

  // ── Keyboard navigation ────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    }
  };

  // ── Category labels ────────────────────────────────────────
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'navigation': return '📍 Navigate';
      case 'action': return '⚡ Quick Actions';
      case 'theme': return '🎨 Appearance';
      default: return cat;
    }
  };

  // ── Group by category ──────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // ── Build flat index for keyboard nav ──────────────────────
  let flatIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Palette */}
          <motion.div
            className="relative w-full max-w-[560px] mx-4 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-[var(--card-border)]">
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
                placeholder="Ask Questie... (navigate, toggle theme, start studying...)"
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[var(--muted-foreground)]"
              />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <kbd className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[var(--background)] border border-[var(--card-border)] text-[var(--muted-foreground)]">
                  ESC
                </kbd>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-[var(--muted)]/20 text-[var(--muted-foreground)]"
                >
                  <HiX size={14} />
                </button>
              </div>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
              {filteredCommands.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-2xl">🦉</span>
                  <p className="text-sm text-[var(--muted-foreground)] mt-2">
                    Hmm, I couldn&apos;t find that...
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Try &quot;tasks&quot;, &quot;dark mode&quot;, or &quot;start studying&quot;
                  </p>
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category}>
                    <p className="px-4 py-1.5 text-[9px] uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)]">
                      {getCategoryLabel(category)}
                    </p>
                    {items.map((cmd) => {
                      flatIndex++;
                      const idx = flatIndex;
                      const isSelected = idx === selectedIndex;

                      return (
                        <button
                          key={cmd.id}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(idx)}
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
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--card-border)] text-[10px] text-[var(--muted-foreground)]">
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
