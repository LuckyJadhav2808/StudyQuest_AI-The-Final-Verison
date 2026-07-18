'use client';

import React, { forwardRef, useState } from 'react';
import clsx from 'clsx';
import { HiEye, HiEyeOff } from 'react-icons/hi';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, type, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordType = type === 'password';
    const finalType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

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
            type={finalType}
            className={clsx(
              'w-full rounded-lg border bg-[var(--card-bg)] border-[var(--card-border)]',
              'px-4 py-2.5 text-sm text-[var(--foreground)]',
              'placeholder:text-[var(--muted-foreground)]',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
              'transition-all duration-200',
              icon && 'pl-10',
              isPasswordType && 'pr-10',
              error && 'border-coral ring-1 ring-coral/30',
              className,
            )}
            {...props}
          />
          {isPasswordType && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus:outline-none"
            >
              {showPassword ? <HiEyeOff size={18} /> : <HiEye size={18} />}
            </button>
          )}
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
