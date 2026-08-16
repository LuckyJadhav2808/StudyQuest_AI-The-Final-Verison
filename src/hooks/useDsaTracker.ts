// ============================================================
// StudyQuest AI — DSA Problem Tracker Hook
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';
import { DSA_PROBLEMS } from '@/data/dsaDataset';
import { parseKaggleJsonDataset } from '@/lib/kaggleImporter';
import {
  DsaProblem,
  UserDsaMap,
  UserProblemProgress,
  ProblemStatus,
  DsaTopic,
  DsaPattern,
  TopicProgressStats,
  PatternProgressStats,
} from '@/types/dsa';

export function useDsaTracker() {
  const { user } = useAuthContext();
  const [userProgress, setUserProgress] = useState<UserDsaMap>({});
  const [customProblems, setCustomProblems] = useState<DsaProblem[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to user's DSA progress document in Firestore
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const ref = doc(db, 'users', user.uid, 'data', 'dsaProgress');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserProgress(data.progress || {});
        if (Array.isArray(data.customProblems)) {
          setCustomProblems(data.customProblems);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const [apiProblems, setApiProblems] = useState<DsaProblem[]>([]);

  // Fetch full dataset from API on load
  useEffect(() => {
    fetch('/api/dsa/dataset')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.problems)) {
          setApiProblems(data.problems);
        }
      })
      .catch((err) => {
        console.warn('Could not load dynamic dataset, using fallback:', err);
      });
  }, []);

  // Curated NeetCode 150 / Striver A2Z essential roadmap problems
  const curatedRoadmapProblems = useMemo(() => {
    return DSA_PROBLEMS;
  }, []);

  // Full 2,360+ LeetCode Library (for search, lookup, and full library grid)
  const allProblems = useMemo(() => {
    const customIds = new Set(customProblems.map((p) => p.id));
    const baseList = apiProblems.length > 0 ? apiProblems : DSA_PROBLEMS;
    const merged = [...customProblems, ...baseList.filter((p) => !customIds.has(p.id))];
    return merged;
  }, [customProblems, apiProblems]);

function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeFirestoreData) as any;
  const copy: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      copy[k] = sanitizeFirestoreData(v);
    }
  }
  return copy;
}

  // Save progress changes to Firestore
  const updateProgress = useCallback(
    async (problemId: string, updates: Partial<UserProblemProgress>) => {
      if (!user?.uid) return;
      const ref = doc(db, 'users', user.uid, 'data', 'dsaProgress');

      setUserProgress((prev) => {
        const current = prev[problemId] || { status: 'unsolved' };
        const next = { ...current, ...updates };
        // Remove any undefined keys from next object
        const cleanNext: any = {};
        for (const [k, v] of Object.entries(next)) {
          if (v !== undefined) cleanNext[k] = v;
        }
        const updatedMap = { ...prev, [problemId]: cleanNext };

        // Async write to Firestore with clean serialized map
        const payload = sanitizeFirestoreData({ progress: updatedMap, updatedAt: Date.now() });
        setDoc(ref, payload, { merge: true }).catch((err) => {
          console.error('Failed to update DSA progress:', err);
        });

        return updatedMap;
      });
    },
    [user?.uid],
  );

  // Import custom Kaggle Dataset
  const importKaggleDataset = useCallback(
    async (jsonContent: string) => {
      if (!user?.uid) return;
      const parsed = parseKaggleJsonDataset(jsonContent);
      if (parsed.length === 0) return;

      const mergedCustom = [...parsed, ...customProblems.filter((cp) => !parsed.some((p) => p.id === cp.id))];
      setCustomProblems(mergedCustom);

      const ref = doc(db, 'users', user.uid, 'data', 'dsaProgress');
      await setDoc(ref, { customProblems: mergedCustom, updatedAt: Date.now() }, { merge: true });
    },
    [user?.uid, customProblems],
  );

  // Mark Problem as Solved / Revision / In Progress
  const setProblemStatus = useCallback(
    (problemId: string, status: ProblemStatus) => {
      const updates: Partial<UserProblemProgress> = { status };
      if (status === 'solved') {
        updates.lastSolvedAt = Date.now();
      }
      updateProgress(problemId, updates);
    },
    [updateProgress],
  );

  // Save User Code submission per language
  const saveUserCode = useCallback(
    (problemId: string, lang: string, code: string) => {
      setUserProgress((prev) => {
        const current = prev[problemId] || { status: 'unsolved' };
        const existingCode = current.userCode || {};
        return {
          ...prev,
          [problemId]: {
            ...current,
            userCode: { ...existingCode, [lang]: code },
          },
        };
      });
      updateProgress(problemId, {
        userCode: {
          ...(userProgress[problemId]?.userCode || {}),
          [lang]: code,
        },
      });
    },
    [updateProgress, userProgress],
  );

  // Toggle Starred / Bookmarked status
  const toggleStar = useCallback(
    (problemId: string) => {
      const current = userProgress[problemId]?.starred || false;
      updateProgress(problemId, { starred: !current });
    },
    [updateProgress, userProgress],
  );

  // Save Personal Notes per problem
  const saveNotes = useCallback(
    (problemId: string, notes: string) => {
      updateProgress(problemId, { notes });
    },
    [updateProgress],
  );

  // Calculate Overall Analytics
  const stats = useMemo(() => {
    let solvedCount = 0;
    let easySolved = 0,
      mediumSolved = 0,
      hardSolved = 0;
    let easyTotal = 0,
      mediumTotal = 0,
      hardTotal = 0;

    const topicMap: Record<string, { total: number; solved: number }> = {};
    const patternMap: Record<string, { total: number; solved: number }> = {};

    allProblems.forEach((p) => {
      // Difficulty count
      if (p.difficulty === 'easy') easyTotal++;
      else if (p.difficulty === 'medium') mediumTotal++;
      else if (p.difficulty === 'hard') hardTotal++;

      // Topics
      if (!topicMap[p.category]) topicMap[p.category] = { total: 0, solved: 0 };
      topicMap[p.category].total++;

      // Patterns
      if (!patternMap[p.pattern]) patternMap[p.pattern] = { total: 0, solved: 0 };
      patternMap[p.pattern].total++;

      // User Solved check
      const pStatus = userProgress[p.id]?.status;
      if (pStatus === 'solved') {
        solvedCount++;
        if (p.difficulty === 'easy') easySolved++;
        else if (p.difficulty === 'medium') mediumSolved++;
        else if (p.difficulty === 'hard') hardSolved++;

        topicMap[p.category].solved++;
        patternMap[p.pattern].solved++;
      }
    });

    const topicStats: TopicProgressStats[] = Object.entries(topicMap).map(([topic, val]) => ({
      topic: topic as DsaTopic,
      total: val.total,
      solved: val.solved,
    }));

    const patternStats: PatternProgressStats[] = Object.entries(patternMap).map(([pattern, val]) => ({
      pattern: pattern as DsaPattern,
      total: val.total,
      solved: val.solved,
    }));

    const totalProblems = allProblems.length;
    const progressPercent = totalProblems > 0 ? Math.round((solvedCount / totalProblems) * 100) : 0;

    // Pick recommended next question
    const recommendedNext = allProblems.find((p) => userProgress[p.id]?.status !== 'solved') || allProblems[0];

    return {
      totalProblems,
      solvedCount,
      progressPercent,
      easySolved,
      easyTotal,
      mediumSolved,
      mediumTotal,
      hardSolved,
      hardTotal,
      topicStats,
      patternStats,
      recommendedNext,
    };
  }, [allProblems, userProgress]);

  return {
    allProblems,
    curatedRoadmapProblems,
    userProgress,
    loading,
    stats,
    setProblemStatus,
    saveUserCode,
    toggleStar,
    saveNotes,
    importKaggleDataset,
  };
}
