'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePet } from '@/hooks/usePet';
import { useGamification } from '@/hooks/useGamification';
import { PixelPetSprite } from '@/components/dashboard/PixelPet';
import { PET_STAGES } from '@/lib/constants';

/* ============================================================
   PomodoroPet — Focus companion that evolves with your XP!
   ============================================================ */

interface PomodoroPetProps {
  isRunning: boolean;
  phase: 'focus' | 'short-break' | 'long-break';
  progress: number;        // 0-1
  sessions: number;        // completed sessions this visit
  totalXP?: number;
  wasAbandoned?: boolean;  // user reset mid-focus
}

type PetMood = 'idle' | 'focused' | 'happy' | 'sad' | 'celebrating';

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

// Generic messages for different moods
const MOOD_MESSAGES: Record<PetMood, string[]> = {
  idle: [
    "Ready to start the next quest! ⚔️",
    "Resting up for a deep study session... 💤",
    "Ready when you are, adventurer! 🐾"
  ],
  focused: [
    "Focus mode activated! We got this! ⚡",
    "Deep studying... do not disturb! 🧠",
    "Powering through the syllabus! 💥"
  ],
  happy: [
    "Great work! Let's keep it up! 🌟",
    "Taking a short breath of fresh air! 🌸",
    "Hydration check! Grab some water. 💧"
  ],
  sad: [
    "Aw, did we get distracted? We can try again! 😢",
    "Focus timer was interrupted... 😞",
    "Let's reset and focus together! 🤝"
  ],
  celebrating: [
    "Woohoo! Quest Completed! 🎉",
    "Champion studying! Levels incoming! 🏆",
    "We did it! Time for victory loot! 👑"
  ]
};

export default function PomodoroPet({ isRunning, phase, progress, sessions, wasAbandoned = false }: PomodoroPetProps) {
  const { pet, getEvolutionProgress } = usePet();
  const { gamification } = useGamification();

  const mood: PetMood = useMemo(() => {
    if (wasAbandoned) return 'sad';
    if (phase !== 'focus' && !isRunning && sessions > 0 && progress === 0) return 'celebrating';
    if (phase !== 'focus') return 'happy';
    if (isRunning) return 'focused';
    return 'idle';
  }, [isRunning, phase, progress, sessions, wasAbandoned]);

  const message = useMemo(() => {
    const list = MOOD_MESSAGES[mood];
    return list[Math.floor(Math.random() * list.length)];
  }, [mood, sessions]);

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
        <p className="text-xs font-heading font-bold mb-1">Adopt your study buddy!</p>
        <p className="text-[10px] text-[var(--muted-foreground)] mb-3 leading-relaxed">
          Visit the Companion Sanctuary to hatch your very first study companion!
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

  // Compute evolution progress using the companion pet's actual paths
  const evolutionPaths = getEvolutionProgress(gamification);
  const bestPath = evolutionPaths.length > 0 
    ? [...evolutionPaths].sort((a, b) => (b.current / b.target) - (a.current / a.target))[0]
    : null;
  const evolutionProgress = bestPath ? Math.min(bestPath.current / bestPath.target, 1) : 1;

  const bgGradient = STAGE_COLORS[pet.stage] || 'from-primary/10 to-secondary/10';
  const glow = STAGE_BORDER_GLOW[pet.stage] || '';

  return (
    <motion.div
      className={`rounded-2xl border-2 border-[var(--card-border)] p-4 bg-[var(--card-bg)] ${glow}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-4">
        {/* Pet sprite */}
        <div className="relative flex-shrink-0">
          <motion.div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${bgGradient} border-2 border-[var(--card-border)] flex items-center justify-center`}
            animate={
              mood === 'focused'
                ? { scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }
                : mood === 'celebrating'
                ? { scale: [1, 1.15, 1], y: [0, -8, 0] }
                : mood === 'sad'
                ? { y: [0, 2, 0] }
                : mood === 'idle'
                ? { y: [0, -3, 0] }
                : {}
            }
            transition={{
              duration: mood === 'focused' ? 1.5 : mood === 'celebrating' ? 0.8 : 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="w-12 h-12 flex items-center justify-center">
              <PixelPetSprite species={pet.species} stage={pet.stage} className="w-10 h-10" />
            </div>
          </motion.div>

          {/* Mood indicator dot */}
          <div
            className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--card-bg)] ${
              mood === 'celebrating' ? 'bg-amber-400' :
              mood === 'focused' ? 'bg-emerald-400' :
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
                    className="absolute w-1.5 h-1.5 rounded-full bg-amber-400"
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

          {/* Legendary glow sparks */}
          <AnimatePresence>
            {pet.stage === 4 && (
              <>
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={`sparkle-${i}`}
                    className="absolute w-1 h-1 rounded-full bg-violet-400"
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

        {/* Pet info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-heading font-bold truncate max-w-[100px]">{pet.name}</p>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
              pet.stage === 4 ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-violet-400' :
              pet.stage === 3 ? 'bg-purple-500/10 text-purple-400' :
              'bg-primary/10 text-primary'
            }`}>
              Lv.{pet.level} · {stageInfo.name}
            </span>
          </div>

          <p className="text-[10px] text-[var(--muted-foreground)] mb-2 truncate">
            {message}
          </p>

          {/* Happiness bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                Happiness
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

          {/* Evolution progress */}
          {nextStageInfo ? (
            <div className="mt-1.5 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Next Stage → {nextStageInfo.name}
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
                ✨ MAX EVOLUTION — LEGENDARY!
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
