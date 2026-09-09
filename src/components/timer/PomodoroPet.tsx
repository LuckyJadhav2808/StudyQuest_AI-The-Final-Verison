'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePet } from '@/hooks/usePet';
import { useGamification } from '@/hooks/useGamification';
import { PixelPetSprite } from '@/components/dashboard/PixelPet';
import { PET_STAGES } from '@/lib/constants';
import { playClick, playSuccess } from '@/lib/sounds';

/* ============================================================
   PomodoroPet — Reactive Mascot Companion Engine
   Implements mascot-character-companion emotional state machine
   ============================================================ */

interface PomodoroPetProps {
  isRunning: boolean;
  phase: 'focus' | 'short-break' | 'long-break';
  progress: number;        // 0-1
  sessions: number;        // completed sessions this visit
  totalXP?: number;
  wasAbandoned?: boolean;  // user reset mid-focus
}

type PetMood = 'idle' | 'focused' | 'happy' | 'sad' | 'celebrating' | 'night-owl';

const STAGE_COLORS: Record<number, string> = {
  0: 'from-stone-400/20 to-amber-400/20',
  1: 'from-amber-400/20 to-lime-400/20',
  2: 'from-orange-400/20 to-red-400/20',
  3: 'from-red-400/20 to-purple-400/20',
  4: 'from-violet-400/20 to-cyan-400/20',
};

const STAGE_BORDER_GLOW: Record<number, string> = {
  0: '',
  1: '',
  2: 'shadow-[0_0_8px_rgba(249,115,22,0.3)]',
  3: 'shadow-[0_0_12px_rgba(168,85,247,0.3)]',
  4: 'shadow-[0_0_20px_rgba(139,92,246,0.5)]',
};

// Emotional state dialogue messages
const MOOD_MESSAGES: Record<PetMood, string[]> = {
  idle: [
    "Ready to embark on the next quest! ⚔️",
    "Resting up for a high-yield study sprint... 💤",
    "Ready whenever you are, scholar! 🐾",
    "Review your objectives and let's dive in! 📜",
  ],
  focused: [
    "Focus mode active! Zero distractions! ⚡",
    "Deep studying in progress... do not disturb! 🧠",
    "Channeling flow state! Powering through! 💥",
    "Every minute brings you closer to mastery! 📚",
  ],
  happy: [
    "Great work on that session! Keep the momentum! 🌟",
    "Hydration check! Grab some water and stretch. 💧",
    "Taking a well-deserved breather! 🌸",
    "Rest fuels the memory consolidation! ☕",
  ],
  sad: [
    "Aw, did we get interrupted? We can reset and try again! 😢",
    "It's okay, study quests have bumps. Let's restart! 🤝",
    "Deep breath. Regain focus and conquer! 🛡️",
  ],
  celebrating: [
    "Woohoo! Quest Completed! Victory loot incoming! 🎉",
    "Champion studying! Massive XP unlocked! 🏆",
    "Outstanding discipline! Levels rising! 👑",
  ],
  'night-owl': [
    "Night owl shift active! Midnight focus is legendary. 🦉",
    "The stars shine upon your dedication! 🌙",
    "Quiet late hours make for deep knowledge absorption... ✨",
    "Rest well once you conquer this milestone! 💤",
  ],
};

export default function PomodoroPet({ isRunning, phase, progress, sessions, wasAbandoned = false }: PomodoroPetProps) {
  const { pet, getEvolutionProgress } = usePet();
  const { gamification } = useGamification();
  const [squishCount, setSquishCount] = useState(0);
  const [customDialogue, setCustomDialogue] = useState<string | null>(null);

  // Mascot Emotional State Machine
  const mood: PetMood = useMemo(() => {
    if (wasAbandoned) return 'sad';
    if (phase !== 'focus' && !isRunning && sessions > 0 && progress === 0) return 'celebrating';
    if (phase !== 'focus') return 'happy';
    if (isRunning) return 'focused';
    const hour = new Date().getHours();
    if (hour >= 21 || hour < 5) return 'night-owl';
    return 'idle';
  }, [isRunning, phase, progress, sessions, wasAbandoned]);

  const defaultMessage = useMemo(() => {
    const list = MOOD_MESSAGES[mood];
    return list[Math.floor(Math.random() * list.length)];
  }, [mood, sessions]);

  // Ambient aura luminescence
  const auraColor = useMemo(() => {
    switch (mood) {
      case 'focused':
        return 'bg-emerald-500/25 blur-xl';
      case 'celebrating':
        return 'bg-amber-400/35 blur-2xl';
      case 'night-owl':
        return 'bg-violet-600/30 blur-xl';
      case 'happy':
        return 'bg-sky-400/20 blur-lg';
      case 'sad':
        return 'bg-red-500/15 blur-md';
      default:
        return 'bg-primary/20 blur-lg';
    }
  }, [mood]);

  // Interactive Mascot Tap / Squish Reaction
  const handleMascotClick = () => {
    playClick();
    setSquishCount((prev) => prev + 1);
    const list = MOOD_MESSAGES[mood];
    const randomMsg = list[Math.floor(Math.random() * list.length)];
    setCustomDialogue(randomMsg);
  };

  // Happiness level for the progress bar
  const happiness = useMemo(() => {
    if (mood === 'celebrating') return 100;
    if (mood === 'sad') return Math.max(10, 50 - sessions * 2);
    if (mood === 'focused') return 50 + Math.floor(progress * 50);
    if (mood === 'happy') return 75;
    return 40 + Math.min(sessions * 3, 30);
  }, [mood, progress, sessions]);

  if (!pet) {
    return (
      <div className="rounded-2xl border-2 border-[var(--card-border)] p-4 bg-[var(--card-bg)] text-center relative overflow-hidden">
        <span className="text-3xl block mb-2">🥚</span>
        <p className="text-xs font-heading font-bold mb-1">Adopt your study companion!</p>
        <p className="text-[10px] text-[var(--muted-foreground)] mb-3 leading-relaxed">
          Visit the Companion Sanctuary to hatch your very first pixel companion!
        </p>
        <a 
          href="/pets" 
          className="inline-block px-3.5 py-2 rounded-xl bg-primary text-white text-[10px] font-bold hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/20"
        >
          Go to Sanctuary 🐾
        </a>
      </div>
    );
  }

  const stageInfo = PET_STAGES[pet.stage] || PET_STAGES[0];
  const nextStageInfo = pet.stage < 4 ? PET_STAGES[pet.stage + 1] : null;

  // Compute evolution progress
  const evolutionPaths = getEvolutionProgress(gamification);
  const bestPath = evolutionPaths.length > 0 
    ? [...evolutionPaths].sort((a, b) => (b.current / b.target) - (a.current / a.target))[0]
    : null;
  const evolutionProgress = bestPath ? Math.min(bestPath.current / bestPath.target, 1) : 1;

  const bgGradient = STAGE_COLORS[pet.stage] || 'from-primary/10 to-secondary/10';
  const glow = STAGE_BORDER_GLOW[pet.stage] || '';
  const speciesEmoji = pet.species === 'owl' ? '🦉' : pet.species === 'dragon' ? '🦖' : '🐱';

  return (
    <motion.div
      className={`rounded-2xl border-2 border-[var(--card-border)] p-4 bg-[var(--card-bg)] relative overflow-hidden ${glow}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-4">
        {/* Pet Sprite with Ambient Aura & Tactile Squish */}
        <div className="relative flex-shrink-0">
          {/* Ambient Lighting / Aura Disk */}
          <div className={`absolute -inset-1 rounded-2xl ${auraColor} transition-all duration-700 pointer-events-none`} />

          <motion.div
            key={squishCount}
            onClick={handleMascotClick}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.88 }}
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${bgGradient} border-2 border-[var(--card-border)] flex items-center justify-center cursor-pointer relative z-10 select-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]`}
            animate={
              mood === 'focused'
                ? { scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }
                : mood === 'celebrating'
                ? { scale: [1, 1.18, 1], y: [0, -8, 0] }
                : mood === 'night-owl'
                ? { y: [0, -4, 0] }
                : mood === 'sad'
                ? { y: [0, 3, 0] }
                : { y: [0, -3, 0] }
            }
            transition={{
              duration: mood === 'focused' ? 1.6 : mood === 'celebrating' ? 0.75 : 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            title="Tap companion to interact!"
          >
            <div className="w-12 h-12 flex items-center justify-center">
              <PixelPetSprite species={pet.species} stage={pet.stage} className="w-10 h-10" />
            </div>
          </motion.div>

          {/* Mood indicator status pill */}
          <div
            className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--card-bg)] z-20 ${
              mood === 'celebrating' ? 'bg-amber-400' :
              mood === 'focused' ? 'bg-emerald-400' :
              mood === 'night-owl' ? 'bg-violet-400' :
              mood === 'happy' ? 'bg-sky-400' :
              mood === 'sad' ? 'bg-red-400' :
              'bg-gray-400'
            }`}
          />

          {/* Focus fire particles */}
          <AnimatePresence>
            {mood === 'focused' && (
              <>
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 z-20"
                    style={{
                      left: `${30 + i * 15}%`,
                      bottom: '100%',
                    }}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      y: [-5, -20],
                      x: [0, (i - 1) * 8],
                    }}
                    transition={{
                      duration: 1 + i * 0.3,
                      repeat: Infinity,
                      delay: i * 0.4,
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Night Owl Stars / Cosmic Dust */}
          <AnimatePresence>
            {mood === 'night-owl' && (
              <>
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={`night-${i}`}
                    className="absolute text-[8px] pointer-events-none z-20"
                    style={{
                      left: `${15 + i * 30}%`,
                      top: `${-10 + (i % 2) * 20}%`,
                    }}
                    animate={{
                      opacity: [0.3, 1, 0.3],
                      scale: [0.8, 1.2, 0.8],
                      y: [0, -4, 0],
                    }}
                    transition={{
                      duration: 2.2 + i * 0.5,
                      repeat: Infinity,
                      delay: i * 0.4,
                    }}
                  >
                    {i === 0 ? '🌙' : '⭐'}
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Max evolution legendary glow sparks */}
          <AnimatePresence>
            {pet.stage === 4 && (
              <>
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={`sparkle-${i}`}
                    className="absolute w-1 h-1 rounded-full bg-violet-400 z-20"
                    style={{
                      left: `${10 + i * 25}%`,
                      top: `${15 + (i % 2) * 50}%`,
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.5, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.5,
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Pet Info & Tactile Speech Bubble */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm">{speciesEmoji}</span>
            <p className="text-xs font-heading font-black truncate max-w-[110px] text-[var(--foreground)]">
              {pet.name}
            </p>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
              pet.stage === 4 ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-violet-400 border border-violet-500/30' :
              pet.stage === 3 ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
              'bg-primary/10 text-primary border border-primary/20'
            }`}>
              Lv.{pet.level} · {stageInfo.name}
            </span>
          </div>

          {/* Tactile Speech Bubble */}
          <div className="relative px-3 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm mb-2 text-[10px] text-[var(--muted-foreground)] leading-snug cursor-pointer hover:border-primary/40 transition-colors" onClick={handleMascotClick}>
            <p className="line-clamp-2">
              {customDialogue || defaultMessage}
            </p>
            {/* Speech bubble tail pointing to companion */}
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[var(--card-bg)] border-l border-b border-[var(--card-border)] rotate-45" />
          </div>

          {/* Happiness Meter */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                Companion Affinity
              </span>
              <span className="text-[8px] font-bold text-primary">{happiness}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--card-border)] overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  happiness >= 75 ? 'bg-emerald-400' :
                  happiness >= 40 ? 'bg-amber-400' :
                  'bg-red-400'
                }`}
                animate={{ width: `${happiness}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Evolution Progression */}
          {nextStageInfo ? (
            <div className="mt-1.5 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Evolution → {nextStageInfo.name}
                </span>
                <span className="text-[8px] font-bold text-[var(--muted-foreground)]">
                  {bestPath ? `${Math.round(bestPath.current)}/${bestPath.target} ${bestPath.label}` : ''}
                </span>
              </div>
              <div className="h-1 rounded-full bg-[var(--card-border)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                  animate={{ width: `${evolutionProgress * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-1.5">
              <span className="text-[8px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                ✨ MAX EVOLUTION — TRANSCENDED COMPANION!
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
