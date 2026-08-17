'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FeatureFlags, isFeatureEnabled } from '@/config/featureFlags';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface FeatureGuardProps {
  feature: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectIfDisabled?: boolean;
}

export default function FeatureGuard({
  feature,
  children,
  fallback,
  redirectIfDisabled = false,
}: FeatureGuardProps) {
  const [enabled, setEnabled] = useState<boolean>(() => isFeatureEnabled(feature));
  const [mounted, setMounted] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const checkState = () => {
      const isEnabled = isFeatureEnabled(feature);
      setEnabled(isEnabled);
      if (!isEnabled && redirectIfDisabled) {
        router.push('/');
      }
    };

    checkState();

    window.addEventListener('featureflags_updated', checkState);
    return () => window.removeEventListener('featureflags_updated', checkState);
  }, [feature, redirectIfDisabled, router]);

  if (!mounted) {
    return <>{children}</>;
  }

  if (!enabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (redirectIfDisabled) {
      return null;
    }

    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <Card hover={false} className="text-center p-8 border-2 border-amber-500/30 bg-amber-950/10">
          <span className="text-4xl mb-3 block">🔒</span>
          <h3 className="text-lg font-heading font-bold text-amber-400 mb-2">
            Module Temporarily Deactivated
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] mb-5 leading-relaxed">
            The <strong className="text-white capitalize">{feature}</strong> feature has been paused via System Feature Flags.
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push('/')}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
