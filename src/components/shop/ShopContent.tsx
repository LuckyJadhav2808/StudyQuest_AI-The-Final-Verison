'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { HiShoppingCart, HiSparkles, HiCheck, HiGift, HiStar } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import PageTransition from '@/components/layout/PageTransition';
import { useShop } from '@/hooks/useShop';
import { SHOP_ITEMS } from '@/lib/constants';
import { ShopItem, ShopCategory } from '@/types';
import { playSuccess, playClick } from '@/lib/sounds';

const RARITY_STYLES: Record<string, string> = {
  common: 'border-[var(--card-border)] text-[var(--muted-foreground)]',
  rare: 'border-primary/40 text-primary bg-primary/5',
  epic: 'border-purple-500/40 text-purple-400 bg-purple-500/5',
  legendary: 'border-amber-400/40 text-amber-400 bg-amber-400/5 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
};

const RARITY_BADGE: Record<string, 'muted' | 'primary' | 'coral' | 'amber'> = {
  common: 'muted', rare: 'primary', epic: 'coral', legendary: 'amber',
};

const CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '🛒' },
  { id: 'petFood', label: 'Pet Food', emoji: '🍎' },
  { id: 'petAccessory', label: 'Accessories', emoji: '🎀' },
  { id: 'border', label: 'Borders', emoji: '💎' },
  { id: 'sound', label: 'Sounds', emoji: '🎵' },
  { id: 'cursor', label: 'Cursors', emoji: '🪄' },
];

export default function ShopContent() {
  const { coins, buyItem, ownsItem, equipItem, unequipItem, inventory, rollGacha, loading } = useShop();
  const [activeCategory, setActiveCategory] = useState('all');
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [gachaResult, setGachaResult] = useState<ShopItem | null>(null);
  const [gachaSpinning, setGachaSpinning] = useState(false);
  const router = useRouter();

  const filteredItems = activeCategory === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter((item) => item.category === activeCategory);

  const handleBuy = async (item: ShopItem) => {
    const success = await buyItem(item.id);
    if (success) {
      playSuccess();
      toast.success(`Purchased ${item.emoji} ${item.name}!`);
      setConfirmItem(null);
    } else {
      toast.error('Not enough coins!');
    }
  };

  const handleEquipToggle = async (item: ShopItem) => {
    playClick();
    const equipped = inventory.equippedItems[item.category];
    if (equipped === item.id) {
      await unequipItem(item.category);
      toast.success(`Unequipped ${item.name}`);
    } else {
      await equipItem(item.id, item.category);
      toast.success(`Equipped ${item.emoji} ${item.name}!`);
    }
  };

  const handleGacha = async () => {
    if (coins < 50) { toast.error('Need 50 coins for Mystery Box!'); return; }
    setGachaSpinning(true);
    setGachaResult(null);
    setTimeout(async () => {
      const result = await rollGacha();
      setGachaSpinning(false);
      if (result) {
        setGachaResult(result);
        playSuccess();
        toast.success(`You got ${result.emoji} ${result.name}! (${result.rarity})`);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-4xl mb-3 animate-bounce">🏪</p>
            <p className="text-sm text-[var(--muted-foreground)]">Loading shop...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">🏪 Item Shop</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Spend your Quest Coins on cosmetics, pet items, and more!</p>
          </div>
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-400/10 border-2 border-amber-400/30"
            key={coins}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <span className="text-xl">🪙</span>
            <span className="text-lg font-heading font-black text-amber-400">{coins}</span>
          </motion.div>
        </div>

        {/* Gacha Section */}
        <Card padding="lg" hover={false}>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <motion.button
              onClick={handleGacha}
              disabled={gachaSpinning || coins < 50}
              className="flex-shrink-0 w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 via-primary/20 to-amber-400/20 border-2 border-primary/30 flex items-center justify-center text-4xl relative overflow-hidden disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span animate={gachaSpinning ? { rotate: 360, scale: [1, 1.3, 1] } : {}} transition={gachaSpinning ? { duration: 1.5, repeat: Infinity } : {}}>
                {gachaSpinning ? '✨' : '🎁'}
              </motion.span>
            </motion.button>
            <div className="flex-1">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                <HiGift className="text-primary" /> Mystery Box
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Roll for a random cosmetic item! Common 50%, Rare 30%, Epic 15%, Legendary 5%</p>
              <p className="text-sm font-bold mt-2 text-amber-400">🪙 50 coins</p>
            </div>
            <AnimatePresence>
              {gachaResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30"
                >
                  <span className="text-3xl">{gachaResult.emoji}</span>
                  <span className="text-xs font-bold">{gachaResult.name}</span>
                  <Badge variant={RARITY_BADGE[gachaResult.rarity]} size="sm">{gachaResult.rarity}</Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); playClick(); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-2 ${
                activeCategory === cat.id
                  ? 'bg-primary text-white border-primary'
                  : 'border-[var(--card-border)] hover:border-primary/30 text-[var(--muted-foreground)]'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Item Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, i) => {
              const owned = ownsItem(item.id);
              const equipped = inventory.equippedItems[item.category] === item.id;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-2xl border-2 p-4 transition-all hover:shadow-lg ${RARITY_STYLES[item.rarity]} bg-[var(--card-bg)]`}
                >
                  <div className="text-center">
                    <span className="text-4xl block mb-2">{item.emoji}</span>
                    <h4 className="text-sm font-heading font-bold">{item.name}</h4>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Badge variant={RARITY_BADGE[item.rarity]} size="sm">{item.rarity}</Badge>
                    </div>
                    <div className="mt-3">
                      {owned && !item.consumable ? (
                        item.category === 'petAccessory' ? (
                          /* Pet accessories equip on the Pet page, not here */
                          <button
                            onClick={() => { playClick(); router.push('/pets'); }}
                            className="w-full px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 border-teal/30 text-teal hover:bg-teal/10"
                          >
                            <HiCheck className="inline mr-1" /> Owned — Equip in 🐾 Pet
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquipToggle(item)}
                            className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                              equipped
                                ? 'bg-teal text-white border-teal'
                                : 'border-teal/30 text-teal hover:bg-teal/10'
                            }`}
                          >
                            {equipped ? <><HiCheck className="inline mr-1" /> Equipped</> : 'Equip'}
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => setConfirmItem(item)}
                          disabled={coins < item.price}
                          className="w-full px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          🪙 {item.price}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏪</p>
            <p className="text-sm text-[var(--muted-foreground)]">No items in this category yet!</p>
          </div>
        )}

        {/* Purchase Modal */}
        <Modal isOpen={!!confirmItem} onClose={() => setConfirmItem(null)} title="Confirm Purchase">
          {confirmItem && (
            <div className="text-center space-y-4">
              <span className="text-6xl block">{confirmItem.emoji}</span>
              <h3 className="text-lg font-heading font-bold">{confirmItem.name}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{confirmItem.description}</p>
              <div className="flex items-center justify-center gap-2 text-xl font-bold text-amber-400">
                <span>🪙</span> {confirmItem.price} coins
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">Your balance: 🪙 {coins}</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setConfirmItem(null)} className="flex-1">Cancel</Button>
                <Button
                  variant="primary"
                  onClick={() => handleBuy(confirmItem)}
                  disabled={coins < confirmItem.price}
                  className="flex-1"
                  icon={<HiShoppingCart size={14} />}
                >
                  Buy Now
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
}
