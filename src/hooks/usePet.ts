'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToDocument, setDocument } from '@/lib/firestore';
import { useAuthContext } from '@/context/AuthContext';
import { PetData, PetSpecies, PetStage } from '@/types';
import { PET_SPECIES_CONFIG } from '@/lib/constants';

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
};

export function usePet() {
  const { user } = useAuthContext();
  const [pet, setPet] = useState<PetData | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to pet data
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const petRef = doc(db, 'users', user.uid, 'data', 'pet');
    const unsub = subscribeToDocument<PetData>(petRef, (data) => {
      setPet(data);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  // Create a new pet
  const createPet = useCallback(async (species: PetSpecies, name: string) => {
    if (!user?.uid) return;
    const petRef = doc(db, 'users', user.uid, 'data', 'pet');
    const newPet: PetData = {
      ...DEFAULT_PET,
      id: crypto.randomUUID(),
      species,
      name: name || PET_SPECIES_CONFIG[species].name,
      createdAt: Date.now(),
      lastFedAt: Date.now(),
      lastPlayedAt: Date.now(),
    };
    await setDocument(petRef, newPet, false);
  }, [user?.uid]);

  // Update pet data
  const updatePet = useCallback(async (updates: Partial<PetData>) => {
    if (!user?.uid || !pet) return;
    const petRef = doc(db, 'users', user.uid, 'data', 'pet');
    await setDocument(petRef, { ...pet, ...updates });
  }, [user?.uid, pet]);

  // Feed pet (used by shop system)
  const feedPet = useCallback(async (hungerAmount: number, happinessAmount: number = 0) => {
    if (!pet) return;
    await updatePet({
      hunger: Math.min(100, pet.hunger + hungerAmount),
      happiness: Math.min(100, pet.happiness + happinessAmount),
      lastFedAt: Date.now(),
    });
  }, [pet, updatePet]);

  // Play with pet
  const playWithPet = useCallback(async () => {
    if (!pet) return;
    await updatePet({
      happiness: Math.min(100, pet.happiness + 15),
      energy: Math.max(0, pet.energy - 10),
      lastPlayedAt: Date.now(),
    });
  }, [pet, updatePet]);

  // Award pet XP and check evolution
  const awardPetXP = useCallback(async (amount: number) => {
    if (!pet) return;
    const newXP = pet.xp + amount;
    const newHappiness = Math.min(100, pet.happiness + 3);
    await updatePet({ xp: newXP, happiness: newHappiness });
  }, [pet, updatePet]);

  // Check and trigger evolution
  const checkEvolution = useCallback(async (userLevel: number, tasksCompleted: number) => {
    if (!pet) return false;
    let newStage: PetStage = pet.stage;

    if (pet.stage === 0 && tasksCompleted >= 5) newStage = 1;
    else if (pet.stage === 1 && userLevel >= 5) newStage = 2;
    else if (pet.stage === 2 && userLevel >= 10) newStage = 3;
    else if (pet.stage === 3 && userLevel >= 20) newStage = 4;

    if (newStage !== pet.stage) {
      await updatePet({
        stage: newStage,
        hatchedAt: pet.stage === 0 && newStage === 1 ? Date.now() : pet.hatchedAt,
        happiness: 100,
        energy: 100,
        hunger: 100,
      });
      return true; // evolved!
    }
    return false;
  }, [pet, updatePet]);

  // Decay system — call on page load
  const applyDecay = useCallback(async () => {
    if (!pet) return;
    const now = Date.now();
    const hoursSinceLastFed = (now - pet.lastFedAt) / (1000 * 60 * 60);
    const hoursSinceLastPlayed = (now - pet.lastPlayedAt) / (1000 * 60 * 60);

    if (hoursSinceLastFed < 12 && hoursSinceLastPlayed < 12) return; // no decay needed

    const hungerDecay = Math.floor(hoursSinceLastFed / 12) * 5;
    const happinessDecay = Math.floor(hoursSinceLastPlayed / 12) * 5;

    if (hungerDecay > 0 || happinessDecay > 0) {
      await updatePet({
        hunger: Math.max(0, pet.hunger - hungerDecay),
        happiness: Math.max(0, pet.happiness - happinessDecay),
      });
    }
  }, [pet, updatePet]);

  // Equip/unequip accessory
  const equipAccessory = useCallback(async (itemId: string) => {
    if (!pet) return;
    const current = pet.equippedAccessories || [];
    if (current.includes(itemId)) return;
    await updatePet({ equippedAccessories: [...current, itemId] });
  }, [pet, updatePet]);

  const unequipAccessory = useCallback(async (itemId: string) => {
    if (!pet) return;
    await updatePet({
      equippedAccessories: (pet.equippedAccessories || []).filter((id) => id !== itemId),
    });
  }, [pet, updatePet]);

  // Mood calculation
  const getMood = useCallback((): 'happy' | 'neutral' | 'sad' | 'sleeping' => {
    if (!pet) return 'neutral';
    if (pet.energy < 20) return 'sleeping';
    if (pet.happiness > 70) return 'happy';
    if (pet.happiness > 40) return 'neutral';
    return 'sad';
  }, [pet]);

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
    applyDecay,
    equipAccessory,
    unequipAccessory,
    getMood,
  };
}
