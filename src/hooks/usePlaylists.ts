'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';
import {
  getPlaylistsCollection,
  subscribeToCollection,
} from '@/lib/firestore';
import type { MusicTrack } from '@/lib/musicDb';

// ── Types ──

/** Track metadata saved to Firebase (no audio blobs — those stay in IndexedDB) */
export interface PlaylistTrackData {
  id: string;
  name: string;
  artists: string;
  image: string;
  url: string;
  duration: number;
  isLocal: boolean;
}

export interface SavedPlaylist {
  id: string;
  name: string;
  tracks: PlaylistTrackData[];
  trackCount: number;
  createdAt: unknown;
  updatedAt: unknown;
}

/** Convert a MusicTrack to the lightweight Firebase-safe format (no blobs) */
function toTrackData(track: MusicTrack): PlaylistTrackData {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists,
    image: track.image,
    url: track.url,
    duration: track.duration,
    isLocal: track.isLocal,
  };
}

export function usePlaylists() {
  const { user } = useAuthContext();
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Subscribe to playlists in real-time ──
  useEffect(() => {
    if (!user?.uid) {
      setPlaylists([]);
      setLoading(false);
      return;
    }

    const collRef = getPlaylistsCollection(user.uid);
    const unsub = subscribeToCollection<SavedPlaylist>(
      collRef,
      (items) => {
        setPlaylists(items);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user?.uid]);

  // ── Save current queue as a new playlist ──
  const savePlaylist = useCallback(async (name: string, tracks: MusicTrack[]) => {
    if (!user?.uid || !name.trim()) return;

    const playlistId = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ref = doc(db, 'users', user.uid, 'playlists', playlistId);

    await setDoc(ref, {
      name: name.trim(),
      tracks: tracks.map(toTrackData),
      trackCount: tracks.length,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return playlistId;
  }, [user?.uid]);

  // ── Update an existing playlist's tracks ──
  const updatePlaylistTracks = useCallback(async (playlistId: string, tracks: MusicTrack[]) => {
    if (!user?.uid) return;

    const ref = doc(db, 'users', user.uid, 'playlists', playlistId);
    await setDoc(ref, {
      tracks: tracks.map(toTrackData),
      trackCount: tracks.length,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [user?.uid]);

  // ── Rename a playlist ──
  const renamePlaylist = useCallback(async (playlistId: string, newName: string) => {
    if (!user?.uid || !newName.trim()) return;

    const ref = doc(db, 'users', user.uid, 'playlists', playlistId);
    await setDoc(ref, {
      name: newName.trim(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [user?.uid]);

  // ── Delete a playlist ──
  const deletePlaylist = useCallback(async (playlistId: string) => {
    if (!user?.uid) return;

    const ref = doc(db, 'users', user.uid, 'playlists', playlistId);
    await deleteDoc(ref);
  }, [user?.uid]);

  // ── Add a single track to an existing playlist ──
  const addTrackToPlaylist = useCallback(async (playlistId: string, track: MusicTrack) => {
    if (!user?.uid) return;

    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    // Don't add duplicates
    if (playlist.tracks.some(t => t.id === track.id)) return;

    const updatedTracks = [...playlist.tracks, toTrackData(track)];
    const ref = doc(db, 'users', user.uid, 'playlists', playlistId);
    await setDoc(ref, {
      tracks: updatedTracks,
      trackCount: updatedTracks.length,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [user?.uid, playlists]);

  return {
    playlists,
    loading,
    savePlaylist,
    updatePlaylistTracks,
    renamePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
  };
}
