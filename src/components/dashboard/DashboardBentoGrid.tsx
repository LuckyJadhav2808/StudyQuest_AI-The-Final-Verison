'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  HiPlay, HiPause, HiFastForward, HiRewind, HiVolumeUp, HiVolumeOff,
  HiClock, HiPencilAlt, HiLightningBolt, HiCheck, HiPlus,
  HiChevronRight, HiSparkles, HiAcademicCap, HiClipboardCheck,
  HiMusicNote, HiExternalLink,
} from 'react-icons/hi';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useTasksStore } from '@/lib/stores/useTasksStore';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { useNotes } from '@/hooks/useNotes';
import { useExams } from '@/hooks/useExams';
import { useMusic } from '@/context/MusicContext';
import { XP_AWARDS } from '@/lib/constants';
import { playClick, playSuccess, playXP } from '@/lib/sounds';
import toast from 'react-hot-toast';
import StudyDeskWidget from '@/components/dashboard/StudyDeskWidget';
import BinauralFocusModal from '@/components/music/BinauralFocusModal';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function DashboardBentoGrid() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { awardXP } = useGamification();

  // ── Authentic Stores & Hooks ─────────────────────────────────
  const { quests, toggleQuest, addQuest, todayCompleted, todayTotal } = useDailyQuests();
  const tasks = useTasksStore((state) => state.tasks);
  const moveTask = useTasksStore((state) => state.moveTask);
  const { notes } = useNotes();
  const { exams } = useExams();
  const {
    currentTrack,
    isPlaying,
    progress,
    currentTime,
    duration,
    isMuted,
    togglePlayPause,
    nextTrack,
    prevTrack,
    toggleMute,
    seek,
    setIsPlayerOpen,
  } = useMusic();

  const [showBinaural, setShowBinaural] = useState(false);
  const [quickQuestText, setQuickQuestText] = useState('');
  const [showAddQuestInput, setShowAddQuestInput] = useState(false);

  // ── Top 3 Real Notes ─────────────────────────────────────────
  const topNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 3);
  }, [notes]);

  // ── Top 3 Real Active Tasks ──────────────────────────────────
  const activeTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done')
      .slice(0, 3);
  }, [tasks]);

  // ── Nearest Real Upcoming Exam / Milestone ───────────────────
  const nextExam = useMemo(() => {
    if (!exams || exams.length === 0) return null;
    const sorted = [...exams].sort((a, b) => a.date - b.date);
    return sorted[0];
  }, [exams]);

  // ── Handlers ────────────────────────────────────────────────
  const handleToggleQuest = async (id: string, wasCompleted: boolean) => {
    try {
      await toggleQuest(id);
      if (!wasCompleted) {
        await awardXP(XP_AWARDS.TASK_COMPLETE, 'Daily quest completed');
        playSuccess();
        toast.success('+25 XP! Quest complete!');
      } else {
        playClick();
      }
    } catch {
      // ignore
    }
  };

  const handleAddQuickQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuestText.trim()) return;
    try {
      await addQuest(quickQuestText.trim());
      setQuickQuestText('');
      setShowAddQuestInput(false);
      playXP();
      toast.success('Quest added!');
    } catch {
      toast.error('Failed to add quest');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      await moveTask(user.uid, taskId, 'done');
      await awardXP(50, 'Task completed');
      playSuccess();
      toast.success('+50 XP! Task completed!');
    } catch {
      toast.error('Failed to update task');
    }
  };

  return (
    <>
      <div className="w-full flex flex-col gap-4 sm:gap-5 pb-6">
        {/* ============================================================
            TOP ROW: 3 Modular Cards with Notched Bottom-Right Action Buttons
            ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* ── CARD 1: Real Daily Quests ────────────────────────────── */}
          <div className="relative overflow-hidden rounded-[26px] bg-white/95 dark:bg-[#111328]/95 border border-indigo-100/90 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(124,58,237,0.08)] p-4 sm:p-5 flex flex-col justify-between min-h-[220px]">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100/80 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
                    <HiLightningBolt size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-heading font-black tracking-wide text-slate-900 dark:text-white">
                      Daily Quests
                    </h3>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      Sync discipline & gain XP
                    </p>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-bold">
                  {todayTotal > 0 ? `${todayCompleted}/${todayTotal}` : 'Ready'}
                </div>
              </div>

              {/* Quest List */}
              <div className="mt-3 space-y-2">
                {showAddQuestInput ? (
                  <form onSubmit={handleAddQuickQuest} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={quickQuestText}
                      onChange={(e) => setQuickQuestText(e.target.value)}
                      placeholder="Add quest title..."
                      autoFocus
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-indigo-50/50 dark:bg-white/5 border border-indigo-100 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 text-xs font-bold bg-primary text-white rounded-xl cursor-pointer hover:bg-primary-hover"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddQuestInput(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                ) : quests.length > 0 ? (
                  quests.slice(0, 3).map((q) => (
                    <div
                      key={q.id}
                      onClick={() => handleToggleQuest(q.id, q.completed)}
                      className="flex items-center justify-between p-2 rounded-xl bg-indigo-50/40 dark:bg-white/[0.04] border border-indigo-100/60 dark:border-white/5 hover:border-primary/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                            q.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-400/60 dark:border-white/20 group-hover:border-primary'
                          }`}
                        >
                          {q.completed && <HiCheck size={12} />}
                        </div>
                        <span
                          className={`text-[11px] truncate ${
                            q.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-700 dark:text-slate-200 group-hover:text-primary font-medium'
                          }`}
                        >
                          {q.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-500 font-bold ml-2 shrink-0">
                        +25 XP
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      No daily quests yet today.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notched Bottom-Right Action Button */}
            <div className="mt-4 flex justify-end">
              <motion.button
                onClick={() => {
                  if (!showAddQuestInput) {
                    setShowAddQuestInput(true);
                  } else {
                    router.push('/habits');
                  }
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl sm:rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold tracking-wide transition-all cursor-pointer shadow-xs"
              >
                <HiPlus size={13} />
                <span>Add Quest</span>
              </motion.button>
            </div>
          </div>

          {/* ── CARD 2: Real Active Tasks / Study Focus Sprint ────────── */}
          <div className="relative overflow-hidden rounded-[26px] bg-white/95 dark:bg-[#111328]/95 border border-indigo-100/90 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(124,58,237,0.08)] p-4 sm:p-5 flex flex-col justify-between min-h-[220px]">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100/80 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-500">
                    <HiClipboardCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-heading font-black tracking-wide text-slate-900 dark:text-white">
                      Active Quests
                    </h3>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      Priority tasks in progress
                    </p>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-300 font-mono text-[10px] font-bold">
                  {tasks.filter((t) => t.status === 'done').length}/{tasks.length} Done
                </div>
              </div>

              {/* Tasks List */}
              <div className="mt-3 space-y-2">
                {activeTasks.length > 0 ? (
                  activeTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleCompleteTask(t.id)}
                      className="flex items-center justify-between p-2 rounded-xl bg-indigo-50/40 dark:bg-white/[0.04] border border-indigo-100/60 dark:border-white/5 hover:border-violet-500/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-4 h-4 rounded-md border border-slate-400/60 dark:border-white/20 group-hover:border-violet-500 flex items-center justify-center transition-colors">
                          <HiCheck size={12} className="opacity-0 group-hover:opacity-100 text-violet-500" />
                        </div>
                        <span className="text-[11px] truncate text-slate-700 dark:text-slate-200 font-medium group-hover:text-violet-400">
                          {t.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-300 font-bold uppercase shrink-0">
                        {t.priority}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      All active quests completed!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notched Bottom-Right Action Button */}
            <div className="mt-4 flex justify-end">
              <motion.button
                onClick={() => router.push('/tasks')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl sm:rounded-2xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-700 dark:text-violet-300 text-[11px] font-bold tracking-wide transition-all cursor-pointer shadow-xs"
              >
                <span>Quest Log</span>
                <HiChevronRight size={13} />
              </motion.button>
            </div>
          </div>

          {/* ── CARD 3: Target Milestone / Exam Countdown ─────────────── */}
          <div className="relative overflow-hidden rounded-[26px] bg-white/95 dark:bg-[#111328]/95 border border-indigo-100/90 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(124,58,237,0.08)] p-4 sm:p-5 flex flex-col justify-between min-h-[220px]">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100/80 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-500">
                    <HiAcademicCap size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-heading font-black tracking-wide text-slate-900 dark:text-white">
                      Target Milestone
                    </h3>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      Upcoming exams & goals
                    </p>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-300 font-mono text-[10px] font-bold">
                  {nextExam ? 'Scheduled' : 'Arena Ready'}
                </div>
              </div>

              {/* Milestone Details */}
              <div className="mt-3">
                {nextExam ? (
                  <div className="p-3 rounded-2xl bg-sky-50/40 dark:bg-sky-500/5 border border-sky-100 dark:border-sky-500/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                        {nextExam.subject || 'Academic Target'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-medium">
                        {new Date(nextExam.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {nextExam.title}
                    </p>
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-sky-600 dark:text-sky-300">
                      <HiClock size={13} />
                      <span>
                        {Math.max(0, Math.ceil((nextExam.date - Date.now()) / (1000 * 60 * 60 * 24)))}{' '}
                        Days Remaining
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-indigo-50/40 dark:bg-white/[0.04] border border-indigo-100/60 dark:border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        Code Arena Challenge
                      </span>
                      <span className="text-[10px] font-mono text-emerald-500 font-bold">
                        Active
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      DSA & Algorithmic Puzzles
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Sharpen problem-solving and test your code live.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notched Bottom-Right Action Button */}
            <div className="mt-4 flex justify-end">
              <motion.button
                onClick={() => router.push(nextExam ? '/exams' : '/ide')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl sm:rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-[11px] font-bold tracking-wide transition-all cursor-pointer shadow-xs"
              >
                <span>{nextExam ? 'Exam Radar' : 'Code Arena'}</span>
                <HiChevronRight size={13} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ============================================================
            BOTTOM ROW: Main Activity + Music Dock (Left) & Top 3 Notes (Right)
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* ── LEFT AREA (8 cols): Main Interactive Sanctuary + Music Dock ── */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Main Interactive Companion Display */}
            <div className="rounded-[28px] sm:rounded-[32px] bg-white/95 dark:bg-[#111328]/95 border border-indigo-100/90 dark:border-white/10 shadow-[0_4px_24px_-4px_rgba(124,58,237,0.12)] p-4 sm:p-6 overflow-hidden relative">
              <StudyDeskWidget />
            </div>

            {/* Docked Music Player Directly Below Sanctuary Canvas */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5 p-2 sm:p-2.5 rounded-[24px] sm:rounded-[28px] bg-white/95 dark:bg-[#111328]/95 border border-indigo-100/90 dark:border-white/10 shadow-md">
              {/* Music Player Strip (Connected to useMusic) */}
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 px-3 py-2 rounded-2xl bg-indigo-50/50 dark:bg-white/[0.04] border border-indigo-100/70 dark:border-white/5">
                {/* Vinyl Album Artwork */}
                <div
                  onClick={() => setIsPlayerOpen(true)}
                  className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 shadow-md cursor-pointer group"
                  title="Open StudyQuest Music Studio"
                >
                  <motion.div
                    className="w-full h-full relative"
                    animate={{ rotate: isPlaying ? 360 : 0 }}
                    transition={{ duration: 5, repeat: isPlaying ? Infinity : 0, ease: 'linear' }}
                  >
                    {currentTrack?.image ? (
                      <img src={currentTrack.image} alt="Vinyl" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white">
                        <HiMusicNote size={18} />
                      </div>
                    )}
                    <div className="absolute inset-0 m-auto w-3.5 h-3.5 rounded-full bg-slate-900 border border-white/30" />
                  </motion.div>
                </div>

                {/* Track Details & Scrubber */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      onClick={() => setIsPlayerOpen(true)}
                      className="text-xs font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-primary transition-colors"
                    >
                      {currentTrack ? currentTrack.name : 'Lo-Fi Study Sanctuary'}
                    </p>
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)] shrink-0">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                    {currentTrack ? currentTrack.artists : 'Offline Binaural & Study Beats'}
                  </p>

                  {/* Scrub Bar */}
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickPos = (e.clientX - rect.left) / rect.width;
                      seek(clickPos * duration);
                    }}
                    className="w-full h-1.5 mt-1.5 rounded-full bg-slate-200 dark:bg-white/10 cursor-pointer overflow-hidden relative group"
                  >
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full relative"
                      style={{ width: `${Math.min(100, Math.max(0, progress || 0))}%` }}
                    />
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={prevTrack}
                    className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Previous Track"
                  >
                    <HiRewind size={15} />
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="w-8 h-8 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <HiPause size={14} /> : <HiPlay size={14} className="ml-0.5" />}
                  </button>

                  <button
                    onClick={nextTrack}
                    className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Next Track"
                  >
                    <HiFastForward size={15} />
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-primary transition-colors cursor-pointer"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <HiVolumeOff size={15} /> : <HiVolumeUp size={15} />}
                  </button>
                </div>
              </div>

              {/* Accompanying Vertical Utility Slot / Action Pill */}
              <div className="flex sm:flex-col items-center justify-center gap-1.5 px-1.5 py-1 sm:py-0 shrink-0">
                <button
                  onClick={() => setShowBinaural(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                  title="Open Binaural Brainwaves"
                >
                  <HiLightningBolt size={12} />
                  <span>Waves</span>
                </button>

                <button
                  onClick={() => setIsPlayerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-indigo-50/70 dark:bg-white/[0.06] hover:bg-primary/10 hover:text-primary border border-indigo-100 dark:border-white/10 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                  title="Launch StudyQuest Music Studio"
                >
                  <HiMusicNote size={12} />
                  <span>Studio</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT AREA (4 cols): Top 3 Notes Fanned Stack ────────── */}
          <div className="lg:col-span-4 rounded-[28px] sm:rounded-[32px] bg-white/95 dark:bg-[#111328]/95 border border-indigo-100/90 dark:border-white/10 shadow-[0_4px_24px_-4px_rgba(124,58,237,0.12)] p-4 sm:p-5 flex flex-col justify-between min-h-[440px]">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100/80 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-pink-500/15 flex items-center justify-center text-pink-500">
                    <HiPencilAlt size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-heading font-black tracking-wide text-slate-900 dark:text-white">
                      Top 3 Notes
                    </h3>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      Quick recall & study scrolls
                    </p>
                  </div>
                </div>

                {/* Add / Explore Notes Button */}
                <motion.button
                  onClick={() => router.push('/notes')}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  className="w-7 h-7 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-300 border border-pink-500/25 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                  title="Create or View Notes"
                >
                  <HiPlus size={14} />
                </motion.button>
              </div>

              {/* Stacked / Fanned Preview Cards Effect */}
              <div className="mt-5 relative h-72 w-full flex items-center justify-center group select-none">
                {topNotes.length > 0 ? (
                  topNotes.map((note, index) => {
                    // Slight fanning rotation angles
                    const rotation = index === 0 ? '-rotate-3' : index === 1 ? 'rotate-2' : '-rotate-1';
                    const zIndex = 30 - index * 10;
                    const translateY = index * 14;

                    return (
                      <motion.div
                        key={note.id}
                        onClick={() => router.push(`/notes?id=${note.id}`)}
                        whileHover={{ scale: 1.04, y: -8, zIndex: 50 }}
                        className={`absolute w-full p-4 rounded-2xl bg-white dark:bg-[#161936] border border-indigo-100 dark:border-white/15 shadow-xl cursor-pointer transition-all ${rotation}`}
                        style={{
                          top: `${translateY}px`,
                          zIndex: zIndex,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-300 font-bold uppercase truncate max-w-[120px]">
                            {note.tags?.[0] || 'Scroll'}
                          </span>
                          <span className="text-[9px] font-mono text-[var(--muted-foreground)]">
                            {note.updatedAt
                              ? new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              : 'Recent'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {note.title || 'Untitled Note'}
                        </h4>

                        <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5 line-clamp-2 leading-relaxed">
                          {note.content
                            ? note.content.replace(/<[^>]+>/g, '').slice(0, 90)
                            : 'No preview available.'}
                        </p>
                      </motion.div>
                    );
                  })
                ) : (
                  <div
                    onClick={() => router.push('/notes')}
                    className="w-full p-6 rounded-2xl border-2 border-dashed border-indigo-100 dark:border-white/10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-500 mb-2">
                      <HiPencilAlt size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      No notes created yet
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                      Click to craft your first study scroll
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Link to Full Notes Library */}
            <div className="pt-3 border-t border-indigo-100/80 dark:border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                {notes.length} Total Scrolls
              </span>
              <button
                onClick={() => router.push('/notes')}
                className="flex items-center gap-1 text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
              >
                <span>All Notes</span>
                <HiChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Binaural Focus Modal */}
      {showBinaural && (
        <BinauralFocusModal
          isOpen={showBinaural}
          onClose={() => setShowBinaural(false)}
        />
      )}
    </>
  );
}
