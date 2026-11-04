'use client';

import React from 'react';
import { Coffee, Pause, Play, RotateCcw, Timer, Brain } from 'lucide-react';
import { Chip, Panel, PanelHeader } from './ui';
import { useTimerContext } from '@/context/TimerContext';
import { playClick, playXP } from '@/lib/sounds';
import toast from 'react-hot-toast';

const PRESETS = [
  { label: '25m Focus', sub: '5m Break', f: 25 },
  { label: '50m Deep', sub: 'Flow State', f: 50 },
  { label: '15m Sprint', sub: 'Revision', f: 15 },
];

const R = 118;
const C = 2 * Math.PI * R;
const DAILY_GOAL_MIN = 120;

export function FlowStation() {
  const {
    phase,
    isRunning,
    timeLeft,
    totalTime,
    totalFocusToday,
    toggleTimer,
    resetTimer,
    skipPhase,
    setDurations,
    setTimeLeft,
    setIsRunning,
  } = useTimerContext();

  const isFocus = phase === 'focus';
  const effectiveTotal = totalTime > 0 ? totalTime : 25 * 60;
  const progress = Math.max(0, Math.min(1, 1 - (timeLeft / effectiveTotal)));

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  // Angle for the floating glowing thumb dot
  const ang = progress * 2 * Math.PI - Math.PI / 2;
  const goalMinutes = totalFocusToday || 0;
  const goalPct = Math.min(100, Math.round((goalMinutes / DAILY_GOAL_MIN) * 100));

  const stateLabel = isRunning
    ? (isFocus ? 'FLOWING' : 'RECHARGE')
    : timeLeft === effectiveTotal
    ? 'READY'
    : 'PAUSED';

  const handleChoosePreset = (presetMins: number, label: string) => {
    const s = presetMins * 60;
    setDurations((prev) => ({ ...prev, focus: s }));
    setTimeLeft(s);
    setIsRunning(true);
    playXP();
    toast.success(`🚀 ${label} initiated! (${presetMins} mins)`);
  };

  const handleTogglePlay = () => {
    playClick();
    toggleTimer();
  };

  const handleReset = () => {
    playClick();
    resetTimer();
  };

  const handleSwapMode = () => {
    playClick();
    skipPhase();
  };

  return (
    <Panel area="flow" tone="iris" delay={60} className="gap-2.5 sm:gap-3 justify-between">
      <PanelHeader
        icon={Timer}
        tone="iris"
        title="Flow Station"
        tag={stateLabel}
        tagAlways
        sub="Pomodoro engine · earn 2 XP / min"
        right={
          <div className="text-right text-xs sm:text-sm font-bold text-slate-800 dark:text-white font-mono">
            <span className="text-blue-500 dark:text-blue-400 font-extrabold">{goalMinutes}m</span>{' '}
            <span className="text-slate-400 font-normal">/ {DAILY_GOAL_MIN}m</span>
          </div>
        }
      />

      {/* 3D Orb Timer Section */}
      <div className="min-h-0 flex-1 py-1" style={{ containerType: 'size' }}>
        <div className="grid h-full w-full place-items-center">
          <div className="relative" style={{ width: 'min(96cqw,96cqh)', height: 'min(96cqw,96cqh)' }}>
            {/* Soft Ambient Aurora Glow */}
            <div
              className={`absolute inset-[6%] rounded-full bg-blue-600/25 blur-3xl transition-opacity duration-700 pointer-events-none ${
                isRunning ? 'opacity-100' : 'opacity-40'
              }`}
            />

            {/* SVG Ring with 60 Ticks & Gradient Progress */}
            <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full -rotate-90 overflow-visible">
              <defs>
                <linearGradient id="sqRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={isFocus ? '#2563EB' : '#10B981'} />
                  <stop offset="55%" stopColor={isFocus ? '#38BDF8' : '#22D3EE'} />
                  <stop offset="100%" stopColor={isFocus ? '#60A5FA' : '#34D399'} />
                </linearGradient>
                <filter id="sqRingGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 60 Ticks */}
              {Array.from({ length: 60 }).map((_, i) => {
                const a = (i / 60) * Math.PI * 2;
                const long = i % 5 === 0;
                const r1 = 138;
                const r2 = long ? 147 : 143;
                const lit = i / 60 <= progress;
                return (
                  <line
                    key={i}
                    x1={150 + Math.cos(a) * r1}
                    y1={150 + Math.sin(a) * r1}
                    x2={150 + Math.cos(a) * r2}
                    y2={150 + Math.sin(a) * r2}
                    stroke={lit ? 'url(#sqRingGrad)' : 'currentColor'}
                    className={lit ? '' : 'text-slate-300 dark:text-white/10'}
                    strokeWidth={long ? 2.4 : 1.4}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Background Track */}
              <circle cx="150" cy="150" r={R} fill="none" stroke="var(--well)" strokeWidth="15" />
              <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="15" />

              {/* Progress Sweep */}
              <circle
                cx="150"
                cy="150"
                r={R}
                fill="none"
                stroke="url(#sqRingGrad)"
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - Math.max(progress, 0.002))}
                filter="url(#sqRingGlow)"
                style={{ transition: 'stroke-dashoffset 0.8s linear' }}
              />
            </svg>

            {/* Glowing Floating Thumb Indicator */}
            <div
              className="absolute h-[5%] w-[5%] rounded-full bg-white shadow-[0_0_14px_4px_rgba(96,165,250,0.95)] pointer-events-none"
              style={{
                left: `${((150 + Math.cos(ang) * R) / 300) * 100}%`,
                top: `${((150 + Math.sin(ang) * R) / 300) * 100}%`,
                transform: 'translate(-50%,-50%)',
                transition: 'all 0.8s linear',
              }}
            />

            {/* Central 3D Spherical Orb */}
            <div className="orb absolute inset-[17%] grid place-items-center text-center select-none">
              <div>
                <div
                  className="flex items-center justify-center gap-1.5 font-bold tracking-[0.18em] text-slate-500 dark:text-slate-400 uppercase"
                  style={{ fontSize: 'clamp(9px, 3.2cqmin, 12px)' }}
                >
                  {isFocus ? <Brain size={12} className="text-blue-500 dark:text-blue-400" /> : <Coffee size={12} className="text-emerald-500 dark:text-emerald-400" />}
                  {isFocus ? 'Deep focus' : 'Break time'}
                </div>
                <div
                  className="font-mono tabular font-black leading-none text-slate-900 dark:text-white mt-1"
                  style={{
                    fontSize: 'min(15cqmin, 82px)',
                    textShadow: '0 0 26px rgba(37,99,235,0.55)',
                  }}
                >
                  {mm}
                  <span className={isRunning ? 'animate-pulse text-blue-500' : ''}>:</span>
                  {ss}
                </div>
                <div
                  className="mt-1 text-slate-400 font-mono font-medium"
                  style={{ fontSize: 'clamp(9px, 3cqmin, 11px)' }}
                >
                  {Math.round(progress * 100)}% complete
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tactile Controls: Reset, 3D Candy Play/Pause, Swap Mode */}
      <div className="flex shrink-0 items-center justify-center gap-3.5 py-0.5">
        <button
          onClick={handleReset}
          aria-label="Reset Timer"
          className="raised tone-iris grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-2xl text-slate-400 hover:text-white cursor-pointer"
          title="Reset Session"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={handleTogglePlay}
          aria-label={isRunning ? 'Pause Flow' : 'Start Flow'}
          className="btn tone-iris !h-12 !w-12 sm:!h-13 sm:!w-13 !rounded-full !p-0 shadow-lg cursor-pointer"
          title={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>

        <button
          onClick={handleSwapMode}
          aria-label="Switch Mode"
          className="raised tone-mint grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-2xl text-slate-400 hover:text-emerald-400 cursor-pointer"
          title={isFocus ? 'Switch to Break' : 'Switch to Focus'}
        >
          {isFocus ? <Coffee size={16} /> : <Brain size={16} />}
        </button>
      </div>

      {/* 3 Preset Quick-Chips */}
      <div className="grid shrink-0 grid-cols-3 gap-2">
        {PRESETS.map((p) => {
          const isActive = totalTime === p.f * 60;
          return (
            <button
              key={p.label}
              onClick={() => handleChoosePreset(p.f, p.label)}
              className={`raised tone-iris rounded-xl p-2 text-left cursor-pointer transition-all ${
                isActive ? 'is-active' : ''
              }`}
            >
              <div className="font-heading text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {p.label}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {p.sub}
              </div>
            </button>
          );
        })}
      </div>

      {/* Daily Focus Goal Bar with XP Chip */}
      <div className="shrink-0 pt-1 border-t border-slate-200/80 dark:border-white/8">
        <div className="mb-1 flex items-center justify-between text-[10px] sm:text-[11px] font-semibold">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Daily Focus Goal</span>
          <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-mono font-bold">
            {goalPct}% <Chip tone="solar">+150 XP</Chip>
          </span>
        </div>
        <div className="well h-2.5 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-amber-400 shadow-[0_0_12px_rgba(37,99,235,0.7)] transition-all duration-700"
            style={{ width: `${Math.max(goalPct, 2)}%` }}
          />
        </div>
      </div>
    </Panel>
  );
}
