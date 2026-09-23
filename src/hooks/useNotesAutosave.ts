'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Note } from '@/types';

export type SaveStatus = 'idle' | 'saving' | 'saved';

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

    if (!dirtyRef.current || !pendingDataRef.current || !selectedNoteRef.current) {
      return;
    }

    const { title, content } = pendingDataRef.current;
    const noteId = selectedNoteRef.current.id;
    dirtyRef.current = false;
    pendingDataRef.current = null;

    try {
      setSaveStatus('saving');
      await onSaveRef.current(noteId, { title, content });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Error in flushAutosave:', err);
      setSaveStatus('idle');
    }
  }, []);

  // Schedule an autosave with debounce
  const scheduleAutosave = useCallback((content: string, title: string) => {
    if (!selectedNoteRef.current) return;

    dirtyRef.current = true;
    pendingDataRef.current = { title, content };

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      if (!dirtyRef.current || !pendingDataRef.current || !selectedNoteRef.current) return;

      const currentNoteId = selectedNoteRef.current.id;
      const dataToSave = pendingDataRef.current;
      dirtyRef.current = false;
      pendingDataRef.current = null;

      try {
        setSaveStatus('saving');
        await onSaveRef.current(currentNoteId, dataToSave);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('idle');
      }
    }, debounceMs);
  }, [debounceMs]);

  // Window beforeunload warning / flush if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        // Trigger browser's native leave confirmation
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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (dirtyRef.current && pendingDataRef.current && selectedNoteRef.current) {
        // Fire and forget flush on unmount
        const { title, content } = pendingDataRef.current;
        onSaveRef.current(selectedNoteRef.current.id, { title, content }).catch((err) => {
          console.warn('Unmount autosave flush error:', err);
        });
      }
    };
  }, []);

  return {
    saveStatus,
    setSaveStatus,
    scheduleAutosave,
    flushAutosave,
    isDirty: () => dirtyRef.current,
  };
}
