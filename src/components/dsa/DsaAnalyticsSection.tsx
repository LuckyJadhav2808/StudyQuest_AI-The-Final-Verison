'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiTrendingUp,
  HiLightningBolt,
  HiAcademicCap,
  HiShieldCheck,
  HiChevronDown,
  HiSparkles,
  HiExclamationCircle,
  HiCheckCircle,
} from 'react-icons/hi';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { TopicProgressStats, PatternProgressStats } from '@/types/dsa';

interface DsaAnalyticsSectionProps {
  stats: {
    totalProblems: number;
    solvedCount: number;
    progressPercent: number;
    easySolved: number;
    easyTotal: number;
    mediumSolved: number;
    mediumTotal: number;
    hardSolved: number;
    hardTotal: number;
    topicStats: TopicProgressStats[];
    patternStats: PatternProgressStats[];
  };
}

export default function DsaAnalyticsSection({ stats }: DsaAnalyticsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'patterns' | 'topics' | 'readiness'>('patterns');

  // Calculate Interview Readiness Score (0 to 100)
  const readinessScore = useMemo(() => {
    if (stats.totalProblems === 0) return 0;
    const easyRatio = stats.easyTotal > 0 ? stats.easySolved / stats.easyTotal : 0;
    const medRatio = stats.mediumTotal > 0 ? stats.mediumSolved / stats.mediumTotal : 0;
    const hardRatio = stats.hardTotal > 0 ? stats.hardSolved / stats.hardTotal : 0;

    // Pattern diversity bonus: how many patterns have at least 1 solved
    const patternsTouched = stats.patternStats.filter((p) => p.solved > 0).length;
    const patternBonus = stats.patternStats.length > 0 ? (patternsTouched / stats.patternStats.length) * 10 : 0;

    const rawScore = easyRatio * 30 + medRatio * 45 + hardRatio * 15 + patternBonus;
    return Math.min(100, Math.round(rawScore));
  }, [stats]);

  // Rank patterns by completion rate
  const rankedPatterns = useMemo(() => {
    return [...stats.patternStats].sort((a, b) => {
      const rateA = a.total > 0 ? a.solved / a.total : 0;
      const rateB = b.total > 0 ? b.solved / b.total : 0;
      return rateB - rateA;
    });
  }, [stats.patternStats]);

  const strongestPatterns = useMemo(() => {
    return rankedPatterns.filter((p) => p.solved > 0).slice(0, 3);
  }, [rankedPatterns]);

  const focusPatterns = useMemo(() => {
    return [...stats.patternStats]
      .sort((a, b) => {
        const rateA = a.total > 0 ? a.solved / a.total : 0;
        const rateB = b.total > 0 ? b.solved / b.total : 0;
        return rateA - rateB;
      })
      .slice(0, 3);
  }, [stats.patternStats]);

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden shadow-sm">
      {/* Analytics Collapsible Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-4 border-b border-[var(--card-border)] bg-gradient-to-r from-purple-500/10 via-primary/5 to-cyan-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <HiTrendingUp className="text-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-heading font-black text-[var(--foreground)]">
                DSA Pattern & Performance Analytics
              </h2>
              <Badge variant="pink" size="sm">
                KPI Hub
              </Badge>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] font-medium">
              Real-time pattern mastery, topic distribution, and interview readiness score.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Readiness Score Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-[var(--muted-foreground)] font-semibold">Readiness:</span>
            <span
              className={`text-sm font-black font-mono ${
                readinessScore >= 70
                  ? 'text-emerald-400'
                  : readinessScore >= 40
                  ? 'text-amber-400'
                  : 'text-purple-400'
              }`}
            >
              {readinessScore}/100
            </span>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
            title={isOpen ? 'Collapse Analytics' : 'Expand Analytics'}
          >
            <HiChevronDown
              className={`text-lg transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Analytics Content Area */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="p-4 sm:p-6 space-y-6"
          >
            {/* Top KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Interview Readiness */}
              <Card className="p-4 bg-slate-900/40 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <HiShieldCheck className="text-emerald-400 text-sm" />
                    Interview Readiness
                  </span>
                  <Badge
                    variant={readinessScore >= 70 ? 'teal' : readinessScore >= 40 ? 'amber' : 'coral'}
                    size="sm"
                  >
                    {readinessScore >= 70 ? 'Interview Ready' : readinessScore >= 40 ? 'Solid Base' : 'Ramping Up'}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-emerald-400">
                    {readinessScore}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ 100 Composite Score</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${readinessScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  Based on pattern diversity, medium-to-hard question ratio, and roadmap progress.
                </p>
              </Card>

              {/* Card 2: Highest Mastered Patterns */}
              <Card className="p-4 bg-slate-900/40 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <HiSparkles className="text-amber-400 text-sm" />
                    Top Strongest Patterns
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">Mastered</span>
                </div>
                {strongestPatterns.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {strongestPatterns.map((p) => {
                      const pct = p.total > 0 ? Math.round((p.solved / p.total) * 100) : 0;
                      return (
                        <div key={p.pattern} className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-200 truncate max-w-[170px]">{p.pattern}</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {p.solved}/{p.total} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 pt-3">
                    Start solving questions to identify your top algorithmic strengths!
                  </div>
                )}
              </Card>

              {/* Card 3: Priority Focus Areas */}
              <Card className="p-4 bg-slate-900/40 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <HiExclamationCircle className="text-purple-400 text-sm" />
                    Recommended Focus
                  </span>
                  <span className="text-[10px] text-purple-400 font-bold font-mono">Next Up</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {focusPatterns.map((p) => {
                    const pct = p.total > 0 ? Math.round((p.solved / p.total) * 100) : 0;
                    return (
                      <div key={p.pattern} className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-200 truncate max-w-[170px]">{p.pattern}</span>
                        <span className="font-mono text-slate-400">
                          {p.solved}/{p.total} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center justify-between gap-4 border-b border-[var(--card-border)] pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('patterns')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'patterns'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-surface-hover'
                  }`}
                >
                  ⚡ All 13 Patterns ({stats.patternStats.length})
                </button>
                <button
                  onClick={() => setActiveTab('topics')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'topics'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-surface-hover'
                  }`}
                >
                  📚 All 12 Data Structures ({stats.topicStats.length})
                </button>
              </div>

              <div className="text-xs text-[var(--muted-foreground)] font-medium hidden sm:block">
                Total Solved: <strong className="text-emerald-400">{stats.solvedCount}</strong> / {stats.totalProblems}
              </div>
            </div>

            {/* Tab 1: Pattern Mastery Matrix */}
            {activeTab === 'patterns' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.patternStats.map((p) => {
                  const pct = p.total > 0 ? Math.round((p.solved / p.total) * 100) : 0;
                  return (
                    <div
                      key={p.pattern}
                      className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-200 truncate pr-2">{p.pattern}</span>
                        <span className="font-mono text-[11px] text-purple-400 font-bold">
                          {p.solved}/{p.total} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Data Structure Topics Matrix */}
            {activeTab === 'topics' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.topicStats.map((t) => {
                  const pct = t.total > 0 ? Math.round((t.solved / t.total) * 100) : 0;
                  return (
                    <div
                      key={t.topic}
                      className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-200 truncate pr-2">{t.topic}</span>
                        <span className="font-mono text-[11px] text-primary font-bold">
                          {t.solved}/{t.total} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
