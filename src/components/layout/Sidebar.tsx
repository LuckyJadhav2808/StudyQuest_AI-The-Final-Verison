'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiHome, HiClipboardCheck, HiPencilAlt, HiLightningBolt,
  HiClock, HiCalendar, HiChatAlt2, HiChartBar,
  HiUserGroup, HiDatabase, HiCode, HiCubeTransparent,
  HiBookmark, HiCog, HiChevronLeft, HiChevronRight,
  HiLogout, HiSparkles, HiCollection, HiTerminal,
  HiAcademicCap, HiPencil, HiHeart, HiShoppingCart,
  HiBeaker, HiShieldCheck, HiBookOpen, HiDotsHorizontal,
  HiX,
} from 'react-icons/hi';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useSidebar } from '@/context/SidebarContext';
import { getAvatarUrl, ADMIN_EMAILS } from '@/lib/constants';
import QuestieMascot from '@/components/gamification/QuestieMascot';

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  HiHome, HiClipboardCheck, HiPencilAlt, HiLightningBolt,
  HiClock, HiCalendar, HiChatAlt2, HiChartBar,
  HiUserGroup, HiDatabase, HiCode, HiCubeTransparent,
  HiBookmark, HiCog, HiSparkles, HiCollection, HiTerminal,
  HiAcademicCap, HiPencil, HiHeart, HiShoppingCart,
  HiBeaker, HiShieldCheck, HiBookOpen,
};

const SECTION_META: Record<string, { emoji: string; short: string; color: string }> = {
  'Adventure': { emoji: '⚔️', short: 'Adventure', color: 'text-violet-500' },
  'Study Sanctuary': { emoji: '📚', short: 'Sanctuary', color: 'text-indigo-500' },
  'Companions': { emoji: '🐾', short: 'Companions', color: 'text-pink-500' },
  'Forge': { emoji: '⚡', short: 'Forge', color: 'text-emerald-500' },
  'Admin': { emoji: '🛡️', short: 'Admin', color: 'text-amber-500' },
};

const NAV_SECTIONS = [
  {
    title: 'Adventure',
    items: [
      { label: 'Dashboard', href: '/', icon: 'HiHome' },
      { label: 'Syllabus Tracker', href: '/tracker', icon: 'HiAcademicCap' },
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
      { label: 'Doc Studio & Reader', href: '/reader', icon: 'HiBookOpen' },
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
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuthContext();
  const { gamification } = useGamification();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const avatarUrl = profile
    ? getAvatarUrl(profile.avatarSeed, profile.avatarStyle)
    : '';

  const isAdmin = profile?.email && ADMIN_EMAILS.includes(profile.email);

  const visibleSections = useMemo(() => {
    return isAdmin ? NAV_SECTIONS : NAV_SECTIONS.filter((s) => s.title !== 'Admin');
  }, [isAdmin]);

  // Close profile menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  return (
    <aside
      className={`h-full flex flex-col justify-between py-2 sm:py-3 rounded-[26px] sm:rounded-[30px] bg-white/95 dark:bg-[#111328]/95 border border-indigo-100/90 dark:border-white/10 shadow-[0_4px_24px_-4px_rgba(124,58,237,0.12)] select-none relative z-20 transition-all duration-200 overflow-hidden ${
        collapsed ? 'w-14 sm:w-16 px-1.5' : 'w-60 sm:w-64 px-3'
      }`}
    >
      {/* Top: Questie Mascot (Living Owl Companion) */}
      <div className="flex flex-col items-center flex-shrink-0 pb-2 border-b border-indigo-100/80 dark:border-white/10">
        <QuestieMascot collapsed={collapsed} />
      </div>

      {/* Middle: Structured Navigation with all 4 authentic sections */}
      <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3 pr-0.5 custom-scrollbar">
        {visibleSections.map((sec) => {
          const meta = SECTION_META[sec.title] || { emoji: '📌', short: sec.title, color: 'text-primary' };
          return (
            <div key={sec.title} className="space-y-1">
              {/* Section Header */}
              {!collapsed ? (
                <div className="px-2 pt-1 pb-0.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1.5">
                    <span>{meta.emoji}</span>
                    <span>{sec.title}</span>
                  </span>
                  <span className="text-[9px] opacity-60 font-mono">{sec.items.length}</span>
                </div>
              ) : (
                <div className="flex justify-center py-1">
                  <span className="text-[11px]" title={sec.title}>{meta.emoji}</span>
                </div>
              )}

              {/* Section Items */}
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = iconMap[item.icon] || HiSparkles;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-2.5 px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                        isActive
                          ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-indigo-50/70 dark:hover:bg-white/[0.06]'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                      title={collapsed ? `${meta.emoji} ${item.label}` : undefined}
                    >
                      <Icon size={17} className="flex-shrink-0 transition-transform group-hover:scale-110" />

                      {!collapsed && (
                        <span className="truncate text-[11px] sm:text-xs">
                          {item.label}
                        </span>
                      )}

                      {/* Tooltip on collapsed rail */}
                      {collapsed && (
                        <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-white text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-50 hidden sm:inline-block">
                          {meta.emoji} {item.label}
                        </span>
                      )}

                      {/* Active indicator dot */}
                      {isActive && (
                        <span className="absolute -left-1 w-1 h-3.5 rounded-r-full bg-white shadow-xs" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Area: Expand/Collapse Rail Toggle & Circular Profile Button */}
      <div className="pt-2 border-t border-indigo-100/80 dark:border-white/10 flex flex-col items-center gap-2 flex-shrink-0">
        {/* Toggle Expand / Collapse Rail */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full py-1 rounded-xl text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white hover:bg-indigo-50/60 dark:hover:bg-white/[0.06] flex items-center justify-center gap-1 transition-colors cursor-pointer text-[10px] font-semibold"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Rail'}
        >
          {collapsed ? (
            <HiChevronRight size={16} />
          ) : (
            <span className="flex items-center gap-1">
              <HiChevronLeft size={16} />
              <span>Collapse Rail</span>
            </span>
          )}
        </button>

        {/* Circular Profile Avatar & Settings Button (rounded-full) */}
        <div className="relative w-full flex justify-center" ref={profileMenuRef}>
          <motion.button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 border-2 border-primary/80 hover:border-primary overflow-hidden bg-white dark:bg-[#111328] flex items-center justify-center cursor-pointer shadow-md transition-all group"
            title="User Profile & Settings"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <span className="text-xs font-bold text-primary">
                {profile?.displayName?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </motion.button>

          {/* Profile Quick Menu Popover */}
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 8 }}
                className="absolute bottom-0 left-full ml-3 w-56 p-3 rounded-2xl bg-white dark:bg-[#111328] border border-indigo-100 dark:border-white/15 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-2.5 select-text"
              >
                {/* User Info Header */}
                <div className="flex items-center gap-2.5 pb-2 border-b border-indigo-100 dark:border-white/10">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      profile?.displayName?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                      {profile?.displayName || 'Adventurer'}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                      {profile?.email || 'Student Explorer'}
                    </p>
                  </div>
                </div>

                {/* Level / Title Capsule */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-indigo-50/50 dark:bg-white/[0.04] border border-indigo-100 dark:border-white/10 text-[11px]">
                  <span className="font-semibold text-amber-500">⚡ Level {gamification?.level || 1}</span>
                  <span className="text-[var(--muted-foreground)] font-mono">{gamification?.xp?.toLocaleString() || 0} XP</span>
                </div>

                {/* Menu Action Links */}
                <div className="flex flex-col gap-1">
                  <Link
                    href="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-indigo-50/70 dark:hover:bg-white/10 transition-colors"
                  >
                    <HiCog size={15} />
                    <span>Settings & Preferences</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    >
                      <HiShieldCheck size={15} />
                      <span>Admin Control Center</span>
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      signOut();
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-coral hover:bg-coral/10 transition-colors cursor-pointer text-left"
                  >
                    <HiLogout size={15} />
                    <span>Log Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
