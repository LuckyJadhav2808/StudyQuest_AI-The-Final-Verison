'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  HiPlay, HiPause, HiFastForward, HiRewind,
  HiVolumeUp, HiVolumeOff, HiMusicNote, HiChevronUp,
} from 'react-icons/hi';
import { useMusic } from '@/context/MusicContext';
import Card from '@/components/ui/Card';

export default function MusicWidget() {
  const {
    playlist,
    currentTrackIndex,
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    togglePlayPause,
    nextTrack,
    prevTrack,
    toggleMute,
    setIsPlayerOpen,
  } = useMusic();

  return (
    <Card className="music-widget overflow-hidden" padding="none" hover={false}>
      {/* Header */}
      <div className="music-widget-header flex items-center justify-between px-3 py-2 border-b border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎵</span>
          <h3 className="text-[11px] font-heading font-bold uppercase tracking-wider">
            Study Jukebox
          </h3>
        </div>
        <button
          onClick={() => setIsPlayerOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          title="Open StudyQuest Music Studio"
        >
          <span>Studio</span>
          <HiChevronUp size={12} />
        </button>
      </div>

      {/* Now playing section */}
      <div className="music-widget-player p-3 flex items-center gap-3">
        {/* Vinyl / Album art */}
        <div 
          onClick={() => setIsPlayerOpen(true)}
          className="music-widget-vinyl-wrapper cursor-pointer group"
          title="Click to open Music Studio"
        >
          <motion.div 
            className="music-widget-vinyl w-11 h-11 rounded-full overflow-hidden relative shadow-md"
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 4, repeat: isPlaying ? Infinity : 0, ease: 'linear' }}
          >
            {currentTrack?.image ? (
              <img src={currentTrack.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary">
                <HiMusicNote size={16} />
              </div>
            )}
            <div className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-black/80 border border-white/20" />
          </motion.div>
        </div>

        {/* Track info */}
        <div 
          onClick={() => setIsPlayerOpen(true)}
          className="music-widget-info flex-1 min-w-0 cursor-pointer group"
        >
          <p className="text-[12px] font-heading font-bold truncate group-hover:text-primary transition-colors">
            {currentTrack ? currentTrack.name : 'No Track Playing'}
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)] truncate">
            {currentTrack ? currentTrack.artists : 'Click to choose study beats'}
          </p>
        </div>

        {/* Controls */}
        <div className="music-widget-controls flex items-center gap-1">
          <button 
            onClick={prevTrack} 
            disabled={playlist.length <= 1} 
            className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 cursor-pointer"
            title="Previous track"
          >
            <HiRewind size={14} />
          </button>
          
          <motion.button 
            onClick={togglePlayPause}
            className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md cursor-pointer"
            whileTap={{ scale: 0.9 }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <HiPause size={14} /> : <HiPlay size={14} className="ml-0.5" />}
          </motion.button>

          <button 
            onClick={nextTrack} 
            disabled={playlist.length <= 1} 
            className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 cursor-pointer"
            title="Next track"
          >
            <HiFastForward size={14} />
          </button>

          <button
            onClick={toggleMute}
            className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer ml-0.5"
            title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <HiVolumeOff size={13} /> : <HiVolumeUp size={13} />}
          </button>
        </div>
      </div>
    </Card>
  );
}
