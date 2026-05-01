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
    sm: { icon: 14, text: 'text-xs', gap: 'gap-0.5' },
    md: { icon: 20, text: 'text-sm', gap: 'gap-1' },
    lg: { icon: 28, text: 'text-lg', gap: 'gap-1.5' },
  };

  const s = sizes[size];
  const isActive = streak > 0;

  return (
    <motion.div
      className={`inline-flex items-center ${s.gap} font-heading font-bold`}
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    >
      <motion.div
        animate={isActive ? {
          scale: [1, 1.2, 1],
          rotate: [0, -5, 5, 0],
        } : undefined}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <HiFire
          size={s.icon}
          className={isActive ? 'text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]' : 'text-[var(--muted-foreground)]'}
        />
      </motion.div>
      <span className={`${s.text} ${isActive ? 'text-orange-500' : 'text-[var(--muted-foreground)]'}`}>
        {streak}
      </span>
    </motion.div>
  );
}
