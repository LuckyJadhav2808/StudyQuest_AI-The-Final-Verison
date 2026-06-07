'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiPlay, 
  HiPause, 
  HiFastForward, 
  HiRewind, 
  HiVolumeUp, 
  HiVolumeOff, 
  HiPlus,
  HiMusicNote,
  HiX,
  HiSearch,
  HiTrash,
  HiSave,
  HiCollection,
} from 'react-icons/hi';
import { type MusicTrack } from '@/lib/musicDb';
import { usePlaylists } from '@/hooks/usePlaylists';
import Button from '@/components/ui/Button';

// Legacy props interface kept for ZenMode compatibility
export interface LocalMusicPlayerProps {
  variant: 'zen' | 'regular';
  playlist: MusicTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onVolumeChange: (vol: number) => void;
  onFilesSelected: (files: FileList) => void;
  removeTrack?: (index: number) => void;
  playTrack?: (index: number) => void;
  addOnlineTrack?: (track: { id: string; name: string; artists: string; image: string; duration: number; streamUrl: string }) => void;
  clearQueue?: () => void;
  shuffleQueue?: () => void;
}

// ── Search result type (from our API) ──
interface SearchResult {
  id: string;
  name: string;
  artists: string;
  image: string;
  duration: number;
  album: string;
  year: string;
  language: string;
  hasDownloadUrl: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LocalMusicPlayer({
  variant,
  playlist,
  currentTrackIndex,
  isPlaying,
  volume,
  onPlayPause,
  onNext,
  onPrev,
  onVolumeChange,
  onFilesSelected,
  removeTrack,
  playTrack,
  addOnlineTrack,
  clearQueue,
  shuffleQueue,
}: LocalMusicPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'queue'>('queue');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Playlist save/load state
  const { playlists: savedPlaylists, savePlaylist: saveToFirebase, deletePlaylist, loading: playlistsLoading } = usePlaylists();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savePlaylistName, setSavePlaylistName] = useState('');
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const lastSuggestedTrackId = useRef<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  const currentTrack = playlist[currentTrackIndex];

  // ── Search handler with debounce ──
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/music/search?query=${encodeURIComponent(query)}&limit=15`);
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

  const onSearchInputChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => handleSearch(value), 400);
  }, [handleSearch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // ── Fetch suggestions when current track changes ──
  useEffect(() => {
    const track = playlist[currentTrackIndex];
    if (!track || track.isLocal) {
      setSuggestions([]);
      return;
    }
    // Don't re-fetch if same track
    if (track.id === lastSuggestedTrackId.current) return;
    lastSuggestedTrackId.current = track.id;

    let cancelled = false;
    setLoadingSuggestions(true);
    fetch(`/api/music/suggestions?id=${encodeURIComponent(track.id)}&limit=8`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.success && data.results) {
          // Filter out songs already in queue
          const queueIds = new Set(playlist.map(t => t.id));
          setSuggestions(data.results.filter((s: SearchResult) => !queueIds.has(s.id)));
        }
      })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setLoadingSuggestions(false); });

    return () => { cancelled = true; };
  }, [currentTrackIndex, playlist]);

  // ── Add online track handler ──
  const handleAddOnlineTrack = useCallback(async (result: SearchResult) => {
    if (!addOnlineTrack) return;
    setLoadingSongId(result.id);
    try {
      // Fetch the stream URL from our server proxy
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
    } catch {
      // Silently fail
    } finally {
      setLoadingSongId(null);
    }
  }, [addOnlineTrack]);

  // ─── Zen Mode UI ───
  if (variant === 'zen') {
    return (
      <motion.div
        className="zen-music-player"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
      >
        <input 
          type="file" 
          accept="audio/*" 
          multiple 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
        />
        
        <div className="flex flex-col gap-2">
          {/* Track info + play button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onPlayPause}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-all shadow-lg border border-white/5"
            >
              {isPlaying ? <HiPause size={20} /> : <HiPlay size={20} className="ml-1" />}
            </button>
            
            <div className="flex-1 min-w-[120px]">
              <p className="text-[12px] font-bold text-white truncate max-w-[140px]">
                {currentTrack ? currentTrack.name : 'No Music'}
              </p>
              <p className="text-[9px] text-white/50 uppercase tracking-wider font-bold mt-0.5">
                {playlist.length > 0 ? `${currentTrackIndex + 1} of ${playlist.length}` : 'Add tracks to play'}
              </p>
            </div>

            {/* Audio visualizer bars */}
            <div className="zen-music-bars ml-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`zen-music-bar ${!isPlaying ? 'paused' : ''}`} />
              ))}
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-1">
              <button 
                onClick={onPrev}
                disabled={playlist.length <= 1}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <HiRewind size={14} />
              </button>
              <button 
                onClick={onNext}
                disabled={playlist.length <= 1}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <HiFastForward size={14} />
              </button>

              {/* Volume control */}
              <div className="relative">
                <button
                  onClick={() => onVolumeChange(volume > 0 ? 0 : 0.5)}
                  onMouseEnter={() => setShowVolume(true)}
                  className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {volume === 0 ? <HiVolumeOff size={14} /> : <HiVolumeUp size={14} />}
                </button>
                {showVolume && (
                  <div 
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-3 bg-black/80 backdrop-blur-md rounded-xl border border-white/10"
                    onMouseLeave={() => setShowVolume(false)}
                  >
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="accent-purple-500 w-20 h-1 cursor-pointer"
                      style={{ writingMode: 'horizontal-tb' }}
                    />
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowQueue(!showQueue)}
                className={`p-1.5 rounded-lg transition-colors ${showQueue ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                title="Toggle Queue"
              >
                <HiMusicNote size={14} />
              </button>
            </div>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition-all border border-white/5"
            >
              <HiPlus /> Add Songs
            </button>
          </div>
          
          {/* Queue panel */}
          <AnimatePresence>
            {showQueue && playlist.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 pt-2 border-t border-white/10 max-h-[150px] overflow-y-auto custom-scrollbar pr-1"
              >
                {playlist.map((track, i) => (
                  <div 
                    key={track.id}
                    className={`flex items-center justify-between p-1.5 rounded-lg mb-1 transition-colors ${i === currentTrackIndex ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  >
                    <div 
                      className="flex items-center gap-2 flex-1 cursor-pointer overflow-hidden"
                      onClick={() => playTrack && playTrack(i)}
                    >
                      {i === currentTrackIndex ? (
                        <HiPlay size={10} className="text-white flex-shrink-0" />
                      ) : (
                        <span className="text-[9px] font-bold text-white/30 w-3 text-center flex-shrink-0">{i + 1}</span>
                      )}
                      <span className={`text-[10px] truncate ${i === currentTrackIndex ? 'text-white font-bold' : 'text-white/60'}`}>
                        {track.name}
                      </span>
                    </div>
                    {removeTrack && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeTrack(i); }}
                        className="text-white/30 hover:text-red-400 p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        <HiX size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // ─── Regular Mode UI (with Search + Queue Tabs) ───
  return (
    <div className="music-player-card">
      <input 
        type="file" 
        accept="audio/*" 
        multiple 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
      
      {/* ── Now Playing Bar ── */}
      <div className="music-player-now-playing">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Album art or gradient placeholder */}
          <motion.div 
            className="music-player-art"
            onClick={onPlayPause}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {currentTrack?.image ? (
              <img src={currentTrack.image} alt={currentTrack.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="music-player-art-placeholder">
                {isPlaying ? <HiPause size={22} /> : <HiPlay size={22} className="ml-0.5" />}
              </div>
            )}
            {/* Playing overlay */}
            {currentTrack?.image && (
              <div className="music-player-art-overlay">
                {isPlaying ? <HiPause size={20} /> : <HiPlay size={20} className="ml-0.5" />}
              </div>
            )}
          </motion.div>
          
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-sm truncate">
              {currentTrack ? currentTrack.name : 'StudyQuest Jukebox'}
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] truncate">
              {currentTrack 
                ? `${currentTrack.artists}${currentTrack.duration ? ` · ${formatDuration(currentTrack.duration)}` : ''}`
                : 'Search online or add local files'}
            </p>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={onPrev}
            disabled={playlist.length <= 1}
            className="music-player-btn"
          >
            <HiRewind size={18} />
          </button>
          
          <motion.button 
            onClick={onPlayPause}
            className="music-player-btn-main"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPlaying ? <HiPause size={20} /> : <HiPlay size={20} className="ml-0.5" />}
          </motion.button>
          
          <button 
            onClick={onNext}
            disabled={playlist.length <= 1}
            className="music-player-btn"
          >
            <HiFastForward size={18} />
          </button>
          
          {/* Volume */}
          <div className="relative group ml-1">
            <button
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.5)}
              className="music-player-btn"
            >
              {volume === 0 ? <HiVolumeOff size={18} /> : <HiVolumeUp size={18} />}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="accent-purple-500 w-24 h-1 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="music-player-tabs">
        <button 
          className={`music-player-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <HiSearch size={14} />
          Search Online
        </button>
        <button 
          className={`music-player-tab ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          <HiMusicNote size={14} />
          Queue {playlist.length > 0 && <span className="music-player-badge">{playlist.length}</span>}
        </button>
      </div>

      {/* ── Search Panel ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'search' && (
          <motion.div 
            key="search"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="music-player-panel"
          >
            {/* Search input */}
            <div className="music-search-bar">
              <HiSearch size={16} className="text-[var(--muted-foreground)] flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchInputChange(e.target.value)}
                placeholder="Search songs, artists, albums..."
                className="music-search-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch(searchQuery);
                }}
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <HiX size={14} />
                </button>
              )}
            </div>

            {/* Search results */}
            <div className="music-search-results">
              {isSearching && (
                <div className="music-search-loading">
                  <div className="music-search-spinner" />
                  <span>Searching JioSaavn...</span>
                </div>
              )}
              
              {!isSearching && searchResults.length === 0 && searchQuery.trim() && (
                <div className="music-search-empty">
                  <span>🎵</span>
                  <p>No results found</p>
                </div>
              )}

              {!isSearching && searchResults.length === 0 && !searchQuery.trim() && (
                <div className="music-search-empty">
                  <span>🔍</span>
                  <p>Search for songs to add to your queue</p>
                  <p className="text-[10px] mt-1 text-[var(--muted-foreground)]">Powered by JioSaavn</p>
                </div>
              )}

              {searchResults.map((result) => {
                const isInQueue = playlist.some(t => t.id === result.id);
                const isLoading = loadingSongId === result.id;
                
                return (
                  <motion.div
                    key={result.id}
                    className="music-search-item"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ backgroundColor: 'var(--card-bg)' }}
                  >
                    {/* Album art thumbnail */}
                    <div className="music-search-thumb">
                      {result.image ? (
                        <img src={result.image} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-primary/10 flex items-center justify-center">
                          <HiMusicNote size={14} className="text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">{result.name}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                        {result.artists}{result.album ? ` · ${result.album}` : ''}
                      </p>
                    </div>

                    {/* Duration */}
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)] flex-shrink-0 mr-2">
                      {formatDuration(result.duration)}
                    </span>

                    {/* Add button */}
                    <button
                      onClick={() => handleAddOnlineTrack(result)}
                      disabled={isInQueue || isLoading || !addOnlineTrack}
                      className={`music-search-add ${isInQueue ? 'added' : ''}`}
                      title={isInQueue ? 'Already in queue' : 'Add to queue'}
                    >
                      {isLoading ? (
                        <div className="music-search-spinner-sm" />
                      ) : isInQueue ? (
                        '✓'
                      ) : (
                        <HiPlus size={14} />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'queue' && (
          <motion.div 
            key="queue"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="music-player-panel"
          >
            {/* Queue actions bar */}
            <div className="music-queue-actions">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 text-[10px]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <HiPlus size={12} /> Add MP3s
                </Button>
                {playlist.length > 1 && shuffleQueue && (
                  <button
                    onClick={shuffleQueue}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-primary px-2 py-1.5 rounded-lg hover:bg-primary/5 transition-all"
                    title="Shuffle queue"
                  >
                    🔀 Shuffle
                  </button>
                )}
                {playlist.length > 0 && (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-teal px-2 py-1.5 rounded-lg hover:bg-teal/5 transition-all"
                    title="Save as playlist"
                  >
                    <HiSave size={12} /> Save
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowLoadModal(true)}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-primary px-2 py-1.5 rounded-lg hover:bg-primary/5 transition-all"
                  title="Load a saved playlist"
                >
                  <HiCollection size={12} /> Playlists{savedPlaylists.length > 0 && ` (${savedPlaylists.length})`}
                </button>
                {playlist.length > 0 && clearQueue && (
                  <button
                    onClick={clearQueue}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-500/5 transition-all"
                  >
                    <HiTrash size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Save Playlist Modal */}
            <AnimatePresence>
              {showSaveModal && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b-2 border-[var(--card-border)] bg-[var(--background)] px-4 py-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Save Queue as Playlist</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={savePlaylistName}
                      onChange={(e) => setSavePlaylistName(e.target.value)}
                      placeholder="Playlist name..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] text-sm focus:border-primary/30 focus:outline-none transition-colors"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && savePlaylistName.trim()) {
                          setSavingPlaylist(true);
                          saveToFirebase(savePlaylistName, playlist).then(() => {
                            setSavingPlaylist(false);
                            setShowSaveModal(false);
                            setSavePlaylistName('');
                          });
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!savePlaylistName.trim() || savingPlaylist}
                      onClick={() => {
                        setSavingPlaylist(true);
                        saveToFirebase(savePlaylistName, playlist).then(() => {
                          setSavingPlaylist(false);
                          setShowSaveModal(false);
                          setSavePlaylistName('');
                        });
                      }}
                    >
                      {savingPlaylist ? '...' : 'Save'}
                    </Button>
                    <button onClick={() => setShowSaveModal(false)} className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      <HiX size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Load Playlist Modal */}
            <AnimatePresence>
              {showLoadModal && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b-2 border-[var(--card-border)] bg-[var(--background)]"
                >
                  <div className="px-4 py-2 flex items-center justify-between border-b border-[var(--card-border)]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Saved Playlists</p>
                    <button onClick={() => setShowLoadModal(false)} className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      <HiX size={14} />
                    </button>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                    {playlistsLoading ? (
                      <div className="p-4 text-center text-[11px] text-[var(--muted-foreground)]">Loading...</div>
                    ) : savedPlaylists.length === 0 ? (
                      <div className="p-4 text-center text-[11px] text-[var(--muted-foreground)]">No saved playlists yet</div>
                    ) : (
                      savedPlaylists.map((pl) => (
                        <div key={pl.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--card-bg)] transition-colors">
                          <button
                            className="flex-1 text-left min-w-0"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('load-playlist', { detail: pl.tracks }));
                              setShowLoadModal(false);
                            }}
                          >
                            <p className="text-[13px] font-semibold truncate">{pl.name}</p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">{pl.trackCount} tracks</p>
                          </button>
                          <button
                            onClick={() => deletePlaylist(pl.id)}
                            className="p-1.5 text-[var(--muted-foreground)] hover:text-red-500 rounded-lg hover:bg-red-500/5 transition-colors flex-shrink-0 ml-2"
                            title="Delete playlist"
                          >
                            <HiTrash size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Queue list */}
            <div className="music-queue-list">
              {playlist.length === 0 ? (
                <div className="music-search-empty">
                  <span>🎶</span>
                  <p>Your queue is empty</p>
                  <p className="text-[10px] mt-1 text-[var(--muted-foreground)]">Search online or add local MP3 files</p>
                </div>
              ) : (
                playlist.map((track, i) => (
                  <motion.div 
                    key={track.id}
                    layout
                    className={`music-queue-item ${i === currentTrackIndex ? 'active' : ''}`}
                  >
                    <div 
                      className="flex items-center gap-3 flex-1 cursor-pointer overflow-hidden"
                      onClick={() => playTrack && playTrack(i)}
                    >
                      {/* Track number or playing indicator */}
                      {i === currentTrackIndex ? (
                        <div className="music-queue-playing-indicator">
                          <div className="music-queue-bar" style={{ animationDelay: '0s' }} />
                          <div className="music-queue-bar" style={{ animationDelay: '0.15s' }} />
                          <div className="music-queue-bar" style={{ animationDelay: '0.3s' }} />
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-[var(--muted-foreground)] w-5 text-center flex-shrink-0">{i + 1}</span>
                      )}

                      {/* Mini album art */}
                      {track.image && (
                        <img src={track.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      )}

                      <div className="min-w-0 flex-1">
                        <span className={`text-[13px] truncate block ${i === currentTrackIndex ? 'text-primary font-bold' : 'text-[var(--foreground)]'}`}>
                          {track.name}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)] truncate block">
                          {track.artists}
                          {track.isLocal && ' · Local'}
                        </span>
                      </div>
                    </div>

                    {/* Duration + remove */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {track.duration > 0 && (
                        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                          {formatDuration(track.duration)}
                        </span>
                      )}
                      {removeTrack && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeTrack(i); }}
                          className="text-[var(--muted-foreground)] hover:text-red-500 p-1.5 rounded-lg hover:bg-[var(--card-bg)] transition-colors"
                          title="Remove from queue"
                        >
                          <HiX size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Suggested for You — shown when an online track is playing */}
            {suggestions.length > 0 && (
              <div className="border-t-2 border-[var(--card-border)] px-4 pt-3 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 flex items-center gap-1.5">
                  ✨ Suggested for You
                </p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {suggestions.slice(0, 6).map((s) => {
                    const isInQueue = playlist.some(t => t.id === s.id);
                    const isLoading = loadingSongId === s.id;
                    return (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--card-bg)] transition-colors">
                        {s.image && (
                          <img src={s.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold truncate">{s.name}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)] truncate">{s.artists}</p>
                        </div>
                        <span className="text-[9px] font-mono text-[var(--muted-foreground)] flex-shrink-0">{formatDuration(s.duration)}</span>
                        <button
                          onClick={() => handleAddOnlineTrack(s)}
                          disabled={isInQueue || isLoading || !addOnlineTrack}
                          className={`music-search-add ${isInQueue ? 'added' : ''}`}
                          style={{ width: 24, height: 24 }}
                          title={isInQueue ? 'Already in queue' : 'Add to queue'}
                        >
                          {isLoading ? <div className="music-search-spinner-sm" /> : isInQueue ? '✓' : <HiPlus size={12} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {loadingSuggestions && playlist.length > 0 && suggestions.length === 0 && (
              <div className="border-t-2 border-[var(--card-border)] px-4 py-4 flex items-center justify-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                <div className="music-search-spinner-sm" /> Finding similar songs...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
