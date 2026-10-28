'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiHome, HiClipboardCheck, HiPencilAlt, HiClock,
  HiShoppingCart, HiChatAlt2, HiBookOpen, HiDotsHorizontal,
  HiCog, HiLogout, HiAcademicCap, HiCalendar, HiPencil,
  HiChartBar, HiHeart, HiSparkles, HiBeaker, HiUserGroup,
  HiDatabase, HiCode, HiTerminal, HiCubeTransparent, HiBookmark,
  HiShieldCheck, HiCollection, HiX,
} from 'react-icons/hi';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { getAvatarUrl, ADMIN_EMAILS } from '@/lib/constants';

// Primary quick-dock navigation items matching wireframe rail
const PRIMARY_NAV = [
  { label: 'Dashboard', href: '/', icon: HiHome },
  { label: 'Quest Log', href: '/tasks', icon: HiClipboardCheck },
  { label: 'Notes & Scrolls', href: '/notes', icon: HiPencilAlt },
  { label: 'Doc Studio', href: '/reader', icon: HiBookOpen },
  { label: 'Focus Timer', href: '/timer', icon: HiClock },
  { label: 'Item Shop', href: '/shop', icon: HiShoppingCart },
  { label: 'Questie AI', href: '/chat', icon: HiChatAlt2 },
];

// Categorized extended tools for the "More Tools" drawer
const EXTENDED_TOOLS = [
  {
    category: 'Study Sanctuary',
    items: [
      { label: 'Timetable', href: '/timetable', icon: HiCalendar, desc: 'Weekly schedule & classes' },
      { label: 'Resources', href: '/resources', icon: HiCollection, desc: 'Study packs & links' },
      { label: 'Whiteboard', href: '/whiteboard', icon: HiPencil, desc: 'Freehand canvas & diagrams' },
      { label: 'Hall of Fame', href: '/analytics', icon: HiChartBar, desc: 'XP stats & rankings' },
      { label: 'Exam Countdown', href: '/exams', icon: HiAcademicCap, desc: 'Milestones & tests' },
    ],
  },
  {
    category: 'Companions & RPG',
    items: [
      { label: 'My Pet Companion', href: '/pets', icon: HiHeart, desc: 'Evolve & care for pixel pets' },
      { label: 'Alchemy Lab', href: '/alchemy', icon: HiBeaker, desc: 'Transmute rewards & potions' },
      { label: 'Skill Tree', href: '/skills', icon: HiSparkles, desc: 'Unlock student mastery perks' },
      { label: 'Study Guilds', href: '/groups', icon: HiUserGroup, desc: 'Collaborate with friends' },
    ],
  },
  {
    category: 'Dev Forge Studio',
    items: [
      { label: 'DSA Dungeon', href: '/dsa', icon: HiCubeTransparent, desc: 'LeetCode & algorithm arena' },
      { label: 'Code Arena IDE', href: '/ide', icon: HiTerminal, desc: 'Web IDE & project workspace' },
      { label: 'Data Forge (Colab)', href: '/notebook', icon: HiTerminal, desc: 'Interactive Jupyter notebooks' },
      { label: 'SQL Lab', href: '/sql', icon: HiDatabase, desc: 'Database query challenges' },
      { label: 'ML Academy', href: '/ml', icon: HiAcademicCap, desc: 'Machine learning fundamentals' },
      { label: 'Code Runner', href: '/code', icon: HiCode, desc: 'Instant multi-language runtime' },
      { label: 'Spell Book', href: '/snippets', icon: HiBookmark, desc: 'Saved code snippets' },
      { label: 'Typing Arcade', href: '/arcade', icon: HiSparkles, desc: 'Speed typing mini-games' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuthContext();
  const { gamification } = useGamification();

  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const avatarUrl = profile
    ? getAvatarUrl(profile.avatarSeed, profile.avatarStyle)
    : '';

  const isAdmin = profile?.email && ADMIN_EMAILS.includes(profile.email);

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
    <>
      <aside className="w-13 sm:w-16 h-full flex flex-col justify-between items-center py-3 px-1 rounded-[24px] sm:rounded-[28px] bg-slate-900/90 dark:bg-white/[0.05] border border-slate-700/80 dark:border-white/12 shadow-lg select-none relative z-20 flex-shrink-0">
        {/* Top/Middle Navigation Column */}
        <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-white/10'
                }`}
                title={item.label}
              >
                <Icon size={18} className="sm:text-xl transition-transform group-hover:scale-110" />

                {/* Floating tooltip */}
                <span className="pointer-events-none absolute left-full ml-3.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-50 hidden sm:inline-block">
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -left-1 w-1.5 h-3.5 rounded-r-full bg-white shadow-xs" />
                )}
              </Link>
            );
          })}

          <div className="w-6 h-[1px] bg-slate-700/70 dark:bg-white/15 my-0.5" />

          {/* Questie Mascot Quick-Trigger */}
          <motion.button
            onClick={() => router.push('/chat')}
            whileHover={{ scale: 1.12, rotate: 6 }}
            whileTap={{ scale: 0.9 }}
            className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500/20 via-pink-500/20 to-violet-500/20 hover:from-amber-500/30 hover:to-violet-500/30 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-sm cursor-pointer group"
            title="Ask Questie AI (Click to open chat)"
          >
            <span className="text-base sm:text-lg">✨</span>
            <span className="pointer-events-none absolute left-full ml-3.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-50 hidden sm:inline-block">
              Questie AI Assistant
            </span>
          </motion.button>

          {/* More Tools Drawer Trigger */}
          <motion.button
            onClick={() => setShowToolsDrawer(true)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer group"
            title="All 20+ StudyQuest Tools & Modules"
          >
            <HiDotsHorizontal size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="pointer-events-none absolute left-full ml-3.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-50 hidden sm:inline-block">
              More Tools...
            </span>
          </motion.button>
        </div>

        {/* Bottom Slot: Circular Profile Avatar & Settings Button (rounded-full) */}
        <div className="relative" ref={profileMenuRef}>
          <motion.button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 border-2 border-violet-500/80 hover:border-violet-400 overflow-hidden bg-slate-800 flex items-center justify-center cursor-pointer shadow-md transition-all group"
            title="User Profile & Settings"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <span className="text-xs font-bold text-white">
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
                className="absolute bottom-0 left-full ml-3 w-56 p-3 rounded-2xl bg-slate-900/95 dark:bg-[#151821] border border-slate-700 dark:border-white/15 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-2.5 select-text"
              >
                {/* User Info Header */}
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-700/60 dark:border-white/10">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      profile?.displayName?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {profile?.displayName || 'Adventurer'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {profile?.email || 'Student Explorer'}
                    </p>
                  </div>
                </div>

                {/* Level / Title Capsule */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-800/60 dark:bg-white/[0.04] border border-slate-700/60 dark:border-white/10 text-[11px]">
                  <span className="font-semibold text-amber-400">⚡ Level {gamification?.level || 1}</span>
                  <span className="text-slate-400 font-mono">{gamification?.xp?.toLocaleString() || 0} XP</span>
                </div>

                {/* Menu Action Links */}
                <div className="flex flex-col gap-1">
                  <Link
                    href="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-white/10 transition-colors"
                  >
                    <HiCog size={15} />
                    <span>Settings & Preferences</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
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
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                  >
                    <HiLogout size={15} />
                    <span>Log Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Slide-over Drawer for All 20+ StudyQuest Tools */}
      <AnimatePresence>
        {showToolsDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-white"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
                    <HiCollection size={18} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold">StudyQuest Tool Suite</h3>
                    <p className="text-xs text-slate-400">All tools, labs, and sanctuaries in one place</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowToolsDrawer(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <HiX size={20} />
                </button>
              </div>

              {/* Categorized Tools Grid */}
              <div className="flex flex-col gap-5">
                {EXTENDED_TOOLS.map((sec) => (
                  <div key={sec.category} className="flex flex-col gap-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">
                      {sec.category}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sec.items.map((it) => {
                        const Icon = it.icon;
                        return (
                          <Link
                            key={it.href}
                            href={it.href}
                            onClick={() => setShowToolsDrawer(false)}
                            className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-violet-500/50 transition-all group"
                          >
                            <div className="p-2 rounded-lg bg-slate-700 group-hover:bg-violet-600 transition-colors text-white">
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold group-hover:text-violet-300 transition-colors">
                                {it.label}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {it.desc}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
