'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Plus, SquarePen } from 'lucide-react';
import { Btn, Chip, Panel, PanelHeader } from './ui';
import { useNotes } from '@/hooks/useNotes';
import { playClick } from '@/lib/sounds';

const BENCHMARK_CARDS = [
  { id: 'deck-1', tag: 'AI', score: '10/10', title: 'AI Unit Test QB', sub: 'Scroll Vault', grad: 'from-[#5b21b6] via-[#4338ca] to-[#1e1b4b]' },
  { id: 'deck-2', tag: 'GENERAL', score: '10/13', title: 'Thermodynamics Sheet', sub: 'Physics · Ch.6', grad: 'from-[#0d9488] via-[#0f766e] to-[#115e59]' },
  { id: 'deck-3', tag: 'CHEM', score: '9/12', title: 'Organic Reactions Map', sub: 'Reaction Lab', grad: 'from-[#b91c1c] via-[#991b1b] to-[#7f1d1d]' },
];

export function NotesDeck() {
  const router = useRouter();
  const { notes } = useNotes();
  const [hover, setHover] = useState(false);
  const [cards, setCards] = useState(BENCHMARK_CARDS);

  // Blend real notes if meaningful, while preserving the benchmark look from Image 2
  const visibleCards = React.useMemo(() => {
    if (!notes || notes.length === 0) return cards;
    return cards.map((c, i) => {
      const real = notes[i];
      if (!real) return c;
      return {
        ...c,
        title: real.title && real.title.trim().length > 7 ? real.title : c.title,
        tag: real.folder && real.folder !== 'GENERAL' ? real.folder : c.tag,
        sub: c.sub,
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

      {/* 3D Diagonally Stacked Holographic Deck matching Image 2 & 3 */}
      <div
        className="relative min-h-0 flex-1 pb-2 sm:pb-3"
        style={{ perspective: 900 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {[...visibleCards].reverse().map((item, ri) => {
          const i = visibleCards.length - 1 - ri; // 0 = front card
          const y = -i * (hover ? 64 : 52);
          const rot = -i * (hover ? 4.6 : 3.2);
          const x = i * (hover ? 12 : 7);
          const front = i === 0;

          return (
            <button
              key={item.id}
              onClick={() => handlePick(i)}
              className={`absolute inset-x-1 bottom-2 sm:bottom-3 flex h-[min(54%,165px)] min-h-[105px] flex-col justify-between overflow-hidden rounded-[20px] border bg-gradient-to-br p-3 sm:p-3.5 text-left transition-all ${
                item.grad
              } ${
                front
                  ? 'cursor-pointer border-white/35 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.45)]'
                  : 'cursor-pointer border-white/20 hover:border-white/40 shadow-[0_12px_24px_-6px_rgba(0,0,0,0.6)]'
              }`}
              style={{
                transform: `translate3d(${x}px, ${y}px, ${-i * 35}px) rotateX(14deg) rotateZ(${rot}deg) scale(${
                  1 - i * 0.04
                })`,
                transformOrigin: '50% 100%',
                transition: 'transform .55s cubic-bezier(.2,.9,.25,1.1), filter .3s, border-color .2s',
                filter: front ? 'none' : 'brightness(0.96) contrast(1.04)',
                zIndex: 10 - i,
                backgroundColor: '#07091B',
              }}
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.25),transparent_55%)]" />

              <div className="relative flex items-center justify-between">
                <span className="rounded-md border border-white/30 bg-black/60 px-2 py-0.5 text-[clamp(8.5px,0.75vw,10px)] font-bold tracking-wider text-white uppercase font-mono shadow-xs">
                  {item.tag}
                </span>
                <span className="text-[clamp(9.5px,0.8vw,11px)] font-mono tabular-nums font-bold text-white drop-shadow-sm">{item.score}</span>
              </div>

              <div className="relative">
                <div className="font-heading text-[clamp(11px,0.9vw,13.5px)] font-bold text-white drop-shadow leading-tight truncate">
                  {item.title}
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[clamp(9px,0.78vw,10.5px)] font-semibold text-white/80">
                  <span>{item.sub}</span>
                  {front && <ArrowUpRight size={13} className="text-white shrink-0 ml-1" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-white/8 pt-2">
        <Chip tone="plasma" className="text-[clamp(8px,0.75vw,10px)]">{notes.length > 0 ? `${notes.length} SCROLLS AVAILABLE` : '6 SCROLLS AVAILABLE'}</Chip>
        <Btn
          tone="plasma"
          onClick={() => router.push('/notes')}
          className="!px-3 !py-1 text-xs whitespace-nowrap shrink-0"
        >
          <span>View All</span>
          <ArrowUpRight size={13} strokeWidth={3} />
        </Btn>
      </footer>
    </Panel>
  );
}
