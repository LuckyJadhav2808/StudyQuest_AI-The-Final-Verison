'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiArrowUp } from 'react-icons/hi';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target) {
        const scrollTop = target.scrollTop || window.scrollY || document.documentElement.scrollTop;
        setVisible(scrollTop > 300);
      }
    };
    // Use capture: true so that we hear scrolls bubbling up from scrollable child containers (like <main>)
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', onScroll, { capture: true });
  }, []);

  const handleScrollToTop = () => {
    // Scroll the main content div which has overflow-y-auto
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Fallback for window scroll
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={handleScrollToTop}
          className="fixed bottom-20 left-4 md:left-auto md:bottom-6 md:right-20 z-30 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all cursor-pointer"
          aria-label="Scroll to top"
        >
          <HiArrowUp size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
