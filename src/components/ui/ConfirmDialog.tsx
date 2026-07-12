'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const iconMap = {
    danger: '🗑️',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const colorMap = {
    danger: 'from-red-500 to-rose-600',
    warning: 'from-amber-500 to-orange-600',
    info: 'from-blue-500 to-indigo-600',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            className="relative w-full max-w-sm rounded-2xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] shadow-2xl p-6"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[variant]} flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg`}>
              {iconMap[variant]}
            </div>

            <h3 className="text-lg font-heading font-black text-center mb-2">{title}</h3>
            <p className="text-sm text-[var(--muted-foreground)] text-center mb-6 leading-relaxed">{message}</p>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r ${colorMap[variant]} text-white font-heading font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
              >
                {loading ? 'Processing...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
