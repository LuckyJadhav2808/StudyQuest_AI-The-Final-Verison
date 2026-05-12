'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   PomodoroPet — Focus companion that evolves with your XP!
   
   6 Evolution Stages (based on total lifetime XP):
   Stage 0:     0 XP → Mystic Egg     🥚
   Stage 1:   300 XP → Pip (Hatchling) 🐣
   Stage 2: 1,000 XP → Ember (Baby)   🐉
   Stage 3: 3,000 XP → Blaze (Young)  🐲
   Stage 4: 7,000 XP → Inferno (Fire) 🔥
   Stage 5:15,000 XP → Astra (Cosmic) ✨

   Moods: idle, focused, happy, sad, celebrating
   ============================================================ */

interface PomodoroPetProps {
  isRunning: boolean;
  phase: 'focus' | 'short-break' | 'long-break';
  progress: number;        // 0-1
  sessions: number;        // completed sessions this visit
  totalXP: number;         // lifetime XP for evolution
  wasAbandoned?: boolean;  // user reset mid-focus
}

interface PetStageInfo {
  id: string;
  name: string;
  minXP: number;
  sprites: Record<PetMood, string>;
}

type PetMood = 'idle' | 'focused' | 'happy' | 'sad' | 'celebrating';

const PET_STAGES: PetStageInfo[] = [
  {
    id: 'egg', name: 'Mystic Egg', minXP: 0,
    sprites: { idle: '🥚', focused: '🥚', happy: '🥚', sad: '🥚', celebrating: '🐣' },
  },
  {
    id: 'hatchling', name: 'Pip', minXP: 300,
    sprites: { idle: '🐣', focused: '🐣', happy: '🐥', sad: '😢', celebrating: '🎉' },
  },
  {
    id: 'baby', name: 'Ember', minXP: 1000,
    sprites: { idle: '🐉', focused: '🔥', happy: '🐲', sad: '😢', celebrating: '🎉' },
  },
  {
    id: 'young', name: 'Blaze', minXP: 3000,
    sprites: { idle: '🐲', focused: '🔥', happy: '⚡', sad: '😞', celebrating: '🏆' },
  },
  {
    id: 'fire', name: 'Inferno', minXP: 7000,
    sprites: { idle: '🔥', focused: '💥', happy: '⚡', sad: '😤', celebrating: '🏆' },
  },
  {
    id: 'celestial', name: 'Astra', minXP: 15000,
    sprites: { idle: '✨', focused: '🌟', happy: '💫', sad: '🌙', celebrating: '👑' },
  },
];

const STAGE_COLORS: Record<string, string> = {
  egg: 'from-stone-400/20 to-amber-400/20',
  hatchling: 'from-amber-400/20 to-lime-400/20',
  baby: 'from-orange-400/20 to-red-400/20',
  young: 'from-red-400/20 to-purple-400/20',
  fire: 'from-red-500/20 to-amber-500/20',
  celestial: 'from-violet-400/20 to-cyan-400/20',
};

const STAGE_BORDER_GLOW: Record<string, string> = {
  egg: '',
  hatchling: '',
  baby: 'shadow-[0_0_8px_rgba(249,115,22,0.3)]',
  young: 'shadow-[0_0_12px_rgba(168,85,247,0.3)]',
  fire: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]',
  celestial: 'shadow-[0_0_20px_rgba(139,92,246,0.5)]',
};

function getStageIndex(xp: number): number {
  for (let i = PET_STAGES.length - 1; i >= 0; i--) {
    if (xp >= PET_STAGES[i].minXP) return i;
  }
  return 0;
}

const PET_MESSAGES: Record<PetMood, Record<string, string[]>> = {
  idle: {
    egg: ['💤 Zzz... Waiting to hatch...', '🫧 *snoring inside shell*', '😴 Study to help me hatch!'],
    hatchling: ['🐣 Peep peep! Let\'s study!', '😴 Napping... wake me up!', '🌱 I need XP to grow!'],
    baby: ['💤 Zzz... Wake me to train!', '🐉 Dreaming of fire...', '😴 Ready when you are!'],
    young: ['🐲 Sharpening my claws...', '💤 Resting between battles', '⚔️ Waiting for the quest!'],
    fire: ['🔥 My flames flicker...', '💤 Conserving energy', '⚡ Ready to ignite!'],
    celestial: ['✨ Floating among stars...', '🌟 Meditating...', '💫 The cosmos awaits...'],
  },
  focused: {
    egg: ['🥚 Cracking sounds... keep going!', '🔥 I feel warmth!', '⚡ Energy building!'],
    hatchling: ['📖 Studying with you!', '🧠 Learning together!', '⚡ Growing stronger!'],
    baby: ['📖 Training alongside you!', '🧠 Focus power rising!', '🔥 In the zone!'],
    young: ['⚔️ Battling alongside you!', '💪 Power level rising!', '🔥 Unstoppable combo!'],
    fire: ['💥 MAXIMUM POWER!', '🔥 Burning through problems!', '⚡ Lightning focus!'],
    celestial: ['🌟 Channeling cosmic energy!', '✨ Transcendent focus!', '💫 Beyond mortal limits!'],
  },
  happy: {
    egg: ['☀️ Warm and cozy!', '🫧 *happy wobble*'],
    hatchling: ['☕ Break time chirps!', '🌿 Stretching my wings!'],
    baby: ['☕ Enjoy your break!', '🌿 Recharging fire!', '😊 Great session!'],
    young: ['🍖 Time for a feast!', '😊 Excellent training!', '🌿 Recharging power!'],
    fire: ['🏔️ Surveying my domain', '😊 Impressive work!', '🍖 Feasting on success!'],
    celestial: ['🌌 Gazing at galaxies...', '😊 Cosmic break time', '💫 Recharging stardust!'],
  },
  sad: {
    egg: ['🥚 *stops wobbling*', '😢 It got cold...'],
    hatchling: ['😢 Why did you stop...?', '🥺 Let\'s try again!'],
    baby: ['😢 Why did you stop...?', '💔 I was rooting for you...', '🥺 Let\'s try again!'],
    young: ['😞 The battle paused...', '💔 We were winning!', '🥺 Don\'t give up!'],
    fire: ['😤 My flames dimmed!', '💔 We had momentum!', '🥺 Relight the fire!'],
    celestial: ['🌙 Stars dim with sadness...', '💔 The cosmos weeps...', '🥺 Let\'s realign!'],
  },
  celebrating: {
    egg: ['🐣 Cracking open!', '⭐ Energy surge!'],
    hatchling: ['🎉 I did a flip!', '⭐ +XP! Growing fast!'],
    baby: ['🎉 We did it! Amazing!', '🏆 Session complete!', '🐉 I grew stronger!'],
    young: ['🎉 VICTORY! Incredible!', '🏆 Quest complete!', '⚔️ Level up incoming!'],
    fire: ['🏆 UNSTOPPABLE!', '💥 LEGENDARY SESSION!', '🔥 SCORCHING SUCCESS!'],
    celestial: ['👑 TRANSCENDENT!', '🌟 COSMIC TRIUMPH!', '✨ THE STARS ALIGN!'],
  },
};

export default function PomodoroPet({ isRunning, phase, progress, sessions, totalXP = 0, wasAbandoned = false }: PomodoroPetProps) {
  const stageIndex = getStageIndex(totalXP);
  const stage = PET_STAGES[stageIndex];
  const nextStage = stageIndex < PET_STAGES.length - 1 ? PET_STAGES[stageIndex + 1] : null;

  const mood: PetMood = useMemo(() => {
    if (wasAbandoned) return 'sad';
    if (phase !== 'focus' && !isRunning && sessions > 0 && progress === 0) return 'celebrating';
    if (phase !== 'focus') return 'happy';
    if (isRunning) return 'focused';
    return 'idle';
  }, [isRunning, phase, progress, sessions, wasAbandoned]);

  const sprite = stage.sprites[mood];

  const message = useMemo(() => {
    const stageMessages = PET_MESSAGES[mood][stage.id] || PET_MESSAGES[mood].baby;
    return stageMessages[Math.floor(Math.random() * stageMessages.length)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, sessions, stage.id]);

  // Happiness level for the progress bar
  const happiness = useMemo(() => {
    if (mood === 'celebrating') return 100;
    if (mood === 'sad') return Math.max(10, 50 - sessions * 2);
    if (mood === 'focused') return 50 + Math.floor(progress * 50);
    if (mood === 'happy') return 75;
    return 40 + Math.min(sessions * 3, 30);
  }, [mood, progress, sessions]);

  // Evolution progress (XP toward next stage)
  const evolutionProgress = nextStage
    ? Math.min((totalXP - stage.minXP) / (nextStage.minXP - stage.minXP), 1)
    : 1;

  const bgGradient = STAGE_COLORS[stage.id] || 'from-primary/10 to-secondary/10';
  const glow = STAGE_BORDER_GLOW[stage.id] || '';

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

          {/* Celestial sparkles for max stage */}
          <AnimatePresence>
            {stage.id === 'celestial' && (
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
            <p className="text-xs font-heading font-bold">{stage.name}</p>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
              stage.id === 'celestial' ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-violet-400' :
              stage.id === 'fire' ? 'bg-red-500/10 text-red-400' :
              stage.id === 'young' ? 'bg-purple-500/10 text-purple-400' :
              'bg-primary/10 text-primary'
            }`}>
              Stage {stageIndex + 1}/{PET_STAGES.length}
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
          {nextStage ? (
            <div className="mt-1.5 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Evolution → {nextStage.name}
                </span>
                <span className="text-[8px] font-bold text-[var(--muted-foreground)]">
                  {totalXP.toLocaleString()}/{nextStage.minXP.toLocaleString()} XP
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
