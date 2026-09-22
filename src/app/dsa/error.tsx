'use client';

// ============================================================
// StudyQuest AI — DSA Arena Fault Boundary
// ============================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HiRefresh, HiHome, HiClipboardCopy, HiCheck, HiCode } from 'react-icons/hi';

export default function DsaErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const incidentId = error?.digest || `ERR-DSA-${Date.now().toString(36).toUpperCase()}`;

  useEffect(() => {
    console.error('[DSA_ARENA_ERROR_BOUNDARY]', {
      digest: error?.digest,
      message: error?.message,
      incidentId,
    });
  }, [error, incidentId]);

  const copyIncidentId = () => {
    navigator.clipboard.writeText(incidentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[var(--background)] px-4 py-8 relative">
      <motion.div
        className="relative z-10 text-center max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[var(--card-bg)]/90 border border-[var(--card-border)] shadow-xl backdrop-blur-xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 shadow-md">
          <HiCode size={28} />
        </div>

        <h2 className="text-xl font-heading font-black text-[var(--foreground)] mb-2">
          DSA Arena Encountered an Issue
        </h2>

        <p className="text-xs text-[var(--muted-foreground)] mb-4 leading-relaxed">
          Your solved questions, code snippets, and submission stats are safely recorded. Try restarting this view.
        </p>

        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/5 dark:bg-black/40 border border-[var(--card-border)] mb-5 text-left">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">
              Reference ID
            </p>
            <p className="text-xs font-mono font-bold text-[var(--foreground)] truncate">
              {incidentId}
            </p>
          </div>
          <button
            onClick={copyIncidentId}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-white/10 hover:bg-white/20 text-[var(--foreground)] transition-colors cursor-pointer"
          >
            {copied ? <HiCheck className="text-emerald-400" size={12} /> : <HiClipboardCopy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="flex gap-3 justify-center">
          <motion.button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-heading font-bold text-xs shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <HiRefresh size={14} />
            <span>Retry Arena</span>
          </motion.button>
          
          <Link href="/dsa" className="flex-1">
            <motion.button
              onClick={() => { window.location.href = '/dsa'; }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] font-heading font-bold text-xs hover:border-cyan-500/40 transition-all cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <HiHome size={14} />
              <span>Reset Arena</span>
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
