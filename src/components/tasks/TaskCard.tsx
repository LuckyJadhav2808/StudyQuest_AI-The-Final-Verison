'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiTrash, HiPencil, HiCheck, HiCalendar } from 'react-icons/hi';
import { Task } from '@/types';
import Badge from '@/components/ui/Badge';
import { PRIORITY_COLORS, XP_AWARDS } from '@/lib/constants';
import { format, isPast, isToday } from 'date-fns';
import { spawnXPFromEvent } from '@/components/gamification/FloatingXP';
import { playSuccess } from '@/lib/sounds';

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isDragging?: boolean;
}

const priorityBadgeVariant = {
  low: 'teal' as const,
  medium: 'amber' as const,
  high: 'coral' as const,
  urgent: 'coral' as const,
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

  return (
    <motion.div
      className={`
        rounded-xl p-3.5 border transition-all duration-200 cursor-pointer
        ${isDragging
          ? 'bg-primary/10 border-primary/40 shadow-lg scale-105 rotate-2'
          : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-primary/30'
        }
      `}
      layout
      onHoverStart={() => setShowActions(true)}
      onHoverEnd={() => setShowActions(false)}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Top row */}
      <div className="flex items-start gap-2.5">
        {/* Complete checkbox */}
        {task.status !== 'done' && (
          <motion.button
            className="mt-0.5 w-5 h-5 rounded-md border-2 border-[var(--muted)] hover:border-teal hover:bg-teal/10 flex-shrink-0 flex items-center justify-center transition-colors"
            onClick={(e) => { e.stopPropagation(); onComplete(task.id); spawnXPFromEvent(XP_AWARDS.TASK_COMPLETE, e); playSuccess(); }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
          >
            <HiCheck className="w-3 h-3 opacity-0 hover:opacity-100 text-teal transition-opacity" />
          </motion.button>
        )}

        {task.status === 'done' && (
          <div className="mt-0.5 w-5 h-5 rounded-md bg-teal flex items-center justify-center flex-shrink-0">
            <HiCheck className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${
            task.status === 'done' ? 'line-through text-[var(--muted-foreground)]' : ''
          }`}>
            {task.title}
          </p>

          {task.description && (
            <p className="text-[11px] text-[var(--muted-foreground)] mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant={priorityBadgeVariant[task.priority]} size="sm">
              {task.priority}
            </Badge>

            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                isOverdue ? 'text-coral' : isDueToday ? 'text-amber' : 'text-[var(--muted-foreground)]'
              }`}>
                <HiCalendar size={10} />
                {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : format(new Date(task.dueDate), 'MMM d')}
              </span>
            )}

            {task.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary-light font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              className="flex gap-1 flex-shrink-0"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-[var(--muted-foreground)] hover:text-primary transition-colors"
              >
                <HiPencil size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="p-1.5 rounded-lg hover:bg-coral/10 text-[var(--muted-foreground)] hover:text-coral transition-colors"
              >
                <HiTrash size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
