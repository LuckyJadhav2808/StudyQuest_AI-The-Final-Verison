'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  HiShoppingCart, HiSparkles, HiCheck, HiGift, HiStar,
  HiFire, HiLightningBolt, HiColorSwatch, HiVolumeUp,
  HiCursorClick, HiX, HiRefresh, HiCheckCircle
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import PageTransition from '@/components/layout/PageTransition';
import { useShop } from '@/hooks/useShop';
import { SHOP_ITEMS } from '@/lib/constants';
import { ShopItem, ShopCategory } from '@/types';
import { playSuccess, playClick, playCelebration } from '@/lib/sounds';

// Curated chromatic harmonies and rarity bloom luminescence
const RARITY_THEMES: Record<string, {
  border: string;
  badgeBg: string;
  badgeText: string;
  bloom: string;
  cardBg: string;
  particleEmoji: string;
}> = {
  common: {
    border: 'border-[var(--card-border)] hover:border-slate-500/50',
    badgeBg: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
    badgeText: 'Common',
    bloom: '',
    cardBg: 'bg-[var(--card-bg)]',
    particleEmoji: '✨',
  },
  rare: {
    border: 'border-teal/30 hover:border-teal/60',
    badgeBg: 'bg-teal/10 border-teal/30 text-teal',
    badgeText: 'Rare',
    bloom: 'shadow-[0_0_20px_rgba(20,184,166,0.12)]',
    cardBg: 'bg-gradient-to-b from-teal/[0.04] via-[var(--card-bg)] to-[var(--card-bg)]',
    particleEmoji: '💎',
  },
  epic: {
    border: 'border-purple-500/40 hover:border-purple-500/70',
    badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    badgeText: 'Epic',
    bloom: 'shadow-[0_0_25px_rgba(168,85,247,0.18)]',
    cardBg: 'bg-gradient-to-b from-purple-500/[0.06] via-[var(--card-bg)] to-[var(--card-bg)]',
    particleEmoji: '🔮',
  },
  legendary: {
    border: 'border-amber-400/50 hover:border-amber-400',
    badgeBg: 'bg-amber-400/15 border-amber-400/40 text-amber-300',
    badgeText: 'Legendary',
    bloom: 'shadow-[0_0_30px_rgba(245,158,11,0.22)]',
    cardBg: 'bg-gradient-to-b from-amber-400/[0.08] via-amber-400/[0.02] to-[var(--card-bg)]',
    particleEmoji: '👑',
  },
};

const CATEGORIES: { id: string; label: string; emoji: string; icon?: React.ReactNode }[] = [
  { id: 'all', label: 'All Items', emoji: '🛒' },
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
  const [autoEquipAfterBuy, setAutoEquipAfterBuy] = useState(true);

  // 3D Vault Unboxing state machine
  const [vaultStage, setVaultStage] = useState<'idle' | 'opening' | 'revealed'>('idle');
  const [gachaResult, setGachaResult] = useState<ShopItem | null>(null);
  const router = useRouter();

  // Featured Daily Item (Hero Bento)
  const featuredItem = useMemo(() => {
    const legendaryItems = SHOP_ITEMS.filter((i) => i.rarity === 'legendary');
    const epicItems = SHOP_ITEMS.filter((i) => i.rarity === 'epic');
    return legendaryItems[0] || epicItems[0] || SHOP_ITEMS[0];
  }, []);

  // Filtered items & category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SHOP_ITEMS.length };
    SHOP_ITEMS.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, []);

  const filteredItems = useMemo(() => {
    return activeCategory === 'all'
      ? SHOP_ITEMS
      : SHOP_ITEMS.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  // Inventory Quick Stats
  const ownedCount = useMemo(() => {
    const uniqueOwned = new Set(inventory.ownedItems || []);
    return uniqueOwned.size;
  }, [inventory.ownedItems]);

  const ingredientCount = useMemo(() => {
    if (!inventory.ingredients) return 0;
    return Object.values(inventory.ingredients).reduce((acc, qty) => acc + (typeof qty === 'number' ? qty : 0), 0);
  }, [inventory.ingredients]);

  const handleBuy = async (item: ShopItem) => {
    const success = await buyItem(item.id);
    if (success) {
      if (item.rarity === 'legendary' || item.rarity === 'epic') {
        playCelebration();
      } else {
        playSuccess();
      }
      toast.success(`Purchased ${item.emoji} ${item.name}! ✨`);

      // Auto-equip if requested and applicable
      if (autoEquipAfterBuy && item.category !== 'petFood' && item.category !== 'petAccessory') {
        await equipItem(item.id, item.category);
        toast.success(`Equipped ${item.name}!`);
      }
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
      playSuccess();
      toast.success(`Equipped ${item.emoji} ${item.name}! 🌟`);
    }
  };

  // Tactile 3D Gacha Vault Sequence
  const handleOpenVault = async () => {
    if (coins < 50) {
      toast.error('You need 50 Quest Coins to unlock the Mystery Vault!');
      return;
    }
    playClick();
    setVaultStage('opening');
    setGachaResult(null);

    // Vibration & shake suspense stage
    setTimeout(async () => {
      const result = await rollGacha();
      if (result) {
        setGachaResult(result);
        setVaultStage('revealed');
        if (result.rarity === 'legendary') {
          playCelebration();
          toast.success(`🎉 LEGENDARY PULL! You got ${result.emoji} ${result.name}!`, { duration: 5000 });
        } else if (result.rarity === 'epic') {
          playCelebration();
          toast.success(`✨ EPIC PULL! You got ${result.emoji} ${result.name}!`);
        } else {
          playSuccess();
          toast.success(`Unlocked ${result.emoji} ${result.name} (${result.rarity})!`);
        }
      } else {
        setVaultStage('idle');
      }
    }, 1600);
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-5xl inline-block"
            >
              🏪
            </motion.div>
            <p className="text-sm font-heading font-bold text-[var(--muted-foreground)]">
              Opening the Obsidian Vault...
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  const featuredTheme = RARITY_THEMES[featuredItem.rarity] || RARITY_THEMES.legendary;
  const featuredOwned = ownsItem(featuredItem.id);
  const featuredEquipped = inventory.equippedItems[featuredItem.category] === featuredItem.id;

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Balance Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🏪</span>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-[var(--foreground)] tracking-tight">
                Obsidian Luxe Bazaar & Vault
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1 font-medium">
              Transmute your hard-earned Quest Coins into rare cosmetic aura frames, pixel pet treats, sound packs, and enchanted cursors.
            </p>
          </div>

          {/* Glowing Animated Treasury Coin Chip */}
          <motion.div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400/15 via-amber-400/10 to-amber-500/20 border-2 border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex-shrink-0"
            key={coins}
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-2xl"
            >
              🪙
            </motion.span>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-amber-300/80 leading-none">
                Quest Treasury
              </div>
              <div className="text-xl font-heading font-black text-amber-400 leading-tight">
                {coins.toLocaleString()} <span className="text-xs font-semibold text-amber-300/70">Coins</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 2-Column Bento Hero Section: Featured Spotlight & 3D Mystery Vault */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Bento Item 1: Daily Legendary Spotlight (7 cols on lg) */}
          <div className="lg:col-span-7 rounded-3xl p-0.5 bg-gradient-to-br from-amber-400/40 via-purple-500/30 to-teal/30 relative overflow-hidden shadow-xl">
            <div className="bg-[var(--card-bg)] rounded-[22px] p-5 sm:p-6 h-full flex flex-col justify-between relative overflow-hidden">
              {/* Subtle ambient spotlight radial glow */}
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              <div>
                {/* Top Badge & Timer */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400 text-xs font-bold tracking-wide">
                    <HiSparkles size={14} className="animate-spin" />
                    <span>DAILY SPOTLIGHT</span>
                  </div>
                  <Badge variant="amber" size="sm">
                    {featuredItem.rarity.toUpperCase()}
                  </Badge>
                </div>

                {/* Main Hero Card Info */}
                <div className="flex items-center gap-5 sm:gap-6 my-2">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-amber-400/20 via-purple-500/20 to-transparent border-2 border-amber-400/40 flex items-center justify-center text-5xl sm:text-6xl flex-shrink-0 shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                  >
                    {featuredItem.emoji}
                  </motion.div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl font-heading font-black text-[var(--foreground)] tracking-tight">
                      {featuredItem.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1 leading-relaxed">
                      {featuredItem.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--muted)] text-[var(--muted-foreground)]">
                        {featuredItem.category === 'border' ? '🖼️ Profile Border' : featuredItem.category === 'cursor' ? '🪄 Custom Cursor' : '🎀 Pet Relic'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="pt-5 mt-4 border-t border-[var(--card-border)]/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xl font-heading font-black text-amber-400">
                  <span>🪙</span>
                  <span>{featuredItem.price}</span>
                  <span className="text-xs text-[var(--muted-foreground)] font-normal ml-1">Coins</span>
                </div>

                <div>
                  {featuredOwned ? (
                    featuredItem.category === 'petAccessory' ? (
                      <Button
                        variant="teal"
                        size="sm"
                        onClick={() => router.push('/pets')}
                        icon={<HiCheck size={16} />}
                      >
                        Equip in 🐾 Pet
                      </Button>
                    ) : (
                      <Button
                        variant={featuredEquipped ? 'teal' : 'primary'}
                        size="sm"
                        onClick={() => handleEquipToggle(featuredItem)}
                        icon={featuredEquipped ? <HiCheck size={16} /> : <HiSparkles size={16} />}
                      >
                        {featuredEquipped ? 'Equipped' : 'Equip Now'}
                      </Button>
                    )
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={coins < featuredItem.price}
                      onClick={() => setConfirmItem(featuredItem)}
                      icon={<HiShoppingCart size={15} />}
                    >
                      Acquire Spotlight
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bento Item 2: The Gacha Mystery Vault (5 cols on lg) */}
          <div className="lg:col-span-5 rounded-3xl p-0.5 bg-gradient-to-br from-purple-500/40 via-primary/30 to-amber-400/30 shadow-xl">
            <div className="bg-[var(--card-bg)] rounded-[22px] p-5 sm:p-6 h-full flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎁</span>
                  <h3 className="text-lg font-heading font-black text-[var(--foreground)] tracking-tight">
                    Runic Mystery Vault
                  </h3>
                </div>
                <Badge variant="teal" size="sm">50 COINS</Badge>
              </div>

              {/* Vault Stage Container */}
              <div className="flex-1 flex flex-col items-center justify-center text-center py-2 relative">
                {vaultStage === 'idle' && (
                  <div className="space-y-3">
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={handleOpenVault}
                      className="cursor-pointer mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/20 via-primary/25 to-amber-400/20 border-2 border-primary/40 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(124,58,237,0.25)] relative group"
                    >
                      <motion.span
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        🎁
                      </motion.span>
                      <div className="absolute inset-0 rounded-3xl bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </motion.div>

                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] max-w-xs mx-auto">
                        Roll for any collectible cosmetic or treat! Guaranteed rarity drop.
                      </p>
                      {/* Rarity breakdown pills */}
                      <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 font-semibold">Common 50%</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal font-semibold">Rare 30%</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold">Epic 15%</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-semibold">Legendary 5%</span>
                      </div>
                    </div>
                  </div>
                )}

                {vaultStage === 'opening' && (
                  <div className="space-y-3 py-3">
                    {/* Shaking vibration animation */}
                    <motion.div
                      animate={{
                        x: [-4, 4, -4, 4, -2, 2, 0],
                        scale: [1, 1.12, 1, 1.15, 1],
                      }}
                      transition={{ duration: 0.25, repeat: Infinity }}
                      className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400/30 via-purple-500/30 to-primary/30 border-2 border-amber-400 flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(245,158,11,0.4)]"
                    >
                      ✨
                    </motion.div>
                    <p className="text-xs font-heading font-black text-amber-400 tracking-wider uppercase animate-pulse">
                      Unsealing Vault Runes...
                    </p>
                  </div>
                )}

                {vaultStage === 'revealed' && gachaResult && (
                  <motion.div
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                    className="space-y-2.5 py-1"
                  >
                    <div className={`w-20 h-20 mx-auto rounded-2xl border-2 flex items-center justify-center text-5xl ${
                      RARITY_THEMES[gachaResult.rarity]?.border || ''
                    } ${RARITY_THEMES[gachaResult.rarity]?.bloom || ''} bg-gradient-to-b from-primary/15 to-transparent`}>
                      {gachaResult.emoji}
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Badge
                          variant={gachaResult.rarity === 'legendary' ? 'amber' : gachaResult.rarity === 'epic' ? 'coral' : gachaResult.rarity === 'rare' ? 'teal' : 'muted'}
                          size="sm"
                        >
                          {gachaResult.rarity.toUpperCase()}
                        </Badge>
                      </div>
                      <h4 className="text-base font-heading font-black text-[var(--foreground)]">
                        {gachaResult.name}
                      </h4>
                      <p className="text-[11px] text-[var(--muted-foreground)] max-w-xs mx-auto line-clamp-2">
                        {gachaResult.description}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-[var(--card-border)]/60">
                {vaultStage === 'revealed' ? (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVaultStage('idle')}
                      className="flex-1"
                    >
                      Close
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenVault}
                      disabled={coins < 50}
                      className="flex-1"
                      icon={<HiRefresh size={14} />}
                    >
                      Roll Again (50)
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenVault}
                    disabled={coins < 50 || vaultStage === 'opening'}
                    className="w-full"
                    icon={<HiGift size={16} />}
                  >
                    {vaultStage === 'opening' ? 'Opening...' : 'Unlock Vault (🪙 50)'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Inventory Overview Bento Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-xl">
              🪙
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Treasury</div>
              <div className="text-sm font-heading font-black text-amber-400">{coins} Coins</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal/15 border border-teal/30 flex items-center justify-center text-xl">
              🎒
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Collection</div>
              <div className="text-sm font-heading font-black text-teal">
                {ownedCount} / {SHOP_ITEMS.length} items
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-xl">
              ⚡
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Equipped</div>
              <div className="text-sm font-heading font-black text-purple-400">
                {Object.keys(inventory.equippedItems || {}).length} active styles
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-coral/15 border border-coral/30 flex items-center justify-center text-xl">
              🧪
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Satchel</div>
              <div className="text-sm font-heading font-black text-coral">
                {ingredientCount} ingredients
              </div>
            </div>
          </div>
        </div>

        {/* Facet Category Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); playClick(); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-2 flex items-center gap-2 ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-primary/40 text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-heading font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Item Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, i) => {
              const owned = ownsItem(item.id);
              const equipped = inventory.equippedItems[item.category] === item.id;
              const theme = RARITY_THEMES[item.rarity] || RARITY_THEMES.common;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.025 }}
                  className={`rounded-2xl border-2 p-4 transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between ${
                    theme.border
                  } ${theme.bloom} ${theme.cardBg}`}
                >
                  <div>
                    {/* Top Rarity Badge & Category */}
                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                      <span className="text-[10px] text-[var(--muted-foreground)] font-semibold uppercase tracking-wider">
                        {item.category === 'petFood' ? '🍎 Treat' : item.category === 'petAccessory' ? '🎀 Relic' : item.category === 'border' ? '🖼️ Frame' : item.category === 'sound' ? '🎵 Audio' : '🪄 Pointer'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${theme.badgeBg}`}>
                        {theme.badgeText}
                      </span>
                    </div>

                    {/* Centered Emoji Graphic */}
                    <div className="py-3 text-center">
                      <motion.span
                        whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                        className="text-5xl block select-none"
                      >
                        {item.emoji}
                      </motion.span>
                      <h3 className="text-sm font-heading font-black text-[var(--foreground)] mt-2 leading-snug">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-[var(--muted-foreground)] mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-3 pt-3 border-t border-[var(--card-border)]/60">
                    {owned && !item.consumable ? (
                      item.category === 'petAccessory' ? (
                        <button
                          onClick={() => { playClick(); router.push('/pets'); }}
                          className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border-2 border-teal/40 text-teal hover:bg-teal/10 flex items-center justify-center gap-1.5"
                        >
                          <HiCheck size={14} />
                          <span>Equip in 🐾 Pet</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEquipToggle(item)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border-2 flex items-center justify-center gap-1.5 ${
                            equipped
                              ? 'bg-teal text-white border-teal shadow-[0_0_12px_rgba(20,184,166,0.3)]'
                              : 'border-teal/40 text-teal hover:bg-teal/10'
                          }`}
                        >
                          {equipped ? (
                            <>
                              <HiCheckCircle size={15} />
                              <span>Equipped</span>
                            </>
                          ) : (
                            <>
                              <HiSparkles size={14} />
                              <span>Equip</span>
                            </>
                          )}
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => setConfirmItem(item)}
                        disabled={coins < item.price}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-heading font-black transition-all border-2 flex items-center justify-center gap-1.5 ${
                          coins >= item.price
                            ? 'border-amber-400/50 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 hover:border-amber-400 shadow-sm'
                            : 'border-[var(--card-border)] text-[var(--muted-foreground)] opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <span>🪙</span>
                        <span>{item.price} Coins</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty Category State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-[var(--card-border)] bg-[var(--card-bg)]/40">
            <span className="text-4xl block mb-2">🏪</span>
            <h4 className="text-base font-heading font-bold text-[var(--foreground)]">No items in this category</h4>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 mb-4">
              More rare inventory is continuously forged by the guild masters.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setActiveCategory('all')}>
              Show All Items
            </Button>
          </div>
        )}

        {/* Purchase Confirmation Modal */}
        <Modal isOpen={!!confirmItem} onClose={() => setConfirmItem(null)} title="Confirm Acquisition">
          {confirmItem && (
            <div className="text-center space-y-4 pt-1">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-400/20 to-primary/20 border-2 border-amber-400/40 flex items-center justify-center text-5xl shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              >
                {confirmItem.emoji}
              </motion.div>
              <div>
                <h3 className="text-lg font-heading font-black text-[var(--foreground)]">
                  {confirmItem.name}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {confirmItem.description}
                </p>
              </div>

              {/* Price & Balance calculation */}
              <div className="p-3.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted-foreground)]">Price:</span>
                  <span className="font-heading font-black text-amber-400">🪙 {confirmItem.price} coins</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted-foreground)]">Your Balance:</span>
                  <span className="font-semibold text-[var(--foreground)]">🪙 {coins} coins</span>
                </div>
                <div className="border-t border-[var(--card-border)] pt-2 flex items-center justify-between font-bold">
                  <span className="text-[var(--muted-foreground)]">Remaining:</span>
                  <span className={coins >= confirmItem.price ? 'text-teal font-heading font-black' : 'text-coral font-heading font-black'}>
                    🪙 {coins - confirmItem.price} coins
                  </span>
                </div>
              </div>

              {confirmItem.category !== 'petFood' && confirmItem.category !== 'petAccessory' && (
                <label className="flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoEquipAfterBuy}
                    onChange={(e) => setAutoEquipAfterBuy(e.target.checked)}
                    className="rounded border-[var(--card-border)] text-primary focus:ring-primary"
                  />
                  <span>Equip automatically after purchase</span>
                </label>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="ghost" onClick={() => setConfirmItem(null)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleBuy(confirmItem)}
                  disabled={coins < confirmItem.price}
                  className="flex-1"
                  icon={<HiShoppingCart size={15} />}
                >
                  Buy for 🪙 {confirmItem.price}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
}
