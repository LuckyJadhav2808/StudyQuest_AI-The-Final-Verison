'use client';

// ============================================================
// StudyQuest AI — Shared Notes Context (Local-First Singleton)
// - Resilient offline-first persistence with localStorage mirroring
// - Automatic background sync queue with online reconnection listener
// - Zero destructive state rollbacks on network hiccups
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
  isOfflineSyncPending?: boolean;
}

const LOCAL_NOTE_PREFIX = 'sq_local_note_';
const SYNC_QUEUE_KEY = 'sq_notes_sync_queue';

function getLocalNote(noteId: string): Partial<Note> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_NOTE_PREFIX}${noteId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalNote(noteId: string, data: Partial<Note>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalNote(noteId) || {};
    const updated = { ...existing, ...data, id: noteId };
    localStorage.setItem(`${LOCAL_NOTE_PREFIX}${noteId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn('[NotesContext] LocalStorage write failed (possibly quota):', err);
  }
}

function removeLocalNote(noteId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${LOCAL_NOTE_PREFIX}${noteId}`);
  } catch {}
}

function getSyncQueue(): Record<string, { data: Partial<Note>; updatedAt: number }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function addToSyncQueue(noteId: string, data: Partial<Note>, updatedAt: number): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = getSyncQueue();
    const prevEntry = queue[noteId];
    queue[noteId] = {
      data: { ...(prevEntry?.data || {}), ...data },
      updatedAt,
    };
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

function removeFromSyncQueue(noteId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = getSyncQueue();
    delete queue[noteId];
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineSyncPending, setIsOfflineSyncPending] = useState(false);
  const notesRef = useRef<Note[]>([]);
  notesRef.current = notes;

  // Flush pending sync queue whenever online or user becomes available
  const flushSyncQueue = useCallback(async () => {
    if (!user || typeof window === 'undefined') return;
    const queue = getSyncQueue();
    const noteIds = Object.keys(queue);
    if (noteIds.length === 0) {
      setIsOfflineSyncPending(false);
      return;
    }

    setIsOfflineSyncPending(true);
    for (const noteId of noteIds) {
      const item = queue[noteId];
      if (!item) continue;
      try {
        await setDocument(doc(db, 'users', user.uid, 'notes', noteId), {
          ...item.data,
          updatedAt: item.updatedAt,
        }, true);
        removeFromSyncQueue(noteId);
      } catch (err: any) {
        if (err?.code === 'resource-exhausted') {
          console.warn('[NotesContext] Firestore daily quota reached. Pausing cloud sync queue; notes are safe in localStorage.');
          break;
        }
        console.warn(`[NotesContext] Retry sync failed for note ${noteId}:`, err);
      }
    }

    const remaining = Object.keys(getSyncQueue());
    setIsOfflineSyncPending(remaining.length > 0);
  }, [user]);

  // Online / offline event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      toast.success('Connection restored! Syncing notes... 🌐', { id: 'notes-online-sync' });
      flushSyncQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [flushSyncQueue]);

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
      (remoteItems) => {
        // Merge with any fresher local edits to prevent cloud clobbering
        const merged = remoteItems.map((remoteNote) => {
          const local = getLocalNote(remoteNote.id);
          if (local && local.updatedAt && local.updatedAt > (remoteNote.updatedAt || 0)) {
            return { ...remoteNote, ...local } as Note;
          }
          return remoteNote;
        });

        setNotes(merged);
        setLoading(false);

        // Attempt background queue flush if pending items exist
        flushSyncQueue();
      }
    );
    return () => unsub();
  }, [user, flushSyncQueue]);

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

    // 1. Optimistic insert & immediate local cache
    setNotes((prev) => [newNote, ...prev]);
    saveLocalNote(id, newNote);

    // 2. Cloud sync
    try {
      await setDocument(doc(db, 'users', user.uid, 'notes', id), newNote, false);
      removeFromSyncQueue(id);
      return id;
    } catch (err: any) {
      console.warn('[NotesContext] Note created locally; cloud sync queued:', err);
      addToSyncQueue(id, newNote, now);
      setIsOfflineSyncPending(true);
      return id;
    }
  }, [user]);

  const updateNote = useCallback(async (noteId: string, data: Partial<Note>) => {
    if (!user) return;
    const now = Date.now();

    // 1. Optimistic update in state
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, ...data, updatedAt: now } : n))
    );

    // 2. Immediate local cache write (instant safe persistence)
    saveLocalNote(noteId, { ...data, updatedAt: now });

    // 3. Attempt Firestore cloud sync (without destructive rollback on network drop)
    try {
      await setDocument(doc(db, 'users', user.uid, 'notes', noteId), {
        ...data,
        updatedAt: now,
      }, true);
      removeFromSyncQueue(noteId);
    } catch (err: any) {
      console.warn('[NotesContext] Note saved locally; cloud sync queued:', err);
      addToSyncQueue(noteId, data, now);
      setIsOfflineSyncPending(true);
      // NOTE: We deliberately do NOT rollback in-memory notes nor throw an error!
      // The user's work is safely persisted locally and queued for automatic sync.
    }
  }, [user]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!user) return;
    const previousNotes = [...notesRef.current];

    // Optimistic deletion & cleanup
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    removeLocalNote(noteId);
    removeFromSyncQueue(noteId);

    try {
      await removeDocument(doc(db, 'users', user.uid, 'notes', noteId));
    } catch (err: any) {
      console.error('Failed to delete note from Firestore:', err);
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
    isOfflineSyncPending,
  }), [notes, loading, addNote, updateNote, deleteNote, isOfflineSyncPending]);

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
      isOfflineSyncPending: false,
    };
  }
  return context;
}
