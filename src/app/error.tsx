'use client';

// ============================================================
// StudyQuest AI — Production Crash Shield & Error Boundary
// ============================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HiRefresh, HiHome, HiClipboardCopy, HiCheck, HiShieldExclamation } from 'react-icons/hi';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const incidentId = error?.digest || `ERR-${Date.now().toString(36).toUpperCase()}`;

  useEffect(() => {
    // Log structured production telemetry
    console.error('[UNHANDLED_ERROR_BOUNDARY]', {
      digest: error?.digest,
      message: error?.message,
      stack: error?.stack,
      incidentId,
      timestamp: new Date().toISOString(),
    });
  }, [error, incidentId]);

  const copyIncidentId = () => {
    navigator.clipboard.writeText(incidentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

      <motion.div
        className="relative z-10 text-center max-w-lg w-full p-6 sm:p-8 rounded-3xl bg-[var(--card-bg)]/90 border border-[var(--card-border)] shadow-2xl backdrop-blur-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Shield Icon Badge */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
          <HiShieldExclamation size={32} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-heading font-black text-[var(--foreground)] mb-2">
          Quest <span className="text-rose-500">Shield Activated</span>
        </h1>

        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mb-4 leading-relaxed">
          An unexpected anomaly occurred, but your quest progress and saved notes remain completely safe.
        </p>

        {/* Incident ID & Error Pill */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/5 dark:bg-black/40 border border-[var(--card-border)] mb-6 text-left">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">
              Incident Correlation ID
            </p>
            <p className="text-xs font-mono font-bold text-[var(--foreground)] truncate">
              {incidentId}
            </p>
          </div>
          <button
            onClick={copyIncidentId}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-[var(--foreground)] border border-white/10 transition-colors cursor-pointer"
            title="Copy Error ID for support"
          >
            {copied ? <HiCheck className="text-emerald-400" size={13} /> : <HiClipboardCopy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Recovery Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white font-heading font-bold text-xs shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <HiRefresh size={16} />
            <span>Resume Quest (Retry)</span>
          </motion.button>
          
          <Link href="/" className="flex-1">
            <motion.button
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] font-heading font-bold text-xs hover:border-primary/40 transition-all cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <HiHome size={16} />
              <span>Sanctuary Home</span>
            </motion.button>
          </Link>
        </div>

        <p className="text-[9px] text-[var(--muted-foreground)] mt-6 uppercase tracking-widest font-bold">
          StudyQuest AI — Self-Healing Subsystem
        </p>
      </motion.div>
    </div>
  );
}
