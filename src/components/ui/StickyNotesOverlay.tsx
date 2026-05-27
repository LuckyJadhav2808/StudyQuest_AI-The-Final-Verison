'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiX, HiViewList, HiTrash, HiPencil } from 'react-icons/hi';
import { useStickies, STICKY_COLORS } from '@/hooks/useStickies';
import { useAuthContext } from '@/context/AuthContext';
import type { StickyNote } from '@/types';

/**
 * StickyNoteCard — Individual draggable post-it
 */
function StickyNoteCard({
  sticky, onUpdate, onDelete,
}: {
  sticky: StickyNote;
  onUpdate: (id: string, data: Partial<StickyNote>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(!sticky.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showControls, setShowControls] = useState(false);
  const [colorPick, setColorPick] = useState(false);

  const handleDragEnd = (_: never, info: { point: { x: number; y: number } }) => {
    onUpdate(sticky.id, {
      x: Math.max(0, info.point.x - 80),
      y: Math.max(0, info.point.y - 20),
    });
  };

  const handleBlur = () => {
    const val = textareaRef.current?.value || '';
    if (val !== sticky.content) onUpdate(sticky.id, { content: val });
    if (val.trim()) setEditing(false);
  };

  const isDark = parseInt(sticky.color.replace('#', ''), 16) < 0x888888;

  return (
    <motion.div
      className="fixed z-[70] cursor-grab active:cursor-grabbing select-none"
      style={{ left: sticky.x, top: sticky.y }}
      drag dragMomentum={false} onDragEnd={handleDragEnd}
      initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 10, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      whileHover={{ scale: 1.02, zIndex: 100 }}
      onHoverStart={() => setShowControls(true)}
      onHoverEnd={() => { setShowControls(false); setColorPick(false); }}
    >
      <div className="relative w-48 min-h-[120px] rounded-2xl shadow-lg p-3 pb-2 flex flex-col"
        style={{ backgroundColor: sticky.color, boxShadow: `0 4px 12px ${sticky.color}60, 0 8px 24px rgba(0,0,0,0.08)` }}>
        <div className="flex items-center justify-between mb-1.5">
          <button onClick={(e) => { e.stopPropagation(); setColorPick(!colorPick); }}
            className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform"
            style={{ background: `linear-gradient(135deg, ${sticky.color}, ${sticky.color}dd)` }} title="Change color" />
          <AnimatePresence>
            {showControls && (
              <motion.div className="flex gap-0.5" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <button onClick={(e) => { e.stopPropagation(); onDelete(sticky.id); }}
                  className="w-5 h-5 rounded-full bg-black/10 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors">
                  <HiX size={10} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {colorPick && (
            <motion.div className="flex gap-1 mb-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {STICKY_COLORS.map((c) => (
                <button key={c} onClick={(e) => { e.stopPropagation(); onUpdate(sticky.id, { color: c }); setColorPick(false); }}
                  className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${c === sticky.color ? 'border-black/30 scale-110' : 'border-black/10'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {editing ? (
          <textarea ref={textareaRef} defaultValue={sticky.content} onBlur={handleBlur} autoFocus
            placeholder="Type a quick note..." onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent resize-none text-xs leading-relaxed focus:outline-none placeholder:text-black/30 min-h-[70px]"
            style={{ color: isDark ? '#fff' : '#1a1a1a', fontFamily: 'var(--font-heading)' }}
            onKeyDown={(e) => { if (e.key === 'Escape') handleBlur(); }} />
        ) : (
          <div className="flex-1 text-xs leading-relaxed cursor-text whitespace-pre-wrap break-words"
            style={{ color: isDark ? '#fff' : '#1a1a1a', fontFamily: 'var(--font-heading)' }}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
            {sticky.content || <span className="opacity-40 italic">Click to edit...</span>}
          </div>
        )}
        <div className="absolute bottom-0 right-0 w-5 h-5 rounded-tl-lg opacity-20"
          style={{ background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.15) 50%)' }} />
      </div>
    </motion.div>
  );
}

/**
 * StickyNotesOverlay — Global overlay with FAB + management panel
 */
export default function StickyNotesOverlay() {
  const { user } = useAuthContext();
  const { stickies, addSticky, updateSticky, deleteSticky } = useStickies();
  const [showPanel, setShowPanel] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Allow other components to open the panel via custom event
  useEffect(() => {
    const handler = () => setShowPanel(true);
    window.addEventListener('open-sticky-notes', handler);
    return () => window.removeEventListener('open-sticky-notes', handler);
  }, []);

  if (!user) return null;

  return (
    <>
      {/* Floating Sticky Notes */}
      <AnimatePresence>
        {stickies.map((s) => (
          <StickyNoteCard key={s.id} sticky={s} onUpdate={updateSticky} onDelete={deleteSticky} />
        ))}
      </AnimatePresence>

      {/* Management Panel (Slide-out) */}
      <AnimatePresence>
        {showPanel && (
          <>
            <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[90]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPanel(false)} />
            <motion.div
              className="fixed right-0 top-0 bottom-0 w-80 bg-[var(--card-bg)] border-l-2 border-[var(--card-border)] z-[91] flex flex-col shadow-2xl"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between p-4 border-b-2 border-[var(--card-border)]">
                <div>
                  <h3 className="font-heading font-bold text-sm">📌 All Sticky Notes</h3>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{stickies.length} note{stickies.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => { addSticky(); }} className="p-2 rounded-xl bg-primary text-white hover:bg-primary/80 transition-colors" title="New note">
                    <HiPlus size={16} />
                  </button>
                  <button onClick={() => setShowPanel(false)} className="p-2 rounded-xl hover:bg-[var(--card-border)]/40 transition-colors">
                    <HiX size={16} />
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {stickies.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-3xl mb-2">📌</p>
                    <p className="text-xs text-[var(--muted-foreground)]">No sticky notes yet</p>
                    <button onClick={() => addSticky()} className="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/80 transition-colors">Create one</button>
                  </div>
                ) : (
                  stickies.map((sticky) => (
                    <motion.div key={sticky.id} layout className="rounded-2xl p-3 flex flex-col gap-2"
                      style={{ backgroundColor: sticky.color, boxShadow: `0 2px 8px ${sticky.color}40` }}>
                      <div className="flex items-start justify-between">
                        {editingId === sticky.id ? (
                          <textarea
                            defaultValue={sticky.content}
                            autoFocus
                            className="flex-1 bg-transparent resize-none text-xs leading-relaxed focus:outline-none min-h-[50px] rounded-lg p-1"
                            style={{ color: parseInt(sticky.color.replace('#', ''), 16) < 0x888888 ? '#fff' : '#1a1a1a' }}
                            onBlur={(e) => {
                              updateSticky(sticky.id, { content: e.target.value });
                              setEditingId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                updateSticky(sticky.id, { content: (e.target as HTMLTextAreaElement).value });
                                setEditingId(null);
                              }
                            }}
                          />
                        ) : (
                          <p className="flex-1 text-xs leading-relaxed whitespace-pre-wrap break-words min-h-[20px]"
                            style={{ color: parseInt(sticky.color.replace('#', ''), 16) < 0x888888 ? '#fff' : '#1a1a1a' }}>
                            {sticky.content || <span className="opacity-40 italic">Empty note</span>}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {STICKY_COLORS.map((c) => (
                            <button key={c} onClick={() => updateSticky(sticky.id, { color: c })}
                              className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${c === sticky.color ? 'border-black/30 scale-110' : 'border-black/10'}`}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingId(sticky.id)}
                            className="p-1 rounded-lg bg-black/10 hover:bg-black/20 transition-colors" title="Edit">
                            <HiPencil size={12} />
                          </button>
                          <button onClick={() => deleteSticky(sticky.id)}
                            className="p-1 rounded-lg bg-black/10 hover:bg-red-500 hover:text-white transition-colors" title="Delete">
                            <HiTrash size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[8px] opacity-40">{new Date(sticky.createdAt).toLocaleString()}</p>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAB Buttons */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[80] flex flex-col gap-2 items-end">
        {/* View all panel button */}
        {stickies.length > 0 && (
          <motion.button
            onClick={() => setShowPanel(true)}
            className="w-10 h-10 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] hover:border-primary/40 text-[var(--muted-foreground)] hover:text-primary shadow-md flex items-center justify-center transition-all"
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            title="View all notes"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2 }}
          >
            <HiViewList size={18} />
          </motion.button>
        )}

        {/* Create new FAB */}
        <motion.button
          onClick={() => addSticky()}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-lg flex items-center justify-center group relative"
          style={{ boxShadow: '0 4px 0 rgba(217,119,6,0.4), 0 8px 20px rgba(245,158,11,0.25)' }}
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9, y: 2 }}
          title="Add sticky note"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 1 }}
        >
          <HiPlus size={22} />
          <span className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--foreground)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">📌 Quick Note</span>
          {stickies.length > 0 && (
            <span className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
              {stickies.length}
            </span>
          )}
        </motion.button>
      </div>
    </>
  );
}
