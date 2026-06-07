'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { HiViewGrid, HiRefresh } from 'react-icons/hi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const DEFAULT_ORDER = [
  'welcome',
  'daily-quests',
  'stat-cards',
  'music-player',
  'heatmap',
  'motivation',
  'exam-countdown',
  'quick-actions',
  'bottom-grid',
];

// Auto-reset localStorage when widget IDs change
const LAYOUT_VERSION = DEFAULT_ORDER.join(',');

function getStoredOrder(): string[] {
  if (typeof window === 'undefined') return DEFAULT_ORDER;
  try {
    const storedVersion = localStorage.getItem('sq-dashboard-version');
    if (storedVersion !== LAYOUT_VERSION) {
      // Widget IDs changed — clear stale layout
      localStorage.removeItem('sq-dashboard-order');
      localStorage.setItem('sq-dashboard-version', LAYOUT_VERSION);
      return DEFAULT_ORDER;
    }
    const stored = localStorage.getItem('sq-dashboard-order');
    if (stored) {
      const parsed = JSON.parse(stored);
      const missing = DEFAULT_ORDER.filter((id) => !parsed.includes(id));
      return [...parsed.filter((id: string) => DEFAULT_ORDER.includes(id)), ...missing];
    }
  } catch { /* ignore */ }
  return DEFAULT_ORDER;
}

interface DraggableDashboardProps {
  widgetMap: Record<string, React.ReactNode>;
}

export default function DraggableDashboard({ widgetMap }: DraggableDashboardProps) {
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    setOrder(getStoredOrder());
  }, []);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const newOrder = [...order];
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrder(newOrder);
    localStorage.setItem('sq-dashboard-order', JSON.stringify(newOrder));
  }, [order]);

  const resetLayout = () => {
    setOrder(DEFAULT_ORDER);
    localStorage.removeItem('sq-dashboard-order');
    toast.success('Dashboard layout reset! 🔄');
  };

  return (
    <div className="space-y-3">
      {/* Edit mode toggle */}
      <div className="flex items-center justify-end gap-2">
        <motion.button
          onClick={() => setEditMode(!editMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border-2 transition-all ${
            editMode
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-primary/30'
          }`}
          whileTap={{ scale: 0.95 }}
        >
          <HiViewGrid size={14} />
          {editMode ? 'Done' : 'Customize'}
        </motion.button>
        {editMode && (
          <motion.button
            onClick={resetLayout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border-2 border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-coral/30 hover:text-coral transition-all"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
          >
            <HiRefresh size={14} />
            Reset
          </motion.button>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-4"
            >
              {order.map((widgetId, index) => {
                const widget = widgetMap[widgetId];
                if (!widget) return null;

                return (
                  <Draggable
                    key={widgetId}
                    draggableId={widgetId}
                    index={index}
                    isDragDisabled={!editMode}
                  >
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`transition-shadow duration-200 rounded-2xl ${
                          snapshot.isDragging
                            ? 'shadow-2xl shadow-primary/20 ring-2 ring-primary/30'
                            : ''
                        } ${editMode ? 'relative' : ''}`}
                      >
                        {/* Drag handle — only in edit mode */}
                        {editMode && (
                          <div
                            {...dragProvided.dragHandleProps}
                            className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-0.5 p-1.5 rounded-lg bg-primary/10 border border-primary/20 cursor-grab active:cursor-grabbing opacity-70 hover:opacity-100 transition-opacity"
                          >
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            <div className="w-1 h-1 rounded-full bg-primary" />
                          </div>
                        )}
                        <div {...(editMode ? {} : dragProvided.dragHandleProps)}>
                          {widget}
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
