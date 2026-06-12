'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiHeart, HiSparkles, HiLightningBolt, HiStar, HiCheck, HiX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import PageTransition from '@/components/layout/PageTransition';
import { usePet } from '@/hooks/usePet';
import { useShop } from '@/hooks/useShop';
import { useGamification } from '@/hooks/useGamification';
import { PET_SPECIES_CONFIG, PET_STAGES, SHOP_ITEMS } from '@/lib/constants';
import { PetSpecies, EvolutionRequirement } from '@/types';
import { playSuccess, playClick } from '@/lib/sounds';

const SPECIES_LIST: PetSpecies[] = ['owl', 'cat', 'dragon', 'fox', 'bunny'];

type PetTab = 'overview' | 'wardrobe' | 'evolution';

export default function PetContent() {
  const { pet, loading, hasPet, createPet, feedPet, playWithPet, applyDecay, getMood, equipAccessory, unequipAccessory, checkEvolution, getEvolutionProgress } = usePet();
  const { inventory, ownsItem, useItem } = useShop();
  const { gamification: gamificationData } = useGamification();
  const [selectedSpecies, setSelectedSpecies] = useState<PetSpecies>('owl');
  const [petName, setPetName] = useState('');
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [activeTab, setActiveTab] = useState<PetTab>('overview');
  const [justEvolved, setJustEvolved] = useState(false);
  const prevStageRef = useRef<number | null>(null);

  // Apply decay on page load
  useEffect(() => { if (hasPet) applyDecay(); }, [hasPet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-trigger celebration overlay if pet stage increases
  useEffect(() => {
    if (pet) {
      if (prevStageRef.current !== null && pet.stage > prevStageRef.current) {
        setJustEvolved(true);
        setTimeout(() => setJustEvolved(false), 4000);
      }
      prevStageRef.current = pet.stage;
    }
  }, [pet?.stage]);

  const handleCreate = async () => {
    if (!petName.trim()) { toast.error('Give your pet a name!'); return; }
    await createPet(selectedSpecies, petName.trim());
    playSuccess();
    toast.success(`${petName} has been born! 🥚`);
  };

  const handleFeed = async (itemId: string) => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item || !item.effect) return;
    let hunger = 0, happy = 0;
    if (item.effect === 'hunger-20') hunger = 20;
    else if (item.effect === 'hunger-40') hunger = 40;
    else if (item.effect === 'hunger-60-happy-10') { hunger = 60; happy = 10; }
    else if (item.effect === 'full-restore') { hunger = 100; happy = 100; }
    await useItem(itemId);
    await feedPet(hunger, happy);
    playSuccess();
    toast.success(`Fed ${pet?.name} with ${item.emoji} ${item.name}!`);
    setShowFeedModal(false);
  };

  const handlePlay = async () => {
    playClick();
    await playWithPet();
    toast.success(`${pet?.name} is having fun! 🎉`);
  };

  const handleEquip = async (itemId: string) => {
    playClick();
    await equipAccessory(itemId);
    toast.success('Accessory equipped! 🎀');
  };

  const handleUnequip = async (itemId: string) => {
    playClick();
    await unequipAccessory(itemId);
    toast.success('Accessory removed');
  };

  // Owned food items
  const ownedFood = SHOP_ITEMS.filter((i) => i.category === 'petFood' && i.consumable && inventory.ownedItems.includes(i.id));

  // Owned accessories (non-consumable petAccessory items the user owns)
  const ownedAccessories = SHOP_ITEMS.filter(
    (i) => i.category === 'petAccessory' && !i.consumable && inventory.ownedItems.includes(i.id)
  );
  // Deduplicate (ownedItems can have duplicates from gacha)
  const uniqueOwnedAccessories = ownedAccessories.filter(
    (item, idx, self) => self.findIndex((x) => x.id === item.id) === idx
  );

  // Evolution progress
  const evolutionPaths: EvolutionRequirement[] = hasPet ? getEvolutionProgress(gamificationData ?? null) : [];

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-96">
          <motion.span className="text-5xl" animate={{ y: [0, -10, 0] }} transition={{ duration: 1, repeat: Infinity }}>🥚</motion.span>
        </div>
      </PageTransition>
    );
  }

  // Species Selection Screen
  if (!hasPet) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto space-y-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-heading font-black">Choose Your Companion! 🐾</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">Pick a species and name your new study buddy. They&apos;ll grow as you learn!</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {SPECIES_LIST.map((species) => {
              const config = PET_SPECIES_CONFIG[species];
              return (
                <motion.button
                  key={species}
                  onClick={() => { setSelectedSpecies(species); playClick(); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    selectedSpecies === species
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                      : 'border-[var(--card-border)] hover:border-primary/30'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-4xl">{config.emoji[3]}</span>
                  <span className="text-xs font-bold">{config.name}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="max-w-xs mx-auto space-y-4">
            <Input
              label="Pet Name"
              placeholder="Name your companion..."
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              maxLength={20}
            />
            <Button variant="primary" onClick={handleCreate} className="w-full" size="lg" icon={<HiSparkles size={16} />}>
              Adopt {PET_SPECIES_CONFIG[selectedSpecies].name}!
            </Button>
          </div>

          {/* Preview */}
          <Card padding="lg" hover={false}>
            <div className="text-center">
              <p className="text-sm text-[var(--muted-foreground)] mb-3">Evolution Path</p>
              <div className="flex items-center justify-center gap-4">
                {PET_SPECIES_CONFIG[selectedSpecies].emoji.map((e, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="text-center">
                      <span className="text-2xl block">{e}</span>
                      <span className="text-[9px] text-[var(--muted-foreground)]">{PET_STAGES[i].name}</span>
                    </div>
                    {i < 4 && <span className="text-[var(--muted-foreground)]">→</span>}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-3">Multiple evolution paths — Tasks, Focus, Streaks, Care, & Style!</p>
            </div>
          </Card>
        </div>
      </PageTransition>
    );
  }

  // Main Pet View
  const config = PET_SPECIES_CONFIG[pet!.species];
  const mood = getMood();
  const stageInfo = PET_STAGES[pet!.stage];

  const TABS: { id: PetTab; label: string; emoji: string }[] = [
    { id: 'overview', label: 'Overview', emoji: '🏠' },
    { id: 'wardrobe', label: 'Wardrobe', emoji: '👗' },
    { id: 'evolution', label: 'Evolution', emoji: '🌟' },
  ];

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">🐾 {pet!.name}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">{config.name} · {stageInfo.name} · {stageInfo.title}</p>
          </div>
          <Badge variant="primary" size="sm">Stage {pet!.stage}/4</Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); playClick(); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-2 ${
                activeTab === tab.id
                  ? 'bg-primary text-white border-primary'
                  : 'border-[var(--card-border)] hover:border-primary/30 text-[var(--muted-foreground)]'
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* Evolution celebration overlay */}
        <AnimatePresence>
          {justEvolved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-400/10 via-primary/10 to-purple-500/10 p-6 text-center"
            >
              <motion.span
                className="text-6xl block mb-3"
                animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: 2 }}
              >
                {config.emoji[pet!.stage]}
              </motion.span>
              <h2 className="text-xl font-heading font-black text-amber-400">✨ Evolution Complete! ✨</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{pet!.name} evolved to <strong>{stageInfo.name}</strong>!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════ OVERVIEW TAB ═══════════════════ */}
        {activeTab === 'overview' && (
          <>
            {/* Pet Display */}
            <Card padding="lg" hover={false}>
              <div className="flex flex-col items-center py-8">
                <motion.div
                  className="relative"
                  animate={
                    mood === 'happy' ? { y: [0, -12, 0] } :
                    mood === 'sleeping' ? { rotate: [0, 5, -5, 0] } :
                    mood === 'sad' ? { y: [0, 3, 0] } :
                    {}
                  }
                  transition={{ duration: mood === 'happy' ? 1 : 2, repeat: Infinity }}
                >
                  <span className="text-[100px] block">{config.emoji[pet!.stage]}</span>
                  {/* Accessories */}
                  {(pet!.equippedAccessories || []).map((accId, idx) => {
                    const item = SHOP_ITEMS.find((i) => i.id === accId);
                    return item ? (
                      <motion.span
                        key={accId}
                        className="absolute text-2xl"
                        style={{
                          top: idx === 0 ? '-8px' : `${idx * 20 - 8}px`,
                          right: idx === 0 ? '-8px' : `${-(idx * 16 + 8)}px`,
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        {item.emoji}
                      </motion.span>
                    ) : null;
                  })}
                  {mood === 'sleeping' && (
                    <motion.span className="absolute -top-4 right-0 text-xl" animate={{ opacity: [0, 1, 0], y: [0, -20] }} transition={{ duration: 2, repeat: Infinity }}>💤</motion.span>
                  )}
                </motion.div>
                <p className="text-lg font-heading font-bold mt-4">{pet!.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {mood === 'happy' ? '🥰 Feeling great!' : mood === 'sad' ? '😢 Needs attention...' : mood === 'sleeping' ? '😴 Zzz...' : '😊 Doing okay'}
                </p>
                {/* Quick stat badges */}
                <div className="flex gap-2 mt-3">
                  <Badge variant="muted" size="sm">🍎 Fed {pet!.totalFeedings ?? 0} times</Badge>
                  <Badge variant="muted" size="sm">🎮 Played {pet!.totalPlaySessions ?? 0} times</Badge>
                  <Badge variant="muted" size="sm">🎀 {(pet!.equippedAccessories || []).length} items</Badge>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'Happiness', value: pet!.happiness, color: 'bg-pink-500', icon: '💖' },
                { label: 'Energy', value: pet!.energy, color: 'bg-amber-500', icon: '⚡' },
                { label: 'Hunger', value: pet!.hunger, color: 'bg-teal', icon: '🍎' },
              ].map((stat) => (
                <Card key={stat.label} padding="md" hover={false}>
                  <div className="text-center">
                    <span className="text-xl">{stat.icon}</span>
                    <p className="text-xs font-bold mt-1">{stat.label}</p>
                    <div className="w-full h-2 rounded-full bg-[var(--card-border)] mt-2 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${stat.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.value}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1">{stat.value}/100</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="primary" onClick={() => setShowFeedModal(true)} className="flex-1" icon={<HiHeart size={14} />}>
                Feed {pet!.name}
              </Button>
              <Button variant="ghost" onClick={handlePlay} className="flex-1" icon={<HiSparkles size={14} />}>
                Play!
              </Button>
            </div>

            {/* Quick Evolution Preview */}
            {pet!.stage < 4 && evolutionPaths.length > 0 && (
              <Card padding="md" hover={false}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-heading font-bold">🌟 Next Evolution</h3>
                  <button onClick={() => { setActiveTab('evolution'); playClick(); }} className="text-[10px] text-primary font-bold hover:underline">
                    View All Paths →
                  </button>
                </div>
                {/* Show the closest path */}
                {(() => {
                  const best = [...evolutionPaths].sort((a, b) => (b.current / b.target) - (a.current / a.target))[0];
                  if (!best) return null;
                  const pct = Math.min(100, Math.round((best.current / best.target) * 100));
                  return (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{best.emoji}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold">{best.label}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">{best.description}</p>
                        <div className="w-full h-2 rounded-full bg-[var(--card-border)] mt-1.5 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{best.current}/{best.target} ({pct}%)</p>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            )}
          </>
        )}

        {/* ═══════════════════ WARDROBE TAB ═══════════════════ */}
        {activeTab === 'wardrobe' && (
          <>
            <Card padding="lg" hover={false}>
              <div className="flex flex-col items-center py-4">
                <span className="text-[80px] block relative">
                  {config.emoji[pet!.stage]}
                  {(pet!.equippedAccessories || []).map((accId, idx) => {
                    const item = SHOP_ITEMS.find((i) => i.id === accId);
                    return item ? (
                      <span
                        key={accId}
                        className="absolute text-2xl"
                        style={{
                          top: idx === 0 ? '-4px' : `${idx * 18 - 4}px`,
                          right: idx === 0 ? '-4px' : `${-(idx * 14 + 4)}px`,
                        }}
                      >
                        {item.emoji}
                      </span>
                    ) : null;
                  })}
                </span>
                <p className="text-sm font-heading font-bold mt-3">{pet!.name}&apos;s Wardrobe</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">{(pet!.equippedAccessories || []).length} item(s) equipped</p>
              </div>
            </Card>

            {/* Equipped Items */}
            {(pet!.equippedAccessories || []).length > 0 && (
              <div>
                <h3 className="text-sm font-heading font-bold mb-2">✨ Currently Equipped</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(pet!.equippedAccessories || []).map((accId) => {
                    const item = SHOP_ITEMS.find((i) => i.id === accId);
                    if (!item) return null;
                    return (
                      <motion.div
                        key={accId}
                        className="rounded-xl border-2 border-teal/30 bg-teal/5 p-3 flex items-center gap-3"
                        layout
                      >
                        <span className="text-2xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{item.name}</p>
                          <Badge variant="primary" size="sm">Equipped</Badge>
                        </div>
                        <button
                          onClick={() => handleUnequip(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                          title="Unequip"
                        >
                          <HiX size={14} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Owned (Unequipped) Items */}
            <div>
              <h3 className="text-sm font-heading font-bold mb-2">🎒 Your Accessories</h3>
              {uniqueOwnedAccessories.length === 0 ? (
                <Card padding="md" hover={false}>
                  <div className="text-center py-6">
                    <span className="text-4xl block mb-2">🛍️</span>
                    <p className="text-sm text-[var(--muted-foreground)]">No accessories yet!</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Buy accessories from the Item Shop to dress up {pet!.name}.</p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <AnimatePresence mode="popLayout">
                    {uniqueOwnedAccessories.map((item) => {
                      const isEquipped = (pet!.equippedAccessories || []).includes(item.id);
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`rounded-xl border-2 p-3 transition-all ${
                            isEquipped
                              ? 'border-teal/40 bg-teal/5'
                              : 'border-[var(--card-border)] hover:border-primary/30 bg-[var(--card-bg)]'
                          }`}
                        >
                          <div className="text-center">
                            <span className="text-3xl block mb-1">{item.emoji}</span>
                            <p className="text-xs font-bold">{item.name}</p>
                            <p className="text-[9px] text-[var(--muted-foreground)] line-clamp-1">{item.description}</p>
                            <Badge variant={item.rarity === 'legendary' ? 'amber' : item.rarity === 'epic' ? 'coral' : item.rarity === 'rare' ? 'primary' : 'muted'} size="sm">{item.rarity}</Badge>
                            <div className="mt-2">
                              {isEquipped ? (
                                <button
                                  onClick={() => handleUnequip(item.id)}
                                  className="w-full px-2 py-1 rounded-lg text-[10px] font-bold bg-teal text-white"
                                >
                                  <HiCheck className="inline mr-0.5" size={10} /> Equipped
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleEquip(item.id)}
                                  className="w-full px-2 py-1 rounded-lg text-[10px] font-bold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                                >
                                  Equip
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* All Available Accessories in Shop */}
            <Card padding="md" hover={false}>
              <div className="text-center py-2">
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  🏪 Want more? Visit the <strong>Item Shop</strong> to buy accessories, food, and cosmetics!
                </p>
              </div>
            </Card>
          </>
        )}

        {/* ═══════════════════ EVOLUTION TAB ═══════════════════ */}
        {activeTab === 'evolution' && (
          <>
            {/* Evolution Path Visual */}
            <Card padding="lg" hover={false}>
              <h3 className="text-sm font-heading font-bold mb-4">🌟 Evolution Journey</h3>
              <div className="flex flex-wrap items-center gap-2 justify-center">
                {PET_SPECIES_CONFIG[pet!.species].emoji.map((e, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <motion.div
                      className={`text-center px-3 py-2 rounded-xl transition-all ${
                        i === pet!.stage
                          ? 'bg-primary/15 border-2 border-primary/40 shadow-lg shadow-primary/10'
                          : i < pet!.stage
                          ? 'bg-teal/10 border border-teal/30'
                          : 'opacity-30 border border-[var(--card-border)]'
                      }`}
                      animate={i === pet!.stage ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-2xl block">{e}</span>
                      <span className="text-[9px] font-bold block">{PET_STAGES[i].name}</span>
                      <span className="text-[8px] text-[var(--muted-foreground)]">{PET_STAGES[i].title}</span>
                    </motion.div>
                    {i < 4 && (
                      <span className={`text-xs ${i < pet!.stage ? 'text-teal' : 'text-[var(--muted-foreground)]'}`}>
                        {i < pet!.stage ? '✓' : '→'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Evolution Paths for current stage */}
            {pet!.stage < 4 ? (
              <div>
                <h3 className="text-sm font-heading font-bold mb-3">
                  🛤️ Paths to {PET_STAGES[pet!.stage + 1]?.name ?? 'Next Stage'}
                  <span className="text-[10px] text-[var(--muted-foreground)] font-normal ml-2">Complete any ONE path to evolve</span>
                </h3>
                <div className="space-y-3">
                  {evolutionPaths.map((path) => {
                    const pct = Math.min(100, Math.round((path.current / path.target) * 100));
                    const isComplete = path.current >= path.target;
                    return (
                      <motion.div
                        key={path.key}
                        className={`rounded-xl border-2 p-4 transition-all ${
                          isComplete
                            ? 'border-teal/40 bg-teal/5'
                            : 'border-[var(--card-border)] bg-[var(--card-bg)]'
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl mt-0.5">{path.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-heading font-bold">{path.label}</p>
                              {isComplete && <Badge variant="primary" size="sm">✓ Ready!</Badge>}
                            </div>
                            <p className="text-[10px] text-[var(--muted-foreground)]">{path.description}</p>
                            <div className="mt-2">
                              <div className="w-full h-2.5 rounded-full bg-[var(--card-border)] overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full ${isComplete ? 'bg-teal' : 'bg-gradient-to-r from-primary to-amber-400'}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                              </div>
                              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                                {path.current} / {path.target} — <strong>{pct}%</strong>
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
              <Card padding="lg" hover={false}>
                <div className="text-center py-6">
                  <span className="text-6xl block mb-3">👑</span>
                  <h3 className="text-lg font-heading font-bold text-amber-400">Maximum Evolution!</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">{pet!.name} has reached the Legendary stage. Truly mythical!</p>
                </div>
              </Card>
            )}

            {/* Stage History */}
            <Card padding="md" hover={false}>
              <h3 className="text-sm font-heading font-bold mb-2">📜 Stage History</h3>
              <div className="space-y-2">
                {PET_STAGES.slice(0, pet!.stage + 1).map((stage, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-lg">{PET_SPECIES_CONFIG[pet!.species].emoji[i]}</span>
                    <div>
                      <span className="font-bold">{stage.name}</span>
                      <span className="text-[var(--muted-foreground)] ml-1">— {stage.title}</span>
                    </div>
                    {i === pet!.stage && <Badge variant="primary" size="sm">Current</Badge>}
                    {i < pet!.stage && <Badge variant="muted" size="sm">✓</Badge>}
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Feed Modal */}
        <Modal isOpen={showFeedModal} onClose={() => setShowFeedModal(false)} title={`Feed ${pet?.name}`}>
          <div className="space-y-3">
            {ownedFood.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl block mb-3">🍽️</span>
                <p className="text-sm text-[var(--muted-foreground)]">No food items! Buy some from the Item Shop.</p>
              </div>
            ) : (
              ownedFood.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleFeed(item.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-all"
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{item.description}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
