'use client';

// ============================================================
// StudyQuest AI — Shared Notes Context (Singleton Listener)
// Consolidates duplicate Firestore onSnapshot listeners into 1!
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import toast from 'react-hot-toast';

export interface NotesContextValue {
  notes: Note[];
  loading: boolean;
  addNote: (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateNote: (noteId: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const notesRef = useRef<Note[]>([]);
  notesRef.current = notes;

  // Single onSnapshot subscription across entire app lifecycle
  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToCollection<Note>(
      getNotesCollection(user.uid),
      (items) => {
        setNotes(items);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const addNote = useCallback(async (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return null;
    const id = crypto.randomUUID();
    const now = Date.now();
    const newNote: Note = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic insert
    const previousNotes = [...notesRef.current];
    setNotes((prev) => [newNote, ...prev]);

    try {
      await setDocument(doc(db, 'users', user.uid, 'notes', id), newNote, false);
      return id;
    } catch (err: any) {
      console.error('Failed to save note to Firestore:', err);
      // Rollback on failure
      setNotes(previousNotes);
      toast.error('Could not save note to cloud storage. Changes reverted.');
      throw err;
    }
  }, [user]);

  const updateNote = useCallback(async (noteId: string, data: Partial<Note>) => {
    if (!user) return;
    const now = Date.now();
    const previousNotes = [...notesRef.current];

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, ...data, updatedAt: now } : n))
    );

    try {
      await setDocument(doc(db, 'users', user.uid, 'notes', noteId), {
        ...data,
        updatedAt: now,
      });
    } catch (err: any) {
      console.error('Failed to update note in Firestore:', err);
      // Rollback on failure
      setNotes(previousNotes);
      toast.error('Autosave sync failed. Please check your internet connection.');
      throw err;
    }
  }, [user]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!user) return;
    const previousNotes = [...notesRef.current];

    // Optimistic deletion
    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    try {
      await removeDocument(doc(db, 'users', user.uid, 'notes', noteId));
    } catch (err: any) {
      console.error('Failed to delete note from Firestore:', err);
      // Rollback on failure
      setNotes(previousNotes);
      toast.error('Failed to delete note from cloud storage.');
      throw err;
    }
  }, [user]);

  const value = useMemo<NotesContextValue>(() => ({
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
  }), [notes, loading, addNote, updateNote, deleteNote]);

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotesContext(): NotesContextValue {
  const context = useContext(NotesContext);
  if (!context) {
    return {
      notes: [],
      loading: false,
      addNote: async () => null,
      updateNote: async () => {},
      deleteNote: async () => {},
    };
  }
  return context;
}
