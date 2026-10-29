'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  HiPlay, HiPause, HiFastForward, HiRewind,
  HiClock, HiLightningBolt, HiCheck, HiPlus,
  HiChevronRight, HiAcademicCap, HiClipboardCheck,
  HiMusicNote, HiSparkles, HiFire, HiPencilAlt
} from 'react-icons/hi';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useTasksStore } from '@/lib/stores/useTasksStore';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { useNotes } from '@/hooks/useNotes';
import { useExams } from '@/hooks/useExams';
import { useMusic } from '@/context/MusicContext';
import { useTimerContext } from '@/context/TimerContext';
import { XP_AWARDS } from '@/lib/constants';
import { playClick, playSuccess, playXP } from '@/lib/sounds';
import toast from 'react-hot-toast';
import BinauralFocusModal from '@/components/music/BinauralFocusModal';
import { useShop } from '@/hooks/useShop';
import TreasureChestModal from '@/components/dashboard/TreasureChestModal';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

const GHOST_SCROLL_STARTERS = [
  { id: 'ghost-1', title: 'Calculus III & Stokes Theorem', tag: 'Mathematics', desc: 'Vector surface integrals & flux divergence theorems' },
  { id: 'ghost-2', title: 'Operating Systems & Concurrency', tag: 'Systems', desc: 'Deadlock avoidance, semaphores & virtual memory paging' },
  { id: 'ghost-3', title: 'Algorithms & Dynamic Programming', tag: 'Computer Science', desc: 'Memoization tables, asymptotic bounds & recurrence trees' },
];

export default function DashboardBentoGrid() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { gamification, xpHistory, awardXP } = useGamification();

  // ── Authentic Stores & Hooks ─────────────────────────────────
  const { quests, toggleQuest, addQuest, todayCompleted, todayTotal } = useDailyQuests();
  const tasks = useTasksStore((state) => state.tasks);
  const moveTask = useTasksStore((state) => state.moveTask);
  const { notes, addNote } = useNotes();
  const { exams } = useExams();
  const {
    currentTrack,
    isPlaying,
    progress,
    currentTime,
    duration,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    setIsPlayerOpen,
  } = useMusic();

  const {
    phase,
    isRunning: isTimerRunning,
    timeLeft,
    totalTime,
    totalFocusToday,
    formattedFocusToday,
    toggleTimer,
    setDurations,
    setTimeLeft,
    setIsRunning: setIsTimerRunning,
  } = useTimerContext();

  const [showBinaural, setShowBinaural] = useState(false);
  const [quickQuestText, setQuickQuestText] = useState('');
  const [showAddQuestInput, setShowAddQuestInput] = useState(false);
  const [showTreasureChest, setShowTreasureChest] = useState(false);
  const { canClaimTreasureChest } = useShop();
  const canClaimChest = canClaimTreasureChest ? canClaimTreasureChest() : false;

  // ── Streak Telemetry & XP Multiplier ────────────────────────
  const streak = gamification?.streak || 1;
  const streakMultiplier = streak > 1 ? (1 + Math.min(0.5, streak * 0.1)).toFixed(1) : null;

  // ── 7-Day Study Velocity Telemetry (100% Dynamic from xpHistory & Focus) ─────
  const { weeklyVelocity, activeDaysCount, consistencyPercent } = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const result = [];
    let activeDays = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayName = days[d.getDay()];
      const isToday = i === 0;

      // Local date string YYYY-MM-DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${date}`;

      const xp = xpHistory?.[dateStr] || 0;
      const isDayActive = isToday ? ((totalFocusToday || 0) > 0 || xp > 0) : xp > 0;
      if (isDayActive) activeDays++;

      // Authentic calculation of height and label (zero fake fallbacks)
      let pct = 10; // sleek minimal baseline indicator
      let label = '0h';

      if (isToday) {
        const todayMins = totalFocusToday || 0;
        if (todayMins > 0) {
          pct = Math.min(100, Math.max(18, Math.round((todayMins / 120) * 100)));
          label = formattedFocusToday || `${todayMins}m`;
        } else if (xp > 0) {
          pct = Math.min(100, Math.max(18, Math.round((xp / 150) * 100)));
          label = `${xp} XP`;
        }
      } else if (xp > 0) {
        pct = Math.min(100, Math.max(18, Math.round((xp / 150) * 100)));
        const estMinutes = Math.round(xp * 0.8);
        label = estMinutes >= 60 ? `${(estMinutes / 60).toFixed(1)}h` : `${estMinutes}m`;
      }

      result.push({
        id: `vel-${dateStr}`,
        day: dayName,
        fullDay: dayName,
        isToday,
        percent: pct,
        label,
        hasActivity: isDayActive,
        xp,
      });
    }

    const consistency = Math.round((activeDays / 7) * 100);
    return {
      weeklyVelocity: result,
      activeDaysCount: activeDays,
      consistencyPercent: consistency,
    };
  }, [xpHistory, totalFocusToday, formattedFocusToday]);

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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const upcoming = exams.filter((e) => {
      const examTime = typeof e.date === 'number' ? e.date : new Date(e.date).getTime();
      return examTime >= todayStart.getTime();
    });

    if (upcoming.length === 0) return null;
    return [...upcoming].sort((a, b) => {
      const aTime = typeof a.date === 'number' ? a.date : new Date(a.date).getTime();
      const bTime = typeof b.date === 'number' ? b.date : new Date(b.date).getTime();
      return aTime - bTime;
    })[0];
  }, [exams]);

  const daysUntilExam = useMemo(() => {
    if (!nextExam) return null;
    const examTime = typeof nextExam.date === 'number' ? nextExam.date : new Date(nextExam.date).getTime();
    return Math.max(0, Math.ceil((examTime - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [nextExam]);

  // Daily Quests completion percentage
  const questProgressPercent = useMemo(() => {
    if (todayTotal === 0) return 0;
    return Math.round((todayCompleted / todayTotal) * 100);
  }, [todayCompleted, todayTotal]);

  // Daily Focus progress towards 120 mins
  const focusGoalPercent = useMemo(() => {
    return Math.min(100, Math.round(((totalFocusToday || 0) / 120) * 100));
  }, [totalFocusToday]);

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

  const handleStartPreset = (minutes: number, label: string) => {
    const seconds = minutes * 60;
    setDurations((prev) => ({ ...prev, focus: seconds }));
    setTimeLeft(seconds);
    setIsTimerRunning(true);
    playXP();
    toast.success(`🚀 ${label} initiated! (${minutes} mins)`);
  };

  const handleCreateFromGhost = async (ghost: typeof GHOST_SCROLL_STARTERS[0]) => {
    try {
      const noteId = await addNote({
        title: ghost.title,
        content: `# ${ghost.title}\n\n*${ghost.desc}*\n\n## Core Concepts\n- Key principle 1\n- Formula reference\n- Exam high-yield summary\n`,
        folder: 'General',
        tags: [ghost.tag.toLowerCase()],
      });
      playXP();
      toast.success('Study scroll crafted!');
      if (noteId) {
        router.push(`/notes?id=${noteId}`);
      } else {
        router.push('/notes');
      }
    } catch {
      router.push('/notes');
    }
  };

  return (
    <>
      <div className="w-full h-auto md:h-full flex flex-col justify-start md:justify-between gap-3 md:gap-2.5 sm:gap-3.5 select-none min-h-fit md:min-h-0">
        {/* ============================================================
            TOP ROW: 3 Streamlined Proportional Cards (flex-[4])
            ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-2.5 sm:gap-3.5 flex-none md:flex-[4] min-h-fit md:min-h-0">
          {/* ── CARD 1: Habit & Discipline Engine (Warm Amber Prismatic Glass) ── */}
          <div className="relative rounded-[24px] sm:rounded-[26px] bg-white/80 dark:bg-[#0B0D1E]/80 backdrop-blur-2xl border border-amber-500/30 dark:border-white/[0.10] hover:border-amber-500/50 dark:hover:border-amber-400/40 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.20)] p-3 sm:p-3.5 flex flex-col justify-between h-auto md:h-full min-h-[145px] md:min-h-0 transition-all overflow-hidden group">
            {/* Ambient Internal Jewel Bloom & Specular Sheen */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-500/12 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/22 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/25 dark:border-amber-500/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-2xs">
                  <HiLightningBolt size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-heading font-black tracking-wide text-slate-900 dark:text-white leading-tight">
                      Daily Quests
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-mono text-[8px] font-bold uppercase tracking-wider">
                      Bounties
                    </span>
                  </div>
                  <p className="text-[9px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                    Habit & Discipline Engine
                  </p>
                </div>
              </div>

              {/* Progress Ring */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-mono text-[9px] font-bold">
                <svg className="w-3.5 h-3.5 -rotate-90 shrink-0" viewBox="0 0 36 36">
                  <path
                    className="text-amber-500/25"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-amber-500 transition-all duration-700 ease-out"
                    strokeDasharray={`${questProgressPercent}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span>{todayTotal > 0 ? `${todayCompleted}/${todayTotal}` : 'Active'}</span>
              </div>
            </div>

            {/* Content List */}
            <div className="min-w-0 flex-1 flex flex-col justify-center py-1.5 gap-1.5 overflow-hidden">
              {showAddQuestInput ? (
                <form onSubmit={handleAddQuickQuest} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={quickQuestText}
                    onChange={(e) => setQuickQuestText(e.target.value)}
                    placeholder="New habit..."
                    autoFocus
                    className="flex-1 bg-white/70 dark:bg-black/30 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-[10px] font-bold shadow-xs cursor-pointer hover:bg-amber-400 transition-colors">
                    Save
                  </button>
                </form>
              ) : quests.length > 0 ? (
                quests.slice(0, 2).map((quest) => (
                  <div key={quest.id} className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-xl bg-white/60 dark:bg-black/30 border border-amber-500/25 dark:border-white/10 hover:border-amber-500/50 hover:bg-white/75 dark:hover:bg-black/45 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all">
                    <span className={`text-[11px] font-bold truncate ${quest.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-amber-100'}`}>
                      {quest.title}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleToggleQuest(quest.id, quest.completed)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        quest.completed
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'border border-amber-500/40 hover:bg-amber-500/20 text-transparent'
                      }`}
                    >
                      <HiCheck size={12} strokeWidth={3} />
                    </motion.button>
                  </div>
                ))
              ) : (
                <div className="p-2 rounded-xl bg-white/40 dark:bg-black/20 border border-amber-500/20 dark:border-white/10">
                  <p className="text-[11px] text-slate-600 dark:text-amber-200/80 font-medium truncate">
                    No active daily quests. Set your habits!
                  </p>
                  <span className="text-[9px] text-amber-600/70 dark:text-amber-400/60 font-mono">
                    Build habits • Earn +25 XP
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Notch Button & Telemetry */}
            <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
              <span className="text-[9px] font-mono text-amber-700/80 dark:text-amber-400/80 font-bold flex items-center gap-1.5">
                <HiFire size={12} className="text-amber-500" />
                <span>{streak}d streak</span>
                {streakMultiplier && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold text-[8px]">
                    {streakMultiplier}x XP
                  </span>
                )}
              </span>
              <motion.button
                onClick={() => setShowAddQuestInput(!showAddQuestInput)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black tracking-wide shadow-xs border border-white/60 dark:border-[#0B0D17] transition-all cursor-pointer hover:bg-amber-400"
              >
                <HiPlus size={11} strokeWidth={3} />
                <span>{showAddQuestInput ? 'Close' : 'Add Quest'}</span>
              </motion.button>
            </div>
          </div>

          {/* ── CARD 2: Active Quests & Mission Sprint (Electric Violet Prismatic Glass) ── */}
          <div className="relative rounded-[24px] sm:rounded-[26px] bg-white/80 dark:bg-[#0B0D1E]/80 backdrop-blur-2xl border border-violet-500/30 dark:border-white/[0.10] hover:border-violet-500/50 dark:hover:border-violet-400/40 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.20)] p-3 sm:p-3.5 flex flex-col justify-between h-auto md:h-full min-h-[145px] md:min-h-0 transition-all overflow-hidden group">
            {/* Ambient Internal Jewel Bloom & Specular Sheen */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-violet-500/12 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/22 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-violet-500/25 dark:border-violet-500/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400 shadow-2xs">
                  <HiClipboardCheck size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-heading font-black tracking-wide text-slate-900 dark:text-white leading-tight">
                      Active Quests
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-600 dark:text-violet-300 font-mono text-[8px] font-bold uppercase tracking-wider">
                      Sprints
                    </span>
                  </div>
                  <p className="text-[9px] text-violet-700/80 dark:text-violet-400/80 font-medium">
                    Mission Sprint Telemetry
                  </p>
                </div>
              </div>

              {/* Status Dot */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-600 dark:text-violet-300 font-mono text-[9px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                <span>{activeTasks.length} Active</span>
              </div>
            </div>

            {/* Content List */}
            <div className="min-w-0 flex-1 flex flex-col justify-center py-1.5 gap-1.5 overflow-hidden">
              {activeTasks.length > 0 ? (
                activeTasks.slice(0, 2).map((task) => {
                  const isHigh = task.priority === 'high';
                  const isMedium = task.priority === 'medium';
                  return (
                    <div key={task.id} className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-xl bg-white/60 dark:bg-black/30 border border-violet-500/25 dark:border-white/10 hover:border-violet-500/50 hover:bg-white/75 dark:hover:bg-black/45 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[8px] font-mono uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded ${
                            isHigh
                              ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                              : isMedium
                              ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                              : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                          }`}>
                            {isHigh ? 'RANK S' : isMedium ? 'RANK A' : 'RANK B'}
                          </span>
                          <span className="text-[8px] font-mono text-violet-400/80 font-bold">
                            +50 XP
                          </span>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleCompleteTask(task.id)}
                        className="w-5 h-5 rounded-md border border-violet-500/40 hover:bg-violet-500/20 flex items-center justify-center text-transparent hover:text-white transition-all shrink-0 cursor-pointer"
                        title="Mark Done (+50 XP)"
                      >
                        <HiCheck size={12} strokeWidth={3} />
                      </motion.button>
                    </div>
                  );
                })
              ) : (
                <div className="p-2 rounded-xl bg-white/40 dark:bg-black/20 border border-violet-500/20 dark:border-white/10">
                  <p className="text-[11px] text-slate-600 dark:text-violet-200/80 font-medium truncate">
                    All mission sprints clear!
                  </p>
                  <span className="text-[9px] text-violet-600/70 dark:text-violet-400/60 font-mono">
                    Ready for new tasks • +50 XP
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Notch Button & Telemetry */}
            <div className="flex items-center justify-between pt-1 border-t border-violet-500/20">
              <span className="text-[9px] font-mono text-violet-700/80 dark:text-violet-400/80 font-bold">
                +50 XP per bounty
              </span>
              <motion.button
                onClick={() => router.push('/tasks')}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-violet-600 text-white text-[10px] font-black tracking-wide shadow-xs border border-white/60 dark:border-[#0B0D17] transition-all cursor-pointer hover:bg-violet-500"
              >
                <span>Quest Log</span>
                <HiChevronRight size={11} strokeWidth={3} />
              </motion.button>
            </div>
          </div>

          {/* ── CARD 3: Target Milestone (Deep Sapphire & Cyan Prismatic Glass) ── */}
          <div className="relative rounded-[24px] sm:rounded-[26px] bg-white/80 dark:bg-[#0B0D1E]/80 backdrop-blur-2xl border border-cyan-500/30 dark:border-white/[0.10] hover:border-cyan-500/50 dark:hover:border-cyan-400/40 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.20)] p-3 sm:p-3.5 flex flex-col justify-between h-auto md:h-full min-h-[145px] md:min-h-0 transition-all overflow-hidden group">
            {/* Ambient Internal Jewel Bloom & Specular Sheen */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-cyan-500/12 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/22 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-cyan-500/25 dark:border-cyan-500/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-2xs">
                  <HiAcademicCap size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-heading font-black tracking-wide text-slate-900 dark:text-white leading-tight">
                      Target Milestone
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-mono text-[8px] font-bold uppercase tracking-wider">
                      Radar
                    </span>
                  </div>
                  <p className="text-[9px] text-cyan-700/80 dark:text-cyan-400/80 font-medium">
                    Exam & Horizon Radar
                  </p>
                </div>
              </div>

              {/* Countdown Badge */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-mono text-[9px] font-bold">
                <span>{daysUntilExam !== null ? `${daysUntilExam}d Horizon` : 'All Clear'}</span>
              </div>
            </div>

            {/* Content Line */}
            <div className="min-w-0 flex-1 flex flex-col justify-center py-1.5 overflow-hidden">
              {nextExam ? (
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/60 dark:bg-black/35 border border-cyan-500/25 dark:border-white/10 space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.25)]">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">
                      {nextExam.subject || nextExam.title}
                    </p>
                    <span className="text-[9px] text-cyan-600 dark:text-cyan-300 font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
                      {daysUntilExam !== null ? `${daysUntilExam}d left` : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-[9px] text-cyan-600/80 dark:text-cyan-300/80 font-mono truncate">
                    Exam Date: {new Date(nextExam.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ) : (
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/60 dark:bg-black/35 border border-cyan-500/25 dark:border-white/10 space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.25)]">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">
                      All Targets Clear
                    </p>
                    <span className="text-[8px] font-mono uppercase text-cyan-600 dark:text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
                      Standby
                    </span>
                  </div>
                  <span className="text-[9px] text-cyan-600/80 dark:text-cyan-300/80 font-mono truncate block">
                    No upcoming exams on horizon • Schedule your next goal
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Notch Button & Telemetry */}
            <div className="flex items-center justify-between pt-1 border-t border-cyan-500/20">
              <span className="text-[9px] font-mono text-cyan-700/80 dark:text-cyan-400/80 font-bold">
                {nextExam ? 'Target Horizon Active' : 'Exam Radar Ready'}
              </span>
              <motion.button
                onClick={() => router.push('/exams')}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 text-[10px] font-black tracking-wide shadow-xs border border-white/60 dark:border-[#0B0D17] transition-all cursor-pointer"
              >
                <span>{nextExam ? 'Exam Radar' : '+ Add Exam'}</span>
                <HiChevronRight size={11} strokeWidth={3} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ============================================================
            BOTTOM ROW: Wireframe Realization (Left Bay 8 cols | Right Bay 4 cols)
            Strict 100vh Zero-Scroll Height (flex-[5] min-h-0)
            ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-2.5 sm:gap-3.5 items-stretch flex-none md:flex-[5] min-h-fit md:min-h-0">
          {/* ==========================================================
              LEFT BAY (8 cols): Deep Work Cockpit (Top) + Study Jukebox (Bottom)
              ========================================================== */}
          <div className="lg:col-span-8 flex flex-col justify-start md:justify-between gap-3 md:gap-2 sm:gap-2.5 h-auto md:h-full min-h-fit md:min-h-0">
            {/* ── UPPER DUAL-CHAMBER BENTO: 2 Golden-Ratio Cards (Flow Station + Study Velocity) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-2 sm:gap-2.5 flex-none md:flex-1 min-h-fit md:min-h-0">
              {/* ── CARD 4A: Compact Flow Station (Circular Countdown Ring + Stacked Presets) ── */}
              <div className="relative rounded-[22px] sm:rounded-[24px] bg-white/80 dark:bg-[#0B0D1E]/80 backdrop-blur-2xl border border-indigo-500/30 dark:border-white/[0.10] hover:border-indigo-500/50 dark:hover:border-indigo-400/40 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.20)] p-3 sm:p-3.5 flex flex-col justify-between h-auto md:h-full min-h-[160px] md:min-h-0 overflow-hidden group transition-all">
                {/* Ambient Internal Jewel Bloom & Specular Sheen */}
                <div className="absolute -top-12 -left-12 w-36 h-36 bg-indigo-500/12 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/22 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-indigo-400/20 dark:border-[#1E2348] shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#7C3AED] flex items-center justify-center text-white shadow-[0_0_12px_rgba(124,58,237,0.5)] shrink-0">
                      <HiClock size={15} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-heading font-black tracking-wide text-slate-900 dark:text-white leading-tight">
                          Flow Station
                        </h3>
                        <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/15 dark:bg-[#191D3C] text-indigo-600 dark:text-[#818CF8] font-mono text-[8px] uppercase font-bold tracking-widest border border-indigo-500/30 dark:border-[#3730A3]/60">
                          {isTimerRunning ? 'Flow' : 'Ready'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-right">
                    <span className="text-[10px] font-mono font-bold text-amber-500 dark:text-[#FBBF24]">
                      {formattedFocusToday || '0m'}
                    </span>
                    <span className="text-[8px] text-slate-400 font-mono"> / 120m</span>
                  </div>
                </div>

                {/* Body: Circular Timer Ring (Left) + 3 Presets (Right) */}
                <div className="flex items-center gap-2.5 py-1.5 flex-1 min-h-0">
                  {/* Left: Interactive Circular Ring */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div
                      onClick={toggleTimer}
                      className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center cursor-pointer group/ring"
                      title={isTimerRunning ? 'Pause Timer' : 'Start Focus Flow'}
                    >
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-indigo-500/20 dark:text-white/10"
                          stroke="currentColor"
                          strokeWidth="3.2"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-indigo-500 dark:text-[#A855F7] transition-all duration-500 ease-out"
                          strokeDasharray={`${isTimerRunning ? Math.round(((totalTime - timeLeft) / (totalTime || 1)) * 100) : focusGoalPercent}, 100`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          strokeWidth="3.2"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 m-auto flex flex-col items-center justify-center text-center">
                        {isTimerRunning ? (
                          <>
                            <span className="text-[11px] font-mono font-black text-indigo-600 dark:text-white leading-tight">
                              {formatTime(timeLeft)}
                            </span>
                            <span className="text-[7px] font-mono text-purple-400 uppercase tracking-widest font-bold">
                              {phase === 'focus' ? 'FOCUS' : 'BREAK'}
                            </span>
                          </>
                        ) : (
                          <motion.div
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-7 h-7 rounded-full bg-indigo-500 dark:bg-[#7C3AED] text-white flex items-center justify-center shadow-md shadow-indigo-500/30 pl-0.5"
                          >
                            <HiPlay size={13} />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: 3 Stacked Preset Chips */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-1 h-full py-0.5">
                    <motion.button
                      onClick={() => handleStartPreset(25, '25m Focus')}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-2 py-1 rounded-lg bg-white/70 dark:bg-[#080B1A]/85 hover:bg-white/90 dark:hover:bg-[#0D1126] border border-indigo-500/20 dark:border-[#1E2348] hover:border-indigo-500/50 flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                    >
                      <span className="text-[10px] font-black text-indigo-600 dark:text-[#60A5FA] group-hover:text-primary leading-none">
                        25m Focus
                      </span>
                      <span className="text-[8px] text-slate-400 font-mono">5m Break</span>
                    </motion.button>

                    <motion.button
                      onClick={() => handleStartPreset(50, '50m Deep')}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-2 py-1 rounded-lg bg-white/70 dark:bg-[#080B1A]/85 hover:bg-white/90 dark:hover:bg-[#0D1126] border border-purple-500/20 dark:border-[#1E2348] hover:border-purple-500/50 flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                    >
                      <span className="text-[10px] font-black text-purple-600 dark:text-[#C084FC] group-hover:text-primary leading-none">
                        50m Deep
                      </span>
                      <span className="text-[8px] text-slate-400 font-mono">Flow State</span>
                    </motion.button>

                    <motion.button
                      onClick={() => handleStartPreset(15, '15m Sprint')}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-2 py-1 rounded-lg bg-white/70 dark:bg-[#080B1A]/85 hover:bg-white/90 dark:hover:bg-[#0D1126] border border-pink-500/20 dark:border-[#1E2348] hover:border-pink-500/50 flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                    >
                      <span className="text-[10px] font-black text-pink-600 dark:text-[#F472B6] group-hover:text-pink-500 leading-none">
                        15m Sprint
                      </span>
                      <span className="text-[8px] text-slate-400 font-mono">Revision</span>
                    </motion.button>
                  </div>
                </div>

                {/* Footer Progress Bar */}
                <div className="space-y-1 pt-1 border-t border-indigo-400/15 dark:border-[#1E2348] shrink-0">
                  <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 dark:text-[#8A95C7]">
                    <span>Daily Focus Goal</span>
                    <span className="text-indigo-600 dark:text-indigo-300 font-bold">{focusGoalPercent}% • +150 XP</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#080A16] overflow-hidden border border-indigo-100 dark:border-[#1E2348]/60 relative">
                    <div
                      className="h-full bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] relative"
                      style={{ width: `${Math.max(4, focusGoalPercent)}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#EC4899]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── CARD 4B: Weekly Study Velocity & Heatmap (7-Day Momentum Bar Chart) ── */}
              <div className="relative rounded-[22px] sm:rounded-[24px] bg-white/80 dark:bg-[#0B0D1E]/80 backdrop-blur-2xl border border-emerald-500/30 dark:border-white/[0.10] hover:border-emerald-500/50 dark:hover:border-emerald-400/40 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.20)] p-3 sm:p-3.5 flex flex-col justify-between h-auto md:h-full min-h-[175px] md:min-h-0 overflow-hidden group transition-all">
                {/* Ambient Internal Jewel Bloom & Specular Sheen */}
                <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/12 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/22 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-emerald-400/20 dark:border-[#163636] shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)] shrink-0 font-bold">
                      <HiSparkles size={14} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-heading font-black tracking-wide text-slate-900 dark:text-white leading-tight">
                          Study Velocity
                        </h3>
                        <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 dark:bg-[#0E2825] text-emerald-600 dark:text-emerald-400 font-mono text-[8px] uppercase font-bold tracking-wider border border-emerald-500/30">
                          7D Momentum
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    <HiFire size={12} className="text-amber-500" />
                    <span>{streak}d streak</span>
                    {streakMultiplier && (
                      <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold text-[8px]">
                        {streakMultiplier}x
                      </span>
                    )}
                  </div>
                </div>

                {/* Body: 7-Day Velocity Bars */}
                <div className="flex items-end justify-between gap-1.5 py-1.5 flex-1 min-h-0 px-1">
                  {weeklyVelocity.map((col) => (
                    <div key={col.id} className="relative flex flex-col items-center flex-1 h-full justify-end group/bar cursor-pointer">
                      {/* Precision Floating Tooltip */}
                      <div className="absolute -top-7 px-1.5 py-0.5 rounded-md bg-slate-950/95 border border-emerald-500/35 text-[8px] font-mono font-bold text-emerald-300 shadow-lg pointer-events-none z-30 transition-all duration-200 opacity-0 group-hover/bar:opacity-100 -translate-y-1 group-hover/bar:translate-y-0 whitespace-nowrap">
                        {col.label}
                      </div>

                      {/* Slender Vertical Pillar Track */}
                      <div className="w-3 sm:w-3.5 max-w-[14px] h-16 sm:h-20 rounded-full bg-slate-200/50 dark:bg-black/45 border border-emerald-500/20 dark:border-white/10 relative flex flex-col justify-end p-0.5 overflow-hidden transition-all group-hover/bar:border-emerald-400/50 group-hover/bar:shadow-[0_0_8px_rgba(16,185,129,0.25)] mx-auto">
                        <div
                          className={`w-full rounded-full transition-all duration-700 ${
                            col.isToday
                              ? 'bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                              : col.hasActivity
                              ? 'bg-gradient-to-t from-emerald-500/80 to-teal-400/70'
                              : 'bg-slate-400/25 dark:bg-white/10'
                          }`}
                          style={{ height: `${col.percent}%` }}
                        >
                          {col.isToday && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#10B981] mx-auto mb-0.5 animate-pulse" />
                          )}
                        </div>
                      </div>

                      {/* 3-Letter Day Label */}
                      <span className={`text-[8px] font-mono font-bold mt-1.5 leading-none transition-colors ${
                        col.isToday ? 'text-emerald-500 dark:text-teal-300' : 'text-slate-400 group-hover/bar:text-slate-200'
                      }`}>
                        {col.day}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Dynamic Telemetry Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-emerald-400/15 dark:border-[#163636] shrink-0 text-[8px] font-mono">
                  <span className="text-slate-500 dark:text-emerald-200/80 font-medium">
                    {formattedFocusToday || '0m'} today • Level {gamification?.level || 1}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {consistencyPercent}% Consistency • {activeDaysCount}/7 Days Active
                  </span>
                </div>
              </div>
            </div>

            {/* ── LOWER CHAMBER: Divided Jukebox (50%) + Daily Treasure Vault (50%) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-2.5 shrink-0 h-auto sm:h-[64px]">
              {/* ── CARD 5A: Compact Study Jukebox Console (6 cols / 50% width) ── */}
              <div className="relative sm:col-span-6 h-[58px] sm:h-full rounded-[18px] sm:rounded-[20px] bg-white/80 dark:bg-[#0B0D1E]/80 backdrop-blur-2xl border border-purple-500/30 dark:border-white/[0.10] hover:border-purple-500/50 dark:hover:border-purple-400/40 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.20)] px-2.5 py-1.5 sm:px-3 flex items-center justify-between gap-2 text-white transition-all overflow-hidden group">
                {/* Ambient Internal Jewel Bloom & Specular Sheen */}
                <div className="absolute -top-10 -left-10 w-28 h-28 bg-purple-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/25 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Left: Vinyl Disc + Track Name */}
                <div className="flex items-center gap-2 min-w-0 max-w-[130px] sm:max-w-[150px] shrink-0">
                  <div
                    onClick={() => setIsPlayerOpen(true)}
                    className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden shrink-0 shadow-md cursor-pointer group"
                    title="Open Music Studio"
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
                          <HiMusicNote size={13} />
                        </div>
                      )}
                      <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-slate-950 border border-white/60 shadow-[inset_0_0_3px_rgba(255,255,255,0.8)]" />
                    </motion.div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p
                        onClick={() => setIsPlayerOpen(true)}
                        className="text-[11px] sm:text-xs font-bold text-white truncate cursor-pointer hover:text-primary transition-colors leading-tight"
                      >
                        {currentTrack ? currentTrack.name : 'Lo-Fi Sanctuary'}
                      </p>
                      {isPlaying && (
                        <span className="flex items-end gap-0.5 h-2 shrink-0 text-pink-400">
                          <span className="w-0.5 h-1.5 bg-pink-400 rounded-full animate-bounce" />
                          <span className="w-0.5 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                          <span className="w-0.5 h-1 bg-pink-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[8px] text-purple-300/80 truncate leading-none mt-0.5">
                      {currentTrack ? currentTrack.artists : 'Binaural Lo-Fi Beats'}
                    </p>
                  </div>
                </div>

                {/* Center: Transport Controls & Mini Scrubber */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={prevTrack}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                      title="Previous Track"
                    >
                      <HiRewind size={11} />
                    </button>

                    <motion.button
                      onClick={togglePlayPause}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-6.5 h-6.5 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30 transition-all cursor-pointer"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <HiPause size={11} /> : <HiPlay size={11} className="ml-0.5" />}
                    </motion.button>

                    <button
                      onClick={nextTrack}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                      title="Next Track"
                    >
                      <HiFastForward size={11} />
                    </button>
                  </div>

                  {/* Compact Scrubber slider bar */}
                  <div className="flex-1 flex items-center gap-1.5 min-w-0">
                    <div
                      onClick={(e) => {
                        if (duration <= 0) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const newPercent = Math.max(0, Math.min(1, clickX / rect.width));
                        seek(newPercent * duration);
                      }}
                      className="flex-1 h-1.5 bg-white/10 hover:h-2 rounded-full cursor-pointer relative transition-all group overflow-hidden"
                    >
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-mono text-slate-400 shrink-0">
                      {formatTime(currentTime)}
                    </span>
                  </div>
                </div>

                {/* Right: Waves Pill */}
                <button
                  onClick={() => setShowBinaural(true)}
                  className="px-2 py-1 rounded-lg text-[8px] font-bold text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 backdrop-blur-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  title="Open Offline Binaural Waves"
                >
                  <span>⚡</span>
                  <span className="hidden sm:inline">Waves</span>
                </button>
              </div>

              {/* ── CARD 5B: Daily Treasure Vault & Streak Shield (6 cols / 50% width) ── */}
              <div className="relative sm:col-span-6 h-[58px] sm:h-full rounded-[18px] sm:rounded-[20px] bg-white/80 dark:bg-[#0B0D1E]/80 backdrop-blur-2xl border border-amber-500/30 dark:border-white/[0.10] hover:border-amber-500/50 dark:hover:border-amber-400/40 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.20)] px-2.5 py-1.5 sm:px-3 flex items-center justify-between gap-2 text-slate-900 dark:text-white transition-all overflow-hidden group">
                {/* Ambient Internal Jewel Bloom & Specular Sheen */}
                <div className="absolute -top-10 -left-10 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/25 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Left: Glowing Chest Jewel + Checkmark Overlay if Claimed */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                      canClaimChest
                        ? 'bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.55)] animate-pulse'
                        : 'bg-gradient-to-tr from-amber-500/40 via-amber-400/30 to-yellow-300/20 text-slate-950/80 shadow-xs'
                    }`}>
                      🎁
                    </div>
                    {!canClaimChest && (
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xs border border-white/40">
                        <HiCheck size={9} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Center: Unclippable Typography & Status Badge */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[11px] sm:text-xs font-heading font-black tracking-tight leading-tight truncate">
                        Daily Chest
                      </h4>
                      <span className={`px-1.5 py-0.5 rounded-full font-mono text-[7px] uppercase font-bold tracking-wider border shrink-0 flex items-center gap-0.5 ${
                        canClaimChest
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}>
                        {canClaimChest ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                            <span>Ready</span>
                          </>
                        ) : (
                          <>
                            <HiCheck size={9} strokeWidth={3} />
                            <span>Claimed</span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className={`text-[8px] sm:text-[9px] font-mono truncate mt-0.5 font-bold ${
                      canClaimChest ? 'text-amber-700/80 dark:text-amber-300/80' : 'text-slate-500 dark:text-emerald-400/80'
                    }`}>
                      {canClaimChest ? 'Free Daily Roll • Coins & XP' : 'Claimed today • Resets 00:00'}
                    </p>
                  </div>
                </div>

                {/* Right: Claim / View Loot Button */}
                <motion.button
                  onClick={() => setShowTreasureChest(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-[9px] font-black tracking-wide shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    canClaimChest
                      ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)] hover:brightness-110'
                      : 'bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/10 hover:border-emerald-500/30'
                  }`}
                  title={canClaimChest ? 'Claim Daily Treasure Chest' : 'View Treasure Chest Loot'}
                >
                  <span>{canClaimChest ? 'Claim' : 'Loot'}</span>
                  {canClaimChest ? <span className="text-[10px]">✨</span> : <HiCheck size={10} className="text-emerald-400" />}
                </motion.button>
              </div>
            </div>
          </div>

          {/* ==========================================================
              RIGHT BAY (4 cols): Full-Height Top 3 Notes (Diagonally Stacked)
              ========================================================== */}
          <div className="relative lg:col-span-4 h-auto md:h-full min-h-[230px] md:min-h-0 rounded-[22px] sm:rounded-[24px] bg-white/80 dark:bg-[#0B0D1E]/80 backdrop-blur-2xl border border-pink-500/30 dark:border-white/[0.10] hover:border-pink-500/50 dark:hover:border-pink-400/40 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.20)] p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden transition-all group">
            {/* Ambient Internal Jewel Bloom & Specular Sheen */}
            <div className="absolute -top-14 -left-14 w-40 h-40 bg-pink-500/12 rounded-full blur-2xl pointer-events-none group-hover:bg-pink-500/22 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-pink-500/20 dark:border-pink-500/15 z-20 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-6.5 h-6.5 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-2xs">
                  <HiPencilAlt size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-heading font-black tracking-wide text-slate-900 dark:text-white leading-tight">
                    Top 3 Notes
                  </h3>
                  <p className="text-[9px] text-pink-700/80 dark:text-pink-400/80 font-medium">
                    Diagonally Stacked Deck
                  </p>
                </div>
              </div>

              <motion.button
                onClick={() => router.push('/notes')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-5.5 h-5.5 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-xs cursor-pointer"
                title="Create Note"
              >
                <HiPlus size={12} />
              </motion.button>
            </div>

            {/* Middle Body: 3D Diagonally Stacked Cards Stage */}
            <div className="relative flex-1 min-h-[150px] md:min-h-0 w-full overflow-hidden flex items-center justify-center py-2 md:py-1">
              {(() => {
                // Combine real notes with ghost starters to always guarantee 3 fanned cards
                const displayItems = [
                  ...topNotes.map((n) => ({
                    id: n.id,
                    title: n.title || 'Untitled Scroll',
                    tag: n.folder || 'Vault',
                    date: new Date(n.updatedAt || n.createdAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
                    isGhost: false,
                    ghostData: null,
                  })),
                  ...GHOST_SCROLL_STARTERS.map((g) => ({
                    id: g.id,
                    title: g.title,
                    tag: g.tag,
                    date: 'Template',
                    isGhost: true,
                    ghostData: g,
                  })),
                ].slice(0, 3);

                // Diagonal cascade positions (top-left to bottom-right fan)
                const stackVariants = [
                  {
                    rest: { x: -28, y: -26, rotate: -8, scale: 0.92, zIndex: 10 },
                    hover: { x: -28, y: -38, rotate: 0, scale: 1.05, zIndex: 45, transition: { type: 'spring' as const, stiffness: 350, damping: 25 } },
                  },
                  {
                    rest: { x: -2, y: -2, rotate: -1, scale: 0.96, zIndex: 20 },
                    hover: { x: -2, y: -16, rotate: 0, scale: 1.05, zIndex: 45, transition: { type: 'spring' as const, stiffness: 350, damping: 25 } },
                  },
                  {
                    rest: { x: 24, y: 22, rotate: 6, scale: 1.0, zIndex: 30 },
                    hover: { x: 24, y: 8, rotate: 0, scale: 1.05, zIndex: 45, transition: { type: 'spring' as const, stiffness: 350, damping: 25 } },
                  },
                ];

                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {displayItems.map((item, idx) => {
                      const variant = stackVariants[idx] || stackVariants[2];

                      return (
                        <motion.div
                          key={item.id}
                          initial={variant.rest}
                          animate={variant.rest}
                          whileHover={variant.hover}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (item.isGhost && item.ghostData) {
                              handleCreateFromGhost(item.ghostData);
                            } else {
                              playClick();
                              router.push(`/notes?id=${item.id}`);
                            }
                          }}
                          className="absolute w-[84%] max-w-[250px] p-2.5 rounded-2xl bg-white/90 dark:bg-[#151733]/90 backdrop-blur-md border border-pink-400/40 dark:border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.14),inset_0_1px_1.5px_rgba(255,255,255,0.4)] hover:border-pink-500 hover:shadow-[0_12px_32px_rgba(236,72,153,0.35)] cursor-pointer transition-colors group select-none overflow-hidden"
                          style={{ zIndex: variant.rest.zIndex }}
                        >
                          {/* Specular Holographic Sheen on Top-Left Corner */}
                          <div className="absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-80" />

                          <div className="flex items-center justify-between gap-1 mb-1 relative z-10">
                            <span className="text-[8px] font-mono uppercase font-black px-1.5 py-0.2 rounded bg-pink-500/15 text-pink-600 dark:text-pink-300 border border-pink-500/20">
                              {item.tag}
                            </span>
                            <span className="text-[8px] font-mono text-slate-400 font-semibold">
                              {item.date}
                            </span>
                          </div>

                          <p className="text-[11px] font-heading font-black text-slate-900 dark:text-white truncate group-hover:text-pink-500 dark:group-hover:text-pink-300 transition-colors leading-snug relative z-10">
                            {item.title}
                          </p>

                          <div className="flex items-center justify-between mt-1 text-[8px] font-mono text-slate-500 dark:text-slate-400 relative z-10">
                            <span>{item.isGhost ? '+ Click to Start' : 'Scroll Vault'}</span>
                            <span className="text-pink-500 font-bold group-hover:translate-x-0.5 transition-transform">➔</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Bottom Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-pink-500/20 dark:border-white/5 z-20 shrink-0">
              <span className="text-[8px] font-mono text-slate-400">
                {notes.length} Scrolls Available
              </span>
              <button
                onClick={() => router.push('/notes')}
                className="text-[8px] font-bold text-pink-500 dark:text-pink-300 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View All</span>
                <HiChevronRight size={9} />
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

      {/* Daily Treasure Chest Modal */}
      {showTreasureChest && (
        <TreasureChestModal
          isOpen={showTreasureChest}
          onClose={() => setShowTreasureChest(false)}
        />
      )}
    </>
  );
}
