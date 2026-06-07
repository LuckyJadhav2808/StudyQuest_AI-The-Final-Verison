/**
 * musicDb.ts — IndexedDB helper for persistent music queue & cached audio
 *
 * Stores:
 *   - "tracks" store: playlist metadata + optional cached audio blobs
 *   - "state"  store: player state (current index, volume, etc.)
 *
 * Uses raw IndexedDB API — no external dependencies.
 */

const DB_NAME = 'studyquest-music';
const DB_VERSION = 1;
const TRACKS_STORE = 'tracks';
const STATE_STORE = 'state';

// ── Types ──

export interface MusicTrack {
  /** Unique ID — JioSaavn song ID for online, or a generated UUID for local */
  id: string;
  name: string;
  artists: string;
  /** Album art URL (online) or empty string (local) */
  image: string;
  /** Streaming URL for online tracks, or empty string if cached locally */
  url: string;
  /** Duration in seconds (0 if unknown) */
  duration: number;
  /** Whether this track was added from a local file */
  isLocal: boolean;
  /** Cached audio blob — stored in IndexedDB for offline playback */
  audioBlob?: Blob;
}

export interface MusicPlayerState {
  currentTrackIndex: number;
  volume: number;
  isPlaying: boolean;
}

// ── DB Setup ──

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Track Operations ──

/** Save a single track (with optional audio blob) to IndexedDB */
export async function saveTrack(track: MusicTrack): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    tx.objectStore(TRACKS_STORE).put(track);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Save the entire playlist order + track data */
export async function savePlaylist(tracks: MusicTrack[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    // Clear existing tracks
    store.clear();
    // Write all tracks
    for (const track of tracks) {
      store.put(track);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load all tracks from IndexedDB */
export async function loadPlaylist(): Promise<MusicTrack[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readonly');
    const request = tx.objectStore(TRACKS_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/** Remove a track by ID */
export async function removeTrackFromDb(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    tx.objectStore(TRACKS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Clear all tracks */
export async function clearPlaylist(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    tx.objectStore(TRACKS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Player State Operations ──

const PLAYER_STATE_KEY = 'playerState';
const PLAYLIST_ORDER_KEY = 'playlistOrder';

/** Save player state (index, volume, etc.) */
export async function savePlayerState(state: MusicPlayerState): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite');
    tx.objectStore(STATE_STORE).put(state, PLAYER_STATE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load player state */
export async function loadPlayerState(): Promise<MusicPlayerState | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readonly');
    const request = tx.objectStore(STATE_STORE).get(PLAYER_STATE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/** Save playlist order (just the IDs, so we can reconstruct order from tracks store) */
export async function savePlaylistOrder(trackIds: string[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite');
    tx.objectStore(STATE_STORE).put(trackIds, PLAYLIST_ORDER_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load playlist order */
export async function loadPlaylistOrder(): Promise<string[] | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readonly');
    const request = tx.objectStore(STATE_STORE).get(PLAYLIST_ORDER_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// ── Audio Caching ──

/** Cache an online song's audio for offline playback */
export async function cacheAudioBlob(trackId: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    const getReq = store.get(trackId);
    getReq.onsuccess = () => {
      const track = getReq.result;
      if (track) {
        track.audioBlob = blob;
        store.put(track);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Generate a playable object URL from a cached track's blob */
export function createObjectUrlFromBlob(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/** Generate a UUID for local tracks */
export function generateTrackId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
