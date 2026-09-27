'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiX, HiCog, HiCalendar, HiClock, HiPlus, HiTrash,
  HiDownload, HiCheck,
} from 'react-icons/hi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { StudyTrackerSettings, DailyStudyHabit } from '@/types';
import toast from 'react-hot-toast';

interface TrackerSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StudyTrackerSettings;
  onUpdateSettings: (updates: Partial<StudyTrackerSettings>) => void;
  onAddHabit: (name: string, icon?: string) => void;
  onDeleteHabit: (habitId: string) => void;
  onRestoreHabit: (habit: DailyStudyHabit) => void;
  onExportData: (format: 'json' | 'csv') => void;
}

const HABIT_ICONS = ['💪', '🎸', '🎥', '📞', '🌙', '💧', '🧘', '📖', '🏃', '🧠', '🥗', '⚡'];

export default function TrackerSettingsDrawer({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onAddHabit,
  onDeleteHabit,
  onRestoreHabit,
  onExportData,
}: TrackerSettingsDrawerProps) {
  const [mounted, setMounted] = useState<boolean>(false);

  // Local form state
  const [prepStartDate, setPrepStartDate] = useState<string>(settings.prepStartDate || '2026-07-01');
  const [prepEndDate, setPrepEndDate] = useState<string>(settings.prepEndDate || '2027-01-31');
  const [idealWeeklyHours, setIdealWeeklyHours] = useState<number>(settings.idealWeeklyHours || 52.5);
  const [totalSyllabusHours, setTotalSyllabusHours] = useState<number>(settings.totalSyllabusHours || 1158.78);

  // New Habit state
  const [newHabitName, setNewHabitName] = useState<string>('');
  const [newHabitIcon, setNewHabitIcon] = useState<string>('💪');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Sync state if settings change
  useEffect(() => {
    setPrepStartDate(settings.prepStartDate || '2026-07-01');
    setPrepEndDate(settings.prepEndDate || '2027-01-31');
    setIdealWeeklyHours(settings.idealWeeklyHours || 52.5);
    setTotalSyllabusHours(settings.totalSyllabusHours || 1158.78);
  }, [settings]);

  const handleSaveGeneral = () => {
    onUpdateSettings({
      prepStartDate,
      prepEndDate,
      idealWeeklyHours: Number(idealWeeklyHours),
      totalSyllabusHours: Number(totalSyllabusHours),
    });
  };

  const handleAddHabitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    onAddHabit(newHabitName.trim(), newHabitIcon);
    setNewHabitName('');
  };

  const handleDeleteHabitWithUndo = (habit: DailyStudyHabit) => {
    onDeleteHabit(habit.id);
    toast(
      (t) => (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span>Habit &quot;{habit.name}&quot; removed</span>
          <button
            onClick={() => {
              onRestoreHabit(habit);
              toast.dismiss(t.id);
            }}
            className="px-2 py-0.5 rounded bg-primary text-white font-bold hover:bg-primary/80 transition-all text-xs"
          >
            Undo
          </button>
        </div>
      ),
      { duration: 5000 }
    );
  };

  if (!mounted) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm cursor-pointer"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-md bg-[#0F1420] border-l-2 border-[var(--card-border)] h-full overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col justify-between z-10"
          >
            <div className="space-y-6">
              {/* Header with Title & prominent Close Button */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
                    <HiCog size={20} />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-lg text-white">
                      Tracker Settings & Config
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Customize prep dates, target hours & habits
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close settings"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all cursor-pointer flex items-center justify-center"
                >
                  <HiX size={18} />
                </button>
              </div>

              {/* 1. Prep Timeline & Targets */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HiCalendar className="text-primary" /> Prep Window & Goals
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={prepStartDate}
                      onChange={(e) => setPrepStartDate(e.target.value)}
                      onBlur={handleSaveGeneral}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">End / Exam Date</label>
                    <input
                      type="date"
                      value={prepEndDate}
                      onChange={(e) => setPrepEndDate(e.target.value)}
                      onBlur={handleSaveGeneral}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Weekly Target (Hrs)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={idealWeeklyHours}
                      onChange={(e) => setIdealWeeklyHours(Number(e.target.value))}
                      onBlur={handleSaveGeneral}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Total Target (Hrs)</label>
                    <input
                      type="number"
                      step="1"
                      value={totalSyllabusHours}
                      onChange={(e) => setTotalSyllabusHours(Number(e.target.value))}
                      onBlur={handleSaveGeneral}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Habit Management (Dynamic User CRUD) */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💪</span> Manage Daily Habits ({settings.habits.length})
                </h4>

                {/* Add Habit Form */}
                <form onSubmit={handleAddHabitSubmit} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative">
                      <select
                        value={newHabitIcon}
                        onChange={(e) => setNewHabitIcon(e.target.value)}
                        className="h-full px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm outline-none cursor-pointer"
                      >
                        {HABIT_ICONS.map((emoji) => (
                          <option key={emoji} value={emoji}>
                            {emoji}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      placeholder="New habit: e.g. Reading, Meditation..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-primary"
                    />
                    <Button type="submit" variant="primary" size="sm" icon={<HiPlus size={14} />}>
                      Add
                    </Button>
                  </div>
                </form>

                {/* Habit List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {settings.habits.map((habit) => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                    >
                      <span className="flex items-center gap-2 text-white font-semibold">
                        <span>{habit.icon}</span>
                        <span>{habit.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteHabitWithUndo(habit)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove Habit"
                      >
                        <HiTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Data Export & Backup */}
              <div className="space-y-2 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HiDownload className="text-sky-400" /> Data Export & Backup
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onExportData('json')}
                    className="w-full text-xs"
                  >
                    Full JSON Backup
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onExportData('csv')}
                    className="w-full text-xs"
                  >
                    Daily Logs CSV
                  </Button>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-6 border-t border-slate-800 flex justify-end">
              <Button variant="primary" size="sm" onClick={onClose} className="w-full">
                Done
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
