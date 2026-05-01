'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.span
        className="text-6xl mb-4"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {icon}
      </motion.span>
      <h3 className="text-xl font-heading font-bold mb-2 text-[var(--foreground)]">{title}</h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-sm mb-6">{description}</p>
      {action}
    </motion.div>
  );
}
