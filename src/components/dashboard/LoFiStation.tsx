'use client';

import React, { useEffect, useState } from 'react';
import { Music2, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Chip, Panel } from './ui';
import { useMusic } from '@/context/MusicContext';
import { playAmbient, stopAmbient, setAmbientVolume, type ScapeKind } from '@/lib/ambientAudio';

const AMBIENT_TRACKS: { title: string; sub: string; kind: ScapeKind; chip: string; grad: string }[] = [
  { title: 'Lo-Fi Beats', sub: 'Binaural Lo-Fi Beats', kind: 'binaural', chip: 'ALPHA', grad: 'from-[#8b5cf6] via-[#ec4899] to-[#f59e0b]' },
  { title: 'Ocean Drift', sub: 'Soft Wave Ambience', kind: 'waves', chip: 'WAVES', grad: 'from-[#22d3ee] via-[#8b5cf6] to-[#0A1024]' },
  { title: 'Midnight Rain', sub: 'Rain On The Window', kind: 'rain', chip: 'RAIN', grad: 'from-[#10b981] via-[#22d3ee] to-[#7c3aed]' },
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
  const trackChip = isMusicPlaying ? 'JUKEBOX' : t.chip;

  const progressPercent = isMusicPlaying
    ? musicProgress
    : (ambientSecs / 240) * 100;

  const currentDisplayTime = isMusicPlaying ? fmt(musicCurrentTime) : fmt(ambientSecs);
  const totalDisplayTime = isMusicPlaying ? fmt(musicDuration) : fmt(240);

  return (
    <Panel area="lofi" tone="iris" delay={480} className="!justify-center !py-2 sm:!py-2.5 overflow-hidden h-full relative">
      {/* 56-Bar Animated Equalizer Backdrop - safely contained inside padding */}
      <div className="pointer-events-none absolute inset-x-5 bottom-1 flex h-6 items-end gap-[2px] opacity-25 overflow-hidden">
        {Array.from({ length: 56 }).map((_, k) => (
          <span
            key={k}
            className={`flex-1 origin-bottom rounded-t bg-gradient-to-t from-[#8b5cf6] to-[#ec4899] ${
              isPlaying ? 'animate-eq' : ''
            }`}
            style={{
              height: `${28 + ((k * 37) % 68)}%`,
              animationDelay: `${(k % 9) * -0.17}s`,
              animationDuration: `${0.7 + (k % 5) * 0.18}s`,
              transform: isPlaying ? undefined : 'scaleY(0.25)',
            }}
          />
        ))}
      </div>

      <div className="relative flex items-center gap-2.5 sm:gap-3 w-full min-w-0">
        {/* Spinning Vinyl Record Disc */}
        <div
          onClick={() => setIsPlayerOpen(true)}
          className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 cursor-pointer group"
          title="Open Music Player"
        >
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${
              t.grad
            } p-[2px] shadow-[0_8px_20px_-4px_rgba(139,92,246,0.8)] ${
              isPlaying ? 'animate-spin-slow' : ''
            }`}
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-[repeating-radial-gradient(circle,#05060d_0_2px,#171a38_2px_4px)]">
              <div className={`grid h-[38%] w-[38%] place-items-center rounded-full bg-gradient-to-br ${t.grad}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-black" />
              </div>
            </div>
          </div>
          <Music2
            size={12}
            className="absolute -right-1 -bottom-1 rounded-full bg-[#080D1D] p-0.5 text-[#c4b5fd] border border-white/10"
          />
        </div>

        {/* Track Info & Scrubber Bar */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3
              onClick={() => setIsPlayerOpen(true)}
              className="font-heading truncate text-[clamp(11px,0.92vw,13.5px)] font-bold text-white cursor-pointer hover:text-[#c4b5fd] transition-colors"
            >
              {trackTitle}
            </h3>
            <Chip tone="iris" className="shrink-0 text-[8px] py-0 px-1.5">
              {trackChip}
            </Chip>
          </div>
          <p className="truncate text-[clamp(9px,0.8vw,10.5px)] font-medium text-[#c4b5fd] mt-0.5">
            {trackSub}
          </p>

          {/* Scrubber */}
          <div className="mt-1 flex items-center gap-1.5 text-[clamp(8px,0.75vw,9.5px)] font-mono tabular-nums text-slate-400">
            <span>{currentDisplayTime}</span>
            <div
              onClick={(e) => {
                if (!isMusicPlaying || musicDuration <= 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newPercent = Math.max(0, Math.min(1, clickX / rect.width));
                seek(newPercent * musicDuration);
              }}
              className="well h-1.5 flex-1 overflow-hidden rounded-full cursor-pointer"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] shadow-[0_0_8px_#8b5cf6] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>{totalDisplayTime}</span>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            onClick={handlePrev}
            aria-label="Previous"
            className="raised tone-iris grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl text-slate-400 hover:text-white cursor-pointer"
          >
            <SkipBack size={12} fill="currentColor" />
          </button>
          <button
            onClick={handleToggle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="btn tone-iris !h-8.5 !w-8.5 sm:!h-9.5 sm:!w-9.5 !rounded-full !p-0 cursor-pointer shadow-[0_4px_0_#4c1d95,0_10px_20px_-4px_rgba(139,92,246,0.8)]"
          >
            {isPlaying ? (
              <Pause size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={handleNext}
            aria-label="Next"
            className="raised tone-iris grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl text-slate-400 hover:text-white cursor-pointer"
          >
            <SkipForward size={12} fill="currentColor" />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="hidden shrink-0 items-center gap-1 text-slate-400 2xl:flex">
          <Volume2 size={13} />
          <input
            aria-label="Volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={vol}
            onChange={(e) => setVol(parseFloat(e.target.value))}
            className="slider w-12 xl:w-16 cursor-pointer"
          />
        </div>
      </div>
    </Panel>
  );
}
