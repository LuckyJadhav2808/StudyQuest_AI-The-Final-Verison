'use client';

import { useState, useEffect } from 'react';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  subscribeToCollection,
  setDocument,
  removeDocument,
} from '@/lib/firestore';
import { useAuthContext } from '@/context/AuthContext';
import type { Exam } from '@/types';

/**
 * useExams — CRUD hook for the Exam Countdown feature.
 * Follows the same pattern as useNotes, useHabits, etc.
 */
export function useExams() {
  const { user } = useAuthContext();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setExams([]);
      setLoading(false);
      return;
    }

    const ref = collection(db, 'users', user.uid, 'exams');
    const q = query(ref, orderBy('date', 'asc'));

    const unsub = subscribeToCollection<Exam>(ref, (items) => {
      // Sort by date ascending (nearest first)
      items.sort((a, b) => a.date - b.date);
      setExams(items);
      setLoading(false);
    }, orderBy('date', 'asc'));

    return unsub;
  }, [user]);

  const addExam = async (data: Omit<Exam, 'id' | 'createdAt'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const ref = doc(db, 'users', user.uid, 'exams', id);
    await setDocument(ref, {
      id,
      ...data,
      createdAt: Date.now(),
    }, false);
    return id;
  };

  const updateExam = async (id: string, data: Partial<Exam>) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'exams', id);
    await setDocument(ref, data);
  };

  const deleteExam = async (id: string) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'exams', id);
    await removeDocument(ref);
  };

  // Helper: upcoming exams (date is in the future)
  const upcomingExams = exams.filter((e) => e.date > Date.now());
  const pastExams = exams.filter((e) => e.date <= Date.now());

  return {
    exams,
    upcomingExams,
    pastExams,
    loading,
    addExam,
    updateExam,
    deleteExam,
  };
}
