'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/context/AuthContext';
import { CURRENT_PATCH_VERSION, PATCH_NOTES } from '@/lib/constants';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getProfileRef, setDocument } from '@/lib/firestore';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  feature: { emoji: '🚀', color: 'text-teal' },
  improvement: { emoji: '✨', color: 'text-amber-400' },
  fix: { emoji: '🔧', color: 'text-coral' },
};

export default function PatchNotesModal() {
  const { user } = useAuthContext();
  const [show, setShow] = useState(false);
  const checkedRef = useRef(false);

  // Dynamically sort patch notes to guarantee we identify the latest version
  const sortedNotes = React.useMemo(() => {
    return [...PATCH_NOTES].sort((a, b) =>
      b.version.localeCompare(a.version, undefined, { numeric: true })
    );
  }, []);

  const latestPatchNote = sortedNotes[0] || PATCH_NOTES[0];
  const [patchNote] = useState(latestPatchNote);

  const getStorageKeys = (uid?: string) => ({
    userKey: uid ? `sq_last_seen_patch_${uid}` : null,
    globalKey: 'sq_last_seen_patch',
    sessionKey: `sq_patch_shown_session_${latestPatchNote.version}`,
  });

  const dismiss = async () => {
    setShow(false);
    
    // 1. Instant Synchronous LocalStorage & SessionStorage Save (Zero Latency)
    if (typeof window !== 'undefined') {
      const keys = getStorageKeys(user?.uid);
      if (keys.userKey) {
        window.localStorage.setItem(keys.userKey, latestPatchNote.version);
      }
      window.localStorage.setItem(keys.globalKey, latestPatchNote.version);
      window.sessionStorage.setItem(keys.sessionKey, 'true');
    }

    // 2. Dual-tier asynchronous persistence to Firestore (both preferences & profile)
    if (user?.uid) {
      try {
        const prefsRef = doc(db, 'users', user.uid, 'data', 'preferences');
        const profileRef = getProfileRef(user.uid);

        await Promise.allSettled([
          setDoc(prefsRef, { lastSeenPatchVersion: latestPatchNote.version, updatedAt: Date.now() }, { merge: true }),
          setDocument(profileRef, { lastSeenPatchVersion: latestPatchNote.version }, true),
        ]);
      } catch {
        /* best effort */
      }
    }
  };

  useEffect(() => {
    if (!user?.uid || checkedRef.current) return;

    // 1. Check LocalStorage & SessionStorage immediately
    if (typeof window !== 'undefined') {
      const keys = getStorageKeys(user.uid);

      // If already shown/dismissed in this browser session, never re-prompt
      if (window.sessionStorage.getItem(keys.sessionKey) === 'true') {
        checkedRef.current = true;
        return;
      }

      // If already marked as seen in user-scoped or global localStorage, suppress modal
      const localUserSeen = keys.userKey ? window.localStorage.getItem(keys.userKey) : null;
      const localGlobalSeen = window.localStorage.getItem(keys.globalKey);

      if (localUserSeen === latestPatchNote.version || localGlobalSeen === latestPatchNote.version) {
        checkedRef.current = true;
        return;
      }
    }

    // 2. Check Remote Firestore Database (with 1.5s debounce to avoid interfering with initial page render)
    const check = async () => {
      checkedRef.current = true;
      try {
        const prefsRef = doc(db, 'users', user.uid, 'data', 'preferences');
        const profileRef = getProfileRef(user.uid);

        const [prefsSnap, profileSnap] = await Promise.allSettled([
          getDoc(prefsRef),
          getDoc(profileRef),
        ]);

        let lastSeen: string | null = null;

        if (prefsSnap.status === 'fulfilled' && prefsSnap.value.exists()) {
          lastSeen = prefsSnap.value.data()?.lastSeenPatchVersion || null;
        }

        if (!lastSeen && profileSnap.status === 'fulfilled' && profileSnap.value.exists()) {
          lastSeen = (profileSnap.value.data() as any)?.lastSeenPatchVersion || null;
        }

        // If Firestore confirms user already saw it, sync down to localStorage and skip modal
        if (lastSeen === latestPatchNote.version) {
          if (typeof window !== 'undefined') {
            const keys = getStorageKeys(user.uid);
            if (keys.userKey) window.localStorage.setItem(keys.userKey, latestPatchNote.version);
            window.localStorage.setItem(keys.globalKey, latestPatchNote.version);
          }
          return;
        }

        // Show update modal if user truly hasn't seen the latest patch note
        setShow(true);
        if (typeof window !== 'undefined') {
          const keys = getStorageKeys(user.uid);
          window.sessionStorage.setItem(keys.sessionKey, 'true');
        }
        toast.success(
          `🎉 New Update Live: v${latestPatchNote.version} - ${latestPatchNote.title}!`,
          { duration: 5000 }
        );
      } catch {
        // Silent fail
      }
    };

    const t = setTimeout(check, 1500);
    return () => clearTimeout(t);
  }, [user?.uid, latestPatchNote.version, latestPatchNote.title]);

  // Handle Escape key to dismiss cleanly
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[998] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

          {/* Scroll card */}
          <motion.div
            className="relative z-10 w-full max-w-lg rounded-2xl border-2 border-[var(--card-border)] overflow-hidden"
            style={{ background: 'var(--card-bg)' }}
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 40 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          >
            {/* Header with gradient */}
            <div
              className="px-6 py-5 text-center"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(236,72,153,0.1))' }}
            >
              <motion.div
                className="text-4xl mb-2"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                📜
              </motion.div>
              <h2 className="text-xl font-heading font-bold text-[var(--foreground)]">
                Scroll of Updates
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Badge variant="primary" size="md">v{patchNote.version}</Badge>
                <span className="text-sm text-[var(--muted-foreground)] font-semibold">{patchNote.title}</span>
              </div>
            </div>

            {/* Entries */}
            <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-2.5">
              {patchNote.entries.map((entry, i) => {
                const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.fix;
                return (
                  <motion.div
                    key={i}
                    className="flex items-start gap-3 text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                  >
                    <span className="text-lg flex-shrink-0">{config.emoji}</span>
                    <span className="text-[var(--foreground)] leading-relaxed">{entry.text}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--card-border)]">
              <Button variant="primary" size="md" fullWidth onClick={dismiss}>
                Got it! Let&apos;s go! 🚀
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
