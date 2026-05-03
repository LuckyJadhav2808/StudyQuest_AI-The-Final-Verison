'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HiSun, HiMoon, HiBell, HiSearch } from 'react-icons/hi';
import { useTheme } from '@/context/ThemeContext';
import { useGamification } from '@/hooks/useGamification';
import { useFriends } from '@/hooks/useFriends';
import StreakCounter from '@/components/gamification/StreakCounter';
import LevelBadge from '@/components/gamification/LevelBadge';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { gamification } = useGamification();
  const { incomingRequests } = useFriends();
  const router = useRouter();

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <header className="h-16 bg-[var(--card-bg)]/80 backdrop-blur-lg border-b border-[var(--card-border)] flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      {/* Left — Page title area */}
      <div className="flex items-center gap-3">
        <motion.h1
          className="text-lg md:text-xl font-heading font-black text-gradient"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          StudyQuest
        </motion.h1>

        {/* Ctrl+K Search Hint */}
        <button
          onClick={openCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--card-border)] hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer"
        >
          <HiSearch size={13} className="text-[var(--muted-foreground)] group-hover:text-primary transition-colors" />
          <span className="text-[11px] text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">
            Ask Questie...
          </span>
          <kbd className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[var(--background)] border border-[var(--card-border)] text-[var(--muted-foreground)]">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right — Stats & Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Streak */}
        {gamification && (
          <StreakCounter streak={gamification.streak} size="sm" />
        )}

        {/* XP Badge */}
        {gamification && (
          <motion.div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-[11px] font-bold text-primary-light">
              {gamification.xp.toLocaleString()} XP
            </span>
          </motion.div>
        )}

        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-[var(--muted)]/30 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9, rotate: 180 }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <HiSun size={20} /> : <HiMoon size={20} />}
        </motion.button>

        {/* Notifications — navigates to Dashboard */}
        <motion.button
          onClick={() => router.push('/')}
          className="p-2 rounded-xl hover:bg-[var(--muted)]/30 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors relative"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Notifications"
        >
          <HiBell size={20} />
          {incomingRequests.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-coral text-white text-[8px] font-bold flex items-center justify-center">{incomingRequests.length}</span>
          )}
        </motion.button>

        {/* Avatar (Mobile + Desktop) */}
        <div className="md:hidden">
          {gamification && <LevelBadge level={gamification.level} size="sm" />}
        </div>
      </div>
    </header>
  );
}
