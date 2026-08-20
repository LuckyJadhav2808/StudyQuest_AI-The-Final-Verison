// ============================================================
// StudyQuest AI — DSA Problem Tracker Hook with Global Cloud Ingestion
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, collection, onSnapshot, setDoc } from 'firebase/firestore';
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
  const [globalProblems, setGlobalProblems] = useState<DsaProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiProblems, setApiProblems] = useState<DsaProblem[]>([]);

  // 1. Load initial progress from localStorage for instant offline/guest caching
  useEffect(() => {
    try {
      const cached = localStorage.getItem('sq_dsa_user_progress');
      if (cached) {
        setUserProgress(JSON.parse(cached));
      }
    } catch (e) { /* ignore */ }
  }, []);

  // 2. Subscribe to Global Shared Problems collection (available to ALL users)
  useEffect(() => {
    const globalCol = collection(db, 'globalDsaProblems');
    const unsubGlobal = onSnapshot(
      globalCol,
      (snap) => {
        const list: DsaProblem[] = [];
        snap.forEach((docSnap) => {
          if (docSnap.exists()) {
            list.push(docSnap.data() as DsaProblem);
          }
        });
        setGlobalProblems(list);
      },
      (err) => {
        console.warn('Global DSA cloud subscription error (falling back to local):', err);
      }
    );
    return unsubGlobal;
  }, []);

  // 3. Subscribe to user's personal DSA progress & custom problems in Firestore
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const ref = doc(db, 'users', user.uid, 'data', 'dsaProgress');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.progress) {
          setUserProgress(data.progress);
          try {
            localStorage.setItem('sq_dsa_user_progress', JSON.stringify(data.progress));
          } catch (e) { /* ignore */ }
        }
        if (Array.isArray(data.customProblems)) {
          setCustomProblems(data.customProblems);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  // 4. Fetch full dataset from API on load (cached in-memory)
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

  // Full LeetCode Library (Local Dataset + Global Cloud Ingested + Personal Custom)
  const allProblems = useMemo(() => {
    const seenIds = new Set<string>();
    const result: DsaProblem[] = [];

    // 1. Add user custom problems
    customProblems.forEach((p) => {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        result.push(p);
      }
    });

    // 2. Add global cloud problems (ingested by any user on StudyQuest)
    globalProblems.forEach((p) => {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        result.push(p);
      }
    });

    // 3. Add base API / curated list
    const baseList = apiProblems.length > 0 ? apiProblems : DSA_PROBLEMS;
    baseList.forEach((p) => {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        result.push(p);
      }
    });

    return result;
  }, [customProblems, globalProblems, apiProblems]);

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

  // Save progress changes to Firestore and localStorage
  const updateProgress = useCallback(
    async (problemId: string, updates: Partial<UserProblemProgress>) => {
      setUserProgress((prev) => {
        const current = prev[problemId] || { status: 'unsolved' };
        const next = { ...current, ...updates };
        // Remove any undefined keys from next object
        const cleanNext: any = {};
        for (const [k, v] of Object.entries(next)) {
          if (v !== undefined) cleanNext[k] = v;
        }
        const updatedMap = { ...prev, [problemId]: cleanNext };

        // Persist to localStorage
        try {
          localStorage.setItem('sq_dsa_user_progress', JSON.stringify(updatedMap));
        } catch (e) { /* ignore */ }

        // Async write to Firestore if logged in
        if (user?.uid) {
          const ref = doc(db, 'users', user.uid, 'data', 'dsaProgress');
          const payload = sanitizeFirestoreData({ progress: updatedMap, updatedAt: Date.now() });
          setDoc(ref, payload, { merge: true }).catch((err) => {
            console.error('Failed to update DSA progress:', err);
          });
        }

        return updatedMap;
      });
    },
    [user?.uid],
  );

  // 1-Click Import LeetCode Problem (Live Fetch + Global Cloud Broadcast)
  const importProblem = useCallback(
    async (query: string): Promise<DsaProblem> => {
      const res = await fetch('/api/dsa/fetch-leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      if (!data.success || !data.problem) {
        throw new Error(data.error || 'Failed to fetch problem from LeetCode.');
      }

      const problem: DsaProblem = data.problem;

      // 1. Optimistically update local in-memory globalProblems state for 0ms latency
      setGlobalProblems((prev) => [problem, ...prev.filter((p) => p.id !== problem.id)]);

      // 2. Save to Global Shared Firestore collection so ALL users get it instantly
      try {
        const globalRef = doc(db, 'globalDsaProblems', problem.id);
        await setDoc(globalRef, sanitizeFirestoreData({ ...problem, importedAt: Date.now() }), { merge: true });
      } catch (err) {
        console.warn('Could not persist to globalDsaProblems (offline or rules):', err);
      }

      // 3. Also save to user's customProblems if logged in
      if (user?.uid) {
        const merged = [problem, ...customProblems.filter((p) => p.id !== problem.id)];
        setCustomProblems(merged);
        const ref = doc(db, 'users', user.uid, 'data', 'dsaProgress');
        await setDoc(ref, { customProblems: sanitizeFirestoreData(merged), updatedAt: Date.now() }, { merge: true });
      }

      return problem;
    },
    [user?.uid, customProblems]
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
      await setDoc(ref, { customProblems: sanitizeFirestoreData(mergedCustom), updatedAt: Date.now() }, { merge: true });
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
    importProblem,
    setProblemStatus,
    saveUserCode,
    toggleStar,
    saveNotes,
    importKaggleDataset,
  };
}
