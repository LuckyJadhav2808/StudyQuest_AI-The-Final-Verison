'use client';

// ============================================================
// StudyQuest AI — Shared Shop Context (Singleton Listener)
// Consolidates 30+ duplicate Firestore onSnapshot listeners into 1!
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { doc, increment, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToDocument, setDocument } from '@/lib/firestore';
import { useAuthContext } from '@/context/AuthContext';
import { getLocalDateString } from '@/lib/dateUtils';
import { UserInventory, ShopItem, ActiveEffect, AlchemyRecipe } from '@/types';
import {
  SHOP_ITEMS,
  TREASURE_CHEST_REWARDS,
  TreasureReward,
  ALCHEMY_INGREDIENTS,
  ALCHEMY_RECIPES,
} from '@/lib/constants';

const DEFAULT_INVENTORY: UserInventory = {
  coins: 0,
  ownedItems: [],
  equippedItems: {},
  gachaHistory: [],
  ingredients: {},
  activeEffects: [],
};

const GACHA_COST = 50;
const RARITY_WEIGHTS = { common: 50, rare: 30, epic: 15, legendary: 5 };

function weightedRandom(): string {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    r -= weight;
    if (r <= 0) return rarity;
  }
  return 'common';
}

export interface ShopContextValue {
  inventory: UserInventory;
  loading: boolean;
  coins: number;
  buyItem: (itemId: string) => Promise<boolean>;
  useItem: (itemId: string) => Promise<boolean>;
  equipItem: (itemId: string, slot?: string) => Promise<boolean>;
  unequipItem: (slot: string) => Promise<boolean>;
  addCoins: (amount: number) => Promise<void>;
  ownsItem: (itemId: string) => boolean;
  rollGacha: () => Promise<ShopItem | null>;
  canClaimTreasureChest: () => boolean;
  claimTreasureChest: () => Promise<TreasureReward | null>;
  // Alchemy
  ingredients: Record<string, number>;
  addIngredient: (source?: 'focus' | 'task' | 'trivia' | 'quiz') => Promise<{ id: string; name: string; emoji: string } | null>;
  craftItem: (recipeId: string) => Promise<boolean>;
  hasActiveEffect: (effectKey: string) => boolean;
  activeEffects: ActiveEffect[];
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [inventory, setInventory] = useState<UserInventory>(DEFAULT_INVENTORY);
  const [loading, setLoading] = useState(true);

  const inventoryRef = useRef<UserInventory>(DEFAULT_INVENTORY);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  // SINGLETON: Subscribe to user inventory exactly once
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const ref = doc(db, 'users', user.uid, 'data', 'inventory');
    const unsub = subscribeToDocument<UserInventory>(ref, (data) => {
      const inv = data || DEFAULT_INVENTORY;
      setInventory(inv);
      inventoryRef.current = inv;
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const getRef = useCallback(() => {
    if (!user?.uid) return null;
    return doc(db, 'users', user.uid, 'data', 'inventory');
  }, [user?.uid]);

  const rawCoins = inventory?.coins as any;
  const coins =
    typeof rawCoins === 'number'
      ? rawCoins
      : typeof rawCoins === 'string' && !isNaN(Number(rawCoins))
      ? Number(rawCoins)
      : typeof rawCoins === 'object' && rawCoins && 'bc' in rawCoins
      ? Number(rawCoins.bc) || 0
      : 0;

  const ownsItem = useCallback((itemId: string) => {
    return inventoryRef.current.ownedItems.includes(itemId);
  }, []);

  const addCoins = useCallback(
    async (amount: number) => {
      const ref = getRef();
      if (!ref) return;
      await setDocument(ref, { coins: increment(amount) });
    },
    [getRef]
  );

  const buyItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      const ref = getRef();
      if (!ref) return false;
      const item = SHOP_ITEMS.find((i) => i.id === itemId);
      if (!item) return false;

      try {
        const result = await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(ref);
          const current = docSnap.exists() ? (docSnap.data() as UserInventory) : DEFAULT_INVENTORY;

          if (current.coins < item.price) return false;
          if (!item.consumable && current.ownedItems.includes(itemId)) return false;

          const updatedOwned = [...(current.ownedItems || []), itemId];

          transaction.set(
            ref,
            {
              coins: current.coins - item.price,
              ownedItems: updatedOwned,
            },
            { merge: true }
          );
          return true;
        });
        return result;
      } catch (e) {
        console.error('buyItem transaction failed', e);
        return false;
      }
    },
    [getRef]
  );

  const useItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      const ref = getRef();
      if (!ref) return false;
      const item = SHOP_ITEMS.find((i) => i.id === itemId);
      if (!item || !item.consumable) return false;

      try {
        const result = await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(ref);
          const current = docSnap.exists() ? (docSnap.data() as UserInventory) : DEFAULT_INVENTORY;

          const idx = current.ownedItems.indexOf(itemId);
          if (idx === -1) return false;

          const updatedOwned = [...current.ownedItems];
          updatedOwned.splice(idx, 1);

          transaction.set(ref, { ownedItems: updatedOwned }, { merge: true });
          return true;
        });
        return result;
      } catch (e) {
        console.error('useItem transaction failed', e);
        return false;
      }
    },
    [getRef]
  );

  const equipItem = useCallback(
    async (itemId: string, slot?: string): Promise<boolean> => {
      const ref = getRef();
      if (!ref) return false;
      const item = SHOP_ITEMS.find((i) => i.id === itemId);
      if (!item) return false;

      const targetSlot = slot || item.category;
      try {
        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(ref);
          const current = docSnap.exists() ? (docSnap.data() as UserInventory) : DEFAULT_INVENTORY;

          if (!current.ownedItems.includes(itemId)) return;

          const updatedEquipped = { ...(current.equippedItems || {}), [targetSlot]: itemId };
          transaction.set(ref, { equippedItems: updatedEquipped }, { merge: true });
        });
        return true;
      } catch (e) {
        console.error('equipItem transaction failed', e);
        return false;
      }
    },
    [getRef]
  );

  const unequipItem = useCallback(
    async (slot: string): Promise<boolean> => {
      const ref = getRef();
      if (!ref) return false;

      try {
        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(ref);
          const current = docSnap.exists() ? (docSnap.data() as UserInventory) : DEFAULT_INVENTORY;

          const updatedEquipped = { ...(current.equippedItems || {}) };
          delete updatedEquipped[slot];

          transaction.set(ref, { equippedItems: updatedEquipped }, { merge: true });
        });
        return true;
      } catch (e) {
        console.error('unequipItem transaction failed', e);
        return false;
      }
    },
    [getRef]
  );

  const rollGacha = useCallback(async (): Promise<ShopItem | null> => {
    const ref = getRef();
    if (!ref) return null;

    try {
      const result = await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(ref);
        const current = docSnap.exists() ? (docSnap.data() as UserInventory) : DEFAULT_INVENTORY;

        if (current.coins < GACHA_COST) return null;

        const targetRarity = weightedRandom();
        let pool = SHOP_ITEMS.filter((i) => i.rarity === targetRarity && !i.consumable);
        if (pool.length === 0) pool = SHOP_ITEMS.filter((i) => !i.consumable);

        const unownedPool = pool.filter((i) => !current.ownedItems.includes(i.id));
        const finalPool = unownedPool.length > 0 ? unownedPool : pool;
        const awardedItem = finalPool[Math.floor(Math.random() * finalPool.length)];

        const updatedOwned = current.ownedItems.includes(awardedItem.id)
          ? current.ownedItems
          : [...current.ownedItems, awardedItem.id];

        const historyEntry = {
          itemId: awardedItem.id,
          timestamp: Date.now(),
          rarity: awardedItem.rarity,
        };
        const updatedHistory = [historyEntry, ...(current.gachaHistory || [])].slice(0, 50);

        transaction.set(
          ref,
          {
            coins: current.coins - GACHA_COST,
            ownedItems: updatedOwned,
            gachaHistory: updatedHistory,
          },
          { merge: true }
        );

        return awardedItem;
      });
      return result;
    } catch (e) {
      console.error('rollGacha transaction failed', e);
      return null;
    }
  }, [getRef]);

  const canClaimTreasureChest = useCallback((): boolean => {
    if (loading || !user?.uid) return false;
    const today = getLocalDateString();
    return inventoryRef.current.lastTreasureChestClaim !== today;
  }, [loading, user?.uid]);

  const claimTreasureChest = useCallback(async (): Promise<TreasureReward | null> => {
    const ref = getRef();
    if (!ref) return null;
    const today = getLocalDateString();

    try {
      let alreadyClaimed = false;
      const result = await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(ref);
        const current = docSnap.exists() ? (docSnap.data() as UserInventory) : DEFAULT_INVENTORY;

        if (current.lastTreasureChestClaim === today) {
          alreadyClaimed = true;
          return null;
        }

        // Roll weighted random reward
        const totalWeight = TREASURE_CHEST_REWARDS.reduce((sum, r) => sum + r.weight, 0);
        let roll = Math.random() * totalWeight;
        let selected = TREASURE_CHEST_REWARDS[0];
        for (const entry of TREASURE_CHEST_REWARDS) {
          roll -= entry.weight;
          if (roll <= 0) {
            selected = entry;
            break;
          }
        }

        // Calculate random amounts within range
        const rewardCoins =
          Math.floor(Math.random() * (selected.coinRange[1] - selected.coinRange[0] + 1)) +
          selected.coinRange[0];
        const xp =
          selected.xpRange[1] > 0
            ? Math.floor(Math.random() * (selected.xpRange[1] - selected.xpRange[0] + 1)) +
              selected.xpRange[0]
            : 0;

        const reward: TreasureReward = {
          ...selected.reward,
          coins: rewardCoins,
          xp,
        };

        transaction.set(
          ref,
          {
            coins: (current.coins || 0) + rewardCoins,
            lastTreasureChestClaim: today,
          },
          { merge: true }
        );
        return reward;
      });

      if (result) {
        const updated: UserInventory = {
          ...inventoryRef.current,
          coins: (inventoryRef.current.coins || 0) + result.coins,
          lastTreasureChestClaim: today,
        };
        inventoryRef.current = updated;
        setInventory(updated);
      } else if (alreadyClaimed) {
        inventoryRef.current = { ...inventoryRef.current, lastTreasureChestClaim: today };
        setInventory((prev) => ({ ...prev, lastTreasureChestClaim: today }));
      }

      return result;
    } catch (e) {
      console.error('claimTreasureChest transaction failed', e);
      return null;
    }
  }, [getRef]);

  const addIngredient = useCallback(
    async (
      source: 'focus' | 'task' | 'trivia' | 'quiz' = 'focus'
    ): Promise<{ id: string; name: string; emoji: string } | null> => {
      const ref = getRef();
      if (!ref) return null;

      // Filter available ingredients based on source-specific drop chances
      const roll = Math.random() * 100;
      const eligible = ALCHEMY_INGREDIENTS.filter((i) => roll < i.dropChance);
      if (eligible.length === 0) return null;

      // Pick a random one from eligible
      const ingredient = eligible[Math.floor(Math.random() * eligible.length)];

      try {
        const result = await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(ref);
          const current = docSnap.exists() ? (docSnap.data() as UserInventory) : DEFAULT_INVENTORY;

          const currentIngredients = current.ingredients || {};
          const updatedIngredients = {
            ...currentIngredients,
            [ingredient.id]: (currentIngredients[ingredient.id] || 0) + 1,
          };

          transaction.set(
            ref,
            {
              ingredients: updatedIngredients,
            },
            { merge: true }
          );
          return { id: ingredient.id, name: ingredient.name, emoji: ingredient.emoji };
        });
        return result;
      } catch (e) {
        console.error('addIngredient transaction failed', e);
        return null;
      }
    },
    [getRef]
  );

  const craftItem = useCallback(
    async (recipeId: string): Promise<boolean> => {
      const ref = getRef();
      if (!ref) return false;
      const recipe = ALCHEMY_RECIPES.find((r) => r.id === recipeId);
      if (!recipe) return false;

      try {
        const result = await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(ref);
          const current = docSnap.exists() ? (docSnap.data() as UserInventory) : DEFAULT_INVENTORY;

          const currentIngredients = current.ingredients || {};

          for (const [ingId, required] of Object.entries(recipe.ingredients)) {
            if ((currentIngredients[ingId] || 0) < required) return false;
          }

          const newIngredients = { ...currentIngredients };
          for (const [ingId, required] of Object.entries(recipe.ingredients)) {
            newIngredients[ingId] = (newIngredients[ingId] || 0) - required;
            if (newIngredients[ingId] <= 0) delete newIngredients[ingId];
          }

          const activeEffects = [...(current.activeEffects || [])];
          if (recipe.duration && recipe.duration > 0) {
            activeEffects.push({
              recipeId: recipe.id,
              effectKey: recipe.effect,
              expiresAt: Date.now() + recipe.duration * 60 * 1000,
            });
          }

          transaction.set(
            ref,
            {
              ingredients: newIngredients,
              activeEffects,
            },
            { merge: true }
          );
          return true;
        });
        return result;
      } catch (e) {
        console.error('craftItem transaction failed', e);
        return false;
      }
    },
    [getRef]
  );

  const hasActiveEffect = useCallback((effectKey: string): boolean => {
    const effects = inventoryRef.current.activeEffects || [];
    return effects.some((e) => e.effectKey === effectKey && e.expiresAt > Date.now());
  }, []);

  const ingredients = inventory.ingredients || {};
  const activeEffects = (inventory.activeEffects || []).filter((e) => e.expiresAt > Date.now());

  const contextValue = useMemo<ShopContextValue>(
    () => ({
      inventory,
      loading,
      coins,
      buyItem,
      useItem,
      equipItem,
      unequipItem,
      addCoins,
      ownsItem,
      rollGacha,
      canClaimTreasureChest,
      claimTreasureChest,
      ingredients,
      addIngredient,
      craftItem,
      hasActiveEffect,
      activeEffects,
    }),
    [
      inventory,
      loading,
      coins,
      buyItem,
      useItem,
      equipItem,
      unequipItem,
      addCoins,
      ownsItem,
      rollGacha,
      canClaimTreasureChest,
      claimTreasureChest,
      ingredients,
      addIngredient,
      craftItem,
      hasActiveEffect,
      activeEffects,
    ]
  );

  return <ShopContext.Provider value={contextValue}>{children}</ShopContext.Provider>;
}

const DEFAULT_SHOP_VALUE: ShopContextValue = {
  inventory: DEFAULT_INVENTORY,
  loading: true,
  coins: 0,
  buyItem: async () => false,
  useItem: async () => false,
  equipItem: async () => false,
  unequipItem: async () => false,
  addCoins: async () => {},
  ownsItem: () => false,
  rollGacha: async () => null,
  canClaimTreasureChest: () => false,
  claimTreasureChest: async () => null,
  ingredients: {},
  addIngredient: async () => null,
  craftItem: async () => false,
  hasActiveEffect: () => false,
  activeEffects: [],
};

export function useShop(): ShopContextValue {
  const context = useContext(ShopContext);
  if (!context) {
    return DEFAULT_SHOP_VALUE;
  }
  return context;
}
