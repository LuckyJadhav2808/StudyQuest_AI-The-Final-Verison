'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  glass?: boolean;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  gradient?: string;
}

export default function Card({
  children,
  glass = true,
  hover = true,
  padding = 'md',
  gradient,
  className,
  ...props
}: CardProps) {
  return (
    <motion.div
      className={clsx(
        'rounded-xl overflow-hidden',
        glass && 'card-glass',
        !glass && 'bg-[var(--card-bg)] border border-[var(--card-border)]',
        hover && 'hover:shadow-lg',
        padding === 'sm' && 'p-3',
        padding === 'md' && 'p-5',
        padding === 'lg' && 'p-7',
        padding === 'none' && 'p-0',
        className,
      )}
      style={gradient ? { background: gradient } : undefined}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
