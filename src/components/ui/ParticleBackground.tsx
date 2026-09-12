'use client';

import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useMotion } from '@/context/ThemeContext';
import { useSidebar } from '@/context/SidebarContext';

/**
 * ParticleBackground — Floating, softly glowing orbs that drift across the app.
 * Optimized for 60fps GPU-composited CSS transforms (zero main-thread JS animation loops).
 * Automatically unmounts in focusMode and /notes for zero input latency.
 */

const PARTICLE_COUNT = 8;

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

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const size = 12 + (i * 4) % 20; // 12px - 32px
    return {
      id: i,
      size,
      x: 8 + (i * 12) % 84,
      y: 8 + (i * 14) % 84,
      opacity: 0.15 + (i % 3) * 0.06,
      duration: 22 + (i * 4) % 22,
      delay: (i * 1.5) % 6,
      color: COLORS[i % COLORS.length],
      blur: size > 20 ? 14 : 8,
      driftX: -40 + (i * 18) % 80,
      driftY: -50 + (i * 22) % 100,
    };
  });
}

export default React.memo(function ParticleBackground() {
  const { reduceMotion } = useMotion();
  const { focusMode } = useSidebar();
  const pathname = usePathname();
  const isNotes = pathname === '/notes';

  const particles = useMemo(() => generateParticles(), []);

  // Zero GPU/CPU overhead during focused note writing or reduced motion
  if (reduceMotion || focusMode || isNotes) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1, contain: 'strict' }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes sqParticleDrift {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(var(--drift-x), calc(var(--drift-y) * 0.5), 0) scale(1.15); }
          66% { transform: translate3d(calc(var(--drift-x) * -0.5), var(--drift-y), 0) scale(0.85); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }
        .sq-gpu-particle {
          will-change: transform;
          animation: sqParticleDrift var(--duration) ease-in-out infinite var(--delay);
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full sq-gpu-particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `radial-gradient(circle, ${p.color}, ${p.color}66)`,
            boxShadow: `0 0 ${p.blur * 2}px ${p.blur}px ${p.color}44`,
            opacity: p.opacity,
            ['--drift-x' as any]: `${p.driftX}px`,
            ['--drift-y' as any]: `${p.driftY}px`,
            ['--duration' as any]: `${p.duration}s`,
            ['--delay' as any]: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
});
