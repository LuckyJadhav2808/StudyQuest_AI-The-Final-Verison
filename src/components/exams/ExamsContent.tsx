'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiTrash, HiCalendar, HiClock, HiAcademicCap,
  HiChevronRight, HiCheck, HiFire,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useExams } from '@/hooks/useExams';
import { useGamification } from '@/hooks/useGamification';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';
import { XP_AWARDS } from '@/lib/constants';

const EXAM_EMOJIS = ['📝', '📚', '🧪', '🧬', '📐', '🔬', '💻', '📊', '🌍', '🎨', '🎵', '⚡', '🧮', '📖'];
const EXAM_COLORS = ['#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#6366F1', '#14B8A6'];

function getTimeRemaining(targetDate: number) {
  const now = Date.now();
  const diff = targetDate - now;

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

function getUrgencyClass(days: number): { border: string; bg: string; text: string; label: string } {
  if (days <= 1) return { border: 'border-red-500/50', bg: 'from-red-500/15 to-orange-500/10', text: 'text-red-500', label: 'CRITICAL' };
  if (days <= 3) return { border: 'border-orange-400/50', bg: 'from-orange-400/10 to-amber-400/10', text: 'text-orange-500', label: 'URGENT' };
  if (days <= 7) return { border: 'border-amber-400/50', bg: 'from-amber-400/10 to-yellow-300/10', text: 'text-amber-500', label: 'SOON' };
  if (days <= 30) return { border: 'border-teal/30', bg: 'from-teal/5 to-lime/5', text: 'text-teal', label: 'ON TRACK' };
  return { border: 'border-[var(--card-border)]', bg: 'from-primary/5 to-secondary/5', text: 'text-primary', label: 'PLANNED' };
}

function CountdownUnit({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-[var(--card-border)] flex items-center justify-center bg-gradient-to-br from-[var(--card-bg)] to-[var(--background)]`}
        key={value}
        initial={{ scale: 1.1, rotateX: -20 }}
        animate={{ scale: 1, rotateX: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className={`text-xl sm:text-2xl font-heading font-black ${color}`}>{value.toString().padStart(2, '0')}</span>
      </motion.div>
      <span className="text-[8px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mt-1">{label}</span>
    </div>
  );
}

export default function ExamsContent() {
  const { exams, upcomingExams, pastExams, loading, addExam, deleteExam } = useExams();
  const { awardXP } = useGamification();

  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newEmoji, setNewEmoji] = useState('📝');
  const [newColor, setNewColor] = useState(EXAM_COLORS[0]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Live countdown ticker
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDate) {
      toast.error('Title and date are required');
      return;
    }

    const dateTime = new Date(`${newDate}T${newTime}`).getTime();
    if (dateTime <= Date.now()) {
      toast.error('Exam date must be in the future');
      return;
    }

    await addExam({
      title: newTitle.trim(),
      subject: newSubject.trim() || 'General',
      emoji: newEmoji,
      date: dateTime,
      color: newColor,
    });

    await awardXP(XP_AWARDS.NOTE_CREATED, 'Exam countdown added');
    toast.success('Exam countdown created! +10 XP ⏰');
    setShowNewModal(false);
    setNewTitle('');
    setNewSubject('');
    setNewDate('');
    setNewTime('09:00');
    setNewEmoji('📝');
    setNewColor(EXAM_COLORS[0]);
  };

  const handleDelete = async (id: string) => {
    await deleteExam(id);
    setConfirmDelete(null);
    toast.success('Exam removed');
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black">Exam Countdown</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Track your upcoming exams with live countdowns. Never get caught off guard.</p>
          </div>
          <Button variant="primary" size="sm" icon={<HiPlus />} onClick={() => setShowNewModal(true)}>Add Exam</Button>
        </div>

        {/* No exams state */}
        {upcomingExams.length === 0 && pastExams.length === 0 && !loading && (
          <Card padding="lg" hover={false}>
            <div className="text-center py-12">
              <motion.span className="text-6xl block mb-4" animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>📅</motion.span>
              <h3 className="text-lg font-heading font-bold mb-2">No exams scheduled!</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">Add your upcoming exams to see live countdowns and stay on top of your schedule.</p>
              <Button variant="primary" icon={<HiPlus />} onClick={() => setShowNewModal(true)}>Add Your First Exam</Button>
            </div>
          </Card>
        )}

        {/* Upcoming Exams */}
        {upcomingExams.length > 0 && (
          <div className="space-y-4">
            {upcomingExams.map((exam, i) => {
              const remaining = getTimeRemaining(exam.date);
              const urgency = getUrgencyClass(remaining.days);

              return (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card
                    padding="lg"
                    hover={false}
                    className={`relative overflow-hidden border-2 ${urgency.border}`}
                    gradient={`linear-gradient(135deg, ${exam.color}10, transparent)`}
                  >
                    {/* Urgency badge */}
                    {remaining.days <= 7 && (
                      <motion.div
                        className={`absolute top-3 right-3`}
                        animate={remaining.days <= 1 ? { scale: [1, 1.1, 1] } : undefined}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Badge variant={remaining.days <= 1 ? 'coral' : remaining.days <= 3 ? 'amber' : 'primary'} size="sm">
                          {remaining.days <= 1 ? '🔥' : '⚠️'} {urgency.label}
                        </Badge>
                      </motion.div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {/* Emoji icon */}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                        style={{ background: `${exam.color}20`, border: `2px solid ${exam.color}40` }}
                      >
                        {exam.emoji}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-heading font-bold">{exam.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5 mb-3">
                          <Badge variant="muted" size="sm">{exam.subject}</Badge>
                          <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1">
                            <HiCalendar size={12} />
                            {new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1">
                            <HiClock size={12} />
                            {new Date(exam.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Countdown */}
                        <div className="flex items-center gap-2">
                          <CountdownUnit value={remaining.days} label="Days" color={urgency.text} />
                          <span className={`text-lg font-bold ${urgency.text} mt-[-16px]`}>:</span>
                          <CountdownUnit value={remaining.hours} label="Hours" color={urgency.text} />
                          <span className={`text-lg font-bold ${urgency.text} mt-[-16px]`}>:</span>
                          <CountdownUnit value={remaining.minutes} label="Mins" color={urgency.text} />
                          <span className={`text-lg font-bold ${urgency.text} mt-[-16px]`}>:</span>
                          <CountdownUnit value={remaining.seconds} label="Secs" color={urgency.text} />
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => setConfirmDelete(exam.id)}
                        className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-coral/30 hover:text-coral transition-colors self-start"
                      >
                        <HiTrash size={16} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Past Exams */}
        {pastExams.length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
              ✅ Past Exams <Badge variant="muted" size="sm">{pastExams.length}</Badge>
            </h2>
            <div className="space-y-2">
              {pastExams.map((exam) => (
                <Card key={exam.id} padding="sm" hover={false} className="opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{exam.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-heading font-bold line-through">{exam.title}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{exam.subject} — {new Date(exam.date).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="teal" size="sm"><HiCheck size={10} className="inline mr-0.5" /> Survived</Badge>
                    <button onClick={() => setConfirmDelete(exam.id)} className="p-1.5 rounded-lg hover:bg-coral/10 hover:text-coral transition-colors">
                      <HiTrash size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* New Exam Modal */}
        <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="Add Exam Countdown">
          <div className="space-y-4">
            <Input label="Exam Title" placeholder="e.g. Physics Final Exam" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Input label="Subject" placeholder="e.g. Physics" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} icon={<HiAcademicCap size={16} />} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-medium focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Time</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-medium focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Emoji Picker */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {EXAM_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewEmoji(emoji)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all border-2 ${
                      newEmoji === emoji
                        ? 'bg-primary/10 border-primary scale-110'
                        : 'border-[var(--card-border)] hover:border-primary/30'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Color</label>
              <div className="flex gap-2">
                {EXAM_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${newColor === color ? 'ring-2 ring-offset-2 ring-offset-[var(--card-bg)] scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowNewModal(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleCreate} className="flex-1">Create Countdown</Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirm Modal */}
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove Exam">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">Remove this exam countdown? This can't be undone.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
            <Button variant="coral" onClick={() => confirmDelete && handleDelete(confirmDelete)} className="flex-1">Remove</Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
