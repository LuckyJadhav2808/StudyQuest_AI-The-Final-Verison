'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { useAuthContext } from '@/context/AuthContext';
import {
  getTimetableCollection,
  subscribeToCollection,
  setDocument,
  removeDocument,
} from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { TimetableBlock } from '@/types';

export function useTimetable() {
  const { user } = useAuthContext();
  const [blocks, setBlocks] = useState<TimetableBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setBlocks([]); setLoading(false); return; }
    const unsub = subscribeToCollection<TimetableBlock>(
      getTimetableCollection(user.uid),
      (items) => { setBlocks(items); setLoading(false); },
    );
    return () => unsub();
  }, [user]);

  const addBlock = useCallback(async (data: Omit<TimetableBlock, 'id'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const block: TimetableBlock = { id, ...data };
    await setDocument(doc(db, 'users', user.uid, 'timetable', id), block, false);
  }, [user]);

  const updateBlock = useCallback(async (blockId: string, data: Partial<TimetableBlock>) => {
    if (!user) return;
    await setDocument(doc(db, 'users', user.uid, 'timetable', blockId), data);
  }, [user]);

  const deleteBlock = useCallback(async (blockId: string) => {
    if (!user) return;
    await removeDocument(doc(db, 'users', user.uid, 'timetable', blockId));
  }, [user]);

  return { blocks, loading, addBlock, updateBlock, deleteBlock };
}
