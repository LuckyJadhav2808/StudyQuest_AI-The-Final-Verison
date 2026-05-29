'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiPlay, 
  HiPause, 
  HiFastForward, 
  HiRewind, 
  HiVolumeUp, 
  HiVolumeOff, 
  HiPlus,
  HiMusicNote,
  HiX
} from 'react-icons/hi';
import Button from '@/components/ui/Button';

export interface LocalMusicPlayerProps {
  variant: 'zen' | 'regular';
  playlist: { name: string; url: string }[];
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onVolumeChange: (vol: number) => void;
  onFilesSelected: (files: FileList) => void;
  removeTrack?: (index: number) => void;
  playTrack?: (index: number) => void;
}

export default function LocalMusicPlayer({
  variant,
  playlist,
  currentTrackIndex,
  isPlaying,
  volume,
  onPlayPause,
  onNext,
  onPrev,
  onVolumeChange,
  onFilesSelected,
  removeTrack,
  playTrack
}: LocalMusicPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset the input so the same file can be re-added
      e.target.value = '';
    }
  };

  const currentTrack = playlist[currentTrackIndex];

  // ─── Zen Mode UI ───
  if (variant === 'zen') {
    return (
      <motion.div
        className="zen-music-player"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
      >
        <input 
          type="file" 
          accept="audio/*" 
          multiple 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
        />
        
        <div className="flex flex-col gap-2">
          {/* Track info + play button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onPlayPause}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-all shadow-lg border border-white/5"
            >
              {isPlaying ? <HiPause size={20} /> : <HiPlay size={20} className="ml-1" />}
            </button>
            
            <div className="flex-1 min-w-[120px]">
              <p className="text-[12px] font-bold text-white truncate max-w-[140px]">
                {currentTrack ? currentTrack.name : 'No Music'}
              </p>
              <p className="text-[9px] text-white/50 uppercase tracking-wider font-bold mt-0.5">
                {playlist.length > 0 ? `${currentTrackIndex + 1} of ${playlist.length}` : 'Add tracks to play'}
              </p>
            </div>

            {/* Audio visualizer bars */}
            <div className="zen-music-bars ml-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`zen-music-bar ${!isPlaying ? 'paused' : ''}`} />
              ))}
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-1">
              <button 
                onClick={onPrev}
                disabled={playlist.length <= 1}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <HiRewind size={14} />
              </button>
              <button 
                onClick={onNext}
                disabled={playlist.length <= 1}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <HiFastForward size={14} />
              </button>

              {/* Volume control */}
              <div className="relative">
                <button
                  onClick={() => onVolumeChange(volume > 0 ? 0 : 0.5)}
                  onMouseEnter={() => setShowVolume(true)}
                  className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {volume === 0 ? <HiVolumeOff size={14} /> : <HiVolumeUp size={14} />}
                </button>
                {showVolume && (
                  <div 
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-3 bg-black/80 backdrop-blur-md rounded-xl border border-white/10"
                    onMouseLeave={() => setShowVolume(false)}
                  >
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="accent-purple-500 w-20 h-1 cursor-pointer"
                      style={{ writingMode: 'horizontal-tb' }}
                    />
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowQueue(!showQueue)}
                className={`p-1.5 rounded-lg transition-colors ${showQueue ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                title="Toggle Queue"
              >
                <HiMusicNote size={14} />
              </button>
            </div>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition-all border border-white/5"
            >
              <HiPlus /> Add Songs
            </button>
          </div>
          
          {/* Queue panel */}
          <AnimatePresence>
            {showQueue && playlist.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 pt-2 border-t border-white/10 max-h-[150px] overflow-y-auto custom-scrollbar pr-1"
              >
                {playlist.map((track, i) => (
                  <div 
                    key={track.url}
                    className={`flex items-center justify-between p-1.5 rounded-lg mb-1 transition-colors ${i === currentTrackIndex ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  >
                    <div 
                      className="flex items-center gap-2 flex-1 cursor-pointer overflow-hidden"
                      onClick={() => playTrack && playTrack(i)}
                    >
                      {i === currentTrackIndex ? (
                        <HiPlay size={10} className="text-white flex-shrink-0" />
                      ) : (
                        <span className="text-[9px] font-bold text-white/30 w-3 text-center flex-shrink-0">{i + 1}</span>
                      )}
                      <span className={`text-[10px] truncate ${i === currentTrackIndex ? 'text-white font-bold' : 'text-white/60'}`}>
                        {track.name}
                      </span>
                    </div>
                    {removeTrack && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeTrack(i); }}
                        className="text-white/30 hover:text-red-400 p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        <HiX size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // ─── Regular Mode UI ───
  return (
    <div className="bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl flex flex-col shadow-sm overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <input 
          type="file" 
          accept="audio/*" 
          multiple 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
        />
        
        {/* Left side: play button + track info */}
        <div className="flex items-center gap-4">
          <motion.div 
            className="w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), #EC4899)', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)' }}
            onClick={onPlayPause}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPlaying ? <HiPause size={24} className="text-white" /> : <HiPlay size={24} className="text-white ml-1" />}
          </motion.div>
          
          <div>
            <h3 className="font-heading font-bold text-sm truncate max-w-[200px]">
              {currentTrack ? currentTrack.name : 'Music Player'}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              {playlist.length > 0 ? `${currentTrackIndex + 1} of ${playlist.length} tracks` : 'No local tracks added'}
            </p>
          </div>
        </div>

        {/* Right side: controls */}
        <div className="flex items-center gap-2">
          {playlist.length > 0 && (
            <>
              <button 
                onClick={onPrev}
                className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-xl transition-colors"
              >
                <HiRewind size={20} />
              </button>
              <button 
                onClick={onNext}
                className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-xl transition-colors"
              >
                <HiFastForward size={20} />
              </button>
              
              {/* Volume control */}
              <div className="relative group">
                <button
                  onClick={() => onVolumeChange(volume > 0 ? 0 : 0.5)}
                  className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-xl transition-colors"
                >
                  {volume === 0 ? <HiVolumeOff size={20} /> : <HiVolumeUp size={20} />}
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="accent-purple-500 w-24 h-1 cursor-pointer"
                  />
                </div>
              </div>

              <button 
                onClick={() => setShowQueue(!showQueue)}
                className={`p-2 rounded-xl transition-colors ${showQueue ? 'bg-primary/10 text-primary' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)]'}`}
                title="Toggle Queue"
              >
                <HiMusicNote size={20} />
              </button>
            </>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <HiPlus /> Add MP3s
          </Button>
        </div>
      </div>

      {/* Queue panel with smooth animation */}
      <AnimatePresence>
        {showQueue && playlist.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t-2 border-[var(--card-border)] bg-[var(--background)]"
          >
            <div className="px-2 py-1.5 flex items-center justify-between border-b border-[var(--card-border)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] px-2">
                Queue · {playlist.length} track{playlist.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="max-h-[250px] overflow-y-auto p-2 custom-scrollbar">
              {playlist.map((track, i) => (
                <motion.div 
                  key={track.url}
                  layout
                  className={`flex items-center justify-between p-2.5 rounded-xl mb-1 transition-colors ${i === currentTrackIndex ? 'bg-primary/10 border border-primary/20' : 'hover:bg-[var(--card-bg)]'}`}
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer overflow-hidden px-1"
                    onClick={() => playTrack && playTrack(i)}
                  >
                    {i === currentTrackIndex ? (
                      <div className="flex items-end gap-[2px] h-3 w-4 flex-shrink-0">
                        <div className="w-[2px] h-[40%] bg-primary rounded-full animate-pulse" />
                        <div className="w-[2px] h-[80%] bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                        <div className="w-[2px] h-[55%] bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-[var(--muted-foreground)] w-4 text-center flex-shrink-0">{i + 1}</span>
                    )}
                    <span className={`text-sm truncate ${i === currentTrackIndex ? 'text-primary font-bold' : 'text-[var(--foreground)]'}`}>
                      {track.name}
                    </span>
                  </div>
                  {removeTrack && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeTrack(i); }}
                      className="text-[var(--muted-foreground)] hover:text-red-500 p-1.5 rounded-lg hover:bg-[var(--card-bg)] transition-colors"
                      title="Remove from queue"
                    >
                      <HiX size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
