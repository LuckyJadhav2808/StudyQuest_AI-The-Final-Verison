'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiSparkles, HiBeaker, HiCheck, HiX, HiLockClosed } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useShop } from '@/hooks/useShop';
import { ALCHEMY_INGREDIENTS, ALCHEMY_RECIPES } from '@/lib/constants';
import { AlchemyRecipe } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageTransition from '@/components/layout/PageTransition';

const RARITY_CONFIG: Record<string, { color: string; badge: 'muted' | 'primary' | 'pink' | 'amber'; glow: string }> = {
  common:    { color: 'text-[var(--muted-foreground)]', badge: 'muted', glow: '' },
  rare:      { color: 'text-blue-400',                 badge: 'primary', glow: 'shadow-[0_0_12px_rgba(99,102,241,0.4)]' },
  epic:      { color: 'text-purple-400',               badge: 'pink', glow: 'shadow-[0_0_16px_rgba(168,85,247,0.5)]' },
  legendary: { color: 'text-amber-400',                badge: 'amber', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.6)]' },
};

function formatTimeLeft(expiresAt: number): string {
  const diff = Math.max(0, expiresAt - Date.now());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function AlchemyContent() {
  const { ingredients, craftItem, activeEffects, coins } = useShop();
  const [confirmRecipe, setConfirmRecipe] = useState<AlchemyRecipe | null>(null);
  const [brewing, setBrewing] = useState(false);
  const [successEmoji, setSuccessEmoji] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [bubbles, setBubbles] = useState<{ width: number; height: number; left: string; duration: string; delay: string; opacity: number }[]>([]);

  // Generate bubble parameters only on client mount to avoid hydration mismatch
  useEffect(() => {
    const generated = Array.from({ length: 8 }, (_, i) => ({
      width: 6 + Math.random() * 8,
      height: 6 + Math.random() * 8,
      left: `${10 + Math.random() * 80}%`,
      duration: `${3 + Math.random() * 4}s`,
      delay: `${i * 0.7}s`,
      opacity: 0.15 + Math.random() * 0.2,
    }));
    setBubbles(generated);
  }, []);

  // Tick every 1s to refresh countdowns live
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const canCraft = (recipe: AlchemyRecipe) =>
    Object.entries(recipe.ingredients).every(([id, qty]) => (ingredients[id] || 0) >= qty);

  const handleCraft = async () => {
    if (!confirmRecipe) return;
    setBrewing(true);
    await new Promise(r => setTimeout(r, 1600)); // brew animation duration
    const ok = await craftItem(confirmRecipe.id);
    setBrewing(false);
    if (ok) {
      setSuccessEmoji(confirmRecipe.emoji);
      toast.success(`Crafted ${confirmRecipe.name}!`, { icon: confirmRecipe.emoji });
      setTimeout(() => setSuccessEmoji(null), 2200);
    } else {
      toast.error('Crafting failed — missing ingredients');
    }
    setConfirmRecipe(null);
  };

  return (
    <PageTransition>
      {/* inject bubble keyframe */}
      <style>{`@keyframes alch-bubble{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-120px) scale(0.4);opacity:0}}`}</style>

      {/* ── Header ── */}
      <div className="relative mb-8 overflow-hidden rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1), rgba(14,165,233,0.08))' }}>
        {bubbles.map((bubble, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: bubble.width,
              height: bubble.height,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(168,85,247,${bubble.opacity}), transparent)`,
              left: bubble.left,
              bottom: -10,
              animation: `alch-bubble ${bubble.duration} ease-in infinite ${bubble.delay}`,
            }}
          />
        ))}
        <div className="relative z-10">
          <h1 className="text-3xl font-heading font-bold text-[var(--foreground)] flex items-center gap-3">
            🧪 Alchemist Lab <HiBeaker className="text-purple-400" />
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1">Combine rare ingredients to brew powerful elixirs and scrolls.</p>
        </div>
      </div>

      {/* ── Ingredient Inventory ── */}
      <Card className="mb-6" hover={false}>
        <h2 className="text-lg font-heading font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
          <HiSparkles className="text-amber-400" /> Your Ingredients
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {ALCHEMY_INGREDIENTS.map(ing => {
            const qty = ingredients[ing.id] || 0;
            const empty = qty === 0;
            return (
              <motion.div
                key={ing.id}
                whileHover={{ scale: 1.06 }}
                className={`flex flex-col items-center gap-1 rounded-xl p-3 border transition-colors ${empty ? 'opacity-40 border-[var(--card-border)]' : 'border-purple-500/30 bg-purple-500/5'}`}
                title={ing.description}
              >
                <span className="text-2xl">{ing.emoji}</span>
                <span className="text-[11px] font-semibold text-[var(--foreground)] text-center leading-tight">{ing.name}</span>
                <Badge variant={empty ? 'muted' : RARITY_CONFIG[ing.rarity].badge} size="sm">×{qty}</Badge>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* ── Active Effects ── */}
      {activeEffects.length > 0 && (
        <Card className="mb-6" hover={false}>
          <h2 className="text-lg font-heading font-bold text-[var(--foreground)] mb-3">⚡ Active Buffs</h2>
          <div className="flex flex-wrap gap-2">
            {activeEffects.map((eff, i) => {
              const recipe = ALCHEMY_RECIPES.find(r => r.id === eff.recipeId);
              if (!recipe) return null;
              return (
                <motion.div key={i} animate={{ boxShadow: ['0 0 8px rgba(168,85,247,0.3)', '0 0 18px rgba(168,85,247,0.6)', '0 0 8px rgba(168,85,247,0.3)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-2 rounded-full px-4 py-1.5 bg-purple-500/10 border border-purple-500/30"
                >
                  <span>{recipe.emoji}</span>
                  <span className="text-sm font-semibold text-[var(--foreground)]">{recipe.effectDescription}</span>
                  <Badge variant="pink" size="sm">{formatTimeLeft(eff.expiresAt)}</Badge>
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Recipe Grid ── */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ALCHEMY_RECIPES.map((recipe, idx) => {
          const craftable = canCraft(recipe);
          const rc = RARITY_CONFIG[recipe.rarity];
          return (
            <motion.div key={recipe.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
              <Card className={`h-full flex flex-col ${rc.glow}`} hover>
                {/* header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{recipe.emoji}</span>
                    <div>
                      <h3 className={`font-heading font-bold ${rc.color}`}>{recipe.name}</h3>
                      <Badge variant={rc.badge} size="sm">{recipe.rarity}</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mb-3">{recipe.description}</p>

                {/* ingredients needed */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Object.entries(recipe.ingredients).map(([ingId, qty]) => {
                    const ing = ALCHEMY_INGREDIENTS.find(a => a.id === ingId);
                    if (!ing) return null;
                    const have = ingredients[ingId] || 0;
                    const enough = have >= qty;
                    return (
                      <span key={ingId} className={`inline-flex items-center gap-1 text-xs font-semibold rounded-md px-2 py-0.5 border ${enough ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-red-500/40 bg-red-500/10 text-red-400'}`}>
                        {ing.emoji} {have}/{qty}
                      </span>
                    );
                  })}
                </div>

                {/* effect */}
                <p className="text-xs text-teal font-semibold mb-4 flex items-center gap-1">
                  <HiSparkles /> {recipe.effectDescription}
                </p>

                {/* craft button */}
                <div className="mt-auto">
                  <Button
                    variant={craftable ? 'primary' : 'ghost'}
                    size="sm"
                    fullWidth
                    disabled={!craftable}
                    icon={craftable ? <HiBeaker /> : <HiLockClosed />}
                    onClick={() => setConfirmRecipe(recipe)}
                  >
                    {craftable ? 'Brew' : 'Need Ingredients'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ── Confirmation Modal ── */}
      <AnimatePresence>
        {confirmRecipe && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !brewing && setConfirmRecipe(null)} />
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--card-border)] p-6"
              style={{ background: 'var(--card-bg)' }}
            >
              {brewing ? (
                /* Brewing animation */
                <div className="flex flex-col items-center gap-4 py-6">
                  <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-6xl"
                  >🧪</motion.div>
                  <motion.div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.span key={i} className="w-3 h-3 rounded-full bg-purple-400"
                        animate={{ y: [0, -12, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </motion.div>
                  <p className="text-[var(--foreground)] font-heading font-bold">Brewing…</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-heading font-bold text-[var(--foreground)] mb-1 flex items-center gap-2">
                    {confirmRecipe.emoji} Brew {confirmRecipe.name}?
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">This will consume:</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {Object.entries(confirmRecipe.ingredients).map(([ingId, qty]) => {
                      const ing = ALCHEMY_INGREDIENTS.find(a => a.id === ingId);
                      return ing ? (
                        <span key={ingId} className="inline-flex items-center gap-1 text-sm font-semibold rounded-lg px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-[var(--foreground)]">
                          {ing.emoji} {ing.name} ×{qty}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" size="md" fullWidth icon={<HiX />} onClick={() => setConfirmRecipe(null)}>Cancel</Button>
                    <Button variant="primary" size="md" fullWidth icon={<HiCheck />} onClick={handleCraft}>Brew!</Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success Celebration ── */}
      <AnimatePresence>
        {successEmoji && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {/* particle ring */}
            {[...Array(10)].map((_, i) => {
              const angle = (i / 10) * Math.PI * 2;
              return (
                <motion.span key={i} className="absolute text-xl"
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{ x: Math.cos(angle) * 120, y: Math.sin(angle) * 120, opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                >✨</motion.span>
              );
            })}
            <motion.span
              className="text-7xl drop-shadow-[0_0_30px_rgba(168,85,247,0.8)]"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.3, 1], rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'backOut' }}
            >{successEmoji}</motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
