'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Plus, SquarePen } from 'lucide-react';
import { Btn, Chip, Panel, PanelHeader } from './ui';
import { useNotes } from '@/hooks/useNotes';
import { playClick } from '@/lib/sounds';

const BENCHMARK_CARDS = [
  { id: 'deck-1', tag: 'AI', score: '10/10', title: 'AI Unit Test QB', sub: 'Scroll Vault', grad: 'from-[#4c2d9e] via-[#351a75] to-[#140b30]' },
  { id: 'deck-2', tag: 'GENERAL', score: '10/13', title: 'Thermodynamics Sheet', sub: 'Physics · Ch.6', grad: 'from-[#125868] via-[#0c404d] to-[#052026]' },
  { id: 'deck-3', tag: 'CHEM', score: '9/12', title: 'Organic Reactions Map', sub: 'Reaction Lab', grad: 'from-[#6e1534] via-[#4d0c23] to-[#260511]' },
];

export function NotesDeck() {
  const router = useRouter();
  const { notes } = useNotes();
  const [hover, setHover] = useState(false);
  const [cards, setCards] = useState(BENCHMARK_CARDS);

  // If real notes exist, blend them into the cards while preserving the benchmark look
  const visibleCards = React.useMemo(() => {
    if (!notes || notes.length === 0) return cards;
    return cards.map((c, i) => {
      const real = notes[i];
      if (!real) return c;
      return {
        ...c,
        title: real.title || c.title,
        tag: real.folder || c.tag,
        sub: new Date(real.updatedAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      };
    });
  }, [notes, cards]);

  const handlePick = (index: number) => {
    playClick();
    if (index === 0) {
      router.push('/notes');
      return;
    }
    setCards((prev) => {
      const copy = [...prev];
      const [picked] = copy.splice(index, 1);
      return [picked, ...copy];
    });
  };

  return (
    <Panel area="notes" tone="plasma" delay={420} className="gap-2 sm:gap-2.5 justify-between h-full">
      <PanelHeader
        icon={SquarePen}
        tone="plasma"
        title="Top 3 Notes"
        sub="Diagonally stacked deck"
        right={
          <button
            onClick={() => router.push('/notes')}
            aria-label="Add note"
            className="btn tone-plasma !h-8 !w-8 !rounded-full !p-0 shadow-md cursor-pointer"
            title="Create Note"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        }
      />

      {/* 3D Diagonally Stacked Holographic Deck matching Image 2 */}
      <div
        className="relative min-h-[145px] sm:min-h-[165px] flex-1 overflow-hidden"
        style={{ perspective: 900 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {[...visibleCards].reverse().map((item, ri) => {
          const i = visibleCards.length - 1 - ri; // 0 = front card
          const spread = hover ? 1.25 : 1;
          const y = -i * 42 * spread;
          const rot = -i * (hover ? 4.5 : 3.2);
          const x = i * (hover ? 10 : 5);
          const front = i === 0;

          return (
            <button
              key={item.id}
              onClick={() => handlePick(i)}
              className={`absolute inset-x-1 bottom-1 flex h-[min(48%,145px)] min-h-[105px] flex-col justify-between overflow-hidden rounded-[20px] border bg-gradient-to-br p-3.5 text-left transition-all ${
                item.grad
              } ${
                front
                  ? 'cursor-pointer border-white/30 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.4)]'
                  : 'cursor-pointer border-white/15 hover:border-white/35'
              }`}
              style={{
                transform: `translate3d(${x}px, ${y}px, ${-i * 35}px) rotateX(14deg) rotateZ(${rot}deg) scale(${
                  1 - i * 0.05
                })`,
                transformOrigin: '50% 100%',
                transition: 'transform .55s cubic-bezier(.2,.9,.25,1.1), filter .3s, border-color .2s',
                filter: front ? 'none' : `brightness(${1 - i * 0.15})`,
                zIndex: 10 - i,
                backgroundColor: '#07091B',
              }}
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.24),transparent_55%)]" />

              <div className="relative flex items-center justify-between">
                <span className="rounded-md border border-white/20 bg-black/45 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase font-mono">
                  {item.tag}
                </span>
                <span className="text-[10px] font-mono font-bold text-white/80">{item.score}</span>
              </div>

              <div className="relative">
                <div className="font-heading text-xs sm:text-sm font-bold text-white drop-shadow leading-tight truncate">
                  {item.title}
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] font-semibold text-white/70">
                  <span>{item.sub}</span>
                  {front && <ArrowUpRight size={14} className="text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-white/8 pt-2">
        <Chip tone="plasma">{notes.length > 0 ? `${notes.length} SCROLLS AVAILABLE` : '6 SCROLLS AVAILABLE'}</Chip>
        <Btn
          tone="plasma"
          onClick={() => router.push('/notes')}
          className="!px-3 !py-1 text-xs whitespace-nowrap"
        >
          <span>View All</span>
          <ArrowUpRight size={13} strokeWidth={3} />
        </Btn>
      </footer>
    </Panel>
  );
}
