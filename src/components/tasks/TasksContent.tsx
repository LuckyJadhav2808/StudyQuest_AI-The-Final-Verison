'use client';

// ============================================================
// StudyQuest AI — Linear-Style Quest Log & Kanban Board
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  HiPlus,
  HiViewBoards,
  HiViewList,
  HiSearch,
  HiFilter,
  HiCheckCircle,
  HiFire,
  HiTag,
  HiX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useTasks } from '@/hooks/useTasks';
import { useGamification } from '@/hooks/useGamification';
import { useSkillTree } from '@/hooks/useSkillTree';
import { useShop } from '@/hooks/useShop';
import { usePet } from '@/hooks/usePet';
import { useConfetti } from '@/components/gamification/ConfettiExplosion';
import AchievementToast from '@/components/gamification/AchievementToast';
import TaskCard from '@/components/tasks/TaskCard';
import TaskModal from '@/components/tasks/TaskModal';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PageTransition from '@/components/layout/PageTransition';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { STATUS_COLUMNS, XP_AWARDS } from '@/lib/constants';
import { getGamificationRef } from '@/lib/firestore';
import { useAuthContext } from '@/context/AuthContext';
import { updateDoc, increment } from 'firebase/firestore';
import { playClick } from '@/lib/sounds';

type ViewMode = 'board' | 'list';

const PRIORITY_OPTIONS: { id: TaskPriority | 'all'; label: string }[] = [
  { id: 'all', label: 'All Priorities' },
  { id: 'urgent', label: '🔥 Urgent' },
  { id: 'high', label: '⚡ High' },
  { id: 'medium', label: '📋 Medium' },
  { id: 'low', label: '🌱 Low' },
];

export default function TasksContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatusForNew, setDefaultStatusForNew] = useState<TaskStatus>('todo');
  const [achievementId, setAchievementId] = useState<string | null>(null);

  // Facet Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const { user } = useAuthContext();
  const { tasks, addTask, updateTask, deleteTask, moveTask } = useTasks();
  const { gamification, awardXP } = useGamification();
  const { hasEffect } = useSkillTree();
  const { addCoins, hasActiveEffect } = useShop();
  const { pet, awardPetXP } = usePet();
  const { fireConfetti, fireBigCelebration } = useConfetti();

  // Extract all unique tags across tasks
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    tasks.forEach((t) => {
      t.tags?.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [tasks]);

  // Filter tasks based on search, priority, and tag
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        const matchTag = task.tags?.some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchDesc && !matchTag) return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      // Tag filter
      if (selectedTag !== 'all' && (!task.tags || !task.tags.includes(selectedTag))) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedPriority, selectedTag]);

  // Group filtered tasks by status
  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      'todo': [],
      'in-progress': [],
      'done': [],
    };
    filteredTasks.forEach((t) => {
      if (map[t.status]) {
        map[t.status].push(t);
      }
    });
    return map;
  }, [filteredTasks]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedPriority !== 'all' || selectedTag !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPriority('all');
    setSelectedTag('all');
  };

  const handleCreateTask = async (taskData: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string | null;
    tags: string[];
  }) => {
    await addTask(taskData);
    toast.success('Quest created! 📋');
  };

  const handleEditTask = async (taskData: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string | null;
    tags: string[];
  }) => {
    if (!editingTask) return;
    await updateTask(editingTask.id, taskData);
    toast.success('Quest updated!');
    setEditingTask(null);
  };

  const handleCompleteTask = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !user) return;

    // Trigger Firestore writes in parallel
    const p1 = moveTask(taskId, 'done');
    const gamRef = getGamificationRef(user.uid);
    const p2 = updateDoc(gamRef, {
      totalTasksCompleted: increment(1),
    });

    let xpAmount = task.priority === 'urgent' ? XP_AWARDS.TASK_COMPLETE_URGENT : XP_AWARDS.TASK_COMPLETE;

    // Apply Task Slayer XP perks
    if (hasEffect('task-urgent-double') && task.priority === 'urgent') {
      xpAmount *= 2;
    }
    if (hasEffect('task-xp-5')) {
      xpAmount += 5;
    }
    if (hasEffect('task-legendary')) {
      xpAmount += 10;
    }

    // Pet companion XP sharing
    if (pet) {
      await awardPetXP(5);
    }

    const res = await awardXP(xpAmount, `Completed quest: ${task.title}`);
    await Promise.all([p1, p2]);

    if (res.leveledUp) {
      fireBigCelebration();
    } else {
      fireConfetti();
    }

    if (res.newAchievements.length > 0) {
      setAchievementId(res.newAchievements[0]);
      setTimeout(() => setAchievementId(null), 5000);
    }
  }, [tasks, user, moveTask, awardXP, fireConfetti, fireBigCelebration, hasEffect, pet, awardPetXP]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;
    const oldStatus = result.source.droppableId as TaskStatus;

    if (newStatus === oldStatus) return;

    if (newStatus === 'done') {
      await handleCompleteTask(taskId);
    } else {
      await moveTask(taskId, newStatus);
    }
  }, [handleCompleteTask, moveTask]);

  const openCreateModalForStatus = (status: TaskStatus) => {
    playClick();
    setDefaultStatusForNew(status);
    setEditingTask(null);
    setModalOpen(true);
  };

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const urgentCount = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* Top Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary/20">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
                  Quest Log & Kanban
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Organize, prioritize, and conquer your study roadmap.
                </p>
              </div>
            </div>

            {/* Live Telemetry Badges */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                <span>{tasks.length} Total</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <HiCheckCircle size={13} />
                <span>{completedCount} Completed</span>
              </span>
              {urgentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                  <HiFire size={13} />
                  <span>{urgentCount} Urgent</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-between lg:justify-end">
            {/* View Mode Switcher Track */}
            <div className="flex items-center bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl p-1 border border-slate-300/50 dark:border-white/10 text-xs backdrop-blur-md">
              <button
                type="button"
                onClick={() => { playClick(); setViewMode('board'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-white dark:bg-primary text-slate-900 dark:text-white shadow-md shadow-primary/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <HiViewBoards size={15} />
                <span>Board</span>
              </button>
              <button
                type="button"
                onClick={() => { playClick(); setViewMode('list'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-primary text-slate-900 dark:text-white shadow-md shadow-primary/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <HiViewList size={15} />
                <span>List</span>
              </button>
            </div>

            {/* New Task Button */}
            <motion.button
              type="button"
              onClick={() => openCreateModalForStatus('todo')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white font-heading font-bold text-xs shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all cursor-pointer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <HiPlus size={16} />
              <span>New Quest</span>
            </motion.button>
          </div>
        </div>

        {/* Facet Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search quests by title, description, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/40 text-slate-800 dark:text-slate-200 font-medium placeholder:text-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Selector */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedPriority(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedPriority === opt.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Tag Filter Dropdown */}
            {allTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value="all">🏷️ All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            )}

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <motion.button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.95 }}
              >
                <HiX size={12} />
                <span>Reset</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Board View (Kanban) */}
        {viewMode === 'board' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto pb-4 flex md:grid md:grid-cols-3 gap-5 items-start snap-x">
              {STATUS_COLUMNS.map((column) => {
                const columnTasks = tasksByStatus[column.id] || [];
                return (
                  <div
                    key={column.id}
                    className="min-w-[300px] md:min-w-0 flex-1 flex flex-col rounded-3xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 p-4 backdrop-blur-xl shadow-sm snap-start"
                  >
                    {/* Linear-Style Column Header */}
                    <div className="flex items-center justify-between gap-2 px-1 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${column.color} shadow-sm`} />
                        <h3 className="text-xs uppercase tracking-wider font-heading font-black text-slate-800 dark:text-slate-200">
                          {column.label}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 tabular-nums shadow-sm">
                          {columnTasks.length}
                        </span>
                      </div>

                      {/* Quick Add Button */}
                      <motion.button
                        type="button"
                        onClick={() => openCreateModalForStatus(column.id)}
                        className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-primary/15 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary border border-slate-200 dark:border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                        title={`Add task to ${column.label}`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <HiPlus size={14} />
                      </motion.button>
                    </div>

                    {/* Droppable Card Track */}
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`
                            min-h-[350px] p-2 rounded-2xl transition-all duration-200 space-y-3
                            ${snapshot.isDraggingOver
                              ? 'border-2 border-dashed border-primary/50 bg-primary/5 ring-4 ring-primary/10'
                              : 'border-2 border-dashed border-slate-200/60 dark:border-white/5 bg-transparent'
                            }
                          `}
                        >
                          <AnimatePresence>
                            {columnTasks.map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                  >
                                    <TaskCard
                                      task={task}
                                      onComplete={handleCompleteTask}
                                      onEdit={(t) => { setEditingTask(t); setModalOpen(true); }}
                                      onDelete={deleteTask}
                                      isDragging={dragSnapshot.isDragging}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </AnimatePresence>
                          {provided.placeholder}

                          {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex flex-col items-center justify-center h-44 text-center p-4 border border-dashed border-slate-200/60 dark:border-white/5 rounded-xl">
                              <span className="text-2xl mb-1 opacity-40">📥</span>
                              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                No quests here
                              </p>
                              <button
                                type="button"
                                onClick={() => openCreateModalForStatus(column.id)}
                                className="text-[10px] text-primary font-bold hover:underline mt-1 cursor-pointer"
                              >
                                + Add one
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-3 max-w-4xl mx-auto">
            {filteredTasks.length === 0 ? (
              <EmptyState
                icon="📋"
                title={hasActiveFilters ? 'No quests match your filters' : 'No quests yet'}
                description={
                  hasActiveFilters
                    ? 'Try adjusting your search query or priority filters.'
                    : 'Create your first quest to start earning XP and level up!'
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" size="md" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      icon={<HiPlus />}
                      onClick={() => openCreateModalForStatus('todo')}
                    >
                      Create First Quest
                    </Button>
                  )
                }
              />
            ) : (
              filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  onEdit={(t) => { setEditingTask(t); setModalOpen(true); }}
                  onDelete={deleteTask}
                />
              ))
            )}
          </div>
        )}

        {/* Task Creation & Edit Modal */}
        <TaskModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setEditingTask(null); }}
          onSubmit={editingTask ? handleEditTask : handleCreateTask}
          initialData={
            editingTask
              ? editingTask
              : {
                  id: '',
                  title: '',
                  description: '',
                  priority: 'medium',
                  status: defaultStatusForNew,
                  dueDate: null,
                  tags: [],
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                }
          }
          mode={editingTask ? 'edit' : 'create'}
        />

        {/* Achievement Toast */}
        <AchievementToast
          achievementId={achievementId}
          onClose={() => setAchievementId(null)}
        />
      </div>
    </PageTransition>
  );
}
