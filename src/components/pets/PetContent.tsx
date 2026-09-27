'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiSparkles,
  HiCheck,
  HiX,
  HiPencil,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import PageTransition from '@/components/layout/PageTransition';
import { usePet } from '@/hooks/usePet';
import { useShop } from '@/hooks/useShop';
import { useGamification } from '@/hooks/useGamification';
import { PET_SPECIES_CONFIG, PET_STAGES, SHOP_ITEMS } from '@/lib/constants';
import { PetSpecies, EvolutionRequirement } from '@/types';
import { playSuccess, playClick, playXP } from '@/lib/sounds';
import {
  playCompanionVocal,
  playPurrSound,
  playMunchSound,
  playCompanionCelebration,
  playSnoreSound,
  triggerHaptic,
} from '@/lib/companionAudio';
import { useConfetti } from '@/components/gamification/ConfettiExplosion';
import ChibiCompanionSprite, { CompanionAction } from '@/components/gamification/ChibiCompanionSprite';

const SPECIES_LIST: PetSpecies[] = ['owl', 'cat', 'dragon'];

type PetTab = 'overview' | 'wardrobe' | 'evolution';

type HabitatTheme = 'grove' | 'celestial' | 'sunset' | 'study';

interface ThemeConfig {
  name: string;
  emoji: string;
  bgGradient: string;
  pedestalGradient: string;
  pedestalBorder: string;
  ambientParticles: string;
  badgeColor: string;
}

const HABITAT_THEMES: Record<HabitatTheme, ThemeConfig> = {
  grove: {
    name: 'Enchanted Grove',
    emoji: '🌿',
    bgGradient: 'from-emerald-950/90 via-teal-900/60 to-slate-950',
    pedestalGradient: 'from-emerald-500/30 via-teal-600/30 to-emerald-950/60',
    pedestalBorder: 'border-emerald-500/40',
    ambientParticles: 'text-emerald-300/40',
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  },
  celestial: {
    name: 'Astral Cosmos',
    emoji: '🌌',
    bgGradient: 'from-indigo-950/90 via-purple-900/60 to-slate-950',
    pedestalGradient: 'from-indigo-500/30 via-purple-600/30 to-indigo-950/60',
    pedestalBorder: 'border-indigo-500/40',
    ambientParticles: 'text-purple-300/40',
    badgeColor: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10',
  },
  sunset: {
    name: 'Golden Horizon',
    emoji: '🌅',
    bgGradient: 'from-amber-950/90 via-rose-900/60 to-slate-950',
    pedestalGradient: 'from-amber-500/30 via-rose-600/30 to-amber-950/60',
    pedestalBorder: 'border-amber-500/40',
    ambientParticles: 'text-amber-300/40',
    badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
  },
  study: {
    name: 'Arcane Study',
    emoji: '🏮',
    bgGradient: 'from-slate-950 via-sky-950/70 to-slate-950',
    pedestalGradient: 'from-amber-500/25 via-sky-600/25 to-slate-900/60',
    pedestalBorder: 'border-sky-500/40',
    ambientParticles: 'text-sky-300/40',
    badgeColor: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
  },
};

function pickRandomMove(): 'rock' | 'paper' | 'scissors' {
  const options: ('rock' | 'paper' | 'scissors')[] = ['rock', 'paper', 'scissors'];
  return options[Math.floor(Math.random() * 3)];
}

export default function PetContent() {
  const {
    pet,
    loading,
    hasPet,
    createPet,
    updatePet,
    feedPet,
    playWithPet,
    applyDecay,
    getMood,
    equipAccessory,
    unequipAccessory,
    checkEvolution,
    getEvolutionProgress,
  } = usePet();
  const { inventory, useItem: consumeItem, addCoins } = useShop();
  const { gamification: gamificationData } = useGamification();
  const { fireConfetti, fireBigCelebration } = useConfetti();

  const [selectedSpecies, setSelectedSpecies] = useState<PetSpecies>('owl');
  const [petName, setPetName] = useState('');
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [activeTab, setActiveTab] = useState<PetTab>('overview');
  const [justEvolved, setJustEvolved] = useState(false);
  const prevStageRef = useRef<number | null>(null);

  // 2.5D Habitat State
  const mood = getMood();
  const [actionOverride, setActionOverride] = useState<CompanionAction | null>(null);
  const currentHabitatAction: CompanionAction = actionOverride ?? (mood === 'sleeping' ? 'sleep' : 'idle');
  const [habitatTheme, setHabitatTheme] = useState<HabitatTheme>(() => {
    if (typeof window === 'undefined') return 'grove';
    try {
      const savedTheme = localStorage.getItem('sq-habitat-theme') as HabitatTheme;
      if (savedTheme && HABITAT_THEMES[savedTheme]) return savedTheme;
    } catch {}
    return 'grove';
  });
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Floating particles & bubbles
  const bubbleSeqRef = useRef(0);
  const heartSeqRef = useRef(0);
  const [floatingBubbles, setFloatingBubbles] = useState<{ id: number; text: string; emoji: string }[]>([]);
  const [stageHearts, setStageHearts] = useState<{ id: number; x: number; targetX: number }[]>([]);

  // Wardrobe preview state
  const [previewAccessory, setPreviewAccessory] = useState<string | null>(null);

  // Evolution ceremony state
  const [isEvolving, setIsEvolving] = useState(false);

  // Customization & Interaction states
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newPetName, setNewPetName] = useState('');

  // RPS mini-game states
  const [showGameModal, setShowGameModal] = useState(false);
  const [playerChoice, setPlayerChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [petChoice, setPetChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [gamePlayedCount, setGamePlayedCount] = useState(0);

  const handleSelectTheme = (theme: HabitatTheme) => {
    setHabitatTheme(theme);
    playClick();
    triggerHaptic(15);
    try {
      localStorage.setItem('sq-habitat-theme', theme);
    } catch {
      // ignore
    }
  };

  // Apply decay on mount
  useEffect(() => {
    if (hasPet) applyDecay();
  }, [hasPet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-trigger celebration overlay if pet stage increases
  useEffect(() => {
    if (pet) {
      if (prevStageRef.current !== null && pet.stage > prevStageRef.current) {
        setJustEvolved(true);
        fireBigCelebration();
        playCompanionCelebration();
        setTimeout(() => setJustEvolved(false), 5000);
      }
      prevStageRef.current = pet.stage;
    }
  }, [pet?.stage, fireBigCelebration, pet]);

  // Temporary action helper
  const triggerTemporaryAction = useCallback((action: CompanionAction, durationMs = 2000) => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setActionOverride(action);
    actionTimeoutRef.current = setTimeout(() => {
      setActionOverride(null);
    }, durationMs);
  }, []);

  // Handle cuddling / petting
  const handleCuddle = useCallback(async () => {
    if (!pet) return;
    triggerHaptic([15, 30, 15]);
    playCompanionVocal(pet.species);
    playPurrSound();
    triggerTemporaryAction('celebrate', 1800);

    // Spawn floating heart particles with deterministic positioning
    const heartId = ++heartSeqRef.current;
    const offsetX = ((heartId * 19) % 70) - 35;
    const targetOffset = ((heartId * 11) % 20) - 10;
    setStageHearts((prev) => [
      ...prev,
      { id: heartId, x: offsetX, targetX: targetOffset },
    ]);
    setTimeout(() => {
      setStageHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1500);

    // Spawn text bubble
    const affectionPhrases = [
      pet.species === 'cat' ? 'Purrr! 💕' : pet.species === 'dragon' ? 'Warm rumbles! 🔥' : 'Hoo-hoo! ✨',
      'Feels so loved! 🥰',
      'Bond strengthened! 💖',
    ];
    const phrase = affectionPhrases[heartId % affectionPhrases.length];
    const bubbleId = ++bubbleSeqRef.current;
    setFloatingBubbles((prev) => [...prev, { id: bubbleId, text: phrase, emoji: '💖' }]);
    setTimeout(() => {
      setFloatingBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
    }, 2500);

    await playWithPet();
  }, [pet, playWithPet, triggerTemporaryAction]);

  // Handle toggling nap / rest
  const handleToggleNap = useCallback(() => {
    if (!pet) return;
    triggerHaptic(20);
    if (currentHabitatAction === 'sleep') {
      // Wake up
      playCompanionVocal(pet.species);
      triggerTemporaryAction('celebrate', 1200);
      toast.success(`${pet.name} is wide awake and ready to study! ☀️`);
    } else {
      // Put to sleep
      playSnoreSound();
      setActionOverride('sleep');
      toast.success(`${pet.name} is taking a cozy power nap... 💤`);
    }
  }, [pet, currentHabitatAction, triggerTemporaryAction]);

  // Handle pet adoption
  const handleCreate = async () => {
    if (!petName.trim()) {
      toast.error('Give your pet a name!');
      return;
    }
    await createPet(selectedSpecies, petName.trim());
    fireBigCelebration();
    playCompanionCelebration();
    toast.success(`${petName} has been born! 🥚✨`);
  };

  // Handle feeding
  const handleFeed = useCallback(async (itemId: string) => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item || !item.effect) return;

    let hunger = 0;
    let happy = 0;
    if (item.effect === 'hunger-20') hunger = 20;
    else if (item.effect === 'hunger-40') hunger = 40;
    else if (item.effect === 'hunger-60-happy-10') {
      hunger = 60;
      happy = 10;
    } else if (item.effect === 'full-restore') {
      hunger = 100;
      happy = 100;
    }

    playMunchSound();
    triggerHaptic([20, 40, 20]);
    triggerTemporaryAction('celebrate', 2200);

    await consumeItem(itemId);
    await feedPet(hunger, happy);

    // Trigger floating snack bubble
    const bId = ++bubbleSeqRef.current;
    const newBubble = { id: bId, text: 'Delicious! 😋', emoji: item.emoji };
    setFloatingBubbles((prev) => [...prev, newBubble]);
    setTimeout(() => {
      setFloatingBubbles((prev) => prev.filter((b) => b.id !== bId));
    }, 2500);

    toast.success(`Fed ${pet?.name} with ${item.emoji} ${item.name}!`);
    setShowFeedModal(false);
  }, [consumeItem, feedPet, pet?.name, triggerTemporaryAction]);

  const handlePlayClick = () => {
    playClick();
    triggerHaptic(15);
    setPlayerChoice(null);
    setPetChoice(null);
    setGameResult(null);
    setShowGameModal(true);
  };

  const playRPSRound = useCallback(async (choice: 'rock' | 'paper' | 'scissors') => {
    if (!pet) return;
    playClick();
    triggerHaptic(20);
    setPlayerChoice(choice);

    const pChoice = pickRandomMove();
    setPetChoice(pChoice);

    let result = '';
    if (choice === pChoice) {
      result = "It's a tie! 🤝";
      playCompanionVocal(pet.species);
    } else if (
      (choice === 'rock' && pChoice === 'scissors') ||
      (choice === 'paper' && pChoice === 'rock') ||
      (choice === 'scissors' && pChoice === 'paper')
    ) {
      result = `You won! ${pet.name} cheers for you! 🎉`;
      fireConfetti({ particleCount: 60 });
      playXP();
    } else {
      result = `${pet.name} won! Happy pet! 🥰`;
      playPurrSound();
      triggerTemporaryAction('celebrate', 2000);
    }
    setGameResult(result);

    await playWithPet();

    // Award +5 gold coins for playing, capped at 5 games daily
    if (gamePlayedCount < 5) {
      await addCoins(5);
      setGamePlayedCount((prev) => prev + 1);
      toast.success(`Played with ${pet.name}! Happiness boosted & earned 5 coins! 🪙`);
    } else {
      toast.success(`Played with ${pet.name}! Happiness boosted!`);
    }
  }, [addCoins, fireConfetti, gamePlayedCount, pet, playWithPet, triggerTemporaryAction]);

  const handleRename = async () => {
    if (!newPetName.trim()) {
      toast.error('Name cannot be empty!');
      return;
    }
    await updatePet({ name: newPetName.trim() });
    playSuccess();
    toast.success(`Companion renamed to ${newPetName.trim()}! 🏷️`);
    setShowRenameModal(false);
  };

  const handleEquip = useCallback(async (itemId: string) => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    playClick();
    triggerHaptic(20);
    await equipAccessory(itemId);

    if (item) {
      const bId = ++bubbleSeqRef.current;
      const newBubble = { id: bId, text: 'Stylish! ✨', emoji: item.emoji };
      setFloatingBubbles((prev) => [...prev, newBubble]);
      setTimeout(() => {
        setFloatingBubbles((prev) => prev.filter((b) => b.id !== bId));
      }, 2500);
    }
    triggerTemporaryAction('celebrate', 1500);
    toast.success('Accessory equipped! 🎀');
  }, [equipAccessory, triggerTemporaryAction]);

  const handleUnequip = async (itemId: string) => {
    playClick();
    triggerHaptic(15);
    await unequipAccessory(itemId);
    toast.success('Accessory removed');
  };

  // Evolution ceremony trigger
  const handleTriggerEvolution = async () => {
    if (!pet || pet.stage >= 4) return;
    setIsEvolving(true);
    triggerHaptic([30, 60, 30, 80, 50]);
    fireBigCelebration();
    playCompanionCelebration();

    const evolved = await checkEvolution(gamificationData ?? null);
    if (evolved) {
      setJustEvolved(true);
      setTimeout(() => setJustEvolved(false), 5000);
      toast.success(`✨ ${pet.name} has ascended to the next stage!`);
    } else {
      toast.error('Evolution requirements not yet met!');
    }
    setIsEvolving(false);
  };

  // Owned food items
  const ownedFood = useMemo(() => {
    return SHOP_ITEMS.filter((i) => i.category === 'petFood' && i.consumable && inventory.ownedItems.includes(i.id));
  }, [inventory.ownedItems]);

  // Owned accessories
  const uniqueOwnedAccessories = useMemo(() => {
    const ownedAccessories = SHOP_ITEMS.filter(
      (i) => i.category === 'petAccessory' && !i.consumable && inventory.ownedItems.includes(i.id)
    );
    return ownedAccessories.filter((item, idx, self) => self.findIndex((x) => x.id === item.id) === idx);
  }, [inventory.ownedItems]);

  // Evolution progress
  const evolutionPaths: EvolutionRequirement[] = useMemo(() => {
    return hasPet ? getEvolutionProgress(gamificationData ?? null) : [];
  }, [hasPet, getEvolutionProgress, gamificationData]);

  const isReadyToEvolve = useMemo(() => {
    return evolutionPaths.length > 0 && evolutionPaths.some((p) => p.current >= p.target);
  }, [evolutionPaths]);

  // Loading state
  if (loading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-96 gap-3">
          <motion.div
            className="w-20 h-20 flex items-center justify-center rounded-3xl bg-primary/10 border-2 border-primary/20 shadow-xl"
            animate={{ scale: [1, 1.08, 1], y: [0, -6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-4xl">🥚</span>
          </motion.div>
          <p className="text-xs font-bold text-slate-400">Summoning Sanctuary...</p>
        </div>
      </PageTransition>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // SPECIES SELECTION / ADOPTION SCREEN
  // ═══════════════════════════════════════════════════════════════════
  if (!hasPet) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
          <div className="text-center space-y-2">
            <Badge variant="primary" size="md" className="uppercase tracking-wider font-black">
              Companion Sanctuary
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-white">
              Adopt Your Study Companion! 🐾
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Choose your partner in learning. Your companion lives on your screen, celebrates your study streaks, and ascends through 5 powerful evolution forms!
            </p>
          </div>

          {/* Species Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SPECIES_LIST.map((species) => {
              const config = PET_SPECIES_CONFIG[species];
              const isSelected = selectedSpecies === species;
              const lore =
                species === 'owl'
                  ? 'Scholar Guardian: Master of focus and deep study wisdom.'
                  : species === 'cat'
                  ? 'Cyber Familiar: Playful spark of streak agility & quick wit.'
                  : 'Emerald Wyrm: Mythic warrior of task grit and perseverance.';

              return (
                <motion.div
                  key={species}
                  onClick={() => {
                    setSelectedSpecies(species);
                    playCompanionVocal(species);
                    triggerHaptic(20);
                  }}
                  className={`cursor-pointer rounded-3xl p-5 border-2 transition-all flex flex-col items-center text-center relative overflow-hidden group ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xl shadow-primary/20 ring-2 ring-primary/40'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isSelected && (
                    <span className="absolute top-3 right-3 text-xs bg-primary text-white font-black px-2 py-0.5 rounded-full shadow">
                      Selected
                    </span>
                  )}
                  <div className="py-2">
                    <ChibiCompanionSprite
                      species={species}
                      action={isSelected ? 'walk' : 'idle'}
                      size={80}
                      showShadow
                      showAura={isSelected}
                    />
                  </div>
                  <h3 className="text-base font-heading font-black mt-2 text-white">{config.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{lore}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Name & Adopt CTA */}
          <div className="max-w-sm mx-auto space-y-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl">
            <Input
              label="Name Your Companion"
              placeholder="e.g. Athena, Pixel, Blaze..."
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              maxLength={20}
            />
            <Button
              variant="primary"
              onClick={handleCreate}
              className="w-full h-12 text-sm font-black shadow-lg shadow-primary/30"
              icon={<HiSparkles size={18} />}
            >
              Hatch {PET_SPECIES_CONFIG[selectedSpecies].name}! 🥚✨
            </Button>
          </div>

          {/* 5-Stage Evolution Preview */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-center">
            <h4 className="text-xs font-heading font-bold text-slate-400 uppercase tracking-wider mb-4">
              ✨ 5-Stage Evolution Continuum ✨
            </h4>
            <div className="flex items-center justify-center gap-3 sm:gap-6 overflow-x-auto pb-2">
              {PET_STAGES.map((stg, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <ChibiCompanionSprite
                        species={selectedSpecies}
                        action={i === 0 ? 'sleep' : 'idle'}
                        size={i === 0 ? 36 : i === 1 ? 42 : i === 2 ? 48 : i === 3 ? 52 : 56}
                        showShadow={false}
                        showAura={i === 4}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 mt-1.5">{stg.name}</span>
                    <span className="text-[8px] text-slate-500 uppercase">{stg.title}</span>
                  </div>
                  {i < 4 && <span className="text-slate-600 text-sm">→</span>}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-4">
              Evolution occurs through Tasks, Focus Time, Streaks, Bond, and Style!
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN PET SANCTUARY
  // ═══════════════════════════════════════════════════════════════════
  const config = PET_SPECIES_CONFIG[pet!.species];
  const stageInfo = PET_STAGES[pet!.stage] || PET_STAGES[0];
  const activeThemeConfig = HABITAT_THEMES[habitatTheme];

  const TABS: { id: PetTab; label: string; emoji: string }[] = [
    { id: 'overview', label: 'Habitat & Care', emoji: '🏡' },
    { id: 'wardrobe', label: 'Wardrobe Salon', emoji: '🎀' },
    { id: 'evolution', label: 'Ascension Chamber', emoji: '🌟' },
  ];

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-600/30 border border-primary/40 flex items-center justify-center shrink-0">
              <ChibiCompanionSprite
                species={pet!.species}
                action="idle"
                size={42}
                showShadow={false}
                showAura={false}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-heading font-black text-white">{pet!.name}</h1>
                <button
                  onClick={() => {
                    setNewPetName(pet!.name);
                    setShowRenameModal(true);
                    playClick();
                  }}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                  title="Rename Companion"
                >
                  <HiPencil size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="font-semibold text-slate-300">{config.name}</span>
                <span>•</span>
                <span>Stage {pet!.stage}/4</span>
                <span>•</span>
                <span className="text-primary font-bold">{stageInfo.name}</span>
                <span className="text-slate-500">({stageInfo.title})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                playCompanionVocal(pet!.species);
                triggerHaptic(20);
                triggerTemporaryAction('celebrate', 1500);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Hear companion voice"
            >
              <span>🔊</span>
              <span>Say Hi</span>
            </button>
            <Badge variant="primary" size="md" className="font-black">
              Lv. {pet!.level || 1}
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  playClick();
                  triggerHaptic(15);
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Evolution Celebration Overlay */}
        <AnimatePresence>
          {justEvolved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="rounded-3xl border-2 border-amber-400/60 bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-primary/20 p-6 text-center relative overflow-hidden backdrop-blur-xl shadow-2xl"
            >
              <motion.div
                className="w-28 h-28 mx-auto mb-3"
                animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ChibiCompanionSprite
                  species={pet!.species}
                  action="celebrate"
                  size={110}
                  showAura
                  showShadow
                />
              </motion.div>
              <h2 className="text-2xl font-heading font-black text-amber-300 drop-shadow">
                ✨ Ascension Milestone Reached! ✨
              </h2>
              <p className="text-sm text-slate-200 mt-1 max-w-md mx-auto">
                <strong>{pet!.name}</strong> has ascended to <strong>{stageInfo.name}</strong> ({stageInfo.title})!
                New potential and aura traits have awakened!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════ TAB 1: OVERVIEW / HABITAT & CARE ═══════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 2.5D Sanctuary Habitat Stage Card */}
            <div className="relative rounded-3xl border border-slate-800 overflow-hidden shadow-2xl bg-slate-950">
              {/* Habitat Theme Selector in Top-Right */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-950/70 backdrop-blur-md border border-white/10 p-1 rounded-2xl shadow-lg">
                {(Object.keys(HABITAT_THEMES) as HabitatTheme[]).map((themeKey) => {
                  const isCur = habitatTheme === themeKey;
                  return (
                    <button
                      key={themeKey}
                      onClick={() => handleSelectTheme(themeKey)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs transition-all ${
                        isCur
                          ? 'bg-white/20 border border-white/30 scale-105'
                          : 'opacity-60 hover:opacity-100 hover:bg-white/5'
                      }`}
                      title={HABITAT_THEMES[themeKey].name}
                    >
                      {HABITAT_THEMES[themeKey].emoji}
                    </button>
                  );
                })}
              </div>

              {/* Habitat Theme Badge in Top-Left */}
              <div className="absolute top-4 left-4 z-20">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-md flex items-center gap-1 ${activeThemeConfig.badgeColor}`}
                >
                  <span>{activeThemeConfig.emoji}</span>
                  <span>{activeThemeConfig.name}</span>
                </span>
              </div>

              {/* Diorama Background Scene */}
              <div
                className={`relative w-full h-80 sm:h-96 bg-gradient-to-b ${activeThemeConfig.bgGradient} flex flex-col items-center justify-end pb-8 overflow-hidden select-none transition-colors duration-700`}
              >
                {/* Ambient Star / Sparkle Particles */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(14)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={`absolute text-xs ${activeThemeConfig.ambientParticles}`}
                      style={{
                        top: `${(i * 19) % 75}%`,
                        left: `${(i * 23) % 92}%`,
                      }}
                      animate={{
                        opacity: [0.2, 0.8, 0.2],
                        scale: [0.8, 1.2, 0.8],
                        y: [0, -6, 0],
                      }}
                      transition={{
                        duration: 2.5 + (i % 3),
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'easeInOut',
                      }}
                    >
                      ✦
                    </motion.div>
                  ))}
                </div>

                {/* Floating Affection Hearts */}
                <AnimatePresence>
                  {stageHearts.map((heart) => (
                    <motion.div
                      key={heart.id}
                      className="absolute pointer-events-none text-2xl z-30"
                      initial={{ opacity: 1, scale: 0.6, x: heart.x, y: 0 }}
                      animate={{ opacity: 0, scale: 1.4, y: -70, x: heart.x + heart.targetX }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.4, ease: 'easeOut' }}
                    >
                      💖
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Floating speech / snack bubbles */}
                <AnimatePresence>
                  {floatingBubbles.map((bubble) => (
                    <motion.div
                      key={bubble.id}
                      className="absolute top-16 z-40 bg-slate-900/95 text-white text-xs font-black px-4 py-2 rounded-2xl flex items-center gap-2 shadow-2xl border border-white/20 backdrop-blur-md pointer-events-none"
                      initial={{ opacity: 0, y: 15, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -15, scale: 0.85 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span>{bubble.emoji}</span>
                      <span>{bubble.text}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* 2.5D Isometric Pedestal Platform */}
                <div className="relative flex items-center justify-center">
                  {/* Outer Pedestal Glow */}
                  <div
                    className={`w-64 h-24 sm:w-72 sm:h-28 rounded-[50%] bg-gradient-to-b ${activeThemeConfig.pedestalGradient} border-2 ${activeThemeConfig.pedestalBorder} shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center relative`}
                  >
                    {/* Inner Platform Disc */}
                    <div className="w-52 h-18 sm:w-56 sm:h-20 rounded-[50%] bg-white/5 border border-white/10" />
                  </div>

                  {/* The Companion 2.5D Sprite Sitting on Pedestal */}
                  <motion.div
                    className="absolute bottom-6 z-20 cursor-pointer flex flex-col items-center"
                    onClick={handleCuddle}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    title={`Click to cuddle ${pet!.name}!`}
                  >
                    <ChibiCompanionSprite
                      species={pet!.species}
                      action={currentHabitatAction}
                      size={135}
                      showShadow
                      showAura={pet!.stage >= 3}
                    />

                    {/* Equipped Accessories Display Overlay */}
                    <div className="absolute -top-3 -right-2 flex flex-col gap-1 pointer-events-none">
                      {(pet!.equippedAccessories || []).map((accId) => {
                        const itm = SHOP_ITEMS.find((i) => i.id === accId);
                        if (!itm) return null;
                        return (
                          <motion.span
                            key={accId}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-7 h-7 rounded-full bg-slate-900/90 border border-white/20 flex items-center justify-center text-sm shadow-md"
                            title={itm.name}
                          >
                            {itm.emoji}
                          </motion.span>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>

                {/* Companion Name and State Pill */}
                <div className="mt-2 text-center z-20">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300">
                    <span>
                      {currentHabitatAction === 'sleep'
                        ? '😴 Taking a cozy nap'
                        : currentHabitatAction === 'celebrate'
                        ? '🥰 Bouncing with joy!'
                        : mood === 'happy'
                        ? '✨ Feeling energetic & happy'
                        : mood === 'sad'
                        ? '🥺 Hungry for attention'
                        : '😊 Relaxed & ready'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Care Action Bar Attached to Stage */}
              <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md grid grid-cols-4 gap-2">
                <button
                  onClick={() => setShowFeedModal(true)}
                  className="py-2.5 px-2 rounded-2xl bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 text-teal-300 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <span className="text-base">🍎</span>
                  <span>Feed</span>
                </button>

                <button
                  onClick={handleCuddle}
                  className="py-2.5 px-2 rounded-2xl bg-pink-500/10 border border-pink-500/30 hover:bg-pink-500/20 text-pink-300 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <span className="text-base">💕</span>
                  <span>Cuddle</span>
                </button>

                <button
                  onClick={handlePlayClick}
                  className="py-2.5 px-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <span className="text-base">🎮</span>
                  <span>Play RPS</span>
                </button>

                <button
                  onClick={handleToggleNap}
                  className={`py-2.5 px-2 rounded-2xl border font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    currentHabitatAction === 'sleep'
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-purple-300'
                  }`}
                >
                  <span className="text-base">{currentHabitatAction === 'sleep' ? '☀️' : '💤'}</span>
                  <span>{currentHabitatAction === 'sleep' ? 'Wake' : 'Nap'}</span>
                </button>
              </div>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Happiness',
                  value: pet!.happiness,
                  color: 'from-pink-500 to-rose-400',
                  icon: '💖',
                  status: pet!.happiness >= 80 ? 'Ecstatic' : pet!.happiness >= 50 ? 'Content' : 'Lonely',
                },
                {
                  label: 'Energy',
                  value: pet!.energy,
                  color: 'from-amber-500 to-yellow-400',
                  icon: '⚡',
                  status: pet!.energy >= 70 ? 'Vibrant' : pet!.energy >= 40 ? 'Tired' : 'Exhausted',
                },
                {
                  label: 'Hunger',
                  value: pet!.hunger,
                  color: 'from-teal to-emerald-400',
                  icon: '🍎',
                  status: pet!.hunger >= 80 ? 'Full' : pet!.hunger >= 40 ? 'Snackish' : 'Starving',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{stat.icon}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {stat.status}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <p className="text-xs font-bold text-slate-200">{stat.label}</p>
                      <p className="text-xs font-mono font-bold text-slate-300">{stat.value}%</p>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${stat.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.value}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
                <span className="text-base block mb-0.5">🍎</span>
                <p className="text-sm font-bold text-white">{pet!.totalFeedings ?? 0}</p>
                <p className="text-[10px] text-slate-400">Total Feedings</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
                <span className="text-base block mb-0.5">🎮</span>
                <p className="text-sm font-bold text-white">{pet!.totalPlaySessions ?? 0}</p>
                <p className="text-[10px] text-slate-400">Play Sessions</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
                <span className="text-base block mb-0.5">🎀</span>
                <p className="text-sm font-bold text-white">{(pet!.equippedAccessories || []).length}</p>
                <p className="text-[10px] text-slate-400">Equipped Items</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
                <span className="text-base block mb-0.5">⭐</span>
                <p className="text-sm font-bold text-white">{pet!.xp || 0}</p>
                <p className="text-[10px] text-slate-400">Companion XP</p>
              </div>
            </div>

            {/* Next Evolution Teaser Banner */}
            {pet!.stage < 4 && evolutionPaths.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-600/10 to-amber-500/10 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <span className="text-3xl">🌟</span>
                  <div>
                    <h3 className="text-sm font-heading font-black text-white">
                      Next Ascension: {PET_STAGES[pet!.stage + 1]?.name} ({PET_STAGES[pet!.stage + 1]?.title})
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isReadyToEvolve
                        ? '🎉 Requirements fulfilled! Your companion is ready to ascend!'
                        : 'Work towards any single evolution path to unlock their next form.'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setActiveTab('evolution');
                    playClick();
                  }}
                  className="whitespace-nowrap font-black shadow-md shadow-primary/20"
                >
                  {isReadyToEvolve ? '✨ Evolve Now! →' : 'View Requirements →'}
                </Button>
              </div>
            )}

            {/* Dungeon Raids & Monster Bestiary Card */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-900/20 via-amber-900/20 to-red-900/20 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <span className="text-3xl">⚔️</span>
                <div>
                  <h4 className="text-sm font-black text-slate-100">Dungeon Raids & Monster Bestiary</h4>
                  <p className="text-xs text-slate-400">
                    Take {pet!.name} into battle against 762 mythical D&D creatures in the Arcade!
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  window.location.href = '/arcade';
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20 whitespace-nowrap"
              >
                Enter Dungeon
              </Button>
            </div>
          </div>
        )}

        {/* ═══════════════════ TAB 2: WARDROBE SALON ═══════════════════ */}
        {activeTab === 'wardrobe' && (
          <div className="space-y-6">
            {/* Dressing Salon Spotlight Stage */}
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 text-center relative overflow-hidden shadow-2xl">
              {/* Top Spotlight Effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                {previewAccessory && (
                  <span className="mb-2 text-[10px] font-black uppercase tracking-wider bg-primary text-white px-3 py-0.5 rounded-full shadow">
                    ✨ Previewing New Look ✨
                  </span>
                )}

                {/* 2.5D Chibi Sprite in Dressing Salon */}
                <div className="w-40 h-40 flex items-center justify-center relative">
                  <ChibiCompanionSprite
                    species={pet!.species}
                    action="idle"
                    size={110}
                    showShadow
                    showAura={pet!.stage >= 3}
                  />

                  {/* Render equipped + currently previewed accessory */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 pointer-events-none">
                    {Array.from(new Set([...(pet!.equippedAccessories || []), ...(previewAccessory ? [previewAccessory] : [])])).map(
                      (accId) => {
                        const item = SHOP_ITEMS.find((i) => i.id === accId);
                        if (!item) return null;
                        const isTempPreview = previewAccessory === accId && !(pet!.equippedAccessories || []).includes(accId);
                        return (
                          <motion.span
                            key={accId}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-base shadow-lg ${
                              isTempPreview
                                ? 'bg-amber-500/30 border-2 border-amber-400 text-amber-200'
                                : 'bg-slate-900/90 border border-white/20'
                            }`}
                            title={item.name}
                          >
                            {item.emoji}
                          </motion.span>
                        );
                      }
                    )}
                  </div>
                </div>

                <h3 className="text-base font-heading font-black text-white mt-1">
                  {pet!.name}&apos;s Dressing Salon
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {(pet!.equippedAccessories || []).length} items currently equipped
                </p>
              </div>
            </div>

            {/* Currently Equipped Accessories Row */}
            {(pet!.equippedAccessories || []).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400">
                  ✨ Currently Equipped
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(pet!.equippedAccessories || []).map((accId) => {
                    const item = SHOP_ITEMS.find((i) => i.id === accId);
                    if (!item) return null;
                    return (
                      <motion.div
                        key={accId}
                        className="rounded-2xl border border-teal/40 bg-teal/10 p-3 flex items-center justify-between gap-3 shadow-sm"
                        layout
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-2xl">{item.emoji}</span>
                          <div className="truncate">
                            <p className="text-xs font-bold text-white truncate">{item.name}</p>
                            <span className="text-[10px] text-teal-300 font-semibold">Equipped</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnequip(item.id)}
                          className="p-1.5 rounded-xl hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                          title="Unequip item"
                        >
                          <HiX size={16} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Owned Accessories Inventory */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400">
                  🎒 Your Accessory Closet ({uniqueOwnedAccessories.length})
                </h3>
                <button
                  onClick={() => {
                    window.location.href = '/shop';
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Visit Shop →
                </button>
              </div>

              {uniqueOwnedAccessories.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-2">
                  <span className="text-4xl block mb-1">🛍️</span>
                  <p className="text-sm font-bold text-slate-200">Closet is empty!</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Visit the Item Shop to buy hats, glasses, capes, and magical cosmetics for {pet!.name}.
                  </p>
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        window.location.href = '/shop';
                      }}
                    >
                      Browse Item Shop
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <AnimatePresence mode="popLayout">
                    {uniqueOwnedAccessories.map((item) => {
                      const isEquipped = (pet!.equippedAccessories || []).includes(item.id);
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          onMouseEnter={() => setPreviewAccessory(item.id)}
                          onMouseLeave={() => setPreviewAccessory(null)}
                          className={`rounded-2xl border-2 p-3.5 flex flex-col justify-between transition-all ${
                            isEquipped
                              ? 'border-teal/50 bg-teal/5'
                              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-center">
                            <span className="text-3xl block mb-1.5">{item.emoji}</span>
                            <p className="text-xs font-bold text-white truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                            <div className="mt-2 flex justify-center">
                              <Badge
                                variant={
                                  item.rarity === 'legendary'
                                    ? 'amber'
                                    : item.rarity === 'epic'
                                    ? 'coral'
                                    : item.rarity === 'rare'
                                    ? 'primary'
                                    : 'muted'
                                }
                                size="sm"
                              >
                                {item.rarity}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-3">
                            {isEquipped ? (
                              <button
                                onClick={() => handleUnequip(item.id)}
                                className="w-full py-1.5 rounded-xl text-xs font-bold bg-teal text-white flex items-center justify-center gap-1 shadow"
                              >
                                <HiCheck size={14} /> Equipped
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEquip(item.id)}
                                className="w-full py-1.5 rounded-xl text-xs font-bold border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                              >
                                Equip
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════ TAB 3: EVOLUTION / ASCENSION CHAMBER ═══════════════════ */}
        {activeTab === 'evolution' && (
          <div className="space-y-6">
            {/* 5-Stage Ascension Continuum */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-center">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400 mb-6">
                🌟 Companion Ascension Continuum
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {PET_STAGES.map((stg, i) => {
                  const isCurrent = i === pet!.stage;
                  const isPassed = i < pet!.stage;
                  return (
                    <div key={i} className="flex items-center gap-2 sm:gap-3">
                      <motion.div
                        className={`rounded-2xl p-3 flex flex-col items-center min-w-[85px] border-2 transition-all ${
                          isCurrent
                            ? 'border-primary bg-primary/15 shadow-xl shadow-primary/20 scale-105 ring-2 ring-primary/40'
                            : isPassed
                            ? 'border-teal/50 bg-teal/10'
                            : 'border-slate-800 bg-slate-900/40 opacity-40'
                        }`}
                        animate={isCurrent ? { y: [0, -3, 0] } : {}}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <div className="w-12 h-12 flex items-center justify-center">
                          <ChibiCompanionSprite
                            species={pet!.species}
                            action={i === 0 ? 'sleep' : isCurrent ? 'walk' : 'idle'}
                            size={i === 0 ? 34 : i === 1 ? 40 : i === 2 ? 46 : i === 3 ? 50 : 54}
                            showShadow={false}
                            showAura={i === 4}
                          />
                        </div>
                        <span className="text-xs font-black text-white mt-1.5">{stg.name}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold">{stg.title}</span>
                        {isPassed && <span className="text-[10px] text-teal-300 font-bold mt-1">✓ Achieved</span>}
                        {isCurrent && <span className="text-[10px] text-primary font-black mt-1">● Current</span>}
                      </motion.div>
                      {i < 4 && (
                        <span className={`text-base font-bold ${isPassed ? 'text-teal' : 'text-slate-700'}`}>
                          →
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evolution Paths to Next Stage */}
            {pet!.stage < 4 ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-heading font-black text-white flex items-center gap-2">
                      <span>🛤️ Paths to Stage {pet!.stage + 1}: {PET_STAGES[pet!.stage + 1]?.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Complete <strong className="text-slate-200">ANY ONE</strong> path below to awaken your companion&apos;s next form!
                    </p>
                  </div>

                  {isReadyToEvolve && (
                    <Button
                      variant="primary"
                      onClick={handleTriggerEvolution}
                      disabled={isEvolving}
                      className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/30 animate-pulse"
                      icon={<HiSparkles size={16} />}
                    >
                      {isEvolving ? 'Ascending...' : '✨ Ascend Now! ✨'}
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {evolutionPaths.map((path) => {
                    const pct = Math.min(100, Math.round((path.current / path.target) * 100));
                    const isComplete = path.current >= path.target;
                    return (
                      <motion.div
                        key={path.key}
                        className={`rounded-2xl border-2 p-4 transition-all ${
                          isComplete
                            ? 'border-teal/50 bg-teal/10 shadow-lg shadow-teal/10'
                            : 'border-slate-800 bg-slate-900/60'
                        }`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-start gap-3.5">
                          <span className="text-2xl mt-0.5">{path.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-heading font-bold text-white">{path.label}</h4>
                              {isComplete ? (
                                <Badge variant="primary" size="sm" className="bg-teal text-white border-none font-black">
                                  ✓ Milestone Met!
                                </Badge>
                              ) : (
                                <span className="text-xs font-mono font-bold text-slate-400">{pct}%</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{path.description}</p>

                            <div className="mt-2.5">
                              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full ${
                                    isComplete
                                      ? 'bg-teal'
                                      : 'bg-gradient-to-r from-primary via-indigo-500 to-amber-400'
                                  }`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 flex justify-between">
                                <span>Current: {path.current}</span>
                                <span>Goal: {path.target}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-purple-600/10 to-primary/10 p-8 text-center space-y-3">
                <span className="text-6xl block mb-2">👑</span>
                <h3 className="text-xl font-heading font-black text-amber-300">
                  Transcendent Mythic Form!
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  {pet!.name} has reached the absolute apex of companion ascension! They carry the full radiant aura of mastery and stand at your side as a true mythical guardian.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ MODALS ═══════════════════ */}

        {/* Feed Modal */}
        <Modal isOpen={showFeedModal} onClose={() => setShowFeedModal(false)} title={`Feed ${pet?.name}`}>
          <div className="space-y-3">
            {ownedFood.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <span className="text-4xl block">🍽️</span>
                <p className="text-sm font-bold text-slate-200">No Food Snacks Available</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Head over to the Item Shop to purchase apples, berries, and gourmet snacks for {pet?.name}.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    window.location.href = '/shop';
                  }}
                >
                  Visit Item Shop
                </Button>
              </div>
            ) : (
              ownedFood.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleFeed(item.id)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-teal/40 hover:bg-teal/5 transition-all text-left group"
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                  <span className="text-xs font-bold text-teal-400 bg-teal/10 px-2 py-1 rounded-lg">
                    Feed
                  </span>
                </button>
              ))
            )}
          </div>
        </Modal>

        {/* Rename Companion Modal */}
        <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} title="Rename Companion">
          <div className="space-y-4">
            <Input
              label="Companion Name"
              placeholder="e.g. Luna, Bobby..."
              value={newPetName}
              onChange={(e) => setNewPetName(e.target.value)}
              maxLength={20}
            />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowRenameModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleRename} className="flex-1">
                Save Name
              </Button>
            </div>
          </div>
        </Modal>

        {/* RPS Duel Mini-game Modal */}
        <Modal
          isOpen={showGameModal}
          onClose={() => setShowGameModal(false)}
          title={`Duel with ${pet?.name} (Rock-Paper-Scissors)`}
        >
          <div className="space-y-5 text-center">
            {/* Arena Faces */}
            <div className="flex justify-center items-center gap-6 py-2">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800 shadow-md">
                  <ChibiCompanionSprite
                    species={pet?.species || 'owl'}
                    action={
                      gameResult?.includes('won!') && !gameResult.includes('You won')
                        ? 'celebrate'
                        : 'idle'
                    }
                    size={64}
                    showShadow={false}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-300 mt-1 uppercase">{pet?.name}</span>
              </div>

              <span className="text-lg font-black text-slate-500">VS</span>

              <div className="flex flex-col items-center">
                <div className="w-20 h-20 flex items-center justify-center bg-primary/10 rounded-2xl border border-primary/20 shadow-md">
                  <span className="text-4xl">🧑‍🎓</span>
                </div>
                <span className="text-[10px] font-bold text-primary mt-1 uppercase">You</span>
              </div>
            </div>

            {!playerChoice ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Pick your move to challenge your companion!</p>
                <div className="flex justify-center gap-2.5">
                  {[
                    { choice: 'rock', emoji: '✊', label: 'Rock' },
                    { choice: 'paper', emoji: '✋', label: 'Paper' },
                    { choice: 'scissors', emoji: '✌️', label: 'Scissors' },
                  ].map((btn) => (
                    <button
                      key={btn.choice}
                      onClick={() => playRPSRound(btn.choice as 'rock' | 'paper' | 'scissors')}
                      className="px-4 py-3 rounded-2xl border border-slate-800 hover:border-primary bg-slate-900/80 hover:bg-primary/10 active:scale-95 transition-all text-xs font-bold flex flex-col items-center gap-1 min-w-[75px]"
                    >
                      <span className="text-2xl">{btn.emoji}</span>
                      <span className="text-white">{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{pet?.name}&apos;s Move</p>
                      <p className="text-3xl mt-1">
                        {petChoice === 'rock' ? '✊' : petChoice === 'paper' ? '✋' : '✌️'}
                      </p>
                      <p className="font-bold text-white capitalize mt-0.5">{petChoice}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Your Move</p>
                      <p className="text-3xl mt-1">
                        {playerChoice === 'rock' ? '✊' : playerChoice === 'paper' ? '✋' : '✌️'}
                      </p>
                      <p className="font-bold text-white capitalize mt-0.5">{playerChoice}</p>
                    </div>
                  </div>
                  <h3 className="text-sm font-heading font-black text-primary mt-4 pt-3 border-t border-slate-800">
                    {gameResult}
                  </h3>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setPlayerChoice(null)} className="flex-1">
                    Play Again
                  </Button>
                  <Button variant="primary" onClick={() => setShowGameModal(false)} className="flex-1">
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
