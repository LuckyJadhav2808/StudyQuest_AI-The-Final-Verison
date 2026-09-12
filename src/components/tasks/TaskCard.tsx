'use client';

// ============================================================
// StudyQuest AI — Linear-Grade Tactile Task Card
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiTrash, HiPencil, HiCheck, HiCalendar, HiClock, HiTag } from 'react-icons/hi';
import { Task } from '@/types';
import { format, isPast, isToday } from 'date-fns';
import { spawnXPFromEvent } from '@/components/gamification/FloatingXP';
import { playSuccess, playClick } from '@/lib/sounds';

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isDragging?: boolean;
}

const PRIORITY_THEMES = {
  low: {
    badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    borderAccent: 'border-l-teal-500',
    dot: 'bg-teal-500',
    label: 'Low',
  },
  medium: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    borderAccent: 'border-l-amber-500',
    dot: 'bg-amber-500',
    label: 'Medium',
  },
  high: {
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    borderAccent: 'border-l-orange-500',
    dot: 'bg-orange-500',
    label: 'High',
  },
  urgent: {
    badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-black animate-pulse',
    borderAccent: 'border-l-rose-500',
    dot: 'bg-rose-500',
    label: 'Urgent 🔥',
  },
};

export default function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  isDragging = false,
}: TaskCardProps) {
  const [showActions, setShowActions] = useState(false);
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));
  const theme = PRIORITY_THEMES[task.priority] || PRIORITY_THEMES.medium;

  return (
    <motion.div
      className={`
        group relative rounded-2xl p-4 border border-l-4 transition-all duration-200 cursor-grab active:cursor-grabbing select-none
        ${theme.borderAccent}
        ${isDragging
          ? 'shadow-2xl shadow-primary/30 border-primary ring-2 ring-primary/40 rotate-1 scale-[1.03] bg-white dark:bg-slate-900 z-50'
          : 'bg-white dark:bg-slate-900/80 border-indigo-100/90 dark:border-white/10 hover:border-indigo-300 dark:hover:border-primary/40 hover:shadow-[0_8px_24px_-4px_rgba(124,58,237,0.08)] shadow-[0_2px_10px_-2px_rgba(124,58,237,0.04)] backdrop-blur-md'
        }
      `}
      layout
      onHoverStart={() => setShowActions(true)}
      onHoverEnd={() => setShowActions(false)}
      whileHover={isDragging ? {} : { y: -2 }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
    >
      <div className="flex items-start gap-3">
        {/* Tactile Completion Checkbox */}
        <div className="pt-0.5 flex-shrink-0">
          {task.status !== 'done' ? (
            <motion.button
              type="button"
              className="w-6 h-6 rounded-lg border-2 border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center transition-colors cursor-pointer group/btn"
              onClick={(e) => {
                e.stopPropagation();
                onComplete(task.id);
                spawnXPFromEvent(task.priority === 'urgent' ? 25 : 15, e);
                playSuccess();
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              aria-label="Complete task"
            >
              <HiCheck className="w-3.5 h-3.5 opacity-0 group-hover/btn:opacity-100 text-emerald-500 transition-opacity stroke-2" />
            </motion.button>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <HiCheck className="w-3.5 h-3.5 stroke-2" />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-semibold leading-snug tracking-tight text-slate-800 dark:text-slate-100 ${
              task.status === 'done' ? 'line-through text-slate-400 dark:text-slate-500 opacity-60' : ''
            }`}>
              {task.title}
            </h4>

            {/* Quick Action Buttons */}
            <div className={`flex items-center gap-1 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
              <motion.button
                type="button"
                onClick={(e) => { e.stopPropagation(); playClick(); onEdit(task); }}
                className="p-1 rounded-lg hover:bg-primary/15 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                title="Edit task"
                whileTap={{ scale: 0.9 }}
              >
                <HiPencil size={13} />
              </motion.button>
              <motion.button
                type="button"
                onClick={(e) => { e.stopPropagation(); playClick(); onDelete(task.id); }}
                className="p-1 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                title="Delete task"
                whileTap={{ scale: 0.9 }}
              >
                <HiTrash size={13} />
              </motion.button>
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Metadata Footer: Priority Badge + Due Date + Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-indigo-100/60 dark:border-white/5">
            {/* Priority Chip */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${theme.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
              <span>{theme.label}</span>
            </span>

            {/* Due Date Indicator */}
            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                isOverdue
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25'
                  : isDueToday
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
                  : 'bg-indigo-50/80 dark:bg-slate-800 text-indigo-700 dark:text-slate-400 border-indigo-100 dark:border-white/10'
              }`}>
                <HiCalendar size={11} className={isOverdue ? 'animate-bounce' : ''} />
                <span>{isOverdue ? 'Overdue!' : isDueToday ? 'Due Today' : format(new Date(task.dueDate), 'MMM d')}</span>
              </span>
            )}

            {/* Tags */}
            {task.tags && task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-primary/10 text-primary-600 dark:text-primary-300 border border-primary/20"
              >
                <HiTag size={9} className="opacity-60" />
                <span>{tag}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
