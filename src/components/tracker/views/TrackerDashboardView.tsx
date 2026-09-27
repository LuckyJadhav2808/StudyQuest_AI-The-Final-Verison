'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  HiClock, HiCheckCircle, HiLightningBolt, HiAcademicCap,
  HiFire, HiTrendingUp, HiSparkles, HiCalendar,
  HiClipboardList, HiChevronRight, HiStar,
} from 'react-icons/hi';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { TrackerKPIs, SyllabusTrack } from '@/types';

interface TrackerDashboardViewProps {
  kpis: TrackerKPIs;
  trackTitle: string;
  activeTrack: SyllabusTrack | null;
  onTabChange: (tab: 'dashboard' | 'log' | 'syllabus' | 'tests') => void;
  onOpenSettings: () => void;
}

export default function TrackerDashboardView({
  kpis,
  trackTitle,
  activeTrack,
  onTabChange,
  onOpenSettings,
}: TrackerDashboardViewProps) {
  // Companion dynamic reaction
  const getCompanionReaction = () => {
    if (kpis.overallCompletionPct >= 80) {
      return {
        mood: '🌟 Elite Master',
        quote: 'Outstanding mastery! Your velocity is unstoppable—keep this momentum through test day!',
        color: 'from-amber-500/20 via-primary/20 to-purple-500/10',
        borderColor: 'border-amber-500/30',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }
    if (kpis.overallCompletionPct >= 40) {
      return {
        mood: '🔥 Prime Momentum',
        quote: 'Halfway through the peak! Consistent 4-slot execution will lock in top percentiles.',
        color: 'from-primary/20 via-sky-500/10 to-indigo-950/30',
        borderColor: 'border-primary/40',
        badgeColor: 'bg-primary/20 text-primary border-primary/40',
      };
    }
    if (kpis.keyStats.totalStudyHours > 0) {
      return {
        mood: '⚡ In The Zone',
        quote: 'Great discipline logging your sessions! Focus on PYQ practice and spaced repetition.',
        color: 'from-blue-600/15 via-purple-600/10 to-slate-900',
        borderColor: 'border-blue-500/30',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      };
    }
    return {
      mood: '🚀 Ready to Begin',
      quote: 'Welcome to your Command Center! Start by logging your first daily study slot or test score.',
      color: 'from-indigo-600/15 via-slate-900 to-slate-950',
      borderColor: 'border-indigo-500/30',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    };
  };

  const companion = getCompanionReaction();

  return (
    <div className="space-y-6">
      {/* 1. Hero Companion & Prep Window Banner */}
      <Card
        hover={false}
        className={`relative overflow-hidden border-2 ${companion.borderColor} bg-gradient-to-br ${companion.color} p-5 sm:p-6 shadow-xl`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Companion Reaction */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-600/20 border-2 border-primary/40 flex items-center justify-center flex-shrink-0 shadow-lg text-3xl sm:text-4xl select-none">
              🐾
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-[10px] text-white font-bold">
                ✓
              </span>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${companion.badgeColor}`}>
                  {companion.mood}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  Prep Window: <span className="text-white font-semibold">{kpis.keyStats.daysElapsed}d elapsed</span> ·{' '}
                  <span className="text-amber-400 font-semibold">{kpis.keyStats.daysRemaining}d left</span>
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-heading font-black text-white">
                &ldquo;{companion.quote}&rdquo;
              </h2>
              <p className="text-xs text-slate-400 line-clamp-1">
                Active Track: <span className="text-sky-300 font-semibold">{trackTitle}</span> · Readiness Score:{' '}
                <span className="text-emerald-400 font-bold">{kpis.weightedReadinessScore}%</span>
              </p>
            </div>
          </div>

          {/* Right: Quick Action Hub */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap self-stretch sm:self-auto justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={<HiCalendar size={14} />}
              onClick={() => onTabChange('log')}
              className="flex-1 sm:flex-none whitespace-nowrap shadow-md shadow-primary/20"
            >
              Log Today&apos;s Study
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<HiClipboardList size={14} />}
              onClick={() => onTabChange('tests')}
              className="flex-1 sm:flex-none whitespace-nowrap"
            >
              Test Log
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Key Stats 6-Card Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* Metric 1: Total Study Hours */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Hours</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <HiClock size={15} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-heading font-black text-white">{kpis.keyStats.totalStudyHours}</span>
              <span className="text-[11px] text-primary font-bold">hrs</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] font-semibold mt-0.5">
              Avg {kpis.keyStats.avgHoursPerDay}h / day
            </p>
          </div>
        </div>

        {/* Metric 2: Best Day & Consistency */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-amber-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Best Day</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HiFire size={15} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-heading font-black text-white">{kpis.keyStats.bestDayHours}</span>
              <span className="text-[11px] text-amber-400 font-bold">hrs</span>
            </div>
            <p className="text-[10px] text-amber-400/90 font-semibold mt-0.5">
              {kpis.keyStats.daysWith5PlusHours} days with 5+ hrs
            </p>
          </div>
        </div>

        {/* Metric 3: Topics Mastered */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Topics Done</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <HiCheckCircle size={15} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-heading font-black text-white">{kpis.keyStats.topicsDoneOrRevised}</span>
              <span className="text-[11px] text-[var(--muted-foreground)] font-semibold">/ {kpis.totalTopics}</span>
            </div>
            <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
              {kpis.overallCompletionPct}% mastered
            </p>
          </div>
        </div>

        {/* Metric 4: DPP Done % */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-sky-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">DPP Done</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <HiLightningBolt size={15} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-heading font-black text-white">{kpis.slotStats.dppDonePct}%</span>
            </div>
            <p className="text-[10px] text-sky-400 font-semibold mt-0.5">
              Avg focus: {kpis.slotStats.avgFocusScore}/5 ★
            </p>
          </div>
        </div>

        {/* Metric 5: Test Average */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-purple-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Test Avg</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <HiTrendingUp size={15} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-heading font-black text-white">{kpis.testStats.overallAvgPct}%</span>
            </div>
            <p className="text-[10px] text-purple-300 font-semibold mt-0.5">
              {kpis.testStats.totalTests} tests recorded
            </p>
          </div>
        </div>

        {/* Metric 6: Confidence & Weak Topics */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-pink-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Confidence</span>
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <HiStar size={15} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-heading font-black text-white">{kpis.averageConfidence > 0 ? kpis.averageConfidence : '0.0'}</span>
              <span className="text-[11px] text-pink-400 font-bold">/ 5</span>
            </div>
            <p className="text-[10px] text-pink-400/90 font-semibold mt-0.5">
              {kpis.weakTopicsCount} review alerts
            </p>
          </div>
        </div>
      </div>

      {/* 3. Syllabus Burn-Down & Velocity Predictor */}
      <Card hover={false} className="border-2 border-primary/25 bg-gradient-to-r from-slate-950 via-[#0B0F19] to-purple-950/20 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                <HiTrendingUp className="mr-1" /> Dynamic Burn-down Velocity
              </Badge>
              <span className="text-xs text-[var(--muted-foreground)]">Target: {kpis.burnDown.totalSyllabusHours} hrs</span>
            </div>

            <h3 className="text-lg sm:text-xl font-heading font-black text-white">
              {kpis.burnDown.completedHours}h Done ·{' '}
              <span className="text-amber-400">{kpis.burnDown.remainingHours}h Remaining</span>{' '}
              <span className="text-xs font-normal text-slate-400">({kpis.burnDown.remainingPct}%)</span>
            </h3>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800/90 h-3 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 via-primary to-sky-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, 100 - kpis.burnDown.remainingPct)}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Velocity & Projected Date Pill Box */}
          <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex-shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">7-Day Rolling Velocity</span>
              <span className="text-lg font-heading font-black text-emerald-400">
                {kpis.burnDown.rolling7DayDailyAvg} hrs / day
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Projected Finish</span>
              <span className="text-sm font-heading font-bold text-sky-300">
                {kpis.burnDown.projectedCompletionDate}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Priority Revision Radar (Spaced Repetition) */}
      {kpis.priorityRevisionQueue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
              Spaced Repetition Priority Revision Radar ({kpis.priorityRevisionQueue.length})
            </h3>
            <button
              onClick={() => onTabChange('syllabus')}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              <span>View Full Syllabus</span>
              <HiChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.priorityRevisionQueue.map((item) => (
              <div
                key={item.topicId}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-pink-500/20 hover:border-pink-500/40 transition-all space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 truncate flex items-center gap-1">
                      <span>{item.subjectIcon}</span>
                      <span>{item.subjectName}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30 whitespace-nowrap">
                      {item.reason}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                    {item.topicTitle}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-xs ${
                          star <= item.confidence ? 'text-amber-400' : 'text-slate-700'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => onTabChange('syllabus')}
                    className="text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Review →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Two-Column Grid: Slot & DPP Completion + Habits Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Study Slot Breakdown */}
        <Card hover={false} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <HiClock className="text-primary" /> Daily Slot & DPP Completion
            </h3>
            <span className="text-xs text-[var(--muted-foreground)]">4-Slot Framework</span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Slot 1: 8:00 AM – 10:00 AM (Deep Work)', pct: kpis.slotStats.slot1Pct, color: 'bg-primary' },
              { label: 'Slot 2: 10:30 AM – 12:30 PM (Problem Solving)', pct: kpis.slotStats.slot2Pct, color: 'bg-sky-500' },
              { label: 'Slot 3: 1:30 PM – 3:30 PM (Systems & Coding)', pct: kpis.slotStats.slot3Pct, color: 'bg-indigo-500' },
              { label: 'Revision Slot: 4:00 PM – 5:30 PM (Flashcards & PYQs)', pct: kpis.slotStats.slot4Pct, color: 'bg-purple-500' },
            ].map((slot, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">{slot.label}</span>
                  <span className="font-bold text-white">{slot.pct}%</span>
                </div>
                <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${slot.color} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${slot.pct}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            ))}

            {/* DPP Done summary */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-[var(--muted-foreground)]">Daily Practice Problem (DPP) Rate:</span>
              <span className="font-bold text-emerald-400">{kpis.slotStats.dppDonePct}% completed</span>
            </div>
          </div>
        </Card>

        {/* Right: Dynamic Habits Tracker */}
        <Card hover={false} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <span>💪</span> High-Performance Daily Habits
            </h3>
            <button
              onClick={onOpenSettings}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Manage Habits
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(kpis.habitStats).map(([hId, habit]) => (
              <div
                key={hId}
                className="p-3 rounded-xl bg-slate-900/60 border border-[var(--card-border)] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5 truncate">
                    <span>{habit.icon}</span>
                    <span className="truncate">{habit.name}</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {habit.completionPct}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${habit.completionPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--muted-foreground)] block">
                  {habit.daysCompleted} days recorded
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 6. Hours-per-Subject Chart */}
      {kpis.subjectHoursBreakdown.length > 0 && (
        <Card hover={false} className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-heading font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <HiAcademicCap className="text-primary" /> Hours Per Subject (Actual vs Ideal Curriculum Target)
            </h3>
            <span className="text-xs text-[var(--muted-foreground)]">Based on syllabus weightage</span>
          </div>

          <div className="space-y-3.5 pt-2">
            {kpis.subjectHoursBreakdown.map((item) => {
              const maxScale = Math.max(item.idealHours, item.actualHours, 1);
              const actualWidth = Math.min(100, Math.round((item.actualHours / maxScale) * 100));
              const idealWidth = Math.min(100, Math.round((item.idealHours / maxScale) * 100));

              return (
                <div key={item.subjectId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span>{item.icon}</span>
                      <span>{item.subjectName}</span>
                      {item.subjectCode && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">({item.subjectCode})</span>
                      )}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      <span className="text-primary">{item.actualHours}h</span> / {item.idealHours}h ideal
                    </span>
                  </div>

                  {/* Dual Bar (Actual in Accent, Ideal ghost outline) */}
                  <div className="relative w-full bg-slate-800/60 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 rounded-full opacity-30 border-r-2 border-white/40 bg-slate-600"
                      style={{ width: `${idealWidth}%` }}
                    />
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color || '#7C3AED' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${actualWidth}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 7. Weekly ISO Hours Table (52.5h Target) */}
      <Card hover={false} className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <HiCalendar className="text-primary" /> Weekly Study Hours Table (Ideal: 52.5 hrs/week)
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Tracks actual weekly output against the 7.5 hrs/day standard.
            </p>
          </div>
          <button
            onClick={() => onTabChange('log')}
            className="text-xs text-primary hover:underline font-semibold"
          >
            Add Daily Log Entry →
          </button>
        </div>

        {kpis.weeklyHours.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">ISO Week</th>
                  <th className="py-2.5 px-3">Date Range</th>
                  <th className="py-2.5 px-3">Actual Hours</th>
                  <th className="py-2.5 px-3">Ideal Hours</th>
                  <th className="py-2.5 px-3">Gap %</th>
                  <th className="py-2.5 px-3">Daily Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {kpis.weeklyHours.map((w) => (
                  <tr key={w.weekNumber} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white">Week {w.weekNumber}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                      {w.startDate} → {w.endDate}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-primary">{w.actualHours}h</td>
                    <td className="py-2.5 px-3 text-slate-400">{w.idealHours}h</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          w.gapPct >= 0
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {w.gapPct >= 0 ? `+${w.gapPct}%` : `${w.gapPct}%`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-300">{w.dailyAvg}h/day</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-[var(--muted-foreground)]">
            No study sessions logged yet. Log daily entries to start populating your weekly pacing table!
          </div>
        )}
      </Card>
    </div>
  );
}
