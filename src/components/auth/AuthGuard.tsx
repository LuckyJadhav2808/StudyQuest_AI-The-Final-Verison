'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [graceChecking, setGraceChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (user) {
      setGraceChecking(false);
      return;
    }

    // If there is a cached authenticated session, give Firebase Auth a brief window to restore the credential
    const cachedUid = typeof window !== 'undefined' ? localStorage.getItem('sq_auth_uid') : null;
    const graceMs = cachedUid ? 1200 : 200;

    const timer = setTimeout(() => {
      // Re-verify against live auth instance before committing to redirect
      if (!auth.currentUser && !user) {
        router.replace('/login');
      }
      setGraceChecking(false);
    }, graceMs);

    return () => clearTimeout(timer);
  }, [user, loading, router]);

  // Show loading spinner while checking auth or awaiting credential hydration
  if (loading || (graceChecking && !user)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-[var(--muted-foreground)] font-medium animate-pulse">
            Loading StudyQuest...
          </p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!user) return null;

  return <>{children}</>;
}

