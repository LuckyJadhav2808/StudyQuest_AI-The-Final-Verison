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
import { doc } from 'firebase/firestore';
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
import { collection, getDocs } from 'firebase/firestore';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize or fetch user profile from Firestore safely
  const initializeProfile = useCallback(async (firebaseUser: User) => {
    try {
      const profileRef = getProfileRef(firebaseUser.uid);
      const gamRef = getGamificationRef(firebaseUser.uid);

      const [existingProfile, existingGamification] = await Promise.all([
        getDocument<UserProfile>(profileRef),
        getDocument<GamificationData>(gamRef),
      ]);

      if (existingProfile) {
        // Set profile immediately from the successful read — UI unblocks here
        let updatedProfile = { ...existingProfile, lastSeen: Date.now() };
        if (!existingProfile.friendCode) {
          updatedProfile = { ...updatedProfile, friendCode: Math.random().toString(36).substring(2, 8).toUpperCase() };
        }
        setProfile(updatedProfile);

        // Background non-blocking metadata update
        try {
          if (!existingProfile.friendCode) {
            await setDocument(profileRef, { lastSeen: Date.now(), friendCode: updatedProfile.friendCode });
          } else {
            await setDocument(profileRef, { lastSeen: Date.now() });
          }
          await setDocument(getUserRef(firebaseUser.uid), {
            friendCode: updatedProfile.friendCode,
            uid: firebaseUser.uid,
            displayName: updatedProfile.displayName,
          });
        } catch (writeError) {
          console.warn('Non-critical: Failed to update profile metadata:', writeError);
        }
      } else {
        // Profile doc missing or new UID login.
        // Auto-heal from existing gamification doc or xpLog subcollection so progress is NEVER reset!
        let initialXP = existingGamification?.xp || 0;
        let initialLevel = existingGamification?.level || 0;
        let oldestDateStr = '';

        try {
          const xpLogRef = collection(db, 'users', firebaseUser.uid, 'xpLog');
          const xpLogSnap = await getDocs(xpLogRef);
          let sumXP = 0;
          xpLogSnap.docs.forEach((d) => {
            sumXP += d.data().totalXp || 0;
            if (!oldestDateStr || d.id < oldestDateStr) oldestDateStr = d.id;
          });
          if (sumXP > initialXP) {
            initialXP = sumXP;
            initialLevel = getLevelFromXP(sumXP);
          }
        } catch (logErr) {
          console.warn('Could not scan xpLog during initialization:', logErr);
        }

        const seed = firebaseUser.displayName || firebaseUser.email || firebaseUser.uid;
        const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        let createdTimestamp = Date.now();
        if (oldestDateStr) {
          const parsed = Date.parse(oldestDateStr);
          if (!isNaN(parsed)) createdTimestamp = parsed;
        }

        const newProfile: Omit<UserProfile, 'uid'> = {
          displayName: firebaseUser.displayName || 'Student',
          email: firebaseUser.email || '',
          avatarSeed: seed,
          avatarStyle: 'adventurer',
          friendCode,
          lastSeen: Date.now(),
          theme: 'dark',
          createdAt: createdTimestamp,
          updatedAt: Date.now(),
        };

        setProfile({ uid: firebaseUser.uid, ...newProfile });

        try {
          await setDocument(profileRef, newProfile);

          // Write new gamification ONLY if it does not exist yet.
          if (!existingGamification) {
            const newGamification: GamificationData = {
              xp: initialXP,
              level: initialLevel,
              streak: 0,
              longestStreak: 0,
              lastActiveDate: '',
              achievements: [],
              unlockedTitles: [],
              totalTasksCompleted: 0,
              totalFocusMinutes: 0,
              totalNotesCreated: 0,
              totalCodeRuns: 0,
              nightOwlCount: 0,
              dailyChallengeStreak: 0,
              lastDailyChallengeDate: '',
            };
            await setDocument(gamRef, newGamification);
          } else if (initialXP > existingGamification.xp) {
            await setDocument(gamRef, { xp: initialXP, level: initialLevel }, true);
          }

          await setDocument(getUserRef(firebaseUser.uid), { friendCode, uid: firebaseUser.uid });
          await setDocument(doc(db, 'leaderboard', firebaseUser.uid), {
            uid: firebaseUser.uid,
            displayName: newProfile.displayName,
            avatarSeed: seed,
            avatarStyle: 'adventurer',
            xp: initialXP,
            level: initialLevel,
            streak: existingGamification?.streak || 0,
            updatedAt: Date.now(),
          }).catch(() => {});
        } catch (writeError) {
          console.warn('Non-critical: Failed to write new profile to Firestore:', writeError);
        }
      }
    } catch (e) {
      console.error('Failed to initialize user profile document:', e);
      throw e;
    }
  }, []);

  // Listen to auth state
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

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
      try {
        setUser(firebaseUser);

        // Clean up previous profile listener
        if (profileUnsub) {
          profileUnsub();
          profileUnsub = null;
        }

        if (firebaseUser) {
          // Set up real-time listener first, so profile loads instantly from cache or server
          const { onSnapshot } = await import('firebase/firestore');
          const profileRef = getProfileRef(firebaseUser.uid);
          profileUnsub = onSnapshot(profileRef, (snap) => {
            if (snap.exists()) {
              setProfile({ uid: firebaseUser.uid, ...snap.data() } as UserProfile);
            }
          }, (error) => {
            console.warn('Profile listener error:', error);
          });

          // Run initialization (lastSeen, first login checks) asynchronously/non-blocking
          initializeProfile(firebaseUser).catch((initErr) => {
            console.warn('Non-blocking profile initialization warning:', initErr);
          });
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error during authentication initialization:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
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
    const isMobile = typeof window !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
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
