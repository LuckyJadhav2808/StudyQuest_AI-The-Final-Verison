'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HiLightningBolt, HiCheckCircle, HiFire, HiAcademicCap, HiSparkles } from 'react-icons/hi';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { DsaProblem } from '@/types/dsa';

interface DsaHeaderStatsProps {
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
    recommendedNext?: DsaProblem;
  };
  onSelectProblem: (problem: DsaProblem) => void;
}

export default function DsaHeaderStats({
  stats,
  onSelectProblem,
}: DsaHeaderStatsProps) {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-purple-500/5 to-cyan-500/10 border border-primary/20 p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">⚔️</span>
          <h1 className="text-2xl font-heading font-black tracking-tight text-[var(--foreground)]">
            DSA Dungeon & Strategy Roadmap
          </h1>
          <Badge variant="primary" size="sm">LeetCode & Striver A2Z</Badge>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Master Data Structures & Algorithmic Patterns with interactive test cases, multi-approach solutions, and AI hint tutor.
        </p>
      </div>

      {/* Grid of Key Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Progress Card */}
        <Card className="p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Total Mastery
            </span>
            <HiCheckCircle className="text-emerald-400 text-xl" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-emerald-400">
              {stats.solvedCount}
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">
              / {stats.totalProblems} Solved
            </span>
          </div>

          <div className="mt-3 w-full bg-surface-hover h-2 rounded-full overflow-hidden">
            <motion.div
              className="bg-emerald-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.progressPercent}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1.5 text-right font-medium">
            {stats.progressPercent}% Completed
          </p>
        </Card>

        {/* Difficulty Breakdown Gauges */}
        <Card className="p-4 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1">
            Difficulty Solved
          </span>

          <div className="space-y-1.5 text-xs font-medium">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400">Easy</span>
              <span>
                {stats.easySolved} / {stats.easyTotal}
              </span>
            </div>
            <div className="w-full bg-surface-hover h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${stats.easyTotal > 0 ? (stats.easySolved / stats.easyTotal) * 100 : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-amber-400">Medium</span>
              <span>
                {stats.mediumSolved} / {stats.mediumTotal}
              </span>
            </div>
            <div className="w-full bg-surface-hover h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full"
                style={{ width: `${stats.mediumTotal > 0 ? (stats.mediumSolved / stats.mediumTotal) * 100 : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-rose-400">Hard</span>
              <span>
                {stats.hardSolved} / {stats.hardTotal}
              </span>
            </div>
            <div className="w-full bg-surface-hover h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full"
                style={{ width: `${stats.hardTotal > 0 ? (stats.hardSolved / stats.hardTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Study Strategy Advice */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Study Strategy
            </span>
            <HiAcademicCap className="text-purple-400 text-xl" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            Follow the <strong className="text-[var(--foreground)]">Two-Pointer & Sliding Window</strong> strategy for Array patterns before advancing to Graph DFS and Dynamic Programming.
          </p>
        </Card>

        {/* Recommended Next Problem */}
        {stats.recommendedNext ? (
          <Card className="p-4 border border-primary/30 bg-primary/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Recommended Next
                </span>
                <HiLightningBolt className="text-yellow-400 text-lg animate-pulse" />
              </div>
              <h3 className="text-sm font-bold truncate text-[var(--foreground)] mb-1">
                {stats.recommendedNext.title}
              </h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    stats.recommendedNext.difficulty === 'easy'
                      ? 'teal'
                      : stats.recommendedNext.difficulty === 'medium'
                      ? 'amber'
                      : 'coral'
                  }
                  size="sm"
                >
                  {stats.recommendedNext.difficulty}
                </Badge>
                <span className="text-xs text-[var(--muted-foreground)] truncate">
                  {stats.recommendedNext.pattern}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="mt-3 w-full"
              onClick={() => onSelectProblem(stats.recommendedNext!)}
            >
              Solve Now 🚀
            </Button>
          </Card>
        ) : (
          <Card className="p-4 flex items-center justify-center text-center">
            <span className="text-sm font-bold text-emerald-400">
              🎉 All Problems Mastered!
            </span>
          </Card>
        )}
      </div>
    </div>
  );
}
