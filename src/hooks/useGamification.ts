'use client';

// ============================================================
// StudyQuest AI — Gamification Hook
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, collection, onSnapshot, increment, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  getGamificationRef,
  subscribeToDocument,
  setDocument,
} from '@/lib/firestore';
import { GamificationData } from '@/types';
import {
  getLevelFromXP,
  ACHIEVEMENTS,
  XP_AWARDS,
  COIN_AWARDS,
} from '@/lib/constants';
import { useAuthContext } from '@/context/AuthContext';
import { getLocalDateString, getLocalYesterdayDateString } from '@/lib/dateUtils';

interface UseGamificationReturn {
  gamification: GamificationData | null;
  gamificationData: GamificationData | null;
  loading: boolean;
  xpHistory: Record<string, number>;
  awardXP: (amount: number, reason: string) => Promise<{ leveledUp: boolean; newAchievements: string[] }>;
  checkStreak: () => Promise<void>;
}

export function useGamification(): UseGamificationReturn {
  const { user, profile } = useAuthContext();
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [xpHistory, setXpHistory] = useState<Record<string, number>>({});

  // ── Ref to always hold the latest gamification (prevents stale closures) ──
  const gamRef = useRef<GamificationData | null>(null);
  useEffect(() => { gamRef.current = gamification; }, [gamification]);

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
      gamRef.current = data;
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

  // Award XP and check for level-ups & achievements using Firestore Transactions
  // to avoid client-side race conditions when multiple actions complete concurrently.
  const awardXP = useCallback(
    async (amount: number, reason: string): Promise<{ leveledUp: boolean; newAchievements: string[] }> => {
      if (!user) return { leveledUp: false, newAchievements: [] };

      const ref = getGamificationRef(user.uid);

      try {
        const result = await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(ref);
          let g: GamificationData;

          if (!docSnap.exists()) {
            g = {
              xp: 0,
              level: 1,
              streak: 0,
              longestStreak: 0,
              achievements: [],
              lastActiveDate: '',
              unlockedTitles: [],
              totalTasksCompleted: 0,
              totalFocusMinutes: 0,
              totalNotesCreated: 0,
              totalCodeRuns: 0,
              nightOwlCount: 0,
              dailyChallengeStreak: 0,
              lastDailyChallengeDate: '',
            };
          } else {
            g = docSnap.data() as GamificationData;
          }

          const newXP = g.xp + amount;
          const oldLevel = g.level;
          const newLevel = getLevelFromXP(newXP);
          const leveledUp = newLevel > oldLevel;

          const updatedData: GamificationData = {
            ...g,
            xp: newXP,
            level: newLevel,
          };

          const newAchievements: string[] = [];
          for (const achievement of ACHIEVEMENTS) {
            if (
              !g.achievements.includes(achievement.id) &&
              achievement.condition(updatedData)
            ) {
              newAchievements.push(achievement.id);
            }
          }

          const achievementBonusXP = newAchievements.reduce((sum, id) => {
            const a = ACHIEVEMENTS.find((x) => x.id === id);
            return sum + (a?.xpReward || 0);
          }, 0);

          const finalXP = newXP + achievementBonusXP;
          const finalLevel = getLevelFromXP(finalXP);
          const finalAchievements = [...g.achievements, ...newAchievements];

          transaction.set(ref, {
            xp: finalXP,
            level: finalLevel,
            achievements: finalAchievements,
          }, { merge: true });

          return { leveledUp, newAchievements, finalXP, finalLevel };
        });

        // Sync public leaderboard entry (non-blocking)
        const leaderboardRef = doc(db, 'leaderboard', user.uid);
        setDocument(leaderboardRef, {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName || 'Adventurer',
          avatarSeed: profile?.avatarSeed || user.uid,
          avatarStyle: profile?.avatarStyle || 'adventurer',
          xp: result.finalXP,
          level: result.finalLevel,
          streak: gamRef.current?.streak || 0,
          updatedAt: Date.now(),
        }).catch(() => {});

        // Log daily XP for heatmap (non-blocking)
        const today = getLocalDateString();
        const dayLogRef = doc(db, 'users', user.uid, 'xpLog', today);
        setDocument(dayLogRef, { totalXp: increment(amount), lastUpdated: Date.now() })
          .catch(() => setDocument(dayLogRef, { totalXp: amount, lastUpdated: Date.now() }, false))
          .catch(() => {});

        // Award Quest Coins alongside XP (non-blocking)
        const invRef = doc(db, 'users', user.uid, 'data', 'inventory');
        let coinAmount = Math.floor(amount / 5);
        if (reason.toLowerCase().includes('task')) coinAmount = COIN_AWARDS.TASK_COMPLETE;
        else if (reason.toLowerCase().includes('pomodoro') || reason.toLowerCase().includes('focus')) coinAmount = COIN_AWARDS.POMODORO_COMPLETE;
        else if (reason.toLowerCase().includes('note')) coinAmount = COIN_AWARDS.NOTE_CREATED;
        else if (reason.toLowerCase().includes('quiz')) coinAmount = COIN_AWARDS.QUIZ_CORRECT;
        if (result.leveledUp) coinAmount += COIN_AWARDS.LEVEL_UP;
        if (result.newAchievements.length > 0) coinAmount += COIN_AWARDS.ACHIEVEMENT_UNLOCK * result.newAchievements.length;
        if (coinAmount > 0) {
          setDocument(invRef, { coins: increment(coinAmount) }).catch(() => {});
        }

        // Award Skill Points on level-up (non-blocking)
        if (result.leveledUp) {
          const skillRef = doc(db, 'users', user.uid, 'data', 'skillTree');
          setDocument(skillRef, { skillPoints: increment(1) }).catch(() => {});
        }

        return { leveledUp: result.leveledUp, newAchievements: result.newAchievements };
      } catch (err) {
        console.error('Failed to award XP:', err);
        return { leveledUp: false, newAchievements: [] };
      }
    },
    [user, profile],
  );

  // Check and update daily streak
  const checkStreak = useCallback(async () => {
    const g = gamRef.current;
    if (!user || !g) return;

    const today = getLocalDateString();
    if (g.lastActiveDate === today) return; // Already active today

    const ref = getGamificationRef(user.uid);
    const yesterday = getLocalYesterdayDateString();

    let newStreak: number;
    if (g.lastActiveDate === yesterday) {
      newStreak = g.streak + 1;
    } else if (!g.lastActiveDate) {
      newStreak = 1;
    } else {
      newStreak = 1; // Streak broken
    }

    const longestStreak = Math.max(g.longestStreak, newStreak);

    await setDocument(ref, {
      streak: newStreak,
      longestStreak,
      lastActiveDate: today,
    });
  }, [user]); // Only depends on user — reads gamification from ref

  return { gamification, gamificationData: gamification, loading, xpHistory, awardXP, checkStreak };
}
