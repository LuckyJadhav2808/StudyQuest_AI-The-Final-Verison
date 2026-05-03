'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   PomodoroPet — Focus companion that reacts to timer state
   
   States:
   - idle      → sleeping, waiting to start
   - focused   → happy, studying alongside you
   - completed → ecstatic, celebrating
   - abandoned → sad, disappointed
   
   Pets evolve based on total sessions completed:
   0-3   → Dragon Egg
   4-9   → Baby Dragon
   10+   → Adult Dragon
   ============================================================ */

interface PomodoroPetProps {
  isRunning: boolean;
  phase: 'focus' | 'short-break' | 'long-break';
  progress: number;        // 0-1
  sessions: number;        // total completed sessions
  wasAbandoned?: boolean;  // user reset mid-focus
}

type PetStage = 'egg' | 'baby' | 'adult';
type PetMood = 'idle' | 'focused' | 'happy' | 'sad' | 'celebrating';

function getPetStage(sessions: number): PetStage {
  if (sessions >= 10) return 'adult';
  if (sessions >= 4) return 'baby';
  return 'egg';
}

// Pixel art representations using emoji + text art
const PET_SPRITES: Record<PetStage, Record<PetMood, string>> = {
  egg: {
    idle: '🥚',
    focused: '🥚',
    happy: '🥚',
    sad: '🥚',
    celebrating: '🐣',
  },
  baby: {
    idle: '🐉',
    focused: '🔥',
    happy: '🐲',
    sad: '😢',
    celebrating: '🎉',
  },
  adult: {
    idle: '🐲',
    focused: '🔥',
    happy: '✨',
    sad: '😞',
    celebrating: '🏆',
  },
};

const PET_NAMES: Record<PetStage, string> = {
  egg: 'Dragon Egg',
  baby: 'Ember',
  adult: 'Blaze',
};

const PET_MESSAGES: Record<PetMood, string[]> = {
  idle: [
    '💤 Zzz... Wake me up to study!',
    '😴 Waiting for focus time...',
    '🫧 *snoring peacefully*',
  ],
  focused: [
    '📖 Studying alongside you!',
    '🧠 Focus power growing...',
    '⚡ Keep going, you got this!',
    '🔥 In the zone together!',
    '💪 Building knowledge!',
  ],
  happy: [
    '☕ Enjoy your break!',
    '🌿 Recharging energy...',
    '😊 Great work earlier!',
  ],
  sad: [
    '😢 Why did you stop...?',
    '💔 I was rooting for you...',
    '🥺 Let\'s try again, okay?',
  ],
  celebrating: [
    '🎉 We did it! Amazing!',
    '🏆 Session complete!',
    '⭐ +XP! You\'re a legend!',
    '🐉 I grew stronger too!',
  ],
};

export default function PomodoroPet({ isRunning, phase, progress, sessions, wasAbandoned = false }: PomodoroPetProps) {
  const stage = getPetStage(sessions);

  const mood: PetMood = useMemo(() => {
    if (wasAbandoned) return 'sad';
    if (phase !== 'focus' && !isRunning && sessions > 0 && progress === 0) return 'celebrating';
    if (phase !== 'focus') return 'happy';
    if (isRunning) return 'focused';
    return 'idle';
  }, [isRunning, phase, progress, sessions, wasAbandoned]);

  const sprite = PET_SPRITES[stage][mood];
  const name = PET_NAMES[stage];

  const message = useMemo(() => {
    const msgs = PET_MESSAGES[mood];
    return msgs[Math.floor(Math.random() * msgs.length)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, sessions]);

  // Happiness level for the progress bar
  const happiness = useMemo(() => {
    if (mood === 'celebrating') return 100;
    if (mood === 'sad') return Math.max(10, 50 - sessions * 2);
    if (mood === 'focused') return 50 + Math.floor(progress * 50);
    if (mood === 'happy') return 75;
    return 40 + sessions * 3;
  }, [mood, progress, sessions]);

  // Experience to next evolution
  const nextEvolution = stage === 'egg' ? 4 : stage === 'baby' ? 10 : null;
  const evolutionProgress = nextEvolution ? Math.min(sessions / nextEvolution, 1) : 1;

  return (
    <motion.div
      className="rounded-2xl border-2 border-[var(--card-border)] p-4 bg-[var(--card-bg)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-4">
        {/* Pet sprite */}
        <div className="relative flex-shrink-0">
          <motion.div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-[var(--card-border)] flex items-center justify-center"
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
            <span className="text-3xl">{sprite}</span>
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
        </div>

        {/* Pet info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-heading font-bold">{name}</p>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
              {stage}
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
          {nextEvolution && (
            <div className="mt-1.5 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Evolution
                </span>
                <span className="text-[8px] font-bold text-[var(--muted-foreground)]">
                  {sessions}/{nextEvolution} sessions
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
          )}
        </div>
      </div>
    </motion.div>
  );
}
