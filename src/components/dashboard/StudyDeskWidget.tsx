'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  HiSparkles,
  HiHeart,
  HiChevronRight,
  HiLightningBolt,
  HiMoon,
  HiSun,
} from 'react-icons/hi';
import { usePet } from '@/hooks/usePet';
import { useShop } from '@/hooks/useShop';
import { useGamification } from '@/hooks/useGamification';
import { useTasks } from '@/hooks/useTasks';
import { PetSpecies } from '@/types';
import { PET_SPECIES_CONFIG, PET_STAGES } from '@/lib/constants';
import ChibiCompanionSprite, { CompanionAction } from '@/components/gamification/ChibiCompanionSprite';
import CompanionDrawer from '@/components/pets/CompanionDrawer';
import {
  playCompanionVocal,
  playMunchSound,
  playPurrSound,
  playCompanionCelebration,
  triggerHaptic,
} from '@/lib/companionAudio';
import { playClick } from '@/lib/sounds';

interface StudyDeskWidgetProps {
  className?: string;
}

function StudyDeskWidget({ className = '' }: StudyDeskWidgetProps) {
  const { pet, feedPet, playWithPet } = usePet();
  const { coins, addCoins } = useShop();
  const { gamification } = useGamification();
  const { tasks } = useTasks();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSquishing, setIsSquishing] = useState(false);
  const [petActionCount, setPetActionCount] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const currentSpecies: PetSpecies = pet?.species || 'owl';
  const stage = pet?.stage ?? 0;
  const stageDef = PET_STAGES[stage] || PET_STAGES[0];
  const hunger = pet?.hunger ?? 80;
  const happiness = pet?.happiness ?? 80;
  const level = pet?.level ?? 1;
  const exp = pet?.exp ?? 0;

  // Emotional reactivity based on time of day & quest completions
  const currentAction: CompanionAction = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) return 'sleep';
    if (gamification && gamification.streak >= 3) return 'celebrate';
    return 'idle';
  }, [gamification?.streak]);

  const hasInProgressTask = useMemo(
    () => tasks?.some((t) => t.status === 'in-progress') ?? false,
    [tasks]
  );

  // Contextual companion quote
  const dialogueLine = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) return 'Zzz... peaceful midnight rest... 🌙';
    if (hasInProgressTask) {
      return 'Laser focus on your active quest! ⚔️';
    }
    if (gamification && gamification.streak >= 3) {
      return `Blazing ${gamification.streak}-day streak! Keep it burning! 🔥`;
    }
    return 'Ready to study and conquer today? 📖';
  }, [hasInProgressTask, gamification?.streak]);

  // ── Pet Cuddle Handler ─────────────────────────────────────────
  const handleDeskPet = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsSquishing(true);
    triggerHaptic([15, 30, 15]);

    const count = petActionCount + 1;
    setPetActionCount(count);

    if (count % 3 === 0) {
      playPurrSound();
    } else {
      playCompanionVocal(currentSpecies);
    }

    // Spawn floating heart
    const newHeart = { id: Date.now(), x: Math.random() * 40 - 20, y: -10 };
    setFloatingHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1200);

    setTimeout(() => {
      setIsSquishing(false);
    }, 600);

    await playWithPet();
  };

  // ── Quick Feed Handler ─────────────────────────────────────────
  const handleQuickFeed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (coins < 10) {
      toast.error('Cookies cost 10 coins! Study to earn more. 🪙');
      return;
    }

    playMunchSound();
    setIsSquishing(true);
    triggerHaptic([20, 40, 20]);

    await addCoins(-10);
    await feedPet(25, 10);
    toast.success(`Fed ${pet?.name || 'Companion'}! 🍪 (+25 EXP)`);

    setTimeout(() => {
      setIsSquishing(false);
    }, 700);
  };

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-indigo-950/60 border border-white/10 hover:border-indigo-500/30 transition-all shadow-xl backdrop-blur-2xl text-white group flex flex-col justify-between ${className}`}
      >
        {/* Ambient Desk Lighting Glow */}
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none group-hover:bg-indigo-500/25 transition-all duration-700" />

        {/* ── Card Header ── */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🪑</span>
            <div>
              <h3 className="font-heading font-black text-sm text-white tracking-wide flex items-center gap-1.5">
                Study Desk
                <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  Lv.{level}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {pet?.name || 'Companion'} • {stageDef.name}
              </p>
            </div>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>Hub</span>
            <HiChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── 2.5D Desk Diorama Scene ── */}
        <div
          onClick={() => handleDeskPet()}
          className="relative my-4 py-3 flex flex-col items-center justify-center cursor-pointer select-none"
          title="Click to cuddle your study companion!"
        >
          {/* Floating Heart Particles */}
          <AnimatePresence>
            {floatingHearts.map((heart) => (
              <motion.span
                key={heart.id}
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: 1, y: -30, x: heart.x, scale: 1.2 }}
                exit={{ opacity: 0, y: -45, scale: 0.8 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="absolute text-pink-400 text-sm pointer-events-none z-30"
              >
                💖
              </motion.span>
            ))}
          </AnimatePresence>

          {/* Dialogue Speech Bubble */}
          <div className="mb-2 text-center max-w-[220px]">
            <span className="inline-block bg-slate-900/90 text-slate-200 text-[10px] font-semibold px-2.5 py-1 rounded-xl border border-white/10 shadow-md backdrop-blur-md">
              {dialogueLine}
            </span>
          </div>

          {/* Character on Desk */}
          <div className="relative z-10 hover:scale-105 active:scale-95 transition-transform duration-200">
            <ChibiCompanionSprite
              species={currentSpecies}
              action={currentAction}
              size={88}
              isSquishing={isSquishing}
              showShadow={true}
              showAura={true}
            />
          </div>

          {/* ── Desk Surface & Accessories ── */}
          <div className="relative w-full max-w-[220px] -mt-2">
            {/* Wooden/Slate Desk Surface Rim */}
            <div className="w-full h-3 rounded-full bg-gradient-to-r from-slate-700 via-indigo-900/60 to-slate-700 border border-white/15 shadow-lg" />

            {/* Desktop Accessories (Open Book, Potion, Mug) */}
            <div className="flex items-center justify-between px-3 -mt-2.5 text-xs pointer-events-none opacity-80">
              <span className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">📖</span>
              <span className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] text-[10px]">☕</span>
              <span className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">🧪</span>
            </div>
          </div>
        </div>

        {/* ── Card Footer: Stats & Quick Care Actions ── */}
        <div className="relative z-10 space-y-3 pt-1 border-t border-white/5">
          {/* Quick EXP Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Bond Level {level}</span>
              <span>{exp}/100 EXP</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800/90 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, exp)}%` }}
              />
            </div>
          </div>

          {/* Action Buttons (Feed / Cuddle) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleQuickFeed}
              className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 hover:border-amber-500/30 text-xs font-bold text-amber-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <span>🍪</span> Feed (10c)
            </button>
            <button
              onClick={handleDeskPet}
              className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 hover:border-pink-500/30 text-xs font-bold text-pink-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <span>💖</span> Cuddle
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Companion Drawer */}
      <CompanionDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}

export default React.memo(StudyDeskWidget);
