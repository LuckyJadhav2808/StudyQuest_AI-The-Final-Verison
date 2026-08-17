'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiFire } from 'react-icons/hi';

interface StreakCounterProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function StreakCounter({ streak, size = 'md' }: StreakCounterProps) {
  const sizes = {
    sm: { icon: 13, text: 'text-xs', gap: 'gap-1', padding: 'px-2 py-0.5' },
    md: { icon: 16, text: 'text-sm', gap: 'gap-1.5', padding: 'px-2.5 py-1' },
    lg: { icon: 22, text: 'text-base', gap: 'gap-2', padding: 'px-3 py-1.5' },
  };

  const s = sizes[size];
  const rawStreak = streak as any;
  const numericStreak = typeof rawStreak === 'number'
    ? rawStreak
    : typeof rawStreak === 'object' && rawStreak && 'bc' in rawStreak
    ? Number(rawStreak.bc) || 0
    : 0;
  const isActive = numericStreak > 0;

  return (
    <motion.div
      className={`inline-flex items-center ${s.gap} ${s.padding} rounded-full bg-orange-500/10 border border-orange-500/25 font-heading font-black shadow-sm flex-shrink-0 select-none`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`${numericStreak} Day Study Streak 🔥`}
    >
      <motion.div
        animate={isActive ? {
          scale: [1, 1.15, 1],
        } : undefined}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="flex-shrink-0"
      >
        <HiFire
          size={s.icon}
          className={isActive ? 'text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]' : 'text-[var(--muted-foreground)]'}
        />
      </motion.div>
      <span className={`${s.text} ${isActive ? 'text-orange-400 font-mono' : 'text-[var(--muted-foreground)]'}`}>
        {numericStreak}
      </span>
    </motion.div>
  );

}
