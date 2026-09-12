'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiHome, HiClipboardCheck, HiPencilAlt, HiLightningBolt,
  HiClock, HiCalendar, HiChatAlt2, HiChartBar,
  HiUserGroup, HiDatabase, HiCode, HiCubeTransparent,
  HiBookmark, HiCog, HiChevronLeft, HiChevronRight, HiChevronDown,
  HiLogout, HiSparkles, HiCollection, HiTerminal,
  HiAcademicCap, HiPencil, HiHeart, HiShoppingCart,
  HiBeaker, HiShieldCheck, HiBookOpen,
} from 'react-icons/hi';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useSidebar } from '@/context/SidebarContext';
import { getAvatarUrl, TITLES, ADMIN_EMAILS } from '@/lib/constants';
import XPBar from '@/components/gamification/XPBar';
import LevelBadge from '@/components/gamification/LevelBadge';
import StreakCounter from '@/components/gamification/StreakCounter';
import QuestieMascot from '@/components/gamification/QuestieMascot';
import AvatarBorder from '@/components/gamification/AvatarBorder';
import { useMotion } from '@/context/ThemeContext';
import { isFeatureEnabled, FeatureFlags } from '@/config/featureFlags';


const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  HiHome, HiClipboardCheck, HiPencilAlt, HiLightningBolt,
  HiClock, HiCalendar, HiChatAlt2, HiChartBar,
  HiUserGroup, HiDatabase, HiCode, HiCubeTransparent,
  HiBookmark, HiCog, HiSparkles, HiCollection, HiTerminal,
  HiAcademicCap, HiPencil, HiHeart, HiShoppingCart,
  HiBeaker, HiShieldCheck, HiBookOpen,
};

const SECTION_META: Record<string, { emoji: string; short: string }> = {
  'Adventure': { emoji: '⚔️', short: 'Adventure' },
  'Study Sanctuary': { emoji: '📚', short: 'Sanctuary' },
  'Companions': { emoji: '🐾', short: 'Companions' },
  'Forge': { emoji: '⚡', short: 'Forge' },
  'Admin': { emoji: '🛡️', short: 'Admin' },
};

/* ============================================================
   Navigation matches Stitch StudyQuest screen structure:
   Dashboard → Quest Log → Study Sanctuary → Hall of Fame → Questie Chat
   + expanded Dev Tools for the full platform
   ============================================================ */
const NAV_SECTIONS = [
  {
    title: 'Adventure',
    items: [
      { label: 'Dashboard', href: '/', icon: 'HiHome' },
      { label: 'Syllabus Tracker', href: '/tracker', icon: 'HiAcademicCap', featureFlag: 'studyTracker' },
      { label: 'Quest Log', href: '/tasks', icon: 'HiClipboardCheck' },
      { label: 'Notes & Scrolls', href: '/notes', icon: 'HiPencilAlt' },
      { label: 'Daily Quests', href: '/habits', icon: 'HiLightningBolt' },
      { label: 'Exam Countdown', href: '/exams', icon: 'HiAcademicCap' },
    ],
  },
  {
    title: 'Study Sanctuary',
    items: [
      { label: 'Focus Timer', href: '/timer', icon: 'HiClock' },
      { label: 'Timetable', href: '/timetable', icon: 'HiCalendar' },
      { label: 'Resources', href: '/resources', icon: 'HiCollection' },
      { label: 'Doc Reader', href: '/reader', icon: 'HiBookOpen' },
      { label: 'Whiteboard', href: '/whiteboard', icon: 'HiPencil' },
      { label: 'Questie Chat', href: '/chat', icon: 'HiChatAlt2' },
      { label: 'Hall of Fame', href: '/analytics', icon: 'HiChartBar' },
    ],
  },
  {
    title: 'Companions',
    items: [
      { label: 'My Pet', href: '/pets', icon: 'HiHeart' },
      { label: 'Item Shop', href: '/shop', icon: 'HiShoppingCart' },
      { label: 'Alchemy Lab', href: '/alchemy', icon: 'HiBeaker' },
      { label: 'Skill Tree', href: '/skills', icon: 'HiSparkles' },
      { label: 'Study Groups', href: '/groups', icon: 'HiUserGroup' },
    ],
  },
  {
    title: 'Forge',
    items: [
      { label: 'ML Academy', href: '/ml', icon: 'HiAcademicCap' },
      { label: 'Data Forge (Colab)', href: '/notebook', icon: 'HiTerminal' },
      { label: 'SQL Lab', href: '/sql', icon: 'HiDatabase' },
      { label: 'Code Runner', href: '/code', icon: 'HiCode' },
      { label: 'Code Arena IDE', href: '/ide', icon: 'HiTerminal' },
      { label: 'DSA Dungeon', href: '/dsa', icon: 'HiCubeTransparent' },
      { label: 'Spell Book', href: '/snippets', icon: 'HiBookmark' },
      { label: 'Typing Arcade', href: '/arcade', icon: 'HiSparkles' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Admin Panel', href: '/admin', icon: 'HiShieldCheck' },
    ],
  },
];

export default function Sidebar() {
  const { collapsed, setCollapsed } = useSidebar();
  const { reduceMotion } = useMotion();
  const pathname = usePathname();
  const { profile, signOut } = useAuthContext();
  const { gamification } = useGamification();

  const avatarUrl = profile
    ? getAvatarUrl(profile.avatarSeed, profile.avatarStyle)
    : '';

  // Filter out Admin section for non-admin users & features disabled by Feature Flags
  const visibleSections = useMemo(() => {
    const isAdmin = profile?.email && ADMIN_EMAILS.includes(profile.email);
    const sections = isAdmin ? NAV_SECTIONS : NAV_SECTIONS.filter((s) => s.title !== 'Admin');

    return sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => {
          if ('featureFlag' in item && item.featureFlag) {
            return isFeatureEnabled(item.featureFlag as keyof FeatureFlags);
          }
          return true;
        }),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [profile?.email]);


  // Scroll indicators for nav
  const navRef = useRef<HTMLElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Collapsible section states with localStorage persistence
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  
  // Pinned favorites with localStorage persistence
  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>(['/', '/dsa', '/timer', '/notes', '/pets']);

  useEffect(() => {
    try {
      const savedSections = localStorage.getItem('sq_sidebar_collapsed_sections');
      if (savedSections) setCollapsedSections(JSON.parse(savedSections));
      const savedPinned = localStorage.getItem('sq_sidebar_pinned_items');
      if (savedPinned) setPinnedHrefs(JSON.parse(savedPinned));
      const savedPinnedCollapsed = localStorage.getItem('sq_sidebar_pinned_collapsed');
      if (savedPinnedCollapsed !== null) setPinnedCollapsed(savedPinnedCollapsed === 'true');
    } catch { /* ignore */ }
  }, []);

  const togglePinnedCollapsed = () => {
    setPinnedCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('sq_sidebar_pinned_collapsed', String(next)); } catch {}
      return next;
    });
  };


  const scrollToNextSection = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ top: 220, behavior: 'smooth' });
    }
  };

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem('sq_sidebar_collapsed_sections', JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  const togglePin = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPinnedHrefs((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
      try {
        localStorage.setItem('sq_sidebar_pinned_items', JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  // Build all items lookup map for Pinned section
  const allNavItems = useMemo(() => {
    const list: Array<{ label: string; href: string; icon: string }> = [];
    visibleSections.forEach((s) => s.items.forEach((item) => list.push(item)));
    return list;
  }, [visibleSections]);


  const pinnedItems = useMemo(() => {
    return pinnedHrefs
      .map((href) => allNavItems.find((item) => item.href === href))
      .filter(Boolean) as Array<{ label: string; href: string; icon: string }>;
  }, [pinnedHrefs, allNavItems]);

  // Drag & drop reorder state for pinned items
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setPinnedHrefs((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, removed);
      try {
        localStorage.setItem('sq_sidebar_pinned_items', JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
    setDraggedIndex(null);
  };

  const handleNavScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 8);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 16);
  }, []);

  useEffect(() => {
    // Check on mount and when collapsed changes
    const t = setTimeout(handleNavScroll, 100);
    return () => clearTimeout(t);
  }, [collapsed, handleNavScroll]);

  return (
    <motion.aside
      className="hidden md:flex flex-col h-screen bg-white/95 dark:bg-[var(--card-bg)] backdrop-blur-2xl border-r border-indigo-100/80 dark:border-[var(--card-border)] fixed left-0 top-0 z-40 overflow-hidden shadow-[4px_0_24px_-4px_rgba(124,58,237,0.06)] dark:shadow-none"
      animate={{ width: collapsed ? 72 : 292 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeInOut' }}
    >
      {/* Header - Avatar + Profile */}
      <div className="p-4 border-b-2 border-[var(--card-border)]">
        <div className="flex items-center gap-3">
          {/* Avatar with level-based border */}
          <div className="relative flex-shrink-0">
            <AvatarBorder level={gamification?.level || 0} size={40}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                  🦉
                </div>
              )}
            </AvatarBorder>
            {gamification && (
              <div className="absolute -bottom-1 -right-1">
                <LevelBadge level={gamification.level} size="sm" />
              </div>
            )}
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                className="min-w-0 flex-1"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm font-heading font-bold truncate">
                  {profile?.displayName || 'Adventurer'}
                </p>
                {profile?.equippedTitle && (() => {
                  const t = TITLES.find((x) => x.id === profile.equippedTitle);
                  return t ? (
                    <p className="text-[9px] font-bold text-primary truncate">
                      {t.emoji} {t.name}
                    </p>
                  ) : null;
                })()}
                {gamification && (
                  <div className="flex items-center gap-2">
                    <StreakCounter streak={gamification.streak} size="sm" />
                    <span className="text-[10px] font-semibold text-primary-light">
                      {gamification.xp} XP
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* XP Bar */}
        <AnimatePresence>
          {!collapsed && gamification && (
            <motion.div
              className="mt-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <XPBar xp={gamification.xp} size="sm" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Questie Mascot — always visible */}
      <div className="px-3 py-2 border-b border-[var(--card-border)]">
        <QuestieMascot collapsed={collapsed} />
      </div>

      {/* Navigation with scroll indicators */}
      <div className="flex-1 relative min-h-0 flex flex-col">

        {/* Top scroll fade */}
        <div
          className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[var(--card-bg)] to-transparent z-10 pointer-events-none transition-opacity duration-300"
          style={{ opacity: canScrollUp ? 1 : 0 }}
        />

        <nav
          ref={navRef}
          onScroll={handleNavScroll}
          className="flex-1 overflow-y-auto py-2 px-2.5 space-y-3.5 mt-0.5 sq-sidebar-scroll scroll-smooth relative"
        >
          {/* Pinned Favorites Quick-Access Hub */}
          {pinnedItems.length > 0 && (
            <div id="sidebar-sec-pinned" className="pb-2 border-b border-[var(--card-border)]/60 scroll-mt-2">
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    className="flex items-center justify-between px-2 mb-1.5 cursor-pointer select-none"
                    onClick={togglePinnedCollapsed}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    title="Click to collapse/expand Pinned Hub"
                  >
                    <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-amber-400 flex items-center gap-1.5 hover:text-amber-300 transition-colors">
                      <span>📌</span> Pinned Hub
                      <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-400/15 text-amber-300">
                        {pinnedItems.length}
                      </span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-mono text-slate-500">
                        {pinnedCollapsed ? 'Tap to view' : 'Drag ⠿ to reorder'}
                      </span>
                      <HiChevronDown
                        className={`text-xs text-slate-400 transition-transform duration-200 ${
                          pinnedCollapsed ? '-rotate-90' : ''
                        }`}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {(!pinnedCollapsed || collapsed) && (
                <div className="space-y-0.5">
                {pinnedItems.map((item, idx) => {
                  const Icon = iconMap[item.icon];
                  const isActive = pathname === item.href;
                  const isDragging = draggedIndex === idx;

                  return (
                    <div
                      key={`pinned-${item.href}`}
                      draggable={!collapsed}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={() => setDraggedIndex(null)}
                      className={`transition-opacity ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}`}
                    >
                      <Link
                        href={item.href}
                        className={`
                          flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold
                          transition-all duration-200 relative group cursor-pointer
                          ${isActive
                            ? 'text-white'
                            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/40'
                          }
                        `}
                      >
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-amber-500/80 to-primary/80 rounded-xl shadow-[0_4px_0_rgba(217,119,6,0.3)]"
                            layoutId="sidebar-pinned-active"
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                          {!collapsed && (
                            <span className="opacity-0 group-hover:opacity-60 text-[10px] text-slate-400 cursor-grab active:cursor-grabbing select-none">
                              ⠿
                            </span>
                          )}
                          <span className="flex-shrink-0">
                            {Icon && <Icon size={17} />}
                          </span>
                          {!collapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>

                        {!collapsed && (
                          <button
                            onClick={(e) => togglePin(item.href, e)}
                            className="relative z-10 opacity-0 group-hover:opacity-100 text-amber-400 hover:text-amber-300 transition-opacity p-0.5"
                            title="Unpin from favorites"
                          >
                            ★
                          </button>
                        )}
                      </Link>
                    </div>
                  );
                })}
                {/* Close pinned items container */}
                </div>
              )}
            </div>
          )}

          {/* Categorized Collapsible Sections */}
          {visibleSections.map((section) => {
            const isSectionCollapsed = !!collapsedSections[section.title];

            return (
              <div key={section.title} id={`sidebar-sec-${section.title}`} className="space-y-1 scroll-mt-2">
                <AnimatePresence>
                  {!collapsed && (
                    <motion.button
                      onClick={() => toggleSection(section.title)}
                      className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer rounded-lg hover:bg-surface-hover/50 group"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs">{SECTION_META[section.title]?.emoji || '📁'}</span>
                        <span className="group-hover:text-primary transition-colors">{section.title}</span>
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700 dark:bg-slate-800 dark:text-slate-400 font-bold">
                          {section.items.length}
                        </span>
                      </span>
                      <HiChevronDown
                        className={`text-xs transition-transform duration-200 ${
                          isSectionCollapsed ? '-rotate-90' : ''
                        }`}
                      />
                    </motion.button>
                  )}
                </AnimatePresence>

                {(!isSectionCollapsed || collapsed) && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = iconMap[item.icon];
                      const isActive = pathname === item.href;
                      const isPinned = pinnedHrefs.includes(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`
                            flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold
                            transition-all duration-200 relative group
                            ${isActive
                              ? 'text-white'
                              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/40'
                            }
                          `}
                        >
                          {/* Active pill with 3D shadow effect */}
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl shadow-[0_4px_0_rgba(88,28,135,0.3)]"
                              layoutId="sidebar-active"
                              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                          )}

                          <div className="flex items-center gap-3 min-w-0 relative z-10">
                            <span className="flex-shrink-0">
                              {Icon && <Icon size={20} />}
                            </span>

                            <AnimatePresence>
                              {!collapsed && (
                                <motion.span
                                  className="truncate"
                                  initial={{ opacity: 0, width: 0 }}
                                  animate={{ opacity: 1, width: 'auto' }}
                                  exit={{ opacity: 0, width: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  {item.label}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>

                          {!collapsed && (
                            <button
                              onClick={(e) => togglePin(item.href, e)}
                              className={`relative z-10 p-0.5 text-xs transition-all ${
                                isPinned
                                  ? 'text-amber-400 opacity-80 hover:opacity-100'
                                  : 'text-slate-500 opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:text-amber-400'
                              }`}
                              title={isPinned ? 'Unpin tool' : 'Pin tool to top'}
                            >
                              {isPinned ? '★' : '☆'}
                            </button>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom scroll fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--card-bg)] via-[var(--card-bg)]/80 to-transparent z-10 pointer-events-none transition-opacity duration-300"
          style={{ opacity: canScrollDown ? 1 : 0 }}
        />

        {/* Tactile Floating "Scroll Down" Pill Cue */}
        <AnimatePresence>
          {!collapsed && canScrollDown && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 10, x: '-50%' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToNextSection}
              className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-25 px-3 py-1 rounded-full bg-slate-900/95 dark:bg-slate-950/95 border border-primary/40 shadow-[0_4px_16px_rgba(124,58,237,0.35)] backdrop-blur-md text-[10px] font-bold text-slate-200 flex items-center gap-1.5 hover:border-primary hover:text-white transition-all cursor-pointer group"
              title="Click to scroll down to more sections"
            >
              <span className="text-primary-light animate-bounce text-xs leading-none">↓</span>
              <span>More tools below</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Consolidated Compact Bottom Command Dock */}
      <div className="p-2 border-t border-indigo-100/80 dark:border-[var(--card-border)] bg-white/95 dark:bg-[var(--card-bg)]/90 backdrop-blur-sm shrink-0">
        {!collapsed ? (
          <div className="space-y-1.5">
            {/* Search & Ask Questie Row */}
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-indigo-100/80 dark:border-[var(--card-border)] bg-indigo-50/40 dark:bg-[var(--card-bg)] hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-2 group cursor-pointer"
            >
              <HiSparkles size={13} className="text-primary/70 group-hover:text-primary transition-colors" />
              <span className="text-[11px] text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors flex-1 text-left truncate">
                Search & Ask Questie...
              </span>
              <kbd className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-[var(--background)] border border-[var(--card-border)] text-[var(--muted-foreground)] font-mono">
                Ctrl+K
              </kbd>
            </button>

            {/* Actions Strip: Settings, Log Out & Hide Sidebar close together */}
            <div className="flex items-center justify-between gap-1 pt-0.5">
              <div className="flex items-center gap-1">
                <Link
                  href="/settings"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    pathname === '/settings'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/50'
                  }`}
                  title="Settings"
                >
                  <HiCog size={15} />
                  <span className="text-[11px]">Settings</span>
                </Link>

                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--muted-foreground)] hover:text-coral hover:bg-coral/10 transition-all cursor-pointer"
                  title="Log Out"
                >
                  <HiLogout size={15} />
                  <span className="text-[11px]">Log Out</span>
                </button>
              </div>

              {/* Hide Sidebar toggle */}
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/50 transition-all cursor-pointer flex items-center gap-1"
                title="Hide Sidebar"
                aria-label="Hide sidebar"
              >
                <HiChevronLeft size={16} />
                <span className="text-[10px] hidden xl:inline text-slate-500 font-mono">Hide</span>
              </button>
            </div>
          </div>
        ) : (
          /* Collapsed Icons Column */
          <div className="flex flex-col items-center gap-1.5 py-0.5">
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
              }}
              className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-primary hover:bg-primary/10 transition-colors"
              title="Search / Ask Questie (Ctrl+K)"
            >
              <HiSparkles size={18} />
            </button>

            <Link
              href="/settings"
              className={`p-2 rounded-xl transition-colors ${
                pathname === '/settings'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/50'
              }`}
              title="Settings"
            >
              <HiCog size={18} />
            </Link>

            <button
              onClick={() => signOut()}
              className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-coral hover:bg-coral/10 transition-colors"
              title="Log Out"
            >
              <HiLogout size={18} />
            </button>

            <button
              onClick={() => setCollapsed(false)}
              className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/50 transition-colors"
              title="Expand Sidebar"
              aria-label="Expand sidebar"
            >
              <HiChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
