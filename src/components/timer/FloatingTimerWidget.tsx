'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { HiPlay, HiPause, HiFastForward, HiExternalLink } from 'react-icons/hi';
import { useTimerContext } from '@/context/TimerContext';
import Card from '@/components/ui/Card';

const PHASE_LABELS: Record<string, string> = {
  'focus': '🎯 Focus',
  'short-break': '☕ Short Break',
  'long-break': '🌿 Long Break',
};

const PHASE_COLORS: Record<string, string> = {
  'focus': '#7C3AED',
  'short-break': '#10B981',
  'long-break': '#4CC9F0',
};

export default function FloatingTimerWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    isRunning, timeLeft, phase, toggleTimer, 
    isPlayingMusic, handlePlayPauseMusic, handleNextMusic, playlist
  } = useTimerContext();

  // Only show if we're not on the timer page, and either the timer or music is running
  const shouldShow = pathname !== '/timer' && (isRunning || isPlayingMusic || (timeLeft > 0 && timeLeft < 1500));

  if (!shouldShow) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const ringColor = PHASE_COLORS[phase];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-24 right-6 z-40 cursor-grab active:cursor-grabbing"
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <Card padding="sm" hover className="flex flex-col gap-3 min-w-[200px] shadow-2xl border-2 shadow-black/20 pointer-events-auto" style={{ borderColor: `${ringColor}55` }}>
          
          {/* Timer Section */}
          <div className="flex items-center justify-between gap-4">
            <div 
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => router.push('/timer')}
              title="Go to Timer"
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ringColor, boxShadow: `0 0 8px ${ringColor}` }} />
              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] leading-tight flex items-center gap-1 group-hover:text-primary transition-colors">
                  {PHASE_LABELS[phase]}
                  <HiExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-xl font-mono font-black tabular-nums leading-none mt-0.5">{formatTime(timeLeft)}</p>
              </div>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${ringColor}, ${ringColor}cc)` }}
            >
              {isRunning ? <HiPause size={18} /> : <HiPlay size={18} className="ml-0.5" />}
            </button>
          </div>

          {/* Mini Music Controls */}
          {playlist.length > 0 && (
            <div className="pt-2 border-t border-[var(--card-border)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-hidden">
                <span className="text-xs">🎵</span>
                <span className="text-[10px] font-bold truncate text-[var(--muted-foreground)]">
                  {isPlayingMusic ? 'Playing' : 'Paused'}
                </span>
                {isPlayingMusic && (
                  <div className="flex items-end gap-[1px] h-3 ml-1 opacity-50">
                    <div className="w-[2px] h-[40%] bg-primary animate-pulse" />
                    <div className="w-[2px] h-[80%] bg-primary animate-pulse" style={{ animationDelay: '0.1s' }} />
                    <div className="w-[2px] h-[60%] bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handlePlayPauseMusic}
                  className="p-1.5 rounded bg-[var(--card-border)]/50 hover:bg-[var(--card-border)] transition-colors text-[var(--foreground)]"
                >
                  {isPlayingMusic ? <HiPause size={12} /> : <HiPlay size={12} />}
                </button>
                <button 
                  onClick={handleNextMusic}
                  className="p-1.5 rounded bg-[var(--card-border)]/50 hover:bg-[var(--card-border)] transition-colors text-[var(--foreground)]"
                >
                  <HiFastForward size={12} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
