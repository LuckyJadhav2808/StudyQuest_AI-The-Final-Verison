'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const pageVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

// Each direct child of PageTransition gets this waterfall effect
const childVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: 'easeOut' as const,
    },
  },
};

export default function PageTransition({ children, className }: PageTransitionProps) {
  const { reduceMotion } = useTheme();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  // Wrap each direct child in a motion.div for staggered entry
  const childArray = React.Children.toArray(children);

  return (
    <motion.div
      className={className}
      variants={pageVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      {childArray.map((child, i) => (
        <motion.div key={i} variants={childVariants} className={className?.includes('h-full') ? 'h-full flex flex-col min-h-0' : undefined}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
