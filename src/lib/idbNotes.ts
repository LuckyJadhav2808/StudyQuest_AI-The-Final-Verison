// ============================================================
// StudyQuest AI — IndexedDB High-Capacity Local Notes Storage
// - Replaces 5 MB localStorage with gigabytes of IndexedDB storage
// - Completely eliminates QuotaExceededError for multi-page notes and media
// - Smooth one-time automatic migration of existing localStorage notes
// ============================================================

import { createStore, get, set, del, entries } from 'idb-keyval';
import { Note } from '@/types';

// Dedicated IndexedDB custom stores for isolation & maximum throughput
const notesStore = typeof window !== 'undefined'
  ? createStore('studyquest_notes_db', 'notes_store')
  : (null as any);

const syncQueueStore = typeof window !== 'undefined'
  ? createStore('studyquest_notes_db', 'sync_queue_store')
  : (null as any);

const LOCAL_NOTE_PREFIX = 'sq_local_note_';
const SYNC_QUEUE_KEY = 'sq_notes_sync_queue';

// In-memory instant read cache for sub-millisecond synchronous hydration in React
const memoryNotesCache = new Map<string, Partial<Note>>();
let isMemoryHydrated = false;

/**
 * Initializes the in-memory cache from IndexedDB on startup.
 */
export async function hydrateMemoryNotesCache(): Promise<void> {
  if (typeof window === 'undefined' || isMemoryHydrated || !notesStore) return;
  try {
    const allEntries = await entries<string, Partial<Note>>(notesStore);
    for (const [key, note] of allEntries) {
      if (note && key) {
        memoryNotesCache.set(key, note);
      }
    }
    isMemoryHydrated = true;
  } catch (err) {
    console.warn('[idbNotes] Failed to hydrate in-memory notes cache:', err);
  }
}

/**
 * Synchronous fast-read from in-memory cache (zero flicker).
 */
export function getCachedNoteSync(noteId: string): Partial<Note> | null {
  return memoryNotesCache.get(noteId) || null;
}

/**
 * Retrieves a note from IndexedDB with in-memory fallback.
 */
export async function getIdbNote(noteId: string): Promise<Partial<Note> | null> {
  if (memoryNotesCache.has(noteId)) {
    return memoryNotesCache.get(noteId) || null;
  }
  if (typeof window === 'undefined' || !notesStore) return null;
  try {
    const note = await get<Partial<Note>>(noteId, notesStore);
    if (note) {
      memoryNotesCache.set(noteId, note);
      return note;
    }
    return null;
  } catch (err) {
    console.warn(`[idbNotes] Failed to read note ${noteId} from IndexedDB:`, err);
    return null;
  }
}

/**
 * Saves a note to IndexedDB and updates the in-memory cache.
 */
export async function saveIdbNote(noteId: string, data: Partial<Note>): Promise<void> {
  const existing = memoryNotesCache.get(noteId) || {};
  const updated: Partial<Note> = { ...existing, ...data, id: noteId };
  memoryNotesCache.set(noteId, updated);

  if (typeof window === 'undefined' || !notesStore) return;
  try {
    await set(noteId, updated, notesStore);
  } catch (err) {
    console.error(`[idbNotes] Failed to write note ${noteId} to IndexedDB:`, err);
  }
}

/**
 * Removes a note from IndexedDB and clears memory cache.
 */
export async function removeIdbNote(noteId: string): Promise<void> {
  memoryNotesCache.delete(noteId);
  if (typeof window === 'undefined' || !notesStore) return;
  try {
    await del(noteId, notesStore);
  } catch (err) {
    console.warn(`[idbNotes] Failed to remove note ${noteId} from IndexedDB:`, err);
  }
}

/**
 * Retrieves all notes from IndexedDB.
 */
export async function getAllIdbNotes(): Promise<Record<string, Partial<Note>>> {
  if (typeof window === 'undefined' || !notesStore) {
    const result: Record<string, Partial<Note>> = {};
    for (const [k, v] of memoryNotesCache.entries()) {
      result[k] = v;
    }
    return result;
  }
  try {
    const allEntries = await entries<string, Partial<Note>>(notesStore);
    const result: Record<string, Partial<Note>> = {};
    for (const [k, v] of allEntries) {
      result[k] = v;
      memoryNotesCache.set(k, v);
    }
    return result;
  } catch {
    const result: Record<string, Partial<Note>> = {};
    for (const [k, v] of memoryNotesCache.entries()) {
      result[k] = v;
    }
    return result;
  }
}

/**
 * Retrieves the pending background sync queue from IndexedDB.
 */
export async function getIdbSyncQueue(): Promise<Record<string, { data: Partial<Note>; updatedAt: number }>> {
  if (typeof window === 'undefined' || !syncQueueStore) return {};
  try {
    const queue = await get<Record<string, { data: Partial<Note>; updatedAt: number }>>(SYNC_QUEUE_KEY, syncQueueStore);
    return queue || {};
  } catch {
    return {};
  }
}

/**
 * Adds an item to the background sync queue in IndexedDB.
 */
export async function addToIdbSyncQueue(noteId: string, data: Partial<Note>, updatedAt: number): Promise<void> {
  if (typeof window === 'undefined' || !syncQueueStore) return;
  try {
    const queue = await getIdbSyncQueue();
    const prevEntry = queue[noteId];
    queue[noteId] = {
      data: { ...(prevEntry?.data || {}), ...data },
      updatedAt,
    };
    await set(SYNC_QUEUE_KEY, queue, syncQueueStore);
  } catch (err) {
    console.warn('[idbNotes] Failed to add to IndexedDB sync queue:', err);
  }
}

/**
 * Removes an item from the background sync queue in IndexedDB.
 */
export async function removeFromIdbSyncQueue(noteId: string): Promise<void> {
  if (typeof window === 'undefined' || !syncQueueStore) return;
  try {
    const queue = await getIdbSyncQueue();
    delete queue[noteId];
    await set(SYNC_QUEUE_KEY, queue, syncQueueStore);
  } catch (err) {
    console.warn('[idbNotes] Failed to remove from IndexedDB sync queue:', err);
  }
}

/**
 * One-time migration: moves existing notes and sync queue from localStorage into IndexedDB,
 * and clears the bloated keys from localStorage to instantly eliminate QuotaExceededError.
 */
export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  if (typeof window === 'undefined' || !notesStore) return;

  try {
    let migratedCount = 0;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(LOCAL_NOTE_PREFIX)) {
        const noteId = key.slice(LOCAL_NOTE_PREFIX.length);
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            await set(noteId, parsed, notesStore);
            memoryNotesCache.set(noteId, parsed);
            migratedCount++;
            keysToRemove.push(key);
          } catch {}
        }
      } else if (key === SYNC_QUEUE_KEY) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsedQueue = JSON.parse(raw);
            const currentIdbQueue = await getIdbSyncQueue();
            const mergedQueue = { ...currentIdbQueue, ...parsedQueue };
            await set(SYNC_QUEUE_KEY, mergedQueue, syncQueueStore);
            keysToRemove.push(key);
          } catch {}
        }
      }
    }

    // Safely remove oversized migrated keys from localStorage to relieve the 5MB quota
    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }

    if (migratedCount > 0) {
      console.info(`[idbNotes] Successfully migrated ${migratedCount} notes from localStorage to high-capacity IndexedDB.`);
    }
  } catch (err) {
    console.warn('[idbNotes] LocalStorage to IndexedDB migration notice:', err);
  }
}
