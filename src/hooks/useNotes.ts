'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { useAuthContext } from '@/context/AuthContext';
import {
  getNotesCollection,
  subscribeToCollection,
  setDocument,
  removeDocument,
} from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { Note } from '@/types';

export function useNotes() {
  const { user } = useAuthContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setNotes([]); setLoading(false); return; }
    const unsub = subscribeToCollection<Note>(
      getNotesCollection(user.uid),
      (items) => { setNotes(items); setLoading(false); },
    );
    return () => unsub();
  }, [user]);

  const addNote = useCallback(async (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const note: Note = {
      id,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDocument(doc(db, 'users', user.uid, 'notes', id), note, false);
    return id;
  }, [user]);

  const updateNote = useCallback(async (noteId: string, data: Partial<Note>) => {
    if (!user) return;
    await setDocument(doc(db, 'users', user.uid, 'notes', noteId), {
      ...data,
      updatedAt: Date.now(),
    });
  }, [user]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!user) return;
    await removeDocument(doc(db, 'users', user.uid, 'notes', noteId));
  }, [user]);

  return { notes, loading, addNote, updateNote, deleteNote };
}
