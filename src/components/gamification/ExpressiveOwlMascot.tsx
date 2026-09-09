'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MascotMood } from './QuestieMascot';

interface ExpressiveOwlMascotProps {
  mood?: MascotMood;
  isSquishing?: boolean;
  className?: string;
  size?: number; // default 52
}

type EyeExpression = 'normal' | 'blink' | 'look-left' | 'look-right' | 'happy' | 'focus' | 'night-owl' | 'squish' | 'sleep';

export default function ExpressiveOwlMascot({
  mood = 'active',
  isSquishing = false,
  className = '',
  size = 52,
}: ExpressiveOwlMascotProps) {
  const [eyeState, setEyeState] = useState<EyeExpression>('normal');
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const glanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Dynamic Expression State Machine ─────────────────────────
  useEffect(() => {
    // 1. Click / Squish takes highest priority
    if (isSquishing) {
      setEyeState('squish');
      return;
    }

    // 2. Sleeping mood
    if (mood === 'sleeping') {
      setEyeState('sleep');
      return;
    }

    // 3. Celebration mood
    if (mood === 'celebration') {
      setEyeState('happy');
      return;
    }

    // 4. Focus study mood
    if (mood === 'focus') {
      setEyeState('focus');
      return;
    }

    // 5. Night Owl mood
    if (mood === 'night-owl') {
      setEyeState('night-owl');
      return;
    }

    // 6. Active Idle: Autonomous Blinking and Glancing Cycles
    const scheduleBlink = () => {
      const delay = 2800 + Math.random() * 3200;
      blinkTimerRef.current = setTimeout(() => {
        setEyeState('blink');
        setTimeout(() => {
          setEyeState((prev) => (prev === 'blink' ? 'normal' : prev));
        }, 180);
        scheduleBlink();
      }, delay);
    };

    const scheduleGlance = () => {
      const delay = 5500 + Math.random() * 6500;
      glanceTimerRef.current = setTimeout(() => {
        const direction: EyeExpression = Math.random() > 0.5 ? 'look-left' : 'look-right';
        setEyeState(direction);
        setTimeout(() => {
          setEyeState((prev) => (prev === direction ? 'normal' : prev));
        }, 1500);
        scheduleGlance();
      }, delay);
    };

    scheduleBlink();
    scheduleGlance();

    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      if (glanceTimerRef.current) clearTimeout(glanceTimerRef.current);
    };
  }, [mood, isSquishing]);

  // Body gradient styling based on mood
  const bodyColors = useMemo(() => {
    switch (mood) {
      case 'focus':
        return {
          bodyGrad: ['#059669', '#047857', '#064E3B'],
          bellyGrad: ['#A7F3D0', '#6EE7B7'],
          capColor: '#064E3B',
          glow: 'rgba(16, 185, 129, 0.4)',
        };
      case 'celebration':
        return {
          bodyGrad: ['#F59E0B', '#D97706', '#92400E'],
          bellyGrad: ['#FEF3C7', '#FDE68A'],
          capColor: '#78350F',
          glow: 'rgba(245, 158, 11, 0.5)',
        };
      case 'night-owl':
        return {
          bodyGrad: ['#6D28D9', '#4C1D95', '#2E1065'],
          bellyGrad: ['#DDD6FE', '#C4B5FD'],
          capColor: '#2E1065',
          glow: 'rgba(139, 92, 246, 0.45)',
        };
      case 'sleeping':
        return {
          bodyGrad: ['#334155', '#1E293B', '#0F172A'],
          bellyGrad: ['#94A3B8', '#64748B'],
          capColor: '#1E293B',
          glow: 'rgba(100, 116, 139, 0.25)',
        };
      default:
        // Royal Indigo & Violet
        return {
          bodyGrad: ['#6366F1', '#4F46E5', '#312E81'],
          bellyGrad: ['#E0E7FF', '#C7D2FE'],
          capColor: '#312E81',
          glow: 'rgba(99, 102, 241, 0.4)',
        };
    }
  }, [mood]);

  // Pupil horizontal shift offset for curious glancing
  const pupilShiftX = useMemo(() => {
    if (eyeState === 'look-left') return -4.5;
    if (eyeState === 'look-right') return 4.5;
    return 0;
  }, [eyeState]);

  return (
    <div
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Ambient Luminescence Backing Glow */}
      <div
        className="absolute inset-0 rounded-full blur-lg pointer-events-none transition-all duration-700"
        style={{
          backgroundColor: bodyColors.glow,
          transform: isSquishing ? 'scale(1.4)' : 'scale(1.15)',
        }}
      />

      {/* SVG Character Canvas */}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative z-10 overflow-visible filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]"
      >
        <defs>
          {/* Body Linear Gradient */}
          <linearGradient id={`owlBody-${mood}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={bodyColors.bodyGrad[0]} />
            <stop offset="60%" stopColor={bodyColors.bodyGrad[1]} />
            <stop offset="100%" stopColor={bodyColors.bodyGrad[2]} />
          </linearGradient>

          {/* Belly Linear Gradient */}
          <linearGradient id={`owlBelly-${mood}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={bodyColors.bellyGrad[0]} />
            <stop offset="100%" stopColor={bodyColors.bellyGrad[1]} />
          </linearGradient>

          {/* Golden Beak Gradient */}
          <linearGradient id="owlBeakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* ── GROUND SHADOW ── */}
        <ellipse cx="50" cy="94" rx="26" ry="5" fill="rgba(0,0,0,0.35)" />

        {/* ── LEFT & RIGHT WING FLAPS (FLUTTERS ON SQUISH / CELEBRATION) ── */}
        <g>
          {/* Left Wing */}
          <motion.g
            animate={
              mood === 'celebration' || isSquishing
                ? { rotate: [-16, 12, -16] }
                : { rotate: 0 }
            }
            transition={{ duration: 0.3, repeat: isSquishing ? 2 : Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '24px 62px' }}
          >
            <path
              d="M 22 56 C 14 58, 12 74, 26 78 C 28 72, 28 62, 22 56 Z"
              fill={bodyColors.bodyGrad[1]}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1.5"
            />
          </motion.g>

          {/* Right Wing */}
          <motion.g
            animate={
              mood === 'celebration' || isSquishing
                ? { rotate: [16, -12, 16] }
                : { rotate: 0 }
            }
            transition={{ duration: 0.3, repeat: isSquishing ? 2 : Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '76px 62px' }}
          >
            <path
              d="M 78 56 C 86 58, 88 74, 74 78 C 72 72, 72 62, 78 56 Z"
              fill={bodyColors.bodyGrad[1]}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1.5"
            />
          </motion.g>
        </g>

        {/* ── MAIN ROUNDED BODY ── */}
        <motion.ellipse
          cx="50"
          cy="60"
          rx="32"
          ry="30"
          fill={`url(#owlBody-${mood})`}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          animate={
            mood === 'sleeping'
              ? { ry: [30, 31.8, 30] }
              : { ry: [30, 29.2, 30] }
          }
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* ── EAR TUFTS ── */}
        <path d="M 26 36 L 18 20 L 36 31 Z" fill={bodyColors.bodyGrad[0]} />
        <path d="M 74 36 L 82 20 L 64 31 Z" fill={bodyColors.bodyGrad[0]} />

        {/* ── BELLY PATCH ── */}
        <ellipse cx="50" cy="68" rx="20" ry="19" fill={`url(#owlBelly-${mood})`} />

        {/* Belly Feathers Pattern (._. tiny chevrons) */}
        <path
          d="M 44 65 L 47 68 L 50 65 M 50 65 L 53 68 L 56 65 M 47 72 L 50 75 L 53 72"
          fill="none"
          stroke={bodyColors.bodyGrad[1]}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.65"
        />

        {/* ── CHEEK BLUSHES (GLOWS PINK ON HAPPY / SQUISH) ── */}
        <circle
          cx="29"
          cy="57"
          r="4.5"
          fill="#F43F5E"
          opacity={isSquishing || mood === 'celebration' ? 0.75 : 0.4}
        />
        <circle
          cx="71"
          cy="57"
          r="4.5"
          fill="#F43F5E"
          opacity={isSquishing || mood === 'celebration' ? 0.75 : 0.4}
        />

        {/* ── DYNAMIC LIVING EYES (THE ICONIC ._. STATE MACHINE) ── */}
        <g>
          {eyeState === 'blink' ? (
            // 1. NATURAL BLINKING: (—  —)
            <>
              <line x1="30" y1="50" x2="42" y2="50" stroke="#0F172A" strokeWidth="3.2" strokeLinecap="round" />
              <line x1="58" y1="50" x2="70" y2="50" stroke="#0F172A" strokeWidth="3.2" strokeLinecap="round" />
            </>
          ) : eyeState === 'happy' ? (
            // 2. HAPPY / CELEBRATION: (^  ^)
            <>
              <path d="M 30 52 Q 36 41, 42 52" fill="none" stroke="#0F172A" strokeWidth="3.4" strokeLinecap="round" />
              <path d="M 58 52 Q 64 41, 70 52" fill="none" stroke="#0F172A" strokeWidth="3.4" strokeLinecap="round" />
            </>
          ) : eyeState === 'squish' ? (
            // 3. TACTILE SQUISHED / PETTED: (>  <)
            <>
              <path d="M 31 45 L 39 50 L 31 55" fill="none" stroke="#0F172A" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 69 45 L 61 50 L 69 55" fill="none" stroke="#0F172A" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : eyeState === 'sleep' ? (
            // 4. SLEEPING: (-  -)
            <>
              <path d="M 31 49 Q 36 54, 41 49" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
              <path d="M 59 49 Q 64 54, 69 49" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
            </>
          ) : eyeState === 'night-owl' ? (
            // 5. NIGHT OWL SLEEPY HALF-LIDDED: (¬  ¬)
            <>
              {/* Left Eye Base & Pupil */}
              <circle cx="36" cy="51" r="7.2" fill="#0F172A" />
              <circle cx="35" cy="50" r="2.6" fill="#FFFFFF" />
              {/* Drooping Eyelid Cover (Creates sleepy ¬ look) */}
              <path d="M 28 44 Q 36 50, 44 46 L 44 42 L 28 42 Z" fill={bodyColors.bodyGrad[1]} />

              {/* Right Eye Base & Pupil */}
              <circle cx="64" cy="51" r="7.2" fill="#0F172A" />
              <circle cx="63" cy="50" r="2.6" fill="#FFFFFF" />
              {/* Drooping Eyelid Cover */}
              <path d="M 56 46 Q 64 50, 72 44 L 72 42 L 56 42 Z" fill={bodyColors.bodyGrad[1]} />
            </>
          ) : eyeState === 'focus' ? (
            // 6. DEEP FOCUS MODE: Sharp focused pupils (•  •) + Spectacles Sparkle
            <>
              {/* Left Focused Eye */}
              <circle cx="36" cy="50" r="6" fill="#0F172A" />
              <circle cx="35" cy="48.5" r="2.2" fill="#FFFFFF" />
              <circle cx="37.5" cy="51.5" r="1" fill="#FFFFFF" />

              {/* Right Focused Eye */}
              <circle cx="64" cy="50" r="6" fill="#0F172A" />
              <circle cx="63" cy="48.5" r="2.2" fill="#FFFFFF" />
              <circle cx="65.5" cy="51.5" r="1" fill="#FFFFFF" />
            </>
          ) : (
            // 7. NORMAL & CURIOUS GLANCING: Large chibi eyes with smooth pupil shifting
            <>
              {/* Left Eye Socket */}
              <circle cx="36" cy="50" r="7.5" fill="#0F172A" />
              {/* Left Moving Pupil */}
              <motion.g
                animate={{ x: pupilShiftX }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              >
                <circle cx="35.5" cy="48.5" r="3.2" fill="#FFFFFF" />
                <circle cx="38" cy="52.5" r="1.3" fill="#FFFFFF" />
              </motion.g>

              {/* Right Eye Socket */}
              <circle cx="64" cy="50" r="7.5" fill="#0F172A" />
              {/* Right Moving Pupil */}
              <motion.g
                animate={{ x: pupilShiftX }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              >
                <circle cx="63.5" cy="48.5" r="3.2" fill="#FFFFFF" />
                <circle cx="66" cy="52.5" r="1.3" fill="#FFFFFF" />
              </motion.g>
            </>
          )}
        </g>

        {/* ── SCHOLAR SPECTACLES (GOLDEN ROUND WIRE FRAMES) ── */}
        <g opacity={mood === 'focus' ? 1 : 0.75}>
          {/* Left Frame */}
          <circle cx="36" cy="50" r="9.8" fill="none" stroke="#FBBF24" strokeWidth={mood === 'focus' ? 2 : 1.6} />
          {/* Right Frame */}
          <circle cx="64" cy="50" r="9.8" fill="none" stroke="#FBBF24" strokeWidth={mood === 'focus' ? 2 : 1.6} />
          {/* Center Bridge */}
          <line x1="45.5" y1="50" x2="54.5" y2="50" stroke="#FBBF24" strokeWidth={mood === 'focus' ? 2 : 1.6} />

          {/* Focus mode glint sparkle on spectacles */}
          {mood === 'focus' && (
            <motion.path
              d="M 42 43 L 43 45 L 45 46 L 43 47 L 42 49 L 41 47 L 39 46 L 41 45 Z"
              fill="#FFFFFF"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </g>

        {/* ── GOLDEN BEAK ── */}
        <motion.polygon
          points="46,54 54,54 50,62"
          fill="url(#owlBeakGrad)"
          stroke="#B45309"
          strokeWidth="1"
          strokeLinejoin="round"
          animate={isSquishing ? { y: [0, 2, 0] } : {}}
          transition={{ duration: 0.2 }}
        />

        {/* ── ACADEMIC GRADUATION CAP (MORTARBOARD) ── */}
        <g>
          {/* Cap Skull Base */}
          <ellipse cx="50" cy="30" rx="14" ry="4" fill="#1E1B4B" />

          {/* Diamond Mortarboard Top */}
          <motion.polygon
            points="50,14 74,23 50,31 26,23"
            fill={bodyColors.capColor}
            stroke="#FDE047"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Center Golden Button */}
          <circle cx="50" cy="22.5" r="2.2" fill="#FBBF24" />

          {/* Hanging Golden Tassel with Dynamic Spring Sway */}
          <motion.path
            d="M 50 22.5 Q 64 25, 68 36"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.6"
            animate={
              isSquishing
                ? { d: ['M 50 22.5 Q 64 25, 68 36', 'M 50 22.5 Q 72 28, 75 39', 'M 50 22.5 Q 64 25, 68 36'] }
                : { d: ['M 50 22.5 Q 64 25, 68 36', 'M 50 22.5 Q 66 26, 70 37', 'M 50 22.5 Q 64 25, 68 36'] }
            }
            transition={{ duration: isSquishing ? 0.35 : 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Tassel Fringe / Bobble */}
          <motion.circle
            cx="68"
            cy="37"
            r="2.6"
            fill="#FBBF24"
            animate={isSquishing ? { cy: [37, 41, 37] } : { cy: [37, 38.5, 37] }}
            transition={{ duration: isSquishing ? 0.35 : 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </g>

        {/* ── LITTLE FEET ── */}
        <ellipse cx="42" cy="89" rx="4" ry="2.5" fill="#F59E0B" />
        <ellipse cx="58" cy="89" rx="4" ry="2.5" fill="#F59E0B" />
      </svg>

      {/* Floating Animated Zzz when sleeping */}
      <AnimatePresence>
        {mood === 'sleeping' && (
          <div className="absolute -top-2 -right-1 pointer-events-none z-20 font-heading font-black">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute text-indigo-300 font-bold"
                style={{ fontSize: 9 + i * 2 }}
                initial={{ opacity: 0, y: 0, x: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [-2, -14 - i * 6],
                  x: [0, 8 + i * 4],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  delay: i * 0.7,
                  ease: 'easeOut',
                }}
              >
                z
              </motion.span>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
