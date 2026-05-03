'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiHome, HiClipboardCheck, HiPencilAlt, HiLightningBolt,
  HiClock, HiCalendar, HiChatAlt2, HiChartBar,
  HiUserGroup, HiDatabase, HiCode, HiCubeTransparent,
  HiBookmark, HiCog, HiChevronLeft, HiChevronRight,
  HiLogout, HiSparkles, HiCollection, HiTerminal,
} from 'react-icons/hi';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { getAvatarUrl } from '@/lib/constants';
import XPBar from '@/components/gamification/XPBar';
import LevelBadge from '@/components/gamification/LevelBadge';
import StreakCounter from '@/components/gamification/StreakCounter';

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  HiHome, HiClipboardCheck, HiPencilAlt, HiLightningBolt,
  HiClock, HiCalendar, HiChatAlt2, HiChartBar,
  HiUserGroup, HiDatabase, HiCode, HiCubeTransparent,
  HiBookmark, HiCog, HiSparkles, HiCollection, HiTerminal,
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
      { label: 'Quest Log', href: '/tasks', icon: 'HiClipboardCheck' },
      { label: 'Notes & Scrolls', href: '/notes', icon: 'HiPencilAlt' },
      { label: 'Daily Quests', href: '/habits', icon: 'HiLightningBolt' },
    ],
  },
  {
    title: 'Study Sanctuary',
    items: [
      { label: 'Focus Timer', href: '/timer', icon: 'HiClock' },
      { label: 'Timetable', href: '/timetable', icon: 'HiCalendar' },
      { label: 'Resources', href: '/resources', icon: 'HiCollection' },
      { label: 'Questie Chat', href: '/chat', icon: 'HiChatAlt2' },
      { label: 'Hall of Fame', href: '/analytics', icon: 'HiChartBar' },
    ],
  },
  {
    title: 'Guild',
    items: [
      { label: 'Study Groups', href: '/groups', icon: 'HiUserGroup' },
    ],
  },
  {
    title: 'Forge',
    items: [
      { label: 'SQL Lab', href: '/sql', icon: 'HiDatabase' },
      { label: 'Code Runner', href: '/code', icon: 'HiCode' },
      { label: 'Code Arena IDE', href: '/ide', icon: 'HiTerminal' },
      { label: 'DSA Dungeon', href: '/dsa', icon: 'HiCubeTransparent' },
      { label: 'Spell Book', href: '/snippets', icon: 'HiBookmark' },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { profile, signOut } = useAuthContext();
  const { gamification } = useGamification();

  const avatarUrl = profile
    ? getAvatarUrl(profile.avatarSeed, profile.avatarStyle)
    : '';

  return (
    <motion.aside
      className="hidden md:flex flex-col h-screen bg-[var(--card-bg)] border-r-2 border-[var(--card-border)] fixed left-0 top-0 z-40 overflow-hidden"
      animate={{ width: collapsed ? 72 : 272 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {/* Header - Questie mascot + Avatar */}
      <div className="p-4 border-b-2 border-[var(--card-border)]">
        <div className="flex items-center gap-3">
          {/* Avatar with level badge */}
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-10 h-10 rounded-full bg-surface-200 ring-2 ring-primary/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                🦉
              </div>
            )}
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

      {/* Questie speech bubble (only when expanded) */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="mx-3 mt-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="speech-bubble text-[11px]">
              🦉 Ready for a quest?
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4 mt-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  className="text-[9px] uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] px-3 mb-1.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {section.title}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
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

                    <span className="relative z-10 flex-shrink-0">
                      {Icon && <Icon size={20} />}
                    </span>

                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          className="relative z-10 truncate"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t-2 border-[var(--card-border)] space-y-0.5">
        <Link
          href="/settings"
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
            transition-all duration-200
            ${pathname === '/settings'
              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-[0_4px_0_rgba(88,28,135,0.3)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/40'
            }
          `}
        >
          <HiCog size={20} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--muted-foreground)] hover:text-coral hover:bg-coral/10 transition-all duration-200"
        >
          <HiLogout size={20} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Log Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-2 mx-2 mb-2 rounded-xl hover:bg-[var(--card-border)]/40 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex items-center justify-center"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <HiChevronRight size={18} /> : <HiChevronLeft size={18} />}
      </button>
    </motion.aside>
  );
}
