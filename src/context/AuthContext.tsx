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
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  getProfileRef,
  getGamificationRef,
  getUserRef,
  getDocument,
  setDocument,
} from '@/lib/firestore';
import { UserProfile, GamificationData } from '@/types';
import { getAvatarUrl } from '@/lib/constants';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize or fetch user profile from Firestore
  const initializeProfile = useCallback(async (firebaseUser: User) => {
    const profileRef = getProfileRef(firebaseUser.uid);
    const existing = await getDocument<UserProfile>(profileRef);

    if (existing) {
      // Set profile immediately from the successful read — UI unblocks here
      let updatedProfile = { ...existing, lastSeen: Date.now() };
      if (!existing.friendCode) {
        updatedProfile = { ...updatedProfile, friendCode: Math.random().toString(36).substring(2, 8).toUpperCase() };
      }
      setProfile(updatedProfile);

      // Now attempt background writes (non-blocking — if these fail, the app still works)
      try {
        if (!existing.friendCode) {
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
      // First login — create profile & gamification docs
      const seed = firebaseUser.displayName || firebaseUser.email || firebaseUser.uid;
      const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newProfile: Omit<UserProfile, 'uid'> = {
        displayName: firebaseUser.displayName || 'Student',
        email: firebaseUser.email || '',
        avatarSeed: seed,
        avatarStyle: 'adventurer',
        friendCode,
        lastSeen: Date.now(),
        theme: 'dark',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const newGamification: GamificationData = {
        xp: 0,
        level: 0,
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

      // Set profile in React state first so UI can render
      setProfile({ uid: firebaseUser.uid, ...newProfile });

      // Then write to Firestore
      try {
        await setDocument(profileRef, newProfile);
        await setDocument(getGamificationRef(firebaseUser.uid), newGamification);
        await setDocument(getUserRef(firebaseUser.uid), { friendCode, uid: firebaseUser.uid });
      } catch (writeError) {
        console.warn('Non-critical: Failed to write new profile to Firestore:', writeError);
      }
    }
  }, []);

  // Listen to auth state
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);

        // Clean up previous profile listener
        if (profileUnsub) {
          profileUnsub();
          profileUnsub = null;
        }

        if (firebaseUser) {
          await initializeProfile(firebaseUser);

          // Set up real-time listener so profile updates (avatar, name, etc.)
          // are reflected immediately across the entire app
          const { onSnapshot } = await import('firebase/firestore');
          const profileRef = getProfileRef(firebaseUser.uid);
          profileUnsub = onSnapshot(profileRef, (snap) => {
            if (snap.exists()) {
              setProfile({ uid: firebaseUser.uid, ...snap.data() } as UserProfile);
            }
          }, (error) => {
            console.warn('Profile listener error:', error);
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
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword }}
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
