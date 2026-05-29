'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

  // ── Ref to always hold the latest pet (prevents stale closures) ──
  const petRef = useRef<PetData | null>(null);
  useEffect(() => { petRef.current = pet; }, [pet]);

  // Subscribe to pet data
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const ref = doc(db, 'users', user.uid, 'data', 'pet');
    const unsub = subscribeToDocument<PetData>(ref, (data) => {
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

  // Feed pet (used by shop system)
  const feedPet = useCallback(async (hungerAmount: number, happinessAmount: number = 0) => {
    const current = petRef.current;
    if (!current) return;
    await updatePet({
      hunger: Math.min(100, current.hunger + hungerAmount),
      happiness: Math.min(100, current.happiness + happinessAmount),
      lastFedAt: Date.now(),
    });
  }, [updatePet]);

  // Play with pet
  const playWithPet = useCallback(async () => {
    const current = petRef.current;
    if (!current) return;
    await updatePet({
      happiness: Math.min(100, current.happiness + 15),
      energy: Math.max(0, current.energy - 10),
      lastPlayedAt: Date.now(),
    });
  }, [updatePet]);

  // Award pet XP and check evolution
  const awardPetXP = useCallback(async (amount: number) => {
    const current = petRef.current;
    if (!current) return;
    const newXP = current.xp + amount;
    const newHappiness = Math.min(100, current.happiness + 3);
    await updatePet({ xp: newXP, happiness: newHappiness });
  }, [updatePet]);

  // Check and trigger evolution
  const checkEvolution = useCallback(async (userLevel: number, tasksCompleted: number) => {
    const current = petRef.current;
    if (!current) return false;
    let newStage: PetStage = current.stage;

    if (current.stage === 0 && tasksCompleted >= 5) newStage = 1;
    else if (current.stage === 1 && userLevel >= 5) newStage = 2;
    else if (current.stage === 2 && userLevel >= 10) newStage = 3;
    else if (current.stage === 3 && userLevel >= 20) newStage = 4;

    if (newStage !== current.stage) {
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
  }, [updatePet]);

  // Decay system — call on page load
  const applyDecay = useCallback(async () => {
    const current = petRef.current;
    if (!current) return;
    const now = Date.now();
    const hoursSinceLastFed = (now - current.lastFedAt) / (1000 * 60 * 60);
    const hoursSinceLastPlayed = (now - current.lastPlayedAt) / (1000 * 60 * 60);

    if (hoursSinceLastFed < 12 && hoursSinceLastPlayed < 12) return; // no decay needed

    const hungerDecay = Math.floor(hoursSinceLastFed / 12) * 5;
    const happinessDecay = Math.floor(hoursSinceLastPlayed / 12) * 5;

    if (hungerDecay > 0 || happinessDecay > 0) {
      await updatePet({
        hunger: Math.max(0, current.hunger - hungerDecay),
        happiness: Math.max(0, current.happiness - happinessDecay),
      });
    }
  }, [updatePet]);

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
    applyDecay,
    equipAccessory,
    unequipAccessory,
    getMood,
  };
}
