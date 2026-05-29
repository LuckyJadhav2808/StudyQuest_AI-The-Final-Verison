import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToDocument, setDocument, updateDocument } from '@/lib/firestore';
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

  // ── Ref to always hold the latest inventory (prevents stale closures) ──
  const inventoryRef = useRef<UserInventory>(DEFAULT_INVENTORY);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const ref = doc(db, 'users', user.uid, 'data', 'inventory');
    const unsub = subscribeToDocument<UserInventory>(ref, (data) => {
      const inv = data || DEFAULT_INVENTORY;
      setInventory(inv);
      inventoryRef.current = inv;
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  // ── Get Firestore ref (stable, only depends on uid) ──
  const getRef = useCallback(() => {
    if (!user?.uid) return null;
    return doc(db, 'users', user.uid, 'data', 'inventory');
  }, [user?.uid]);

  const coins = inventory.coins;

  const ownsItem = useCallback((itemId: string) => {
    return inventoryRef.current.ownedItems.includes(itemId);
  }, []); // No dependency on inventory — reads from ref

  // ── ADD COINS — uses Firestore increment() to avoid race conditions ──
  const addCoins = useCallback(async (amount: number) => {
    const ref = getRef();
    if (!ref) return;
    await updateDocument(ref, { coins: increment(amount) });
  }, [getRef]);

  // ── BUY ITEM ──
  const buyItem = useCallback(async (itemId: string): Promise<boolean> => {
    const ref = getRef();
    if (!ref) return false;
    const current = inventoryRef.current;
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return false;
    if (current.coins < item.price) return false;
    if (!item.consumable && current.ownedItems.includes(itemId)) return false;

    const updated: UserInventory = {
      ...current,
      coins: current.coins - item.price,
      ownedItems: [...current.ownedItems, itemId],
    };
    inventoryRef.current = updated; // optimistic update
    await setDocument(ref, updated);
    return true;
  }, [getRef]);

  // ── USE (consume) ITEM ──
  const useItem = useCallback(async (itemId: string) => {
    const ref = getRef();
    if (!ref) return;
    const current = inventoryRef.current;
    const idx = current.ownedItems.indexOf(itemId);
    if (idx === -1) return;
    const newOwned = [...current.ownedItems];
    newOwned.splice(idx, 1);
    const updated = { ...current, ownedItems: newOwned };
    inventoryRef.current = updated;
    await setDocument(ref, updated);
  }, [getRef]);

  // ── EQUIP ──
  const equipItem = useCallback(async (itemId: string, category: string) => {
    const ref = getRef();
    if (!ref) return;
    const current = inventoryRef.current;
    const updated = {
      ...current,
      equippedItems: { ...current.equippedItems, [category]: itemId },
    };
    inventoryRef.current = updated;
    await setDocument(ref, updated);
  }, [getRef]);

  // ── UNEQUIP ──
  const unequipItem = useCallback(async (category: string) => {
    const ref = getRef();
    if (!ref) return;
    const current = inventoryRef.current;
    const eq = { ...current.equippedItems };
    delete eq[category];
    const updated = { ...current, equippedItems: eq };
    inventoryRef.current = updated;
    await setDocument(ref, updated);
  }, [getRef]);

  // ── GACHA ROLL ──
  const rollGacha = useCallback(async (): Promise<ShopItem | null> => {
    const ref = getRef();
    if (!ref) return null;
    const current = inventoryRef.current;
    if (current.coins < GACHA_COST) return null;
    const rarity = weightedRandom();
    const pool = SHOP_ITEMS.filter((i) => i.rarity === rarity && !i.consumable);
    if (pool.length === 0) return null;
    const item = pool[Math.floor(Math.random() * pool.length)];
    const updated: UserInventory = {
      ...current,
      coins: current.coins - GACHA_COST,
      ownedItems: [...current.ownedItems, item.id],
      gachaHistory: [item.id, ...(current.gachaHistory || [])].slice(0, 10),
    };
    inventoryRef.current = updated;
    await setDocument(ref, updated);
    return item;
  }, [getRef]);

  // ── Daily Treasure Chest ──
  const canClaimTreasureChest = useCallback((): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return inventoryRef.current.lastTreasureChestClaim !== today;
  }, []);

  const claimTreasureChest = useCallback(async (): Promise<TreasureReward | null> => {
    const ref = getRef();
    if (!ref) return null;
    const current = inventoryRef.current;
    const today = new Date().toISOString().split('T')[0];
    if (current.lastTreasureChestClaim === today) return null;

    // Roll weighted random reward
    const totalWeight = TREASURE_CHEST_REWARDS.reduce((sum, r) => sum + r.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected = TREASURE_CHEST_REWARDS[0];
    for (const entry of TREASURE_CHEST_REWARDS) {
      roll -= entry.weight;
      if (roll <= 0) { selected = entry; break; }
    }

    // Calculate random amounts within range
    const rewardCoins = Math.floor(Math.random() * (selected.coinRange[1] - selected.coinRange[0] + 1)) + selected.coinRange[0];
    const xp = selected.xpRange[1] > 0
      ? Math.floor(Math.random() * (selected.xpRange[1] - selected.xpRange[0] + 1)) + selected.xpRange[0]
      : 0;

    const reward: TreasureReward = {
      ...selected.reward,
      coins: rewardCoins,
      xp,
    };

    // Use increment for coins to prevent race conditions
    await updateDocument(ref, {
      coins: increment(rewardCoins),
      lastTreasureChestClaim: today,
    });

    return reward;
  }, [getRef]);

  return { inventory, loading, coins, buyItem, useItem, equipItem, unequipItem, addCoins, ownsItem, rollGacha, canClaimTreasureChest, claimTreasureChest };
}
