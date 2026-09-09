'use client';

// ============================================================
// StudyQuest AI — Authentication Context Provider
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
  User,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  getProfileRef,
  getGamificationRef,
  getUserRef,
  getDocument,
  setDocument,
  removeDocument,
} from '@/lib/firestore';
import { UserProfile, GamificationData } from '@/types';
import { getAvatarUrl, getLevelFromXP } from '@/lib/constants';
import { collection, getDocs, doc } from 'firebase/firestore';
import { getLocalDateString, getLocalYesterdayDateString } from '@/lib/dateUtils';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();

function parseAvatarFromUrl(url: string | null | undefined): { seed?: string; style?: string } {
  if (!url) return {};
  try {
    const match = url.match(/dicebear\.com\/7\.x\/([^/]+)\/svg\?seed=([^&]+)/);
    if (match) {
      return {
        style: decodeURIComponent(match[1]),
        seed: decodeURIComponent(match[2]),
      };
    }
  } catch {}
  return {};
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize or fetch user profile and gamification from Firestore safely (NON-DESTRUCTIVE)
  const initializeProfile = useCallback(async (firebaseUser: User) => {
    try {
      const uid = firebaseUser.uid;
      const profileRef = getProfileRef(uid);
      const gamRef = getGamificationRef(uid);
      const invRef = doc(db, 'users', uid, 'data', 'inventory');
      const lbRef = doc(db, 'leaderboard', uid);
      const userRef = getUserRef(uid);

      // 1. Fetch existing profile and gamification documents from cache / server
      let [existingProfile, existingGamification] = await Promise.all([
        getDocument<UserProfile>(profileRef),
        getDocument<GamificationData>(gamRef),
      ]);

      // Direct server check fallback if local cache returned empty (cold start / fresh tab)
      if (!existingProfile) {
        try {
          const { getDocFromServer } = await import('firebase/firestore');
          const pSnap = await getDocFromServer(profileRef);
          if (pSnap.exists()) {
            existingProfile = { id: pSnap.id, ...pSnap.data() } as unknown as UserProfile;
          }
        } catch {
          // Server unreachable or offline — continue with safe recovery
        }
      }

      if (!existingGamification) {
        try {
          const { getDocFromServer } = await import('firebase/firestore');
          const gSnap = await getDocFromServer(gamRef);
          if (gSnap.exists()) {
            existingGamification = { id: gSnap.id, ...gSnap.data() } as unknown as GamificationData;
          }
        } catch {
          // Server unreachable or offline — continue with safe recovery
        }
      }

      // 2. Fetch supplementary records to auto-heal any previously wiped data (leaderboard, xpLog, tasks, inventory)
      let lbData: any = null;
      let invData: any = null;
      let logSumXP = 0;
      let logStreak = 0;
      let oldestDateStr = '';
      let completedTasksCount = 0;

      try {
        const [lbSnap, invSnap, xpLogSnap, tasksSnap] = await Promise.all([
          getDocument<any>(lbRef).catch(() => null),
          getDocument<any>(invRef).catch(() => null),
          getDocs(collection(db, 'users', uid, 'xpLog')).catch(() => null),
          getDocs(collection(db, 'users', uid, 'tasks')).catch(() => null),
        ]);

        lbData = lbSnap;
        invData = invSnap;

        if (xpLogSnap && !xpLogSnap.empty) {
          const combinedDateMap: Record<string, number> = {};
          xpLogSnap.docs.forEach((d) => {
            const val = (d.data().totalXp as number) || 0;
            logSumXP += val;
            combinedDateMap[d.id] = val;
            if (!oldestDateStr || d.id < oldestDateStr) oldestDateStr = d.id;
          });

          const todayStr = getLocalDateString();
          const yesterdayStr = getLocalYesterdayDateString();
          const sortedDates = Object.keys(combinedDateMap)
            .filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(id))
            .sort();

          let consecutive = 0;
          let prevDate: Date | null = null;
          sortedDates.forEach((dStr) => {
            const currentDate = new Date(dStr + 'T00:00:00');
            if (!prevDate) {
              consecutive = 1;
            } else {
              const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays === 1) consecutive += 1;
              else if (diffDays > 1) consecutive = 1;
            }
            prevDate = currentDate;
          });

          if (sortedDates.length > 0) {
            const lastDateStr = sortedDates[sortedDates.length - 1];
            if (lastDateStr === todayStr || lastDateStr === yesterdayStr) {
              logStreak = consecutive;
            }
          }
        }

        if (tasksSnap && !tasksSnap.empty) {
          completedTasksCount = tasksSnap.docs.filter(
            (t) => t.data()?.completed === true || t.data()?.status === 'done'
          ).length;
        }
      } catch (scanErr) {
        console.warn('Non-critical: secondary recovery scan note:', scanErr);
      }

      // 3. Resolve Identity & Avatar (NEVER overwrite customized avatars with default)
      const parsedPhoto = parseAvatarFromUrl(firebaseUser.photoURL);
      const finalAvatarSeed =
        existingProfile?.avatarSeed ||
        (lbData?.avatarSeed && lbData.avatarSeed !== uid ? lbData.avatarSeed : null) ||
        parsedPhoto.seed ||
        firebaseUser.displayName ||
        firebaseUser.email?.split('@')[0] ||
        'Adventurer';

      const finalAvatarStyle =
        existingProfile?.avatarStyle ||
        lbData?.avatarStyle ||
        parsedPhoto.style ||
        'adventurer';

      const finalDisplayName =
        existingProfile?.displayName ||
        lbData?.displayName ||
        firebaseUser.displayName ||
        'Student';

      const finalFriendCode =
        existingProfile?.friendCode ||
        Math.random().toString(36).substring(2, 8).toUpperCase();

      // 4. Resolve Gamification (XP, Level, Streak — NEVER reset streak to 0!)
      const finalXP = Math.max(
        existingGamification?.xp || 0,
        lbData?.xp || 0,
        logSumXP,
        completedTasksCount * 25
      );

      const finalLevel = Math.max(
        existingGamification?.level || 0,
        lbData?.level || 0,
        getLevelFromXP(finalXP)
      );

      const finalStreak = Math.max(
        existingGamification?.streak || 0,
        lbData?.streak || 0,
        logStreak
      );

      const finalLongestStreak = Math.max(
        existingGamification?.longestStreak || 0,
        lbData?.streak || 0,
        finalStreak
      );

      const todayStr = getLocalDateString();
      const finalLastActiveDate = existingGamification?.lastActiveDate || todayStr;

      // 5. Resolve Coins & Inventory (NEVER reset coins to 0!)
      const rawCoins = invData?.coins;
      const currentCoins =
        typeof rawCoins === 'number'
          ? rawCoins
          : !isNaN(Number(rawCoins))
          ? Number(rawCoins)
          : 0;

      const estimatedCoins = Math.floor(finalXP / 5) + completedTasksCount * 15 + finalLevel * 50;
      const finalCoins =
        currentCoins > 0
          ? currentCoins
          : finalXP > 0 || completedTasksCount > 0
          ? Math.max(estimatedCoins, 500)
          : 0;

      // 6. Set profile state immediately so UI unblocks
      const updatedProfile: UserProfile = {
        uid,
        displayName: finalDisplayName,
        email: firebaseUser.email || existingProfile?.email || '',
        avatarSeed: finalAvatarSeed,
        avatarStyle: finalAvatarStyle,
        friendCode: finalFriendCode,
        lastSeen: Date.now(),
        theme: existingProfile?.theme || 'dark',
        createdAt:
          existingProfile?.createdAt ||
          (oldestDateStr ? Date.parse(oldestDateStr) || Date.now() : Date.now()),
        updatedAt: Date.now(),
        ...(existingProfile?.openRouterKey ? { openRouterKey: existingProfile.openRouterKey } : {}),
        ...(existingProfile?.aiMode ? { aiMode: existingProfile.aiMode } : {}),
        ...(existingProfile?.equippedTitle ? { equippedTitle: existingProfile.equippedTitle } : {}),
      };

      setProfile(updatedProfile);

      // 7. Non-destructive background sync with { merge: true }
      try {
        await Promise.all([
          setDocument(profileRef, updatedProfile, true),
          setDocument(
            gamRef,
            {
              xp: finalXP,
              level: finalLevel,
              streak: finalStreak,
              longestStreak: finalLongestStreak,
              lastActiveDate: finalLastActiveDate,
              achievements: existingGamification?.achievements || [],
              unlockedTitles: existingGamification?.unlockedTitles || [],
              totalTasksCompleted: Math.max(
                existingGamification?.totalTasksCompleted || 0,
                completedTasksCount
              ),
              totalFocusMinutes: existingGamification?.totalFocusMinutes || 0,
              totalNotesCreated: existingGamification?.totalNotesCreated || 0,
              totalCodeRuns: existingGamification?.totalCodeRuns || 0,
              nightOwlCount: existingGamification?.nightOwlCount || 0,
              dailyChallengeStreak: existingGamification?.dailyChallengeStreak || 0,
              lastDailyChallengeDate: existingGamification?.lastDailyChallengeDate || '',
            },
            true
          ),
          setDocument(
            invRef,
            {
              coins: finalCoins,
              ownedItems: invData?.ownedItems || [],
              equippedItems: invData?.equippedItems || {},
              gachaHistory: invData?.gachaHistory || [],
              ingredients: invData?.ingredients || {},
              activeEffects: invData?.activeEffects || [],
            },
            true
          ),
          setDocument(
            lbRef,
            {
              uid,
              displayName: finalDisplayName,
              avatarSeed: finalAvatarSeed,
              avatarStyle: finalAvatarStyle,
              xp: finalXP,
              level: finalLevel,
              streak: finalStreak,
              updatedAt: Date.now(),
            },
            true
          ),
          setDocument(
            userRef,
            {
              friendCode: finalFriendCode,
              uid,
              displayName: finalDisplayName,
            },
            true
          ),
        ]);
      } catch (writeError) {
        console.warn('Non-critical: safe profile sync notice:', writeError);
      }
    } catch (e) {
      console.error('Failed to initialize user profile document safely:', e);
    }
  }, []);

  // Listen to auth state with persistence assurance
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    let isMounted = true;

    // Resolve redirect results (crucial for mobile Google Sign-In)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Redirect login completed for user:', result.user.email);
        }
      })
      .catch((error) => {
        console.error('Failed to resolve redirect login:', error);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      try {
        setUser(firebaseUser);

        // Clean up previous profile listener
        if (profileUnsub) {
          profileUnsub();
          profileUnsub = null;
        }

        if (firebaseUser) {
          // Cache authenticated session in localStorage to protect against reload drops
          try {
            localStorage.setItem('sq_auth_uid', firebaseUser.uid);
          } catch {}

          // Set up real-time listener first, so profile loads instantly from cache or server
          const { onSnapshot } = await import('firebase/firestore');
          const profileRef = getProfileRef(firebaseUser.uid);
          profileUnsub = onSnapshot(
            profileRef,
            (snap) => {
              if (snap.exists() && isMounted) {
                setProfile({ uid: firebaseUser.uid, ...snap.data() } as UserProfile);
              }
            },
            (error) => {
              console.warn('Profile listener error:', error);
            }
          );

          // Run safe auto-heal and initialization non-blocking
          initializeProfile(firebaseUser).catch((initErr) => {
            console.warn('Non-blocking profile initialization warning:', initErr);
          });
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error during authentication state transition:', error);
      }
    });

    // Wait until Firebase Auth has fully resolved stored credentials from IndexedDB before clearing loading
    if (auth.authStateReady) {
      auth
        .authStateReady()
        .then(() => {
          if (isMounted) setLoading(false);
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, [initializeProfile]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
  };

  const signInWithGoogle = async () => {
    const isMobile =
      typeof window !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('sq_auth_uid');
    } catch {}
    await firebaseSignOut(auth);
    setProfile(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const deleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No user logged in');

    // Delete Firestore data first (best-effort)
    try {
      const uid = currentUser.uid;
      // Delete known subcollection documents
      await removeDocument(getProfileRef(uid)).catch(() => {});
      await removeDocument(getGamificationRef(uid)).catch(() => {});
      const invRef = (await import('firebase/firestore')).doc((await import('@/lib/firebase')).db, 'users', uid, 'data', 'inventory');
      await removeDocument(invRef).catch(() => {});
      const petRef = (await import('firebase/firestore')).doc((await import('@/lib/firebase')).db, 'users', uid, 'data', 'pet');
      await removeDocument(petRef).catch(() => {});
      // Delete top-level user doc
      await removeDocument(getUserRef(uid)).catch(() => {});
    } catch (e) {
      console.warn('Non-critical: Failed to fully clean up Firestore data:', e);
    }

    // Delete the Firebase Auth account
    await deleteUser(currentUser);
    setProfile(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
