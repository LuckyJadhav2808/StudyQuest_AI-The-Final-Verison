/**
 * StudyQuest AI — Normalized Production Tasks Store (Zustand v5)
 * 
 * Provides:
 * - High-speed normalized in-memory task state with zero Context re-render cascades
 * - Instant optimistic UI updates for drag-and-drop Kanban moves
 * - Out-of-tree synchronous state access anywhere via `useTasksStore.getState()`
 * - Selective subscriptions (re-render ONLY when the subscribed task slice changes)
 */

import { create } from 'zustand';
import { Task, TaskStatus } from '@/types';
import { doc } from 'firebase/firestore';
import {
  getTasksCollection,
  setDocument,
  updateDocument,
  removeDocument,
} from '@/lib/firestore';

interface TasksState {
  tasks: Task[];
  loading: boolean;
  setTasks: (tasks: Task[]) => void;
  setLoading: (loading: boolean) => void;
  
  // Selectors
  getTasksByStatus: (status: TaskStatus) => Task[];
  
  // Optimistic CRUD Actions
  addTask: (uid: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTask: (uid: string, taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (uid: string, taskId: string) => Promise<void>;
  moveTask: (uid: string, taskId: string, newStatus: TaskStatus) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: true,

  setTasks: (tasks) => set({ tasks, loading: false }),
  setLoading: (loading) => set({ loading }),

  getTasksByStatus: (status) => {
    return get().tasks.filter((t) => t.status === status);
  },

  addTask: async (uid, task) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const newTask: Task = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic UI update: prepend immediately
    set((state) => ({
      tasks: [newTask, ...state.tasks],
    }));

    try {
      const col = getTasksCollection(uid);
      const ref = doc(col, id);
      await setDocument(ref, newTask, false);
      return id;
    } catch (err) {
      // Rollback on failure
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
      throw err;
    }
  },

  updateTask: async (uid, taskId, updates) => {
    const previousTasks = get().tasks;

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t
      ),
    }));

    try {
      const col = getTasksCollection(uid);
      const ref = doc(col, taskId);
      await updateDocument(ref, { ...updates, updatedAt: Date.now() });
    } catch (err) {
      // Rollback
      set({ tasks: previousTasks });
      throw err;
    }
  },

  deleteTask: async (uid, taskId) => {
    const previousTasks = get().tasks;

    // Optimistic removal
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }));

    try {
      const col = getTasksCollection(uid);
      const ref = doc(col, taskId);
      await removeDocument(ref);
    } catch (err) {
      // Rollback
      set({ tasks: previousTasks });
      throw err;
    }
  },

  moveTask: async (uid, taskId, newStatus) => {
    const previousTasks = get().tasks;

    // Instant optimistic status change
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, updatedAt: Date.now() } : t
      ),
    }));

    try {
      const col = getTasksCollection(uid);
      const ref = doc(col, taskId);
      await updateDocument(ref, { status: newStatus, updatedAt: Date.now() });
    } catch (err) {
      // Rollback
      set({ tasks: previousTasks });
      throw err;
    }
  },
}));
