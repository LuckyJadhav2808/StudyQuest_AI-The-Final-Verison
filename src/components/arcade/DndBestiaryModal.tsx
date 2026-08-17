'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiSearch, HiX, HiShieldCheck, HiHeart, HiLightningBolt, HiFilter, HiSparkles } from 'react-icons/hi';
import { DndMonster, DND_MONSTERS } from '@/data/dndMonstersDataset';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface DndBestiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChallengeMonster?: (monster: DndMonster) => void;
}

const MONSTER_TYPES = [
  'All',
  'dragon',
  'undead',
  'aberration',
  'fiend',
  'beast',
  'elemental',
  'monstrosity',
  'humanoid',
  'construct',
  'giant',
  'fey',
  'celestial',
];

export default function DndBestiaryModal({ isOpen, onClose, onChallengeMonster }: DndBestiaryModalProps) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedMonster, setSelectedMonster] = useState<DndMonster | null>(null);

  const filteredMonsters = useMemo(() => {
    return DND_MONSTERS.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesType = m.type.toLowerCase().includes(q);
        if (!matchesName && !matchesType) return false;
      }
      if (selectedType !== 'All' && !m.type.toLowerCase().includes(selectedType.toLowerCase())) {
        return false;
      }
      if (selectedTier !== 'all' && m.tier !== selectedTier) {
        return false;
      }
      return true;
    });
  }, [search, selectedType, selectedTier]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🐉 D&D Monster Bestiary & Compendium" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Header Intro */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-red-500/10 to-purple-500/10 border border-amber-500/20">
          <div>
            <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
              <HiSparkles /> 762 Mythical Creatures & Bosses
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Browse monster stats, challenge ratings, and challenge them in Dungeon Trivia Battles!
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-900/80 border border-amber-500/30 text-amber-400 self-start sm:self-auto">
            {filteredMonsters.length} / {DND_MONSTERS.length} Creatures
          </span>
        </div>

        {/* Search & Filters Toolbar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by creature name or type (e.g. Dragon, Lich, Beholder)..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <HiX size={14} />
                </button>
              )}
            </div>

            {/* Tier Filter */}
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Tiers</option>
              <option value="minion">🟢 Minion (CR 0–2)</option>
              <option value="elite">🔵 Elite (CR 3–8)</option>
              <option value="boss">🟣 Boss (CR 9–18)</option>
              <option value="mythic">👑 Mythic (CR 19–30)</option>
            </select>
          </div>

          {/* Type Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 flex-shrink-0">
              <HiFilter size={12} /> Types:
            </span>
            {MONSTER_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer capitalize ${
                  selectedType === t
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Monster Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1">
          {filteredMonsters.slice(0, 90).map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedMonster(m)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                selectedMonster?.id === m.id
                  ? 'bg-amber-500/15 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl flex-shrink-0">{m.emoji}</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-100 truncate">{m.name}</h4>
                    <p className="text-[10px] text-slate-400 capitalize truncate">{m.type} • {m.size}</p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-lg border flex-shrink-0 ${
                    m.tier === 'mythic'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : m.tier === 'boss'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : m.tier === 'elite'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  CR {m.crDisplay}
                </span>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800/60 text-[10px] text-slate-300 text-center">
                <div className="flex items-center justify-center gap-1 bg-slate-950/40 py-1 rounded-md">
                  <HiHeart className="text-red-400 text-xs" />
                  <span>{m.hp} HP</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-slate-950/40 py-1 rounded-md">
                  <HiShieldCheck className="text-blue-400 text-xs" />
                  <span>{m.ac} AC</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-slate-950/40 py-1 rounded-md">
                  <HiLightningBolt className="text-amber-400 text-xs" />
                  <span>{m.attack} ATK</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMonsters.length > 90 && (
          <p className="text-[11px] text-center text-slate-500">
            Showing top 90 matching creatures. Use search or filters to narrow down.
          </p>
        )}

        {/* Selected Monster Detail Drawer / Action */}
        <AnimatePresence>
          {selectedMonster && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedMonster.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-100">{selectedMonster.name}</h4>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Tier: {selectedMonster.tier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    STR: {selectedMonster.str} | DEX: {selectedMonster.dex} | CON: {selectedMonster.con} | INT: {selectedMonster.int} | WIS: {selectedMonster.wis} | CHA: {selectedMonster.cha}
                  </p>
                  <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                    🎁 Victory Loot: +{selectedMonster.xpReward} XP & +{selectedMonster.coinReward} Coins
                  </p>
                </div>
              </div>

              {onChallengeMonster && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onChallengeMonster(selectedMonster);
                    onClose();
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 flex-shrink-0"
                >
                  ⚔️ Challenge This Boss
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
