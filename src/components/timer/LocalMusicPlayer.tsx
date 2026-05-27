'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  HiPlay, 
  HiPause, 
  HiFastForward, 
  HiRewind, 
  HiVolumeUp, 
  HiVolumeOff, 
  HiPlus 
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
  onFilesSelected
}: LocalMusicPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  const currentTrack = playlist[currentTrackIndex];

  // Zen Mode UI
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

            <div className="zen-music-bars ml-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`zen-music-bar ${!isPlaying ? 'paused' : ''}`} />
              ))}
            </div>
          </div>

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
            </div>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition-all border border-white/5"
            >
              <HiPlus /> Add Songs
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Regular Mode UI
  return (
    <div className="bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl p-4 flex items-center justify-between shadow-sm">
      <input 
        type="file" 
        accept="audio/*" 
        multiple 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
      
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), #EC4899)', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)' }}
          onClick={onPlayPause}
        >
          {isPlaying ? <HiPause size={24} className="text-white" /> : <HiPlay size={24} className="text-white ml-1" />}
        </div>
        
        <div>
          <h3 className="font-heading font-bold text-sm truncate max-w-[200px]">
            {currentTrack ? currentTrack.name : 'Music Player'}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            {playlist.length > 0 ? `${playlist.length} tracks loaded` : 'No local tracks added'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {playlist.length > 0 && (
          <div className="flex items-center gap-2">
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
          </div>
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
  );
}
