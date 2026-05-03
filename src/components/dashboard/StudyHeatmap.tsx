'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/* ============================================================
   StudyHeatmap — GitHub-style contribution heatmap
   Shows XP activity over the last ~6 months (180 days).
   Brighter = more XP earned that day.
   ============================================================ */

interface StudyHeatmapProps {
  /** Record of date (YYYY-MM-DD) → XP earned that day */
  xpByDate: Record<string, number>;
  /** Number of days to show (default 180) */
  days?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// Color intensity levels (dark mode optimized)
const LEVEL_COLORS = [
  'rgba(124, 58, 237, 0.06)',  // L0 — no activity
  'rgba(124, 58, 237, 0.20)',  // L1 — low
  'rgba(124, 58, 237, 0.40)',  // L2 — medium-low
  'rgba(124, 58, 237, 0.60)',  // L3 — medium
  'rgba(124, 58, 237, 0.80)',  // L4 — high
  'rgba(167, 139, 250, 1.00)', // L5 — max (bright purple)
];

function getLevel(xp: number, maxXp: number): number {
  if (xp === 0) return 0;
  if (maxXp === 0) return 0;
  const ratio = xp / maxXp;
  if (ratio <= 0.15) return 1;
  if (ratio <= 0.35) return 2;
  if (ratio <= 0.55) return 3;
  if (ratio <= 0.80) return 4;
  return 5;
}

function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export default function StudyHeatmap({ xpByDate, days = 180 }: StudyHeatmapProps) {
  const dateRange = useMemo(() => generateDateRange(days), [days]);

  // Calculate max XP for scaling
  const maxXp = useMemo(() => {
    const values = dateRange.map((d) => xpByDate[d] || 0);
    return Math.max(...values, 1); // avoid division by zero
  }, [dateRange, xpByDate]);

  // Total stats
  const totalXp = useMemo(
    () => dateRange.reduce((sum, d) => sum + (xpByDate[d] || 0), 0),
    [dateRange, xpByDate]
  );
  const activeDays = useMemo(
    () => dateRange.filter((d) => (xpByDate[d] || 0) > 0).length,
    [dateRange, xpByDate]
  );

  // Group dates into weeks (columns), each week = 7 days
  const weeks = useMemo(() => {
    const result: string[][] = [];
    // Pad the start so first column starts on Sunday
    const firstDate = new Date(dateRange[0]);
    const startPad = firstDate.getDay(); // 0=Sun
    const paddedDates = [...Array(startPad).fill(null), ...dateRange];

    for (let i = 0; i < paddedDates.length; i += 7) {
      result.push(paddedDates.slice(i, i + 7));
    }
    return result;
  }, [dateRange]);

  // Extract month labels for the top row
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, colIdx) => {
      const validDate = week.find((d) => d !== null);
      if (validDate) {
        const m = new Date(validDate).getMonth();
        if (m !== lastMonth) {
          labels.push({ label: MONTHS[m], col: colIdx });
          lastMonth = m;
        }
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--muted-foreground)]">
        <span>{totalXp.toLocaleString()} XP earned</span>
        <span>•</span>
        <span>{activeDays} active days</span>
        <span>•</span>
        <span>Last {days} days</span>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex flex-col gap-[2px] min-w-max">
          {/* Month labels */}
          <div className="flex gap-[2px] ml-[30px]">
            {weeks.map((_, colIdx) => {
              const monthLabel = monthLabels.find((m) => m.col === colIdx);
              return (
                <div key={`month-${colIdx}`} className="w-[12px] text-center">
                  {monthLabel && (
                    <span className="text-[8px] font-bold text-[var(--muted-foreground)]">
                      {monthLabel.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid rows (7 rows = days of week) */}
          {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => (
            <div key={dayOfWeek} className="flex items-center gap-[2px]">
              {/* Day label */}
              <span className="w-[28px] text-[8px] font-bold text-[var(--muted-foreground)] text-right pr-1">
                {DAYS_LABELS[dayOfWeek]}
              </span>

              {/* Squares */}
              {weeks.map((week, colIdx) => {
                const dateStr = week[dayOfWeek];
                if (!dateStr) {
                  return <div key={`empty-${colIdx}`} className="w-[12px] h-[12px]" />;
                }

                const xp = xpByDate[dateStr] || 0;
                const level = getLevel(xp, maxXp);

                return (
                  <motion.div
                    key={dateStr}
                    className="w-[12px] h-[12px] rounded-[2px] cursor-pointer relative group"
                    style={{ backgroundColor: LEVEL_COLORS[level] }}
                    whileHover={{ scale: 1.8, zIndex: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                      <div className="px-2 py-1 rounded-lg bg-[var(--foreground)] text-[var(--background)] text-[9px] font-bold whitespace-nowrap shadow-lg">
                        {xp > 0 ? `${xp} XP` : 'No activity'} — {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    {/* Glow effect for high activity */}
                    {level >= 4 && (
                      <div
                        className="absolute inset-0 rounded-[2px] animate-pulse"
                        style={{
                          boxShadow: `0 0 ${level * 3}px ${LEVEL_COLORS[level]}`,
                        }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--muted-foreground)]">
        <span>Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <div
            key={i}
            className="w-[10px] h-[10px] rounded-[2px]"
            style={{ backgroundColor: color }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
