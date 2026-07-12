'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="text-center max-w-md">
        <div className="relative mb-6">
          <span className="text-[100px] font-heading font-black text-coral/10 leading-none select-none">!</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">⚠️</span>
          </div>
        </div>

        <h1 className="text-3xl font-heading font-black mb-3">
          Quest <span className="text-coral">Interrupted</span>
        </h1>

        <p className="text-sm text-[var(--muted-foreground)] mb-2 leading-relaxed">
          Something unexpected happened. Don&apos;t worry — your progress is safe.
        </p>

        {error?.message && (
          <p className="text-xs text-[var(--muted-foreground)]/60 font-mono bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 mb-6 break-all">
            {error.message}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-heading font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            🔄 Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] font-heading font-bold text-sm hover:border-primary/40 transition-all"
          >
            🏠 Back to Dashboard
          </a>
        </div>

        <p className="text-[10px] text-[var(--muted-foreground)] mt-10 uppercase tracking-widest font-bold">
          StudyQuest AI — Level Up Your Learning
        </p>
      </div>
    </div>
  );
}
