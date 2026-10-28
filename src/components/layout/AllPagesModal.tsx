'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  HiX, HiSearch, HiBookmark, HiHome, HiClipboardCheck,
  HiPencilAlt, HiLightningBolt, HiClock, HiCalendar,
  HiBookOpen, HiPencil, HiChatAlt2, HiChartBar,
  HiHeart, HiShoppingCart, HiBeaker, HiSparkles,
  HiUserGroup, HiAcademicCap, HiTerminal, HiDatabase,
  HiCode, HiCubeTransparent, HiShieldCheck,
} from 'react-icons/hi';
import { useAuthContext } from '@/context/AuthContext';
import { ADMIN_EMAILS } from '@/lib/constants';
import toast from 'react-hot-toast';
import { playClick, playXP } from '@/lib/sounds';

export interface AppNavDefinition {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  category: 'Adventure' | 'Sanctuary' | 'Companions' | 'Forge' | 'Admin';
  adminOnly?: boolean;
}

export const ALL_APP_PAGES: AppNavDefinition[] = [
  // Adventure
  { key: 'dashboard', label: 'Dashboard', description: 'Central command & living study sanctuary', href: '/', icon: HiHome, category: 'Adventure' },
  { key: 'tracker', label: 'Syllabus Tracker', description: 'Track subjects, chapters & revision progress', href: '/tracker', icon: HiAcademicCap, category: 'Adventure' },
  { key: 'tasks', label: 'Quest Log', description: 'Kanban tasks board & priority missions', href: '/tasks', icon: HiClipboardCheck, category: 'Adventure' },
  { key: 'notes', label: 'Notes & Scrolls', description: 'Rich markdown & document note vault', href: '/notes', icon: HiPencilAlt, category: 'Adventure' },
  { key: 'habits', label: 'Daily Habits', description: 'Daily discipline rituals & streak builder', href: '/habits', icon: HiLightningBolt, category: 'Adventure' },
  { key: 'exams', label: 'Exam Countdown', description: 'Target milestones, exam radar & timers', href: '/exams', icon: HiAcademicCap, category: 'Adventure' },

  // Study Sanctuary
  { key: 'timer', label: 'Focus Timer', description: 'Pomodoro timer with lofi study beats', href: '/timer', icon: HiClock, category: 'Sanctuary' },
  { key: 'timetable', label: 'Timetable', description: 'Interactive weekly study schedule grid', href: '/timetable', icon: HiCalendar, category: 'Sanctuary' },
  { key: 'reader', label: 'Doc Studio & Reader', description: 'Multipage Word/PDF document studio', href: '/reader', icon: HiBookOpen, category: 'Sanctuary' },
  { key: 'whiteboard', label: 'Whiteboard', description: 'Infinite collaborative sketch canvas', href: '/whiteboard', icon: HiPencil, category: 'Sanctuary' },
  { key: 'chat', label: 'Questie AI Chat', description: 'AI study tutor & problem solver', href: '/chat', icon: HiChatAlt2, category: 'Sanctuary' },
  { key: 'analytics', label: 'Hall of Fame', description: 'Study streaks, XP radar & leaderboard', href: '/analytics', icon: HiChartBar, category: 'Sanctuary' },

  // Companions
  { key: 'pets', label: 'Companion Pet', description: 'Living digital pet, bonding & stages', href: '/pets', icon: HiHeart, category: 'Companions' },
  { key: 'shop', label: 'Item Shop', description: 'Cosmetics, themes & companion food', href: '/shop', icon: HiShoppingCart, category: 'Companions' },
  { key: 'alchemy', label: 'Alchemy Lab', description: 'Brew focus potions & study buffs', href: '/alchemy', icon: HiBeaker, category: 'Companions' },
  { key: 'skills', label: 'Skill Tree', description: 'Unlock permanent learning perks', href: '/skills', icon: HiSparkles, category: 'Companions' },
  { key: 'groups', label: 'Study Groups', description: 'Co-op study rooms & friend radar', href: '/groups', icon: HiUserGroup, category: 'Companions' },

  // Forge
  { key: 'ide', label: 'Code Arena IDE', description: 'Browser IDE with syntax highlighting', href: '/ide', icon: HiTerminal, category: 'Forge' },
  { key: 'sql', label: 'SQL Lab', description: 'In-browser relational database runner', href: '/sql', icon: HiDatabase, category: 'Forge' },
  { key: 'code', label: 'Code Runner', description: 'Multi-language code execution engine', href: '/code', icon: HiCode, category: 'Forge' },
  { key: 'dsa', label: 'DSA Dungeon', description: 'Algorithmic problem-solving arena', href: '/dsa', icon: HiCubeTransparent, category: 'Forge' },
  { key: 'notebook', label: 'Data Forge', description: 'Jupyter-style interactive notebooks', href: '/notebook', icon: HiTerminal, category: 'Forge' },

  // Admin
  { key: 'admin', label: 'Admin Control', description: 'Platform administration & user telemetry', href: '/admin', icon: HiShieldCheck, category: 'Admin', adminOnly: true },
];

export const DEFAULT_PINNED_KEYS = ['dashboard', 'tasks', 'notes', 'habits', 'timer', 'reader'];
export const MAX_PINNED_COUNT = 7;

interface AllPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedKeys: string[];
  onTogglePin: (key: string) => void;
}

export default function AllPagesModal({
  isOpen,
  onClose,
  pinnedKeys,
  onTogglePin,
}: AllPagesModalProps) {
  const router = useRouter();
  const { profile } = useAuthContext();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const isAdmin = profile?.email && ADMIN_EMAILS.includes(profile.email);

  const availablePages = useMemo(() => {
    return ALL_APP_PAGES.filter((p) => !p.adminOnly || isAdmin);
  }, [isAdmin]);

  const categories = useMemo(() => {
    const cats = ['All', 'Adventure', 'Sanctuary', 'Companions', 'Forge'];
    if (isAdmin) cats.push('Admin');
    return cats;
  }, [isAdmin]);

  const filteredPages = useMemo(() => {
    return availablePages.filter((page) => {
      const matchesSearch =
        page.label.toLowerCase().includes(search.toLowerCase()) ||
        page.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || page.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [availablePages, search, selectedCategory]);

  const handleNavigate = (href: string) => {
    playClick();
    onClose();
    router.push(href);
  };

  const handlePinClick = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    if (!pinnedKeys.includes(key) && pinnedKeys.length >= MAX_PINNED_COUNT) {
      toast.error(`Maximum of ${MAX_PINNED_COUNT} pages pinned to keep the sidebar compact.`);
      return;
    }
    onTogglePin(key);
    playXP();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md">
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-2xl max-h-[85vh] rounded-[30px] sm:rounded-[36px] bg-white dark:bg-[#111328] border-2 border-indigo-200/90 dark:border-white/15 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden z-10"
        >
          {/* Header Bar */}
          <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-indigo-100 dark:border-white/10 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-heading font-black tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
                <span>All Pages & Apps</span>
              </h2>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                Pin your favorite pages to customize your sidebar ({pinnedKeys.length}/{MAX_PINNED_COUNT} pinned)
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <HiX size={18} />
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="px-5 sm:px-7 py-3 border-b border-indigo-100/80 dark:border-white/10 space-y-2.5 bg-indigo-50/30 dark:bg-white/[0.02]">
            {/* Search Input */}
            <div className="relative flex items-center">
              <HiSearch className="absolute left-3.5 text-slate-400" size={17} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all pages, study tools & workspaces..."
                autoFocus
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white dark:bg-[#161936] border border-indigo-100 dark:border-white/12 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary shadow-2xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold tracking-wide transition-all cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-white border border-indigo-100 dark:border-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Pages Grid (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-2.5 custom-scrollbar">
            {filteredPages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredPages.map((page) => {
                  const Icon = page.icon;
                  const isPinned = pinnedKeys.includes(page.key);

                  return (
                    <div
                      key={page.key}
                      onClick={() => handleNavigate(page.href)}
                      className="group p-3 rounded-2xl bg-white dark:bg-[#161936] border border-indigo-100 dark:border-white/10 hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs hover:shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                            {page.label}
                          </h4>
                          <p className="text-[10px] text-[var(--muted-foreground)] truncate mt-0.5">
                            {page.description}
                          </p>
                        </div>
                      </div>

                      {/* Pin / Unpin Button */}
                      <button
                        onClick={(e) => handlePinClick(e, page.key)}
                        className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                          isPinned
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-indigo-50 dark:bg-white/5 text-slate-400 hover:text-primary hover:bg-primary/10'
                        }`}
                        title={isPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
                        aria-label={isPinned ? `Unpin ${page.label}` : `Pin ${page.label}`}
                      >
                        <HiBookmark size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <p className="text-sm font-semibold">No pages match &ldquo;{search}&rdquo;</p>
                <p className="text-xs mt-1 text-slate-500">Try a different keyword or category.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
