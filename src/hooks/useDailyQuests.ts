'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';
import { setDocument } from '@/lib/firestore';
import { getLocalDateString } from '@/lib/dateUtils';
import toast from 'react-hot-toast';

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

  // Keep a ref to the latest quests so toggle callbacks never read stale state
  const questsRef = useRef<DailyQuest[]>(quests);
  questsRef.current = quests;

  // Track in-flight toggles to prevent rapid double-clicks
  const togglingRef = useRef<Set<string>>(new Set());

  // Date rollover detection — checks every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      const currentToday = getLocalDateString();
      if (currentToday !== today) {
        setToday(currentToday);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [today]);

  // Firestore real-time listener for all quests, filtered to today
  useEffect(() => {
    if (!user) { setQuests([]); setLoading(false); return; }
    const col = collection(db, 'users', user.uid, 'dailyQuests');
    const unsub = onSnapshot(col, (snap) => {
      const currentToday = getLocalDateString();
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyQuest);
      // Only show today's quests
      const todayQuests = items.filter((q) => q.date === currentToday);
      todayQuests.sort((a, b) => a.createdAt - b.createdAt);
      setQuests(todayQuests);
      setLoading(false);
    });
    return () => unsub();
  }, [user, today]);

  // Add a new quest for today
  const addQuest = useCallback(async (title: string) => {
    if (!user || !title.trim()) return;
    const id = crypto.randomUUID();
    const ref = doc(db, 'users', user.uid, 'dailyQuests', id);
    await setDocument(ref, {
      id,
      title: title.trim(),
      completed: false,
      date: getLocalDateString(),
      createdAt: Date.now(),
    }, false);
  }, [user]);

  // Toggle quest completion — uses ref for latest state + optimistic update
  const toggleQuest = useCallback(async (id: string) => {
    if (!user) return;

    // Prevent rapid double-clicks on the same quest
    if (togglingRef.current.has(id)) return;
    togglingRef.current.add(id);

    try {
      // Read from the ref so we always get the latest quests, never a stale closure
      const currentQuests = questsRef.current;
      const quest = currentQuests.find((q) => q.id === id);
      if (!quest) return;

      // Restrict modification to quests from the previous 3 days (today, yesterday, 2 days ago, 3 days ago)
      if (quest.date) {
        const parts = quest.date.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          
          const questDate = new Date(year, month, day);
          const todayDate = new Date();
          const todayStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
          
          const diffTime = todayStart.getTime() - questDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 3) {
            toast.error("Quests older than 3 days cannot be modified! 🔒");
            return;
          }
        }
      }

      const newCompleted = !quest.completed;

      // Optimistic UI update — toggle locally before Firestore responds
      setQuests((prev) =>
        prev.map((q) => q.id === id ? { ...q, completed: newCompleted } : q)
      );

      // Persist to Firestore
      const ref = doc(db, 'users', user.uid, 'dailyQuests', id);
      await setDocument(ref, { completed: newCompleted });
    } finally {
      togglingRef.current.delete(id);
    }
  }, [user]);

  // Delete a quest — with optimistic UI update
  const deleteQuest = useCallback(async (id: string) => {
    if (!user) return;
    
    // Optimistic UI update: remove from local state immediately
    setQuests((prev) => prev.filter((q) => q.id !== id));
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'dailyQuests', id));
    } catch (err) {
      console.error('Failed to delete quest:', err);
    }
  }, [user]);

  const todayCompleted = quests.filter((q) => q.completed).length;
  const todayTotal = quests.length;

  return { quests, loading, addQuest, toggleQuest, deleteQuest, todayCompleted, todayTotal };
}
