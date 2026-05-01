'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACHIEVEMENTS } from '@/lib/constants';

interface AchievementToastProps {
  achievementId: string | null;
  onClose: () => void;
}

export default function AchievementToast({ achievementId, onClose }: AchievementToastProps) {
  const achievement = achievementId
    ? ACHIEVEMENTS.find((a) => a.id === achievementId)
    : null;

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          className="fixed top-6 right-6 z-[200] max-w-sm"
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="card-glass rounded-2xl p-4 shadow-2xl border-2 border-amber/30">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <motion.span
                className="text-4xl"
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6 }}
              >
                {achievement.icon}
              </motion.span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-amber mb-0.5">
                  🏆 Achievement Unlocked!
                </p>
                <h4 className="text-sm font-heading font-bold text-[var(--foreground)] truncate">
                  {achievement.title}
                </h4>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {achievement.description}
                </p>
                <p className="text-[10px] font-bold text-primary-light mt-1">
                  +{achievement.xpReward} XP
                </p>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
