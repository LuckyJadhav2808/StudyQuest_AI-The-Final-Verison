'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiSun, HiMoon, HiBell, HiSearch, HiPlay, HiPause, HiMusicNote,
  HiFastForward, HiRewind, HiVolumeUp, HiVolumeOff, HiChevronUp
} from 'react-icons/hi';
import { HiArrowsPointingOut, HiArrowsPointingIn } from 'react-icons/hi2';
import { useTheme } from '@/context/ThemeContext';
import { useGamification } from '@/hooks/useGamification';
import { useFriends } from '@/hooks/useFriends';
import { useShop } from '@/hooks/useShop';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useMusic } from '@/context/MusicContext';
import StreakCounter from '@/components/gamification/StreakCounter';
import LevelBadge from '@/components/gamification/LevelBadge';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { gamification } = useGamification();
  const { incomingRequests } = useFriends();
  const { coins } = useShop();
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    nextTrack,
    prevTrack,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    playlist,
    setIsPlayerOpen,
  } = useMusic();
  const [showVolume, setShowVolume] = React.useState(false);
  const router = useRouter();

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <header className="h-14 sm:h-16 pt-[env(safe-area-inset-top,0px)] bg-white/90 dark:bg-[var(--card-bg)]/85 backdrop-blur-xl border-b border-indigo-100/80 dark:border-[var(--card-border)] shadow-[0_2px_12px_-2px_rgba(124,58,237,0.04)] dark:shadow-none flex items-center justify-between px-3.5 sm:px-6 sticky top-0 z-30">
      {/* Left — Brand Logo (Guaranteed Full Width, Zero Truncation) */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        <motion.h1
          className="text-base sm:text-xl font-heading font-black text-gradient whitespace-nowrap flex-shrink-0 select-none cursor-pointer"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.push('/')}
        >
          StudyQuest
        </motion.h1>

        {/* Ctrl+K Search Hint (Desktop only) */}
        <button
          onClick={openCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-100/80 dark:border-[var(--card-border)] bg-indigo-50/40 dark:bg-transparent hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer"
        >
          <HiSearch size={13} className="text-[var(--muted-foreground)] group-hover:text-primary transition-colors" />
          <span className="text-[11px] text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">
            Ask Questie...
          </span>
          <kbd className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[var(--background)] border border-[var(--card-border)] text-[var(--muted-foreground)]">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Center — BitChord Unified Music Capsule (Complete Media Controls) */}
      <div 
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-indigo-100/80 dark:border-[var(--card-border)] bg-indigo-50/50 dark:bg-white/[0.04] hover:border-primary/40 transition-all shadow-sm max-w-[150px] sm:max-w-[340px] md:max-w-[420px] relative group/capsule"
      >
        {/* Animated icon / spinning artwork thumbnail (Click opens Studio) */}
        <div
          onClick={() => setIsPlayerOpen(true)}
          className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-primary/20 flex-shrink-0 flex items-center justify-center border border-white/15 cursor-pointer shadow-sm hover:scale-105 transition-transform"
          title="Open StudyQuest Music Studio"
        >
          {currentTrack?.image ? (
            <img
              src={currentTrack.image}
              alt=""
              className={`w-full h-full object-cover ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '8s' }}
            />
          ) : (
            <HiMusicNote size={14} className="text-primary" />
          )}
          {isPlaying && (
            <span className="absolute bottom-0.5 right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* Title & Artist (Click opens Studio) */}
        <div
          onClick={() => setIsPlayerOpen(true)}
          className="flex flex-col truncate min-w-0 flex-1 cursor-pointer"
          title={currentTrack ? `${currentTrack.name} — ${currentTrack.artists}` : 'Open Music Studio'}
        >
          <span className="text-[11px] sm:text-xs font-bold text-[var(--foreground)] truncate leading-tight group-hover/capsule:text-primary transition-colors">
            {currentTrack ? currentTrack.name : 'Focus Studio'}
          </span>
          <span className="text-[9px] text-[var(--muted-foreground)] truncate hidden sm:block">
            {currentTrack ? currentTrack.artists : 'Click to explore tracks'}
          </span>
        </div>

        {/* Media Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {/* Previous Track */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevTrack();
            }}
            disabled={playlist.length <= 1}
            className="hidden sm:flex p-1 rounded-full text-[var(--muted-foreground)] hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
            title="Previous track"
          >
            <HiRewind size={14} />
          </button>

          {/* Play/Pause Button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary hover:bg-primary-light text-white flex items-center justify-center transition-all shadow-md shadow-primary/20 flex-shrink-0 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <HiPause size={13} /> : <HiPlay size={13} className="ml-0.5" />}
          </motion.button>

          {/* Next Track */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextTrack();
            }}
            disabled={playlist.length <= 1}
            className="hidden sm:flex p-1 rounded-full text-[var(--muted-foreground)] hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
            title="Next track"
          >
            <HiFastForward size={14} />
          </button>

          {/* Micro Volume Popover on Hover */}
          <div
            className="relative hidden md:flex items-center"
            onMouseEnter={() => setShowVolume(true)}
            onMouseLeave={() => setShowVolume(false)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="p-1 rounded-full text-[var(--muted-foreground)] hover:text-primary transition-colors cursor-pointer"
              title={isMuted || volume === 0 ? 'Unmute' : `Volume: ${volume}%`}
            >
              {isMuted || volume === 0 ? <HiVolumeOff size={13} /> : <HiVolumeUp size={13} />}
            </button>

            {/* Hover Volume Slider */}
            <AnimatePresence>
              {showVolume && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 4 }}
                  className="absolute top-full -left-6 mt-1.5 p-2 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-xl flex items-center gap-2 z-50 min-w-[120px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                    className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-[10px] font-mono text-white/70 w-5 text-right">
                    {isMuted ? 0 : volume}%
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Open Studio Expand Button */}
          <button
            onClick={() => setIsPlayerOpen(true)}
            className="p-1 rounded-full text-[var(--muted-foreground)] hover:text-primary hover:bg-primary/10 transition-colors ml-0.5 cursor-pointer"
            title="Expand Studio Modal"
          >
            <HiChevronUp size={14} />
          </button>
        </div>
      </div>

      {/* Right — Gamification HUD & Actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Streak Capsule */}
        {gamification && (
          <StreakCounter streak={gamification.streak} size="sm" />
        )}

        {/* Quest Coins */}
        <motion.button
          onClick={() => router.push('/shop')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 dark:border-amber-400/20 hover:border-amber-500/40 transition-all"
          whileHover={{ scale: 1.05 }}
        >
          <span className="text-xs">🪙</span>
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 font-mono tabular-nums">
            {typeof coins === 'number' ? coins : typeof coins === 'object' && coins && 'bc' in (coins as any) ? Number((coins as any).bc) || 0 : 0}
          </span>
        </motion.button>

        {/* XP Badge */}
        {gamification && (
          <motion.div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-[11px] font-bold text-primary-700 dark:text-primary-light font-mono tabular-nums">
              {typeof gamification.xp === 'number' ? gamification.xp.toLocaleString() : '0'} XP
            </span>
          </motion.div>
        )}


        {/* Fullscreen / Immersion Mode Toggle (Hides PWA / Browser title bar) */}
        {isSupported && (
          <motion.button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-xl hover:bg-[var(--muted)]/30 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            title={isFullscreen ? 'Exit Immersion Mode (Show Title Bar)' : 'Enter Immersion Mode (Hide Title Bar)'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <HiArrowsPointingIn size={19} /> : <HiArrowsPointingOut size={19} />}
          </motion.button>
        )}

        {/* Theme Toggle (Desktop / Tablet) */}
        <motion.button
          onClick={toggleTheme}
          className="hidden sm:flex p-2 rounded-xl hover:bg-[var(--muted)]/30 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <HiSun size={20} /> : <HiMoon size={20} />}
        </motion.button>

        {/* Notifications — navigates to Dashboard */}
        <motion.button
          onClick={() => router.push('/')}
          className="p-1.5 sm:p-2 rounded-xl hover:bg-[var(--muted)]/30 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors relative"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Notifications"
        >
          <HiBell size={18} className="sm:text-xl" />
          {incomingRequests.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-coral text-white text-[8px] font-bold flex items-center justify-center">{incomingRequests.length}</span>
          )}
        </motion.button>

        {/* Level Avatar Badge (Mobile + Desktop) */}
        <div className="md:hidden">
          {gamification && <LevelBadge level={gamification.level} size="sm" />}
        </div>
      </div>
    </header>

  );
}
