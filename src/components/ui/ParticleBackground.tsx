'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * ParticleBackground — Floating, softly glowing orbs that drift across the app.
 * Uses CSS-only approach with framer-motion for smooth infinite animations.
 * Responds to the CSS theme via var(--color-primary) and var(--color-secondary).
 * Zero interaction — pointer-events: none, aria-hidden.
 */

const PARTICLE_COUNT = 18;

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

const COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-tertiary)',
  'var(--color-teal)',
  'var(--color-sky)',
];

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const size = 4 + Math.random() * 12;
    return {
      id: i,
      size,
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: 0.08 + Math.random() * 0.15,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * 10,
      color: COLORS[i % COLORS.length],
      blur: size > 10 ? 8 + Math.random() * 12 : 4 + Math.random() * 6,
      driftX: -30 + Math.random() * 60,
      driftY: -40 + Math.random() * 80,
    };
  });
}

export default function ParticleBackground() {
  const particles = useMemo(() => generateParticles(), []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[1] overflow-hidden"
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
            background: p.color,
            filter: `blur(${p.blur}px)`,
            opacity: p.opacity,
          }}
          animate={{
            x: [0, p.driftX, -p.driftX * 0.5, 0],
            y: [0, p.driftY, -p.driftY * 0.6, 0],
            scale: [1, 1.3, 0.8, 1],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity * 0.6, p.opacity],
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
