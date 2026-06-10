'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

/**
 * ParticleBackground — Floating, softly glowing orbs that drift across the app.
 * Uses framer-motion for smooth infinite animations.
 * Pointer-events: none, aria-hidden for zero interaction.
 */

const PARTICLE_COUNT = 22;

interface Particle {
  id: number;
  size: number;
  x: number;
  y: number;
  opacity: number;
  duration: number;
  delay: number;
  color: string;
  blur: number;
  driftX: number;
  driftY: number;
}

// Hardcoded hex colors so they work reliably in inline styles
const COLORS = [
  '#7C3AED', // primary purple
  '#EC4899', // secondary pink
  '#10B981', // tertiary green
  '#06D6A0', // teal
  '#4CC9F0', // sky
  '#F59E0B', // amber
  '#6366F1', // indigo
  '#D946EF', // fuchsia
];

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const size = 8 + Math.random() * 20; // bigger orbs (8-28px)
    return {
      id: i,
      size,
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: 0.12 + Math.random() * 0.22, // more visible (0.12 - 0.34)
      duration: 18 + Math.random() * 30,
      delay: Math.random() * 8,
      color: COLORS[i % COLORS.length],
      blur: size > 16 ? 12 + Math.random() * 16 : 6 + Math.random() * 10,
      driftX: -50 + Math.random() * 100,
      driftY: -60 + Math.random() * 120,
    };
  });
}

export default function ParticleBackground() {
  const { reduceMotion } = useTheme();
  const particles = useMemo(() => generateParticles(), []);

  if (reduceMotion) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `radial-gradient(circle, ${p.color}, ${p.color}88)`,
            filter: `blur(${p.blur}px)`,
            opacity: p.opacity,
          }}
          animate={{
            x: [0, p.driftX, -p.driftX * 0.5, p.driftX * 0.3, 0],
            y: [0, p.driftY, -p.driftY * 0.6, p.driftY * 0.4, 0],
            scale: [1, 1.4, 0.7, 1.2, 1],
            opacity: [p.opacity, p.opacity * 1.6, p.opacity * 0.5, p.opacity * 1.3, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
