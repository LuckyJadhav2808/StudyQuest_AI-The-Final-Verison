'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useGamification } from '@/hooks/useGamification';
import { useShop } from '@/hooks/useShop';
import { POMODORO_DEFAULTS, XP_AWARDS, COIN_AWARDS } from '@/lib/constants';
import { playCelebration, playNotify } from '@/lib/sounds';
import {
  type MusicTrack,
  saveTrack,
  loadPlaylist as loadPlaylistFromDb,
  loadPlaylistOrder,
  savePlaylistOrder,
  savePlayerState,
  loadPlayerState,
  removeTrackFromDb,
  cacheAudioBlob,
  createObjectUrlFromBlob,
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

  // ═══════════════════════════════════════════════════════════
  // ═══ HYBRID MUSIC STATE (IndexedDB-Persisted) ═══════════
  // ═══════════════════════════════════════════════════════════
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [musicReady, setMusicReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

  // ── Restore playlist from IndexedDB on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Load all tracks from IndexedDB
        const tracks = await loadPlaylistFromDb();
        const order = await loadPlaylistOrder();
        const state = await loadPlayerState();

        if (cancelled) return;

        if (tracks.length > 0) {
          // Re-order tracks according to saved order
          let ordered: MusicTrack[];
          if (order && order.length > 0) {
            const trackMap = new Map(tracks.map(t => [t.id, t]));
            ordered = order
              .map(id => trackMap.get(id))
              .filter((t): t is MusicTrack => !!t);
            // Append any tracks not in the order (newly added)
            const orderedIds = new Set(ordered.map(t => t.id));
            for (const t of tracks) {
              if (!orderedIds.has(t.id)) ordered.push(t);
            }
          } else {
            ordered = tracks;
          }

          // Generate blob URLs for tracks with cached audio
          for (const track of ordered) {
            if (track.audioBlob) {
              const blobUrl = createObjectUrlFromBlob(track.audioBlob);
              blobUrlsRef.current.set(track.id, blobUrl);
            }
          }

          setPlaylist(ordered);
        }

        if (state) {
          setCurrentTrackIndex(state.currentTrackIndex || 0);
          setVolumeState(state.volume ?? 0.5);
          // Don't auto-play on restore — user should click play
        }
      } catch (e) {
        console.error('Failed to restore music state from IndexedDB', e);
      } finally {
        if (!cancelled) setMusicReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Persist playlist order & player state to IndexedDB on changes ──
  useEffect(() => {
    if (!musicReady) return;
    const ids = playlist.map(t => t.id);
    savePlaylistOrder(ids).catch(() => {});
  }, [playlist, musicReady]);

  useEffect(() => {
    if (!musicReady) return;
    savePlayerState({
      currentTrackIndex,
      volume,
      isPlaying: false, // Never persist "playing" — always start paused
    }).catch(() => {});
  }, [currentTrackIndex, volume, musicReady]);

  // ── Helper: get the audio source URL for a track ──
  const getTrackAudioUrl = useCallback((track: MusicTrack): string => {
    // 1. Check for a generated blob URL (local file or cached online)
    const blobUrl = blobUrlsRef.current.get(track.id);
    if (blobUrl) return blobUrl;
    // 2. Use the streaming URL (online track)
    return track.url;
  }, []);

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
  // ═══ MUSIC LOGIC (Hybrid: Local Files + JioSaavn) ═══════
  // ═══════════════════════════════════════════════════════════

  /** Add local files from the file picker */
  const handleFilesSelected = useCallback(async (files: FileList) => {
    const newTracks: MusicTrack[] = [];

    for (const file of Array.from(files)) {
      const id = generateTrackId();
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      const blobUrl = createObjectUrlFromBlob(blob);
      blobUrlsRef.current.set(id, blobUrl);

      const track: MusicTrack = {
        id,
        name: file.name.replace(/\.[^/.]+$/, ''),
        artists: 'Local File',
        image: '',
        url: '',
        duration: 0,
        isLocal: true,
        audioBlob: blob,
      };

      newTracks.push(track);
      // Persist each track to IndexedDB (with audio blob)
      saveTrack(track).catch(() => {});
    }

    setPlaylist(prev => {
      const updated = [...prev, ...newTracks];
      return updated;
    });

    // Auto-play if nothing was playing
    if (!isPlayingMusic && newTracks.length > 0 && playlist.length === 0) {
      setCurrentTrackIndex(0);
      setIsPlayingMusic(true);
    }
  }, [isPlayingMusic, playlist.length]);

  /** Add an online track from JioSaavn search */
  const addOnlineTrack = useCallback((trackData: {
    id: string; name: string; artists: string; image: string; duration: number; streamUrl: string;
  }) => {
    // Check if already in queue
    if (playlist.some(t => t.id === trackData.id)) {
      toast('Already in queue! 🎵');
      return;
    }

    const track: MusicTrack = {
      id: trackData.id,
      name: trackData.name,
      artists: trackData.artists,
      image: trackData.image,
      url: trackData.streamUrl,
      duration: trackData.duration,
      isLocal: false,
    };

    setPlaylist(prev => [...prev, track]);
    // Persist metadata (no audio blob yet — will cache when played)
    saveTrack(track).catch(() => {});
    toast.success(`Added "${trackData.name}" to queue 🎵`);

    // Auto-play if nothing was playing
    if (!isPlayingMusic && playlist.length === 0) {
      setCurrentTrackIndex(0);
      setIsPlayingMusic(true);
    }
  }, [isPlayingMusic, playlist]);

  const handlePlayPauseMusic = useCallback(() => {
    if (playlist.length === 0) return;
    setIsPlayingMusic(prev => !prev);
  }, [playlist.length]);

  const handleNextMusic = useCallback(() => {
    if (playlist.length <= 1) return;
    setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    setIsPlayingMusic(true);
  }, [playlist.length]);

  const handlePrevMusic = useCallback(() => {
    if (playlist.length <= 1) return;
    setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlayingMusic(true);
  }, [playlist.length]);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
  }, []);

  const removeTrack = useCallback((index: number) => {
    const track = playlist[index];
    if (!track) return;

    // Revoke blob URL
    const blobUrl = blobUrlsRef.current.get(track.id);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrlsRef.current.delete(track.id);
    }

    // Remove from IndexedDB
    removeTrackFromDb(track.id).catch(() => {});

    const updated = [...playlist];
    updated.splice(index, 1);
    
    // Adjust current track index
    if (index === currentTrackIndex) {
      if (updated.length === 0) {
        setIsPlayingMusic(false);
        setCurrentTrackIndex(0);
      } else if (index >= updated.length) {
        setCurrentTrackIndex(0);
      }
    } else if (index < currentTrackIndex) {
      setCurrentTrackIndex(prevIndex => prevIndex - 1);
    }
    
    setPlaylist(updated);
  }, [playlist, currentTrackIndex]);

  const playTrack = useCallback((index: number) => {
    setCurrentTrackIndex(index);
    setIsPlayingMusic(true);
  }, []);

  const clearQueue = useCallback(() => {
    // Revoke all blob URLs
    blobUrlsRef.current.forEach(url => {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    });
    blobUrlsRef.current.clear();

    setPlaylist([]);
    setCurrentTrackIndex(0);
    setIsPlayingMusic(false);

    // Clear IndexedDB
    import('@/lib/musicDb').then(m => m.clearPlaylist()).catch(() => {});
    toast.success('Queue cleared 🗑️');
  }, []);

  /** Fisher-Yates shuffle — keeps current track at index 0 */
  const shuffleQueue = useCallback(() => {
    if (playlist.length <= 1) return;
    const current = playlist[currentTrackIndex];
    const rest = playlist.filter((_, i) => i !== currentTrackIndex);
    // Fisher-Yates
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const shuffled = current ? [current, ...rest] : rest;
    setPlaylist(shuffled);
    setCurrentTrackIndex(0);
    toast.success('Queue shuffled 🔀');
  }, [playlist, currentTrackIndex]);

  /** Load tracks from a saved Firebase playlist into the queue */
  const loadPlaylistTracks = useCallback((tracks: { id: string; name: string; artists: string; image: string; url: string; duration: number; isLocal: boolean }[]) => {
    const musicTracks: MusicTrack[] = tracks.map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists,
      image: t.image,
      url: t.url,
      duration: t.duration,
      isLocal: t.isLocal,
    }));
    setPlaylist(musicTracks);
    setCurrentTrackIndex(0);
    setIsPlayingMusic(true);
    // Persist to IndexedDB
    for (const t of musicTracks) {
      saveTrack(t).catch(() => {});
    }
    toast.success(`Loaded ${musicTracks.length} tracks 🎶`);
  }, []);

  // ── Listen for load-playlist events from the UI ──
  useEffect(() => {
    const handler = (e: Event) => {
      const tracks = (e as CustomEvent).detail;
      if (Array.isArray(tracks)) {
        loadPlaylistTracks(tracks);
      }
    };
    window.addEventListener('load-playlist', handler);
    return () => window.removeEventListener('load-playlist', handler);
  }, [loadPlaylistTracks]);

  // ── Audio playback effect ──
  useEffect(() => {
    if (!audioRef.current || !musicReady) return;
    const track = playlist[currentTrackIndex];
    if (!track) {
      audioRef.current.pause();
      return;
    }

    const audioUrl = getTrackAudioUrl(track);
    if (audioRef.current.src !== audioUrl) {
      audioRef.current.src = audioUrl;
    }

    audioRef.current.volume = volume;

    if (isPlayingMusic) {
      audioRef.current.play().catch(() => setIsPlayingMusic(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlayingMusic, currentTrackIndex, playlist, volume, musicReady, getTrackAudioUrl]);

  // ── Cache online audio after it finishes loading (for offline playback) ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlayThrough = async () => {
      const track = playlist[currentTrackIndex];
      if (!track || track.isLocal || track.audioBlob) return;
      // Track is online and not yet cached — fetch and cache the audio blob
      try {
        const audioUrl = getTrackAudioUrl(track);
        if (!audioUrl || audioUrl.startsWith('blob:')) return;
        const response = await fetch(audioUrl);
        if (response.ok) {
          const blob = await response.blob();
          await cacheAudioBlob(track.id, blob);
          // Generate blob URL for future use
          const blobUrl = createObjectUrlFromBlob(blob);
          blobUrlsRef.current.set(track.id, blobUrl);
        }
      } catch {
        // Caching is best-effort — don't block playback
      }
    };

    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    return () => audio.removeEventListener('canplaythrough', handleCanPlayThrough);
  }, [currentTrackIndex, playlist, getTrackAudioUrl]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      });
    };
  }, []);

  const value = {
    phase, isRunning, timeLeft, totalTime, sessions, totalFocusToday, formattedFocusToday, durations, progress, wasAbandoned,
    toggleTimer, resetTimer, skipPhase, switchPhase, setDurations, setTimeLeft, setIsRunning,
    playlist, currentTrackIndex, isPlayingMusic, volume, musicReady,
    handleFilesSelected, handlePlayPauseMusic, handleNextMusic, handlePrevMusic, setVolume, removeTrack, playTrack,
    addOnlineTrack, clearQueue, shuffleQueue, loadPlaylistTracks,
    sessionCompleteData, dismissSessionComplete,
  };

  return (
    <TimerContext.Provider value={value}>
      <audio 
        ref={audioRef}
        onEnded={handleNextMusic}
        preload="auto"
      />
      {children}
    </TimerContext.Provider>
  );
}
