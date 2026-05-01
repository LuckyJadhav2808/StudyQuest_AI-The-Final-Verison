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
      // Backfill friendCode for users created before this feature
      let updatedProfile = { ...existing, lastSeen: Date.now() };
      if (!existing.friendCode) {
        const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        updatedProfile = { ...updatedProfile, friendCode };
        await setDocument(profileRef, { lastSeen: Date.now(), friendCode });
      } else {
        await setDocument(profileRef, { lastSeen: Date.now() });
      }
      // ALWAYS ensure the top-level user doc exists with friendCode (needed for lookups)
      await setDocument(getUserRef(firebaseUser.uid), {
        friendCode: updatedProfile.friendCode,
        uid: firebaseUser.uid,
        displayName: updatedProfile.displayName,
      });
      setProfile(updatedProfile);
    } else {
      // First login — create profile & gamification docs
      const seed = firebaseUser.displayName || firebaseUser.email || firebaseUser.uid;
      // Generate 6-char alphanumeric friend code
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
        totalTasksCompleted: 0,
        totalFocusMinutes: 0,
        totalNotesCreated: 0,
      };

      await setDocument(profileRef, newProfile);
      await setDocument(getGamificationRef(firebaseUser.uid), newGamification);
      // Write friendCode to top-level user doc for lookup queries
      await setDocument(getUserRef(firebaseUser.uid), { friendCode, uid: firebaseUser.uid });

      setProfile({ uid: firebaseUser.uid, ...newProfile });
    }
  }, []);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await initializeProfile(firebaseUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signInWithGoogle, signOut }}
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
