'use client';

// ============================================================
// StudyQuest AI — Gamification Hook
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { doc, collection, onSnapshot, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  getGamificationRef,
  subscribeToDocument,
  updateDocument,
  setDocument,
} from '@/lib/firestore';
import { GamificationData, XPEvent } from '@/types';
import {
  getLevelFromXP,
  ACHIEVEMENTS,
  XP_AWARDS,
} from '@/lib/constants';
import { useAuthContext } from '@/context/AuthContext';

interface UseGamificationReturn {
  gamification: GamificationData | null;
  loading: boolean;
  xpHistory: Record<string, number>; // date → XP earned that day
  awardXP: (amount: number, reason: string) => Promise<{ leveledUp: boolean; newAchievements: string[] }>;
  checkStreak: () => Promise<void>;
}

export function useGamification(): UseGamificationReturn {
  const { user } = useAuthContext();
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [xpHistory, setXpHistory] = useState<Record<string, number>>({});

  // Subscribe to gamification data
  useEffect(() => {
    if (!user) {
      setGamification(null);
      setLoading(false);
      return;
    }

    const ref = getGamificationRef(user.uid);
    const unsub = subscribeToDocument<GamificationData>(ref, (data) => {
      setGamification(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Subscribe to XP history (daily log)
  useEffect(() => {
    if (!user) { setXpHistory({}); return; }

    const xpLogRef = collection(db, 'users', user.uid, 'xpLog');
    const unsub = onSnapshot(xpLogRef, (snap) => {
      const history: Record<string, number> = {};
      snap.docs.forEach((d) => {
        history[d.id] = (d.data().totalXp as number) || 0;
      });
      setXpHistory(history);
    });

    return () => unsub();
  }, [user]);

  // Award XP and check for level-ups & achievements
  const awardXP = useCallback(
    async (amount: number, reason: string): Promise<{ leveledUp: boolean; newAchievements: string[] }> => {
      if (!user || !gamification) return { leveledUp: false, newAchievements: [] };

      const ref = getGamificationRef(user.uid);
      const newXP = gamification.xp + amount;
      const oldLevel = gamification.level;
      const newLevel = getLevelFromXP(newXP);
      const leveledUp = newLevel > oldLevel;

      // Check for new achievements
      const updatedData: GamificationData = {
        ...gamification,
        xp: newXP,
        level: newLevel,
      };

      const newAchievements: string[] = [];
      for (const achievement of ACHIEVEMENTS) {
        if (
          !gamification.achievements.includes(achievement.id) &&
          achievement.condition(updatedData)
        ) {
          newAchievements.push(achievement.id);
        }
      }

      await updateDocument(ref, {
        xp: newXP + newAchievements.reduce((sum, id) => {
          const a = ACHIEVEMENTS.find((x) => x.id === id);
          return sum + (a?.xpReward || 0);
        }, 0),
        level: getLevelFromXP(
          newXP + newAchievements.reduce((sum, id) => {
            const a = ACHIEVEMENTS.find((x) => x.id === id);
            return sum + (a?.xpReward || 0);
          }, 0),
        ),
        achievements: [...gamification.achievements, ...newAchievements],
      });

      // Log daily XP for heatmap
      const today = new Date().toISOString().split('T')[0];
      const dayLogRef = doc(db, 'users', user.uid, 'xpLog', today);
      try {
        await setDocument(dayLogRef, { totalXp: increment(amount), lastUpdated: Date.now() });
      } catch {
        // If doc doesn't exist yet, create it
        await setDocument(dayLogRef, { totalXp: amount, lastUpdated: Date.now() }, false);
      }

      return { leveledUp, newAchievements };
    },
    [user, gamification],
  );

  // Check and update daily streak
  const checkStreak = useCallback(async () => {
    if (!user || !gamification) return;

    const today = new Date().toISOString().split('T')[0];
    if (gamification.lastActiveDate === today) return; // Already active today

    const ref = getGamificationRef(user.uid);
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let newStreak: number;
    if (gamification.lastActiveDate === yesterday) {
      newStreak = gamification.streak + 1;
    } else if (!gamification.lastActiveDate) {
      newStreak = 1;
    } else {
      newStreak = 1; // Streak broken
    }

    const longestStreak = Math.max(gamification.longestStreak, newStreak);

    await updateDocument(ref, {
      streak: newStreak,
      longestStreak,
      lastActiveDate: today,
    });
  }, [user, gamification]);

  return { gamification, loading, xpHistory, awardXP, checkStreak };
}

