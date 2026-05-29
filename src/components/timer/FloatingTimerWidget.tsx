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

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function FloatingTimerWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    isRunning, timeLeft, totalTime, phase, toggleTimer, 
    isPlayingMusic, handlePlayPauseMusic, handleNextMusic, playlist, currentTrackIndex
  } = useTimerContext();

  // Only show if not on timer page, and either timer or music is active
  const shouldShow = pathname !== '/timer' && (isRunning || isPlayingMusic || (timeLeft > 0 && timeLeft < totalTime));

  if (!shouldShow) return null;

  const ringColor = PHASE_COLORS[phase];
  const currentTrack = playlist[currentTrackIndex];

  // Mini progress ring dimensions
  const ringSize = 40;
  const ringStroke = 3;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = 1 - timeLeft / totalTime;
  const ringDashOffset = ringCircumference * (1 - ringProgress);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-24 right-6 z-40 cursor-grab active:cursor-grabbing"
        drag
        dragMomentum={false}
        dragConstraints={{ 
          top: -(typeof window !== 'undefined' ? window.innerHeight : 800) + 200, 
          left: -(typeof window !== 'undefined' ? window.innerWidth : 1200) + 250, 
          right: 0, 
          bottom: 0 
        }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <Card padding="sm" hover className="flex flex-col gap-3 min-w-[220px] shadow-2xl border-2 shadow-black/20 pointer-events-auto backdrop-blur-sm" style={{ borderColor: `${ringColor}55` }}>
          
          {/* Timer Section */}
          <div className="flex items-center justify-between gap-3">
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => router.push('/timer')}
              title="Go to Timer"
            >
              {/* Mini progress ring */}
              <div className="relative" style={{ width: ringSize, height: ringSize }}>
                <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="var(--card-border)" strokeWidth={ringStroke} opacity={0.3} />
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke={ringColor} strokeWidth={ringStroke} strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringDashOffset} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ringColor, boxShadow: isRunning ? `0 0 8px ${ringColor}` : 'none' }} />
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] leading-tight flex items-center gap-1 group-hover:text-primary transition-colors">
                  {PHASE_LABELS[phase]}
                  <HiExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-xl font-mono font-black tabular-nums leading-none mt-0.5">{formatTime(timeLeft)}</p>
              </div>
            </div>
            
            <motion.button 
              onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${ringColor}, ${ringColor}cc)` }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isRunning ? <HiPause size={18} /> : <HiPlay size={18} className="ml-0.5" />}
            </motion.button>
          </div>

          {/* Mini Music Controls */}
          {playlist.length > 0 && (
            <div className="pt-2 border-t border-[var(--card-border)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
                <span className="text-xs flex-shrink-0">🎵</span>
                <span className="text-[10px] font-bold truncate text-[var(--muted-foreground)]">
                  {isPlayingMusic && currentTrack ? currentTrack.name : (isPlayingMusic ? 'Playing' : 'Paused')}
                </span>
                {isPlayingMusic && (
                  <div className="flex items-end gap-[1px] h-3 ml-1 flex-shrink-0">
                    <div className="w-[2px] h-[40%] bg-primary rounded-full animate-pulse" />
                    <div className="w-[2px] h-[80%] bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                    <div className="w-[2px] h-[60%] bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button 
                  onClick={(e) => { e.stopPropagation(); handlePlayPauseMusic(); }}
                  className="p-1.5 rounded bg-[var(--card-border)]/50 hover:bg-[var(--card-border)] transition-colors text-[var(--foreground)]"
                >
                  {isPlayingMusic ? <HiPause size={12} /> : <HiPlay size={12} />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleNextMusic(); }}
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
