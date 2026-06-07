'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/context/AuthContext';
import { CURRENT_PATCH_VERSION, PATCH_NOTES } from '@/lib/constants';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  const [patchNote, setPatchNote] = useState(PATCH_NOTES[0]);

  useEffect(() => {
    if (!user?.uid) return;
    const check = async () => {
      try {
        const prefsRef = doc(db, 'users', user.uid, 'data', 'preferences');
        const snap = await getDoc(prefsRef);
        const lastSeen = snap.data()?.lastSeenPatchVersion || '0.0.0';
        if (lastSeen !== CURRENT_PATCH_VERSION) {
          setShow(true);
          toast.success(
            `🎉 New Update Live: ${CURRENT_PATCH_VERSION} - ${PATCH_NOTES[0].title}!`,
            { duration: 5000 }
          );
        }
      } catch {
        // Silent fail
      }
    };
    // Delay to avoid showing instantly on page load
    const t = setTimeout(check, 2000);
    return () => clearTimeout(t);
  }, [user?.uid]);

  const dismiss = async () => {
    setShow(false);
    if (user?.uid) {
      try {
        const prefsRef = doc(db, 'users', user.uid, 'data', 'preferences');
        await setDoc(prefsRef, { lastSeenPatchVersion: CURRENT_PATCH_VERSION }, { merge: true });
      } catch { /* best effort */ }
    }
  };

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
