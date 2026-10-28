'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HiPlay, HiPause, HiFastForward, HiRewind, HiVolumeUp, HiVolumeOff,
  HiClock, HiPencilAlt, HiLightningBolt, HiCheck, HiPlus,
  HiChevronRight, HiSparkles, HiFire, HiBookmark, HiCode,
  HiCollection, HiRefresh, HiSearch, HiExternalLink,
} from 'react-icons/hi';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useTasksStore } from '@/lib/stores/useTasksStore';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { useNotes } from '@/hooks/useNotes';
import { useMusic } from '@/context/MusicContext';
import { playClick, playSuccess, playXP } from '@/lib/sounds';
import toast from 'react-hot-toast';

// Sound generator using Web Audio API for ambient background layers
class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playRain(volume = 0.15) {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    // Create pink-filtered white noise buffer for rain simulation
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.11;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Lowpass filter to simulate gentle rain
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    noise.start();
    this.noiseNode = noise;
  }

  playBinaural(volume = 0.1) {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    // 40Hz Gamma Focus Frequency: Left ear 200Hz, Right ear 240Hz
    this.osc1 = this.ctx.createOscillator();
    this.osc2 = this.ctx.createOscillator();

    this.osc1.type = 'sine';
    this.osc1.frequency.value = 200;

    this.osc2.type = 'sine';
    this.osc2.frequency.value = 240;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);

    this.osc1.connect(this.gainNode);
    this.osc2.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.osc1.start();
    this.osc2.start();
  }

  stop() {
    try {
      if (this.noiseNode && 'stop' in this.noiseNode) {
        (this.noiseNode as AudioBufferSourceNode).stop();
      }
      if (this.osc1) this.osc1.stop();
      if (this.osc2) this.osc2.stop();
      this.noiseNode = null;
      this.osc1 = null;
      this.osc2 = null;
    } catch {
      // Audio already stopped
    }
  }
}

const ambientEngine = new AmbientSoundEngine();

// Sample notes when user notes are empty
const SAMPLE_NOTES = [
  {
    id: 'sample-1',
    title: 'Algorithms & Complexity: Master Class',
    content: 'Dynamic Programming, asymptotic bounds, Dijkstra, and greedy amortized complexity analysis.',
    tags: ['algorithms', 'cs'],
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'sample-2',
    title: 'Neural Networks & Deep Learning',
    content: 'Backpropagation gradient calculus, transformer self-attention tensors, and AdamW optimization.',
    tags: ['ai', 'math'],
    updatedAt: Date.now() - 86400000,
  },
  {
    id: 'sample-3',
    title: 'Calculus III & Differential Geometry',
    content: 'Stokes theorem, divergence vector calculus, line integrals, and multi-variable optimization.',
    tags: ['calculus', 'physics'],
    updatedAt: Date.now() - 172800000,
  },
];

export default function DashboardBentoGrid() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { gamification, awardXP } = useGamification();
  const tasks = useTasksStore((state) => state.tasks);
  const moveTask = useTasksStore((state) => state.moveTask);
  const { quests, toggleQuest } = useDailyQuests();
  const { notes } = useNotes();
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    nextTrack,
    prevTrack,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    isMuted,
    toggleMute,
  } = useMusic();

  // Active activity tab state: 'timer' | 'task' | 'desk'
  const [activeTab, setActiveTab] = useState<'timer' | 'task' | 'desk'>('task');

  // Ambient soundscape active state: 'none' | 'rain' | 'binaural'
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'binaural'>('none');

  // In-card focus sprint timer state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Fanned notes card hover state
  const [isNotesFanned, setIsNotesFanned] = useState(false);

  // Handle ambient sound toggle
  const toggleAmbientSound = (type: 'rain' | 'binaural') => {
    playClick();
    if (ambientSound === type) {
      ambientEngine.stop();
      setAmbientSound('none');
      toast('Ambient sound paused', { icon: '🔇' });
    } else {
      if (type === 'rain') ambientEngine.playRain();
      if (type === 'binaural') ambientEngine.playBinaural();
      setAmbientSound(type);
      toast.success(type === 'rain' ? '🌧️ Rain soundscape active' : '🎧 40Hz Focus waves active');
    }
  };

  // Timer tick effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playSuccess();
      toast.success('🎉 Focus Sprint Complete! +50 XP awarded!');
      if (awardXP) awardXP(50, 'Focus Sprint Completed');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, awardXP]);

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Top 3 notes to display in the fanned deck
  const displayNotes = useMemo(() => {
    if (notes && notes.length > 0) {
      return notes.slice(0, 3);
    }
    return SAMPLE_NOTES;
  }, [notes]);

  // Top pending task
  const topTask = useMemo(() => {
    const pending = tasks.filter((t) => t.status !== 'done');
    return pending[0] || null;
  }, [tasks]);

  // Complete top task action
  const handleCompleteTask = async () => {
    if (!topTask || !user?.uid) return;
    playXP();
    await moveTask(user.uid, topTask.id, 'done');
    toast.success('Task finished! +35 XP awarded!');
    if (awardXP) awardXP(35, 'Task Finished');
  };

  return (
    <div className="w-full h-full flex flex-col gap-3 sm:gap-3.5 select-none overflow-y-auto pr-0.5 custom-scrollbar">
      {/* =========================================================================
          TOP ROW: 3 Modular Quest / Challenge Cards with Notched Bottom-Right CTAs
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5 flex-shrink-0">
        {/* Card 1: Daily Focus Sprint (Primary Violet #7C3AED) */}
        <div className="relative rounded-[26px] sm:rounded-[30px] bg-white dark:bg-[#111328] border border-indigo-100/90 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-[0_4px_24px_-4px_rgba(124,58,237,0.08)] hover:shadow-[0_8px_32px_-4px_rgba(124,58,237,0.18)] hover:border-primary/50 transition-all group">
          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/15 blur-2xl pointer-events-none" />

          {/* Card Header & Badge */}
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary font-mono">
              ⚡ Challenge 01
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-[10px] font-bold text-primary">
              Focus Sprint
            </span>
          </div>

          {/* Centered Media / Icon Graphic */}
          <div className="flex flex-col items-center justify-center my-3 sm:my-4 z-10 text-center">
            <motion.div
              whileHover={{ scale: 1.1, rotate: -4 }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary text-2xl sm:text-3xl shadow-inner mb-2.5"
            >
              ⏱️
            </motion.div>
            <h3 className="text-sm sm:text-base font-heading font-black text-slate-900 dark:text-white leading-tight">
              25m Focus Block
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Deep work sprint with zero distractions
            </p>
          </div>

          {/* Custom Notched Bottom-Right Pill Action */}
          <div className="flex items-center justify-between pt-2 border-t border-indigo-50 dark:border-white/5 z-10">
            <span className="text-[11px] font-mono font-bold text-tertiary">
              +50 XP
            </span>
            <motion.button
              onClick={() => router.push('/timer')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-light text-white font-semibold text-xs flex items-center gap-1 shadow-md shadow-primary/25 cursor-pointer transition-colors"
            >
              <span>Start Quest</span>
              <HiChevronRight size={14} />
            </motion.button>
          </div>
        </div>

        {/* Card 2: Note Mastery & Flashcards (Amber Gold #FFD166) */}
        <div className="relative rounded-[26px] sm:rounded-[30px] bg-white dark:bg-[#111328] border border-indigo-100/90 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-[0_4px_24px_-4px_rgba(124,58,237,0.08)] hover:shadow-[0_8px_32px_-4px_rgba(124,58,237,0.18)] hover:border-amber-400/50 transition-all group">
          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

          {/* Card Header & Badge */}
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 font-mono">
              📜 Challenge 02
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[10px] font-bold text-amber-600 dark:text-amber-300">
              Scroll Mastery
            </span>
          </div>

          {/* Centered Media / Icon Graphic */}
          <div className="flex flex-col items-center justify-center my-3 sm:my-4 z-10 text-center">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 4 }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 text-2xl sm:text-3xl shadow-inner mb-2.5"
            >
              📖
            </motion.div>
            <h3 className="text-sm sm:text-base font-heading font-black text-slate-900 dark:text-white leading-tight">
              Review Top Scrolls
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Active recall on today&apos;s lecture notes
            </p>
          </div>

          {/* Custom Notched Bottom-Right Pill Action */}
          <div className="flex items-center justify-between pt-2 border-t border-indigo-50 dark:border-white/5 z-10">
            <span className="text-[11px] font-mono font-bold text-amber-500">
              +35 XP
            </span>
            <motion.button
              onClick={() => router.push('/notes')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-white font-semibold text-xs flex items-center gap-1 shadow-md shadow-amber-500/25 cursor-pointer transition-colors"
            >
              <span>Continue</span>
              <HiChevronRight size={14} />
            </motion.button>
          </div>
        </div>

        {/* Card 3: Code Arena & DSA Dungeon (Teal / Emerald #06D6A0) */}
        <div className="relative rounded-[26px] sm:rounded-[30px] bg-white dark:bg-[#111328] border border-indigo-100/90 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-[0_4px_24px_-4px_rgba(124,58,237,0.08)] hover:shadow-[0_8px_32px_-4px_rgba(124,58,237,0.18)] hover:border-teal/50 transition-all group">
          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-teal/15 blur-2xl pointer-events-none" />

          {/* Card Header & Badge */}
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal font-mono">
              ⚔️ Challenge 03
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-teal/10 border border-teal/25 text-[10px] font-bold text-teal">
              DSA Dungeon
            </span>
          </div>

          {/* Centered Media / Icon Graphic */}
          <div className="flex flex-col items-center justify-center my-3 sm:my-4 z-10 text-center">
            <motion.div
              whileHover={{ scale: 1.1, rotate: -4 }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-teal/10 border border-teal/25 flex items-center justify-center text-teal text-2xl sm:text-3xl shadow-inner mb-2.5"
            >
              💻
            </motion.div>
            <h3 className="text-sm sm:text-base font-heading font-black text-slate-900 dark:text-white leading-tight">
              Algorithm Raid
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Solve today&apos;s LeetCode boss battle
            </p>
          </div>

          {/* Custom Notched Bottom-Right Pill Action */}
          <div className="flex items-center justify-between pt-2 border-t border-indigo-50 dark:border-white/5 z-10">
            <span className="text-[11px] font-mono font-bold text-teal">
              +100 XP
            </span>
            <motion.button
              onClick={() => router.push('/dsa')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3.5 py-1.5 rounded-full bg-teal hover:bg-teal-dark text-white font-semibold text-xs flex items-center gap-1 shadow-md shadow-teal/25 cursor-pointer transition-colors"
            >
              <span>Enter Raid</span>
              <HiChevronRight size={14} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM ROW: Left (Main Activity + Slotted Music Dock) & Right (Top 3 Notes)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-3.5 flex-1 min-h-0">
        {/* =====================================================================
            BOTTOM LEFT: Main Activity Canvas + Slotted Music Dock (Spans 2 cols)
            ===================================================================== */}
        <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-3.5 h-full min-h-[360px]">
          {/* Main Display Card: Interactive Activity Canvas */}
          <div className="flex-1 rounded-[26px] sm:rounded-[30px] bg-white dark:bg-[#111328] border border-indigo-100/90 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-[0_4px_24px_-4px_rgba(124,58,237,0.08)]">
            {/* View Tab Switcher Header */}
            <div className="flex items-center justify-between z-10 pb-3 border-b border-indigo-50 dark:border-white/5">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-indigo-50/60 dark:bg-white/[0.04] border border-indigo-100/80 dark:border-white/10">
                <button
                  onClick={() => setActiveTab('task')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'task'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-white'
                  }`}
                >
                  ⚔️ Priority Quest
                </button>
                <button
                  onClick={() => setActiveTab('timer')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'timer'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-white'
                  }`}
                >
                  ⏱️ Focus Sprint
                </button>
                <button
                  onClick={() => setActiveTab('desk')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'desk'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-white'
                  }`}
                >
                  🌸 Lofi Sanctuary
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                <span className="hidden sm:inline font-semibold">Active Session</span>
              </div>
            </div>

            {/* Dynamic View Canvas */}
            <div className="flex-1 flex flex-col items-center justify-center my-3 text-center z-10">
              {activeTab === 'task' && (
                <motion.div
                  key="task"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center max-w-md w-full"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl mb-3 shadow-inner">
                    🎯
                  </div>
                  {topTask ? (
                    <div className="w-full p-4 rounded-2xl bg-indigo-50/40 dark:bg-white/[0.03] border border-indigo-100/90 dark:border-white/10 flex items-center justify-between gap-3 text-left">
                      <div className="min-w-0 flex-1">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-amber-300 uppercase tracking-wide">
                          {topTask.priority || 'High Priority'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">
                          {topTask.title}
                        </h4>
                        <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                          {topTask.description || 'Complete this task to advance your daily quest streak'}
                        </p>
                      </div>
                      <motion.button
                        onClick={handleCompleteTask}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        className="w-10 h-10 rounded-xl bg-tertiary hover:bg-tertiary-dark text-white flex items-center justify-center shadow-md shadow-tertiary/30 cursor-pointer flex-shrink-0"
                        title="Mark Completed"
                      >
                        <HiCheck size={20} />
                      </motion.button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <p className="text-sm font-bold text-slate-900 dark:text-white font-heading">All Quests Completed!</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">Add a new task or embark on a dungeon raid</p>
                      <button
                        onClick={() => router.push('/tasks')}
                        className="mt-3 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <HiPlus size={14} /> Add Quest
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'timer' && (
                <motion.div
                  key="timer"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-slate-900 dark:text-white tabular-nums drop-shadow-sm">
                    {formatTime(timerSeconds)}
                  </div>
                  <p className="text-xs text-primary mt-1 font-semibold uppercase tracking-wider">
                    {isTimerRunning ? '⚡ Focus Mode Active' : 'Idle — Ready to Sprint'}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <motion.button
                      onClick={() => setIsTimerRunning((prev) => !prev)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all ${
                        isTimerRunning
                          ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20'
                          : 'bg-primary hover:bg-primary-light text-white shadow-primary/30'
                      }`}
                    >
                      {isTimerRunning ? <HiPause size={15} /> : <HiPlay size={15} />}
                      <span>{isTimerRunning ? 'Pause' : 'Start Sprint'}</span>
                    </motion.button>
                    <button
                      onClick={() => {
                        setIsTimerRunning(false);
                        setTimerSeconds(25 * 60);
                      }}
                      className="p-2 rounded-full bg-indigo-50 dark:bg-white/10 hover:bg-indigo-100 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Reset 25m Timer"
                    >
                      <HiRefresh size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'desk' && (
                <motion.div
                  key="desk"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center max-w-sm"
                >
                  <div className="text-4xl mb-2">🏮</div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white font-heading">Lofi Study Sanctuary</h4>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Ambient lighting, binaural tones, and peaceful lo-fi beats
                  </p>
                  <button
                    onClick={() => router.push('/reader')}
                    className="mt-3 px-4 py-1.5 rounded-full bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>Open Fullscreen Sanctuary</span>
                    <HiExternalLink size={13} />
                  </button>
                </motion.div>
              )}
            </div>

            {/* Bottom Card Footer */}
            <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] pt-2 border-t border-indigo-50 dark:border-white/5 z-10 font-mono">
              <span>StudyQuest AI Focus Engine</span>
              <span className="text-primary font-bold">60 FPS Smooth Canvas</span>
            </div>
          </div>

          {/* =====================================================================
              MUSIC PLAYER DOCK (Directly slotted underneath the main activity)
              ===================================================================== */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            {/* Audio Control Pill */}
            <div className="flex-1 rounded-2xl sm:rounded-full bg-white dark:bg-[#111328] border border-indigo-100/90 dark:border-white/10 p-2 sm:px-4 sm:py-2 flex items-center justify-between gap-3 shadow-sm select-none">
              {/* Left: Spinning Vinyl / Artwork Thumbnail */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-primary/20 border border-primary/40 flex-shrink-0 flex items-center justify-center ${
                    isPlaying ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: '6s' }}
                >
                  {currentTrack?.image ? (
                    <img src={currentTrack.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base">🎵</span>
                  )}
                </div>

                <div className="flex flex-col truncate min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {currentTrack?.name || 'Lofi Chill Study Beats'}
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)] truncate">
                    {currentTrack?.artists || 'StudyQuest Ambient Audio'}
                  </span>
                </div>
              </div>

              {/* Center: Playback Controls & Interactive Scrub Bar */}
              <div className="hidden sm:flex flex-col items-center flex-1 max-w-xs mx-2">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={prevTrack}
                    className="p-1 rounded-full text-slate-500 hover:text-primary transition-colors cursor-pointer"
                    title="Previous Track"
                  >
                    <HiRewind size={15} />
                  </button>
                  <motion.button
                    onClick={togglePlayPause}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-7 h-7 rounded-full bg-primary hover:bg-primary-light text-white flex items-center justify-center shadow-md shadow-primary/25 cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <HiPause size={14} /> : <HiPlay size={14} className="ml-0.5" />}
                  </motion.button>
                  <button
                    onClick={nextTrack}
                    className="p-1 rounded-full text-slate-500 hover:text-primary transition-colors cursor-pointer"
                    title="Next Track"
                  >
                    <HiFastForward size={15} />
                  </button>
                </div>

                {/* Progress Scrub Bar */}
                <div className="w-full flex items-center gap-1.5 text-[9px] font-mono text-[var(--muted-foreground)]">
                  <span>{formatTime(currentTime || 0)}</span>
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = (e.clientX - rect.left) / rect.width;
                      if (seek && duration) seek(pos * duration);
                    }}
                    className="flex-1 h-1 bg-indigo-100 dark:bg-white/10 rounded-full overflow-hidden cursor-pointer relative group"
                  >
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${duration > 0 ? (currentTime / duration) * 100 : 35}%`,
                      }}
                    />
                  </div>
                  <span>{formatTime(duration || 180)}</span>
                </div>
              </div>

              {/* Mobile Play Button */}
              <div className="sm:hidden flex items-center">
                <motion.button
                  onClick={togglePlayPause}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-xs"
                >
                  {isPlaying ? <HiPause size={16} /> : <HiPlay size={16} className="ml-0.5" />}
                </motion.button>
              </div>

              {/* Right: Volume & Mute Toggle */}
              <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={toggleMute}
                  className="p-1 rounded-full text-slate-500 hover:text-primary transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? <HiVolumeOff size={15} /> : <HiVolumeUp size={15} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                  className="w-16 h-1 bg-indigo-100 dark:bg-white/15 rounded-lg appearance-none cursor-pointer accent-primary"
                  title={`Volume: ${volume}%`}
                />
              </div>
            </div>

            {/* Accompanying Vertical Utility Slot / Ambient Soundscape Action Pill */}
            <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-2xl sm:rounded-full bg-white dark:bg-[#111328] border border-indigo-100/90 dark:border-white/10 shadow-sm">
              <button
                onClick={() => toggleAmbientSound('rain')}
                className={`p-1.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer ${
                  ambientSound === 'rain'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-indigo-50 dark:hover:bg-white/5'
                }`}
                title="Toggle Ambient Rain Soundscape"
              >
                <span>🌧️</span>
                <span className="hidden xl:inline text-[10px] font-bold">Rain</span>
              </button>

              <button
                onClick={() => toggleAmbientSound('binaural')}
                className={`p-1.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer ${
                  ambientSound === 'binaural'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-indigo-50 dark:hover:bg-white/5'
                }`}
                title="Toggle 40Hz Binaural Gamma Focus Waves"
              >
                <span>🎧</span>
                <span className="hidden xl:inline text-[10px] font-bold">40Hz</span>
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            BOTTOM RIGHT: "Top 3 Notes" Card with Stacked / Fanned Deck Effect
            ===================================================================== */}
        <div
          onMouseEnter={() => setIsNotesFanned(true)}
          onMouseLeave={() => setIsNotesFanned(false)}
          className="lg:col-span-1 rounded-[26px] sm:rounded-[30px] bg-white dark:bg-[#111328] border border-indigo-100/90 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-[0_4px_24px_-4px_rgba(124,58,237,0.08)] group"
        >
          {/* Header with Title and Add Button */}
          <div className="flex items-center justify-between pb-3 border-b border-indigo-50 dark:border-white/5 z-20">
            <div className="flex items-center gap-2">
              <span className="text-base">📑</span>
              <h3 className="text-sm sm:text-base font-heading font-black text-slate-900 dark:text-white tracking-wide">
                Top 3 Notes
              </h3>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push('/notes')}
                className="p-1.5 rounded-xl bg-indigo-50 dark:bg-white/5 hover:bg-indigo-100 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors cursor-pointer"
                title="View All Notes"
              >
                <HiSearch size={14} />
              </button>
              <button
                onClick={() => router.push('/notes')}
                className="p-1.5 rounded-xl bg-primary hover:bg-primary-light text-white transition-colors cursor-pointer shadow-xs"
                title="Create New Note"
              >
                <HiPlus size={14} />
              </button>
            </div>
          </div>

          {/* Interactive Stacked / Fanned Card Deck Canvas */}
          <div className="relative flex-1 my-4 flex items-center justify-center min-h-[200px] z-10">
            {displayNotes.map((note, index) => {
              // Rotation angles and offsets for fanned card deck
              const rotations = [-6, 0, 6];
              const fannedRotations = [-12, 0, 12];
              const fannedY = [-20, 0, 20];
              const fannedX = [-15, 0, 15];

              const currentRotation = isNotesFanned
                ? fannedRotations[index] || 0
                : rotations[index] || 0;
              const currentY = isNotesFanned ? fannedY[index] || 0 : index * 8;
              const currentX = isNotesFanned ? fannedX[index] || 0 : 0;
              const zIndex = index + 1;

              return (
                <motion.div
                  key={note.id || index}
                  onClick={() => router.push(`/notes?id=${note.id}`)}
                  animate={{
                    rotate: currentRotation,
                    y: currentY,
                    x: currentX,
                    scale: isNotesFanned ? 1.02 : 1 - (2 - index) * 0.03,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                  }}
                  className={`absolute w-11/12 max-w-[280px] p-3.5 rounded-2xl border transition-all cursor-pointer select-none shadow-xl ${
                    index === 2
                      ? 'bg-white dark:bg-[#111328] border-2 border-primary/50 text-slate-900 dark:text-white shadow-primary/10'
                      : index === 1
                      ? 'bg-slate-50 dark:bg-[#161936] border border-indigo-100 dark:border-white/10 text-slate-800 dark:text-slate-200'
                      : 'bg-slate-100/80 dark:bg-[#1e2244] border border-indigo-100/60 dark:border-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                  style={{ zIndex }}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary dark:text-primary-light font-mono text-[9px] uppercase font-bold">
                      {note.tags?.[0] ? `#${note.tags[0]}` : '#study'}
                    </span>
                    <span className="text-[9px] text-[var(--muted-foreground)] font-mono">
                      Card 0{index + 1}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">
                    {note.title || 'Untitled Scroll'}
                  </h4>

                  <p className="text-[10px] text-[var(--muted-foreground)] line-clamp-2 mt-1 leading-relaxed">
                    {note.content?.replace(/<[^>]+>/g, '') || 'Tap to read full study note...'}
                  </p>

                  <div className="mt-2.5 pt-1.5 border-t border-indigo-50 dark:border-white/5 flex items-center justify-between text-[9px] text-[var(--muted-foreground)] font-mono">
                    <span>Click to open</span>
                    <HiChevronRight size={11} className="text-primary" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer Hint */}
          <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] pt-2 border-t border-indigo-50 dark:border-white/5 z-20">
            <span className="italic text-[10px]">Hover to fan out cards</span>
            <Link
              href="/notes"
              className="text-primary hover:text-primary-light font-semibold flex items-center gap-0.5 text-[11px]"
            >
              <span>Notes Studio</span>
              <HiChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
