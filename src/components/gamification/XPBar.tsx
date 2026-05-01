'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { getLevelProgress, LEVEL_THRESHOLDS, getLevelFromXP } from '@/lib/constants';

interface XPBarProps {
  xp: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function XPBar({ xp, showLabel = true, size = 'md' }: XPBarProps) {
  const level = getLevelFromXP(xp);
  const progress = getLevelProgress(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level + 1] || LEVEL_THRESHOLDS[level];
  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;

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
      <div className={`xp-bar-track ${heights[size]}`}>
        <motion.div
          className="xp-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress * 100, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
