'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';

/* ============================================================
   usePresence — Tracks and broadcasts user online status
   
   Uses Firestore to store presence data:
   - users/{uid}/data/presence → { online: true, lastSeen: timestamp, activity: string }
   
   Considers a user "online" if lastSeen is within the last 3 minutes.
   ============================================================ */

interface PresenceData {
  online: boolean;
  lastSeen: number;
  activity: string; // e.g. "studying", "coding", "idle"
}

const HEARTBEAT_INTERVAL = 60000; // 1 minute
const ONLINE_THRESHOLD = 180000; // 3 minutes

export function usePresence() {
  const { user } = useAuthContext();

  // ── Broadcast own presence ─────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const presenceRef = doc(db, 'users', user.uid, 'data', 'presence');

    const updatePresence = (activity = 'online') => {
      setDoc(presenceRef, {
        online: true,
        lastSeen: Date.now(),
        activity,
      }, { merge: true }).catch(() => {});
    };

    // Initial heartbeat
    updatePresence();

    // Periodic heartbeat
    const interval = setInterval(() => updatePresence(), HEARTBEAT_INTERVAL);

    // Set offline on tab close
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability
      const data = JSON.stringify({ online: false, lastSeen: Date.now(), activity: 'offline' });
      navigator.sendBeacon?.(`/api/presence?uid=${user.uid}`, data);
      // Also try direct write
      setDoc(presenceRef, { online: false, lastSeen: Date.now(), activity: 'offline' }, { merge: true }).catch(() => {});
    };

    // Set offline on visibility hidden (tab switch)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setDoc(presenceRef, { online: false, lastSeen: Date.now(), activity: 'away' }, { merge: true }).catch(() => {});
      } else {
        updatePresence();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
      // Mark offline on unmount
      setDoc(presenceRef, { online: false, lastSeen: Date.now(), activity: 'offline' }, { merge: true }).catch(() => {});
    };
  }, [user]);

  // ── Subscribe to a friend's presence ───────────────────────
  const subscribeFriendPresence = useCallback(
    (friendUid: string, callback: (data: PresenceData | null) => void) => {
      const presenceRef = doc(db, 'users', friendUid, 'data', 'presence');
      return onSnapshot(presenceRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as PresenceData;
          // Check if still "online" based on threshold
          const isActuallyOnline = data.online && (Date.now() - data.lastSeen) < ONLINE_THRESHOLD;
          callback({ ...data, online: isActuallyOnline });
        } else {
          callback(null);
        }
      });
    },
    []
  );

  return { subscribeFriendPresence };
}

/** Hook to watch a single friend's online status */
export function useFriendPresence(friendUid: string | null) {
  const { subscribeFriendPresence } = usePresence();
  const [presence, setPresence] = useState<PresenceData | null>(null);

  useEffect(() => {
    if (!friendUid) { setPresence(null); return; }
    const unsub = subscribeFriendPresence(friendUid, setPresence);
    return () => unsub();
  }, [friendUid, subscribeFriendPresence]);

  return presence;
}

/** Hook to watch multiple friends' online status */
export function useFriendsPresence(friendUids: string[]) {
  const { subscribeFriendPresence } = usePresence();
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceData>>({});

  useEffect(() => {
    if (friendUids.length === 0) return;

    const unsubs = friendUids.map((uid) =>
      subscribeFriendPresence(uid, (data) => {
        setPresenceMap((prev) => ({
          ...prev,
          [uid]: data || { online: false, lastSeen: 0, activity: 'offline' },
        }));
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [friendUids.join(','), subscribeFriendPresence]);

  return presenceMap;
}
