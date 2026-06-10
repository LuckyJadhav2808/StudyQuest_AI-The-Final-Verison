'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface PageTransitionProps {
  children: React.ReactNode;
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

export default function PageTransition({ children }: PageTransitionProps) {
  const { reduceMotion } = useTheme();

  if (reduceMotion) {
    return <>{children}</>;
  }

  // Wrap each direct child in a motion.div for staggered entry
  const childArray = React.Children.toArray(children);

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      {childArray.map((child, i) => (
        <motion.div key={i} variants={childVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
