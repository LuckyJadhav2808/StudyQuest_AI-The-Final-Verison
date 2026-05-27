'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiHeart, HiSparkles, HiLightningBolt, HiRefresh } from 'react-icons/hi';
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
import { PetSpecies } from '@/types';
import { playSuccess, playClick } from '@/lib/sounds';

const SPECIES_LIST: PetSpecies[] = ['owl', 'cat', 'dragon', 'fox', 'bunny'];

export default function PetContent() {
  const { pet, loading, hasPet, createPet, feedPet, playWithPet, applyDecay, getMood, equipAccessory, unequipAccessory } = usePet();
  const { inventory, ownsItem, useItem } = useShop();
  const { gamificationData } = useGamification();
  const [selectedSpecies, setSelectedSpecies] = useState<PetSpecies>('owl');
  const [petName, setPetName] = useState('');
  const [showFeedModal, setShowFeedModal] = useState(false);

  // Apply decay on page load
  useEffect(() => { if (hasPet) applyDecay(); }, [hasPet]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Owned food items
  const ownedFood = SHOP_ITEMS.filter((i) => i.category === 'petFood' && i.consumable && inventory.ownedItems.includes(i.id));

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

          <div className="grid grid-cols-5 gap-3">
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

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">🐾 {pet!.name}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">{config.name} · {stageInfo.name} · Mood: {mood}</p>
          </div>
          <Badge variant="primary" size="sm">Stage {pet!.stage}/4</Badge>
        </div>

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
              {(pet!.equippedAccessories || []).map((accId) => {
                const item = SHOP_ITEMS.find((i) => i.id === accId);
                return item ? (
                  <span key={accId} className="absolute -top-2 -right-2 text-2xl">{item.emoji}</span>
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
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
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

        {/* Evolution Progress */}
        <Card padding="md" hover={false}>
          <h3 className="text-sm font-heading font-bold mb-3">🌟 Evolution Path</h3>
          <div className="flex items-center gap-2">
            {PET_SPECIES_CONFIG[pet!.species].emoji.map((e, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`text-center px-2 py-1 rounded-xl ${i === pet!.stage ? 'bg-primary/10 border border-primary/30' : i < pet!.stage ? 'opacity-50' : 'opacity-30'}`}>
                  <span className="text-xl block">{e}</span>
                  <span className="text-[8px]">{PET_STAGES[i].name}</span>
                </div>
                {i < 4 && <span className="text-[var(--muted-foreground)] text-xs">→</span>}
              </div>
            ))}
          </div>
          {pet!.stage < 4 && (
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2">Next: {PET_STAGES[pet!.stage + 1]?.requirement}</p>
          )}
        </Card>

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
