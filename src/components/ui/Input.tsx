'use client';

import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-[var(--foreground)] opacity-80"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-lg border bg-[var(--card-bg)] border-[var(--card-border)]',
              'px-4 py-2.5 text-sm text-[var(--foreground)]',
              'placeholder:text-[var(--muted-foreground)]',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
              'transition-all duration-200',
              icon && 'pl-10',
              error && 'border-coral ring-1 ring-coral/30',
              className,
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-coral font-medium">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
