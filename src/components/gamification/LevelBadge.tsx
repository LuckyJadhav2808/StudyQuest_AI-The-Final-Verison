'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  const sizes = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  return (
    <motion.div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-primary via-purple-500 to-coral flex items-center justify-center font-heading font-black text-white shadow-lg`}
      whileHover={{ scale: 1.15, rotate: 10 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      title={`Level ${level}`}
    >
      {level}
    </motion.div>
  );
}
