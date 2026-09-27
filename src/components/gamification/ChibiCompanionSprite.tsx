'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, TargetAndTransition, Transition } from 'framer-motion';
import { useMotion } from '@/context/ThemeContext';
import { PetSpecies } from '@/types';

export type CompanionSpecies = PetSpecies;
export type CompanionAction = 'idle' | 'walk' | 'celebrate' | 'sleep';

export interface ChibiCompanionSpriteProps {
  species?: CompanionSpecies;
  action?: CompanionAction;
  size?: number; // rendered width & height in px, default 64
  direction?: 'left' | 'right';
  isSquishing?: boolean;
  showShadow?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  bubbleText?: string;
  showAura?: boolean;
  bounceDirection?: 'up' | 'down'; // 'down' prevents top-edge ceiling clipping for header roamers
}

type EyeState = 'normal' | 'blink' | 'happy' | 'sleep' | 'squish';

interface SpeciesPalette {
  primary: string[];
  secondary: string[];
  accent: string;
  glow: string;
  cheek: string;
}

/**
 * Modern 2.5D Chibi Companion Sprite Engine
 * Resolution-independent vector character rigs with hardware-accelerated spring animations.
 * Supports: Questie (Scholar Owl), Cyber Cat, and Emerald Dragon across 4 actions.
 */
export default function ChibiCompanionSprite({
  species = 'owl',
  action = 'idle',
  size = 64,
  direction = 'right',
  isSquishing = false,
  showShadow = true,
  className = '',
  onClick,
  bubbleText,
  showAura = true,
  bounceDirection = 'up',
}: ChibiCompanionSpriteProps) {
  // Gracefully attempt to read reduceMotion from ThemeContext
  let reduceMotion = false;
  try {
    const motionCtx = useMotion();
    reduceMotion = motionCtx.reduceMotion;
  } catch {
    reduceMotion = false;
  }

  // ── Eye Blinking State Machine ──────────────────────────────────
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveEyeState: EyeState = isSquishing
    ? 'squish'
    : action === 'sleep'
    ? 'sleep'
    : action === 'celebrate'
    ? 'happy'
    : isBlinking
    ? 'blink'
    : 'normal';

  useEffect(() => {
    if (isSquishing || action === 'sleep' || action === 'celebrate' || reduceMotion) {
      return;
    }

    let isMounted = true;
    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 3000;
      blinkTimerRef.current = setTimeout(() => {
        if (!isMounted) return;
        setIsBlinking(true);
        setTimeout(() => {
          if (!isMounted) return;
          setIsBlinking(false);
          scheduleBlink();
        }, 160);
      }, delay);
    };

    scheduleBlink();
    return () => {
      isMounted = false;
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [action, isSquishing, reduceMotion]);

  const resolvedSpecies: 'owl' | 'cat' | 'dragon' = useMemo(() => {
    if (species === 'cat' || species === 'fox') return 'cat';
    if (species === 'dragon') return 'dragon';
    return 'owl';
  }, [species]);

  // ── Species Palettes & Lighting Tokens ─────────────────────────
  const palette = useMemo(() => {
    switch (resolvedSpecies) {
      case 'cat':
        return {
          primary: ['#8B5CF6', '#6D28D9', '#4C1D95'], // Royal violet coat
          secondary: ['#C4B5FD', '#A78BFA'],          // Soft lavender inner/belly
          accent: '#06B6D4',                           // Cyber neon cyan
          glow: 'rgba(139, 92, 246, 0.45)',
          cheek: 'rgba(236, 72, 153, 0.4)',
        };
      case 'dragon':
        return {
          primary: ['#10B981', '#059669', '#047857'], // Emerald scaled coat
          secondary: ['#A7F3D0', '#6EE7B7'],          // Mint belly plates
          accent: '#F59E0B',                           // Golden horns & fire
          glow: 'rgba(16, 185, 129, 0.45)',
          cheek: 'rgba(245, 158, 11, 0.4)',
        };
      case 'owl':
      default:
        return {
          primary: ['#6366F1', '#4F46E5', '#3730A3'], // Scholar Indigo
          secondary: ['#E0E7FF', '#C7D2FE'],          // Soft crest & belly
          accent: '#F59E0B',                           // Academic gold beak & tassel
          glow: 'rgba(99, 102, 241, 0.45)',
          cheek: 'rgba(236, 72, 153, 0.35)',
        };
    }
  }, [resolvedSpecies]);

  // ── Dynamic Motion Animations ─────────────────────────────────
  const motionConfig = useMemo<{ animate: TargetAndTransition; transition: Transition }>(() => {
    if (reduceMotion) {
      return {
        animate: { opacity: 1 },
        transition: { duration: 0.2 },
      };
    }

    if (isSquishing) {
      return {
        animate: { scaleX: [1, 1.08, 0.96, 1.02, 1], scaleY: [1, 0.92, 1.05, 0.98, 1] },
        transition: { duration: 0.4, ease: 'easeOut' as const },
      };
    }

    const isDown = bounceDirection === 'down';

    switch (action) {
      case 'walk':
        return {
          animate: {
            y: isDown ? [0, 6, 0] : [0, -9, 0],
            rotate: direction === 'left' ? [-3, 3, -3] : [3, -3, 3],
          },
          transition: {
            duration: 0.38,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'celebrate':
        return {
          animate: {
            y: isDown ? [0, 12, 0] : [0, -18, 0],
            scaleY: [1, 0.94, 1.08, 1],
            scaleX: [1, 1.06, 0.94, 1],
          },
          transition: {
            duration: 0.55,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'sleep':
        return {
          animate: {
            y: [3, 5, 3],
            scaleY: [0.96, 1, 0.96],
            scaleX: [1.03, 1, 1.03],
          },
          transition: {
            duration: 2.8,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'idle':
      default:
        return {
          animate: {
            y: isDown ? [0, 3, 0] : [0, -3.5, 0],
          },
          transition: {
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
    }
  }, [action, isSquishing, direction, reduceMotion, bounceDirection]);

  // Shadow contraction animation matching vertical bounce
  const shadowScale = useMemo(() => {
    if (reduceMotion) return 1;
    if (action === 'celebrate') return [1, 0.55, 1];
    if (action === 'walk') return [1, 0.75, 1];
    if (action === 'sleep') return [1.1, 1.05, 1.1];
    return [1, 0.9, 1];
  }, [action, reduceMotion]);

  const shadowDuration = action === 'celebrate' ? 0.55 : action === 'walk' ? 0.38 : 2.4;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex flex-col items-center justify-center select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      style={{ width: size, height: size }}
      title={`${species.toUpperCase()} (${action})`}
    >
      {/* ── Ambient Underglow ────────────────────────────────────── */}
      {showAura && (
        <div
          className="absolute inset-0 rounded-full blur-md pointer-events-none transition-all duration-500"
          style={{
            backgroundColor: palette.glow,
            opacity: action === 'sleep' ? 0.2 : action === 'celebrate' ? 0.7 : 0.4,
            transform: action === 'celebrate' ? 'scale(1.25)' : 'scale(1)',
          }}
        />
      )}

      {/* ── Optional Dialogue Bubble ─────────────────────────────── */}
      <AnimatePresence>
        {bubbleText && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-medium px-2.5 py-1 rounded-xl shadow-lg border border-white/10 backdrop-blur-md pointer-events-none z-30"
          >
            {bubbleText}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-slate-900/95" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Celebrate Sparkles ─────────────────────────── */}
      {action === 'celebrate' && !reduceMotion && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <motion.span
            animate={{ y: [-4, -20], x: [-6, -14], opacity: [0, 1, 0], scale: [0.5, 1.2, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
            className="absolute top-1 left-2 text-amber-300 text-xs"
          >
            ✨
          </motion.span>
          <motion.span
            animate={{ y: [-2, -22], x: [6, 16], opacity: [0, 1, 0], scale: [0.6, 1.3, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.3, ease: 'easeOut' }}
            className="absolute top-2 right-2 text-yellow-300 text-xs"
          >
            ⭐
          </motion.span>
          <motion.span
            animate={{ y: [0, -18], opacity: [0, 1, 0], scale: [0.4, 1.1, 0.3] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: 0.6, ease: 'easeOut' }}
            className="absolute -top-1 left-1/2 -translate-x-1/2 text-cyan-300 text-[10px]"
          >
            ✨
          </motion.span>
        </div>
      )}

      {/* ── Floating Sleeping Zzz ────────────────────────────────── */}
      {action === 'sleep' && !reduceMotion && (
        <div className="absolute -top-4 right-1 pointer-events-none z-20 font-bold font-mono">
          <motion.span
            animate={{ y: [0, -14], x: [0, 6], opacity: [0, 1, 0], scale: [0.7, 1.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute text-indigo-300 text-xs"
          >
            z
          </motion.span>
          <motion.span
            animate={{ y: [0, -18], x: [0, 10], opacity: [0, 1, 0], scale: [0.8, 1.4, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: 0.8, ease: 'easeOut' }}
            className="absolute text-violet-300 text-sm"
          >
            Z
          </motion.span>
        </div>
      )}

      {/* ── Main Animated Character Rig ─────────────────────────── */}
      <motion.div
        animate={motionConfig.animate}
        transition={motionConfig.transition}
        style={{
          transform: `scaleX(${direction === 'left' ? -1 : 1})`,
          width: '100%',
          height: '100%',
        }}
        className="relative flex items-center justify-center"
      >
        <svg
          viewBox="0 0 120 120"
          width="100%"
          height="100%"
          className="overflow-visible filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
        >
          <defs>
            {/* Primary Body Radial Gradient */}
            <radialGradient id={`chibiPrimary-${resolvedSpecies}`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor={palette.primary[0]} />
              <stop offset="60%" stopColor={palette.primary[1]} />
              <stop offset="100%" stopColor={palette.primary[2]} />
            </radialGradient>

            {/* Belly Patch Linear Gradient */}
            <linearGradient id={`chibiSecondary-${resolvedSpecies}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={palette.secondary[0]} />
              <stop offset="100%" stopColor={palette.secondary[1]} />
            </linearGradient>

            {/* Eye Sclera Gradient */}
            <radialGradient id="chibiEyeShine" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </radialGradient>

            {/* Golden Beak/Horn Gradient */}
            <linearGradient id="chibiGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Cyber Collar Glow */}
            <linearGradient id="chibiCyber" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>

          {/* ============================================================
              SPECIES-SPECIFIC BODY RIG
              ============================================================ */}

          {resolvedSpecies === 'owl' && (
            <OwlRig
              palette={palette}
              eyeState={effectiveEyeState}
              action={action}
              reduceMotion={reduceMotion}
            />
          )}

          {resolvedSpecies === 'cat' && (
            <CatRig
              palette={palette}
              eyeState={effectiveEyeState}
              action={action}
              reduceMotion={reduceMotion}
            />
          )}

          {resolvedSpecies === 'dragon' && (
            <DragonRig
              palette={palette}
              eyeState={effectiveEyeState}
              action={action}
              reduceMotion={reduceMotion}
            />
          )}
        </svg>
      </motion.div>

      {/* ── Dynamic Contact Ground Shadow ────────────────────────── */}
      {showShadow && (
        <motion.div
          animate={{ scaleX: shadowScale }}
          transition={{ duration: shadowDuration, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-1 w-[68%] h-2.5 rounded-full bg-black/35 dark:bg-black/55 blur-[2.5px] pointer-events-none"
        />
      )}
    </div>
  );
}

// ============================================================
// 1. SCHOLAR OWL (QUESTIE) RIG
// ============================================================
function OwlRig({
  palette,
  eyeState,
  action,
  reduceMotion,
}: {
  palette: SpeciesPalette;
  eyeState: EyeState;
  action: CompanionAction;
  reduceMotion: boolean;
}) {
  return (
    <g>
      {/* ── Ear Feather Horns ── */}
      <path d="M 32 40 L 22 20 L 44 32 Z" fill={palette.primary[0]} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <path d="M 88 40 L 98 20 L 76 32 Z" fill={palette.primary[0]} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

      {/* ── Flapping Wings ── */}
      {/* Left Wing */}
      <motion.path
        animate={
          action === 'celebrate' || action === 'walk'
            ? { rotate: [-18, 14, -18] }
            : { rotate: [0, 4, 0] }
        }
        transition={{ duration: action === 'walk' ? 0.38 : 0.55, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '28px 70px' }}
        d="M 28 62 C 14 65, 12 86, 32 90 C 35 82, 35 70, 28 62 Z"
        fill={palette.primary[1]}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
      />
      {/* Right Wing */}
      <motion.path
        animate={
          action === 'celebrate' || action === 'walk'
            ? { rotate: [18, -14, 18] }
            : { rotate: [0, -4, 0] }
        }
        transition={{ duration: action === 'walk' ? 0.38 : 0.55, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '92px 70px' }}
        d="M 92 62 C 106 65, 108 86, 88 90 C 85 82, 85 70, 92 62 Z"
        fill={palette.primary[1]}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
      />

      {/* ── Main Chibi Rounded Body ── */}
      <ellipse
        cx="60"
        cy="70"
        rx="38"
        ry="36"
        fill="url(#chibiPrimary-owl)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2.5"
      />

      {/* ── Belly Patch ── */}
      <ellipse cx="60" cy="79" rx="24" ry="22" fill="url(#chibiSecondary-owl)" opacity="0.95" />
      {/* Chevrons on belly */}
      <path
        d="M 52 75 L 56 79 L 60 75 M 60 75 L 64 79 L 68 75 M 56 83 L 60 87 L 64 83"
        stroke={palette.primary[1]}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
      />

      {/* ── Rosy Cheeks ── */}
      <ellipse cx="38" cy="74" rx="5" ry="3" fill={palette.cheek} />
      <ellipse cx="82" cy="74" rx="5" ry="3" fill={palette.cheek} />

      {/* ── Eyes ── */}
      <EyePair eyeState={eyeState} leftX={44} rightX={76} y={62} />

      {/* ── Golden Academic Beak ── */}
      <polygon points="60,67 53,74 67,74" fill="url(#chibiGold)" stroke="#B45309" strokeWidth="1" strokeLinejoin="round" />

      {/* ── Scholar Graduation Cap (Mortarboard) ── */}
      <g>
        {/* Cap Base Ring */}
        <ellipse cx="60" cy="38" rx="16" ry="6" fill="#1E1B4B" />
        {/* Diamond Board */}
        <polygon
          points="60,18 94,30 60,42 26,30"
          fill="#312E81"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
          filter="drop-shadow(0 3px 5px rgba(0,0,0,0.4))"
        />
        {/* Cap Button */}
        <circle cx="60" cy="30" r="3" fill="url(#chibiGold)" />
        {/* Golden Tassel with spring sway */}
        <motion.path
          animate={reduceMotion ? { d: 'M 60 30 Q 76 34 82 46' } : { d: ['M 60 30 Q 74 34 80 46', 'M 60 30 Q 78 34 84 46', 'M 60 30 Q 74 34 80 46'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          stroke="url(#chibiGold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="82" cy="47" r="2.5" fill="url(#chibiGold)" />
      </g>

      {/* ── Little Talons ── */}
      <ellipse cx="50" cy="104" rx="6" ry="3.5" fill="url(#chibiGold)" />
      <ellipse cx="70" cy="104" rx="6" ry="3.5" fill="url(#chibiGold)" />
    </g>
  );
}

// ============================================================
// 2. CYBER CAT RIG
// ============================================================
function CatRig({
  palette,
  eyeState,
  action,
  reduceMotion,
}: {
  palette: SpeciesPalette;
  eyeState: EyeState;
  action: CompanionAction;
  reduceMotion: boolean;
}) {
  return (
    <g>
      {/* ── Cyber Wagging Tail ── */}
      <motion.path
        animate={
          reduceMotion
            ? {}
            : action === 'walk'
            ? { rotate: [-15, 20, -15] }
            : { rotate: [-8, 12, -8] }
        }
        transition={{ duration: action === 'walk' ? 0.38 : 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '88px 90px' }}
        d="M 88 88 C 104 88, 114 74, 108 58 C 106 54, 102 54, 100 58 C 96 68, 94 78, 88 84 Z"
        fill={palette.primary[1]}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
      />
      {/* Neon tail tip glow */}
      <circle cx="106" cy="58" r="3.5" fill={palette.accent} opacity="0.9" />

      {/* ── Cat Ears ── */}
      {/* Left Ear */}
      <polygon points="26,48 20,18 48,34" fill={palette.primary[0]} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <polygon points="28,42 24,24 42,33" fill={palette.accent} opacity="0.75" />
      {/* Right Ear */}
      <polygon points="94,48 100,18 72,34" fill={palette.primary[0]} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <polygon points="92,42 96,24 78,33" fill={palette.accent} opacity="0.75" />

      {/* ── Main Chibi Body ── */}
      <ellipse
        cx="60"
        cy="70"
        rx="38"
        ry="35"
        fill="url(#chibiPrimary-cat)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2.5"
      />

      {/* ── Soft Lavender Chest ── */}
      <ellipse cx="60" cy="78" rx="22" ry="20" fill="url(#chibiSecondary-cat)" opacity="0.9" />

      {/* ── Cybernetic Whisker Lines ── */}
      <path d="M 22 66 L 36 68 M 20 74 L 35 73" stroke={palette.accent} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <path d="M 98 66 L 84 68 M 100 74 L 85 73" stroke={palette.accent} strokeWidth="2" strokeLinecap="round" opacity="0.85" />

      {/* ── Rosy Cheeks ── */}
      <ellipse cx="36" cy="72" rx="4.5" ry="3" fill={palette.cheek} />
      <ellipse cx="84" cy="72" rx="4.5" ry="3" fill={palette.cheek} />

      {/* ── Eyes ── */}
      <EyePair eyeState={eyeState} leftX={44} rightX={76} y={60} pupilColor="#0F172A" irisColor={palette.accent} />

      {/* ── Cute Cat Snout & Mouth (:3) ── */}
      <polygon points="60,68 57,65 63,65" fill="#F472B6" />
      <path
        d="M 54 70 Q 57 73 60 70 Q 63 73 66 70"
        stroke="#4C1D95"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Cyber Collar & Bell Gem ── */}
      <rect x="42" y="90" width="36" height="5" rx="2.5" fill="url(#chibiCyber)" />
      <circle cx="60" cy="95" r="4.5" fill="#FDE047" stroke="#D97706" strokeWidth="1" />
      <circle cx="60" cy="95" r="2" fill="#06B6D4" />

      {/* ── Cute Little Paws ── */}
      <ellipse cx="48" cy="103" rx="7" ry="4.5" fill={palette.primary[1]} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <ellipse cx="72" cy="103" rx="7" ry="4.5" fill={palette.primary[1]} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    </g>
  );
}

// ============================================================
// 3. EMERALD DRAGON RIG
// ============================================================
function DragonRig({
  palette,
  eyeState,
  action,
  reduceMotion,
}: {
  palette: SpeciesPalette;
  eyeState: EyeState;
  action: CompanionAction;
  reduceMotion: boolean;
}) {
  return (
    <g>
      {/* ── Dragon Tail with Flame/Spike ── */}
      <motion.g
        animate={
          reduceMotion
            ? {}
            : action === 'walk'
            ? { rotate: [-12, 16, -12] }
            : { rotate: [-6, 8, -6] }
        }
        transition={{ duration: action === 'walk' ? 0.38 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '86px 88px' }}
      >
        <path
          d="M 86 86 C 104 88, 115 78, 110 62 C 108 58, 104 58, 102 62 C 96 72, 92 80, 86 84 Z"
          fill={palette.primary[1]}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />
        {/* Golden tail spade */}
        <polygon points="108,60 114,48 102,52" fill="url(#chibiGold)" stroke="#B45309" strokeWidth="1" />
      </motion.g>

      {/* ── Fluttering Tiny Wings ── */}
      <motion.path
        animate={
          action === 'celebrate' || action === 'walk'
            ? { rotate: [-20, 16, -20] }
            : { rotate: [0, 5, 0] }
        }
        transition={{ duration: action === 'walk' ? 0.38 : 0.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '28px 65px' }}
        d="M 28 62 C 14 54, 8 74, 26 80 C 29 74, 29 66, 28 62 Z"
        fill="url(#chibiGold)"
        stroke="#B45309"
        strokeWidth="1.5"
      />
      <motion.path
        animate={
          action === 'celebrate' || action === 'walk'
            ? { rotate: [20, -16, 20] }
            : { rotate: [0, -5, 0] }
        }
        transition={{ duration: action === 'walk' ? 0.38 : 0.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '92px 65px' }}
        d="M 92 62 C 106 54, 112 74, 94 80 C 91 74, 91 66, 92 62 Z"
        fill="url(#chibiGold)"
        stroke="#B45309"
        strokeWidth="1.5"
      />

      {/* ── Golden Chibi Horns ── */}
      <path d="M 36 38 C 28 26, 22 14, 30 10 C 36 18, 42 26, 44 34 Z" fill="url(#chibiGold)" stroke="#B45309" strokeWidth="1" />
      <path d="M 84 38 C 92 26, 98 14, 90 10 C 84 18, 78 26, 76 34 Z" fill="url(#chibiGold)" stroke="#B45309" strokeWidth="1" />

      {/* ── Main Chibi Body ── */}
      <ellipse
        cx="60"
        cy="70"
        rx="38"
        ry="36"
        fill="url(#chibiPrimary-dragon)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2.5"
      />

      {/* ── Segmented Mint Belly Plates ── */}
      <ellipse cx="60" cy="79" rx="24" ry="22" fill="url(#chibiSecondary-dragon)" opacity="0.95" />
      {/* Plate horizontal ridges */}
      <path
        d="M 44 72 Q 60 76 76 72 M 42 79 Q 60 83 78 79 M 46 86 Q 60 90 74 86"
        stroke={palette.primary[1]}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />

      {/* ── Rosy Cheeks ── */}
      <ellipse cx="36" cy="72" rx="4.5" ry="3" fill={palette.cheek} />
      <ellipse cx="84" cy="72" rx="4.5" ry="3" fill={palette.cheek} />

      {/* ── Eyes ── */}
      <EyePair eyeState={eyeState} leftX={44} rightX={76} y={60} pupilColor="#064E3B" irisColor="#34D399" />

      {/* ── Cute Dragon Snout with tiny nostrils ── */}
      <circle cx="56" cy="69" r="1.5" fill="#047857" />
      <circle cx="64" cy="69" r="1.5" fill="#047857" />
      <path d="M 55 74 Q 60 77 65 74" stroke="#047857" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* ── Cute Dragon Feet with tiny claws ── */}
      <ellipse cx="48" cy="103" rx="7.5" ry="4.5" fill={palette.primary[1]} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <circle cx="43" cy="104" r="1.5" fill="url(#chibiGold)" />
      <circle cx="48" cy="105" r="1.5" fill="url(#chibiGold)" />
      <circle cx="53" cy="104" r="1.5" fill="url(#chibiGold)" />

      <ellipse cx="72" cy="103" rx="7.5" ry="4.5" fill={palette.primary[1]} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <circle cx="67" cy="104" r="1.5" fill="url(#chibiGold)" />
      <circle cx="72" cy="105" r="1.5" fill="url(#chibiGold)" />
      <circle cx="77" cy="104" r="1.5" fill="url(#chibiGold)" />
    </g>
  );
}

// ============================================================
// 4. SHARED EXPRESSIVE EYE PAIR RIG
// ============================================================
function EyePair({
  eyeState,
  leftX,
  rightX,
  y,
  pupilColor = '#0F172A',
  irisColor = '#6366F1',
}: {
  eyeState: EyeState;
  leftX: number;
  rightX: number;
  y: number;
  pupilColor?: string;
  irisColor?: string;
}) {
  // Sleeping or Closed Crescent Eyes
  if (eyeState === 'sleep') {
    return (
      <g>
        <path d={`M ${leftX - 8} ${y} Q ${leftX} ${y + 6} ${leftX + 8} ${y}`} stroke={pupilColor} strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d={`M ${rightX - 8} ${y} Q ${rightX} ${y + 6} ${rightX + 8} ${y}`} stroke={pupilColor} strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
    );
  }

  // Joyful / Celebrating Happy Crescent Eyes (^‿^)
  if (eyeState === 'happy') {
    return (
      <g>
        <path d={`M ${leftX - 8} ${y + 2} Q ${leftX} ${y - 8} ${leftX + 8} ${y + 2}`} stroke={pupilColor} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d={`M ${rightX - 8} ${y + 2} Q ${rightX} ${y - 8} ${rightX + 8} ${y + 2}`} stroke={pupilColor} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </g>
    );
  }

  // Squish / Wincing Eyes (> <)
  if (eyeState === 'squish') {
    return (
      <g>
        <path d={`M ${leftX - 6} ${y - 5} L ${leftX + 6} ${y} L ${leftX - 6} ${y + 5}`} stroke={pupilColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={`M ${rightX + 6} ${y - 5} L ${rightX - 6} ${y} L ${rightX + 6} ${y + 5}`} stroke={pupilColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    );
  }

  // Blinking Eyes (Flat Line)
  if (eyeState === 'blink') {
    return (
      <g>
        <line x1={leftX - 8} y1={y} x2={leftX + 8} y2={y} stroke={pupilColor} strokeWidth="3" strokeLinecap="round" />
        <line x1={rightX - 8} y1={y} x2={rightX + 8} y2={y} stroke={pupilColor} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }

  // Normal Large Anime / Chibi Eyes with Glossy Highlights
  return (
    <g>
      {/* Left Sclera */}
      <ellipse cx={leftX} cy={y} rx="9.5" ry="11" fill="url(#chibiEyeShine)" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
      {/* Left Iris & Pupil */}
      <ellipse cx={leftX} cy={y} rx="6.5" ry="8" fill={irisColor} />
      <ellipse cx={leftX} cy={y + 0.5} rx="5" ry="6.5" fill={pupilColor} />
      {/* Left Highlights */}
      <circle cx={leftX - 2.5} cy={y - 3} r="2.8" fill="#FFFFFF" />
      <circle cx={leftX + 2.5} cy={y + 3} r="1.4" fill="#FFFFFF" />

      {/* Right Sclera */}
      <ellipse cx={rightX} cy={y} rx="9.5" ry="11" fill="url(#chibiEyeShine)" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
      {/* Right Iris & Pupil */}
      <ellipse cx={rightX} cy={y} rx="6.5" ry="8" fill={irisColor} />
      <ellipse cx={rightX} cy={y + 0.5} rx="5" ry="6.5" fill={pupilColor} />
      {/* Right Highlights */}
      <circle cx={rightX - 2.5} cy={y - 3} r="2.8" fill="#FFFFFF" />
      <circle cx={rightX + 2.5} cy={y + 3} r="1.4" fill="#FFFFFF" />
    </g>
  );
}
