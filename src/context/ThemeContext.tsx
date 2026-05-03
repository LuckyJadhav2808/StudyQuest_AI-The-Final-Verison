'use client';

// ============================================================
// StudyQuest AI — Theme Context (Multi-Theme Support)
// 6 Themes: Light, Dark (free), Ocean Breeze, Sakura (free),
//           Cyberpunk (Level 10), Midnight Forest (Level 20)
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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
    previewColors: ['#FEF7FF', '#FFFFFF', '#7C3AED'],
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

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('sq-theme') as Theme | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setThemeState(saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setThemeState('light');
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    // Remove all theme classes
    THEMES.forEach((t) => root.classList.remove(t.id));

    // Add current theme class
    root.classList.add(theme);

    // Also maintain 'dark' class for themes that are dark-based
    const darkThemes: Theme[] = ['dark', 'ocean', 'cyberpunk', 'forest'];
    if (darkThemes.includes(theme)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    window.localStorage.setItem('sq-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
