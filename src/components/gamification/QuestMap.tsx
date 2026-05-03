'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGamification } from '@/hooks/useGamification';
import { useAuthContext } from '@/context/AuthContext';
import { getAvatarUrl, LEVEL_THRESHOLDS, getLevelProgress, TITLES } from '@/lib/constants';
import AvatarBorder from '@/components/gamification/AvatarBorder';

/* ============================================================
   QuestMap — Visual progression map à la Super Mario World
   
   Shows a winding path through biomes with the user's avatar
   positioned at their current level. Each node = 1 level.
   ============================================================ */

interface Biome {
  name: string;
  emoji: string;
  levelRange: [number, number]; // inclusive
  bgGradient: string;
  pathColor: string;
  glowColor: string;
  description: string;
}

const BIOMES: Biome[] = [
  {
    name: 'Novice Village',
    emoji: '🏘️',
    levelRange: [0, 3],
    bgGradient: 'from-emerald-900/20 to-emerald-800/10',
    pathColor: '#4ADE80',
    glowColor: 'rgba(74, 222, 128, 0.3)',
    description: 'Where every adventure begins...',
  },
  {
    name: 'Valley of Focus',
    emoji: '🏞️',
    levelRange: [4, 7],
    bgGradient: 'from-sky-900/20 to-blue-800/10',
    pathColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.3)',
    description: 'Sharpen your mind in the calm valley.',
  },
  {
    name: 'The Arcane Library',
    emoji: '📖',
    levelRange: [8, 11],
    bgGradient: 'from-violet-900/20 to-purple-800/10',
    pathColor: '#A78BFA',
    glowColor: 'rgba(167, 139, 250, 0.3)',
    description: 'Ancient knowledge awaits the worthy.',
  },
  {
    name: 'Mountains of Mastery',
    emoji: '⛰️',
    levelRange: [12, 15],
    bgGradient: 'from-amber-900/20 to-orange-800/10',
    pathColor: '#FBBF24',
    glowColor: 'rgba(251, 191, 36, 0.3)',
    description: 'Only the determined reach these peaks.',
  },
  {
    name: 'The Celestial Summit',
    emoji: '🌌',
    levelRange: [16, 20],
    bgGradient: 'from-pink-900/20 to-rose-800/10',
    pathColor: '#F472B6',
    glowColor: 'rgba(244, 114, 182, 0.3)',
    description: 'Legends are forged among the stars.',
  },
];

function getBiome(level: number): Biome {
  for (const b of BIOMES) {
    if (level >= b.levelRange[0] && level <= b.levelRange[1]) return b;
  }
  return BIOMES[BIOMES.length - 1];
}

// Generate a winding path with nodes
function getNodePositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const totalHeight = count * 60;

  for (let i = 0; i < count; i++) {
    // Zigzag pattern — alternates left and right
    const progress = i / (count - 1 || 1);
    const x = 50 + Math.sin(i * 0.8) * 28; // percentage from left
    const y = (1 - progress) * 100; // bottom to top
    positions.push({ x, y });
  }

  return positions;
}

export default function QuestMap() {
  const { gamification } = useGamification();
  const { profile } = useAuthContext();

  const level = gamification?.level || 0;
  const progress = getLevelProgress(gamification?.xp || 0);
  const currentBiome = getBiome(level);

  const avatarUrl = profile
    ? getAvatarUrl(profile.avatarSeed, profile.avatarStyle)
    : '';

  const nodeCount = LEVEL_THRESHOLDS.length; // 21 nodes (0-20)
  const nodes = useMemo(() => getNodePositions(nodeCount), [nodeCount]);

  // Get unlocked titles for display
  const unlockedTitles = useMemo(() => {
    if (!gamification) return [];
    return TITLES.filter((t) => t.condition(gamification));
  }, [gamification]);

  return (
    <div className="space-y-4">
      {/* Current biome header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-heading font-bold flex items-center gap-2">
            {currentBiome.emoji} {currentBiome.name}
          </h2>
          <p className="text-xs text-[var(--muted-foreground)]">{currentBiome.description}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-heading font-black">Level {level}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {gamification?.xp?.toLocaleString() || 0} XP total
          </p>
        </div>
      </div>

      {/* Quest Map */}
      <div
        className={`relative rounded-2xl border-2 border-[var(--card-border)] overflow-hidden bg-gradient-to-b ${currentBiome.bgGradient}`}
        style={{ minHeight: '520px' }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Floating particles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: currentBiome.pathColor,
                opacity: 0.15 + Math.random() * 0.2,
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
              }}
              animate={{
                y: [-10, 10, -10],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* SVG path connecting nodes */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          {nodes.map((node, i) => {
            if (i === 0) return null;
            const prev = nodes[i - 1];
            const isPassed = i <= level;
            return (
              <line
                key={`path-${i}`}
                x1={prev.x}
                y1={prev.y}
                x2={node.x}
                y2={node.y}
                stroke={isPassed ? currentBiome.pathColor : 'var(--card-border)'}
                strokeWidth={isPassed ? 0.6 : 0.3}
                strokeDasharray={isPassed ? 'none' : '1,1'}
                opacity={isPassed ? 0.8 : 0.4}
              />
            );
          })}
        </svg>

        {/* Level nodes */}
        {nodes.map((node, i) => {
          const isPassed = i < level;
          const isCurrent = i === level;
          const isFuture = i > level;
          const biome = getBiome(i);

          return (
            <motion.div
              key={`node-${i}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              {/* Current level — show avatar */}
              {isCurrent ? (
                <div className="relative">
                  <motion.div
                    animate={{
                      y: [-3, 3, -3],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AvatarBorder level={level} size={36}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="You" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-sm">🦉</div>
                      )}
                    </AvatarBorder>
                  </motion.div>

                  {/* Label */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-white shadow-lg">
                      Lv.{i} — YOU
                    </span>
                  </div>

                  {/* Pulse ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: currentBiome.pathColor }}
                    animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
              ) : (
                <>
                  {/* Regular node */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[7px] font-black transition-all ${
                      isPassed
                        ? 'bg-[var(--card-bg)] border-current text-current shadow-md'
                        : 'bg-[var(--card-bg)]/40 border-[var(--card-border)] text-[var(--muted)]'
                    }`}
                    style={isPassed ? { color: biome.pathColor, boxShadow: `0 0 8px ${biome.glowColor}` } : {}}
                  >
                    {isPassed ? '✓' : i}
                  </div>

                  {/* Biome label at first node of each biome */}
                  {i === getBiome(i).levelRange[0] && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full whitespace-nowrap hidden sm:block">
                      <span
                        className="text-[7px] font-bold px-1.5 py-0.5 rounded-md border"
                        style={{
                          borderColor: biome.pathColor,
                          color: biome.pathColor,
                          backgroundColor: `${biome.glowColor}`,
                        }}
                      >
                        {biome.emoji} {biome.name}
                      </span>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          );
        })}

        {/* Biome legend at top */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
          {BIOMES.map((b) => {
            const isActive = level >= b.levelRange[0] && level <= b.levelRange[1];
            return (
              <span
                key={b.name}
                className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full border transition-all ${
                  isActive ? 'scale-105' : 'opacity-50'
                }`}
                style={{
                  borderColor: b.pathColor,
                  color: b.pathColor,
                  backgroundColor: isActive ? b.glowColor : 'transparent',
                }}
              >
                {b.emoji} {b.name} ({b.levelRange[0]}-{b.levelRange[1]})
              </span>
            );
          })}
        </div>
      </div>

      {/* Unlocked Titles */}
      {unlockedTitles.length > 0 && (
        <div>
          <h3 className="text-xs font-heading font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
            🏆 Titles Earned ({unlockedTitles.length}/{TITLES.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {TITLES.map((title) => {
              const unlocked = gamification ? title.condition(gamification) : false;
              const isEquipped = profile?.equippedTitle === title.id;
              return (
                <div
                  key={title.id}
                  className={`px-2.5 py-1.5 rounded-xl border-2 text-[10px] font-bold transition-all ${
                    unlocked
                      ? isEquipped
                        ? 'border-primary bg-primary/10 text-primary shadow-[0_0_10px_var(--color-primary-glow)]'
                        : 'border-[var(--card-border)] hover:border-primary/30'
                      : 'border-[var(--card-border)] opacity-30 grayscale'
                  }`}
                >
                  {title.emoji} {title.name}
                  {isEquipped && <span className="ml-1 text-[8px]">✦ EQUIPPED</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
