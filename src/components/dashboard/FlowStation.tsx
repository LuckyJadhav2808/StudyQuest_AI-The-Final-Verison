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
  const goalMinutes = Math.floor((totalFocusToday || 0) / 60);
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
    <Panel area="flow" tone="iris" delay={60} className="gap-2 sm:gap-3 justify-between h-full">
      <PanelHeader
        icon={Timer}
        tone="iris"
        title="Flow Station"
        tag={stateLabel}
        tagAlways
        sub="Pomodoro engine · earn 2 XP / min"
        size={30}
        right={
          <div className="text-right text-xs sm:text-sm font-bold text-slate-200 font-mono tabular-nums">
            <span className="text-[#c4b5fd] font-bold tabular-nums">{goalMinutes}m</span>{' '}
            <span className="text-slate-400 font-normal tabular-nums">/ {DAILY_GOAL_MIN}m</span>
          </div>
        }
      />

      {/* 3D Orb Timer Section with Responsive Proportional Aspect & ~12px Extra Header Breathing Room */}
      <div className="min-h-0 flex-1 flex items-center justify-center mt-6 sm:mt-7 pt-2.5 pb-1 relative overflow-visible" style={{ containerType: 'inline-size' }}>
        <div className="relative aspect-square w-full max-w-[clamp(180px,28vh,290px)] max-h-[clamp(180px,28vh,290px)] flex items-center justify-center mx-auto" style={{ containerType: 'inline-size' }}>
          {/* Soft Purple Aurora Glow behind ring */}
          <div
            className={`absolute inset-4 rounded-full bg-[#8b5cf6]/25 blur-3xl transition-opacity duration-700 pointer-events-none ${
              isRunning ? 'opacity-100' : 'opacity-50'
            }`}
          />

          {/* SVG Ring with 60 Ticks & Gradient Progress */}
          <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full -rotate-90 overflow-visible">
            <defs>
              <linearGradient id="sqRingGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={isFocus ? '#8b5cf6' : '#10b981'} />
                <stop offset="55%" stopColor={isFocus ? '#ec4899' : '#22d3ee'} />
                <stop offset="100%" stopColor={isFocus ? '#22d3ee' : '#34d399'} />
              </linearGradient>
              <filter id="sqRingGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 60 Ticks radiating outward */}
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
                  stroke={lit ? 'url(#sqRingGrad)' : 'rgba(196, 181, 253, 0.26)'}
                  strokeWidth={long ? 2.4 : 1.4}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Background Track */}
            <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(4, 5, 18, 0.65)" strokeWidth="15" />
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
            className="absolute h-[6%] w-[6%] rounded-full bg-white shadow-[0_0_16px_5px_rgba(167,139,250,0.95)] pointer-events-none"
            style={{
              left: `${((150 + Math.cos(ang) * R) / 300) * 100}%`,
              top: `${((150 + Math.sin(ang) * R) / 300) * 100}%`,
              transform: 'translate(-50%,-50%)',
              transition: 'all 0.8s linear',
            }}
          />

          {/* Central 3D Spherical Orb with Anti-Collision Fluid Scaling */}
          <div className="orb absolute inset-[15%] grid place-items-center text-center select-none shadow-[inset_0_2px_0_rgba(255,255,255,0.2),inset_0_-18px_40px_-16px_rgba(139,92,246,0.5),0_24px_50px_-18px_rgba(139,92,246,0.6)]">
            <div className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 w-full px-2">
              <div className="flex items-center justify-center gap-1.5 font-bold tracking-[0.2em] text-[#c4b5fd] uppercase text-[clamp(10px,3.8cqw,13px)] leading-none shrink-0">
                {isFocus ? <Brain size={12} className="text-[#c4b5fd]" /> : <Coffee size={12} className="text-[#34d399]" />}
                <span>{isFocus ? 'Deep focus' : 'Break time'}</span>
              </div>
              <div
                className="font-mono tabular-nums font-black leading-none text-white tracking-tight text-[clamp(34px,15cqw,54px)] shrink-0 my-0.5"
                style={{
                  textShadow: '0 0 32px rgba(139,92,246,0.7)',
                }}
              >
                {mm}
                <span className={isRunning ? 'animate-pulse text-[#a78bfa]' : ''}>:</span>
                {ss}
              </div>
              <div className="text-slate-200 dark:text-slate-200 font-mono tabular-nums font-semibold text-[clamp(10px,3.4cqw,12.5px)] leading-none shrink-0 drop-shadow-xs">
                {Math.round(progress * 100)}% complete
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tactile Controls: Reset, 3D Candy Play/Pause, Swap Mode with ~10px extra lower clearance */}
      <div className="flex shrink-0 items-center justify-center gap-2.5 sm:gap-3.5 mt-6 sm:mt-6.5 py-0.5 sm:py-1">
        <button
          onClick={handleReset}
          aria-label="Reset Timer"
          className="raised tone-iris grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-2xl text-slate-300 hover:text-white cursor-pointer"
          title="Reset Session"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={handleTogglePlay}
          aria-label={isRunning ? 'Pause Flow' : 'Start Flow'}
          className="btn tone-iris !h-11 !w-11 sm:!h-13 sm:!w-13 !rounded-full !p-0 shadow-[0_4px_0_#4c1d95,0_14px_26px_-6px_rgba(139,92,246,0.85)] cursor-pointer"
          title={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" className="ml-0.5" />}
        </button>

        <button
          onClick={handleSwapMode}
          aria-label="Switch Mode"
          className="raised tone-mint grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-2xl text-slate-300 hover:text-[#34d399] cursor-pointer"
          title={isFocus ? 'Switch to Break' : 'Switch to Focus'}
        >
          {isFocus ? <Coffee size={16} /> : <Brain size={16} />}
        </button>
      </div>

      {/* 3 Preset Quick-Chips */}
      <div className="grid shrink-0 grid-cols-3 gap-1.5 sm:gap-2">
        {PRESETS.map((p) => {
          const isActive = totalTime === p.f * 60;
          return (
            <button
              key={p.label}
              onClick={() => handleChoosePreset(p.f, p.label)}
              className={`raised tone-iris rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 text-left cursor-pointer transition-all ${
                isActive ? 'is-active !border-[#a78bfa]/80 shadow-[0_0_16px_rgba(139,92,246,0.4)]' : ''
              }`}
            >
              <div className="font-heading text-xs sm:text-[13px] font-bold text-white leading-tight">
                {p.label}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {p.sub}
              </div>
            </button>
          );
        })}
      </div>

      {/* Daily Focus Goal Bar with XP Chip */}
      <div className="shrink-0 pt-1 sm:pt-1.5 border-t border-white/8">
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
          <span className="text-slate-400 font-medium">Daily Focus Goal</span>
          <span className="flex items-center gap-1.5 text-slate-200 font-mono font-bold">
            {goalPct}% <Chip tone="solar">+150 XP</Chip>
          </span>
        </div>
        <div className="well h-2.5 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#f59e0b] shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-700"
            style={{ width: `${Math.max(goalPct, 2)}%` }}
          />
        </div>
      </div>
    </Panel>
  );
}
