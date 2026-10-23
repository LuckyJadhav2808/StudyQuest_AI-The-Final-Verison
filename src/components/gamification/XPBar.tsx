'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { getLevelProgress, LEVEL_THRESHOLDS, getLevelFromXP } from '@/lib/constants';

interface XPBarProps {
  xp: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Module-level cache flag to ensure the fill bar only animates from 0 on the very first render
let hasAnimatedOnce = false;

export default function XPBar({ xp, showLabel = true, size = 'md' }: XPBarProps) {
  const level = getLevelFromXP(xp);
  const progress = getLevelProgress(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level + 1] || LEVEL_THRESHOLDS[level];
  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;

  React.useEffect(() => {
    hasAnimatedOnce = true;
  }, []);

  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
            Level {level}
          </span>
          <span className="text-[11px] font-bold text-primary-light">
            {xpInLevel} / {xpNeeded} XP
          </span>
        </div>
      )}
      <div className={`xp-bar-track ${heights[size]} relative overflow-hidden rounded-full`}>
        <motion.div
          className="xp-bar-fill relative overflow-hidden h-full rounded-full"
          initial={hasAnimatedOnce ? { width: `${Math.min(progress * 100, 100)}%` } : { width: 0 }}
          animate={{ width: `${Math.min(progress * 100, 100)}%` }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        >
          {/* Subtle Duolingo-style ambient shine highlight */}
          <motion.div
            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
            animate={{ x: ['-100%', '350%'] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
          />
        </motion.div>
      </div>
    </div>
  );
}
