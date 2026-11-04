'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Plus, SquarePen } from 'lucide-react';
import { Btn, Chip, Panel, PanelHeader } from './ui';
import { useNotes } from '@/hooks/useNotes';
import { playClick, playXP } from '@/lib/sounds';
import toast from 'react-hot-toast';

const GHOST_SCROLL_STARTERS = [
  { id: 'ghost-1', title: 'Calculus III & Stokes Theorem', tag: 'Mathematics', desc: 'Vector surface integrals & flux divergence theorems', tone: 'iris' as const },
  { id: 'ghost-2', title: 'Operating Systems & Concurrency', tag: 'Systems', desc: 'Deadlock avoidance, semaphores & virtual memory', tone: 'aqua' as const },
  { id: 'ghost-3', title: 'Algorithms & Dynamic Programming', tag: 'CS', desc: 'Memoization tables, asymptotic bounds & recurrence', tone: 'plasma' as const },
];

const GRAD: Record<string, string> = {
  iris: 'from-blue-600/80 via-indigo-600/50 to-[#0A1024]',
  aqua: 'from-sky-500/80 via-blue-600/40 to-[#0A1024]',
  plasma: 'from-cyan-500/80 via-indigo-600/45 to-[#0A1024]',
  solar: 'from-amber-500/80 via-orange-600/40 to-[#0A1024]',
  mint: 'from-emerald-500/80 via-teal-600/40 to-[#0A1024]',
};

export function NotesDeck() {
  const router = useRouter();
  const { notes, addNote } = useNotes();
  const [hover, setHover] = useState(false);
  const [rotatedOrder, setRotatedOrder] = useState<number[]>([0, 1, 2]);

  // Combine real notes with ghost starters
  const displayItems = useMemo(() => {
    const real = notes.map((n, i) => ({
      id: n.id,
      title: n.title || 'Untitled Scroll',
      tag: n.folder || 'Vault',
      sub: new Date(n.updatedAt || n.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: 'Vault',
      isGhost: false,
      ghostData: null,
      tone: (['iris', 'plasma', 'aqua', 'mint', 'solar'] as const)[i % 5],
    }));

    const ghosts = GHOST_SCROLL_STARTERS.map((g) => ({
      id: g.id,
      title: g.title,
      tag: g.tag,
      sub: 'Template Starter',
      score: '10/10',
      isGhost: true,
      ghostData: g,
      tone: g.tone,
    }));

    return [...real, ...ghosts].slice(0, 3);
  }, [notes]);

  // Handle card click
  const handleCardClick = async (item: typeof displayItems[0], cardIdx: number) => {
    playClick();
    if (cardIdx !== 0) {
      // Bring clicked card to front
      setRotatedOrder((prev) => {
        const copy = [...prev];
        const [picked] = copy.splice(cardIdx, 1);
        return [picked, ...copy];
      });
      return;
    }

    if (item.isGhost && item.ghostData) {
      try {
        const newId = await addNote({
          title: item.ghostData.title,
          content: `# ${item.ghostData.title}\n\n*${item.ghostData.desc}*\n\n## Core Concepts\n- Key theorem\n- High-yield summary\n`,
          folder: 'General',
          tags: [item.ghostData.tag.toLowerCase()],
        });
        playXP();
        toast.success('Study scroll crafted!');
        if (newId) router.push(`/notes?id=${newId}`);
        else router.push('/notes');
      } catch {
        router.push('/notes');
      }
    } else {
      router.push(`/notes?id=${item.id}`);
    }
  };

  // Reorder items according to rotatedOrder
  const orderedItems = rotatedOrder.map((idx) => displayItems[idx % displayItems.length]);

  return (
    <Panel area="notes" tone="plasma" delay={420} className="gap-2.5 justify-between">
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

      {/* 3D Diagonally Stacked Holographic Deck */}
      <div
        className="relative min-h-[140px] sm:min-h-[160px] flex-1 overflow-hidden"
        style={{ perspective: 900 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {[...orderedItems].reverse().map((item, ri) => {
          const i = orderedItems.length - 1 - ri; // 0 = front card
          const spread = hover ? 1.25 : 1;
          const y = -i * 44 * spread;
          const rot = -i * (hover ? 4.5 : 3);
          const x = i * (hover ? 10 : 5);
          const front = i === 0;

          return (
            <button
              key={item.id}
              onClick={() => handleCardClick(item, i)}
              className={`absolute inset-x-1 bottom-1 flex h-[min(48%,150px)] min-h-[105px] sm:min-h-[115px] flex-col justify-between overflow-hidden rounded-[20px] border bg-gradient-to-br p-3 sm:p-3.5 text-left transition-all ${
                GRAD[item.tone] || GRAD.plasma
              } ${
                front
                  ? 'cursor-pointer border-white/25 shadow-[0_18px_36px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.4)]'
                  : 'cursor-pointer border-white/10 hover:border-white/30'
              }`}
              style={{
                transform: `translate3d(${x}px, ${y}px, ${-i * 35}px) rotateX(14deg) rotateZ(${rot}deg) scale(${
                  1 - i * 0.05
                })`,
                transformOrigin: '50% 100%',
                transition: 'transform .55s cubic-bezier(.2,.9,.25,1.1), filter .3s, border-color .2s',
                filter: front ? 'none' : `brightness(${1 - i * 0.14})`,
                zIndex: 10 - i,
                backgroundColor: '#0A1024',
              }}
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.22),transparent_55%)]" />

              <div className="relative flex items-center justify-between">
                <span className="rounded-md border border-white/20 bg-black/40 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase font-mono">
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

      <footer className="flex shrink-0 items-center justify-between border-t border-slate-200/80 dark:border-white/8 pt-2">
        <Chip tone="plasma">{notes.length} Scrolls Available</Chip>
        <Btn
          tone="plasma"
          onClick={() => router.push('/notes')}
          className="!px-2.5 !py-1 text-xs"
        >
          <span>View All</span>
          <ArrowUpRight size={13} strokeWidth={3} />
        </Btn>
      </footer>
    </Panel>
  );
}
