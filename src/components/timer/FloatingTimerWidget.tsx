'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { HiPlay, HiPause, HiFastForward, HiExternalLink, HiX } from 'react-icons/hi';
import { useTimerContext } from '@/context/TimerContext';

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
  const [isDismissed, setIsDismissed] = useState(false);

  const { 
    isRunning, timeLeft, totalTime, phase, toggleTimer, 
    isPlayingMusic, handlePlayPauseMusic, handleNextMusic, playlist, currentTrackIndex
  } = useTimerContext();

  // Reset dismissal if session resets or a fresh preset starts
  useEffect(() => {
    if (timeLeft === totalTime) {
      setIsDismissed(false);
    }
  }, [timeLeft, totalTime]);

  // Only show if not dismissed, not on timer page, and either timer or music is active
  const shouldShow = !isDismissed && pathname !== '/timer' && (isRunning || isPlayingMusic || (timeLeft > 0 && timeLeft < totalTime));

  const ringColor = PHASE_COLORS[phase] || '#7C3AED';
  const currentTrack = playlist[currentTrackIndex];

  // Mini progress ring dimensions
  const ringSize = 38;
  const ringStroke = 3;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = totalTime > 0 ? 1 - timeLeft / totalTime : 0;
  const ringDashOffset = ringCircumference * (1 - ringProgress);

  return (
    <AnimatePresence>
      {shouldShow && (
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
          exit={{ opacity: 0, scale: 0.85, y: 15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {/* Prismatic Dark Glass Chassis */}
          <div
            className="relative flex flex-col gap-2.5 min-w-[230px] rounded-2xl bg-gradient-to-br from-[#12142B]/95 via-[#0F1126]/90 to-[#0A0C1D]/95 backdrop-blur-2xl border-2 shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_1.5px_0_rgba(255,255,255,0.25)] p-3 pointer-events-auto transition-all group select-none"
            style={{ borderColor: `${ringColor}55` }}
          >
            {/* Header Tab Bar: Phase label, drag hint & Close Tab button */}
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  {PHASE_LABELS[phase]}
                </span>
                {isRunning && (
                  <span className="flex h-1.5 w-1.5 relative">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: ringColor }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-1.5 w-1.5"
                      style={{ backgroundColor: ringColor }}
                    />
                  </span>
                )}
              </div>

              {/* Drag grip hint */}
              <div
                className="w-5 h-1 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors"
                title="Drag to reposition"
              />

              {/* Close Tab Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDismissed(true);
                }}
                className="w-5 h-5 rounded-full bg-white/10 hover:bg-rose-500/80 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs border border-white/10 shrink-0"
                title="Close floating timer (runs in background)"
                aria-label="Close floating timer"
              >
                <HiX size={11} strokeWidth={2.5} />
              </button>
            </div>

            {/* Timer Section */}
            <div className="flex items-center justify-between gap-3 pt-0.5">
              <div 
                className="flex items-center gap-2.5 cursor-pointer group/timer"
                onClick={() => router.push('/timer')}
                title="Go to Timer"
              >
                {/* Mini progress ring */}
                <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
                  <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={ringStroke}
                    />
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke={ringColor}
                      strokeWidth={ringStroke}
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringDashOffset}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: ringColor,
                        boxShadow: isRunning ? `0 0 8px ${ringColor}` : 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xl font-mono font-black tabular-nums text-white leading-none tracking-tight">
                    {formatTime(timeLeft)}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium group-hover/timer:text-primary transition-colors flex items-center gap-1 mt-1">
                    <span>Open Studio</span>
                    <HiExternalLink size={9} />
                  </p>
                </div>
              </div>
              
              <motion.button 
                onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer shrink-0"
                style={{ background: `linear-gradient(135deg, ${ringColor}, ${ringColor}cc)` }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title={isRunning ? 'Pause' : 'Start'}
              >
                {isRunning ? <HiPause size={16} /> : <HiPlay size={16} className="ml-0.5" />}
              </motion.button>
            </div>

            {/* Mini Music Controls */}
            {playlist.length > 0 && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
                  <span className="text-xs flex-shrink-0">🎵</span>
                  <span className="text-[10px] font-bold truncate text-slate-300">
                    {isPlayingMusic && currentTrack ? currentTrack.name : (isPlayingMusic ? 'Playing' : 'Paused')}
                  </span>
                  {isPlayingMusic && (
                    <div className="flex items-end gap-[1px] h-3 ml-1 flex-shrink-0">
                      <div className="w-[2px] h-[40%] bg-pink-400 rounded-full animate-pulse" />
                      <div className="w-[2px] h-[80%] bg-pink-400 rounded-full animate-pulse [animation-delay:0.1s]" />
                      <div className="w-[2px] h-[60%] bg-pink-400 rounded-full animate-pulse [animation-delay:0.2s]" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handlePlayPauseMusic(); }}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                    title={isPlayingMusic ? 'Pause Music' : 'Play Music'}
                  >
                    {isPlayingMusic ? <HiPause size={11} /> : <HiPlay size={11} />}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleNextMusic(); }}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                    title="Next Track"
                  >
                    <HiFastForward size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
