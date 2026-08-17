'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  HiAcademicCap, HiCheckCircle, HiClock, HiLightningBolt,
  HiBookOpen, HiCollection,
} from 'react-icons/hi';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { TrackerKPIs } from '@/types';

interface TrackerKpiDashboardProps {
  kpis: TrackerKPIs;
  trackTitle: string;
}

export default function TrackerKpiDashboard({ kpis, trackTitle }: TrackerKpiDashboardProps) {
  return (
    <div className="space-y-4">
      {/* 1. Hero Readiness Card */}
      <Card hover={false} className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-[var(--card-bg)] via-[#0B0F19] to-purple-950/20 shadow-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-5 min-w-0 w-full sm:w-auto">
            {/* Radial SVG Gauge */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-800"
                  strokeWidth="9"
                  fill="transparent"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-primary"
                  strokeWidth="9"
                  fill="transparent"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * kpis.overallCompletionPct) / 100}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 251.2 - (251.2 * kpis.overallCompletionPct) / 100 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-lg sm:text-xl font-heading font-black text-white">{kpis.overallCompletionPct}%</span>
                <span className="text-[8px] uppercase tracking-wider font-bold text-sky-400">Score</span>
              </div>
            </div>

            {/* Syllabus Info & Progress Bar */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="sm" className="font-bold">
                  <HiAcademicCap size={12} className="mr-1" /> Syllabus Readiness
                </Badge>
              </div>
              <h2 className="text-base sm:text-lg font-heading font-black text-white truncate" title={trackTitle}>
                {trackTitle}
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                {kpis.completedTopics} of {kpis.totalTopics} topics mastered across {kpis.totalSubjects} subjects
              </p>
              <div className="w-full max-w-lg bg-slate-800/80 h-2.5 rounded-full overflow-hidden mt-1.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 via-primary to-sky-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${kpis.overallCompletionPct}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>
          </div>

        </div>
      </Card>

      {/* 2. Full-Width 4-Card Metric Grid (Zero squishing, generous breathing room) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        
        {/* Metric 1: Topics Mastered */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-[var(--card-border)] hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Mastered</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <HiCheckCircle size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-heading font-black text-white">{kpis.completedTopics}</span>
              <span className="text-xs text-[var(--muted-foreground)] font-semibold">/ {kpis.totalTopics}</span>
            </div>
            <p className="text-[11px] text-emerald-400 font-bold mt-1">
              {kpis.overallCompletionPct}% syllabus complete
            </p>
          </div>
        </div>

        {/* Metric 2: In-Progress Topics */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-[var(--card-border)] hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">In Progress</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HiLightningBolt size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-heading font-black text-white">{kpis.inProgressTopics}</span>
              <span className="text-xs text-[var(--muted-foreground)] font-semibold">topics</span>
            </div>
            <p className="text-[11px] text-amber-400 font-bold mt-1">
              {kpis.inProgressTopics > 0 ? 'Currently studying' : 'Ready to start'}
            </p>
          </div>
        </div>

        {/* Metric 3: Total Subjects */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-[var(--card-border)] hover:border-purple-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Subjects</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <HiBookOpen size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-heading font-black text-white">{kpis.totalSubjects}</span>
              <span className="text-xs text-[var(--muted-foreground)] font-semibold">modules</span>
            </div>
            <p className="text-[11px] text-purple-300 font-bold mt-1">
              Full curriculum
            </p>
          </div>
        </div>

        {/* Metric 4: Est. Hours Remaining */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-[var(--card-border)] hover:border-sky-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Time Left</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <HiClock size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-heading font-black text-white">~{kpis.estimatedHoursLeft}</span>
              <span className="text-xs text-sky-400 font-bold">hrs</span>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
              Estimated study plan
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
