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
  HiAcademicCap,
  HiPencil,
  HiSparkles,
  HiBeaker,
  HiShieldCheck,
  HiBookOpen,
  HiHeart,
  HiShoppingCart,
} from 'react-icons/hi';

const MOBILE_QUICK = [
  { label: 'Home', href: '/', icon: HiHome },
  { label: 'DSA', href: '/dsa', icon: HiCubeTransparent },
  { label: 'Timer', href: '/timer', icon: HiClock },
  { label: 'Notes', href: '/notes', icon: HiPencilAlt },
];

const MOBILE_SECTIONS = [
  {
    title: '⚔️ Adventure & Quests',
    items: [
      { label: 'Dashboard', href: '/', icon: HiHome },
      { label: 'Quest Log', href: '/tasks', icon: HiClipboardCheck },
      { label: 'Daily Habits', href: '/habits', icon: HiLightningBolt },
      { label: 'Exam Countdown', href: '/exams', icon: HiAcademicCap },
    ],
  },
  {
    title: '💻 Dev Forge Studio',
    items: [
      { label: 'DSA Dungeon', href: '/dsa', icon: HiCubeTransparent },
      { label: 'SQL Lab', href: '/sql', icon: HiDatabase },
      { label: 'Code Runner', href: '/code', icon: HiCode },
      { label: 'Code Arena IDE', href: '/ide', icon: HiTerminal },
      { label: 'Spell Book', href: '/snippets', icon: HiBookmark },
      { label: 'Typing Arcade', href: '/arcade', icon: HiSparkles },
    ],
  },
  {
    title: '🧠 Study Sanctuary',
    items: [
      { label: 'Notes & Scrolls', href: '/notes', icon: HiPencilAlt },
      { label: 'Focus Timer', href: '/timer', icon: HiClock },
      { label: 'Timetable', href: '/timetable', icon: HiCalendar },
      { label: 'Doc Reader', href: '/reader', icon: HiBookOpen },
      { label: 'Whiteboard', href: '/whiteboard', icon: HiPencil },
      { label: 'Questie AI Chat', href: '/chat', icon: HiChatAlt2 },
      { label: 'Analytics Hub', href: '/analytics', icon: HiChartBar },
      { label: 'Resources', href: '/resources', icon: HiCollection },
    ],
  },
  {
    title: '🐾 RPG Guild & Companions',
    items: [
      { label: 'My Pets', href: '/pets', icon: HiHeart },
      { label: 'Item Shop', href: '/shop', icon: HiShoppingCart },
      { label: 'Alchemy Lab', href: '/alchemy', icon: HiBeaker },
      { label: 'Skill Tree', href: '/skills', icon: HiSparkles },
      { label: 'Study Groups', href: '/groups', icon: HiUserGroup },
    ],
  },
  {
    title: '⚙️ Settings & System',
    items: [
      { label: 'Settings', href: '/settings', icon: HiCog },
      { label: 'Admin Panel', href: '/admin', icon: HiShieldCheck },
    ],
  },
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
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => setMenuOpen(false)}
            />
            {/* Menu panel */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[var(--card-bg)] rounded-t-3xl border-t-2 border-indigo-100/80 dark:border-[var(--card-border)] max-h-[82vh] overflow-y-auto shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1 rounded-full bg-indigo-200 dark:bg-[var(--muted)]/50" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-indigo-100/80 dark:border-[var(--card-border)] sticky top-0 bg-white/95 dark:bg-[var(--card-bg)]/95 backdrop-blur-sm z-10">
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">StudyQuest Hubs</h3>
                  <p className="text-[10px] text-indigo-700 dark:text-[var(--muted-foreground)]">All tools & academies</p>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-[var(--muted)]/20 text-slate-500 hover:text-slate-900 dark:text-[var(--muted-foreground)] dark:hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  <HiX size={20} />
                </button>
              </div>

              {/* Categorized Domain Sections */}
              <div className="p-4 space-y-4 pb-12">
                {MOBILE_SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)] px-1">
                      {section.title}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-center transition-all ${
                              isActive
                                ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20'
                                : 'bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-[var(--card-border)]/20 dark:hover:bg-[var(--card-border)]/50 border border-indigo-100 dark:border-[var(--card-border)]/40'
                            }`}
                          >
                            <Icon
                              size={20}
                              className={isActive ? 'text-white' : 'text-primary dark:text-primary-light'}
                            />
                            <span
                              className={`text-[10px] font-semibold leading-tight line-clamp-1 ${
                                isActive ? 'text-white' : 'text-slate-800 dark:text-[var(--foreground)]'
                              }`}
                            >
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar with iOS safe-area support */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-white/95 dark:bg-[var(--card-bg)]/90 backdrop-blur-xl border-t border-indigo-100/90 dark:border-[var(--card-border)] shadow-[0_-4px_20px_-4px_rgba(124,58,237,0.08)] pb-[env(safe-area-inset-bottom,0px)]">
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
