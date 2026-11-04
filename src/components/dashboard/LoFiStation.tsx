'use client';

import React, { useEffect, useState } from 'react';
import { Music2, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Chip, Panel } from './ui';
import { useMusic } from '@/context/MusicContext';
import { playAmbient, stopAmbient, setAmbientVolume, type ScapeKind } from '@/lib/ambientAudio';

const AMBIENT_TRACKS: { title: string; sub: string; kind: ScapeKind; chip: string; grad: string }[] = [
  { title: 'Lo-Fi Sanctuary', sub: 'Binaural 10Hz Alpha Waves', kind: 'binaural', chip: 'Alpha', grad: 'from-blue-600 via-sky-500 to-amber-400' },
  { title: 'Ocean Drift', sub: 'Soft Wave Ambience', kind: 'waves', chip: 'Waves', grad: 'from-sky-400 via-blue-600 to-[#0A1024]' },
  { title: 'Midnight Drizzle', sub: 'Rain On The Window', kind: 'rain', chip: 'Rain', grad: 'from-emerald-400 via-sky-500 to-blue-600' },
];

const fmt = (s: number) => {
  if (isNaN(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

export function LoFiStation() {
  const {
    currentTrack,
    isPlaying: isMusicPlaying,
    progress: musicProgress,
    currentTime: musicCurrentTime,
    duration: musicDuration,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    setIsPlayerOpen,
  } = useMusic();

  const [ambientIndex, setAmbientIndex] = useState(0);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [ambientSecs, setAmbientSecs] = useState(0);
  const [vol, setVol] = useState(0.6);

  const t = AMBIENT_TRACKS[ambientIndex];
  const isPlaying = isMusicPlaying || ambientPlaying;

  // Manage ambient soundscape
  useEffect(() => {
    if (ambientPlaying) {
      playAmbient(t.kind);
    } else {
      stopAmbient();
    }
    return () => stopAmbient();
  }, [ambientPlaying, t.kind]);

  useEffect(() => {
    if (!ambientPlaying) return;
    const id = window.setInterval(() => setAmbientSecs((s) => (s + 1) % 240), 1000);
    return () => window.clearInterval(id);
  }, [ambientPlaying]);

  useEffect(() => {
    setAmbientVolume(vol);
  }, [vol]);

  const handleToggle = () => {
    if (isMusicPlaying) {
      togglePlayPause();
      return;
    }
    if (ambientPlaying) {
      setAmbientPlaying(false);
      return;
    }
    // Start ambient
    setAmbientPlaying(true);
  };

  const handleNext = () => {
    if (isMusicPlaying) {
      nextTrack();
    } else {
      setAmbientIndex((x) => (x + 1) % AMBIENT_TRACKS.length);
      setAmbientSecs(0);
    }
  };

  const handlePrev = () => {
    if (isMusicPlaying) {
      prevTrack();
    } else {
      setAmbientIndex((x) => (x - 1 + AMBIENT_TRACKS.length) % AMBIENT_TRACKS.length);
      setAmbientSecs(0);
    }
  };

  const trackTitle = isMusicPlaying && currentTrack ? currentTrack.name : t.title;
  const trackSub = isMusicPlaying && currentTrack ? currentTrack.artists : t.sub;
  const trackChip = isMusicPlaying ? 'Jukebox' : t.chip;

  const progressPercent = isMusicPlaying
    ? musicProgress
    : (ambientSecs / 240) * 100;

  const currentDisplayTime = isMusicPlaying ? fmt(musicCurrentTime) : fmt(ambientSecs);
  const totalDisplayTime = isMusicPlaying ? fmt(musicDuration) : fmt(240);

  return (
    <Panel area="lofi" tone="iris" delay={480} className="!justify-center py-2 sm:py-2.5 overflow-hidden">
      {/* 56-Bar Animated Equalizer Backdrop */}
      <div className="pointer-events-none absolute inset-x-4 bottom-0 flex h-9 items-end gap-[2px] opacity-25">
        {Array.from({ length: 56 }).map((_, k) => (
          <span
            key={k}
            className={`flex-1 origin-bottom rounded-t bg-gradient-to-t from-blue-600 to-sky-400 ${
              isPlaying ? 'animate-eq' : ''
            }`}
            style={{
              height: `${28 + ((k * 37) % 68)}%`,
              animationDelay: `${(k % 9) * -0.17}s`,
              animationDuration: `${0.7 + (k % 5) * 0.18}s`,
              transform: isPlaying ? undefined : 'scaleY(0.18)',
            }}
          />
        ))}
      </div>

      <div className="relative flex items-center gap-3">
        {/* Spinning Vinyl Record Disc */}
        <div
          onClick={() => setIsPlayerOpen(true)}
          className="relative h-11 w-11 sm:h-12 sm:w-12 shrink-0 cursor-pointer group"
          title="Open Music Player"
        >
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${
              t.grad
            } p-[2px] shadow-[0_8px_20px_-4px_rgba(37,99,235,0.7)] ${
              isPlaying ? 'animate-spin-slow' : ''
            }`}
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-[repeating-radial-gradient(circle,#050811_0_2px,#0F172E_2px_4px)]">
              <div className={`grid h-[38%] w-[38%] place-items-center rounded-full bg-gradient-to-br ${t.grad}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-950" />
              </div>
            </div>
          </div>
          <Music2
            size={12}
            className="absolute -right-1 -bottom-1 rounded-full bg-[#080D1D] p-0.5 text-blue-400 border border-white/10"
          />
        </div>

        {/* Track Info & Scrubber Bar */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3
              onClick={() => setIsPlayerOpen(true)}
              className="font-heading truncate text-xs sm:text-sm font-bold text-slate-800 dark:text-white cursor-pointer hover:text-blue-400 transition-colors"
            >
              {trackTitle}
            </h3>
            <Chip tone="iris" className="shrink-0 text-[8px] py-0 px-1.5">
              {trackChip}
            </Chip>
          </div>
          <p className="truncate text-[10px] font-medium text-blue-500 dark:text-blue-400">
            {trackSub}
          </p>

          {/* Scrubber */}
          <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-mono tabular text-slate-400">
            <span>{currentDisplayTime}</span>
            <div
              onClick={(e) => {
                if (!isMusicPlaying || musicDuration <= 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newPercent = Math.max(0, Math.min(1, clickX / rect.width));
                seek(newPercent * musicDuration);
              }}
              className="well h-2 flex-1 overflow-hidden rounded-full cursor-pointer"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 shadow-[0_0_8px_#2563EB] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>{totalDisplayTime}</span>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={handlePrev}
            aria-label="Previous"
            className="raised tone-iris grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:text-white cursor-pointer"
          >
            <SkipBack size={14} fill="currentColor" />
          </button>
          <button
            onClick={handleToggle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="btn tone-iris !h-10 !w-10 !rounded-full !p-0 cursor-pointer shadow-md"
          >
            {isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={handleNext}
            aria-label="Next"
            className="raised tone-iris grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:text-white cursor-pointer"
          >
            <SkipForward size={14} fill="currentColor" />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="hidden shrink-0 items-center gap-1 text-slate-400 xl:flex">
          <Volume2 size={14} />
          <input
            aria-label="Volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={vol}
            onChange={(e) => setVol(+e.target.value)}
            className="slider w-14 cursor-pointer"
          />
        </div>
      </div>
    </Panel>
  );
}
