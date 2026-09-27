'use client';

import React, { useState } from 'react';
import { Drawer } from 'vaul';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  HiX,
  HiChevronRight,
  HiOutlineShoppingBag,
  HiPencil,
  HiCheck,
} from 'react-icons/hi';
import { usePet } from '@/hooks/usePet';
import { useShop } from '@/hooks/useShop';
import { PetSpecies } from '@/types';
import { PET_SPECIES_CONFIG, PET_STAGES } from '@/lib/constants';
import ChibiCompanionSprite, { CompanionAction } from '@/components/gamification/ChibiCompanionSprite';
import {
  playCompanionVocal,
  playMunchSound,
  playPurrSound,
  playCompanionCelebration,
  triggerHaptic,
} from '@/lib/companionAudio';
import { playClick } from '@/lib/sounds';

interface CompanionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export default function CompanionDrawer({ open, onOpenChange, trigger }: CompanionDrawerProps) {
  const { pet, feedPet, playWithPet, updatePet } = usePet();
  const { coins, addCoins } = useShop();

  const [currentAction, setCurrentAction] = useState<CompanionAction>('idle');
  const [isSquishing, setIsSquishing] = useState(false);
  const [petActionCount, setPetActionCount] = useState(0);

  // Local Roaming Companion preferences with lazy initialization
  const [petVisible, setPetVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const savedVis = localStorage.getItem('sq-pixel-pet-visible');
      return savedVis !== null ? savedVis === 'true' : true;
    } catch {
      return true;
    }
  });
  const [platform, setPlatform] = useState<'header' | 'footer'>(() => {
    if (typeof window === 'undefined') return 'header';
    try {
      const savedPlat = localStorage.getItem('sq-pixel-pet-platform');
      return savedPlat === 'footer' ? 'footer' : 'header';
    } catch {
      return 'header';
    }
  });

  // Mini-Game State
  const [activeTab, setActiveTab] = useState<'care' | 'game' | 'settings'>('care');
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [playerChoice, setPlayerChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [petChoice, setPetChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);

  // Rename modal
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const currentSpecies: PetSpecies = pet?.species || 'owl';
  const currentStageDef = PET_STAGES[pet?.stage || 0] || PET_STAGES[0];
  const hunger = pet?.hunger ?? 80;
  const happiness = pet?.happiness ?? 80;
  const level = pet?.level ?? 1;
  const exp = pet?.exp ?? 0;

  // ── Pet Cuddle Interaction ─────────────────────────────────────
  const handlePetCompanion = async () => {
    setIsSquishing(true);
    setCurrentAction('celebrate');
    triggerHaptic([15, 25, 15]);

    const nextCount = petActionCount + 1;
    setPetActionCount(nextCount);

    if (nextCount % 4 === 0) {
      playPurrSound();
    } else {
      playCompanionVocal(currentSpecies);
    }

    setTimeout(() => {
      setIsSquishing(false);
      setCurrentAction('idle');
    }, 700);

    await playWithPet();
  };

  // ── Feed Interaction ──────────────────────────────────────────
  const handleFeed = async () => {
    if (coins < 10) {
      toast.error('Cookies cost 10 coins! Study to earn more. 🪙');
      return;
    }

    playMunchSound();
    setIsSquishing(true);
    setCurrentAction('celebrate');
    triggerHaptic([20, 40, 20]);

    await addCoins(-10);
    await feedPet(25, 10);

    toast.success(`Fed ${pet?.name || 'Companion'} a delicious snack! 🍪 (+25 EXP)`);

    setTimeout(() => {
      setIsSquishing(false);
      setCurrentAction('idle');
    }, 800);
  };

  // ── Rock Paper Scissors Mini-Game ──────────────────────────────
  const handlePlayRPS = async (choice: 'rock' | 'paper' | 'scissors') => {
    playClick();
    setPlayerChoice(choice);
    const options: ('rock' | 'paper' | 'scissors')[] = ['rock', 'paper', 'scissors'];
    const botChoice = options[Math.floor(Math.random() * 3)];
    setPetChoice(botChoice);

    if (choice === botChoice) {
      setGameResult("It's a tie! 🤝");
      setCurrentAction('idle');
    } else if (
      (choice === 'rock' && botChoice === 'scissors') ||
      (choice === 'paper' && botChoice === 'rock') ||
      (choice === 'scissors' && botChoice === 'paper')
    ) {
      setGameResult(`You won! ${pet?.name || 'Companion'} cheers! 🎉`);
      setCurrentAction('celebrate');
      playCompanionCelebration();
      await addCoins(5);
      await playWithPet();
      toast.success('Victory! +5 Coins awarded 🪙');
    } else {
      setGameResult(`${pet?.name || 'Companion'} won this round! 🥰`);
      setCurrentAction('celebrate');
      playCompanionVocal(currentSpecies);
      await playWithPet();
    }

    setTimeout(() => {
      setCurrentAction('idle');
    }, 1500);
  };

  // ── Switch Pet Species ─────────────────────────────────────────
  const handleSelectSpecies = async (species: PetSpecies) => {
    playClick();
    playCompanionVocal(species);
    await updatePet({ species });
    const skinIndex = species === 'cat' ? 0 : species === 'owl' ? 1 : 2;
    try {
      localStorage.setItem('sq-pixel-pet-skin', String(skinIndex));
    } catch {}
    toast.success(`Companion transformed to ${PET_SPECIES_CONFIG[species]?.name || species}! ✨`);
  };

  // ── Toggle Roaming Platform / Visibility ───────────────────────
  const handleToggleVisible = () => {
    playClick();
    const next = !petVisible;
    setPetVisible(next);
    try {
      localStorage.setItem('sq-pixel-pet-visible', String(next));
    } catch {}
  };

  const handleTogglePlatform = () => {
    playClick();
    const next = platform === 'header' ? 'footer' : 'header';
    setPlatform(next);
    try {
      localStorage.setItem('sq-pixel-pet-platform', next);
    } catch {}
  };

  // ── Rename Pet ────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    await updatePet({ name: editedName.trim() });
    setIsEditingName(false);
    toast.success('Companion name updated! 🏷️');
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[92vh] md:max-w-xl md:mx-auto md:bottom-6 md:rounded-[32px] bg-slate-900/95 dark:bg-slate-950/95 border-t md:border border-white/10 rounded-t-[28px] shadow-2xl backdrop-blur-2xl z-50 flex flex-col outline-none focus:outline-none text-white select-none">
          {/* iOS Drawer Grab Handle */}
          <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mt-3 mb-2" />

          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐾</span>
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="bg-slate-800 border border-indigo-500/50 rounded-lg px-2 py-0.5 text-sm font-bold text-white focus:outline-none"
                    placeholder="Pet name..."
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="p-1 text-emerald-400 hover:text-emerald-300">
                    <HiCheck className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsEditingName(false)} className="p-1 text-slate-400 hover:text-slate-300">
                    <HiX className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white tracking-wide">
                    {pet?.name || 'Companion'}
                  </h3>
                  <button
                    onClick={() => {
                      setEditedName(pet?.name || '');
                      setIsEditingName(true);
                    }}
                    className="text-slate-400 hover:text-indigo-400 transition-colors p-1"
                    title="Rename"
                  >
                    <HiPencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-bold">
                Lv.{level} {currentStageDef.name}
              </span>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors"
              >
                <HiX className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body Scroll Container */}
          <div className="overflow-y-auto px-6 py-4 flex-1 space-y-5">
            {/* ── Companion Stage & Character Viewport ── */}
            <div className="relative rounded-3xl p-5 bg-gradient-to-b from-indigo-950/40 via-slate-900/60 to-slate-950/80 border border-white/10 flex flex-col items-center justify-center text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/15 via-transparent to-transparent pointer-events-none" />

              <ChibiCompanionSprite
                species={currentSpecies}
                action={currentAction}
                size={110}
                isSquishing={isSquishing}
                onClick={handlePetCompanion}
                className="cursor-pointer transition-transform hover:scale-105 active:scale-95 z-10"
              />

              <p className="mt-2 text-xs text-slate-400 font-medium">
                Tap companion to cuddle & play! 💖
              </p>

              {/* EXP Progress Bar */}
              <div className="w-full mt-3 space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Level Progress</span>
                  <span>{exp} / 100 EXP</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (exp / 100) * 100)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Vitals Meters (Hunger & Happiness) */}
              <div className="grid grid-cols-2 gap-3 w-full mt-4">
                <div className="p-2.5 rounded-2xl bg-slate-800/50 border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1 text-slate-300">🍎 Hunger</span>
                    <span
                      className={
                        hunger > 60
                          ? 'text-emerald-400'
                          : hunger > 30
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }
                    >
                      {hunger}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        hunger > 60 ? 'bg-emerald-500' : hunger > 30 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${hunger}%` }}
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-800/50 border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1 text-slate-300">💖 Happy</span>
                    <span
                      className={
                        happiness > 60
                          ? 'text-emerald-400'
                          : happiness > 30
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }
                    >
                      {happiness}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        happiness > 60 ? 'bg-emerald-500' : happiness > 30 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${happiness}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Segmented Navigation Tabs ── */}
            <div className="flex rounded-2xl bg-slate-800/70 p-1 border border-white/5 text-xs font-bold">
              <button
                onClick={() => { setActiveTab('care'); playClick(); }}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  activeTab === 'care'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Care & Feed
              </button>
              <button
                onClick={() => { setActiveTab('game'); playClick(); }}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  activeTab === 'game'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mini-Game
              </button>
              <button
                onClick={() => { setActiveTab('settings'); playClick(); }}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  activeTab === 'settings'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Skins & Roam
              </button>
            </div>

            {/* ── Tab Content: Care & Feed ── */}
            {activeTab === 'care' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleFeed}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 hover:from-amber-500/30 hover:to-orange-600/30 border border-amber-500/30 flex flex-col items-center justify-center text-center gap-1 transition-all"
                  >
                    <span className="text-2xl">🍪</span>
                    <span className="font-bold text-xs text-amber-200">Feed Cookie</span>
                    <span className="text-[10px] text-amber-300/80 font-mono">10 Coins (Have {coins})</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handlePetCompanion}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-600/20 hover:from-pink-500/30 hover:to-rose-600/30 border border-pink-500/30 flex flex-col items-center justify-center text-center gap-1 transition-all"
                  >
                    <span className="text-2xl">💖</span>
                    <span className="font-bold text-xs text-pink-200">Pet & Cuddle</span>
                    <span className="text-[10px] text-pink-300/80 font-mono">+10 Happy & EXP</span>
                  </motion.button>
                </div>
              </div>
            )}

            {/* ── Tab Content: Rock Paper Scissors Mini-Game ── */}
            {activeTab === 'game' && (
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 space-y-3 text-center">
                <p className="text-xs text-slate-300 font-medium">
                  Challenge {pet?.name || 'Companion'} to Rock Paper Scissors!
                </p>

                <div className="flex justify-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handlePlayRPS('rock')}
                    className="p-3 rounded-2xl bg-slate-700/60 hover:bg-indigo-600/40 border border-white/10 text-2xl transition-all"
                  >
                    🪨
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handlePlayRPS('paper')}
                    className="p-3 rounded-2xl bg-slate-700/60 hover:bg-indigo-600/40 border border-white/10 text-2xl transition-all"
                  >
                    📄
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handlePlayRPS('scissors')}
                    className="p-3 rounded-2xl bg-slate-700/60 hover:bg-indigo-600/40 border border-white/10 text-2xl transition-all"
                  >
                    ✂️
                  </motion.button>
                </div>

                {gameResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-indigo-500/30 text-xs font-semibold text-indigo-200 space-y-1"
                  >
                    <div className="flex justify-center items-center gap-4 text-[11px] text-slate-400">
                      <span>You: {playerChoice === 'rock' ? '🪨' : playerChoice === 'paper' ? '📄' : '✂️'}</span>
                      <span>vs</span>
                      <span>{pet?.name || 'Pet'}: {petChoice === 'rock' ? '🪨' : petChoice === 'paper' ? '📄' : '✂️'}</span>
                    </div>
                    <p className="font-bold">{gameResult}</p>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Tab Content: Skins & Roaming Settings ── */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                {/* Species Select */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-2 block">
                    Active Companion Form
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['owl', 'cat', 'dragon'] as PetSpecies[]).map((sp) => {
                      const isSelected = currentSpecies === sp;
                      const label = sp === 'owl' ? '🦉 Questie' : sp === 'cat' ? '🐱 Cyber Cat' : '🐉 Dragon';
                      return (
                        <button
                          key={sp}
                          onClick={() => handleSelectSpecies(sp)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                              : 'bg-slate-800/80 text-slate-300 border-white/5 hover:border-white/20'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Roaming Companion Edge Settings */}
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Roaming Companion</div>
                      <div className="text-[10px] text-slate-400">Walk along screen borders</div>
                    </div>
                    <button
                      onClick={handleToggleVisible}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                        petVisible ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          petVisible ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {petVisible && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-xs text-slate-300">Roam Platform</span>
                      <button
                        onClick={handleTogglePlatform}
                        className="px-3 py-1 rounded-xl bg-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-600 transition-colors"
                      >
                        {platform === 'header' ? 'Top Header' : 'Bottom Footer'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Footer Navigation Links ── */}
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/pets"
                onClick={() => onOpenChange(false)}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors"
              >
                <span>Full Pet Sanctuary</span>
                <HiChevronRight className="w-4 h-4" />
              </Link>

              <Link
                href="/shop"
                onClick={() => onOpenChange(false)}
                className="py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-colors"
              >
                <HiOutlineShoppingBag className="w-4 h-4" />
                <span>Shop</span>
              </Link>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
