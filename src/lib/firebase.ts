// ============================================================
// StudyQuest AI — Firebase Client Initialization
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  setPersistence,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { env } from '@/lib/env';

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (prevent duplicate in dev hot-reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistent IndexedDB + LocalStorage fallback
let auth: ReturnType<typeof getAuth>;
if (typeof window !== 'undefined') {
  try {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    auth = getAuth(app);
  }
  // Defensively ensure browser local persistence so sessions never drop on tab close, reload, or wake from sleep
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Non-critical: Firebase Auth setPersistence fallback:', err);
  });
} else {
  auth = getAuth(app);
}

export { auth };

// Enable persistent local cache for offline-first Deep Work Mode.
// All Firestore reads/writes are cached locally in IndexedDB and
// automatically sync when the device reconnects to the internet.
let db: ReturnType<typeof getFirestore>;
if (typeof window !== 'undefined') {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      experimentalForceLongPolling: true, // Force long-polling immediately to prevent transport stream connection drops
    });
  } catch {
    // Firestore already initialized (hot-reload) — reuse existing instance
    db = getFirestore(app);
  }
} else {
  // Server-side initialization (force HTTP long-polling instead of gRPC HTTP/2 streams to prevent connection drops)
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    db = getFirestore(app);
  }
}
export { db };

export const storage = getStorage(app);
export default app;
