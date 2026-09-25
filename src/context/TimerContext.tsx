'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useGamification } from '@/hooks/useGamification';
import { useShop } from '@/hooks/useShop';
import { useSkillTree } from '@/hooks/useSkillTree';
import { usePet } from '@/hooks/usePet';
import { POMODORO_DEFAULTS, XP_AWARDS, COIN_AWARDS } from '@/lib/constants';
import { playCelebration, playNotify } from '@/lib/sounds';
import { useMusic } from '@/context/MusicContext';
import {
  type MusicTrack,
  saveTrack,
  generateTrackId,
} from '@/lib/musicDb';

export interface SessionCompleteData {
  xpEarned: number;
  coinsEarned: number;
  sessionCount: number;
  ingredientDrop: { id: string; name: string; emoji: string } | null;
  isLongBreak: boolean;
}

export type TimerPhase = 'focus' | 'short-break' | 'long-break';

// Legacy compat — re-export so existing imports don't break
export interface PlaylistItem {
  name: string;
  url: string;
}

interface TimerContextValue {
  // Timer State
  phase: TimerPhase;
  isRunning: boolean;
  timeLeft: number;
  totalTime: number;
  sessions: number;
  totalFocusToday: number;
  formattedFocusToday: string;
  durations: { focus: number; shortBreak: number; longBreak: number };
  progress: number;
  wasAbandoned: boolean;
  
  // Timer Actions
  toggleTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  switchPhase: (phase: TimerPhase) => void;
  setDurations: React.Dispatch<React.SetStateAction<{ focus: number; shortBreak: number; longBreak: number }>>;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Music State (hybrid — supports both local files and online JioSaavn)
  playlist: MusicTrack[];
  currentTrackIndex: number;
  isPlayingMusic: boolean;
  volume: number;
  musicReady: boolean;
  
  // Music Actions
  handleFilesSelected: (files: FileList) => void;
  handlePlayPauseMusic: () => void;
  handleNextMusic: () => void;
  handlePrevMusic: () => void;
  setVolume: (vol: number) => void;
  removeTrack: (index: number) => void;
  playTrack: (index: number) => void;
  addOnlineTrack: (track: { id: string; name: string; artists: string; image: string; duration: number; streamUrl: string }) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
  loadPlaylistTracks: (tracks: { id: string; name: string; artists: string; image: string; url: string; duration: number; isLocal: boolean }[]) => void;

  // Celebration state
  sessionCompleteData: SessionCompleteData | null;
  dismissSessionComplete: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export const useTimerContext = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimerContext must be used within TimerProvider');
  return ctx;
};

function isSameDay(t1: number, t2: number): boolean {
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { awardXP } = useGamification();
  const { addIngredient, hasActiveEffect } = useShop();
  const { hasEffect } = useSkillTree();
  const { pet, awardPetXP } = usePet();
  const music = useMusic();
  
  // --- Timer State ---
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(POMODORO_DEFAULTS.focus * 60);
  const [sessions, setSessions] = useState(0);
  const [totalFocusToday, setTotalFocusToday] = useState(0);
  const [wasAbandoned, setWasAbandoned] = useState(false);
  const [sessionCompleteData, setSessionCompleteData] = useState<SessionCompleteData | null>(null);
  const [durations, setDurations] = useState({
    focus: POMODORO_DEFAULTS.focus,
    shortBreak: POMODORO_DEFAULTS.shortBreak,
    longBreak: POMODORO_DEFAULTS.longBreak,
  });

  const formattedFocusToday = useMemo(() => {
    const hours = Math.floor(totalFocusToday / 3600);
    const minutes = Math.floor((totalFocusToday % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, [totalFocusToday]);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRestored = useRef(false);

  // Load saved timer state on mount
  useEffect(() => {
    if (hasRestored.current) return;
    
    try {
      const saved = localStorage.getItem('studyquest_timer_state');
      if (saved) {
        const state = JSON.parse(saved);
        
        const now = Date.now();
        const sameDay = isSameDay(state.lastSavedTime, now);
        
        if (sameDay) {
          // Same day: restore state & calculate elapsed countdown in background
          let finalTimeLeft = state.timeLeft;
          let finalTotalFocusToday = state.totalFocusToday;
          let shouldAutoComplete = false;
          
          if (state.isRunning) {
            const elapsedSeconds = Math.floor((now - state.lastSavedTime) / 1000);
            if (elapsedSeconds > 0) {
              if (state.timeLeft - elapsedSeconds > 0) {
                finalTimeLeft = state.timeLeft - elapsedSeconds;
                if (state.phase === 'focus') {
                  finalTotalFocusToday += elapsedSeconds;
                }
              } else {
                finalTimeLeft = 1; // set to 1s so the next tick completes naturally
                if (state.phase === 'focus') {
                  finalTotalFocusToday += state.timeLeft;
                }
                shouldAutoComplete = true;
              }
            }
          }
          
          setPhase(state.phase);
          setIsRunning(state.isRunning);
          setTimeLeft(finalTimeLeft);
          setSessions(state.sessions || 0);
          setTotalFocusToday(finalTotalFocusToday);
          if (state.durations) {
            setDurations(state.durations);
          }
          
          if (shouldAutoComplete) {
            toast('🎯 Welcome back! Your focus session is complete.');
          }
        } else {
          // Different day: reset daily sessions/focus stats
          setPhase('focus');
          setIsRunning(false);
          setSessions(0);
          setTotalFocusToday(0);
          if (state.durations) {
            setDurations(state.durations);
            setTimeLeft(state.durations.focus * 60);
          } else {
            setTimeLeft(POMODORO_DEFAULTS.focus * 60);
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore timer state', e);
    } finally {
      hasRestored.current = true;
    }
  }, []);

  // Save timer state on changes
  useEffect(() => {
    if (!hasRestored.current) return;
    
    try {
      const state = {
        phase,
        timeLeft,
        sessions,
        totalFocusToday,
        lastSavedTime: Date.now(),
        isRunning,
        durations,
      };
      localStorage.setItem('studyquest_timer_state', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save timer state to localStorage', e);
    }
  }, [phase, timeLeft, sessions, totalFocusToday, isRunning, durations]);

  const totalTime = phase === 'focus'
    ? durations.focus * 60
    : phase === 'short-break'
    ? durations.shortBreak * 60
    : durations.longBreak * 60;

  const progress = 1 - timeLeft / totalTime;

  // --- Timer Logic ---
  const switchPhase = useCallback((newPhase: TimerPhase) => {
    setPhase(newPhase);
    setIsRunning(false);
    const duration = newPhase === 'focus'
      ? durations.focus
      : newPhase === 'short-break'
      ? durations.shortBreak
      : durations.longBreak;
    setTimeLeft(duration * 60);
  }, [durations]);

  const handlePhaseComplete = useCallback(async () => {
    setIsRunning(false);
    
    if (phase === 'focus') {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      
      let earnedXP: number = XP_AWARDS.POMODORO_COMPLETE;
      let earnedCoins: number = COIN_AWARDS.POMODORO_COMPLETE;

      // Apply Focus Skill Tree multipliers
      if (hasEffect('pomodoro-xp-double')) {
        earnedXP *= 2;
      } else if (hasEffect('pomodoro-xp-20')) {
        earnedXP = Math.round(earnedXP * 1.2);
      } else if (hasEffect('pomodoro-xp-10')) {
        earnedXP = Math.round(earnedXP * 1.1);
      }

      // Apply Alchemy Double XP Elixir
      if (hasActiveEffect('xp-double')) {
        earnedXP *= 2;
      }

      if (hasEffect('pomodoro-coin-2')) {
        earnedCoins += 2;
      } else if (hasEffect('pomodoro-coin-1')) {
        earnedCoins += 1;
      }

      // Apply Alchemy Gold Rush Tonic (3x Coins)
      if (hasActiveEffect('coin-triple')) {
        earnedCoins *= 3;
      }

      await awardXP(earnedXP, 'Completed a focus session! 🍅', earnedCoins);

      // Award XP to active pet (20% of user focus XP)
      if (pet && awardPetXP) {
        awardPetXP(Math.round(earnedXP * 0.2)).catch(() => {});
      }

      // Try to drop an alchemy ingredient
      let ingredientDrop: { id: string; name: string; emoji: string } | null = null;
      try {
        ingredientDrop = await addIngredient('focus');
      } catch { /* ingredient drop is best-effort */ }
      
      const isLongBreak = newSessions % 4 === 0;

      // Show celebration overlay
      setSessionCompleteData({
        xpEarned: earnedXP,
        coinsEarned: earnedCoins,
        sessionCount: newSessions,
        ingredientDrop,
        isLongBreak,
      });

      if (isLongBreak) {
        playCelebration();
        switchPhase('long-break');
      } else {
        playCelebration();
        switchPhase('short-break');
      }
    } else {
      playNotify();
      toast('Break over! Time to focus 🎯');
      switchPhase('focus');
    }
  }, [phase, sessions, awardXP, addIngredient, switchPhase, hasEffect, pet, awardPetXP, hasActiveEffect]);

  const dismissSessionComplete = useCallback(() => {
    setSessionCompleteData(null);
  }, []);

  const toggleTimer = () => {
    if (!isRunning) setWasAbandoned(false);
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    if (isRunning && phase === 'focus' && progress > 0.1) {
      setWasAbandoned(true);
    }
    setIsRunning(false);
    setTimeLeft(totalTime);
    toast('Timer reset');
  };

  const skipPhase = () => {
    setIsRunning(false);
    handlePhaseComplete();
  };

  const handlePhaseCompleteRef = useRef(handlePhaseComplete);
  useEffect(() => {
    handlePhaseCompleteRef.current = handlePhaseComplete;
  }, [handlePhaseComplete]);

  // Timer Tick
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimeout(() => {
            handlePhaseCompleteRef.current();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
      
      if (phase === 'focus') {
        setTotalFocusToday((prev) => prev + 1); // Count in seconds
      }
    }, 1000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase]);

  // Update timeLeft when duration settings change (if timer is stopped)
  useEffect(() => {
    if (!isRunning) {
      const duration = phase === 'focus' ? durations.focus : phase === 'short-break' ? durations.shortBreak : durations.longBreak;
      if (timeLeft > duration * 60) {
        setTimeLeft(duration * 60);
      }
    }
  }, [durations, isRunning, phase, timeLeft]);

  // ═══════════════════════════════════════════════════════════
  // ═══ MUSIC DELEGATION (Connected to root MusicContext) ═══
  // ═══════════════════════════════════════════════════════════

  const handlePlayPauseMusic = useCallback(() => {
    music.togglePlayPause();
  }, [music]);

  const handleNextMusic = useCallback(() => {
    music.nextTrack();
  }, [music]);

  const handlePrevMusic = useCallback(() => {
    music.prevTrack();
  }, [music]);

  const setVolume = useCallback((vol: number) => {
    music.setVolume(vol > 1 ? vol : vol * 100);
  }, [music]);

  const value = {
    phase, isRunning, timeLeft, totalTime, sessions, totalFocusToday, formattedFocusToday, durations, progress, wasAbandoned,
    toggleTimer, resetTimer, skipPhase, switchPhase, setDurations, setTimeLeft, setIsRunning,
    playlist: music.playlist,
    currentTrackIndex: music.currentTrackIndex,
    isPlayingMusic: music.isPlaying,
    volume: music.volume / 100,
    musicReady: true,
    handleFilesSelected: music.handleFilesSelected,
    handlePlayPauseMusic,
    handleNextMusic,
    handlePrevMusic,
    setVolume,
    removeTrack: music.removeTrack,
    playTrack: music.playTrack,
    addOnlineTrack: music.addTrack,
    clearQueue: music.clearQueue,
    shuffleQueue: music.shuffleQueue,
    loadPlaylistTracks: music.loadPlaylistTracks,
    sessionCompleteData, dismissSessionComplete,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}
