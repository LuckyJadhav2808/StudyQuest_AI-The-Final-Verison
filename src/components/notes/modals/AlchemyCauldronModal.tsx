'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface AlchemyCauldronModalProps {
  isOpen: boolean;
  onClose: () => void;
  mana: number;
  brewingRecipe: 'scroll' | 'cards' | null;
  brewCountdown: number;
  onStartBrewing: (recipe: 'scroll' | 'cards') => void;
}

export default function AlchemyCauldronModal({
  isOpen,
  onClose,
  mana,
  brewingRecipe,
  brewCountdown,
  onStartBrewing,
}: AlchemyCauldronModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!brewingRecipe) onClose();
      }}
      title="🧪 Alchemy Cauldron"
    >
      <div className="space-y-5 text-left">
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Transmute your current study note into magical study guides. Drop your note into the bubbling pot!
        </p>

        {/* Brewing Cauldron Animation */}
        <div className="relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-[var(--card-border)] bg-slate-950 overflow-hidden min-h-[160px]">
          <style>{`
            @keyframes cauldron-bubble {
              0% { transform: translateY(10px) scale(0.6); opacity: 0; }
              50% { opacity: 0.8; }
              100% { transform: translateY(-70px) scale(1.2); opacity: 0; }
            }
          `}</style>

          {/* Bubbles */}
          {brewingRecipe && (
            <>
              <div
                className="absolute w-3 h-3 bg-purple-500 rounded-full blur-[1px]"
                style={{ left: '42%', bottom: '50px', animation: 'cauldron-bubble 1.5s infinite ease-out' }}
              />
              <div
                className="absolute w-2 h-2 bg-indigo-400 rounded-full blur-[1px]"
                style={{ left: '50%', bottom: '45px', animation: 'cauldron-bubble 1.2s infinite ease-out 0.3s' }}
              />
              <div
                className="absolute w-4 h-4 bg-purple-400 rounded-full blur-[1px]"
                style={{ left: '55%', bottom: '52px', animation: 'cauldron-bubble 1.8s infinite ease-out 0.6s' }}
              />
              <div
                className="absolute w-2.5 h-2.5 bg-pink-500 rounded-full blur-[1px]"
                style={{ left: '47%', bottom: '48px', animation: 'cauldron-bubble 1.4s infinite ease-out 0.9s' }}
              />
            </>
          )}

          {/* Cauldron body */}
          <motion.div
            animate={brewingRecipe ? { y: [0, -4, 0], scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-6xl z-10 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          >
            {brewingRecipe ? '🧙‍♂️' : '🧪'}
          </motion.div>

          <div className="mt-4 text-center z-10">
            {brewingRecipe ? (
              <>
                <h4 className="text-sm font-heading font-bold text-purple-400 animate-pulse">
                  Brewing Recipe: {brewingRecipe === 'scroll' ? 'Mastery Scroll' : 'Flashcards'}...
                </h4>
                <p className="text-[10px] text-slate-400 mt-1">
                  Stirring ingredients... Manifesting in {brewCountdown}s
                </p>
              </>
            ) : (
              <>
                <h4 className="text-xs font-heading font-bold text-slate-400">Cauldron is ready</h4>
                <p className="text-[10px] text-slate-500 mt-1">
                  Select a transmutation recipe below. Current Mana: {mana}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Recipes Selector */}
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block">
            Transmutation Recipes
          </label>

          {/* Recipe 1: Mastery Scroll */}
          <button
            type="button"
            disabled={!!brewingRecipe || mana < 50}
            onClick={() => onStartBrewing('scroll')}
            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
              mana >= 50 && !brewingRecipe
                ? 'border-purple-500/30 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10'
                : 'border-[var(--card-border)] opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📜</span>
              <div className="text-left">
                <h5 className="text-xs font-bold text-[var(--foreground)]">Mastery Scroll (AI Revision)</h5>
                <p className="text-[9px] text-[var(--muted-foreground)]">
                  Transmute note summary into a formatted cheatsheet.
                </p>
              </div>
            </div>
            <Badge variant="pink">Costs 50 Mana</Badge>
          </button>

          {/* Recipe 2: Flashcards */}
          <button
            type="button"
            disabled={!!brewingRecipe || mana < 30}
            onClick={() => onStartBrewing('cards')}
            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
              mana >= 30 && !brewingRecipe
                ? 'border-teal-500/30 hover:border-teal-500 bg-teal-500/5 hover:bg-teal-500/10'
                : 'border-[var(--card-border)] opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🃏</span>
              <div className="text-left">
                <h5 className="text-xs font-bold text-[var(--foreground)]">Study Flashcard Deck</h5>
                <p className="text-[9px] text-[var(--muted-foreground)]">
                  Brew active recall flashcards directly from key concepts.
                </p>
              </div>
            </div>
            <Badge variant="teal">Costs 30 Mana</Badge>
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={!!brewingRecipe}
            className="flex-1"
          >
            Close Cauldron
          </Button>
        </div>
      </div>
    </Modal>
  );
}
