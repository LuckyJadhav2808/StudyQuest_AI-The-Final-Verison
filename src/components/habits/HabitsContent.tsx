'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus,
  HiTrash,
  HiFire,
  HiCheck,
  HiCalendar,
  HiChevronDown,
  HiChevronUp,
  HiSparkles,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useHabits } from '@/hooks/useHabits';
import { useGamification } from '@/hooks/useGamification';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { XP_AWARDS } from '@/lib/constants';
import { playSuccess } from '@/lib/sounds';
import { spawnXPFromEvent } from '@/components/gamification/FloatingXP';
import { getLocalDateString, getLocalYesterdayDateString } from '@/lib/dateUtils';

const HABIT_COLORS = [
  '#7C3AED', '#EC4899', '#10B981', '#FF6B6B', '#FFD166',
  '#4CC9F0', '#FF85A1', '#B5E48C', '#06D6A0', '#A78BFA',
];

const HABIT_ICONS = ['💪', '📚', '🧘', '🏃', '💧', '🎯', '✍️', '🧠', '😴', '🥗', '🎵', '🌅'];

function getStreakForHabit(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;
  const sorted = [...completedDates].sort().reverse();
  const today = getLocalDateString();
  const yesterday = getLocalYesterdayDateString();
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const curr = new Date(sorted[i] + 'T12:00:00');
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return streak;
}

// Generate last N days for heatmap (oldest to newest, so Today is the last index)
function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(getLocalDateString(d));
  }
  return days;
}

// Helper to get day-of-week initial (S, M, T, W, T, F, S)
function getDayInitial(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
  } catch {
    return '';
  }
}

export default function HabitsContent() {
  const { habits, loading, addHabit, toggleDate, deleteHabit } = useHabits();
  const { awardXP } = useGamification();
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('💪');
  const [newColor, setNewColor] = useState(HABIT_COLORS[0]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedHabits, setExpandedHabits] = useState<Record<string, boolean>>({});

  const [today, setToday] = useState(getLocalDateString());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentToday = getLocalDateString();
      if (currentToday !== today) {
        setToday(currentToday);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [today]);

  const last30 = useMemo(() => getLastNDays(30), [today]);
  const last7 = useMemo(() => getLastNDays(7), [today]);

  const toggleExpand = (habitId: string) => {
    setExpandedHabits((prev) => ({
      ...prev,
      [habitId]: !prev[habitId],
    }));
  };

  const handleAddHabit = async () => {
    if (!newTitle.trim()) return;
    await addHabit({ title: newTitle.trim(), icon: newIcon, color: newColor });
    toast.success('Habit quest created! 💪');
    setNewTitle('');
    setNewIcon('💪');
    setNewColor(HABIT_COLORS[0]);
    setShowModal(false);
  };

  const handleToggleToday = async (habitId: string, isCompleted: boolean, event?: React.MouseEvent) => {
    await toggleDate(habitId, today);
    if (!isCompleted) {
      await awardXP(XP_AWARDS.HABIT_CHECKED, 'Daily habit quest completed');
      playSuccess();
      spawnXPFromEvent(XP_AWARDS.HABIT_CHECKED, event);
      toast.success('+10 XP! Quest Completed! ⚡');
    }
  };

  // Stats
  const todayComplete = habits.filter((h) => h.completedDates.includes(today)).length;
  const todayTotal = habits.length;
  const progressPercent = todayTotal > 0 ? Math.round((todayComplete / todayTotal) * 100) : 0;

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-[var(--foreground)]">
                Daily Quests
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
                <HiSparkles className="w-3.5 h-3.5" />
                Streak System
              </span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Complete daily rituals, build unshakeable discipline, and level up your character.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<HiPlus className="w-5 h-5" />}
            onClick={() => setShowModal(true)}
            className="shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all min-h-[44px]"
          >
            New Quest
          </Button>
        </div>

        {/* Today's Progress Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--card-bg)]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl shadow-black/10">
          <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Today&apos;s Rituals
                </span>
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {progressPercent}% Complete
                </span>
              </div>
              <Badge
                variant={todayComplete >= todayTotal && todayTotal > 0 ? 'teal' : 'primary'}
                size="md"
                className="font-mono tabular-nums"
              >
                {todayComplete} / {todayTotal} Quests
              </Badge>
            </div>

            {/* Glowing Custom Progress Bar */}
            <div className="h-3 w-full rounded-full bg-slate-800/60 dark:bg-black/40 overflow-hidden p-0.5 border border-white/5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-teal-400 shadow-md shadow-indigo-500/40"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              />
            </div>

            {/* Motivational message */}
            <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] pt-0.5">
              {todayComplete >= todayTotal && todayTotal > 0 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <HiSparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  All quests complete! Outstanding discipline today! (+{XP_AWARDS.HABIT_CHECKED * todayTotal} XP earned)
                </span>
              ) : todayTotal > 0 ? (
                <span>
                  {todayTotal - todayComplete} {todayTotal - todayComplete === 1 ? 'quest' : 'quests'} remaining to protect your active streaks.
                </span>
              ) : (
                <span>Create your first habit quest below to start your streak journey.</span>
              )}

              <span className="hidden sm:inline-block font-mono text-[11px] text-slate-400">
                +10 XP per completion
              </span>
            </div>
          </div>
        </div>

        {/* Habit List */}
        {habits.length === 0 && !loading ? (
          <Card padding="lg" hover={false} className="border-dashed border-2">
            <EmptyState
              icon="⚡"
              title="No habit quests created yet"
              description="Establish daily study habits, hydration, coding exercises, or reading routines to unlock achievements."
              action={
                <Button
                  variant="primary"
                  icon={<HiPlus />}
                  onClick={() => setShowModal(true)}
                  className="min-h-[44px]"
                >
                  Create First Habit
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {habits.map((habit, index) => {
              const isCompletedToday = habit.completedDates.includes(today);
              const streak = getStreakForHabit(habit.completedDates);
              const isExpanded = !!expandedHabits[habit.id];
              const completedLast30Count = habit.completedDates.filter((d) => last30.includes(d)).length;
              const consistencyRate = Math.round((completedLast30Count / 30) * 100);

              return (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, type: 'spring', stiffness: 350, damping: 25 }}
                  whileHover={{ y: -2 }}
                  className="group relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]/85 backdrop-blur-xl p-4 sm:p-5 shadow-md hover:shadow-xl hover:border-white/20 transition-all"
                >
                  {/* Radial ambient color bloom */}
                  <div
                    className="absolute -right-12 -top-12 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-15 group-hover:opacity-30 transition-opacity duration-300"
                    style={{ backgroundColor: habit.color }}
                  />

                  {/* Left Accent Pill Indicator */}
                  <div
                    className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full transition-all duration-200 group-hover:w-2"
                    style={{ backgroundColor: habit.color }}
                  />

                  {/* Main Card Content */}
                  <div className="flex items-center gap-3.5 sm:gap-4.5 pl-1.5">
                    {/* Tactile Check Button (Min 52x52px for superior ergonomics) */}
                    <motion.button
                      onClick={(e) => handleToggleToday(habit.id, isCompletedToday, e)}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                      className={`relative w-12 h-12 sm:w-13 sm:h-13 min-w-[48px] min-h-[48px] sm:min-w-[52px] sm:min-h-[52px] rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-all duration-300 ${
                        isCompletedToday
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                          : 'bg-slate-800/80 dark:bg-black/30 border-2 border-[var(--card-border)] hover:border-indigo-400/50 hover:shadow-md'
                      }`}
                      style={
                        !isCompletedToday
                          ? {
                              boxShadow: `0 0 16px -4px ${habit.color}35`,
                            }
                          : undefined
                      }
                      aria-label={isCompletedToday ? `Mark ${habit.title} incomplete` : `Mark ${habit.title} complete`}
                    >
                      {isCompletedToday ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <HiCheck className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2.5]" />
                        </motion.div>
                      ) : (
                        <span className="transition-transform duration-200 group-hover:scale-110">
                          {habit.icon}
                        </span>
                      )}
                    </motion.button>

                    {/* Title & Status Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-base font-heading font-bold text-[var(--foreground)] tracking-tight transition-all duration-200 ${
                            isCompletedToday ? 'line-through opacity-55 text-slate-400' : ''
                          }`}
                        >
                          {habit.title}
                        </h3>

                        {/* Streak Badge */}
                        {streak > 0 && (
                          <div
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all ${
                              streak >= 30
                                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400 shadow-sm shadow-purple-500/20'
                                : streak >= 7
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/20'
                                : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                            }`}
                          >
                            <HiFire className={`w-3.5 h-3.5 ${streak >= 7 ? 'animate-bounce' : ''}`} />
                            <span className="font-mono tabular-nums">{streak} {streak === 1 ? 'day' : 'days'}</span>
                          </div>
                        )}
                      </div>

                      {/* Micro Subtitle */}
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {isCompletedToday ? (
                          <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                            ✓ Done today • Keep the momentum going!
                          </span>
                        ) : (
                          <span>Pending • Tap to complete today&apos;s quest</span>
                        )}
                      </p>

                      {/* Mini Heatmap: Last 7 Days with Weekday Header */}
                      <div className="mt-2.5 flex items-center gap-1 sm:gap-1.5">
                        {last7.map((day) => {
                          const done = habit.completedDates.includes(day);
                          const isToday = day === today;
                          const dayLetter = getDayInitial(day);

                          return (
                            <div key={day} className="flex flex-col items-center gap-0.5">
                              <span className="text-[9px] font-mono font-bold text-[var(--muted-foreground)] uppercase">
                                {dayLetter}
                              </span>
                              <motion.button
                                whileHover={{ scale: 1.25 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={async (e) => {
                                  await toggleDate(habit.id, day);
                                  if (!done) {
                                    await awardXP(XP_AWARDS.HABIT_CHECKED, 'Daily habit completed');
                                    playSuccess();
                                    spawnXPFromEvent(XP_AWARDS.HABIT_CHECKED, e);
                                    toast.success('+10 XP! ⚡');
                                  }
                                }}
                                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md flex items-center justify-center relative transition-all duration-200 ${
                                  isToday
                                    ? 'ring-2 ring-indigo-400/80 ring-offset-1 dark:ring-offset-slate-900'
                                    : ''
                                }`}
                                style={{
                                  backgroundColor: done ? habit.color : 'rgba(255, 255, 255, 0.07)',
                                  opacity: done ? 1 : 0.4,
                                }}
                                title={`${day}: ${done ? 'Done ✓' : 'Click to mark done'}`}
                              >
                                {isToday && !done && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                )}
                              </motion.button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stats & Controls */}
                    <div className="hidden md:flex items-center gap-3 text-right">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-800/40 dark:bg-white/5 border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)] block">
                          Best Streak
                        </span>
                        <span className="font-mono text-sm font-bold text-[var(--foreground)] tabular-nums">
                          {habit.bestStreak}d
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-slate-800/40 dark:bg-white/5 border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)] block">
                          30d Rate
                        </span>
                        <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                          {consistencyRate}%
                        </span>
                      </div>
                    </div>

                    {/* Delete Action Button */}
                    <button
                      onClick={() => setConfirmDelete(habit.id)}
                      className="p-2.5 rounded-xl text-[var(--muted-foreground)] hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all duration-200"
                      title="Delete quest"
                      aria-label="Delete quest"
                    >
                      <HiTrash className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {/* Heatmap Drawer Trigger */}
                  <div className="mt-3 pt-2.5 border-t border-[var(--card-border)]/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleExpand(habit.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-foreground)] hover:text-indigo-400 transition-colors py-0.5"
                    >
                      <HiCalendar className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Hide Monthly Heatmap' : 'View 30-Day Heatmap'}</span>
                      {isExpanded ? (
                        <HiChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <HiChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <div className="text-[11px] font-mono text-[var(--muted-foreground)]">
                      {completedLast30Count} of 30 days active
                    </div>
                  </div>

                  {/* Expandable 30-day Full Heatmap Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden pt-3 mt-1"
                      >
                        <div className="rounded-xl bg-slate-900/40 dark:bg-black/20 p-3 border border-white/5">
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-start">
                            {last30.map((day) => {
                              const done = habit.completedDates.includes(day);
                              const isToday = day === today;
                              const isYesterday = day === getLocalYesterdayDateString();

                              const getFriendlyDateLabel = () => {
                                if (isToday) return 'Today';
                                if (isYesterday) return 'Yesterday';
                                try {
                                  const d = new Date(day + 'T12:00:00');
                                  return d.toLocaleDateString(undefined, {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  });
                                } catch {
                                  return day;
                                }
                              };

                              return (
                                <motion.button
                                  key={day}
                                  onClick={async (e) => {
                                    await toggleDate(habit.id, day);
                                    if (!done) {
                                      await awardXP(XP_AWARDS.HABIT_CHECKED, 'Daily habit completed');
                                      playSuccess();
                                      spawnXPFromEvent(XP_AWARDS.HABIT_CHECKED, e);
                                      toast.success('+10 XP! ⚡');
                                    }
                                  }}
                                  className={`w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] rounded-[5px] transition-all flex items-center justify-center relative ${
                                    isToday ? 'ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-slate-900' : ''
                                  }`}
                                  style={{
                                    backgroundColor: done ? habit.color : 'rgba(255, 255, 255, 0.08)',
                                    opacity: done ? 1 : 0.25,
                                  }}
                                  whileHover={{ scale: 1.3, opacity: 1 }}
                                  whileTap={{ scale: 0.9 }}
                                  title={`${getFriendlyDateLabel()}: ${done ? 'Done ✓' : 'Click to toggle'}`}
                                >
                                  {isToday && !done && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between mt-2.5 text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] select-none">
                            <span>30 Days Ago</span>
                            <span className="text-indigo-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Today
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Add Habit Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Daily Quest">
          <div className="space-y-4 pt-1">
            <Input
              label="Habit Quest Title"
              placeholder="e.g. Read research paper for 20 mins"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="min-h-[44px]"
            />

            {/* Icon picker */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">
                Quest Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.map((icon) => (
                  <motion.button
                    key={icon}
                    type="button"
                    onClick={() => setNewIcon(icon)}
                    className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center border-2 transition-all ${
                      newIcon === icon
                        ? 'border-primary bg-primary/15 shadow-md shadow-primary/20 scale-105'
                        : 'border-[var(--card-border)] hover:border-primary/40 bg-slate-800/40'
                    }`}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                  >
                    {icon}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">
                Theme Color
              </label>
              <div className="flex flex-wrap gap-2.5">
                {HABIT_COLORS.map((color) => (
                  <motion.button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newColor === color ? 'border-white scale-120 shadow-md ring-2 ring-primary/50' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    whileHover={{ scale: 1.25 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 pt-3">
              <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1 min-h-[44px]">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddHabit} className="flex-1 min-h-[44px]">
                Create Quest
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={async () => {
            if (confirmDelete) {
              await deleteHabit(confirmDelete);
              setConfirmDelete(null);
              toast.success('Habit deleted');
            }
          }}
          title="Delete Habit Quest"
          message="This will permanently delete this quest and all associated completion history. This action cannot be undone."
          confirmLabel="Delete Quest"
          cancelLabel="Cancel"
          variant="danger"
        />
      </div>
    </PageTransition>
  );
}
