'use client';

import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'coral' | 'teal' | 'amber' | 'sky' | 'pink' | 'muted';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const variantClasses = {
  primary: 'bg-primary/15 text-primary-light border-primary/20',
  coral: 'bg-coral/15 text-coral border-coral/20',
  teal: 'bg-teal/15 text-teal border-teal/20',
  amber: 'bg-amber/15 text-amber-dark dark:text-amber border-amber/20',
  sky: 'bg-sky/15 text-sky-dark dark:text-sky border-sky/20',
  pink: 'bg-pink/15 text-pink-dark dark:text-pink border-pink/20',
  muted: 'bg-[var(--muted)]/50 text-[var(--muted-foreground)] border-[var(--muted)]',
};

export default function Badge({
  children,
  variant = 'primary',
  size = 'sm',
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-semibold border rounded-full',
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-3 py-1 text-xs',
        variantClasses[variant],
        className,
      )}
    >
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full',
          variant === 'primary' && 'bg-primary',
          variant === 'coral' && 'bg-coral',
          variant === 'teal' && 'bg-teal',
          variant === 'amber' && 'bg-amber',
          variant === 'sky' && 'bg-sky',
          variant === 'pink' && 'bg-pink',
          variant === 'muted' && 'bg-[var(--muted-foreground)]',
        )} />
      )}
      {children}
    </span>
  );
}
