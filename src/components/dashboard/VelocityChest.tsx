'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Check, Flame, Gift, Sparkles, TrendingUp } from 'lucide-react';
import { Btn, Chip, Panel, PanelHeader } from './ui';
import { useGamification } from '@/hooks/useGamification';
import { useTimerContext } from '@/context/TimerContext';
import { useShop } from '@/hooks/useShop';
import TreasureChestModal from './TreasureChestModal';

const DAILY_GOAL_MIN = 120;

function secondsToMidnight() {
  const n = new Date();
  const m = new Date(n);
  m.setHours(24, 0, 0, 0);
  return Math.floor((m.getTime() - n.getTime()) / 1000);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function StudyVelocity() {
  const { gamification, xpHistory } = useGamification();
  const { totalFocusToday, formattedFocusToday } = useTimerContext();
  const streak = gamification?.streak || 1;
  const level = gamification?.level || 1;

  // 7-day velocity data calculation
  const { velocityData, activeDays, consistency } = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const result = [];
    let active = 0;

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
        mins = totalFocusToday || (xp > 0 ? Math.round(xp * 0.8) : 0);
      } else {
        mins = xp > 0 ? Math.round(xp * 0.8) : 0;
      }

      if (mins > 0 || xp > 0) active++;

      const pct = Math.min(100, Math.round((mins / DAILY_GOAL_MIN) * 100));

      result.push({
        id: `vel-${dateStr}`,
        day: dayName,
        isToday,
        mins,
        pct: mins > 0 ? Math.max(pct, 12) : 6,
      });
    }

    return {
      velocityData: result,
      activeDays: active,
      consistency: Math.round((active / 7) * 100),
    };
  }, [xpHistory, totalFocusToday]);

  const todayMins = totalFocusToday || 0;

  return (
    <Panel area="vel" tone="mint" delay={240} className="gap-2 justify-between">
      <PanelHeader
        icon={TrendingUp}
        tone="mint"
        title="Study Velocity"
        tag="7D Momentum"
        sub="Minutes focused per day"
        right={
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500 font-mono">
            <Flame size={15} className="drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]" /> {streak}d streak
          </span>
        }
      />

      {/* 7 Slender Vertical Pillars with Liquid Gradient Fill */}
      <div className="relative flex min-h-0 flex-1 items-stretch justify-between gap-1.5 px-1 pt-2">
        {/* Horizontal Dashed Goal Line */}
        <div className="pointer-events-none absolute inset-x-0 top-[10%] border-t border-dashed border-emerald-400/30">
          <span className="absolute -top-2.5 right-1 rounded bg-emerald-500/20 px-1.5 py-0.2 text-[8px] font-bold font-mono text-emerald-400">
            GOAL {DAILY_GOAL_MIN}m
          </span>
        </div>

        {velocityData.map((col) => {
          return (
            <div key={col.id} className="group relative flex min-w-0 flex-1 flex-col items-center gap-1">
              {/* Slender Pillar Tube */}
              <div className="well relative w-full max-w-[24px] flex-1 overflow-hidden rounded-full flex flex-col justify-end p-0.5">
                <div
                  className={`w-full rounded-full transition-all duration-700 ${
                    col.mins === 0
                      ? 'bg-slate-300/20 dark:bg-white/10'
                      : col.isToday
                      ? 'bg-gradient-to-t from-blue-600 via-sky-500 to-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]'
                      : 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  }`}
                  style={{ height: `${col.pct}%` }}
                >
                  {col.isToday && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#34D399] mx-auto mb-0.5 animate-pulse" />
                  )}
                </div>
                <span className="absolute inset-x-0.5 top-0 h-full rounded-full bg-gradient-to-r from-white/20 to-transparent opacity-40 pointer-events-none" />
              </div>

              {/* Day Label */}
              <span
                className={`text-[9px] font-bold font-mono ${
                  col.isToday ? 'text-emerald-500 dark:text-emerald-300' : 'text-slate-400'
                }`}
              >
                {col.day}
              </span>

              {/* Precision Hover Tooltip */}
              <span className="pointer-events-none absolute -top-2 z-20 -translate-y-full rounded-lg border border-slate-700 bg-slate-950/95 px-2 py-0.5 text-[9px] font-bold font-mono text-white opacity-0 shadow-lg transition group-hover:opacity-100 whitespace-nowrap">
                {col.mins}m focused
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-slate-200/80 dark:border-white/8 pt-1.5 text-[10px] sm:text-[11px] font-semibold">
        <span className="text-slate-500 dark:text-slate-400 font-mono">
          {formattedFocusToday || `${todayMins}m`} today · <span className="text-blue-500 dark:text-blue-400 font-bold">Level {level}</span>
        </span>
        <span className="text-emerald-500 dark:text-emerald-400 font-mono font-bold">
          {consistency}% Consistency · {activeDays}/7 Days Active
        </span>
      </div>
    </Panel>
  );
}

export function DailyChest() {
  const { canClaimTreasureChest } = useShop();
  const canClaim = canClaimTreasureChest ? canClaimTreasureChest() : true;

  const [secs, setSecs] = useState(secondsToMidnight());
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecs(secondsToMidnight());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  return (
    <>
      <Panel area="chest" tone="solar" delay={360} className="!justify-center py-2 sm:py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            {canClaim && (
              <span className="absolute inset-0 animate-ping-soft rounded-2xl bg-amber-400/50" />
            )}
            <div
              className={`tile tone-solar relative h-11 w-11 sm:h-12 sm:w-12 rounded-2xl ${
                canClaim ? 'animate-shake' : ''
              }`}
            >
              <Gift size={22} strokeWidth={2.2} />
            </div>
            {!canClaim && (
              <span className="absolute -right-1 -bottom-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_0_8px_#10b981]">
                <Check size={10} strokeWidth={4} />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-heading text-xs sm:text-sm font-bold text-slate-800 dark:text-white leading-tight">
                Daily Chest
              </h2>
              <Chip tone={canClaim ? 'solar' : 'mint'}>
                {canClaim ? 'Ready' : 'Claimed'}
              </Chip>
            </div>
            <p className="truncate text-[10px] font-mono font-semibold text-amber-500 mt-0.5">
              {canClaim
                ? 'Open for XP + coin loot ✨'
                : `Resets in ${pad(h)}:${pad(m)}:${pad(s)}`}
            </p>
          </div>

          <Btn
            tone={canClaim ? 'solar' : 'mint'}
            onClick={() => setShowModal(true)}
            className="!px-3 !py-1 text-xs shrink-0"
          >
            {canClaim ? (
              'Loot'
            ) : (
              <>
                <Sparkles size={13} /> Done
              </>
            )}
          </Btn>
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
