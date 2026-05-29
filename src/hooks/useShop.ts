import { useState, useEffect, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToDocument, setDocument } from '@/lib/firestore';
import { useAuthContext } from '@/context/AuthContext';
import { UserInventory, ShopItem } from '@/types';
import { SHOP_ITEMS, TREASURE_CHEST_REWARDS, TreasureReward } from '@/lib/constants';

const DEFAULT_INVENTORY: UserInventory = {
  coins: 0,
  ownedItems: [],
  equippedItems: {},
  gachaHistory: [],
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

export function useShop() {
  const { user } = useAuthContext();
  const [inventory, setInventory] = useState<UserInventory>(DEFAULT_INVENTORY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const ref = doc(db, 'users', user.uid, 'data', 'inventory');
    const unsub = subscribeToDocument<UserInventory>(ref, (data) => {
      setInventory(data || DEFAULT_INVENTORY);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const save = useCallback(async (data: UserInventory) => {
    if (!user?.uid) return;
    const ref = doc(db, 'users', user.uid, 'data', 'inventory');
    await setDocument(ref, data);
  }, [user?.uid]);

  const coins = inventory.coins;

  const ownsItem = useCallback((itemId: string) => {
    return inventory.ownedItems.includes(itemId);
  }, [inventory.ownedItems]);

  const addCoins = useCallback(async (amount: number) => {
    const updated = { ...inventory, coins: inventory.coins + amount };
    await save(updated);
  }, [inventory, save]);

  const buyItem = useCallback(async (itemId: string): Promise<boolean> => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return false;
    if (inventory.coins < item.price) return false;
    if (!item.consumable && inventory.ownedItems.includes(itemId)) return false;

    const updated: UserInventory = {
      ...inventory,
      coins: inventory.coins - item.price,
      ownedItems: [...inventory.ownedItems, itemId],
    };
    await save(updated);
    return true;
  }, [inventory, save]);

  const useItem = useCallback(async (itemId: string) => {
    const idx = inventory.ownedItems.indexOf(itemId);
    if (idx === -1) return;
    const newOwned = [...inventory.ownedItems];
    newOwned.splice(idx, 1);
    await save({ ...inventory, ownedItems: newOwned });
  }, [inventory, save]);

  const equipItem = useCallback(async (itemId: string, category: string) => {
    const updated = {
      ...inventory,
      equippedItems: { ...inventory.equippedItems, [category]: itemId },
    };
    await save(updated);
  }, [inventory, save]);

  const unequipItem = useCallback(async (category: string) => {
    const eq = { ...inventory.equippedItems };
    delete eq[category];
    await save({ ...inventory, equippedItems: eq });
  }, [inventory, save]);

  const rollGacha = useCallback(async (): Promise<ShopItem | null> => {
    if (inventory.coins < GACHA_COST) return null;
    const rarity = weightedRandom();
    const pool = SHOP_ITEMS.filter((i) => i.rarity === rarity && !i.consumable);
    if (pool.length === 0) return null;
    const item = pool[Math.floor(Math.random() * pool.length)];
    const updated: UserInventory = {
      ...inventory,
      coins: inventory.coins - GACHA_COST,
      ownedItems: [...inventory.ownedItems, item.id],
      gachaHistory: [item.id, ...(inventory.gachaHistory || [])].slice(0, 10),
    };
    await save(updated);
    return item;
  }, [inventory, save]);

  // Daily Treasure Chest claim
  const canClaimTreasureChest = useCallback((): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return inventory.lastTreasureChestClaim !== today;
  }, [inventory.lastTreasureChestClaim]);

  const claimTreasureChest = useCallback(async (): Promise<TreasureReward | null> => {
    const today = new Date().toISOString().split('T')[0];
    if (inventory.lastTreasureChestClaim === today) return null; // Already claimed today

    // Roll weighted random reward
    const totalWeight = TREASURE_CHEST_REWARDS.reduce((sum, r) => sum + r.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected = TREASURE_CHEST_REWARDS[0];
    for (const entry of TREASURE_CHEST_REWARDS) {
      roll -= entry.weight;
      if (roll <= 0) { selected = entry; break; }
    }

    // Calculate random amounts within range
    const coins = Math.floor(Math.random() * (selected.coinRange[1] - selected.coinRange[0] + 1)) + selected.coinRange[0];
    const xp = selected.xpRange[1] > 0
      ? Math.floor(Math.random() * (selected.xpRange[1] - selected.xpRange[0] + 1)) + selected.xpRange[0]
      : 0;

    const reward: TreasureReward = {
      ...selected.reward,
      coins,
      xp,
    };

    // Update inventory with coins + claim date
    const updated: UserInventory = {
      ...inventory,
      coins: inventory.coins + coins,
      lastTreasureChestClaim: today,
    };
    await save(updated);

    return reward;
  }, [inventory, save]);

  return { inventory, loading, coins, buyItem, useItem, equipItem, unequipItem, addCoins, ownsItem, rollGacha, canClaimTreasureChest, claimTreasureChest };
}
