'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect online/offline status in real-time.
 * Returns { isOnline, wasOffline } — wasOffline tracks if user
 * recently came back online (for "syncing..." indicator).
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial value (SSR-safe)
    setIsOnline(navigator.onLine);

    const goOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Clear "was offline" after 5 seconds (syncing done)
      setTimeout(() => setWasOffline(false), 5000);
    };

    const goOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
