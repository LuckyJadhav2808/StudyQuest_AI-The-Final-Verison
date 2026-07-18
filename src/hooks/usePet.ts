'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToDocument, setDocument } from '@/lib/firestore';
import { useAuthContext } from '@/context/AuthContext';
import { PetData, PetSpecies, PetStage, GamificationData, EvolutionRequirement } from '@/types';
import { PET_SPECIES_CONFIG, PET_STAGES } from '@/lib/constants';
import { useSkillTree } from '@/hooks/useSkillTree';
import toast from 'react-hot-toast';

const DEFAULT_PET: PetData = {
  id: '',
  name: '',
  species: 'owl',
  stage: 0,
  xp: 0,
  happiness: 80,
  energy: 100,
  hunger: 80,
  equippedAccessories: [],
  lastFedAt: Date.now(),
  lastPlayedAt: Date.now(),
  hatchedAt: null,
  createdAt: 0,
  totalFeedings: 0,
  totalPlaySessions: 0,
  level: 1,
  exp: 0,
};

export function usePet() {
  const { user } = useAuthContext();
  const { hasEffect } = useSkillTree();
  const [pet, setPet] = useState<PetData | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Ref to always hold the latest pet (prevents stale closures) ──
  const petRef = useRef<PetData | null>(null);
  useEffect(() => { petRef.current = pet; }, [pet]);

  // Subscribe to pet data
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const ref = doc(db, 'users', user.uid, 'data', 'pet');
    const unsub = subscribeToDocument<PetData>(ref, (data) => {
      // Backfill new fields for existing users
      if (data) {
        if (!data.name) {
          data.name = PET_SPECIES_CONFIG[data.species]?.name || 'Companion';
        }
        if (data.stage === undefined) data.stage = 0;
        if (data.totalFeedings === undefined) data.totalFeedings = 0;
        if (data.totalPlaySessions === undefined) data.totalPlaySessions = 0;
        if (data.level === undefined) data.level = 1;
        if (data.exp === undefined) data.exp = 0;
      }
      setPet(data);
      petRef.current = data;
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  // Get Firestore ref (stable)
  const getRef = useCallback(() => {
    if (!user?.uid) return null;
    return doc(db, 'users', user.uid, 'data', 'pet');
  }, [user?.uid]);

  // Create a new pet
  const createPet = useCallback(async (species: PetSpecies, name: string) => {
    const ref = getRef();
    if (!ref) return;
    const newPet: PetData = {
      ...DEFAULT_PET,
      id: crypto.randomUUID(),
      species,
      name: name || PET_SPECIES_CONFIG[species].name,
      createdAt: Date.now(),
      lastFedAt: Date.now(),
      lastPlayedAt: Date.now(),
    };
    petRef.current = newPet;
    await setDocument(ref, newPet, false);
  }, [getRef]);

  // Update pet data
  const updatePet = useCallback(async (updates: Partial<PetData>) => {
    const ref = getRef();
    const current = petRef.current;
    if (!ref || !current) return;
    const updated = { ...current, ...updates };
    petRef.current = updated; // optimistic
    await setDocument(ref, updated);
  }, [getRef]);

  // Feed pet (used by shop system) — now tracks total feedings
  const feedPet = useCallback(async (hungerAmount: number, happinessAmount: number = 0) => {
    const current = petRef.current;
    if (!current) return;
    await updatePet({
      hunger: Math.min(100, current.hunger + hungerAmount),
      happiness: Math.min(100, current.happiness + happinessAmount),
      lastFedAt: Date.now(),
      totalFeedings: (current.totalFeedings || 0) + 1,
    });
  }, [updatePet]);

  // Play with pet — now tracks total play sessions
  const playWithPet = useCallback(async () => {
    const current = petRef.current;
    if (!current) return;
    let bonusHappy = 15;
    if (hasEffect('pet-happy-5')) {
      bonusHappy += 5;
    }
    await updatePet({
      happiness: Math.min(100, current.happiness + bonusHappy),
      energy: Math.max(0, current.energy - 10),
      lastPlayedAt: Date.now(),
      totalPlaySessions: (current.totalPlaySessions || 0) + 1,
    });
  }, [updatePet, hasEffect]);

  // Award pet XP and check evolution
  const awardPetXP = useCallback(async (amount: number) => {
    const current = petRef.current;
    if (!current) return;
    
    let bonusXP = amount;
    if (hasEffect('pet-xp-double')) {
      bonusXP *= 2;
    }
    
    const newXP = current.xp + bonusXP;
    const currentLevel = current.level || 1;
    let nextLevel = currentLevel;
    let finalXP = newXP;
    let leveledUp = false;
    
    while (finalXP >= (nextLevel * 150)) {
      finalXP -= (nextLevel * 150);
      nextLevel += 1;
      leveledUp = true;
    }
    
    const newHappiness = Math.min(100, current.happiness + 3);
    await updatePet({
      xp: finalXP,
      exp: finalXP,
      level: nextLevel,
      happiness: newHappiness
    });

    if (leveledUp) {
      toast.success(`🎉 Your companion ${current.name || 'Companion'} leveled up to Level ${nextLevel}!`);
      
      // pet-ultimate: +10 coins per pet level-up
      if (hasEffect('pet-ultimate') && user?.uid) {
        try {
          const invRef = doc(db, 'users', user.uid, 'data', 'inventory');
          const { increment: firestoreIncrement, setDoc } = await import('firebase/firestore');
          await setDoc(invRef, { coins: firestoreIncrement(10) }, { merge: true });
          toast.success(`🪙 Alpha Tamer Bonus: +10 coins!`);
        } catch (e) {
          console.error('Failed to award level-up coins:', e);
        }
      }
    }
  }, [updatePet, hasEffect, user?.uid]);

  // ── Get the live progress for each evolution path at the current stage ──
  const getEvolutionProgress = useCallback((gamificationData: GamificationData | null): EvolutionRequirement[] => {
    const current = petRef.current;
    if (!current || current.stage >= 4) return [];
    const stageDef = PET_STAGES[current.stage];
    if (!stageDef || !stageDef.paths) return [];

    return stageDef.paths.map((path) => {
      let currentValue = 0;
      switch (path.key) {
        case 'tasks':
          currentValue = gamificationData?.totalTasksCompleted ?? 0;
          break;
        case 'focus':
          currentValue = gamificationData?.totalFocusMinutes ?? 0;
          break;
        case 'streak':
          currentValue = gamificationData?.streak ?? 0;
          break;
        case 'care':
          // For care paths: feedings + play sessions combined
          currentValue = (current.totalFeedings || 0) + (current.totalPlaySessions || 0);
          break;
        case 'style':
          currentValue = (current.equippedAccessories || []).length;
          break;
      }
      return {
        key: path.key,
        label: path.label,
        emoji: path.emoji,
        description: path.description,
        current: currentValue,
        target: path.target,
      };
    });
  }, []);

  // ── Multi-path evolution check ──
  // Returns true if evolved. The pet evolves when ANY single path is satisfied.
  const checkEvolution = useCallback(async (gamificationData: GamificationData | null): Promise<boolean> => {
    const current = petRef.current;
    if (!current || current.stage >= 4) return false;

    const paths = getEvolutionProgress(gamificationData);
    const satisfied = paths.some((p) => p.current >= p.target);

    if (satisfied) {
      const newStage = (current.stage + 1) as PetStage;
      await updatePet({
        stage: newStage,
        hatchedAt: current.stage === 0 && newStage === 1 ? Date.now() : current.hatchedAt,
        happiness: 100,
        energy: 100,
        hunger: 100,
      });
      return true; // evolved!
    }
    return false;
  }, [updatePet, getEvolutionProgress]);

  // Decay system — call on page load
  const applyDecay = useCallback(async () => {
    const current = petRef.current;
    if (!current) return;
    const now = Date.now();
    const hoursSinceLastFed = (now - current.lastFedAt) / (1000 * 60 * 60);
    const hoursSinceLastPlayed = (now - current.lastPlayedAt) / (1000 * 60 * 60);

    if (hoursSinceLastFed < 12 && hoursSinceLastPlayed < 12) return; // no decay needed

    let hungerDecay = Math.floor(hoursSinceLastFed / 12) * 5;
    const happinessDecay = Math.floor(hoursSinceLastPlayed / 12) * 5;

    // Apply Skill Tree Hunger Reductions
    if (hasEffect('pet-ultimate')) {
      hungerDecay = 0;
    } else if (hasEffect('pet-hunger-slow-50')) {
      hungerDecay = Math.round(hungerDecay * 0.5);
    } else if (hasEffect('pet-hunger-slow-25')) {
      hungerDecay = Math.round(hungerDecay * 0.75);
    }

    if (hungerDecay > 0 || happinessDecay > 0) {
      await updatePet({
        hunger: Math.max(0, current.hunger - hungerDecay),
        happiness: Math.max(0, current.happiness - happinessDecay),
      });
    }
  }, [updatePet, hasEffect]);

  // Equip/unequip accessory
  const equipAccessory = useCallback(async (itemId: string) => {
    const current = petRef.current;
    if (!current) return;
    const accessories = current.equippedAccessories || [];
    if (accessories.includes(itemId)) return;
    await updatePet({ equippedAccessories: [...accessories, itemId] });
  }, [updatePet]);

  const unequipAccessory = useCallback(async (itemId: string) => {
    const current = petRef.current;
    if (!current) return;
    await updatePet({
      equippedAccessories: (current.equippedAccessories || []).filter((id) => id !== itemId),
    });
  }, [updatePet]);

  // Mood calculation
  const getMood = useCallback((): 'happy' | 'neutral' | 'sad' | 'sleeping' => {
    const current = petRef.current;
    if (!current) return 'neutral';
    if (current.energy < 20) return 'sleeping';
    if (current.happiness > 70) return 'happy';
    if (current.happiness > 40) return 'neutral';
    return 'sad';
  }, []);

  return {
    pet,
    loading,
    hasPet: !!pet,
    createPet,
    updatePet,
    feedPet,
    playWithPet,
    awardPetXP,
    checkEvolution,
    getEvolutionProgress,
    applyDecay,
    equipAccessory,
    unequipAccessory,
    getMood,
  };
}
