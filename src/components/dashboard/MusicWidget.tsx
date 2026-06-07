'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HiPlay, HiPause, HiFastForward, HiRewind,
  HiVolumeUp, HiVolumeOff, HiSearch, HiMusicNote, HiPlus, HiX,
} from 'react-icons/hi';
import { useTimerContext } from '@/context/TimerContext';
import Card from '@/components/ui/Card';

interface SearchResult {
  id: string;
  name: string;
  artists: string;
  image: string;
  duration: number;
  album: string;
  hasDownloadUrl: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MusicWidget() {
  const {
    playlist,
    currentTrackIndex,
    isPlayingMusic,
    volume,
    handlePlayPauseMusic,
    handleNextMusic,
    handlePrevMusic,
    setVolume,
    addOnlineTrack,
    playTrack,
  } = useTimerContext();

  const currentTrack = playlist[currentTrackIndex];

  // Mini search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/music/search?query=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      if (data.success && data.results) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const onSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => handleSearch(value), 400);
  }, [handleSearch]);

  useEffect(() => {
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, []);

  const handleAddTrack = useCallback(async (result: SearchResult) => {
    if (!addOnlineTrack) return;
    setLoadingSongId(result.id);
    try {
      const res = await fetch(`/api/music/song?id=${encodeURIComponent(result.id)}`);
      const data = await res.json();
      if (data.success && data.song?.streamUrl) {
        addOnlineTrack({
          id: data.song.id,
          name: data.song.name,
          artists: data.song.artists,
          image: data.song.image,
          duration: data.song.duration,
          streamUrl: data.song.streamUrl,
        });
      }
    } catch { /* silent */ } finally {
      setLoadingSongId(null);
    }
  }, [addOnlineTrack]);

  return (
    <Card className="music-widget overflow-hidden" padding="none" hover={false}>
      {/* Header */}
      <div className="music-widget-header">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎵</span>
          <h3 className="text-[11px] font-heading font-bold uppercase tracking-wider">
            Jukebox
          </h3>
        </div>
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className={`p-1.5 rounded-lg transition-all ${searchOpen ? 'bg-primary/15 text-primary' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)]'}`}
          title="Search & add songs"
        >
          <HiSearch size={14} />
        </button>
      </div>

      {/* Now playing section */}
      <div className="music-widget-player">
        {/* Vinyl / Album art */}
        <div className="music-widget-vinyl-wrapper">
          <motion.div 
            className="music-widget-vinyl"
            animate={{ rotate: isPlayingMusic ? 360 : 0 }}
            transition={{ duration: 3, repeat: isPlayingMusic ? Infinity : 0, ease: 'linear' }}
          >
            {currentTrack?.image ? (
              <img src={currentTrack.image} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="music-widget-vinyl-placeholder">
                <HiMusicNote size={16} />
              </div>
            )}
            <div className="music-widget-vinyl-hole" />
          </motion.div>
        </div>

        {/* Track info */}
        <div className="music-widget-info">
          <p className="text-[13px] font-heading font-bold truncate">
            {currentTrack ? currentTrack.name : 'No Track'}
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)] truncate">
            {currentTrack ? currentTrack.artists : 'Search or add songs'}
          </p>
        </div>

        {/* Controls */}
        <div className="music-widget-controls">
          <button onClick={handlePrevMusic} disabled={playlist.length <= 1} className="music-widget-btn">
            <HiRewind size={14} />
          </button>
          <motion.button 
            onClick={handlePlayPauseMusic}
            className="music-widget-btn-play"
            whileTap={{ scale: 0.9 }}
          >
            {isPlayingMusic ? <HiPause size={16} /> : <HiPlay size={16} className="ml-0.5" />}
          </motion.button>
          <button onClick={handleNextMusic} disabled={playlist.length <= 1} className="music-widget-btn">
            <HiFastForward size={14} />
          </button>
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.5)}
            className="music-widget-btn ml-1"
          >
            {volume === 0 ? <HiVolumeOff size={13} /> : <HiVolumeUp size={13} />}
          </button>
        </div>

        {/* Mini queue preview */}
        {playlist.length > 1 && (
          <div className="music-widget-queue-preview">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">
              Up next: 
            </span>
            <span className="text-[10px] truncate text-[var(--foreground)]">
              {playlist[(currentTrackIndex + 1) % playlist.length]?.name || '—'}
            </span>
          </div>
        )}
      </div>

      {/* Search dropdown */}
      {searchOpen && (
        <motion.div
          className="music-widget-search"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="music-widget-search-bar">
            <HiSearch size={13} className="text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Quick search..."
              className="music-widget-search-input"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
                <HiX size={12} className="text-[var(--muted-foreground)]" />
              </button>
            )}
          </div>

          {isSearching && (
            <div className="p-3 text-center text-[10px] text-[var(--muted-foreground)]">Searching...</div>
          )}

          {searchResults.slice(0, 5).map((result) => {
            const isInQueue = playlist.some(t => t.id === result.id);
            return (
              <div key={result.id} className="music-widget-search-item">
                {result.image && (
                  <img src={result.image} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate">{result.name}</p>
                  <p className="text-[9px] text-[var(--muted-foreground)] truncate">{result.artists}</p>
                </div>
                <button
                  onClick={() => handleAddTrack(result)}
                  disabled={isInQueue || loadingSongId === result.id}
                  className={`p-1 rounded-md transition-all ${isInQueue ? 'text-teal' : 'text-[var(--muted-foreground)] hover:text-primary hover:bg-primary/5'}`}
                >
                  {loadingSongId === result.id ? (
                    <div className="music-search-spinner-sm" />
                  ) : isInQueue ? '✓' : <HiPlus size={12} />}
                </button>
              </div>
            );
          })}
        </motion.div>
      )}
    </Card>
  );
}
