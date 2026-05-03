'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiHome,
  HiClipboardCheck,
  HiClock,
  HiPencilAlt,
  HiX,
  HiMenu,
  HiLightningBolt,
  HiCalendar,
  HiChatAlt2,
  HiChartBar,
  HiUserGroup,
  HiDatabase,
  HiCode,
  HiTerminal,
  HiCubeTransparent,
  HiBookmark,
  HiCog,
  HiCollection,
} from 'react-icons/hi';

const MOBILE_QUICK = [
  { label: 'Home', href: '/', icon: HiHome },
  { label: 'Tasks', href: '/tasks', icon: HiClipboardCheck },
  { label: 'Timer', href: '/timer', icon: HiClock },
  { label: 'Notes', href: '/notes', icon: HiPencilAlt },
];

const ALL_NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: HiHome },
  { label: 'Quest Log', href: '/tasks', icon: HiClipboardCheck },
  { label: 'Notes & Scrolls', href: '/notes', icon: HiPencilAlt },
  { label: 'Daily Quests', href: '/habits', icon: HiLightningBolt },
  { label: 'Focus Timer', href: '/timer', icon: HiClock },
  { label: 'Timetable', href: '/timetable', icon: HiCalendar },
  { label: 'Resources', href: '/resources', icon: HiCollection },
  { label: 'Questie Chat', href: '/chat', icon: HiChatAlt2 },
  { label: 'Hall of Fame', href: '/analytics', icon: HiChartBar },
  { label: 'Study Groups', href: '/groups', icon: HiUserGroup },
  { label: 'SQL Lab', href: '/sql', icon: HiDatabase },
  { label: 'Code Runner', href: '/code', icon: HiCode },
  { label: 'Code Arena IDE', href: '/ide', icon: HiTerminal },
  { label: 'DSA Dungeon', href: '/dsa', icon: HiCubeTransparent },
  { label: 'Spell Book', href: '/snippets', icon: HiBookmark },
  { label: 'Settings', href: '/settings', icon: HiCog },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Full-screen overlay menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-[110] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            {/* Menu panel */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-[var(--card-bg)] rounded-t-3xl border-t-2 border-[var(--card-border)] max-h-[80vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[var(--muted)]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--card-border)]">
                <h3 className="font-heading font-bold text-lg">All Sections</h3>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-xl hover:bg-[var(--muted)]/20 transition-colors"
                >
                  <HiX size={20} />
                </button>
              </div>

              {/* Navigation grid */}
              <div className="grid grid-cols-3 gap-2 p-4">
                {ALL_NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-center transition-all ${
                        isActive
                          ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-lg'
                          : 'hover:bg-[var(--card-border)]/40'
                      }`}
                    >
                      <Icon
                        size={22}
                        className={isActive ? 'text-white' : 'text-[var(--muted-foreground)]'}
                      />
                      <span
                        className={`text-[10px] font-semibold leading-tight ${
                          isActive ? 'text-white' : 'text-[var(--muted-foreground)]'
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-[var(--card-bg)]/90 backdrop-blur-lg border-t border-[var(--card-border)]">
        <div className="flex items-center justify-around py-1.5 px-2">
          {MOBILE_QUICK.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-1 px-3 relative"
              >
                {isActive && (
                  <motion.div
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full"
                    layoutId="mobile-active"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon
                  size={22}
                  className={`transition-colors ${
                    isActive ? 'text-primary' : 'text-[var(--muted-foreground)]'
                  }`}
                />
                <span
                  className={`text-[9px] font-semibold transition-colors ${
                    isActive ? 'text-primary' : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button - opens full menu */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 relative"
          >
            <HiMenu
              size={22}
              className={`transition-colors ${
                menuOpen ? 'text-primary' : 'text-[var(--muted-foreground)]'
              }`}
            />
            <span
              className={`text-[9px] font-semibold transition-colors ${
                menuOpen ? 'text-primary' : 'text-[var(--muted-foreground)]'
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
