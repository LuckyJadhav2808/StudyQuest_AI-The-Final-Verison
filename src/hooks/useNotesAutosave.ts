'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Note } from '@/types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline';

interface UseNotesAutosaveOptions {
  selectedNote: Note | null;
  onSave: (noteId: string, data: { title: string; content: string }) => Promise<void>;
  debounceMs?: number;
}

export function useNotesAutosave({
  selectedNote,
  onSave,
  debounceMs = 3500,
}: UseNotesAutosaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const pendingDataRef = useRef<{ title: string; content: string } | null>(null);
  const selectedNoteRef = useRef<Note | null>(selectedNote);
  selectedNoteRef.current = selectedNote;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Flush any pending unsaved changes immediately
  const flushAutosave = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (!dirtyRef.current || !pendingDataRef.current || !selectedNoteRef.current) {
      return;
    }

    const dataToSave = { ...pendingDataRef.current };
    const noteId = selectedNoteRef.current.id;

    try {
      setSaveStatus('saving');
      await onSaveRef.current(noteId, dataToSave);

      // Only mark clean if no newer edits occurred during save
      if (
        pendingDataRef.current?.content === dataToSave.content &&
        pendingDataRef.current?.title === dataToSave.title
      ) {
        dirtyRef.current = false;
        pendingDataRef.current = null;
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.warn('[useNotesAutosave] flushAutosave deferred to offline/local cache:', err);
      // Retain pending data and dirty state so nothing is ever lost
      dirtyRef.current = true;
      setSaveStatus('offline');
    }
  }, []);

  // Cancel any active debounce timers and discard dirty/pending data (e.g. before note deletion)
  const cancelAutosave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    dirtyRef.current = false;
    pendingDataRef.current = null;
    setSaveStatus('idle');
  }, []);

  // Schedule an autosave with debounce and automatic retry on failure
  const scheduleAutosave = useCallback((content: string, title: string) => {
    if (!selectedNoteRef.current) return;

    dirtyRef.current = true;
    pendingDataRef.current = { title, content };

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      if (!dirtyRef.current || !pendingDataRef.current || !selectedNoteRef.current) return;

      const currentNoteId = selectedNoteRef.current.id;
      const dataToSave = { ...pendingDataRef.current };

      try {
        setSaveStatus('saving');
        await onSaveRef.current(currentNoteId, dataToSave);

        // Check if user edited more while saving was in-flight
        if (
          pendingDataRef.current?.content === dataToSave.content &&
          pendingDataRef.current?.title === dataToSave.title
        ) {
          dirtyRef.current = false;
          pendingDataRef.current = null;
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        console.warn('[useNotesAutosave] Autosave deferred to offline/local cache, scheduling retry:', err);
        dirtyRef.current = true;
        setSaveStatus('offline');

        // Schedule an automatic retry in 5000ms
        retryTimerRef.current = setTimeout(() => {
          if (dirtyRef.current && pendingDataRef.current && selectedNoteRef.current) {
            scheduleAutosave(pendingDataRef.current.content, pendingDataRef.current.title);
          }
        }, 5000);
      }
    }, debounceMs);
  }, [debounceMs]);

  // Window beforeunload warning if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your note. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Clean up and flush on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (dirtyRef.current && pendingDataRef.current && selectedNoteRef.current) {
        const { title, content } = pendingDataRef.current;
        onSaveRef.current(selectedNoteRef.current.id, { title, content }).catch((err) => {
          console.warn('[useNotesAutosave] Unmount autosave flush error (cached locally):', err);
        });
      }
    };
  }, []);

  return {
    saveStatus,
    setSaveStatus,
    scheduleAutosave,
    flushAutosave,
    cancelAutosave,
    isDirty: () => dirtyRef.current,
  };
}
