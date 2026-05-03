'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiTrash, HiFire, HiCheck, HiX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useHabits } from '@/hooks/useHabits';
import { useGamification } from '@/hooks/useGamification';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';
import { XP_AWARDS } from '@/lib/constants';
import { playSuccess } from '@/lib/sounds';
import { spawnXPFromEvent } from '@/components/gamification/FloatingXP';

const HABIT_COLORS = [
  '#7C3AED', '#EC4899', '#10B981', '#FF6B6B', '#FFD166',
  '#4CC9F0', '#FF85A1', '#B5E48C', '#06D6A0', '#A78BFA',
];

const HABIT_ICONS = ['💪', '📚', '🧘', '🏃', '💧', '🎯', '✍️', '🧠', '😴', '🥗', '🎵', '🌅'];

function getStreakForHabit(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;
  const sorted = [...completedDates].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return streak;
}

// Generate last N days for heatmap
function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export default function HabitsContent() {
  const { habits, loading, addHabit, toggleDate, deleteHabit } = useHabits();
  const { awardXP } = useGamification();
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('💪');
  const [newColor, setNewColor] = useState(HABIT_COLORS[0]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const last30 = useMemo(() => getLastNDays(30), []);
  const last7 = useMemo(() => getLastNDays(7), []);

  const handleAddHabit = async () => {
    if (!newTitle.trim()) return;
    await addHabit({ title: newTitle.trim(), icon: newIcon, color: newColor });
    toast.success('Habit created! 💪');
    setNewTitle('');
    setNewIcon('💪');
    setNewColor(HABIT_COLORS[0]);
    setShowModal(false);
  };

  const handleToggleToday = async (habitId: string, isCompleted: boolean, event?: React.MouseEvent) => {
    await toggleDate(habitId, today);
    if (!isCompleted) {
      await awardXP(XP_AWARDS.HABIT_CHECKED, 'Daily habit completed');
      playSuccess();
      spawnXPFromEvent(XP_AWARDS.HABIT_CHECKED, event);
      toast.success('+10 XP! ⚡');
    }
  };

  // Stats
  const todayComplete = habits.filter((h) => h.completedDates.includes(today)).length;
  const todayTotal = habits.length;

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Daily Quests</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Build powerful habits, one day at a time.</p>
          </div>
          <Button variant="primary" size="sm" icon={<HiPlus />} onClick={() => setShowModal(true)}>
            New Habit
          </Button>
        </div>

        {/* Today's progress */}
        <Card padding="md" hover={false} className="relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-heading font-bold">Today&apos;s Progress</h3>
            <Badge variant={todayComplete >= todayTotal && todayTotal > 0 ? 'teal' : 'primary'} size="sm">
              {todayComplete}/{todayTotal}
            </Badge>
          </div>
          <div className="xp-bar-track h-3">
            <motion.div
              className="xp-bar-fill"
              animate={{ width: todayTotal > 0 ? `${(todayComplete / todayTotal) * 100}%` : '0%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {todayComplete >= todayTotal && todayTotal > 0 && (
            <p className="text-xs text-teal font-bold mt-2">🎉 All quests complete! +{XP_AWARDS.HABIT_CHECKED * todayTotal} XP earned today!</p>
          )}
        </Card>

        {/* Habit List */}
        {habits.length === 0 && !loading ? (
          <Card padding="lg" hover={false}>
            <div className="text-center py-8">
              <motion.span className="text-5xl block mb-4" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                ⚡
              </motion.span>
              <h3 className="text-lg font-heading font-bold mb-2">No habits yet!</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">Create your first daily quest to start building streaks.</p>
              <Button variant="primary" icon={<HiPlus />} onClick={() => setShowModal(true)}>Create First Habit</Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {habits.map((habit, index) => {
              const isCompletedToday = habit.completedDates.includes(today);
              const streak = getStreakForHabit(habit.completedDates);

              return (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card padding="md" hover={false}>
                    <div className="flex items-center gap-4">
                      {/* Check button */}
                      <motion.button
                        onClick={(e) => handleToggleToday(habit.id, isCompletedToday, e)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border-2 transition-all duration-200 ${
                          isCompletedToday
                            ? 'bg-teal/15 border-teal/30 shadow-[0_3px_0_rgba(16,185,129,0.2)]'
                            : 'border-[var(--card-border)] hover:border-primary/30 shadow-[0_3px_0_rgba(0,0,0,0.05)]'
                        }`}
                        whileTap={{ scale: 0.9, y: 2 }}
                        style={isCompletedToday ? {} : { borderLeftColor: habit.color, borderLeftWidth: '4px' }}
                      >
                        {isCompletedToday ? <HiCheck className="text-teal" size={24} /> : habit.icon}
                      </motion.button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-heading font-bold ${isCompletedToday ? 'line-through opacity-60' : ''}`}>
                            {habit.title}
                          </h4>
                          {streak >= 3 && (
                            <Badge variant="amber" size="sm">
                              <HiFire className="inline" size={12} /> {streak}
                            </Badge>
                          )}
                        </div>

                        {/* Mini heatmap (last 7 days) */}
                        <div className="flex gap-1 mt-1.5">
                          {last7.map((day) => {
                            const done = habit.completedDates.includes(day);
                            return (
                              <motion.div
                                key={day}
                                className="w-4 h-4 rounded-sm"
                                style={{
                                  backgroundColor: done ? habit.color : 'var(--card-border)',
                                  opacity: done ? 1 : 0.3,
                                }}
                                whileHover={{ scale: 1.3 }}
                                title={`${day}: ${done ? 'Done ✓' : 'Missed'}`}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-3 text-right">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Streak</p>
                          <p className="text-sm font-heading font-bold">{streak}d</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Best</p>
                          <p className="text-sm font-heading font-bold">{habit.bestStreak}d</p>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => setConfirmDelete(habit.id)}
                        className="p-2 rounded-lg hover:bg-coral/10 text-[var(--muted-foreground)] hover:text-coral transition-colors"
                      >
                        <HiTrash size={16} />
                      </button>
                    </div>

                    {/* Full 30-day heatmap (expandable) */}
                    <div className="mt-3 pt-3 border-t-2 border-[var(--card-border)]">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Last 30 days</p>
                        <p className="text-[9px] font-bold text-[var(--muted-foreground)]">
                          {habit.completedDates.filter((d) => last30.includes(d)).length}/30 days
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-[3px]">
                        {last30.map((day) => {
                          const done = habit.completedDates.includes(day);
                          return (
                            <motion.button
                              key={day}
                              onClick={() => toggleDate(habit.id, day)}
                              className="w-[18px] h-[18px] rounded-[3px] transition-colors"
                              style={{
                                backgroundColor: done ? habit.color : 'var(--card-border)',
                                opacity: done ? 1 : 0.2,
                              }}
                              whileHover={{ scale: 1.4, opacity: 1 }}
                              title={`${day}: ${done ? 'Done ✓' : 'Click to mark'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Add Habit Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Daily Quest">
          <div className="space-y-4">
            <Input
              label="Habit Name"
              placeholder="e.g. Read for 20 minutes"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />

            {/* Icon picker */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.map((icon) => (
                  <motion.button
                    key={icon}
                    onClick={() => setNewIcon(icon)}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all ${
                      newIcon === icon
                        ? 'border-primary bg-primary/10 shadow-[0_3px_0_rgba(124,58,237,0.2)]'
                        : 'border-[var(--card-border)] hover:border-primary/30'
                    }`}
                    whileTap={{ scale: 0.9 }}
                  >
                    {icon}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {HABIT_COLORS.map((color) => (
                  <motion.button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newColor === color ? 'border-[var(--foreground)] scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleAddHabit} className="flex-1">Create Quest</Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirm */}
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Habit">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">This will permanently delete this habit and all its history. This cannot be undone.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
            <Button
              variant="coral"
              onClick={async () => {
                if (confirmDelete) await deleteHabit(confirmDelete);
                setConfirmDelete(null);
                toast.success('Habit deleted');
              }}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
