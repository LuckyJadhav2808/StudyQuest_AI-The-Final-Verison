'use client';

// ============================================================
// StudyQuest AI — Tasks Hook (Firestore CRUD)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  getTasksCollection,
  subscribeToCollection,
  setDocument,
  updateDocument,
  removeDocument,
} from '@/lib/firestore';
import { orderBy } from 'firebase/firestore';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { useAuthContext } from '@/context/AuthContext';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export function useTasks(): UseTasksReturn {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to tasks in real-time
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

  return { tasks, loading, addTask, updateTask, deleteTask, moveTask, getTasksByStatus };
}
