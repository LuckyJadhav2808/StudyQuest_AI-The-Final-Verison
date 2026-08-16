'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX } from 'react-icons/hi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className={`relative w-full ${maxWidth} card-glass rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--card-bg)]`}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-[var(--card-border)]">
                <h2 className="text-base sm:text-lg font-heading font-bold">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl hover:bg-[var(--muted)]/20 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 max-h-[75vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
