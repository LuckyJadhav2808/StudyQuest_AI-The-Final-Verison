'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiSparkles, HiPlus, HiCheck, HiTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { useGamification } from '@/hooks/useGamification';
import { XP_AWARDS } from '@/lib/constants';
import { playSuccess } from '@/lib/sounds';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

interface DailyQuestsWidgetProps {
  variant?: 'modern' | 'classic' | 'lofi';
}

/**
 * Decoupled Daily Quests Widget
 * Encapsulates daily quest list state and input to prevent dashboard re-render cascades
 */
export const DailyQuestsWidget = React.memo(function DailyQuestsWidget({
  variant = 'modern',
}: DailyQuestsWidgetProps) {
  const { quests, addQuest, toggleQuest, deleteQuest, todayCompleted, todayTotal } = useDailyQuests();
  const { awardXP } = useGamification();
  const [newQuest, setNewQuest] = useState('');

  const handleAddQuest = async () => {
    if (!newQuest.trim()) return;
    await addQuest(newQuest);
    toast.success('Quest added! 🎯');
    setNewQuest('');
  };

  const handleToggleQuest = (id: string, wasCompleted: boolean) => {
    toggleQuest(id).catch(() => {});
    if (!wasCompleted) {
      awardXP(XP_AWARDS.TASK_COMPLETE, 'Daily quest completed').catch(() => {});
      playSuccess();
      toast.success('+25 XP! Quest complete! ⚡');
    }
  };

  const handleDeleteQuest = (id: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Delete this quest?</span>
        <button
          onClick={() => {
            deleteQuest(id);
            toast.dismiss(t.id);
            toast.success('Quest removed');
          }}
          className="px-3 py-1 bg-[#FF6B6B] text-white rounded-lg text-xs font-bold"
        >
          Yes
        </button>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
        >
          No
        </button>
      </div>
    ), { duration: 5000 });
  };

  if (variant === 'classic' || variant === 'lofi') {
    return (
      <Card className="lg:col-span-2 relative overflow-hidden" padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <HiSparkles className="text-primary" size={18} />
          </div>
          <h3 className="text-base font-heading font-bold">Daily Quests</h3>
          <Badge variant="primary" size="sm" dot>
            Today
          </Badge>
          {todayTotal > 0 && (
            <Badge variant={todayCompleted >= todayTotal ? 'teal' : 'amber'} size="sm">
              {todayCompleted}/{todayTotal}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Add a quest for today..."
            value={newQuest}
            onChange={(e) => setNewQuest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddQuest()}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-[var(--card-border)] bg-transparent text-sm font-medium focus:border-primary focus:outline-none transition-colors"
          />
          <Button variant="primary" size="sm" icon={<HiPlus />} onClick={handleAddQuest}>
            Add
          </Button>
        </div>
        {quests.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)] text-center py-4">
            No quests yet. Add one above to get started! ⚡
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {quests.map((quest) => (
              <motion.div
                key={quest.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[var(--card-border)]/50 hover:border-primary/20 transition-colors"
                layout
              >
                <motion.button
                  onClick={() => handleToggleQuest(quest.id, quest.completed)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                    quest.completed ? 'bg-teal/15 border-teal/30' : 'border-[var(--card-border)]'
                  }`}
                  whileTap={{ scale: 0.8 }}
                >
                  {quest.completed && <HiCheck className="text-teal" size={14} />}
                </motion.button>
                <span className={`flex-1 text-sm font-semibold ${quest.completed ? 'line-through opacity-50' : ''}`}>
                  {quest.title}
                </span>
                <button
                  onClick={() => handleDeleteQuest(quest.id)}
                  className="p-1 rounded-lg hover:bg-coral/10 text-[var(--muted-foreground)] hover:text-coral transition-colors"
                >
                  <HiTrash size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
        {todayTotal > 0 && (
          <div className="mt-3">
            <div className="xp-bar-track h-2.5">
              <motion.div
                className="xp-bar-fill"
                animate={{ width: `${(todayCompleted / todayTotal) * 100}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            {todayCompleted >= todayTotal && (
              <p className="text-xs text-teal font-bold mt-1.5">🎉 All quests complete!</p>
            )}
          </div>
        )}
      </Card>
    );
  }

  // Modern Variant
  return (
    <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-white/90 dark:bg-[var(--card-bg)]/85 backdrop-blur-xl border border-indigo-100/80 dark:border-[var(--card-border)] hover:border-indigo-300/60 dark:hover:border-white/20 shadow-md transition-all text-left">
      {/* Subtle ambient cyan glow */}
      <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-4 justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <HiSparkles size={18} />
          </div>
          <div>
            <h3 className="text-base font-heading font-bold text-[var(--foreground)] tracking-tight">
              Daily Quests
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)]">Complete rituals for +25 XP each</p>
          </div>
        </div>
        {todayTotal > 0 && (
          <Badge variant={todayCompleted >= todayTotal ? 'teal' : 'amber'} size="sm" className="font-mono tabular-nums">
            {todayCompleted} / {todayTotal} Complete
          </Badge>
        )}
      </div>

      {/* Add Quest input */}
      <div className="flex gap-2 mb-4 relative z-10">
        <input
          type="text"
          placeholder="Add a new quest for today..."
          value={newQuest}
          onChange={(e) => setNewQuest(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddQuest()}
          className="flex-1 min-w-0 px-4 py-2.5 text-xs rounded-xl border border-indigo-100 dark:border-[var(--card-border)] bg-slate-50/80 dark:bg-black/20 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-hidden transition-all text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
        />
        <Button variant="primary" size="sm" icon={<HiPlus />} onClick={handleAddQuest} className="min-h-[40px] px-4">
          Add
        </Button>
      </div>

      {quests.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)] text-center py-6">
          No daily quests active. Add one above to kickstart your streak! ⚡
        </p>
      ) : (
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1 relative z-10">
          {quests.map((quest) => (
            <motion.div
              key={quest.id}
              className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-indigo-100/70 dark:border-[var(--card-border)]/70 bg-slate-50/70 dark:bg-white/[0.02] hover:border-indigo-300/60 hover:bg-indigo-50/50 transition-all"
              layout
            >
              <motion.button
                onClick={() => handleToggleQuest(quest.id, quest.completed)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all cursor-pointer ${
                  quest.completed
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400 text-white shadow-xs shadow-emerald-500/20'
                    : 'border-slate-300 dark:border-[var(--card-border)] hover:border-indigo-400 bg-white dark:bg-transparent'
                }`}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                aria-label={quest.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {quest.completed && <HiCheck className="w-3.5 h-3.5 stroke-2" />}
              </motion.button>
              <span
                className={`flex-1 text-xs font-semibold text-[var(--foreground)] transition-all ${
                  quest.completed ? 'line-through opacity-50 text-[var(--muted-foreground)]' : ''
                }`}
              >
                {quest.title}
              </span>
              <button
                onClick={() => handleDeleteQuest(quest.id)}
                className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-[var(--muted-foreground)] hover:text-rose-500 transition-all cursor-pointer"
                title="Delete quest"
              >
                <HiTrash size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {todayTotal > 0 && (
        <div className="mt-4 pt-3.5 border-t border-indigo-100/80 dark:border-[var(--card-border)]/60 relative z-10">
          <div className="flex justify-between text-[10px] font-bold text-[var(--muted-foreground)] mb-1.5">
            <span>Quest Journey</span>
            <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
              {Math.round((todayCompleted / todayTotal) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-indigo-100/80 dark:bg-black/40 overflow-hidden border border-indigo-200/50 dark:border-white/5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-indigo-500 to-violet-500 shadow-xs shadow-indigo-500/30"
              animate={{ width: `${(todayCompleted / todayTotal) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default DailyQuestsWidget;
