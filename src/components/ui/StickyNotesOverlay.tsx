'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { HiPlus, HiX, HiTrash } from 'react-icons/hi';
import { useStickies, STICKY_COLORS } from '@/hooks/useStickies';
import { useAuthContext } from '@/context/AuthContext';
import type { StickyNote } from '@/types';

/**
 * StickyNotesOverlay — Globally mounted floating post-it notes.
 * - FAB button in bottom-right to create new stickies
 * - Draggable notes that persist position to Firestore
 * - Editable inline content
 * - Color-coded with candy palette
 */

function StickyNoteCard({
  sticky,
  onUpdate,
  onDelete,
}: {
  sticky: StickyNote;
  onUpdate: (id: string, data: Partial<StickyNote>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(!sticky.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [colorPick, setColorPick] = useState(false);

  const handleDragEnd = (_: never, info: { point: { x: number; y: number } }) => {
    // Get the bounding rect relative to viewport
    onUpdate(sticky.id, {
      x: Math.max(0, info.point.x - 80),
      y: Math.max(0, info.point.y - 20),
    });
  };

  const handleBlur = () => {
    const val = textareaRef.current?.value || '';
    if (val !== sticky.content) {
      onUpdate(sticky.id, { content: val });
    }
    if (val.trim()) setEditing(false);
  };

  // Determine text color based on background brightness
  const isDark = parseInt(sticky.color.replace('#', ''), 16) < 0x888888;

  return (
    <motion.div
      className="fixed z-[70] cursor-grab active:cursor-grabbing select-none"
      style={{ left: sticky.x, top: sticky.y }}
      drag
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 10, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      whileHover={{ scale: 1.02, zIndex: 100 }}
      onHoverStart={() => setShowDelete(true)}
      onHoverEnd={() => { setShowDelete(false); setColorPick(false); }}
    >
      <div
        className="relative w-48 min-h-[120px] rounded-2xl shadow-lg p-3 pb-2 flex flex-col"
        style={{
          backgroundColor: sticky.color,
          boxShadow: `0 4px 12px ${sticky.color}60, 0 8px 24px rgba(0,0,0,0.08)`,
        }}
      >
        {/* Top controls */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex gap-0.5">
            {/* Color picker toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setColorPick(!colorPick); }}
              className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform"
              style={{ background: `linear-gradient(135deg, ${sticky.color}, ${sticky.color}dd)` }}
              title="Change color"
            />
          </div>

          <AnimatePresence>
            {showDelete && (
              <motion.div
                className="flex gap-0.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(sticky.id); }}
                  className="w-5 h-5 rounded-full bg-black/10 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                >
                  <HiX size={10} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Color picker row */}
        <AnimatePresence>
          {colorPick && (
            <motion.div
              className="flex gap-1 mb-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {STICKY_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(sticky.id, { color: c });
                    setColorPick(false);
                  }}
                  className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                    c === sticky.color ? 'border-black/30 scale-110' : 'border-black/10'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {editing ? (
          <textarea
            ref={textareaRef}
            defaultValue={sticky.content}
            onBlur={handleBlur}
            autoFocus
            placeholder="Type a quick note..."
            className="flex-1 bg-transparent resize-none text-xs leading-relaxed focus:outline-none placeholder:text-black/30 min-h-[70px]"
            style={{ color: isDark ? '#fff' : '#1a1a1a', fontFamily: 'var(--font-heading)' }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleBlur();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="flex-1 text-xs leading-relaxed cursor-text whitespace-pre-wrap break-words"
            style={{ color: isDark ? '#fff' : '#1a1a1a', fontFamily: 'var(--font-heading)' }}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            {sticky.content || <span className="opacity-40 italic">Click to edit...</span>}
          </div>
        )}

        {/* Subtle fold effect */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 rounded-tl-lg opacity-20"
          style={{ background: `linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.15) 50%)` }}
        />
      </div>
    </motion.div>
  );
}

export default function StickyNotesOverlay() {
  const { user } = useAuthContext();
  const { stickies, addSticky, updateSticky, deleteSticky, loading } = useStickies();
  const [collapsed, setCollapsed] = useState(true);

  // Don't render if not authenticated
  if (!user) return null;

  return (
    <>
      {/* Sticky Notes Layer */}
      <AnimatePresence>
        {stickies.map((s) => (
          <StickyNoteCard
            key={s.id}
            sticky={s}
            onUpdate={updateSticky}
            onDelete={deleteSticky}
          />
        ))}
      </AnimatePresence>

      {/* FAB — Create new sticky */}
      <motion.button
        onClick={() => addSticky()}
        className="fixed bottom-20 md:bottom-6 right-4 z-[80] w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-lg flex items-center justify-center group"
        style={{
          boxShadow: '0 4px 0 rgba(217,119,6,0.4), 0 8px 20px rgba(245,158,11,0.25)',
        }}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.9, y: 2, boxShadow: '0 1px 0 rgba(217,119,6,0.4)' }}
        title="Add sticky note"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 1 }}
      >
        <HiPlus size={22} />
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--foreground)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
          📌 Quick Note
        </span>
      </motion.button>

      {/* Sticky counter badge */}
      {stickies.length > 0 && (
        <motion.div
          className="fixed bottom-20 md:bottom-6 right-4 z-[81] pointer-events-none"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <div className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
            {stickies.length}
          </div>
        </motion.div>
      )}
    </>
  );
}
