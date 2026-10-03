'use client';

// ============================================================
// StudyQuest AI — Shared Tasks Context (Singleton Listener)
// Consolidates 4+ duplicate Firestore onSnapshot listeners into 1!
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { doc, orderBy } from 'firebase/firestore';
import {
  getTasksCollection,
  subscribeToCollection,
  setDocument,
  updateDocument,
  removeDocument,
} from '@/lib/firestore';
import { Task, TaskStatus } from '@/types';
import { useAuthContext } from '@/context/AuthContext';

export interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // SINGLETON: Subscribe to tasks in real-time exactly once for the application
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const col = getTasksCollection(user.uid);
    const unsub = subscribeToCollection<Task>(
      col,
      (items) => {
        setTasks(items);
        setLoading(false);
      },
      orderBy('createdAt', 'desc'),
    );

    return () => unsub();
  }, [user]);

  const addTask = useCallback(
    async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
      if (!user) throw new Error('Not authenticated');

      const col = getTasksCollection(user.uid);
      const id = crypto.randomUUID();
      const ref = doc(col, id);

      const newTask: Task = {
        ...task,
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDocument(ref, newTask, false);
      return id;
    },
    [user],
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      if (!user) return;
      const col = getTasksCollection(user.uid);
      const ref = doc(col, taskId);
      await updateDocument(ref, { ...updates, updatedAt: Date.now() });
    },
    [user],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!user) return;
      const col = getTasksCollection(user.uid);
      const ref = doc(col, taskId);
      await removeDocument(ref);
    },
    [user],
  );

  const moveTask = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      await updateTask(taskId, { status: newStatus });
    },
    [updateTask],
  );

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks],
  );

  const value = useMemo(
    () => ({
      tasks,
      loading,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      getTasksByStatus,
    }),
    [tasks, loading, addTask, updateTask, deleteTask, moveTask, getTasksByStatus]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) {
    return {
      tasks: [],
      loading: false,
      addTask: async () => '',
      updateTask: async () => {},
      deleteTask: async () => {},
      moveTask: async () => {},
      getTasksByStatus: () => [],
    };
  }
  return context;
}
