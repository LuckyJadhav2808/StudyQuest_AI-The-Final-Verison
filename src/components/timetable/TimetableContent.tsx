'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiTrash, HiPencil, HiX, HiClock, HiLocationMarker, HiCog } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useTimetable } from '@/hooks/useTimetable';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';
import { TimetableBlock } from '@/types';

const DAYS = [
  { id: 'mon' as const, label: 'Mon', full: 'Monday' },
  { id: 'tue' as const, label: 'Tue', full: 'Tuesday' },
  { id: 'wed' as const, label: 'Wed', full: 'Wednesday' },
  { id: 'thu' as const, label: 'Thu', full: 'Thursday' },
  { id: 'fri' as const, label: 'Fri', full: 'Friday' },
  { id: 'sat' as const, label: 'Sat', full: 'Saturday' },
  { id: 'sun' as const, label: 'Sun', full: 'Sunday' },
];

// Default hours - will be overridden by user settings
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;

const BLOCK_COLORS = [
  '#7C3AED', '#EC4899', '#10B981', '#FF6B6B', '#FFD166',
  '#4CC9F0', '#FF85A1', '#B5E48C', '#06D6A0', '#A78BFA',
];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export default function TimetableContent() {
  const { blocks, loading, addBlock, updateBlock, deleteBlock } = useTimetable();
  const [showModal, setShowModal] = useState(false);
  const [editBlock, setEditBlock] = useState<TimetableBlock | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [startHour, setStartHour] = useState(DEFAULT_START_HOUR);
  const [endHour, setEndHour] = useState(DEFAULT_END_HOUR);
  const settingsRef = useRef<HTMLDivElement>(null);

  const HOURS = useMemo(() => Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour), [startHour, endHour]);

  // Close settings on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    if (showSettings) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  // Form state
  const [subject, setSubject] = useState('');
  const [day, setDay] = useState<TimetableBlock['day']>('mon');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState(BLOCK_COLORS[0]);

  const todayIndex = new Date().getDay();
  const todayId = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][todayIndex];

  const openCreate = (dayId?: TimetableBlock['day'], hour?: number) => {
    setEditBlock(null);
    setSubject('');
    setDay(dayId || 'mon');
    setStartTime(hour !== undefined ? `${hour.toString().padStart(2, '0')}:00` : '09:00');
    setEndTime(hour !== undefined ? `${(hour + 1).toString().padStart(2, '0')}:00` : '10:00');
    setLocation('');
    setColor(BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)]);
    setShowModal(true);
  };

  const openEdit = (block: TimetableBlock) => {
    setEditBlock(block);
    setSubject(block.subject);
    setDay(block.day);
    setStartTime(block.startTime);
    setEndTime(block.endTime);
    setLocation(block.location);
    setColor(block.color);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    const data = {
      subject: subject.trim(),
      day,
      startTime,
      endTime,
      location: location.trim(),
      color,
    };

    if (editBlock) {
      await updateBlock(editBlock.id, data);
      toast.success('Block updated! 📅');
    } else {
      await addBlock(data);
      toast.success('Block added! 📅');
    }
    setShowModal(false);
  };

  // Group blocks by day
  const blocksByDay = useMemo(() => {
    const map: Record<string, TimetableBlock[]> = {};
    DAYS.forEach((d) => { map[d.id] = []; });
    blocks.forEach((b) => {
      if (map[b.day]) map[b.day].push(b);
    });
    return map;
  }, [blocks]);

  // Today's schedule
  const todayBlocks = blocksByDay[todayId] || [];
  const sortedToday = [...todayBlocks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Timetable</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Your weekly study schedule. Plan your quests.</p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Time range settings */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2.5 rounded-xl border-2 transition-colors ${showSettings ? 'border-primary bg-primary/10' : 'border-[var(--card-border)] hover:border-primary/30'}`}
              >
                <HiCog size={18} />
              </button>
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    className="absolute right-0 top-12 w-64 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-xl z-50 overflow-hidden"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  >
                    <div className="px-4 py-3 border-b-2 border-[var(--card-border)]">
                      <p className="text-xs font-heading font-bold">⚙️ Time Range</p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold">Day starts at</label>
                        <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} className="px-2 py-1 rounded-lg border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-bold focus:border-primary focus:outline-none">
                          {Array.from({ length: 12 }, (_, i) => i + 5).map((h) => (
                            <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold">Day ends at</label>
                        <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))} className="px-2 py-1 rounded-lg border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-bold focus:border-primary focus:outline-none">
                          {Array.from({ length: 12 }, (_, i) => i + 12).map((h) => (
                            <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button variant="primary" size="sm" icon={<HiPlus />} onClick={() => openCreate()}>Add Block</Button>
          </div>
        </div>

        {/* Today's Schedule Quick View */}
        {sortedToday.length > 0 && (
          <Card padding="md" hover={false}>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="primary" size="sm" dot>Today</Badge>
              <span className="text-xs font-bold text-[var(--muted-foreground)]">
                {DAYS.find((d) => d.id === todayId)?.full}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sortedToday.map((block) => (
                <motion.div
                  key={block.id}
                  className="flex-shrink-0 px-4 py-2.5 rounded-xl border-2 border-[var(--card-border)] flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"
                  style={{ borderLeftWidth: '4px', borderLeftColor: block.color }}
                  whileHover={{ y: -2 }}
                  onClick={() => openEdit(block)}
                >
                  <div>
                    <p className="text-xs font-heading font-bold">{block.subject}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      {block.startTime} – {block.endTime}
                      {block.location && ` · ${block.location}`}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Weekly Grid */}
        <Card padding="none" hover={false} className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b-2 border-[var(--card-border)]">
              <div className="p-3 text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">
                Time
              </div>
              {DAYS.map((d) => (
                <div
                  key={d.id}
                  className={`p-3 text-center text-xs font-heading font-bold ${
                    d.id === todayId ? 'bg-primary/10 text-primary' : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  <span className="hidden md:inline">{d.full}</span>
                  <span className="md:hidden">{d.label}</span>
                  {d.id === todayId && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />
                  )}
                </div>
              ))}
            </div>

            {/* Time rows */}
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-[var(--card-border)]/50">
                {/* Time label */}
                <div className="p-2 text-[10px] font-mono font-bold text-[var(--muted-foreground)] border-r border-[var(--card-border)]/50">
                  {hour.toString().padStart(2, '0')}:00
                </div>

                {/* Day cells */}
                {DAYS.map((d) => {
                  const cellBlocks = blocksByDay[d.id].filter((b) => {
                    const start = timeToMinutes(b.startTime);
                    const hStart = hour * 60;
                    return start >= hStart && start < hStart + 60;
                  });

                  return (
                    <div
                      key={d.id}
                      className={`relative min-h-[60px] border-r border-[var(--card-border)]/30 cursor-pointer hover:bg-primary/5 transition-colors ${
                        d.id === todayId ? 'bg-primary/[0.02]' : ''
                      }`}
                      onClick={() => openCreate(d.id, hour)}
                    >
                      {cellBlocks.map((block) => {
                        const startMin = timeToMinutes(block.startTime);
                        const endMin = timeToMinutes(block.endTime);
                        const durationHours = (endMin - startMin) / 60;
                        const offsetMin = startMin - hour * 60;

                        return (
                          <motion.div
                            key={block.id}
                            className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 text-white overflow-hidden cursor-pointer z-10"
                            style={{
                              backgroundColor: block.color,
                              top: `${(offsetMin / 60) * 100}%`,
                              height: `${Math.max(durationHours * 100, 50)}%`,
                              minHeight: '28px',
                            }}
                            whileHover={{ scale: 1.02, zIndex: 20 }}
                            onClick={(e) => { e.stopPropagation(); openEdit(block); }}
                          >
                            <p className="text-[9px] font-bold truncate leading-tight">{block.subject}</p>
                            <p className="text-[8px] opacity-80 truncate">{block.startTime}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editBlock ? 'Edit Block' : 'Add Block'}
        >
          <div className="space-y-4">
            <Input
              label="Subject"
              placeholder="e.g. Advanced Physics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />

            {/* Day selector */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Day</label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDay(d.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                      day === d.id
                        ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]'
                        : 'border-[var(--card-border)] hover:border-primary/30'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] font-heading font-bold text-sm focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] font-heading font-bold text-sm focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <Input
              label="Location (optional)"
              placeholder="e.g. Room 204"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              icon={<HiLocationMarker size={16} />}
            />

            {/* Color picker */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {BLOCK_COLORS.map((c) => (
                  <motion.button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === c ? 'border-[var(--foreground)] scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editBlock && (
                <Button
                  variant="coral"
                  size="sm"
                  onClick={() => { setConfirmDelete(editBlock.id); setShowModal(false); }}
                >
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>
                {editBlock ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirm */}
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Block">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">Remove this block from your timetable?</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
            <Button
              variant="coral"
              onClick={async () => {
                if (confirmDelete) await deleteBlock(confirmDelete);
                setConfirmDelete(null);
                toast.success('Block deleted');
              }}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
