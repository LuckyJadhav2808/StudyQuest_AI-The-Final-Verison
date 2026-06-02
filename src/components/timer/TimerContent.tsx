'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlay, HiPause, HiRefresh, HiCog, HiCheck } from 'react-icons/hi';
import { useGamification } from '@/hooks/useGamification';
import { useSidebar } from '@/context/SidebarContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageTransition from '@/components/layout/PageTransition';
import PomodoroPet from '@/components/timer/PomodoroPet';
import ZenMode from '@/components/timer/ZenMode';
import LocalMusicPlayer from '@/components/timer/LocalMusicPlayer';
import SessionCompleteOverlay from '@/components/timer/SessionCompleteOverlay';
import { useTimerContext } from '@/context/TimerContext';
import { XP_AWARDS } from '@/lib/constants';

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
  const { 
    phase, isRunning, timeLeft, totalTime, sessions, totalFocusToday, durations, progress, wasAbandoned,
    toggleTimer, resetTimer, skipPhase, switchPhase, setDurations, setTimeLeft, setIsRunning,
    playlist, currentTrackIndex, isPlayingMusic, volume,
    handleFilesSelected, handlePlayPauseMusic, handleNextMusic, handlePrevMusic, setVolume,
    removeTrack, playTrack,
    sessionCompleteData, dismissSessionComplete,
  } = useTimerContext();

  const { gamification } = useGamification();
  const { focusMode, setFocusMode } = useSidebar();
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // ESC key exits focus mode
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) setFocusMode(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [focusMode, setFocusMode]);

  // Clean up focus mode when leaving the timer page
  useEffect(() => {
    return () => setFocusMode(false);
  }, [setFocusMode]);

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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const size = 320;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const colors = PHASE_COLORS[phase];

  // Focus mode renders the immersive Zen Mode
  if (focusMode) {
    return (
      <ZenMode
        isRunning={isRunning}
        timeLeft={timeLeft}
        totalTime={totalTime}
        phase={phase}
        sessions={sessions}
        totalFocusToday={totalFocusToday}
        xpPerSession={XP_AWARDS.POMODORO_COMPLETE}
        onToggle={toggleTimer}
        onReset={resetTimer}
        onSkip={skipPhase}
        onExit={() => setFocusMode(false)}
        musicProps={{
          playlist,
          currentTrackIndex,
          isPlaying: isPlayingMusic,
          volume,
          onPlayPause: handlePlayPauseMusic,
          onNext: handleNextMusic,
          onPrev: handlePrevMusic,
          onVolumeChange: setVolume,
          onFilesSelected: handleFilesSelected,
          removeTrack,
          playTrack
        }}
      />
    );
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black">Focus Timer</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Stay focused, earn XP. One session at a time.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Deep Focus Toggle */}
            <button
              onClick={() => setFocusMode(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-primary"
              title="Enter immersive Zen Focus mode"
            >
              🧘 Zen Mode
            </button>

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
              <motion.button onClick={skipPhase} className="w-12 h-12 rounded-full border-2 border-[var(--card-border)] flex items-center justify-center hover:border-teal/30 transition-colors" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Skip to next phase"><HiCheck size={20} /></motion.button>
            </div>
          </div>
        </Card>

        {/* Music Player */}
        <LocalMusicPlayer
          variant="regular"
          playlist={playlist}
          currentTrackIndex={currentTrackIndex}
          isPlaying={isPlayingMusic}
          volume={volume}
          onPlayPause={handlePlayPauseMusic}
          onNext={handleNextMusic}
          onPrev={handlePrevMusic}
          onVolumeChange={setVolume}
          onFilesSelected={handleFilesSelected}
          removeTrack={removeTrack}
          playTrack={playTrack}
        />

        {/* Pomodoro Pet */}
        <PomodoroPet
          isRunning={isRunning}
          phase={phase}
          progress={progress}
          sessions={sessions}
          totalXP={gamification?.xp || 0}
          wasAbandoned={wasAbandoned}
        />

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card padding="md" hover={false}><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Sessions</p><p className="text-2xl font-heading font-black">{sessions}</p></Card>
          <Card padding="md" hover={false}><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Focus Today</p><p className="text-2xl font-heading font-black">{Math.floor(totalFocusToday / 60)}m</p></Card>
          <Card padding="md" hover={false}><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">XP Earned</p><p className="text-2xl font-heading font-black text-primary">{sessions * XP_AWARDS.POMODORO_COMPLETE}</p></Card>
          <Card padding="md" hover={false}><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Goal</p><div className="flex items-center gap-2"><p className="text-2xl font-heading font-black">{sessions}/4</p>{sessions >= 4 && <Badge variant="teal" size="sm">Done!</Badge>}</div></Card>
        </div>
      </div>

      {/* Session Complete Celebration */}
      {sessionCompleteData && (
        <SessionCompleteOverlay data={sessionCompleteData} onDismiss={dismissSessionComplete} />
      )}
    </PageTransition>
  );
}
