'use client';

import { useState, useEffect, useCallback } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const checkSupport = () => {
      const doc = document as any;
      return Boolean(
        doc.fullscreenEnabled ||
        doc.webkitFullscreenEnabled ||
        doc.mozFullScreenEnabled ||
        doc.msFullscreenEnabled
      );
    };

    setIsSupported(checkSupport());

    const updateState = () => {
      const doc = document as any;
      const element =
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement;
      setIsFullscreen(Boolean(element));
    };

    updateState();

    document.addEventListener('fullscreenchange', updateState);
    document.addEventListener('webkitfullscreenchange', updateState);
    document.addEventListener('mozfullscreenchange', updateState);
    document.addEventListener('MSFullscreenChange', updateState);

    return () => {
      document.removeEventListener('fullscreenchange', updateState);
      document.removeEventListener('webkitfullscreenchange', updateState);
      document.removeEventListener('mozfullscreenchange', updateState);
      document.removeEventListener('MSFullscreenChange', updateState);
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    try {
      const el = document.documentElement as any;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
    } catch (err) {
      console.warn('[useFullscreen] Failed to enter fullscreen:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    try {
      const doc = document as any;
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } catch (err) {
      console.warn('[useFullscreen] Failed to exit fullscreen:', err);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    isSupported,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen
  };
}
