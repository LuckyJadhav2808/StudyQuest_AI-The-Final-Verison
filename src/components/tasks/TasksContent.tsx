'use client';

import React, { useState, useCallback } from 'react';
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
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useTasks } from '@/hooks/useTasks';
import { useGamification } from '@/hooks/useGamification';
import { useConfetti } from '@/components/gamification/ConfettiExplosion';
import AchievementToast from '@/components/gamification/AchievementToast';
import TaskCard from '@/components/tasks/TaskCard';
import TaskModal from '@/components/tasks/TaskModal';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PageTransition from '@/components/layout/PageTransition';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { STATUS_COLUMNS, XP_AWARDS } from '@/lib/constants';
import {
  getGamificationRef,
} from '@/lib/firestore';
import { useAuthContext } from '@/context/AuthContext';
import { updateDoc, increment } from 'firebase/firestore';

type ViewMode = 'board' | 'list';

export default function TasksContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [achievementId, setAchievementId] = useState<string | null>(null);

  const { user } = useAuthContext();
  const { tasks, addTask, updateTask, deleteTask, moveTask, getTasksByStatus } = useTasks();
  const { gamification, awardXP } = useGamification();
  const { fireConfetti, fireBigCelebration } = useConfetti();

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

    // Move to done
    await moveTask(taskId, 'done');

    // Increment task count
    const gamRef = getGamificationRef(user.uid);
    await updateDoc(gamRef, {
      totalTasksCompleted: increment(1),
    });

    // Award XP
    const xpAmount = task.priority === 'urgent' ? XP_AWARDS.TASK_COMPLETE_URGENT : XP_AWARDS.TASK_COMPLETE;
    const result = await awardXP(xpAmount, `Completed task: ${task.title}`);

    // Fire confetti
    fireConfetti();

    // Show achievements
    if (result.newAchievements.length > 0) {
      fireBigCelebration();
      setAchievementId(result.newAchievements[0]);
      setTimeout(() => setAchievementId(null), 5000);
    }
  }, [tasks, user, moveTask, awardXP, fireConfetti, fireBigCelebration]);

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

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-black">📋 Tasks</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {tasks.length} total • {getTasksByStatus('done').length} completed
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden">
              <button
                onClick={() => setViewMode('board')}
                className={`p-2 transition-colors ${viewMode === 'board' ? 'bg-primary text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
              >
                <HiViewBoards size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
              >
                <HiViewList size={18} />
              </button>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={<HiPlus />}
              onClick={() => { setEditingTask(null); setModalOpen(true); }}
            >
              New Task
            </Button>
          </div>
        </div>

        {/* Board View */}
        {viewMode === 'board' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STATUS_COLUMNS.map((column) => {
                const columnTasks = getTasksByStatus(column.id);
                return (
                  <div key={column.id} className="space-y-2">
                    {/* Column Header */}
                    <div className="flex items-center gap-2 px-1">
                      <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${column.color}`} />
                      <h3 className="text-sm font-heading font-bold">{column.label}</h3>
                      <span className="ml-auto text-[11px] text-[var(--muted-foreground)] font-medium">
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Droppable Area */}
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`
                            min-h-[200px] p-2 rounded-xl border-2 border-dashed transition-colors space-y-2
                            ${snapshot.isDraggingOver
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-[var(--card-border)]/50 bg-[var(--muted)]/5'
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
                            <div className="flex items-center justify-center h-[120px] text-[var(--muted-foreground)] text-xs">
                              Drop tasks here
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
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No tasks yet"
                description="Create your first task to start earning XP!"
                action={
                  <Button
                    variant="primary"
                    size="md"
                    icon={<HiPlus />}
                    onClick={() => { setEditingTask(null); setModalOpen(true); }}
                  >
                    Create Task
                  </Button>
                }
              />
            ) : (
              tasks.map((task) => (
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

        {/* Task Modal */}
        <TaskModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setEditingTask(null); }}
          onSubmit={editingTask ? handleEditTask : handleCreateTask}
          initialData={editingTask || undefined}
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
