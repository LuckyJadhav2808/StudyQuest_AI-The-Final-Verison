'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatarSeed: string;
  avatarStyle: string;
  xp: number;
  level: number;
  streak: number;
}

interface UseLeaderboardReturn {
  leaders: LeaderboardEntry[];
  loading: boolean;
  userRank: number | null; // null if not in top 50
}

export function useLeaderboard(): UseLeaderboardReturn {
  const { user } = useAuthContext();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const leaderboardRef = collection(db, 'leaderboard');
    const q = query(leaderboardRef, orderBy('xp', 'desc'), limit(50));

    const unsub = onSnapshot(q, (snap) => {
      const entries: LeaderboardEntry[] = snap.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      } as LeaderboardEntry));
      setLeaders(entries);
      setLoading(false);
    }, () => {
      // If collection doesn't exist yet, just show empty
      setLeaders([]);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const userRank = user
    ? leaders.findIndex((l) => l.uid === user.uid) + 1 || null
    : null;

  return { leaders, loading, userRank };
}
