'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiPlay, HiPause, HiRefresh, HiCheck } from 'react-icons/hi';
import { usePet } from '@/hooks/usePet';
import { PET_SPECIES_CONFIG } from '@/lib/constants';
import LocalMusicPlayer, { LocalMusicPlayerProps } from '@/components/timer/LocalMusicPlayer';
import './ZenMode.css';

type Scene = 'sunset' | 'cyberpunk' | 'aurora' | 'ocean' | 'forest';

const SCENES: { id: Scene; emoji: string; label: string }[] = [
  { id: 'sunset', emoji: '🌅', label: 'Sunset Mountain' },
  { id: 'cyberpunk', emoji: '🌃', label: 'Cyberpunk City' },
  { id: 'aurora', emoji: '🌌', label: 'Northern Lights' },
  { id: 'ocean', emoji: '🌊', label: 'Deep Ocean' },
  { id: 'forest', emoji: '🌲', label: 'Midnight Forest' },
];



// Generate deterministic stars
const STARS = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 31 + 7) % 95 + 2}%`,
  top: `${(i * 23 + 13) % 55 + 5}%`,
  delay: `${(i * 0.7) % 3}s`,
  size: i % 4 === 0 ? 3 : 2,
}));

// Generate rain drops
const RAIN = Array.from({ length: 40 }, (_, i) => ({
  left: `${(i * 2.5) % 100}%`,
  duration: `${0.5 + (i * 0.03) % 0.5}s`,
  delay: `${(i * 0.07) % 2}s`,
  height: 12 + (i % 8),
}));

// Floating particles
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 8 + 5) % 90 + 5}%`,
  bottom: `${(i * 7) % 20}%`,
  duration: `${10 + (i * 3) % 10}s`,
  delay: `${i * 1.5}s`,
  size: 2 + (i % 3),
  color: i % 2 === 0 ? 'rgba(124, 58, 237, 0.3)' : 'rgba(16, 185, 129, 0.25)',
}));

interface ZenModeProps {
  isRunning: boolean;
  timeLeft: number;
  totalTime: number;
  phase: 'focus' | 'short-break' | 'long-break';
  sessions: number;
  totalFocusToday: number;
  xpPerSession: number;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
  onExit: () => void;
  musicProps: Omit<LocalMusicPlayerProps, 'variant'>;
}

export default function ZenMode({
  isRunning,
  timeLeft,
  totalTime,
  phase,
  sessions,
  totalFocusToday,
  xpPerSession,
  onToggle,
  onReset,
  onSkip,
  onExit,
  musicProps,
}: ZenModeProps) {
  const [scene, setScene] = useState<Scene>('sunset');

  const { pet, getMood } = usePet();

  const progress = 1 - timeLeft / totalTime;

  const ringColor = phase === 'focus' ? '#7C3AED' : phase === 'short-break' ? '#10B981' : '#4CC9F0';
  const phaseLabel = phase === 'focus' ? '🎯 Focus Time' : phase === 'short-break' ? '☕ Short Break' : '🌿 Long Break';

  // Pet data
  const petEmoji = pet ? PET_SPECIES_CONFIG[pet.species]?.emoji[pet.stage] || '🥚' : null;
  const mood = getMood();

  // SVG ring
  const size = 340;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasRain = scene === 'cyberpunk';
  const hasStars = scene !== 'forest';

  // Cleanup audio on exit is handled by TimerContent holding the state
  const handleExit = () => {
    onExit();
  };

  return (
    <motion.div
      className="zen-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* ── Dynamic Background ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={scene}
          className={`zen-bg zen-bg-${scene}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
        />
      </AnimatePresence>

      {/* ── Stars ── */}
      {hasStars && (
        <div className="zen-stars">
          {STARS.map((star, i) => (
            <div
              key={i}
              className="zen-star"
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                animationDelay: star.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Rain (Cyberpunk) ── */}
      {hasRain && (
        <div className="zen-rain">
          {RAIN.map((drop, i) => (
            <div
              key={i}
              className="zen-raindrop"
              style={{
                left: drop.left,
                height: drop.height,
                animationDuration: drop.duration,
                animationDelay: drop.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Floating Particles ── */}
      <div className="zen-particles">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="zen-particle"
            style={{
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              background: p.color,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* ── Scene Picker (top-left) ── */}
      <div className="zen-scene-picker">
        {SCENES.map((s) => (
          <motion.button
            key={s.id}
            className={`zen-scene-btn ${scene === s.id ? 'active' : ''}`}
            onClick={() => setScene(s.id)}
            whileTap={{ scale: 0.9 }}
            title={s.label}
          >
            {s.emoji}
          </motion.button>
        ))}
      </div>

      {/* ── Exit Button (top-right) ── */}
      <motion.button
        onClick={handleExit}
        className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-black/30 backdrop-blur-md hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <HiX size={14} />
        Exit <kbd className="ml-1 px-1.5 py-0.5 text-[9px] rounded bg-white/10 border border-white/10">ESC</kbd>
      </motion.button>

      {/* ── Phase Label ── */}
      <motion.span
        className="text-sm font-heading font-bold uppercase tracking-[0.2em] mb-6 text-white/70 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={phase}
      >
        {phaseLabel}
      </motion.span>

      {/* ── Timer Ring ── */}
      <div className="zen-timer-container" style={{ width: size, height: size }}>
        {/* Glow behind ring */}
        <div className="zen-timer-glow" style={{ background: ringColor }} />

        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - progress) }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${ringColor}55)` }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-7xl font-mono font-bold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-mono)' }}
            key={timeLeft}
            initial={{ scale: 1.03 }}
            animate={{ scale: 1 }}
          >
            {formatTime(timeLeft)}
          </motion.span>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center gap-6 mt-10 z-10">
        <motion.button
          onClick={onReset}
          className="w-14 h-14 rounded-full border border-white/15 bg-white/5 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <HiRefresh size={22} />
        </motion.button>

        <motion.button
          onClick={onToggle}
          className="w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${ringColor}, ${ringColor}cc)`,
            boxShadow: `0 10px 40px ${ringColor}55`,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isRunning ? <HiPause size={38} /> : <HiPlay size={38} className="ml-1" />}
        </motion.button>

        <motion.button
          onClick={onSkip}
          className="w-14 h-14 rounded-full border border-white/15 bg-white/5 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Skip"
        >
          <HiCheck size={22} />
        </motion.button>
      </div>

      {/* ── Stats ── */}
      <motion.div
        className="flex items-center gap-8 mt-8 z-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-white/40">Sessions</p>
          <p className="text-xl font-heading font-black text-white">{sessions}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-white/40">Focus Today</p>
          <p className="text-xl font-heading font-black text-white">{Math.floor(totalFocusToday / 60)}m</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-white/40">XP Earned</p>
          <p className="text-xl font-heading font-black" style={{ color: ringColor }}>{sessions * xpPerSession}</p>
        </div>
      </motion.div>

      {/* ── Music Player (bottom-left) ── */}
      <LocalMusicPlayer variant="zen" {...musicProps} />

      {/* ── Pet Corner (bottom-right) ── */}
      {pet && petEmoji && (
        <motion.div
          className="zen-pet"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 }}
        >
          <motion.div
            className="zen-pet-emoji"
            animate={{
              y: mood === 'sleeping' ? [0, -3, 0] : [0, -5, 0],
            }}
            transition={{
              duration: mood === 'sleeping' ? 3 : 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {petEmoji}
          </motion.div>
          {mood === 'sleeping' && <div className="zen-pet-zzz">💤</div>}
          <p className="text-[10px] text-white/40 font-bold mt-1">{pet.name}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
