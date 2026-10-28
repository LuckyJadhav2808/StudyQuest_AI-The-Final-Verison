'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiHome, HiClipboardCheck, HiPencilAlt, HiLightningBolt,
  HiClock, HiCalendar, HiChatAlt2, HiChartBar,
  HiUserGroup, HiDatabase, HiCode, HiCubeTransparent,
  HiBookmark, HiCog, HiLogout, HiSparkles,
  HiAcademicCap, HiPencil, HiHeart, HiShoppingCart,
  HiShieldCheck, HiBookOpen, HiTerminal,
} from 'react-icons/hi';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { getAvatarUrl, ADMIN_EMAILS } from '@/lib/constants';
import QuestieMascot from '@/components/gamification/QuestieMascot';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  category: string;
  adminOnly?: boolean;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: HiHome, category: 'Main' },
  { label: 'Quest Log', href: '/tasks', icon: HiClipboardCheck, category: 'Quests' },
  { label: 'Notes & Scrolls', href: '/notes', icon: HiPencilAlt, category: 'Study' },
  { label: 'Daily Habits', href: '/habits', icon: HiLightningBolt, category: 'Habits' },
  { label: 'Focus Timer', href: '/timer', icon: HiClock, category: 'Focus' },
  { label: 'Doc Studio & Reader', href: '/reader', icon: HiBookOpen, category: 'Study' },
  { label: 'Whiteboard', href: '/whiteboard', icon: HiPencil, category: 'Creative' },
  { label: 'Questie AI Chat', href: '/chat', icon: HiChatAlt2, category: 'AI' },
  { label: 'Hall of Fame & Stats', href: '/analytics', icon: HiChartBar, category: 'Stats' },
  { label: 'Item Shop', href: '/shop', icon: HiShoppingCart, category: 'Shop' },
  { label: 'Companion Pet', href: '/pets', icon: HiHeart, category: 'Pet' },
  { label: 'Code Arena & IDE', href: '/ide', icon: HiTerminal, category: 'Forge' },
  { label: 'Syllabus Tracker', href: '/tracker', icon: HiAcademicCap, category: 'Study' },
  { label: 'Admin Panel', href: '/admin', icon: HiShieldCheck, category: 'Admin', adminOnly: true },
];

export default function Sidebar() {
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

  const visibleItems = useMemo(() => {
    return PRIMARY_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
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
      className="w-14 sm:w-16 h-full flex flex-col justify-between py-2 sm:py-3 px-1.5 rounded-[26px] sm:rounded-[30px] bg-white/95 dark:bg-[#111328]/95 border border-indigo-100/90 dark:border-white/10 shadow-[0_4px_24px_-4px_rgba(124,58,237,0.12)] select-none relative z-30 transition-all duration-200"
      aria-label="Navigation Rail"
    >
      {/* Top: Questie Mascot (Living Owl Companion) */}
      <div className="flex flex-col items-center flex-shrink-0 pb-2 border-b border-indigo-100/80 dark:border-white/10">
        <QuestieMascot collapsed={true} />
      </div>

      {/* Middle: Pure Icon Rail with Hover Tooltip Placeholders (No expanding boxes/names) */}
      <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-1.5 custom-scrollbar flex flex-col items-center">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <div key={item.href} className="relative group flex items-center justify-center w-full">
              <Link
                href={item.href}
                className={`relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/30 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-indigo-50/70 dark:hover:bg-white/[0.08]'
                }`}
                aria-label={item.label}
              >
                <Icon size={19} className="transition-transform group-hover:scale-110" />

                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -left-1 w-1 h-3.5 rounded-r-full bg-white shadow-xs" />
                )}
              </Link>

              {/* Floating Hover Tooltip / Placeholder (Shown on Hover only, No Emojis) */}
              <div
                role="tooltip"
                className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-[#161936]/95 border border-slate-700/80 dark:border-white/15 text-white text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-2xl backdrop-blur-md z-50 hidden sm:flex items-center gap-2"
              >
                <span>{item.label}</span>
                <span className="text-[9px] font-medium text-slate-400 font-mono uppercase tracking-wider">
                  {item.category}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Area: Circular Profile Avatar & Settings Quick Trigger */}
      <div className="pt-2 border-t border-indigo-100/80 dark:border-white/10 flex flex-col items-center gap-2 flex-shrink-0">
        {/* Settings Icon Button */}
        <div className="relative group flex items-center justify-center w-full">
          <Link
            href="/settings"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              pathname === '/settings'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white hover:bg-indigo-50/70 dark:hover:bg-white/[0.08]'
            }`}
            aria-label="Settings"
          >
            <HiCog size={18} className="transition-transform group-hover:rotate-45" />
          </Link>

          {/* Settings Tooltip */}
          <div
            role="tooltip"
            className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-[#161936]/95 border border-slate-700/80 dark:border-white/15 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-50 hidden sm:block"
          >
            Settings
          </div>
        </div>

        {/* Circular Profile Avatar in Sculpted Circular Cradle */}
        <div className="relative w-full flex justify-center py-0.5" ref={profileMenuRef}>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-0.5 bg-indigo-100/60 dark:bg-white/[0.06] border-2 border-primary/30 flex items-center justify-center shadow-inner">
            <motion.button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="w-full h-full rounded-full border-2 border-primary/80 hover:border-primary overflow-hidden bg-white dark:bg-[#111328] flex items-center justify-center cursor-pointer shadow-md transition-all group"
              title="User Profile & Settings"
              aria-label="Open profile menu"
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
          </div>

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
                  <span className="font-semibold text-amber-500">Level {gamification?.level || 1}</span>
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
