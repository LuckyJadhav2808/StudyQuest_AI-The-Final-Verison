'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'coral' | 'teal' | 'amber' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const is3D = ['primary', 'coral', 'teal', 'amber'].includes(variant);

  const baseClasses = clsx(
    'relative inline-flex items-center justify-center gap-2 font-heading font-bold rounded-lg',
    'cursor-pointer select-none transition-all duration-150 focus-ring',
    fullWidth && 'w-full',
    (disabled || loading) && 'opacity-60 cursor-not-allowed',
    // Size
    size === 'sm' && 'px-3 py-1.5 text-xs',
    size === 'md' && 'px-5 py-2.5 text-sm',
    size === 'lg' && 'px-7 py-3 text-base',
    size === 'xl' && 'px-9 py-3.5 text-lg',
    // Variant
    is3D && `btn-3d btn-3d-${variant}`,
    variant === 'ghost' && 'bg-transparent hover:bg-surface-500/20 text-foreground',
    variant === 'outline' && 'bg-transparent border-2 border-primary text-primary hover:bg-primary/10',
    className,
  );

  return (
    <motion.button
      className={baseClasses}
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="text-lg">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}
