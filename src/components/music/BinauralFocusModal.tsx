'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiPlay, HiPause, HiVolumeUp, HiLightningBolt } from 'react-icons/hi';
import { BINAURAL_PRESETS, BinauralPresetId, binauralSynth } from '@/lib/binauralSynth';

interface BinauralFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BinauralFocusModal({ isOpen, onClose }: BinauralFocusModalProps) {
  const [activePreset, setActivePreset] = useState<BinauralPresetId | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);

  useEffect(() => {
    const status = binauralSynth.getStatus();
    setIsPlaying(status.isPlaying);
    setActivePreset(status.currentPreset);
    setVolume(status.volume);
  }, [isOpen]);

  const togglePreset = (presetId: BinauralPresetId) => {
    if (isPlaying && activePreset === presetId) {
      binauralSynth.stop();
      setIsPlaying(false);
      setActivePreset(null);
    } else {
      binauralSynth.play(presetId);
      setIsPlaying(true);
      setActivePreset(presetId);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    binauralSynth.setVolume(v);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-slate-900/95 border border-purple-500/30 rounded-2xl p-6 shadow-2xl overflow-hidden"
        >
          {/* Ambient background glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <HiLightningBolt size={18} />
              </span>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">
                  Binaural Brainwave Synthesizer
                </h2>
                <p className="text-xs text-slate-400">
                  100% Client-Side Web Audio • Zero Bandwidth • Real Psychoacoustic Frequencies
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <HiX size={20} />
            </button>
          </div>

          {/* Headphones Recommendation Callout */}
          <div className="mt-4 p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs text-purple-200 flex items-center gap-2.5">
            <span className="text-base">🎧</span>
            <span>
              <strong>Headphones Required for Binaural Beats:</strong> Each ear receives a slightly different frequency (e.g. 200Hz & 240Hz), prompting your brain to synchronize to the 40Hz difference.
            </span>
          </div>

          {/* Preset Cards Grid */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
            {BINAURAL_PRESETS.map((preset) => {
              const active = isPlaying && activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => togglePreset(preset.id)}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                    active
                      ? 'bg-purple-900/40 border-purple-400 shadow-lg shadow-purple-900/30 ring-1 ring-purple-400/50'
                      : 'bg-slate-800/40 border-white/10 hover:border-purple-500/40 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-2xl">{preset.emoji}</span>
                    <span
                      className={`p-1.5 rounded-full ${
                        active
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-slate-700/60 text-slate-400 group-hover:text-white'
                      }`}
                    >
                      {active ? <HiPause size={14} /> : <HiPlay size={14} />}
                    </span>
                  </div>

                  <span className="font-bold text-sm text-slate-100 mt-2">
                    {preset.name}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {preset.subtitle}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Master Volume Bar */}
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <HiVolumeUp size={16} />
              <span>Volume</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-xs font-mono text-slate-400 w-9 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
