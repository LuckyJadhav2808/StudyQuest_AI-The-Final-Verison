'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlay, HiPause, HiRefresh, HiCog, HiCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageTransition from '@/components/layout/PageTransition';
import { POMODORO_DEFAULTS, XP_AWARDS } from '@/lib/constants';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import confetti from 'canvas-confetti';
import { playCelebration, playNotify } from '@/lib/sounds';

type TimerPhase = 'focus' | 'short-break' | 'long-break';

const PHASE_LABELS: Record<TimerPhase, string> = {
  'focus': '🎯 Focus Time',
  'short-break': '☕ Short Break',
  'long-break': '🌿 Long Break',
};

const PHASE_COLORS: Record<TimerPhase, { ring: string; bg: string; text: string }> = {
  'focus': { ring: '#7C3AED', bg: 'from-primary/10 to-secondary/10', text: 'text-primary' },
  'short-break': { ring: '#10B981', bg: 'from-teal/10 to-lime/10', text: 'text-teal' },
  'long-break': { ring: '#4CC9F0', bg: 'from-sky/10 to-primary/10', text: 'text-sky' },
};

export default function TimerContent() {
  const { user } = useAuthContext();
  const { awardXP } = useGamification();

  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(POMODORO_DEFAULTS.focus * 60);
  const [sessions, setSessions] = useState(0);
  const [totalFocusToday, setTotalFocusToday] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const [durations, setDurations] = useState({
    focus: POMODORO_DEFAULTS.focus,
    shortBreak: POMODORO_DEFAULTS.shortBreak,
    longBreak: POMODORO_DEFAULTS.longBreak,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const totalTime = phase === 'focus'
    ? durations.focus * 60
    : phase === 'short-break'
    ? durations.shortBreak * 60
    : durations.longBreak * 60;

  const progress = 1 - timeLeft / totalTime;

  // SVG ring dimensions
  const size = 320;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  // Close settings dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    if (showSettings) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  // Timer countdown
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        if (phase === 'focus') {
          setTotalFocusToday((prev) => prev + 1);
        }
      }, 1000);
    }

    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handlePhaseComplete();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft]);

  const handlePhaseComplete = async () => {
    // Fire confetti on focus complete
    if (phase === 'focus') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      playCelebration();

      const newSessions = sessions + 1;
      setSessions(newSessions);

      // Award XP
      await awardXP(XP_AWARDS.POMODORO_COMPLETE, `Focus session #${newSessions} completed`);
      toast.success(`+${XP_AWARDS.POMODORO_COMPLETE} XP! Session #${newSessions} done! 🎉`);

      // Save session to Firestore
      if (user) {
        const sessionId = crypto.randomUUID();
        await setDoc(doc(db, 'users', user.uid, 'focusSessions', sessionId), {
          id: sessionId,
          duration: durations.focus,
          type: 'focus',
          completedAt: Date.now(),
        });
      }

      // Auto-transition to break
      if (newSessions % POMODORO_DEFAULTS.sessionsBeforeLongBreak === 0) {
        switchPhase('long-break');
      } else {
        switchPhase('short-break');
      }
    } else {
      playNotify();
      toast('Break over! Time to focus 🎯');
      switchPhase('focus');
    }
  };

  const switchPhase = (newPhase: TimerPhase) => {
    setPhase(newPhase);
    setIsRunning(false);
    const duration = newPhase === 'focus'
      ? durations.focus
      : newPhase === 'short-break'
      ? durations.shortBreak
      : durations.longBreak;
    setTimeLeft(duration * 60);
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(totalTime);
    toast('Timer reset');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const colors = PHASE_COLORS[phase];

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black">Focus Timer</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Stay focused, earn XP. One session at a time.</p>
          </div>
          {/* Settings Dropdown */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-xl border-2 transition-colors ${showSettings ? 'border-primary bg-primary/10' : 'border-[var(--card-border)] hover:border-primary/30'}`}
            >
              <HiCog size={20} />
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  className="absolute right-0 top-12 w-72 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-xl z-50 overflow-hidden"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                >
                  <div className="px-4 py-3 border-b-2 border-[var(--card-border)]">
                    <p className="text-xs font-heading font-bold">⚙️ Timer Settings</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      { label: 'Focus', key: 'focus' as const, min: 1, max: 90 },
                      { label: 'Short Break', key: 'shortBreak' as const, min: 1, max: 30 },
                      { label: 'Long Break', key: 'longBreak' as const, min: 1, max: 60 },
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between">
                        <label className="text-xs font-semibold">{setting.label}</label>
                        <div className="flex items-center gap-1.5">
                          <button
                            className="w-7 h-7 rounded-lg border-2 border-[var(--card-border)] hover:border-primary/30 flex items-center justify-center text-sm font-bold transition-colors"
                            onClick={() => {
                              const val = Math.max(setting.min, durations[setting.key] - 5);
                              setDurations((prev) => ({ ...prev, [setting.key]: val }));
                              if (
                                (setting.key === 'focus' && phase === 'focus') ||
                                (setting.key === 'shortBreak' && phase === 'short-break') ||
                                (setting.key === 'longBreak' && phase === 'long-break')
                              ) { setTimeLeft(val * 60); setIsRunning(false); }
                            }}
                          >−</button>
                          <span className="w-10 text-center text-sm font-heading font-bold">{durations[setting.key]}m</span>
                          <button
                            className="w-7 h-7 rounded-lg border-2 border-[var(--card-border)] hover:border-primary/30 flex items-center justify-center text-sm font-bold transition-colors"
                            onClick={() => {
                              const val = Math.min(setting.max, durations[setting.key] + 5);
                              setDurations((prev) => ({ ...prev, [setting.key]: val }));
                              if (
                                (setting.key === 'focus' && phase === 'focus') ||
                                (setting.key === 'shortBreak' && phase === 'short-break') ||
                                (setting.key === 'longBreak' && phase === 'long-break')
                              ) { setTimeLeft(val * 60); setIsRunning(false); }
                            }}
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Phase selector */}
        <div className="flex rounded-2xl bg-[var(--card-border)]/40 p-1.5 border-2 border-[var(--card-border)]">
          {(['focus', 'short-break', 'long-break'] as TimerPhase[]).map((p) => (
            <button
              key={p}
              onClick={() => switchPhase(p)}
              className={`flex-1 py-3 text-sm font-heading font-bold rounded-xl transition-all duration-200 relative uppercase tracking-wider ${
                phase === p ? 'text-white' : 'text-[var(--muted-foreground)]'
              }`}
            >
              {phase === p && (
                <motion.div
                  className={`absolute inset-0 rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.1)] ${
                    p === 'focus' ? 'bg-gradient-to-r from-primary to-secondary' :
                    p === 'short-break' ? 'bg-gradient-to-r from-teal to-lime' :
                    'bg-gradient-to-r from-sky to-primary'
                  }`}
                  layoutId="timer-tab"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">{PHASE_LABELS[p]}</span>
            </button>
          ))}
        </div>

        {/* Timer Ring */}
        <Card className={`relative overflow-hidden bg-gradient-to-br ${colors.bg}`} padding="lg" hover={false}>
          <div className="flex flex-col items-center py-8">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="transform -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--card-border)" strokeWidth={stroke} opacity={0.3} />
                <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.ring} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: dashOffset }} transition={{ duration: 0.5, ease: 'easeOut' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span className="text-6xl font-mono font-bold tracking-tight" style={{ fontFamily: 'var(--font-mono)' }} key={timeLeft} initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 0.1 }}>{formatTime(timeLeft)}</motion.span>
                <span className={`text-sm font-heading font-bold uppercase tracking-wider mt-2 ${colors.text}`}>{PHASE_LABELS[phase]}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-8">
              <motion.button onClick={resetTimer} className="w-12 h-12 rounded-full border-2 border-[var(--card-border)] flex items-center justify-center hover:border-primary/30 transition-colors" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><HiRefresh size={20} /></motion.button>
              <motion.button onClick={toggleTimer} className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg ${isRunning ? 'bg-gradient-to-br from-coral to-coral-dark shadow-coral/30' : 'bg-gradient-to-br from-primary to-primary-dark shadow-primary/30'}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ boxShadow: `0 8px 0 ${isRunning ? 'rgba(224, 82, 82, 0.4)' : 'rgba(88, 28, 135, 0.4)'}` }}>{isRunning ? <HiPause size={32} /> : <HiPlay size={32} className="ml-1" />}</motion.button>
              <motion.button onClick={() => { setIsRunning(false); handlePhaseComplete(); }} className="w-12 h-12 rounded-full border-2 border-[var(--card-border)] flex items-center justify-center hover:border-teal/30 transition-colors" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Skip to next phase"><HiCheck size={20} /></motion.button>
            </div>
          </div>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card padding="md" hover={false}><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Sessions</p><p className="text-2xl font-heading font-black">{sessions}</p></Card>
          <Card padding="md" hover={false}><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Focus Today</p><p className="text-2xl font-heading font-black">{Math.floor(totalFocusToday / 60)}m</p></Card>
          <Card padding="md" hover={false}><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">XP Earned</p><p className="text-2xl font-heading font-black text-primary">{sessions * XP_AWARDS.POMODORO_COMPLETE}</p></Card>
          <Card padding="md" hover={false}><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Goal</p><div className="flex items-center gap-2"><p className="text-2xl font-heading font-black">{sessions}/4</p>{sessions >= 4 && <Badge variant="teal" size="sm">Done!</Badge>}</div></Card>
        </div>
      </div>
    </PageTransition>
  );
}
