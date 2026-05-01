'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { useAuthContext } from '@/context/AuthContext';
import {
  getHabitsCollection,
  subscribeToCollection,
  setDocument,
  removeDocument,
} from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { Habit } from '@/types';

export function useHabits() {
  const { user } = useAuthContext();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setHabits([]); setLoading(false); return; }
    const unsub = subscribeToCollection<Habit>(
      getHabitsCollection(user.uid),
      (items) => { setHabits(items); setLoading(false); },
    );
    return () => unsub();
  }, [user]);

  const addHabit = useCallback(async (data: Omit<Habit, 'id' | 'completedDates' | 'bestStreak' | 'createdAt'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const habit: Habit = {
      id,
      ...data,
      completedDates: [],
      bestStreak: 0,
      createdAt: Date.now(),
    };
    await setDocument(doc(db, 'users', user.uid, 'habits', id), habit, false);
  }, [user]);

  const toggleDate = useCallback(async (habitId: string, date: string) => {
    if (!user) return;
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    let newDates: string[];
    if (habit.completedDates.includes(date)) {
      newDates = habit.completedDates.filter((d) => d !== date);
    } else {
      newDates = [...habit.completedDates, date];
    }

    // Compute best streak
    const sorted = [...newDates].sort();
    let maxStreak = 0, current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) { current++; }
      else { maxStreak = Math.max(maxStreak, current); current = 1; }
    }
    maxStreak = Math.max(maxStreak, current);

    await setDocument(doc(db, 'users', user.uid, 'habits', habitId), {
      completedDates: newDates,
      bestStreak: Math.max(habit.bestStreak, maxStreak),
    });
  }, [user, habits]);

  const deleteHabit = useCallback(async (habitId: string) => {
    if (!user) return;
    await removeDocument(doc(db, 'users', user.uid, 'habits', habitId));
  }, [user]);

  return { habits, loading, addHabit, toggleDate, deleteHabit };
}
