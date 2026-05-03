'use client';

import React from 'react';
import { motion } from 'framer-motion';

/* ============================================================
   AvatarBorder — Glowing border around avatar based on level
   
   Bronze (1-4), Silver (5-9), Gold (10-14),
   Diamond (15-19), Legendary (20+)
   ============================================================ */

interface AvatarBorderProps {
  level: number;
  size?: number; // outer size in pixels
  children: React.ReactNode;
  className?: string;
}

interface TierInfo {
  name: string;
  colors: string; // CSS gradient
  glow: string;
  shadowColor: string;
  animate?: boolean;
}

function getTier(level: number): TierInfo {
  if (level >= 20) {
    return {
      name: 'Legendary',
      colors: 'linear-gradient(135deg, #FFD700, #FF6B00, #FF00FF, #7C3AED, #FFD700)',
      glow: '0 0 16px rgba(255, 215, 0, 0.5), 0 0 32px rgba(255, 0, 255, 0.3)',
      shadowColor: 'rgba(255, 215, 0, 0.4)',
      animate: true,
    };
  }
  if (level >= 15) {
    return {
      name: 'Diamond',
      colors: 'linear-gradient(135deg, #B9F2FF, #00BFFF, #1E90FF, #B9F2FF)',
      glow: '0 0 14px rgba(30, 144, 255, 0.4), 0 0 28px rgba(0, 191, 255, 0.2)',
      shadowColor: 'rgba(30, 144, 255, 0.3)',
      animate: true,
    };
  }
  if (level >= 10) {
    return {
      name: 'Gold',
      colors: 'linear-gradient(135deg, #FFD700, #FFA500, #FF8C00, #FFD700)',
      glow: '0 0 12px rgba(255, 215, 0, 0.4)',
      shadowColor: 'rgba(255, 165, 0, 0.3)',
    };
  }
  if (level >= 5) {
    return {
      name: 'Silver',
      colors: 'linear-gradient(135deg, #C0C0C0, #E8E8E8, #A8A8A8, #C0C0C0)',
      glow: '0 0 8px rgba(192, 192, 192, 0.3)',
      shadowColor: 'rgba(192, 192, 192, 0.2)',
    };
  }
  return {
    name: 'Bronze',
    colors: 'linear-gradient(135deg, #CD7F32, #E8A849, #B87333, #CD7F32)',
    glow: '0 0 6px rgba(205, 127, 50, 0.3)',
    shadowColor: 'rgba(205, 127, 50, 0.2)',
  };
}

export function getAvatarTier(level: number) {
  return getTier(level);
}

export default function AvatarBorder({ level, size = 48, children, className = '' }: AvatarBorderProps) {
  const tier = getTier(level);
  const borderWidth = 3;
  const outerSize = size + borderWidth * 2;

  return (
    <div className={`relative inline-flex ${className}`} style={{ width: outerSize, height: outerSize }}>
      {/* Gradient border ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: tier.colors,
          backgroundSize: tier.animate ? '200% 200%' : undefined,
          boxShadow: tier.glow,
        }}
        animate={tier.animate ? {
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        } : undefined}
        transition={tier.animate ? {
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        } : undefined}
      />

      {/* Inner content (avatar) */}
      <div
        className="absolute rounded-full overflow-hidden bg-[var(--card-bg)]"
        style={{
          top: borderWidth,
          left: borderWidth,
          width: size,
          height: size,
        }}
      >
        {children}
      </div>
    </div>
  );
}
