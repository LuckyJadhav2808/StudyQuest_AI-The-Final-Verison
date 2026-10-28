'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  HiPlay, HiPause, HiFastForward, HiRewind, HiVolumeUp, HiVolumeOff,
  HiClock, HiPencilAlt, HiLightningBolt, HiCheck, HiPlus,
  HiChevronRight, HiSparkles, HiAcademicCap, HiClipboardCheck,
  HiMusicNote, HiOutlineSparkles,
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

  const daysUntilExam = useMemo(() => {
    if (!nextExam) return null;
    return Math.max(0, Math.ceil((nextExam.date - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [nextExam]);

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
      <div className="w-full flex flex-col gap-4 sm:gap-5 pb-6 select-none">
        {/* ============================================================
            TOP ROW: 3 Modular Cards with Sculpted Overlapping Notches
            & Distinct Section Personas (Amber / Violet / Cyan)
            ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* ── CARD 1: Habit & Discipline Engine (Warm Amber Persona) ── */}
          <div className="relative rounded-[28px] sm:rounded-[30px] bg-gradient-to-br from-amber-500/[0.07] via-white/95 to-white/90 dark:from-amber-500/[0.06] dark:via-[#111328]/95 dark:to-[#161936]/95 border-2 border-amber-500/30 dark:border-amber-500/25 shadow-[0_8px_30px_-6px_rgba(245,158,11,0.12)] p-4 sm:p-5 pb-9 sm:pb-10 flex flex-col justify-between min-h-[235px] transition-all hover:border-amber-500/40">
            {/* Ambient Background Aura */}
            <div className="pointer-events-none absolute -top-12 -left-12 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl" />

            <div>
              {/* Header: Amber Icon, Title & Circular Progress Ring */}
              <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 dark:border-amber-500/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-sm">
                    <HiLightningBolt size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-heading font-black tracking-wide text-slate-900 dark:text-white flex items-center gap-1.5">
                      Daily Quests
                    </h3>
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                      Habit & Discipline Engine
                    </p>
                  </div>
                </div>

                {/* Habit Progress Pill */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-bold shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>{todayTotal > 0 ? `${todayCompleted}/${todayTotal}` : 'Active'}</span>
                </div>
              </div>

              {/* Quest List Content */}
              <div className="mt-3.5 space-y-2">
                {showAddQuestInput ? (
                  <form onSubmit={handleAddQuickQuest} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={quickQuestText}
                      onChange={(e) => setQuickQuestText(e.target.value)}
                      placeholder="Add quest title..."
                      autoFocus
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl cursor-pointer shadow-xs"
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
                      className="flex items-center justify-between p-2 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-amber-500/20 dark:border-white/5 hover:border-amber-500/50 transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                            q.completed
                              ? 'bg-amber-500 border-amber-500 text-slate-950 font-black'
                              : 'border-amber-500/40 dark:border-white/20 group-hover:border-amber-400'
                          }`}
                        >
                          {q.completed && <HiCheck size={12} strokeWidth={2} />}
                        </div>
                        <span
                          className={`text-[11px] truncate ${
                            q.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200 group-hover:text-amber-500 dark:group-hover:text-amber-400 font-medium'
                          }`}
                        >
                          {q.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-500 dark:text-amber-400 font-bold ml-2 shrink-0">
                        +25 XP
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-3.5 text-center">
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      No daily quests active. Set your daily goals!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sculpted Notched Overlapping Socket (Bottom Right) */}
            <div className="absolute -bottom-3 right-4 z-20">
              <motion.button
                onClick={() => {
                  if (!showAddQuestInput) {
                    setShowAddQuestInput(true);
                  } else {
                    router.push('/habits');
                  }
                }}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black tracking-wide shadow-md shadow-amber-500/25 border-2 border-white dark:border-[#0B0D17] transition-all cursor-pointer"
              >
                <HiPlus size={13} strokeWidth={2} />
                <span>Add Quest</span>
              </motion.button>
            </div>
          </div>

          {/* ── CARD 2: Mission Sprint Telemetry (Electric Violet Persona) ── */}
          <div className="relative rounded-[28px] sm:rounded-[30px] bg-gradient-to-br from-violet-500/[0.07] via-white/95 to-white/90 dark:from-violet-500/[0.06] dark:via-[#111328]/95 dark:to-[#161936]/95 border-2 border-violet-500/30 dark:border-violet-500/25 shadow-[0_8px_30px_-6px_rgba(139,92,246,0.12)] p-4 sm:p-5 pb-9 sm:pb-10 flex flex-col justify-between min-h-[235px] transition-all hover:border-violet-500/40">
            {/* Ambient Background Aura */}
            <div className="pointer-events-none absolute -top-12 -left-12 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl" />

            <div>
              {/* Header: Violet Icon, Title & Live Pulsing Telemetry Dot */}
              <div className="flex items-center justify-between pb-3 border-b border-violet-500/20 dark:border-violet-500/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-500 shadow-sm">
                    <HiClipboardCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-heading font-black tracking-wide text-slate-900 dark:text-white flex items-center gap-1.5">
                      Active Quests
                    </h3>
                    <p className="text-[10px] text-violet-700/80 dark:text-violet-400/80 font-medium">
                      Mission Sprint Telemetry
                    </p>
                  </div>
                </div>

                {/* Mission Status Badge */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-600 dark:text-violet-300 font-mono text-[10px] font-bold shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{tasks.filter((t) => t.status === 'done').length}/{tasks.length} Done</span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="mt-3.5 space-y-2">
                {activeTasks.length > 0 ? (
                  activeTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleCompleteTask(t.id)}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-violet-500/20 dark:border-white/5 hover:border-violet-500/50 transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-4 h-4 rounded-md border border-violet-500/40 dark:border-white/20 group-hover:border-violet-400 flex items-center justify-center transition-all">
                          <HiCheck size={12} className="opacity-0 group-hover:opacity-100 text-violet-500" strokeWidth={2} />
                        </div>
                        <span className="text-[11px] truncate text-slate-800 dark:text-slate-200 font-medium group-hover:text-violet-500 dark:group-hover:text-violet-400">
                          {t.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-violet-500/15 border border-violet-500/25 text-violet-600 dark:text-violet-300 font-bold uppercase shrink-0">
                        {t.priority}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-3.5 text-center">
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      All mission sprints completed! Ready for new quests.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sculpted Notched Overlapping Socket (Bottom Right) */}
            <div className="absolute -bottom-3 right-4 z-20">
              <motion.button
                onClick={() => router.push('/tasks')}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-violet-600 text-white text-[11px] font-black tracking-wide shadow-md shadow-violet-600/25 border-2 border-white dark:border-[#0B0D17] transition-all cursor-pointer"
              >
                <span>Quest Log</span>
                <HiChevronRight size={13} strokeWidth={2} />
              </motion.button>
            </div>
          </div>

          {/* ── CARD 3: Exam & Horizon Radar (Cyber Cyan Persona) ────── */}
          <div className="relative rounded-[28px] sm:rounded-[30px] bg-gradient-to-br from-sky-500/[0.07] via-white/95 to-white/90 dark:from-sky-500/[0.06] dark:via-[#111328]/95 dark:to-[#161936]/95 border-2 border-sky-500/30 dark:border-sky-500/25 shadow-[0_8px_30px_-6px_rgba(56,189,248,0.12)] p-4 sm:p-5 pb-9 sm:pb-10 flex flex-col justify-between min-h-[235px] transition-all hover:border-sky-500/40">
            {/* Ambient Background Aura */}
            <div className="pointer-events-none absolute -top-12 -left-12 w-32 h-32 rounded-full bg-sky-500/10 blur-2xl" />

            <div>
              {/* Header: Sky Cap Icon, Title & Radar Status */}
              <div className="flex items-center justify-between pb-3 border-b border-sky-500/20 dark:border-sky-500/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-500 shadow-sm">
                    <HiAcademicCap size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-heading font-black tracking-wide text-slate-900 dark:text-white flex items-center gap-1.5">
                      Target Milestone
                    </h3>
                    <p className="text-[10px] text-sky-700/80 dark:text-sky-400/80 font-medium">
                      Exam & Horizon Radar
                    </p>
                  </div>
                </div>

                {/* Radar Active Badge */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300 font-mono text-[10px] font-bold shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                  <span>{nextExam ? 'Locked' : 'Radar Ready'}</span>
                </div>
              </div>

              {/* Milestone Countdown Dial or Arena Challenge */}
              <div className="mt-3.5">
                {nextExam ? (
                  <div className="p-3 rounded-2xl bg-white/60 dark:bg-sky-500/5 border border-sky-500/25 space-y-1.5 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                        {nextExam.subject || 'Target Milestone'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-medium">
                        {new Date(nextExam.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {nextExam.title}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-300 font-mono text-xs font-black">
                        {daysUntilExam} DAYS
                      </div>
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        remaining to deadline
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-sky-500/20 dark:border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                        Daily Code Arena
                      </span>
                      <span className="text-[10px] font-mono text-emerald-500 font-bold">
                        Live Challenge
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      Algorithmic Graph Traversals
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-300 font-mono text-[10px] font-bold">
                        Medium • 30 Min Sprint
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sculpted Notched Overlapping Socket (Bottom Right) */}
            <div className="absolute -bottom-3 right-4 z-20">
              <motion.button
                onClick={() => router.push(nextExam ? '/exams' : '/ide')}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-sky-500 text-slate-950 text-[11px] font-black tracking-wide shadow-md shadow-sky-500/25 border-2 border-white dark:border-[#0B0D17] transition-all cursor-pointer"
              >
                <span>{nextExam ? 'Exam Radar' : 'Code Arena'}</span>
                <HiChevronRight size={13} strokeWidth={2} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ============================================================
            BOTTOM ROW: Jigsaw-Docked Sanctuary & Music Player (Left)
            & 3D Fanned Physical Card Deck (Right)
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* ── LEFT AREA (8 cols): Main Sanctuary Canvas + Interlocking Music Dock ── */}
          <div className="lg:col-span-8 flex flex-col gap-3.5">
            {/* Living Companion Sanctuary Canvas */}
            <div className="rounded-[30px] sm:rounded-[34px] bg-gradient-to-b from-[#111328] via-[#0E1022] to-[#0A0C1A] border-2 border-indigo-400/25 dark:border-white/12 shadow-[0_16px_48px_-12px_rgba(124,58,237,0.18)] p-4 sm:p-6 overflow-hidden relative">
              <StudyDeskWidget />
            </div>

            {/* Jigsaw Interlocking Music Player & Vertical Utility Module */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5 p-2 sm:p-2.5 rounded-[26px] sm:rounded-[28px] bg-white/95 dark:bg-[#111328]/95 border-2 border-indigo-200/80 dark:border-white/12 shadow-md">
              {/* Audio Transport Console */}
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-indigo-50/60 dark:bg-white/[0.04] border border-indigo-100 dark:border-white/5">
                {/* Vinyl Grooved Artwork */}
                <div
                  onClick={() => setIsPlayerOpen(true)}
                  className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 shadow-lg cursor-pointer group"
                  title="Open StudyQuest Music Studio"
                >
                  <motion.div
                    className="w-full h-full relative"
                    animate={{ rotate: isPlaying ? 360 : 0 }}
                    transition={{ duration: 4.5, repeat: isPlaying ? Infinity : 0, ease: 'linear' }}
                  >
                    {currentTrack?.image ? (
                      <img src={currentTrack.image} alt="Vinyl" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white">
                        <HiMusicNote size={18} />
                      </div>
                    )}
                    <div className="absolute inset-0 m-auto w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-white/40" />
                  </motion.div>
                </div>

                {/* Track Title, Artist & Scrubber */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      onClick={() => setIsPlayerOpen(true)}
                      className="text-xs font-black text-slate-900 dark:text-white truncate cursor-pointer hover:text-primary transition-colors"
                    >
                      {currentTrack ? currentTrack.name : 'Lo-Fi Study Sanctuary'}
                    </p>
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)] shrink-0 font-bold">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <p className="text-[10px] text-[var(--muted-foreground)] truncate font-medium">
                    {currentTrack ? currentTrack.artists : 'Offline Binaural & Lo-Fi Beats'}
                  </p>

                  {/* Interactive Scrub Bar */}
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickPos = (e.clientX - rect.left) / rect.width;
                      seek(clickPos * duration);
                    }}
                    className="w-full h-1.5 mt-1.5 rounded-full bg-slate-200 dark:bg-white/10 cursor-pointer overflow-hidden relative group"
                  >
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, progress || 0))}%` }}
                    />
                  </div>
                </div>

                {/* Transport Controls */}
                <div className="flex items-center gap-1 shrink-0">
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

              {/* Accompanying Vertical Utility Module (Jigsaw Docked Beside Audio) */}
              <div className="flex sm:flex-col items-center justify-center gap-1.5 px-2 py-1 sm:py-0 shrink-0">
                <button
                  onClick={() => setShowBinaural(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-primary bg-primary/15 hover:bg-primary/25 border border-primary/30 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
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

          {/* ── RIGHT AREA (4 cols): Tactile 3D Fanned Notes Deck (Rose Persona) ── */}
          <div className="lg:col-span-4 rounded-[30px] sm:rounded-[34px] bg-gradient-to-br from-pink-500/[0.06] via-white/95 to-white/90 dark:from-pink-500/[0.05] dark:via-[#111328]/95 dark:to-[#161936]/95 border-2 border-pink-500/30 dark:border-pink-500/25 shadow-[0_16px_48px_-12px_rgba(236,72,153,0.14)] p-4 sm:p-5 flex flex-col justify-between min-h-[460px] group transition-all">
            <div>
              {/* Header: Carved Title Pill and Circular '+' Button Socket */}
              <div className="flex items-center justify-between pb-3.5 border-b border-pink-500/20 dark:border-pink-500/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-500 shadow-sm">
                    <HiPencilAlt size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-heading font-black tracking-wide text-slate-900 dark:text-white flex items-center gap-1.5">
                      Top 3 Notes
                    </h3>
                    <p className="text-[10px] text-pink-700/80 dark:text-pink-400/80 font-medium">
                      Physical Fanned Deck
                    </p>
                  </div>
                </div>

                {/* Circular Socket '+' Button */}
                <motion.button
                  onClick={() => router.push('/notes')}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.92 }}
                  className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center cursor-pointer shadow-md shadow-pink-500/30 border-2 border-white dark:border-[#0B0D17] transition-all"
                  title="Create New Note"
                >
                  <HiPlus size={15} strokeWidth={2} />
                </motion.button>
              </div>

              {/* 3D Physical Fanned Card Deck (Spreads Out Organically on Hover) */}
              <div className="mt-6 relative h-72 w-full flex items-center justify-center">
                {topNotes.length > 0 ? (
                  topNotes.map((note, index) => {
                    // Staggered physical resting angles & offsets
                    const defaultRotation = index === 0 ? -5 : index === 1 ? 1 : 6;
                    const hoverRotation = index === 0 ? -9 : index === 1 ? 0 : 9;
                    const translateY = index * 16;
                    const hoverTranslateY = index * 26 - 10;
                    const zIndex = 30 - index * 10;

                    return (
                      <motion.div
                        key={note.id}
                        onClick={() => router.push(`/notes?id=${note.id}`)}
                        initial={{ rotate: defaultRotation, y: translateY }}
                        whileHover={{
                          scale: 1.05,
                          y: hoverTranslateY - 10,
                          zIndex: 50,
                          transition: { type: 'spring', stiffness: 350, damping: 20 },
                        }}
                        className={`absolute w-full p-4 rounded-2xl bg-white dark:bg-[#181B3C] border-2 border-pink-500/30 dark:border-pink-500/25 shadow-2xl cursor-pointer transition-shadow`}
                        style={{
                          top: `${translateY}px`,
                          zIndex: zIndex,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-pink-500/15 border border-pink-500/30 text-pink-600 dark:text-pink-300 font-bold uppercase truncate max-w-[120px]">
                            {note.tags?.[0] || 'Study Note'}
                          </span>
                          <span className="text-[9px] font-mono text-[var(--muted-foreground)] font-bold">
                            {note.updatedAt
                              ? new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              : 'Recent'}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {note.title || 'Untitled Scroll'}
                        </h4>

                        <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5 line-clamp-2 leading-relaxed font-medium">
                          {note.content
                            ? note.content.replace(/<[^>]+>/g, '').slice(0, 85)
                            : 'Quick study notes and key formulas...'}
                        </p>
                      </motion.div>
                    );
                  })
                ) : (
                  <div
                    onClick={() => router.push('/notes')}
                    className="w-full p-6 rounded-2xl border-2 border-dashed border-pink-500/30 dark:border-pink-500/20 flex flex-col items-center justify-center text-center cursor-pointer hover:border-pink-500/60 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-500 mb-2">
                      <HiPencilAlt size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      No study scrolls yet
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1 font-medium">
                      Click to craft your first note
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Link to Notes Vault */}
            <div className="pt-3.5 border-t border-pink-500/20 dark:border-pink-500/15 flex items-center justify-between">
              <span className="text-[10px] font-mono text-[var(--muted-foreground)] font-bold">
                {notes.length} Total Scrolls
              </span>
              <button
                onClick={() => router.push('/notes')}
                className="flex items-center gap-1 text-[11px] font-black text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
              >
                <span>View Library</span>
                <HiChevronRight size={13} strokeWidth={2} />
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
