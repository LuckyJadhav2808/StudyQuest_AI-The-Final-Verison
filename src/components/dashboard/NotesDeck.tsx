'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Plus, Sparkles, SquarePen } from 'lucide-react';
import { Btn, Chip, Panel, PanelHeader } from './ui';
import { useNotes } from '@/hooks/useNotes';
import { playClick } from '@/lib/sounds';

const SLOT_GRADIENTS = [
  'from-[#6366f1]/90 via-[#4f46e5]/80 to-[#1e1b4b]/95',
  'from-[#0d9488]/90 via-[#0f766e]/80 to-[#115e59]/95',
  'from-[#be185d]/90 via-[#9d174d]/80 to-[#4c0519]/95',
];

function formatWordCount(count: number): string {
  if (count <= 0) return 'Draft';
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k words`;
  }
  return `${count.toLocaleString()} words`;
}

export function NotesDeck() {
  const router = useRouter();
  const { notes } = useNotes();
  const [hover, setHover] = useState(false);
  const [deckOrder, setDeckOrder] = useState<number[]>([0, 1, 2]);

  // Dynamically map real user notes (up to 3)
  const deckNotes = useMemo(() => {
    if (!notes || notes.length === 0) return [];
    
    // Sort by latest updatedAt or createdAt
    const sorted = [...notes].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    return sorted.slice(0, 3).map((n, idx) => {
      const wordCount = (n.content || '').trim().split(/\s+/).filter(Boolean).length;
      const tag = (n.folder && n.folder !== 'GENERAL' ? n.folder : (n.tags?.[0] || 'VAULT')).toUpperCase();
      const score = formatWordCount(wordCount);
      const dateStr = n.updatedAt
        ? new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : 'Recent';

      return {
        id: n.id,
        title: n.title?.trim() || 'Untitled Scroll',
        tag,
        score,
        sub: n.folder && n.folder !== 'GENERAL' ? `${n.folder} · ${dateStr}` : `Scroll Vault · ${dateStr}`,
        grad: SLOT_GRADIENTS[idx % SLOT_GRADIENTS.length],
      };
    });
  }, [notes]);

  // Reorder deck upon picking non-front cards
  const orderedCards = useMemo(() => {
    if (deckNotes.length === 0) return [];
    return deckOrder
      .filter((i) => i < deckNotes.length)
      .map((i) => deckNotes[i]);
  }, [deckNotes, deckOrder]);

  const handlePick = (index: number) => {
    playClick();
    if (index === 0) {
      router.push('/notes');
      return;
    }
    setDeckOrder((prev) => {
      const copy = [...prev];
      const [picked] = copy.splice(index, 1);
      return [picked, ...copy];
    });
  };

  const totalScrolls = notes?.length || 0;

  return (
    <Panel area="notes" tone="plasma" delay={420} className="gap-2 sm:gap-2.5 justify-between h-full">
      <div className="relative z-20 shrink-0">
        <PanelHeader
          icon={SquarePen}
          tone="plasma"
          title="Top 3 Notes"
          sub={totalScrolls > 0 ? `${totalScrolls} scrolls in vault` : 'Diagonally stacked deck'}
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
      </div>

      {/* Dynamic Notes Deck or Elegant Empty State */}
      {orderedCards.length === 0 ? (
        <div className="relative z-0 min-h-0 flex-1 flex flex-col items-center justify-center p-3 sm:p-4 text-center">
          <div className="well relative flex flex-col items-center justify-center w-full h-full max-h-[160px] rounded-2xl border border-dashed border-[#ec4899]/30 bg-[#ec4899]/5 p-3">
            <div className="tile tone-plasma h-10 w-10 rounded-2xl mb-2">
              <SquarePen size={18} strokeWidth={2.3} />
            </div>
            <div className="font-heading text-xs sm:text-sm font-bold text-white mb-0.5">
              Vault Awaiting Scrolls
            </div>
            <p className="text-[11px] text-slate-400 mb-2 max-w-[200px]">
              No notes forged yet. Create notes to pin them in your 3D deck.
            </p>
            <Btn
              tone="plasma"
              onClick={() => router.push('/notes')}
              className="!px-3 !py-1 text-xs whitespace-nowrap"
            >
              <Plus size={12} strokeWidth={3} />
              <span>Forge Note</span>
            </Btn>
          </div>
        </div>
      ) : (
        <div
          className="relative z-0 min-h-0 flex-1 pt-3 sm:pt-4 pb-1 sm:pb-1.5 overflow-hidden"
          style={{ perspective: 900 }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {[...orderedCards].reverse().map((item, ri) => {
            const i = orderedCards.length - 1 - ri; // 0 = front card
            const y = -i * (hover ? 40 : 34);
            const rot = -i * (hover ? 2 : 1.5);
            const x = 0;
            const front = i === 0;

            return (
              <button
                key={item.id}
                onClick={() => handlePick(i)}
                className={`absolute inset-x-2 sm:inset-x-2.5 bottom-7 sm:bottom-8 flex h-[96px] sm:h-[102px] min-h-[88px] flex-col justify-between overflow-hidden rounded-[18px] border bg-gradient-to-br p-2 sm:p-2.5 text-left transition-all ${
                  item.grad
                } ${
                  front
                    ? 'cursor-pointer border-white/35 shadow-[0_18px_36px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.45)]'
                    : 'cursor-pointer border-white/20 hover:border-white/40 shadow-[0_10px_20px_-6px_rgba(0,0,0,0.6)]'
                }`}
                style={{
                  transform: `translate3d(${x}px, ${y}px, ${-i * 40}px) rotateX(14deg) rotateZ(${rot}deg) scale(${
                    1 - i * 0.045
                  })`,
                  transformOrigin: '50% 100%',
                  transition: 'transform .55s cubic-bezier(.2,.9,.25,1.1), filter .3s, border-color .2s',
                  filter: front ? 'none' : `brightness(${1 - i * 0.05}) contrast(1.02)`,
                  zIndex: 10 - i,
                  backgroundColor: front ? 'rgba(9, 12, 30, 0.98)' : 'rgba(11, 15, 36, 0.92)',
                }}
              >
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.22),transparent_55%)]" />

                <div className="relative flex items-center justify-between">
                  <span className="rounded-md border border-white/35 bg-black/75 px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold tracking-wider text-white uppercase font-mono shadow-xs truncate max-w-[110px]">
                    {item.tag}
                  </span>
                  <span className="rounded-md border border-white/20 bg-black/50 px-2 py-0.5 text-[9.5px] sm:text-[10px] font-mono tabular-nums font-bold text-white/95 shadow-xs">
                    {item.score}
                  </span>
                </div>

                {/* Bottom title & sub: only visible on front card to eliminate ghosting through translucent back cards */}
                <div className={`relative ${front ? 'opacity-100' : 'opacity-0 select-none pointer-events-none'}`}>
                  <div className="font-heading text-xs sm:text-[13px] font-bold text-white leading-snug truncate">
                    {item.title}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] sm:text-[10.5px] font-semibold text-white/80">
                    <span className="truncate mr-2">{item.sub}</span>
                    {front && <ArrowUpRight size={13} className="text-white shrink-0" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <footer className="flex shrink-0 items-center justify-between border-t border-white/8 pt-2 pr-1.5 sm:pr-2">
        <Chip tone="plasma" className="text-[clamp(8px,0.75vw,10px)]">
          {totalScrolls} {totalScrolls === 1 ? 'SCROLL' : 'SCROLLS'} AVAILABLE
        </Chip>
        <Btn
          tone="plasma"
          onClick={() => router.push('/notes')}
          className="!px-3 !py-1 text-xs whitespace-nowrap shrink-0 shadow-[0_0_12px_rgba(236,72,153,0.35)]"
        >
          <span>View All</span>
          <ArrowUpRight size={13} strokeWidth={3} />
        </Btn>
      </footer>
    </Panel>
  );
}
