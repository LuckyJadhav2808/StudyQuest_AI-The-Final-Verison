'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  HiCalendar, HiClock, HiCheckCircle, HiStar, HiTrash,
  HiPencilAlt, HiSparkles, HiCheck, HiChevronLeft, HiChevronRight,
  HiOutlineLightningBolt,
} from 'react-icons/hi';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  DailyLogEntry,
  SyllabusTrack,
  StudyTrackerSettings,
  DailyLogSlot,
} from '@/types';
import { getLocalDateString } from '@/lib/dateUtils';
import { format, parseISO, addDays, getISOWeek, differenceInDays } from 'date-fns';

interface TrackerDailyLogViewProps {
  dailyLogs: DailyLogEntry[];
  activeTrack: SyllabusTrack | null;
  settings: StudyTrackerSettings;
  onSaveDailyLog: (log: DailyLogEntry) => void;
  onDeleteDailyLog: (logId: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function TrackerDailyLogView({
  dailyLogs,
  activeTrack,
  settings,
  onSaveDailyLog,
  onDeleteDailyLog,
}: TrackerDailyLogViewProps) {
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Month filter for the spreadsheet table
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

  // Existing log for the currently selected date, if any
  const existingLog = useMemo(() => {
    return dailyLogs.find((l) => l.date === selectedDate);
  }, [dailyLogs, selectedDate]);

  // Form State for the Focus Card
  const [slot1Activity, setSlot1Activity] = useState<string>('');
  const [slot1Hours, setSlot1Hours] = useState<number>(2.0);
  const [slot1Completed, setSlot1Completed] = useState<boolean>(true);

  const [slot2Activity, setSlot2Activity] = useState<string>('');
  const [slot2Hours, setSlot2Hours] = useState<number>(2.0);
  const [slot2Completed, setSlot2Completed] = useState<boolean>(true);

  const [slot3Activity, setSlot3Activity] = useState<string>('');
  const [slot3Hours, setSlot3Hours] = useState<number>(2.0);
  const [slot3Completed, setSlot3Completed] = useState<boolean>(false);

  const [slot4Activity, setSlot4Activity] = useState<string>('');
  const [slot4Hours, setSlot4Hours] = useState<number>(1.5);
  const [slot4Completed, setSlot4Completed] = useState<boolean>(true);

  const [bonusHours, setBonusHours] = useState<number>(0);
  const [dppCompleted, setDppCompleted] = useState<boolean>(true);
  const [dppScore, setDppScore] = useState<number>(8);
  const [dppTotalMarks, setDppTotalMarks] = useState<number>(10);
  const [focusRating, setFocusRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [habitStatus, setHabitStatus] = useState<Record<string, boolean>>({});

  // Sync form when selected date changes or existing log is found
  React.useEffect(() => {
    if (existingLog) {
      const s1 = existingLog.slots?.['slot-1'];
      const s2 = existingLog.slots?.['slot-2'];
      const s3 = existingLog.slots?.['slot-3'];
      const s4 = existingLog.slots?.['slot-4'];

      setSlot1Activity(s1?.activity || '');
      setSlot1Hours(s1?.hours ?? 2.0);
      setSlot1Completed(s1?.completed ?? false);

      setSlot2Activity(s2?.activity || '');
      setSlot2Hours(s2?.hours ?? 2.0);
      setSlot2Completed(s2?.completed ?? false);

      setSlot3Activity(s3?.activity || '');
      setSlot3Hours(s3?.hours ?? 2.0);
      setSlot3Completed(s3?.completed ?? false);

      setSlot4Activity(s4?.activity || '');
      setSlot4Hours(s4?.hours ?? 1.5);
      setSlot4Completed(s4?.completed ?? false);

      setBonusHours(existingLog.bonusHours || 0);
      setDppCompleted(existingLog.dpp?.completed ?? false);
      setDppScore(existingLog.dpp?.score ?? 8);
      setDppTotalMarks(existingLog.dpp?.totalMarks ?? 10);
      setFocusRating(existingLog.focusRating || 5);
      setNotes(existingLog.notes || '');
      setSelectedSubjectId(existingLog.primarySubjectId || '');
      setSelectedTopicId(existingLog.topicIds?.[0] || '');
      setHabitStatus(existingLog.habitStatus || {});
    } else {
      // Defaults for a new entry
      setSlot1Activity('');
      setSlot1Hours(2.0);
      setSlot1Completed(true);

      setSlot2Activity('');
      setSlot2Hours(2.0);
      setSlot2Completed(true);

      setSlot3Activity('');
      setSlot3Hours(2.0);
      setSlot3Completed(false);

      setSlot4Activity('');
      setSlot4Hours(1.5);
      setSlot4Completed(true);

      setBonusHours(0);
      setDppCompleted(true);
      setDppScore(8);
      setDppTotalMarks(10);
      setFocusRating(5);
      setNotes('');
      setSelectedSubjectId(activeTrack?.subjects[0]?.id || '');
      setSelectedTopicId('');

      // Initialize all habits to false
      const initialHabits: Record<string, boolean> = {};
      settings.habits.forEach((h) => {
        initialHabits[h.id] = false;
      });
      setHabitStatus(initialHabits);
    }
  }, [selectedDate, existingLog, activeTrack, settings.habits]);

  // Derived metadata for selected date
  const dateMeta = useMemo(() => {
    try {
      const parsed = parseISO(selectedDate);
      const prepStart = parseISO(settings.prepStartDate || '2026-07-01');
      const dayNum = Math.max(1, differenceInDays(parsed, prepStart) + 1);
      const isoWk = getISOWeek(parsed);
      const monthStr = MONTHS[parsed.getMonth()];
      const weekdayStr = WEEKDAYS[parsed.getDay()];
      return { dayNum, isoWk, monthStr, weekdayStr };
    } catch {
      return { dayNum: 1, isoWk: 1, monthStr: 'Jul', weekdayStr: 'Mon' };
    }
  }, [selectedDate, settings.prepStartDate]);

  // Computed total study hours for the card
  const calculatedTotalHours = useMemo(() => {
    const s1 = slot1Completed ? Number(slot1Hours || 0) : 0;
    const s2 = slot2Completed ? Number(slot2Hours || 0) : 0;
    const s3 = slot3Completed ? Number(slot3Hours || 0) : 0;
    const s4 = slot4Completed ? Number(slot4Hours || 0) : 0;
    return Number((s1 + s2 + s3 + s4 + Number(bonusHours || 0)).toFixed(1));
  }, [slot1Completed, slot1Hours, slot2Completed, slot2Hours, slot3Completed, slot3Hours, slot4Completed, slot4Hours, bonusHours]);

  // Topic options for selected subject
  const currentSubjectTopics = useMemo(() => {
    if (!activeTrack) return [];
    if (!selectedSubjectId) {
      return activeTrack.subjects.flatMap((s) => s.units.flatMap((u) => u.topics));
    }
    const foundSub = activeTrack.subjects.find((s) => s.id === selectedSubjectId);
    return foundSub ? foundSub.units.flatMap((u) => u.topics) : [];
  }, [activeTrack, selectedSubjectId]);

  // Handle Save
  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const slotsMap: Record<string, DailyLogSlot> = {
      'slot-1': { activity: slot1Activity, hours: Number(slot1Hours), completed: slot1Completed },
      'slot-2': { activity: slot2Activity, hours: Number(slot2Hours), completed: slot2Completed },
      'slot-3': { activity: slot3Activity, hours: Number(slot3Hours), completed: slot3Completed },
      'slot-4': { activity: slot4Activity, hours: Number(slot4Hours), completed: slot4Completed },
    };

    const entry: DailyLogEntry = {
      id: existingLog?.id || `log-${selectedDate}`,
      trackId: activeTrack?.id || '',
      date: selectedDate,
      dayNumber: dateMeta.dayNum,
      month: dateMeta.monthStr,
      isoWeek: dateMeta.isoWk,
      weekday: dateMeta.weekdayStr,
      slots: slotsMap,
      bonusHours: Number(bonusHours || 0),
      totalHours: calculatedTotalHours,
      primarySubjectId: selectedSubjectId || undefined,
      subjectIds: selectedSubjectId ? [selectedSubjectId] : [],
      topicIds: selectedTopicId ? [selectedTopicId] : [],
      dpp: {
        completed: dppCompleted,
        score: dppCompleted ? Number(dppScore) : undefined,
        totalMarks: dppCompleted ? Number(dppTotalMarks) : undefined,
      },
      habitStatus,
      focusRating,
      notes: notes.trim() || undefined,
      updatedAt: Date.now(),
    };

    onSaveDailyLog(entry);
  };

  // Filtered logs for the matrix spreadsheet
  const filteredLogs = useMemo(() => {
    if (selectedMonthFilter === 'all') return dailyLogs;
    return dailyLogs.filter((l) => l.month.toLowerCase() === selectedMonthFilter.toLowerCase());
  }, [dailyLogs, selectedMonthFilter]);

  // Date step helper (-1 day, +1 day)
  const stepDate = (offset: number) => {
    try {
      const current = parseISO(selectedDate);
      const next = addDays(current, offset);
      setSelectedDate(format(next, 'yyyy-MM-dd'));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-8">
      {/* 1. Today Focus Card (Active Data Entry) */}
      <Card hover={false} className="border-2 border-primary/30 p-5 sm:p-6 bg-gradient-to-br from-[var(--card-bg)] via-[#0C101B] to-slate-900 shadow-xl">
        <form onSubmit={handleSaveSubmit} className="space-y-6">
          {/* Card Header & Date Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="sm">
                  <HiClock className="mr-1" /> Core Daily Study Matrix
                </Badge>
                {existingLog && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <HiCheck size={12} /> Logged
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-black text-white mt-1">
                Day #{dateMeta.dayNum} · {dateMeta.weekdayStr}, {selectedDate}
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                ISO Week {dateMeta.isoWk} · Target: 7.5 hrs/day
              </p>
            </div>

            {/* Date Picker Controls */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => stepDate(-1)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
                title="Previous Day"
              >
                <HiChevronLeft size={16} />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary"
              />

              <button
                type="button"
                onClick={() => stepDate(1)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
                title="Next Day"
              >
                <HiChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-2 rounded-xl bg-primary/20 text-primary border border-primary/40 text-xs font-bold hover:bg-primary/30 transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          {/* 4-Slot Breakdown Inputs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" /> Study Time-Slots (8:00 AM – 5:30 PM Framework)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Slot 1 */}
              <div className={`p-3.5 rounded-xl border transition-all ${slot1Completed ? 'bg-primary/10 border-primary/30' : 'bg-slate-900/60 border-slate-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">Slot 1: 8:00 AM – 10:00 AM</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-primary">
                    <input
                      type="checkbox"
                      checked={slot1Completed}
                      onChange={(e) => setSlot1Completed(e.target.checked)}
                      className="rounded accent-primary w-4 h-4 cursor-pointer"
                    />
                    <span>Done</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={slot1Activity}
                    onChange={(e) => setSlot1Activity(e.target.value)}
                    placeholder="Activity: e.g. Theory concepts & lecture"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="6"
                    value={slot1Hours}
                    onChange={(e) => setSlot1Hours(Number(e.target.value))}
                    className="w-16 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-center text-white outline-none"
                    title="Hours"
                  />
                </div>
              </div>

              {/* Slot 2 */}
              <div className={`p-3.5 rounded-xl border transition-all ${slot2Completed ? 'bg-sky-500/10 border-sky-500/30' : 'bg-slate-900/60 border-slate-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">Slot 2: 10:30 AM – 12:30 PM</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-sky-400">
                    <input
                      type="checkbox"
                      checked={slot2Completed}
                      onChange={(e) => setSlot2Completed(e.target.checked)}
                      className="rounded accent-sky-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Done</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={slot2Activity}
                    onChange={(e) => setSlot2Activity(e.target.value)}
                    placeholder="Activity: e.g. PYQs & Problem solving"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-sky-400"
                  />
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="6"
                    value={slot2Hours}
                    onChange={(e) => setSlot2Hours(Number(e.target.value))}
                    className="w-16 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-center text-white outline-none"
                    title="Hours"
                  />
                </div>
              </div>

              {/* Slot 3 */}
              <div className={`p-3.5 rounded-xl border transition-all ${slot3Completed ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900/60 border-slate-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">Slot 3: 1:30 PM – 3:30 PM</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-400">
                    <input
                      type="checkbox"
                      checked={slot3Completed}
                      onChange={(e) => setSlot3Completed(e.target.checked)}
                      className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Done</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={slot3Activity}
                    onChange={(e) => setSlot3Activity(e.target.value)}
                    placeholder="Activity: e.g. Systems & implementation"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-indigo-400"
                  />
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="6"
                    value={slot3Hours}
                    onChange={(e) => setSlot3Hours(Number(e.target.value))}
                    className="w-16 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-center text-white outline-none"
                    title="Hours"
                  />
                </div>
              </div>

              {/* Slot 4 */}
              <div className={`p-3.5 rounded-xl border transition-all ${slot4Completed ? 'bg-purple-500/10 border-purple-500/30' : 'bg-slate-900/60 border-slate-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">Revision Slot: 4:00 PM – 5:30 PM</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-purple-400">
                    <input
                      type="checkbox"
                      checked={slot4Completed}
                      onChange={(e) => setSlot4Completed(e.target.checked)}
                      className="rounded accent-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Done</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={slot4Activity}
                    onChange={(e) => setSlot4Activity(e.target.value)}
                    placeholder="Activity: e.g. Spaced recall & formula review"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-400"
                  />
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="6"
                    value={slot4Hours}
                    onChange={(e) => setSlot4Hours(Number(e.target.value))}
                    className="w-16 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-center text-white outline-none"
                    title="Hours"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Relational Foreign Key: Subject & Topic Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Primary Subject Studied (Curriculum Link)
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedTopicId('');
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white outline-none focus:border-primary"
              >
                <option value="">-- Choose Subject --</option>
                {activeTrack?.subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.icon} {sub.name} {sub.code ? `(${sub.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Topic Linked (Auto Updates Readiness)
              </label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white outline-none focus:border-primary"
              >
                <option value="">-- Choose Topic (Optional) --</option>
                {currentSubjectTopics.map((top) => (
                  <option key={top.id} value={top.id}>
                    {top.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DPP & Focus Rating Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            {/* DPP Box */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <HiOutlineLightningBolt className="text-amber-400" /> Daily Practice Problem (DPP)
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-amber-400">
                  <input
                    type="checkbox"
                    checked={dppCompleted}
                    onChange={(e) => setDppCompleted(e.target.checked)}
                    className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Completed</span>
                </label>
              </div>

              {dppCompleted && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Score:</span>
                  <input
                    type="number"
                    value={dppScore}
                    onChange={(e) => setDppScore(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-bold text-center outline-none"
                  />
                  <span className="text-slate-500">/</span>
                  <input
                    type="number"
                    value={dppTotalMarks}
                    onChange={(e) => setDppTotalMarks(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-bold text-center outline-none"
                  />
                  <span className="text-emerald-400 font-bold ml-auto">
                    {dppTotalMarks > 0 ? `${Math.round((dppScore / dppTotalMarks) * 100)}%` : '0%'}
                  </span>
                </div>
              )}
            </div>

            {/* Focus Rating Box */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                <HiStar className="text-amber-400" /> Focus Score Rating (1–5 Scale)
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFocusRating(star)}
                    className={`w-9 h-9 rounded-xl border text-sm flex items-center justify-center font-bold transition-all ${
                      star <= focusRating
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 scale-105'
                        : 'border-slate-800 bg-slate-950 text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    ★
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-300 ml-2">
                  {focusRating === 5
                    ? 'Deep Flow'
                    : focusRating === 4
                    ? 'High Focus'
                    : focusRating === 3
                    ? 'Normal'
                    : focusRating === 2
                    ? 'Distracted'
                    : 'Low Energy'}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Habits Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Daily Habits Checkoff ({settings.habits.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {settings.habits.map((habit) => {
                const isChecked = !!habitStatus[habit.id];
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() =>
                      setHabitStatus((prev) => ({
                        ...prev,
                        [habit.id]: !prev[habit.id],
                      }))
                    }
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isChecked
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{habit.icon}</span>
                    <span>{habit.name}</span>
                    {isChecked && <HiCheck size={12} className="stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes & Reflection Textarea */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Study Reflection & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Mastered CYK algorithm, need to redo question 4 on tomorrow's revision slot..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Live Total Calculation & Save Button Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold">Total Logged Output:</span>
              <span className="text-xl sm:text-2xl font-heading font-black text-primary">
                {calculatedTotalHours} hrs
              </span>
              <span className="text-xs font-bold text-slate-500">
                ({calculatedTotalHours >= 7.5 ? '🎯 Target Hit!' : `${(7.5 - calculatedTotalHours).toFixed(1)}h to 7.5h target`})
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {existingLog && (
                <button
                  type="button"
                  onClick={() => onDeleteDailyLog(existingLog.id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 border border-red-500/30 transition-colors"
                >
                  Delete Log
                </button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={<HiCheckCircle size={16} />}
                className="w-full sm:w-auto shadow-lg shadow-primary/25"
              >
                {existingLog ? 'Update Study Log' : 'Save Today\'s Log (+25 XP)'}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* 2. Full Prep Window Matrix Spreadsheet */}
      <Card hover={false} className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
              <HiCalendar className="text-primary" /> Full Prep Window Matrix (Jul 2026 – Jan 2027)
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Complete historical record of daily hours, slot breakdowns, and habit scores.
            </p>
          </div>

          {/* Month Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] py-1">
            <button
              onClick={() => setSelectedMonthFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedMonthFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            {['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonthFilter(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedMonthFilter.toLowerCase() === m.toLowerCase()
                    ? 'bg-primary text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Matrix Table */}
        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date / Day#</th>
                  <th className="py-2.5 px-3">Slot 1 (8–10)</th>
                  <th className="py-2.5 px-3">Slot 2 (10:30–12:30)</th>
                  <th className="py-2.5 px-3">Slot 3 (1:30–3:30)</th>
                  <th className="py-2.5 px-3">Rev (4–5:30)</th>
                  <th className="py-2.5 px-3">Total Hrs</th>
                  <th className="py-2.5 px-3">DPP</th>
                  <th className="py-2.5 px-3">Focus</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => {
                  const s1 = log.slots?.['slot-1'];
                  const s2 = log.slots?.['slot-2'];
                  const s3 = log.slots?.['slot-3'];
                  const s4 = log.slots?.['slot-4'];

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedDate(log.date)}
                      className={`hover:bg-slate-900/60 cursor-pointer transition-colors ${
                        log.date === selectedDate ? 'bg-primary/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-semibold text-white">
                        <div className="font-bold text-xs">{log.date}</div>
                        <div className="text-[10px] text-slate-400">
                          Day #{log.dayNumber} · {log.weekday} (W{log.isoWeek})
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {s1?.completed ? (
                          <span className="text-emerald-400 font-bold">✓ {s1.hours}h</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {s2?.completed ? (
                          <span className="text-sky-400 font-bold">✓ {s2.hours}h</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {s3?.completed ? (
                          <span className="text-indigo-400 font-bold">✓ {s3.hours}h</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {s4?.completed ? (
                          <span className="text-purple-400 font-bold">✓ {s4.hours}h</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-heading font-black text-sm text-primary">
                        {log.totalHours}h
                      </td>

                      <td className="py-3 px-3">
                        {log.dpp?.completed ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {log.dpp.score !== undefined ? `${log.dpp.score}/${log.dpp.totalMarks || 10}` : 'Done'}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-amber-400 font-bold">
                          {log.focusRating ? `${log.focusRating} ★` : '—'}
                        </span>
                      </td>

                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedDate(log.date)}
                            className="p-1 rounded hover:bg-primary/20 text-primary transition-colors"
                            title="Edit"
                          >
                            <HiPencilAlt size={14} />
                          </button>
                          <button
                            onClick={() => onDeleteDailyLog(log.id)}
                            className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <HiTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-[var(--muted-foreground)]">
            No logs found for this filter. Use the card above to log your study session for today!
          </div>
        )}
      </Card>
    </div>
  );
}
