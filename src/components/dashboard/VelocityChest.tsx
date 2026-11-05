'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Check, Flame, Gift, Sparkles, TrendingUp } from 'lucide-react';
import { Btn, Chip, Panel, PanelHeader } from './ui';
import { useGamification } from '@/hooks/useGamification';
import { useTimerContext } from '@/context/TimerContext';
import { useShop } from '@/hooks/useShop';
import TreasureChestModal from './TreasureChestModal';

const DAILY_GOAL_MIN = 120;

export function StudyVelocity() {
  const { gamification, xpHistory } = useGamification();
  const { totalFocusToday } = useTimerContext();
  const streak = typeof gamification?.streak === 'number' ? gamification.streak : 0;
  const level = typeof gamification?.level === 'number' && gamification.level > 0 ? gamification.level : 1;

  // 7-day velocity data calculation dynamically synced with real focus & XP
  const { velocityData, activeDays, consistency } = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const result = [];
    let active = 0;
    const todayMins = Math.floor((totalFocusToday || 0) / 60);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayName = days[d.getDay()];
      const isToday = i === 0;

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${date}`;

      const xp = xpHistory?.[dateStr] || 0;
      let mins = 0;

      if (isToday) {
        mins = todayMins > 0 ? todayMins : (xp > 0 ? Math.round(xp * 0.8) : 0);
      } else {
        mins = xp > 0 ? Math.round(xp * 0.8) : 0;
      }

      if (mins > 0) active++;

      // Compute visual height percentage: min 14% if mins > 0, 0% if 0m
      const pct = mins > 0 ? Math.min(100, Math.max(14, Math.round((mins / DAILY_GOAL_MIN) * 100))) : 0;

      result.push({
        id: `vel-${dateStr}`,
        day: dayName,
        isToday,
        mins,
        pct,
      });
    }

    return {
      velocityData: result,
      activeDays: active,
      consistency: Math.round((active / 7) * 100),
    };
  }, [xpHistory, totalFocusToday]);

  const todayMins = Math.floor((totalFocusToday || 0) / 60);

  return (
    <Panel area="vel" tone="mint" delay={240} className="gap-2 justify-between h-full">
      <PanelHeader
        icon={TrendingUp}
        tone="mint"
        title="Study Velocity"
        sub="Minutes focused per day"
        size={30}
        right={
          <span className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-400 font-mono tabular-nums shrink-0">
            <Flame size={13} className="drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]" /> {streak}d streak
          </span>
        }
      />

      {/* 7 Slender Vertical Pillars with Liquid Gradient Fill */}
      <div className="relative flex min-h-0 flex-1 items-stretch gap-1.5 px-2 pt-2">
        {/* Horizontal Dashed Goal Line */}
        <div className="pointer-events-none absolute inset-x-2 top-[12%] border-t border-dashed border-[#10b981]/30 z-0" />

        {/* Reserved Right Gutter for Goal Badge so it never overlaps Wed/Thu tubes */}
        <div className="pointer-events-none absolute right-1.5 sm:right-2 top-[12%] -translate-y-1/2 z-20">
          <span className="rounded-md bg-[#10b981]/25 border border-[#10b981]/45 px-1.5 py-0.5 text-[8.5px] font-mono font-bold text-[#6ee7b7] tabular-nums whitespace-nowrap shadow-xs">
            GOAL {DAILY_GOAL_MIN}m
          </span>
        </div>

        {/* The 7 tubes container evenly distributed across chart area with reserved right gutter */}
        <div
          className="relative grid flex-1 min-w-0 items-stretch gap-1 sm:gap-2 mr-16 sm:mr-18 z-10"
          style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
        >
          {/* Subtle continuous baseline rail under tubes */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[20px] border-b border-white/15 z-0" />

          {velocityData.map((col) => {
            return (
              <div key={col.id} className="group relative flex min-w-0 w-full flex-col items-center justify-end gap-1 z-10" title={`${col.mins}m focused`}>
                {/* Slender Pillar Tube */}
                <div
                  className={`well relative w-full max-w-[24px] sm:max-w-[26px] flex-1 overflow-hidden rounded-full flex flex-col justify-end p-0.5 transition-all ${
                    col.isToday
                      ? 'border-[#34d399]/50 ring-1 ring-[#34d399]/30 bg-[#34d399]/5 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                      : 'border-white/10'
                  }`}
                >
                  <div
                    className={`w-full rounded-full transition-all duration-700 ${
                      col.mins === 0
                        ? (col.isToday ? 'bg-[#34d399]/35' : 'bg-white/8')
                        : col.isToday
                        ? 'bg-gradient-to-t from-[#06b6d4] to-[#34d399] shadow-[0_0_16px_#34d399]'
                        : 'bg-gradient-to-t from-[#059669] to-[#34d399] shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                    }`}
                    style={{ height: col.mins === 0 ? '5px' : `${col.pct}%` }}
                  >
                    {col.isToday && col.mins > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#34D399] mx-auto mb-0.5 animate-pulse" />
                    )}
                  </div>
                  <span className="absolute inset-x-0.5 top-0 h-full rounded-full bg-gradient-to-r from-white/20 to-transparent opacity-40 pointer-events-none" />
                </div>

                {/* Day Label with today highlight */}
                <span
                  className={`text-[clamp(8.5px,0.75vw,10.5px)] font-bold font-mono tabular-nums ${
                    col.isToday ? 'text-[#34d399] drop-shadow-sm font-extrabold' : 'text-slate-400'
                  }`}
                >
                  {col.day}
                </span>

                {/* Precision Hover Tooltip with minutes */}
                <span className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-700/80 bg-slate-950/95 px-2 py-0.5 text-[9px] font-bold font-mono tabular-nums text-emerald-300 opacity-0 shadow-xl backdrop-blur-md transition-all duration-150 group-hover:opacity-100 z-30 whitespace-nowrap">
                  {col.mins}m focused
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-white/8 pt-1.5 text-[clamp(9.5px,0.8vw,11.5px)] font-semibold min-w-0">
        <span className="text-slate-200 font-mono tabular-nums truncate">
          <span className="font-mono tabular-nums font-bold text-white">{todayMins}m</span> today · <span className="text-[#a78bfa] font-bold font-mono">Level {level}</span>
        </span>
        <span className="text-[#34d399] font-mono font-bold tabular-nums shrink-0 ml-1 drop-shadow-xs">
          {consistency}% Consistency · {activeDays}/7 Days Active
        </span>
      </div>
    </Panel>
  );
}

function secondsToMidnight() {
  const n = new Date();
  const m = new Date(n);
  m.setHours(24, 0, 0, 0);
  return Math.floor((m.getTime() - n.getTime()) / 1000);
}
const pad = (n: number) => String(n).padStart(2, '0');

export function DailyChest() {
  const { canClaimTreasureChest } = useShop();
  const canClaim = typeof canClaimTreasureChest === 'function' ? canClaimTreasureChest() : false;
  const [showModal, setShowModal] = useState(false);
  const [secs, setSecs] = useState(secondsToMidnight());

  useEffect(() => {
    const id = window.setInterval(() => setSecs(secondsToMidnight()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  const resetStr = `Resets in ${pad(h)}:${pad(m)}:${pad(s)}`;

  return (
    <>
      <Panel area="chest" tone="solar" delay={360} className="!justify-center !py-1.5 sm:!py-2 h-full">
        <div className="flex items-center gap-2.5 sm:gap-3 w-full min-w-0">
          <div className="relative shrink-0">
            {canClaim && (
              <span className="absolute inset-0 animate-ping-soft rounded-2xl bg-amber-400/50" />
            )}
            <div
              className={`tile tone-solar relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl ${
                canClaim ? 'animate-shake' : ''
              }`}
            >
              <Gift size={20} strokeWidth={2.2} />
            </div>
            {!canClaim && (
              <span className="absolute -right-1 -bottom-1 grid h-4 w-4 sm:h-5 sm:w-5 place-items-center rounded-full bg-emerald-500 text-slate-950 shadow-[0_0_10px_#10b981]">
                <Check size={11} strokeWidth={4} />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="font-heading text-xs sm:text-sm font-bold text-white truncate leading-tight">
                Daily Chest
              </h2>
              {canClaim && (
                <Chip tone="solar" className="text-[8px] py-0 px-1.5 shrink-0 font-mono">
                  READY
                </Chip>
              )}
            </div>
            <p className="truncate text-[9.5px] sm:text-[10.5px] font-mono tabular-nums font-semibold text-amber-400 mt-0.5">
              {canClaim ? 'Open for XP + coins ✨' : resetStr}
            </p>
          </div>

          <div className="shrink-0 flex items-center ml-2">
            {canClaim ? (
              <Btn
                tone="solar"
                onClick={() => setShowModal(true)}
                className="!px-3 !py-1 text-xs shrink-0 whitespace-nowrap"
              >
                Loot
              </Btn>
            ) : (
              <button
                type="button"
                disabled
                title="Already claimed, resets at midnight"
                aria-label="Already claimed, resets at midnight"
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 font-mono shadow-xs cursor-default shrink-0 transition-opacity"
              >
                <Check size={12} strokeWidth={3.5} />
                <span>Done</span>
              </button>
            )}
          </div>
        </div>
      </Panel>

      {showModal && (
        <TreasureChestModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
