'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show loading spinner while checking auth
  if (loading) {
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
