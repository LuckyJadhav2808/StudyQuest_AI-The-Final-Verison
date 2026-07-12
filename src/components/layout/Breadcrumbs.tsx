'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { HiChevronRight } from 'react-icons/hi';

const routeConfig: Record<string, { label: string; icon?: string }> = {
  '': { label: 'Base Camp', icon: '🏠' },
  'tasks': { label: 'Quest Log', icon: '📋' },
  'notes': { label: 'Notes & Scrolls', icon: '📝' },
  'habits': { label: 'Daily Quests', icon: '⚡' },
  'exams': { label: 'Exam Countdown', icon: '🎓' },
  'timer': { label: 'Focus Timer', icon: '⏱️' },
  'timetable': { label: 'Timetable', icon: '📅' },
  'resources': { label: 'Resources', icon: '📚' },
  'reader': { label: 'Doc Reader', icon: '📖' },
  'whiteboard': { label: 'Whiteboard', icon: '🎨' },
  'chat': { label: 'Questie Chat', icon: '💬' },
  'analytics': { label: 'Hall of Fame', icon: '📊' },
  'pets': { label: 'My Pet', icon: '❤️' },
  'shop': { label: 'Item Shop', icon: '🛒' },
  'alchemy': { label: 'Alchemy Lab', icon: '🧪' },
  'skills': { label: 'Skill Tree', icon: '✨' },
  'groups': { label: 'Study Groups', icon: '👥' },
  'sql': { label: 'SQL Lab', icon: '💾' },
  'code': { label: 'Code Runner', icon: '💻' },
  'ide': { label: 'Code Arena IDE', icon: '⚙️' },
  'dsa': { label: 'DSA Dungeon', icon: '⚔️' },
  'snippets': { label: 'Spell Book', icon: '📖' },
  'arcade': { label: 'Typing Arcade', icon: '🕹️' },
  'admin': { label: 'Admin Panel', icon: '🛡️' },
};

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  const segments = pathname.split('/').filter(Boolean);

  const breadcrumbItems = [
    { href: '/', label: 'Base Camp', icon: '🏠', isLast: segments.length === 0 },
    ...segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const config = routeConfig[segment] || {
        label: segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        icon: '📍',
      };
      return {
        href,
        label: config.label,
        icon: config.icon,
        isLast: index === segments.length - 1,
      };
    }),
  ];

  return (
    <nav className="flex items-center space-x-1.5 md:space-x-2 text-[11px] md:text-xs font-semibold text-[var(--muted-foreground)] mb-4 md:mb-5 select-none overflow-x-auto whitespace-nowrap scrollbar-none py-1">
      {breadcrumbItems.map((item, index) => {
        const isLast = item.isLast;

        return (
          <React.Fragment key={item.href}>
            {index > 0 && (
              <HiChevronRight className="text-[var(--muted-foreground)]/40 flex-shrink-0 w-3.5 h-3.5" />
            )}
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center"
            >
              {isLast ? (
                <span className="flex items-center gap-1 text-[var(--foreground)] font-bold bg-[var(--card-bg)] px-2.5 py-1 rounded-lg border border-[var(--card-border)] shadow-sm">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 hover:text-[var(--foreground)] hover:bg-[var(--muted)]/20 px-2.5 py-1 rounded-lg transition-all"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )}
            </motion.div>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
