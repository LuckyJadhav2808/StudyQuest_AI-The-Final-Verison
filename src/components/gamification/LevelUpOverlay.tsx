'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGamification } from '@/hooks/useGamification';
import { playCelebration } from '@/lib/sounds';

/**
 * LevelUpOverlay — Cinematic full-screen overlay that triggers
 * when the user levels up. Shows a dramatic animation with confetti,
 * sound effects, and the new level number.
 */
export default function LevelUpOverlay() {
  const { gamification } = useGamification();
  const [showOverlay, setShowOverlay] = useState(false);
  const [displayLevel, setDisplayLevel] = useState(0);
  const prevLevelRef = useRef<number | null>(null);

  useEffect(() => {
    if (!gamification) return;

    const currentLevel = gamification.level;

    // On first mount, just store the level (don't trigger animation)
    if (prevLevelRef.current === null) {
      prevLevelRef.current = currentLevel;
      return;
    }

    // If level increased, trigger the overlay
    if (currentLevel > prevLevelRef.current) {
      setDisplayLevel(currentLevel);
      setShowOverlay(true);
      playCelebration();

      // Fire confetti burst
      const duration = 2500;
      const end = Date.now() + duration;
      const colors = ['#7C3AED', '#EC4899', '#FFD166', '#06D6A0', '#4CC9F0'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.6 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.6 },
          colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();

      // Auto-dismiss after 3.5 seconds
      const timer = setTimeout(() => setShowOverlay(false), 3500);
      prevLevelRef.current = currentLevel;
      return () => clearTimeout(timer);
    }

    prevLevelRef.current = currentLevel;
  }, [gamification?.level]);

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={() => setShowOverlay(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* Content */}
          <motion.div
            className="relative text-center z-10"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            }}
          >
            {/* Glow ring behind level */}
            <motion.div
              className="absolute inset-0 -m-16 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Star burst emoji */}
            <motion.div
              className="text-6xl mb-4"
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              ⭐
            </motion.div>

            {/* LEVEL UP text */}
            <motion.h2
              className="text-5xl md:text-7xl font-heading font-black tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #FFD166, #FF6B6B, #EC4899, #7C3AED)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundSize: '200% 200%',
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              LEVEL UP!
            </motion.h2>

            {/* Level number */}
            <motion.div
              className="mt-4 text-8xl md:text-9xl font-heading font-black text-white"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 150, damping: 10 }}
              style={{
                textShadow: '0 0 40px rgba(124,58,237,0.6), 0 0 80px rgba(124,58,237,0.3)',
              }}
            >
              {displayLevel}
            </motion.div>

            {/* Subtitle */}
            <motion.p
              className="mt-4 text-lg md:text-xl font-heading font-semibold text-[var(--muted-foreground)]"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Keep grinding, adventurer! 🚀
            </motion.p>

            {/* Click to dismiss hint */}
            <motion.p
              className="mt-6 text-xs text-[var(--muted-foreground)] opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1.5 }}
            >
              Click anywhere to dismiss
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
