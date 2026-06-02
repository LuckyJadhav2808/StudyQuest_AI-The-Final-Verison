'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useGamification } from '@/hooks/useGamification';
import { useShop } from '@/hooks/useShop';
import { POMODORO_DEFAULTS, XP_AWARDS, COIN_AWARDS } from '@/lib/constants';
import { playCelebration, playNotify } from '@/lib/sounds';

export interface SessionCompleteData {
  xpEarned: number;
  coinsEarned: number;
  sessionCount: number;
  ingredientDrop: { id: string; name: string; emoji: string } | null;
  isLongBreak: boolean;
}

export type TimerPhase = 'focus' | 'short-break' | 'long-break';

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
  
  // Music State
  playlist: PlaylistItem[];
  currentTrackIndex: number;
  isPlayingMusic: boolean;
  volume: number;
  
  // Music Actions
  handleFilesSelected: (files: FileList) => void;
  handlePlayPauseMusic: () => void;
  handleNextMusic: () => void;
  handlePrevMusic: () => void;
  setVolume: (vol: number) => void;
  removeTrack: (index: number) => void;
  playTrack: (index: number) => void;
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
  const { addIngredient } = useShop();
  
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

  // --- Music State ---
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      
      const earnedXP = XP_AWARDS.POMODORO_COMPLETE;
      const earnedCoins = COIN_AWARDS.POMODORO_COMPLETE;
      await awardXP(earnedXP, 'Completed a focus session! 🍅');

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
  }, [phase, sessions, awardXP, addIngredient, switchPhase]);

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

  // Timer Tick
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
        
        if (phase === 'focus') {
          setTotalFocusToday((prev) => prev + 1); // Count in seconds
        }
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, phase, handlePhaseComplete]);

  // Update timeLeft when duration settings change (if timer is stopped)
  useEffect(() => {
    if (!isRunning) {
      const duration = phase === 'focus' ? durations.focus : phase === 'short-break' ? durations.shortBreak : durations.longBreak;
      if (timeLeft > duration * 60) {
        setTimeLeft(duration * 60);
      }
    }
  }, [durations, isRunning, phase, timeLeft]);

  // --- Music Logic ---
  const handleFilesSelected = (files: FileList) => {
    const newTracks = Array.from(files).map((file) => ({
      name: file.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(file)
    }));
    
    setPlaylist(prev => [...prev, ...newTracks]);
    
    // Auto-play if this is the first batch of tracks
    if (!isPlayingMusic && newTracks.length > 0 && playlist.length === 0) {
      setCurrentTrackIndex(0);
      setIsPlayingMusic(true);
    }
  };

  const handlePlayPauseMusic = () => {
    if (playlist.length === 0) return;
    setIsPlayingMusic(!isPlayingMusic);
  };

  const handleNextMusic = () => {
    if (playlist.length <= 1) return;
    setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    setIsPlayingMusic(true);
  };

  const handlePrevMusic = () => {
    if (playlist.length <= 1) return;
    setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlayingMusic(true);
  };

  const removeTrack = (index: number) => {
    // Revoke the blob URL to prevent memory leak
    const removedUrl = playlist[index]?.url;
    if (removedUrl) URL.revokeObjectURL(removedUrl);
    
    const updated = [...playlist];
    updated.splice(index, 1);
    
    // If we removed the currently playing track
    if (index === currentTrackIndex) {
      if (updated.length === 0) {
        setIsPlayingMusic(false);
        setCurrentTrackIndex(0);
      } else if (index >= updated.length) {
        setCurrentTrackIndex(0); // Wrap around to first track
      }
    } 
    // If we removed a track before the current one, adjust the index
    else if (index < currentTrackIndex) {
      setCurrentTrackIndex(prevIndex => prevIndex - 1);
    }
    
    setPlaylist(updated);
  };

  const playTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlayingMusic(true);
  };

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlayingMusic && playlist.length > 0) {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => setIsPlayingMusic(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlayingMusic, currentTrackIndex, playlist, volume]);

  // Cleanup all blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      playlist.forEach((track) => {
        try { URL.revokeObjectURL(track.url); } catch { /* ignore */ }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    phase, isRunning, timeLeft, totalTime, sessions, totalFocusToday, durations, progress, wasAbandoned,
    toggleTimer, resetTimer, skipPhase, switchPhase, setDurations, setTimeLeft, setIsRunning,
    playlist, currentTrackIndex, isPlayingMusic, volume,
    handleFilesSelected, handlePlayPauseMusic, handleNextMusic, handlePrevMusic, setVolume, removeTrack, playTrack,
    sessionCompleteData, dismissSessionComplete,
  };

  return (
    <TimerContext.Provider value={value}>
      <audio 
        ref={audioRef}
        src={playlist[currentTrackIndex]?.url}
        onEnded={handleNextMusic}
      />
      {children}
    </TimerContext.Provider>
  );
}
