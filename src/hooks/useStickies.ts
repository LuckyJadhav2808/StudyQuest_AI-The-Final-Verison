'use client';

import { useState, useEffect } from 'react';
import { collection, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  subscribeToCollection,
  setDocument,
  removeDocument,
} from '@/lib/firestore';
import { useAuthContext } from '@/context/AuthContext';
import type { StickyNote } from '@/types';

/**
 * useStickies — CRUD hook for floating sticky notes.
 * Persists to Firestore subcollection users/{uid}/stickies.
 */
export function useStickies() {
  const { user } = useAuthContext();
  const [stickies, setStickies] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStickies([]);
      setLoading(false);
      return;
    }

    const ref = collection(db, 'users', user.uid, 'stickies');

    const unsub = subscribeToCollection<StickyNote>(ref, (items) => {
      setStickies(items);
      setLoading(false);
    }, orderBy('createdAt', 'desc'));

    return unsub;
  }, [user]);

  const addSticky = async (data?: Partial<StickyNote>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const ref = doc(db, 'users', user.uid, 'stickies', id);

    // Randomize initial position slightly so stickies don't stack exactly
    const offsetX = 60 + Math.random() * 200;
    const offsetY = 80 + Math.random() * 200;

    await setDocument(ref, {
      id,
      content: '',
      color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
      x: offsetX,
      y: offsetY,
      ...data,
      createdAt: Date.now(),
    }, false);
    return id;
  };

  const updateSticky = async (id: string, data: Partial<StickyNote>) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'stickies', id);
    await setDocument(ref, data);
  };

  const deleteSticky = async (id: string) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'stickies', id);
    await removeDocument(ref);
  };

  return { stickies, loading, addSticky, updateSticky, deleteSticky };
}

export const STICKY_COLORS = [
  '#FDE68A', // amber
  '#A7F3D0', // green
  '#FBCFE8', // pink
  '#BAE6FD', // sky
  '#C4B5FD', // violet
  '#FED7AA', // orange
];
