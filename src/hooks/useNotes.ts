'use client';

// ============================================================
// StudyQuest AI — useNotes Hook
// Re-exports from shared NotesContext to ensure singleton listener
// and 100% backward compatibility for all consuming components.
// ============================================================

import { useNotesContext } from '@/context/NotesContext';
import type { NotesContextValue } from '@/context/NotesContext';

export type UseNotesReturn = NotesContextValue;

export function useNotes(): NotesContextValue {
  return useNotesContext();
}
