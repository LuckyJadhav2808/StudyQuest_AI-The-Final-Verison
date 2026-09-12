'use client';

// ============================================================
// StudyQuest AI — Theme Context (Multi-Theme Support)
// 6 Themes: Light, Dark (free), Ocean Breeze, Sakura (free),
//           Cyberpunk (Level 10), Midnight Forest (Level 20)
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';

export type Theme = 'light' | 'dark' | 'ocean' | 'sakura' | 'cyberpunk' | 'forest';

export interface ThemeInfo {
  id: Theme;
  label: string;
  emoji: string;
  description: string;
  requiredLevel: number; // 0 = free
  previewColors: [string, string, string]; // bg, card, accent
}

export const THEMES: ThemeInfo[] = [
  {
    id: 'light',
    label: 'Light',
    emoji: '☀️',
    description: 'Clean and bright — classic StudyQuest',
    requiredLevel: 0,
    previewColors: ['#F0EDF8', '#FFFFFF', '#7C3AED'],
  },
  {
    id: 'dark',
    label: 'Dark',
    emoji: '🌙',
    description: 'Easy on the eyes — perfect for late-night study',
    requiredLevel: 0,
    previewColors: ['#0B0D17', '#111328', '#7C3AED'],
  },
  {
    id: 'ocean',
    label: 'Ocean Breeze',
    emoji: '🌊',
    description: 'Cool blues and teals — calm and focused',
    requiredLevel: 0,
    previewColors: ['#0A1628', '#0F1F38', '#38BDF8'],
  },
  {
    id: 'sakura',
    label: 'Sakura',
    emoji: '🌸',
    description: 'Soft pinks and warm whites — gentle and cozy',
    requiredLevel: 0,
    previewColors: ['#FFF5F7', '#FFFFFF', '#EC4899'],
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    emoji: '⚡',
    description: 'Neon glow, dark streets — unlock at Level 10',
    requiredLevel: 10,
    previewColors: ['#0A0A0F', '#141420', '#00FF88'],
  },
  {
    id: 'forest',
    label: 'Midnight Forest',
    emoji: '🌲',
    description: 'Deep greens and earthy tones — unlock at Level 20',
    requiredLevel: 20,
    previewColors: ['#0B1A0B', '#122212', '#4ADE80'],
  },
];

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

interface MotionContextValue {
  reduceMotion: boolean;
  setReduceMotion: (reduce: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const MotionContext = createContext<MotionContextValue | null>(null);

function applyThemeToDOM(themeToApply: Theme, reduceMotionSetting?: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Remove all theme classes
  THEMES.forEach((t) => root.classList.remove(t.id));

  // Add current theme class
  root.classList.add(themeToApply);

  // Also maintain 'dark' class for themes that are dark-based
  const darkThemes: Theme[] = ['dark', 'ocean', 'cyberpunk', 'forest'];
  if (darkThemes.includes(themeToApply)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  if (reduceMotionSetting !== undefined) {
    if (reduceMotionSetting) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [reduceMotion, setReduceMotionState] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuthContext();

  // Load theme & motion: Firebase > localStorage > system preference
  useEffect(() => {
    const loadPrefs = async () => {
      let initialTheme: Theme = 'dark';
      let initialMotion = false;

      // 1. Try Firebase first (if logged in)
      if (user?.uid) {
        try {
          const prefsRef = doc(db, 'users', user.uid, 'data', 'preferences');
          const snap = await getDoc(prefsRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.theme && THEMES.some((t) => t.id === data.theme)) {
              initialTheme = data.theme as Theme;
              setThemeState(initialTheme);
              window.localStorage.setItem('sq-theme', initialTheme);
            }
            if (data.reduceMotion !== undefined) {
              initialMotion = !!data.reduceMotion;
              setReduceMotionState(initialMotion);
              window.localStorage.setItem('sq-reduce-motion', initialMotion ? 'true' : 'false');
            }
            applyThemeToDOM(initialTheme, initialMotion);
            setMounted(true);
            return;
          }
        } catch { /* fall through to localStorage */ }
      }

      // 2. Try localStorage
      const saved = window.localStorage.getItem('sq-theme') as Theme | null;
      if (saved && THEMES.some((t) => t.id === saved)) {
        initialTheme = saved;
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        initialTheme = 'light';
      }

      const savedMotion = window.localStorage.getItem('sq-reduce-motion');
      if (savedMotion !== null) {
        initialMotion = savedMotion === 'true';
      }

      setThemeState(initialTheme);
      setReduceMotionState(initialMotion);
      applyThemeToDOM(initialTheme, initialMotion);
      setMounted(true);
    };

    loadPrefs();
  }, [user?.uid]);

  // Synchronous, tear-free theme transition using View Transitions API (with instant fallback)
  const changeTheme = useCallback((newTheme: Theme) => {
    const apply = () => {
      applyThemeToDOM(newTheme);
      setThemeState(newTheme);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sq-theme', newTheme);
      }
    };

    if (typeof document !== 'undefined') {
      const docAny = document as any;
      if (typeof docAny.startViewTransition === 'function') {
        docAny.startViewTransition(() => {
          apply();
        });
      } else {
        const root = document.documentElement;
        root.classList.add('disable-theme-transitions');
        apply();
        void window.getComputedStyle(root).opacity;
        requestAnimationFrame(() => {
          root.classList.remove('disable-theme-transitions');
        });
      }
    } else {
      apply();
    }

    // Background Firebase sync
    if (user?.uid) {
      const prefsRef = doc(db, 'users', user.uid, 'data', 'preferences');
      setDoc(prefsRef, { theme: newTheme, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    }
  }, [user?.uid]);

  const toggleTheme = useCallback(() => {
    changeTheme(theme === 'dark' ? 'light' : 'dark');
  }, [changeTheme, theme]);

  const setReduceMotion = useCallback((reduce: boolean) => {
    setReduceMotionState(reduce);
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (reduce) {
        root.classList.add('reduce-motion');
      } else {
        root.classList.remove('reduce-motion');
      }
      window.localStorage.setItem('sq-reduce-motion', reduce ? 'true' : 'false');
    }

    if (user?.uid) {
      const prefsRef = doc(db, 'users', user.uid, 'data', 'preferences');
      setDoc(prefsRef, { reduceMotion: reduce, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    }
  }, [user?.uid]);

  const themeValue = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme, setTheme: changeTheme }),
    [theme, toggleTheme, changeTheme]
  );

  const motionValue = useMemo<MotionContextValue>(
    () => ({ reduceMotion, setReduceMotion }),
    [reduceMotion, setReduceMotion]
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <MotionContext.Provider value={motionValue}>
        {mounted ? (
          children
        ) : (
          <div style={{ visibility: 'hidden' }}>{children}</div>
        )}
      </MotionContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useMotion() {
  const context = useContext(MotionContext);
  if (!context) {
    throw new Error('useMotion must be used within a ThemeProvider');
  }
  return context;
}

export function useTheme() {
  const themeContext = useContext(ThemeContext);
  const motionContext = useContext(MotionContext);
  if (!themeContext || !motionContext) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return {
    ...themeContext,
    ...motionContext,
  };
}

export default ThemeContext;
