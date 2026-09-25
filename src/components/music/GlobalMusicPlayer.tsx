'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlay,
  HiPause,
  HiFastForward,
  HiRewind,
  HiVolumeUp,
  HiVolumeOff,
  HiSearch,
  HiX,
  HiChevronUp,
  HiChevronDown,
  HiCollection,
  HiTrash,
  HiSparkles,
  HiPlus,
} from 'react-icons/hi';
import { useMusic } from '@/context/MusicContext';
import { usePathname } from 'next/navigation';
import { type CuratedCategory } from '@/lib/musicEngine';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function GlobalMusicPlayer() {
  const {
    playlist,
    currentTrack,
    currentTrackIndex,
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
    addAndPlayTrack,
    addTrack,
    removeTrack,
    clearQueue,
    shuffleQueue,
  } = useMusic();

  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'explore' | 'search' | 'queue'>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [categories, setCategories] = useState<CuratedCategory[]>([]);
  const [activeCategoryTracks, setActiveCategoryTracks] = useState<any[]>([]);
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const categoryCacheRef = useRef<Record<string, any[]>>({});

  // Optimized Search Input with AbortController
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/music/search?query=${encodeURIComponent(query)}&limit=16`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.success && data.results) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setSearchResults([]);
      }
    } finally {
      if (searchAbortRef.current === controller) {
        setIsSearching(false);
      }
    }
  }, []);

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => handleSearch(val), 350);
  };

  // Load a curated category with in-memory caching
  const selectCategory = useCallback(async (cat: CuratedCategory) => {
    if (categoryCacheRef.current[cat.id]) {
      setActiveCategoryTracks(categoryCacheRef.current[cat.id]);
      return;
    }

    setLoadingCategory(cat.id);
    try {
      const res = await fetch(`/api/music/trending?category=${encodeURIComponent(cat.id)}`);
      const data = await res.json();
      if (data.success && data.results) {
        categoryCacheRef.current[cat.id] = data.results;
        setActiveCategoryTracks(data.results);
      }
    } catch {
      setActiveCategoryTracks([]);
    } finally {
      setLoadingCategory(null);
    }
  }, []);

  // Fetch initial trending categories & auto-load first category
  useEffect(() => {
    let mounted = true;
    fetch('/api/music/trending')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data.success && data.categories) {
          setCategories(data.categories);
          if (data.categories.length > 0) {
            selectCategory(data.categories[0]);
          }
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, [selectCategory]);

  // Scrubber drag handler
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    const newTime = (newProgress / 100) * duration;
    seek(newTime);
  };

  // Don't render if on a page where Zen Mode is active or hidden
  const isZenModePage = pathname === '/zen';

  return (
    <>
      {/* ── BitChord Full Glassmorphic Studio Modal ── */}
      <AnimatePresence>
        {isPlayerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={() => setIsPlayerOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md will-change-opacity"
          >
            {/* Dynamic blurred ambient background from album artwork */}
            {currentTrack?.image && (
              <div
                className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-15 pointer-events-none -z-10"
                style={{
                  backgroundImage: `url(${currentTrack.image})`,
                  transform: 'translateZ(0)',
                }}
              />
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0D101D] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden text-white will-change-transform"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <span className="font-heading font-black text-sm sm:text-base tracking-wide text-gradient">
                    StudyQuest Music Studio
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary-light font-mono font-bold">
                    BitChord v2.0
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Minimize */}
                  <button
                    onClick={() => setIsPlayerOpen(false)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                    title="Minimize"
                  >
                    <HiChevronDown size={20} />
                  </button>
                  {/* Close */}
                  <button
                    onClick={() => setIsPlayerOpen(false)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    <HiX size={20} />
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Big Album Art & Now Playing Controls (5 cols) */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="relative w-48 sm:w-56 aspect-square rounded-2xl overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.6)] border border-white/15 mb-5 group">
                    {currentTrack?.image ? (
                      <img
                        src={currentTrack.image}
                        alt={currentTrack.name}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isPlaying ? 'brightness-105' : 'brightness-90'}`}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/30 to-purple-800/30 text-white">
                        <span className="text-5xl mb-2">🎧</span>
                        <span className="text-xs text-white/60">StudyQuest Music</span>
                      </div>
                    )}
                  </div>

                  {/* Track Title & Artist */}
                  <div className="w-full text-center mb-4">
                    <h3 className="font-heading font-bold text-base sm:text-lg text-white truncate leading-tight">
                      {currentTrack ? currentTrack.name : 'No Track Playing'}
                    </h3>
                    <p className="text-xs text-white/60 truncate mt-1">
                      {currentTrack ? currentTrack.artists : 'Search or pick a study preset'}
                    </p>
                  </div>

                  {/* Timeline Scrubber */}
                  <div className="w-full mb-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={progress || 0}
                      onChange={handleSeekChange}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[11px] text-white/50 font-mono mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Transport Controls */}
                  <div className="flex items-center justify-center gap-4 mb-3">
                    {/* Shuffle */}
                    <button
                      onClick={toggleShuffle}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${isShuffle ? 'text-primary' : 'text-white/40 hover:text-white'}`}
                      title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
                    >
                      🔀
                    </button>

                    {/* Previous */}
                    <motion.button
                      onClick={prevTrack}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2.5 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
                    >
                      <HiRewind size={22} />
                    </motion.button>

                    {/* Play / Pause */}
                    <motion.button
                      onClick={togglePlayPause}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-13 h-13 rounded-full bg-primary hover:bg-primary-light text-white flex items-center justify-center shadow-xl shadow-primary/30 transition-all cursor-pointer"
                    >
                      {isPlaying ? <HiPause size={24} /> : <HiPlay size={24} className="ml-1" />}
                    </motion.button>

                    {/* Next */}
                    <motion.button
                      onClick={nextTrack}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2.5 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
                    >
                      <HiFastForward size={22} />
                    </motion.button>

                    {/* Repeat */}
                    <button
                      onClick={toggleRepeat}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${repeatMode !== 'off' ? 'text-primary' : 'text-white/40 hover:text-white'}`}
                      title={`Repeat: ${repeatMode.toUpperCase()}`}
                    >
                      {repeatMode === 'one' ? '🔂' : '🔁'}
                    </button>
                  </div>

                  {/* Volume Control */}
                  <div className="w-full flex items-center justify-center gap-2 mt-1">
                    <button
                      onClick={toggleMute}
                      className="text-white/60 hover:text-white transition-colors cursor-pointer"
                    >
                      {isMuted || volume === 0 ? <HiVolumeOff size={18} /> : <HiVolumeUp size={18} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                      className="w-28 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-[10px] font-mono text-white/50 w-6 text-right">
                      {isMuted ? 0 : volume}%
                    </span>
                  </div>
                </div>

                {/* Right Column: Catalog, Explore & Queue Tabs (7 cols) */}
                <div className="md:col-span-7 flex flex-col h-[460px] rounded-2xl bg-white/[0.02] border border-white/5 p-4 overflow-hidden">
                  {/* Tab Selector */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 mb-4">
                    <button
                      onClick={() => setActiveTab('explore')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'explore' ? 'bg-primary text-white shadow' : 'text-white/60 hover:text-white'}`}
                    >
                      ✨ Explore & Study
                    </button>
                    <button
                      onClick={() => setActiveTab('search')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'search' ? 'bg-primary text-white shadow' : 'text-white/60 hover:text-white'}`}
                    >
                      🔍 Search Catalog
                    </button>
                    <button
                      onClick={() => setActiveTab('queue')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'queue' ? 'bg-primary text-white shadow' : 'text-white/60 hover:text-white'}`}
                    >
                      📑 Queue ({playlist.length})
                    </button>
                  </div>

                  {/* Tab 1: Explore & Curated Categories */}
                  {activeTab === 'explore' && (
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      {/* Category Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {categories.map((cat) => (
                          <motion.button
                            key={cat.id}
                            onClick={() => selectCategory(cat)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`p-2.5 rounded-xl border border-white/10 bg-gradient-to-br ${cat.color} text-left flex flex-col justify-between transition-all cursor-pointer ${loadingCategory === cat.id ? 'opacity-70 animate-pulse' : ''}`}
                          >
                            <span className="text-xl mb-1">{cat.icon}</span>
                            <div>
                              <div className="font-heading font-bold text-xs text-white truncate">
                                {cat.title}
                              </div>
                              <div className="text-[10px] text-white/60 truncate">
                                {cat.subtitle}
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>

                      {/* Tracks in Selected Category */}
                      {activeCategoryTracks.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Recommended Tracks</span>
                            <span className="text-[10px] text-primary-light font-normal">
                              Click to Play
                            </span>
                          </h4>
                          <div className="space-y-1.5">
                            {activeCategoryTracks.map((track) => {
                              const isCurrent = currentTrack?.id === track.id;
                              return (
                                <div
                                  key={track.id}
                                  onClick={() => {
                                    if (isCurrent) {
                                      togglePlayPause();
                                    } else {
                                      addAndPlayTrack(track);
                                    }
                                  }}
                                  className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer group ${isCurrent ? 'bg-primary/20 border border-primary/40 shadow-sm' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.08]'}`}
                                >
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="relative w-9 h-9 flex-shrink-0">
                                      <img
                                        src={track.image || '/icon.png'}
                                        alt={track.name}
                                        className="w-full h-full rounded-lg object-cover"
                                      />
                                      {isCurrent && isPlaying && (
                                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                                          <span className="text-primary-light text-xs font-bold animate-pulse">▶</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="truncate">
                                      <div className={`text-xs font-bold truncate ${isCurrent ? 'text-primary-light font-extrabold' : 'text-white group-hover:text-primary-light transition-colors'}`}>
                                        {track.name}
                                      </div>
                                      <div className="text-[10px] text-white/50 truncate">
                                        {track.artists}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-white/40 font-mono">
                                      {formatTime(track.duration)}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addTrack(track);
                                      }}
                                      className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                                      title="Add to queue"
                                    >
                                      <HiPlus size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Universal Search */}
                  {activeTab === 'search' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="relative mb-3">
                        <HiSearch
                          size={16}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                        />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={onSearchInputChange}
                          placeholder="Search songs, artists, lofi, anime OST, YouTube..."
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/40 text-xs focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>

                      {isSearching && (
                        <div className="flex-1 flex items-center justify-center text-xs text-white/50">
                          <span className="animate-spin mr-2">⏳</span> Searching YouTube Music & catalogs...
                        </div>
                      )}

                      {!isSearching && searchResults.length > 0 && (
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                          {searchResults.map((track) => {
                            const isCurrent = currentTrack?.id === track.id;
                            return (
                              <div
                                key={track.id}
                                onClick={() => {
                                  if (isCurrent) {
                                    togglePlayPause();
                                  } else {
                                    addAndPlayTrack(track);
                                  }
                                }}
                                className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer group ${isCurrent ? 'bg-primary/20 border border-primary/40 shadow-sm' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.08]'}`}
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="relative w-9 h-9 flex-shrink-0">
                                    <img
                                      src={track.image || '/icon.png'}
                                      alt={track.name}
                                      className="w-full h-full rounded-lg object-cover"
                                    />
                                    {isCurrent && isPlaying && (
                                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                                        <span className="text-primary-light text-xs font-bold animate-pulse">▶</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="truncate">
                                    <div className={`text-xs font-bold truncate ${isCurrent ? 'text-primary-light font-extrabold' : 'text-white group-hover:text-primary-light transition-colors'}`}>
                                      {track.name}
                                    </div>
                                    <div className="text-[10px] text-white/50 truncate">
                                      {track.artists}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-white/40 font-mono">
                                    {formatTime(track.duration)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addTrack(track);
                                    }}
                                    className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                                    title="Add to queue"
                                  >
                                    <HiPlus size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isSearching && searchResults.length === 0 && searchQuery && (
                        <div className="flex-1 flex flex-col items-center justify-center text-xs text-white/50">
                          <span className="text-2xl mb-1">🔍</span>
                          No tracks found for "{searchQuery}". Try another keyword.
                        </div>
                      )}

                      {!searchQuery && (
                        <div className="flex-1 flex flex-col items-center justify-center text-xs text-white/40">
                          <span className="text-3xl mb-2">🎶</span>
                          Type anything above to search millions of songs.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Queue Management */}
                  {activeTab === 'queue' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/60 font-medium">
                          {playlist.length} track{playlist.length === 1 ? '' : 's'} in queue
                        </span>
                        {playlist.length > 0 && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={shuffleQueue}
                              className="text-[11px] text-primary-light hover:underline cursor-pointer"
                            >
                              Shuffle
                            </button>
                            <span className="text-white/20">•</span>
                            <button
                              onClick={clearQueue}
                              className="text-[11px] text-coral hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>

                      {playlist.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-xs text-white/40">
                          <span className="text-3xl mb-2">📂</span>
                          Queue is empty. Select songs from Explore or Search!
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                          {playlist.map((track, idx) => {
                            const isCurrent = idx === currentTrackIndex;
                            return (
                              <div
                                key={`${track.id}-${idx}`}
                                onClick={() => playTrack(idx)}
                                className={`flex items-center justify-between p-2 rounded-xl border transition-colors cursor-pointer group ${isCurrent ? 'bg-primary/20 border-primary/40' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08]'}`}
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-5 text-center text-xs font-mono text-white/40">
                                    {isCurrent && isPlaying ? (
                                      <span className="text-primary font-bold animate-pulse">▶</span>
                                    ) : (
                                      idx + 1
                                    )}
                                  </div>
                                  {track.image && (
                                    <img
                                      src={track.image}
                                      alt={track.name}
                                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                                    />
                                  )}
                                  <div className="truncate">
                                    <div className={`text-xs font-bold truncate ${isCurrent ? 'text-primary-light' : 'text-white'}`}>
                                      {track.name}
                                    </div>
                                    <div className="text-[10px] text-white/50 truncate">
                                      {track.artists}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeTrack(idx);
                                    }}
                                    className="p-1 rounded-lg text-white/40 hover:text-coral transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove from queue"
                                  >
                                    <HiTrash size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
