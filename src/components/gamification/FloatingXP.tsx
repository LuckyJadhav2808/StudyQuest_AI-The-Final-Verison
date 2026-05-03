'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   FloatingXP — Spawns a floating "+N XP" particle that drifts
   upward and fades out. Used when completing tasks/habits.
   ============================================================ */

interface XPParticle {
  id: number;
  amount: number;
  x: number;
  y: number;
}

let particleIdCounter = 0;

// Global event system for spawning XP particles from anywhere
const listeners: Set<(p: XPParticle) => void> = new Set();

export function spawnXP(amount: number, x?: number, y?: number) {
  const particle: XPParticle = {
    id: ++particleIdCounter,
    amount,
    x: x ?? window.innerWidth / 2,
    y: y ?? window.innerHeight / 2,
  };
  listeners.forEach((fn) => fn(particle));
}

/** Call this from click handlers to spawn XP at the click position */
export function spawnXPFromEvent(amount: number, event?: React.MouseEvent | MouseEvent) {
  if (event) {
    spawnXP(amount, event.clientX, event.clientY);
  } else {
    spawnXP(amount);
  }
}

export default function FloatingXPContainer() {
  const [particles, setParticles] = useState<XPParticle[]>([]);

  useEffect(() => {
    const handler = (p: XPParticle) => {
      setParticles((prev) => [...prev, p]);
      // Auto-remove after animation
      setTimeout(() => {
        setParticles((prev) => prev.filter((pp) => pp.id !== p.id));
      }, 1500);
    };

    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[300]">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute flex items-center gap-1"
            style={{ left: p.x, top: p.y }}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -80, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
          >
            <span className="text-lg font-heading font-black text-primary drop-shadow-[0_2px_4px_rgba(124,58,237,0.5)]">
              +{p.amount}
            </span>
            <span className="text-xs font-bold text-amber drop-shadow-[0_1px_2px_rgba(255,209,102,0.5)]">
              XP
            </span>
            {/* Sparkle dots */}
            {[...Array(3)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute w-1 h-1 rounded-full bg-amber"
                initial={{ opacity: 1, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  x: (Math.random() - 0.5) * 40,
                  y: -20 - Math.random() * 30,
                }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
