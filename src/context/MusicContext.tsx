'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  type MusicTrack,
  loadPlaylist as loadPlaylistFromDb,
  savePlaylist as savePlaylistToDb,
  savePlayerState,
  loadPlayerState,
  generateTrackId,
} from '@/lib/musicDb';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export interface MusicContextValue {
  playlist: MusicTrack[];
  currentTrackIndex: number;
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  progress: number;
  isMuted: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  isPlayerOpen: boolean;
  setIsPlayerOpen: (open: boolean) => void;

  // Actions
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  playTrack: (index: number) => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addTrack: (track: {
    id: string;
    name: string;
    artists: string;
    image: string;
    duration: number;
    streamUrl?: string;
    url?: string;
    isLocal?: boolean;
    album?: string;
    source?: 'youtube' | 'saavn' | 'local';
  }) => void;
  addAndPlayTrack: (track: {
    id: string;
    name: string;
    artists: string;
    image: string;
    duration: number;
    streamUrl?: string;
    url?: string;
    isLocal?: boolean;
    album?: string;
    source?: 'youtube' | 'saavn' | 'local';
  }) => void;
  removeTrack: (index: number) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
  handleFilesSelected: (files: FileList) => void;
  loadPlaylistTracks: (tracks: MusicTrack[]) => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within a MusicProvider');
  return ctx;
};

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(80);
  const [prevVolume, setPrevVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);

  // Audio engines
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const pendingVideoIdRef = useRef<string | null>(null);
  const ytTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialLoad = useRef<boolean>(true);

  // Synchronized refs to avoid reading stale closures
  const playlistRef = useRef(playlist);
  const currentTrackIndexRef = useRef(currentTrackIndex);
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);
  const volumeRef = useRef(volume);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentTrackIndexRef.current = currentTrackIndex; }, [currentTrackIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const currentTrack = playlist[currentTrackIndex] || null;

  // Circular-safe navigation refs
  const nextTrackRef = useRef<() => void>(() => {});

  // ── YouTube Engine Initializer ──

  const initYouTubePlayer = useCallback((videoIdToLoad?: string, forceReinit?: boolean) => {
    if (typeof window === 'undefined') return;

    if (forceReinit && ytPlayerRef.current) {
      try {
        if (typeof ytPlayerRef.current.destroy === 'function') {
          ytPlayerRef.current.destroy();
        }
      } catch {}
      ytPlayerRef.current = null;
      isYtReadyRef.current = false;
    }

    let container = document.getElementById('studyquest-yt-embed');
    if (!container) {
      container = document.createElement('div');
      container.id = 'studyquest-yt-embed';
      container.style.position = 'fixed';
      container.style.bottom = '0px';
      container.style.right = '0px';
      container.style.width = '240px';
      container.style.height = '140px';
      container.style.opacity = '0.02';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-1';
      document.body.appendChild(container);
    }

    const targetVideoId = videoIdToLoad || pendingVideoIdRef.current || null;

    const createPlayer = () => {
      if (!window.YT || typeof window.YT.Player !== 'function') return;
      if (ytPlayerRef.current && !forceReinit) return;

      const playerConfig: any = {
        height: '140',
        width: '240',
        playerVars: {
          autoplay: videoIdToLoad && !isInitialLoad.current ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: (e: any) => {
            isYtReadyRef.current = true;
            try {
              e.target.unMute();
              e.target.setVolume(volumeRef.current);
            } catch {}

            // Set iframe autoplay permission policy on the replaced element
            try {
              const el = document.getElementById('studyquest-yt-embed');
              if (el) {
                el.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
                el.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
              }
            } catch {}

            const vid = pendingVideoIdRef.current || videoIdToLoad;
            if (vid) {
              pendingVideoIdRef.current = null;
              if (isInitialLoad.current) {
                // Cue only on initial load to respect browser autoplay policies
                try {
                  e.target.cueVideoById({ videoId: vid, startSeconds: 0 });
                } catch {}
                isInitialLoad.current = false;
              } else {
                try {
                  e.target.loadVideoById({ videoId: vid, startSeconds: 0 });
                  e.target.unMute();
                  e.target.playVideo();
                  setIsPlaying(true);
                } catch (err) {
                  console.warn('[MusicContext] onReady play error:', err);
                }
              }
            }
          },
          onStateChange: (event: any) => {
            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING, 5 = CUED
            if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              handleTrackEnded();
            } else if (event.data === 5) {
              try { event.target.playVideo(); } catch {}
            }
          },
          onError: (err: any) => {
            console.warn('[MusicContext] YouTube IFrame error code:', err?.data);
            // Silently ignore errors if playback is idle/paused on boot
            if (!isPlayingRef.current) return;

            const list = playlistRef.current;
            const idx = currentTrackIndexRef.current;
            const curr = list[idx];
            if (!curr) return;

            if (audioRef.current && (err?.data === 101 || err?.data === 150 || err?.data === 2)) {
              toast(`Direct audio stream fallback for "${curr.name}"`, { icon: '🎧' });
              const audio = audioRef.current;
              audio.src = `/api/music/stream?id=${encodeURIComponent(curr.id)}`;
              audio.load();
              audio.play()
                .then(() => setIsPlaying(true))
                .catch(() => {
                  nextTrackRef.current();
                });
            } else {
              toast.error('Unable to play track. Skipping to next...');
              nextTrackRef.current();
            }
          },
        },
      };

      if (targetVideoId) {
        playerConfig.videoId = targetVideoId;
      }

      try {
        ytPlayerRef.current = new window.YT.Player('studyquest-yt-embed', playerConfig);
      } catch (err) {
        console.warn('[MusicContext] YT.Player init exception:', err);
      }
    };

    if (window.YT && typeof window.YT.Player === 'function') {
      createPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        createPlayer();
      };

      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }

      const pollTimer = setInterval(() => {
        if (window.YT && typeof window.YT.Player === 'function') {
          clearInterval(pollTimer);
          createPlayer();
        }
      }, 200);
      setTimeout(() => clearInterval(pollTimer), 10000);
    }
  }, []);

  // ── Track Navigation ──

  const playTrack = useCallback((index: number) => {
    const list = playlistRef.current;
    if (index < 0 || index >= list.length) return;

    setCurrentTrackIndex(index);
    currentTrackIndexRef.current = index;
    const track = list[index];
    const isYt = track.id.startsWith('yt_') || track.source === 'youtube';

    if (isYt) {
      // Safely pause and unload HTML5 audio without triggering error event
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
      }

      let videoId = track.id.replace(/^yt_/, '');
      if (videoId.includes('v=')) {
        const m = videoId.match(/[?&]v=([^&]+)/);
        if (m) videoId = m[1];
      } else if (videoId.includes('/')) {
        videoId = videoId.split('/').pop()?.split('?')[0] || videoId;
      }

      const player = ytPlayerRef.current;

      if (player && typeof player.loadVideoById === 'function') {
        try {
          player.loadVideoById({
            videoId,
            startSeconds: 0,
          });
          try { player.unMute(); } catch {}
          try { player.setVolume(volumeRef.current); } catch {}
          try { player.playVideo(); } catch {}
          setIsPlaying(true);
        } catch (e) {
          console.warn('[MusicContext] Failed to load YouTube video, reinitializing:', e);
          pendingVideoIdRef.current = videoId;
          initYouTubePlayer(videoId, true);
        }
      } else {
        pendingVideoIdRef.current = videoId;
        initYouTubePlayer(videoId, true);
      }
    } else {
      // Pause YouTube player
      const player = ytPlayerRef.current;
      if (player && typeof player.pauseVideo === 'function') {
        try { player.pauseVideo(); } catch {}
      }

      const audio = audioRef.current;
      if (audio) {
        const src = track.url || `/api/music/stream?id=${encodeURIComponent(track.id)}`;
        audio.src = src;
        audio.load();
        audio.volume = volumeRef.current / 100;
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  }, [initYouTubePlayer]);

  const handleTrackEnded = useCallback(() => {
    const mode = repeatModeRef.current;
    const list = playlistRef.current;
    const idx = currentTrackIndexRef.current;

    if (mode === 'one') {
      const track = list[idx];
      const isYt = track?.id?.startsWith('yt_') || track?.source === 'youtube';
      if (isYt && ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    if (list.length === 0) return;

    const nextIdx = (idx + 1) % list.length;
    if (nextIdx === 0 && mode === 'off') {
      setIsPlaying(false);
      return;
    }

    playTrack(nextIdx);
  }, [playTrack]);

  const nextTrack = useCallback(() => {
    const list = playlistRef.current;
    const currentIdx = currentTrackIndexRef.current;
    if (list.length === 0) return;

    let nextIdx = (currentIdx + 1) % list.length;
    if (isShuffleRef.current && list.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * list.length);
      } while (nextIdx === currentIdx);
    }
    playTrack(nextIdx);
  }, [playTrack]);

  const prevTrack = useCallback(() => {
    const list = playlistRef.current;
    const currentIdx = currentTrackIndexRef.current;
    if (list.length === 0) return;

    const track = list[currentIdx];
    const isYt = track?.id?.startsWith('yt_') || track?.source === 'youtube';

    if (isYt && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      try {
        if (ytPlayerRef.current.getCurrentTime() > 3) {
          ytPlayerRef.current.seekTo(0, true);
          return;
        }
      } catch {}
    } else {
      const audio = audioRef.current;
      if (audio && audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
      }
    }

    const prevIdx = (currentIdx - 1 + list.length) % list.length;
    playTrack(prevIdx);
  }, [playTrack]);

  // ── Preload YouTube Player on Mount ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    initYouTubePlayer();

    // Polling fallback to ensure player is ready
    const pollTimer = setInterval(() => {
      if (window.YT && typeof window.YT.Player === 'function' && !ytPlayerRef.current) {
        initYouTubePlayer();
      }
    }, 300);

    return () => {
      clearInterval(pollTimer);
      if (ytTickerRef.current) clearInterval(ytTickerRef.current);
    };
  }, [initYouTubePlayer]);

  // ── YouTube Progress Ticker (Optimized 1s Ticks) ──
  useEffect(() => {
    if (ytTickerRef.current) {
      clearInterval(ytTickerRef.current);
      ytTickerRef.current = null;
    }

    const isYt = currentTrack?.id?.startsWith('yt_') || currentTrack?.source === 'youtube';
    if (isPlaying && isYt) {
      let lastSecond = -1;
      ytTickerRef.current = setInterval(() => {
        const p = ytPlayerRef.current;
        if (p && typeof p.getCurrentTime === 'function') {
          try {
            const t = p.getCurrentTime();
            const d = p.getDuration();
            if (typeof t === 'number' && !isNaN(t)) {
              const sec = Math.floor(t);
              if (sec !== lastSecond) {
                lastSecond = sec;
                setCurrentTime(sec);
              }
            }
            if (typeof d === 'number' && !isNaN(d) && d > 0) {
              setDuration(Math.floor(d));
            }
          } catch {}
        }
      }, 1000);
    }

    return () => {
      if (ytTickerRef.current) {
        clearInterval(ytTickerRef.current);
        ytTickerRef.current = null;
      }
    };
  }, [isPlaying, currentTrack?.id, currentTrack?.source]);

  // ── HTML5 Audio Setup & Global Events ──
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    let lastSecond = -1;
    const handleTimeUpdate = () => {
      const isYt = playlistRef.current[currentTrackIndexRef.current]?.id?.startsWith('yt_');
      if (!isYt) {
        const sec = Math.floor(audio.currentTime);
        if (sec !== lastSecond) {
          lastSecond = sec;
          setCurrentTime(sec);
          if (audio.duration && !isNaN(audio.duration)) {
            setDuration(Math.floor(audio.duration));
          }
        }
      }
    };

    const handleDurationChange = () => {
      const isYt = playlistRef.current[currentTrackIndexRef.current]?.id?.startsWith('yt_');
      if (!isYt && audio.duration && !isNaN(audio.duration)) {
        setDuration(Math.floor(audio.duration));
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleError = (e: any) => {
      // Ignore if audio has no source attribute or was deliberately unloaded
      if (!audio.getAttribute('src')) return;
      const isYt = playlistRef.current[currentTrackIndexRef.current]?.id?.startsWith('yt_');
      if (!isYt) {
        console.warn('[MusicContext] Audio stream error:', e);
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleTrackEnded);
    audio.addEventListener('error', handleError);

    // Load initial tracks and player state from IndexedDB
    loadPlaylistFromDb()
      .then((savedTracks) => {
        if (savedTracks && savedTracks.length > 0) {
          setPlaylist(savedTracks);
        }
      })
      .catch(() => {});

    loadPlayerState()
      .then((savedState) => {
        if (savedState) {
          if (typeof savedState.volume === 'number') {
            setVolumeState(savedState.volume);
            audio.volume = savedState.volume / 100;
          }
          if (typeof savedState.currentTrackIndex === 'number') {
            setCurrentTrackIndex(savedState.currentTrackIndex);
            currentTrackIndexRef.current = savedState.currentTrackIndex;
          }
        }
      })
      .catch(() => {});

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleTrackEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.removeAttribute('src');
    };
  }, [handleTrackEnded]);

  // ── Sync track changes & MediaSession ──
  useEffect(() => {
    if (!currentTrack) return;

    const isYt = currentTrack.id.startsWith('yt_') || currentTrack.source === 'youtube';

    if (isYt) {
      const videoId = currentTrack.id.replace('yt_', '');
      const player = ytPlayerRef.current;
      if (player && isYtReadyRef.current && typeof player.loadVideoById === 'function') {
        if (!isInitialLoad.current && isPlayingRef.current) {
          player.loadVideoById(videoId, 0);
          player.playVideo();
          setIsPlaying(true);
        } else {
          try { player.cueVideoById(videoId, 0); } catch {}
          isInitialLoad.current = false;
        }
      } else {
        pendingVideoIdRef.current = videoId;
      }
    } else {
      const audio = audioRef.current;
      if (audio) {
        const streamSrc = currentTrack.url || `/api/music/stream?id=${encodeURIComponent(currentTrack.id)}`;
        if (audio.src !== streamSrc && !audio.src.endsWith(streamSrc)) {
          audio.src = streamSrc;
          audio.load();
          if (!isInitialLoad.current && isPlayingRef.current) {
            audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          } else {
            isInitialLoad.current = false;
          }
        }
      }
    }

    // Media Session API for hardware buttons & lockscreen
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name,
        artist: currentTrack.artists,
        album: currentTrack.album || 'StudyQuest Music',
        artwork: currentTrack.image ? [{ src: currentTrack.image, sizes: '512x512', type: 'image/png' }] : [],
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          seek(details.seekTime);
        }
      });
    }

    // Persist player state
    savePlayerState({
      currentTrackIndex,
      volume,
      isPlaying: false,
    }).catch(() => {});
  }, [currentTrackIndex, currentTrack?.id]);

  // Persist playlist changes to IndexedDB
  useEffect(() => {
    if (playlist.length > 0) {
      savePlaylistToDb(playlist).catch(() => {});
    }
  }, [playlist]);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  // ── Controls ──

  const togglePlayPause = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) {
      toast('Queue is empty. Search or select a song to play!', { icon: '🎵' });
      return;
    }

    const idx = currentTrackIndexRef.current;
    const track = list[idx];
    const isYt = track?.id?.startsWith('yt_') || track?.source === 'youtube';

    if (isYt) {
      const player = ytPlayerRef.current;
      if (player && typeof player.getPlayerState === 'function') {
        try {
          const state = player.getPlayerState();
          if (state === 1) { // PLAYING
            player.pauseVideo();
            setIsPlaying(false);
          } else {
            try { player.unMute(); } catch {}
            player.playVideo();
            setIsPlaying(true);
          }
        } catch {
          playTrack(idx);
        }
      } else {
        playTrack(idx);
      }
    } else {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        if (!audio.getAttribute('src') && track) {
          playTrack(idx);
          return;
        }
        audio.play().then(() => setIsPlaying(true)).catch((err) => {
          console.warn('Playback error:', err);
          playTrack(idx);
        });
      }
    }
  }, [isPlaying, playTrack]);

  const seek = useCallback((seconds: number) => {
    const track = playlistRef.current[currentTrackIndexRef.current];
    const isYt = track?.id?.startsWith('yt_') || track?.source === 'youtube';

    if (isYt) {
      const player = ytPlayerRef.current;
      if (player && typeof player.seekTo === 'function') {
        try {
          player.seekTo(seconds, true);
          setCurrentTime(seconds);
        } catch {}
      }
    } else {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = Math.max(0, Math.min(seconds, duration));
        setCurrentTime(audio.currentTime);
      }
    }
  }, [duration]);

  const setVolume = useCallback((vol: number) => {
    const safeVol = Math.max(0, Math.min(100, vol));
    setVolumeState(safeVol);
    if (safeVol > 0) setIsMuted(false);

    const audio = audioRef.current;
    if (audio) {
      audio.volume = safeVol / 100;
    }

    const player = ytPlayerRef.current;
    if (player && typeof player.setVolume === 'function') {
      try {
        player.setVolume(safeVol);
        if (safeVol > 0 && typeof player.isMuted === 'function' && player.isMuted()) {
          player.unMute();
        }
      } catch {}
    }

    savePlayerState({ currentTrackIndex: currentTrackIndexRef.current, volume: safeVol, isPlaying: false }).catch(() => {});
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    const player = ytPlayerRef.current;

    if (isMuted) {
      const restored = prevVolume > 0 ? prevVolume : 80;
      setVolume(restored);
      setIsMuted(false);
      if (audio) audio.muted = false;
      if (player && typeof player.unMute === 'function') {
        try { player.unMute(); } catch {}
      }
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
      if (audio) audio.muted = true;
      if (player && typeof player.mute === 'function') {
        try { player.mute(); } catch {}
      }
    }
  }, [isMuted, prevVolume, volume, setVolume]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const next = !prev;
      setTimeout(() => toast.success(next ? 'Shuffle on' : 'Shuffle off'), 0);
      return next;
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    const current = repeatModeRef.current;
    const next = current === 'off' ? 'all' : current === 'all' ? 'one' : 'off';
    setRepeatMode(next);
    toast.success(`Repeat: ${next.toUpperCase()}`);
  }, []);

  const addTrack = useCallback((track: {
    id: string;
    name: string;
    artists: string;
    image: string;
    duration: number;
    streamUrl?: string;
    url?: string;
    isLocal?: boolean;
    album?: string;
    source?: 'youtube' | 'saavn' | 'local';
  }) => {
    const isYt = track.id.startsWith('yt_') || track.source === 'youtube';
    const newTrack: MusicTrack = {
      id: track.id,
      name: track.name,
      artists: track.artists,
      image: track.image || '',
      url: track.streamUrl || track.url || (isYt ? '' : `/api/music/stream?id=${encodeURIComponent(track.id)}`),
      duration: track.duration || 0,
      isLocal: !!track.isLocal,
      album: track.album || '',
      source: track.source || (isYt ? 'youtube' : track.isLocal ? 'local' : 'saavn'),
    };

    const currentList = playlistRef.current;
    if (currentList.some((t) => t.id === newTrack.id)) {
      toast('Track is already in queue', { icon: 'ℹ️' });
      return;
    }

    const updated = [...currentList, newTrack];
    playlistRef.current = updated;
    setPlaylist(updated);
    toast.success(`Added "${newTrack.name}" to queue`);
  }, []);

  const addAndPlayTrack = useCallback((track: {
    id: string;
    name: string;
    artists: string;
    image: string;
    duration: number;
    streamUrl?: string;
    url?: string;
    isLocal?: boolean;
    album?: string;
    source?: 'youtube' | 'saavn' | 'local';
  }) => {
    const isYt = track.id.startsWith('yt_') || track.source === 'youtube';
    const newTrack: MusicTrack = {
      id: track.id,
      name: track.name,
      artists: track.artists,
      image: track.image || '',
      url: track.streamUrl || track.url || (isYt ? '' : `/api/music/stream?id=${encodeURIComponent(track.id)}`),
      duration: track.duration || 0,
      isLocal: !!track.isLocal,
      album: track.album || '',
      source: track.source || (isYt ? 'youtube' : track.isLocal ? 'local' : 'saavn'),
    };

    const currentList = playlistRef.current;
    const existingIdx = currentList.findIndex((t) => t.id === newTrack.id);
    if (existingIdx !== -1) {
      playTrack(existingIdx);
      return;
    }

    const updated = [...currentList, newTrack];
    playlistRef.current = updated;
    setPlaylist(updated);
    playTrack(updated.length - 1);
  }, [playTrack]);

  const removeTrack = useCallback((index: number) => {
    const currentList = playlistRef.current;
    const currentIdx = currentTrackIndexRef.current;
    const updated = currentList.filter((_, i) => i !== index);
    setPlaylist(updated);

    if (index === currentIdx) {
      if (updated.length === 0) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
        }
        if (ytPlayerRef.current && typeof ytPlayerRef.current.stopVideo === 'function') {
          try { ytPlayerRef.current.stopVideo(); } catch {}
        }
        setIsPlaying(false);
        setCurrentTrackIndex(0);
        currentTrackIndexRef.current = 0;
      } else {
        const nextIdx = index >= updated.length ? 0 : index;
        setTimeout(() => playTrack(nextIdx), 50);
      }
    } else if (index < currentIdx) {
      setCurrentTrackIndex((prev) => prev - 1);
      currentTrackIndexRef.current = currentTrackIndexRef.current - 1;
    }
  }, [playTrack]);

  const clearQueue = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.stopVideo === 'function') {
      try { ytPlayerRef.current.stopVideo(); } catch {}
    }
    setIsPlaying(false);
    setPlaylist([]);
    setCurrentTrackIndex(0);
    currentTrackIndexRef.current = 0;
    toast.success('Queue cleared');
  }, []);

  const shuffleQueue = useCallback(() => {
    const list = playlistRef.current;
    const currentIdx = currentTrackIndexRef.current;
    if (list.length <= 1) return;

    const current = list[currentIdx];
    const rest = list.filter((_, i) => i !== currentIdx);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const shuffled = [current, ...rest];
    setPlaylist(shuffled);
    setCurrentTrackIndex(0);
    toast.success('Queue shuffled');
  }, []);

  const handleFilesSelected = useCallback((files: FileList) => {
    const newTracks: MusicTrack[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('audio/')) {
        const url = URL.createObjectURL(file);
        newTracks.push({
          id: generateTrackId(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          artists: 'Local File',
          image: '',
          url,
          duration: 0,
          isLocal: true,
          source: 'local',
        });
      }
    }
    if (newTracks.length > 0) {
      setPlaylist((prev) => [...prev, ...newTracks]);
      toast.success(`Loaded ${newTracks.length} local audio file(s)`);
    }
  }, []);

  const loadPlaylistTracks = useCallback((tracks: MusicTrack[]) => {
    if (tracks.length === 0) return;
    setPlaylist(tracks);
    playTrack(0);
  }, [playTrack]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const value = useMemo<MusicContextValue>(() => ({
    playlist,
    currentTrackIndex,
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    progress,
    isMuted,
    repeatMode,
    isShuffle,
    isPlayerOpen,
    setIsPlayerOpen,
    togglePlayPause,
    nextTrack,
    prevTrack,
    playTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    addTrack,
    addAndPlayTrack,
    removeTrack,
    clearQueue,
    shuffleQueue,
    handleFilesSelected,
    loadPlaylistTracks,
  }), [
    playlist,
    currentTrackIndex,
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    progress,
    isMuted,
    repeatMode,
    isShuffle,
    isPlayerOpen,
    togglePlayPause,
    nextTrack,
    prevTrack,
    playTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    addTrack,
    addAndPlayTrack,
    removeTrack,
    clearQueue,
    shuffleQueue,
    handleFilesSelected,
    loadPlaylistTracks,
  ]);

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}
