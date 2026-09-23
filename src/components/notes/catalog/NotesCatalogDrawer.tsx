'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiX, HiSearch, HiClock, HiDocumentText, HiPencil } from 'react-icons/hi';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Note } from '@/types';
import { stripHtml } from '@/lib/sanitize';
import { useSidebar } from '@/context/SidebarContext';

interface NotesCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onNewNote: () => void;
  onRenameNote: (note: Note) => void;
  loading?: boolean;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotesCatalogDrawer({
  isOpen,
  onClose,
  notes,
  selectedNoteId,
  onSelectNote,
  onNewNote,
  onRenameNote,
  loading = false,
}: NotesCatalogDrawerProps) {
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { collapsed, focusMode } = useSidebar();

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const sidebarOffset = focusMode || isMobile ? 0 : collapsed ? 72 : 292;

  // Extract distinct folders
  const uniqueFolders = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => set.add(n.folder || 'General'));
    return Array.from(set).sort();
  }, [notes]);

  // Filter notes by search & folder
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        (n.folder && n.folder.toLowerCase().includes(q)) ||
        stripHtml(n.content).toLowerCase().includes(q);

      const matchesFolder = selectedFolder === 'all' || (n.folder || 'General') === selectedFolder;
      return matchesSearch && matchesFolder;
    });
  }, [notes, search, selectedFolder]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            style={{ left: sidebarOffset }}
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: -380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -380, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            style={{ left: sidebarOffset }}
            className="fixed top-0 bottom-0 z-50 w-full max-w-[340px] sm:max-w-[380px] bg-[var(--card-bg)] border-r-2 border-[var(--card-border)] shadow-2xl flex flex-col p-4 space-y-3"
          >
            {/* Catalog Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--card-border)] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <div>
                  <h2 className="text-base font-heading font-black text-[var(--foreground)] tracking-tight">
                    Scrolls & Notes
                  </h2>
                  <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                    Preserve & review knowledge
                  </p>
                </div>
                <Badge variant="primary" size="sm">{notes.length}</Badge>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<HiPlus size={14} />}
                  onClick={() => {
                    onNewNote();
                    onClose();
                  }}
                >
                  New
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg border border-[var(--card-border)] hover:border-primary/40 text-[var(--muted-foreground)] hover:text-primary transition-colors cursor-pointer"
                  title="Close drawer (Esc)"
                >
                  <HiX size={16} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative shrink-0">
              <HiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none"
                size={15}
              />
              <input
                type="text"
                placeholder="Search notes, folders, topics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-xl border-2 border-[var(--card-border)] bg-[var(--background)] text-xs text-[var(--foreground)] font-medium focus:border-primary focus:outline-none transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-0.5 cursor-pointer"
                >
                  <HiX size={13} />
                </button>
              )}
            </div>

            {/* Folder Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs shrink-0 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedFolder('all')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFolder === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-[var(--background)] text-[var(--muted-foreground)] border border-[var(--card-border)] hover:border-primary/40'
                }`}
              >
                All ({notes.length})
              </button>
              {uniqueFolders.map((f) => {
                const count = notes.filter((n) => (n.folder || 'General') === f).length;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedFolder(f)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      selectedFolder === f
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-[var(--background)] text-[var(--muted-foreground)] border border-[var(--card-border)] hover:border-primary/40'
                    }`}
                  >
                    <span>{f}</span>
                    <span className="opacity-70 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Catalog Card List */}
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {filteredNotes.length === 0 && !loading ? (
                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)]/40">
                  <span className="text-3xl block mb-2">📜</span>
                  <p className="text-xs font-heading font-bold text-[var(--foreground)]">
                    No scrolls found
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 mb-3">
                    Try adjusting your search terms or filters.
                  </p>
                  {(search || selectedFolder !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setSelectedFolder('all');
                      }}
                      className="px-3 py-1 rounded-lg border border-[var(--card-border)] text-xs text-primary hover:bg-primary/5 transition-colors cursor-pointer font-bold"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = selectedNoteId === note.id;
                  const preview = stripHtml(note.content) || 'Empty scroll...';

                  return (
                    <div
                      key={note.id}
                      onClick={() => {
                        onSelectNote(note);
                        onClose();
                      }}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer group relative ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(124,58,237,0.18)] ring-1 ring-primary/40'
                          : 'border-[var(--card-border)] bg-[var(--background)] hover:border-primary/30 hover:bg-primary/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4
                          className={`text-xs font-heading font-bold leading-snug break-words flex-1 min-w-0 ${
                            isSelected
                              ? 'text-primary'
                              : 'group-hover:text-primary transition-colors text-[var(--foreground)]'
                          }`}
                        >
                          {note.title}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRenameNote(note);
                            }}
                            className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-primary transition-all cursor-pointer"
                            title="Rename / Move Note"
                          >
                            <HiPencil size={12} />
                          </button>
                          <HiDocumentText
                            className={isSelected ? 'text-primary' : 'text-[var(--muted-foreground)]'}
                            size={14}
                          />
                        </div>
                      </div>

                      <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-2 mb-2 leading-relaxed break-words font-normal">
                        {preview}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={isSelected ? 'primary' : 'muted'} size="sm">
                          {note.folder || 'General'}
                        </Badge>
                        <span className="text-[9px] text-[var(--muted-foreground)] font-semibold">
                          <HiClock className="inline mr-0.5" size={10} />
                          {timeAgo(note.updatedAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
