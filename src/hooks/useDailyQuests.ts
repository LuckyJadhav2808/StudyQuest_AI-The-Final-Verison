'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';
import { setDocument } from '@/lib/firestore';
import { getLocalDateString } from '@/lib/dateUtils';

export interface DailyQuest {
  id: string;
  title: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

interface UseDailyQuestsReturn {
  quests: DailyQuest[];
  loading: boolean;
  addQuest: (title: string) => Promise<void>;
  toggleQuest: (id: string) => Promise<void>;
  deleteQuest: (id: string) => Promise<void>;
  todayCompleted: number;
  todayTotal: number;
}

export function useDailyQuests(): UseDailyQuestsReturn {
  const { user } = useAuthContext();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);

  const [today, setToday] = useState(getLocalDateString());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentToday = getLocalDateString();
      if (currentToday !== today) {
        setToday(currentToday);
      }
    }, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [today]);

  useEffect(() => {
    if (!user) { setQuests([]); setLoading(false); return; }
    const col = collection(db, 'users', user.uid, 'dailyQuests');
    const unsub = onSnapshot(col, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyQuest);
      // Only show today's quests
      const todayQuests = items.filter((q) => q.date === today);
      todayQuests.sort((a, b) => a.createdAt - b.createdAt);
      setQuests(todayQuests);
      setLoading(false);
    });
    return () => unsub();
  }, [user, today]);

  const addQuest = useCallback(async (title: string) => {
    if (!user || !title.trim()) return;
    const id = crypto.randomUUID();
    const ref = doc(db, 'users', user.uid, 'dailyQuests', id);
    await setDocument(ref, {
      id,
      title: title.trim(),
      completed: false,
      date: today,
      createdAt: Date.now(),
    }, false);
  }, [user, today]);

  const toggleQuest = useCallback(async (id: string) => {
    if (!user) return;
    const quest = quests.find((q) => q.id === id);
    if (!quest) return;
    const ref = doc(db, 'users', user.uid, 'dailyQuests', id);
    await setDocument(ref, { completed: !quest.completed });
  }, [user, quests]);

  const deleteQuest = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'dailyQuests', id));
  }, [user]);

  const todayCompleted = quests.filter((q) => q.completed).length;
  const todayTotal = quests.length;

  return { quests, loading, addQuest, toggleQuest, deleteQuest, todayCompleted, todayTotal };
}
