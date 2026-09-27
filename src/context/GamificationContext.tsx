'use client';

// ============================================================
// StudyQuest AI — Shared Gamification Context (Singleton Listener)
// Consolidates 54+ duplicate Firestore onSnapshot listeners into 1!
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { doc, collection, onSnapshot, increment, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getGamificationRef, subscribeToDocument, setDocument } from '@/lib/firestore';
import { GamificationData } from '@/types';
import { getLevelFromXP, ACHIEVEMENTS, COIN_AWARDS } from '@/lib/constants';
import { useAuthContext } from '@/context/AuthContext';
import { getLocalDateString, getLocalYesterdayDateString } from '@/lib/dateUtils';
import toast from 'react-hot-toast';

export interface GamificationContextValue {
  gamification: GamificationData | null;
  gamificationData: GamificationData | null;
  loading: boolean;
  xpHistory: Record<string, number>;
  awardXP: (amount: number, reason: string, customCoinReward?: number) => Promise<{ leveledUp: boolean; newAchievements: string[] }>;
  checkStreak: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuthContext();
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [xpHistory, setXpHistory] = useState<Record<string, number>>({});
  const [xpHistoryLoaded, setXpHistoryLoaded] = useState(false);

  // Ref to always hold the latest gamification (prevents stale closures)
  const gamRef = useRef<GamificationData | null>(null);
  useEffect(() => {
    gamRef.current = gamification;
  }, [gamification]);

  // SINGLETON: Subscribe to gamification data exactly once for the app
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

  // SINGLETON: Subscribe to XP history (daily log) exactly once for the app
  useEffect(() => {
    if (!user) {
      setXpHistory({});
      setXpHistoryLoaded(false);
      return;
    }

    const xpLogRef = collection(db, 'users', user.uid, 'xpLog');
    const unsub = onSnapshot(
      xpLogRef,
      (snap) => {
        const history: Record<string, number> = {};
        snap.docs.forEach((d) => {
          history[d.id] = (d.data().totalXp as number) || 0;
        });
        setXpHistory(history);
        setXpHistoryLoaded(true);
      },
      (err) => {
        console.warn('Failed to listen to xpLog:', err);
        setXpHistoryLoaded(true);
      }
    );

    return () => unsub();
  }, [user]);

  // Award XP and check for level-ups & achievements
  const awardXP = useCallback(
    async (
      amount: number,
      reason: string,
      customCoinReward?: number
    ): Promise<{ leveledUp: boolean; newAchievements: string[] }> => {
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

          transaction.set(
            ref,
            {
              xp: finalXP,
              level: finalLevel,
              achievements: finalAchievements,
            },
            { merge: true }
          );

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

        // Log daily XP for heatmap & optimistically update local state immediately
        const today = getLocalDateString();
        setXpHistory((prev) => ({
          ...prev,
          [today]: (prev[today] || 0) + amount,
        }));

        const dayLogRef = doc(db, 'users', user.uid, 'xpLog', today);
        setDocument(dayLogRef, { totalXp: increment(amount), lastUpdated: Date.now() })
          .catch(() => setDocument(dayLogRef, { totalXp: amount, lastUpdated: Date.now() }, false))
          .catch(() => {});

        // Award Quest Coins alongside XP (non-blocking)
        const invRef = doc(db, 'users', user.uid, 'data', 'inventory');
        let coinAmount = customCoinReward !== undefined ? customCoinReward : Math.floor(amount / 5);
        if (customCoinReward === undefined) {
          if (reason.toLowerCase().includes('task')) coinAmount = COIN_AWARDS.TASK_COMPLETE;
          else if (reason.toLowerCase().includes('pomodoro') || reason.toLowerCase().includes('focus'))
            coinAmount = COIN_AWARDS.POMODORO_COMPLETE;
          else if (reason.toLowerCase().includes('note')) coinAmount = COIN_AWARDS.NOTE_CREATED;
          else if (reason.toLowerCase().includes('quiz')) coinAmount = COIN_AWARDS.QUIZ_CORRECT;
        }
        if (result.leveledUp) coinAmount += COIN_AWARDS.LEVEL_UP;
        if (result.newAchievements.length > 0)
          coinAmount += COIN_AWARDS.ACHIEVEMENT_UNLOCK * result.newAchievements.length;
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
    [user, profile]
  );

  const xpHistoryRef = useRef<Record<string, number>>({});
  useEffect(() => {
    xpHistoryRef.current = xpHistory;
  }, [xpHistory]);

  const checkedTodayRef = useRef<string>('');

  const checkStreak = useCallback(async () => {
    if (!user || !xpHistoryLoaded) return;

    const today = getLocalDateString();
    if (checkedTodayRef.current === today) return;

    const ref = getGamificationRef(user.uid);
    const yesterday = getLocalYesterdayDateString();
    const history = xpHistoryRef.current;

    try {
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(ref);
        if (!docSnap.exists()) return;

        const current = docSnap.data() as GamificationData;

        if (current.lastActiveDate === today) {
          checkedTodayRef.current = today;
          return;
        }

        const wasActiveYesterday =
          current.lastActiveDate === yesterday || (history[yesterday] || 0) > 0;

        let newStreak: number;
        let consumedShield = false;

        if (wasActiveYesterday) {
          newStreak = (current.streak || 0) + 1;
        } else if (!current.lastActiveDate) {
          newStreak = current.streak && current.streak > 1 ? current.streak : 1;
        } else {
          const invRef = doc(db, 'users', user.uid, 'data', 'inventory');
          const invSnap = await transaction.get(invRef);
          const invData = invSnap.exists() ? invSnap.data() : {};
          const activeEffects = invData.activeEffects || [];

          const now = Date.now();
          const shieldIdx = activeEffects.findIndex(
            (e: any) => e.effectKey === 'streak-shield' && e.expiresAt > now
          );

          if (shieldIdx !== -1) {
            newStreak = current.streak || 1;
            consumedShield = true;

            const updatedEffects = [...activeEffects];
            updatedEffects.splice(shieldIdx, 1);
            transaction.set(invRef, { activeEffects: updatedEffects }, { merge: true });
          } else {
            newStreak = 1;
          }
        }

        const longestStreak = Math.max(current.longestStreak || 0, current.streak || 0, newStreak);

        transaction.set(
          ref,
          {
            streak: newStreak,
            longestStreak,
            lastActiveDate: today,
          },
          { merge: true }
        );

        if (consumedShield) {
          setTimeout(() => {
            toast('🛡️ Streak Shield activated! Your streak is protected.', {
              icon: '🛡️',
              duration: 6000,
            });
          }, 100);
        }
      });

      checkedTodayRef.current = today;
    } catch (err) {
      console.error('Failed to update streak:', err);
    }
  }, [user, xpHistoryLoaded]);

  // Memoize the context value so consumers don't re-render needlessly
  const contextValue = useMemo<GamificationContextValue>(
    () => ({
      gamification,
      gamificationData: gamification,
      loading: loading || !xpHistoryLoaded,
      xpHistory,
      awardXP,
      checkStreak,
    }),
    [gamification, loading, xpHistoryLoaded, xpHistory, awardXP, checkStreak]
  );

  return (
    <GamificationContext.Provider value={contextValue}>
      {children}
    </GamificationContext.Provider>
  );
}

const DEFAULT_GAMIFICATION_VALUE: GamificationContextValue = {
  gamification: null,
  gamificationData: null,
  loading: true,
  xpHistory: {},
  awardXP: async () => ({ leveledUp: false, newAchievements: [] }),
  checkStreak: async () => {},
};

export function useGamification(): GamificationContextValue {
  const context = useContext(GamificationContext);
  if (!context) {
    return DEFAULT_GAMIFICATION_VALUE;
  }
  return context;
}
