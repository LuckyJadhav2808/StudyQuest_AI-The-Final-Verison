// src/components/dsa/DsaCuratedSheetView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiChevronDown, 
  HiChevronRight, 
  HiCheckCircle, 
  HiClock, 
  HiSparkles,
  HiCode,
  HiSearch,
  HiFilter
} from 'react-icons/hi';
import { CuratedSheet, SheetSection, SheetProblem, ALL_CURATED_SHEETS } from '@/data/dsaCuratedSheets';
import { DsaProblem, UserProblemProgress, DsaDifficulty, DsaTopic, DsaPattern } from '@/types/dsa';

interface DsaCuratedSheetViewProps {
  activeSheetId: 'neetcode150' | 'striverA2Z' | 'blind75';
  onSelectSheet: (sheetId: 'neetcode150' | 'striverA2Z' | 'blind75' | 'all') => void;
  userProgressMap: Record<string, UserProblemProgress>;
  allProblemsMap: Record<string, DsaProblem>;
  onSelectProblem: (problem: DsaProblem) => void;
  onSetStatus: (problemId: string, status: 'todo' | 'in_progress' | 'completed') => void;
}

export default function DsaCuratedSheetView({
  activeSheetId,
  onSelectSheet,
  userProgressMap,
  allProblemsMap,
  onSelectProblem,
  onSetStatus,
}: DsaCuratedSheetViewProps) {
  const sheet = ALL_CURATED_SHEETS[activeSheetId] || ALL_CURATED_SHEETS.neetcode150;
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'unsolved'>('all');

  // Toggle Section Collapse
  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const expandAll = () => setCollapsedSections({});
  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    sheet.sections.forEach((s) => {
      next[s.id] = true;
    });
    setCollapsedSections(next);
  };

  // Compute Overall Stats for this sheet
  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let easyTotal = 0;
    let easyDone = 0;
    let medTotal = 0;
    let medDone = 0;
    let hardTotal = 0;
    let hardDone = 0;

    sheet.sections.forEach((sec) => {
      sec.problems.forEach((p) => {
        total++;
        const isDone = userProgressMap[p.id]?.status === 'solved';
        if (isDone) completed++;

        if (p.difficulty === 'Easy') {
          easyTotal++;
          if (isDone) easyDone++;
        } else if (p.difficulty === 'Medium') {
          medTotal++;
          if (isDone) medDone++;
        } else if (p.difficulty === 'Hard') {
          hardTotal++;
          if (isDone) hardDone++;
        }
      });
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      percent,
      easyTotal,
      easyDone,
      medTotal,
      medDone,
      hardTotal,
      hardDone,
    };
  }, [sheet, userProgressMap]);

  // Filtered Sections and Problems
  const filteredSections = useMemo(() => {
    const query = searchFilter.toLowerCase().trim();

    return sheet.sections.map((sec) => {
      const filteredProblems = sec.problems.filter((p) => {
        if (query && !p.title.toLowerCase().includes(query) && !p.id.toLowerCase().includes(query) && !p.pattern?.toLowerCase().includes(query)) {
          return false;
        }
        if (difficultyFilter !== 'all' && p.difficulty !== difficultyFilter) {
          return false;
        }
        const isDone = userProgressMap[p.id]?.status === 'solved';
        if (statusFilter === 'completed' && !isDone) return false;
        if (statusFilter === 'unsolved' && isDone) return false;
        return true;
      });

      return {
        ...sec,
        problems: filteredProblems,
      };
    }).filter((sec) => sec.problems.length > 0);
  }, [sheet, searchFilter, difficultyFilter, statusFilter, userProgressMap]);

  return (
    <div className="space-y-6">
      {/* Top Curated Sheet Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
        <button
          onClick={() => onSelectSheet('neetcode150')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
            activeSheetId === 'neetcode150'
              ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/25 scale-[1.02]'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <span>⚡</span> NeetCode 150
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">150</span>
        </button>

        <button
          onClick={() => onSelectSheet('striverA2Z')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
            activeSheetId === 'striverA2Z'
              ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/25 scale-[1.02]'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <span>🚀</span> Striver's A2Z
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">280</span>
        </button>

        <button
          onClick={() => onSelectSheet('blind75')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
            activeSheetId === 'blind75'
              ? 'bg-teal-600 text-white border-teal-400 shadow-lg shadow-teal-500/25 scale-[1.02]'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <span>🎯</span> Blind 75
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">75</span>
        </button>

        <button
          onClick={() => onSelectSheet('all')}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
        >
          <span>🗺️</span> Full Library (3,369)
        </button>
      </div>

      {/* Sheet Overview & Progress Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1224] to-[#121630] border border-slate-800/80 p-5 sm:p-7 shadow-xl card-glass">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Title & Info */}
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl sm:text-3xl">{sheet.icon}</span>
              <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
                {sheet.title}
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                {sheet.badge}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {sheet.description}
            </p>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
              <span>💡</span> Recommended for: <span className="text-slate-200">{sheet.targetAudience}</span>
            </div>
          </div>

          {/* Progress Dashboard Gauge */}
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl min-w-[280px]">
            <div className="text-center sm:text-left">
              <div className="text-2xl sm:text-3xl font-black text-white">
                {stats.completed} <span className="text-sm font-bold text-slate-500">/ {stats.total}</span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Problems Solved ({stats.percent}%)
              </div>

              {/* Multi-tier difficulty breakdown */}
              <div className="flex items-center gap-2 mt-3 text-[10px] font-bold">
                <span className="text-teal-400 bg-teal-500/15 px-2 py-0.5 rounded-md">
                  Easy: {stats.easyDone}/{stats.easyTotal}
                </span>
                <span className="text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md">
                  Med: {stats.medDone}/{stats.medTotal}
                </span>
                <span className="text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-md">
                  Hard: {stats.hardDone}/{stats.hardTotal}
                </span>
              </div>
            </div>

            {/* Visual Progress Ring / Bar */}
            <div className="w-full sm:w-24 flex flex-col items-center">
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/50">
                <motion.div
                  className="h-full bg-gradient-to-r from-teal-400 via-primary to-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.percent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[10px] font-black text-slate-400 mt-1.5">
                {stats.percent}% Complete
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 sm:p-4 rounded-2xl">
        <div className="relative w-full sm:w-72">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder={`Search ${sheet.title} problems or patterns...`}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary font-medium"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          {/* Difficulty filter */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[11px] font-bold">
            {(['all', 'Easy', 'Medium', 'Hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficultyFilter(d)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  difficultyFilter === d
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d === 'all' ? 'All Diff' : d}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[11px] font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('unsolved')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'unsolved' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unsolved
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'completed' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Solved
            </button>
          </div>

          {/* Expand / Collapse Controls */}
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <button onClick={expandAll} className="hover:text-primary transition-colors cursor-pointer px-1">Expand All</button>
            <span>•</span>
            <button onClick={collapseAll} className="hover:text-primary transition-colors cursor-pointer px-1">Collapse</button>
          </div>
        </div>
      </div>

      {/* Step Sections Accordion List */}
      <div className="space-y-4">
        {filteredSections.map((sec, idx) => {
          const isCollapsed = !!collapsedSections[sec.id];
          const secCompleted = sec.problems.filter((p) => userProgressMap[p.id]?.status === 'solved').length;
          const secTotal = sec.problems.length;
          const isAllDone = secTotal > 0 && secCompleted === secTotal;

          return (
            <div
              key={sec.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isAllDone
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700/80'
              }`}
            >
              {/* Section Header Accordion Bar */}
              <div
                onClick={() => toggleSection(sec.id)}
                className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4 cursor-pointer select-none bg-slate-900/60 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-slate-400">
                    {isCollapsed ? <HiChevronRight size={18} /> : <HiChevronDown size={18} />}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-heading font-black text-slate-100">
                        {sec.title}
                      </h3>
                      {isAllDone && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <HiCheckCircle size={12} /> Step Completed
                        </span>
                      )}
                    </div>
                    {sec.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {sec.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                    isAllDone
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : secCompleted > 0
                      ? 'bg-primary/20 text-primary border-primary/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {secCompleted} / {secTotal}
                  </span>
                </div>
              </div>

              {/* Section Problems Table */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="divide-y divide-slate-800/50"
                  >
                    {sec.problems.map((p, pIdx) => {
                      const userProg = userProgressMap[p.id];
                      const isCompleted = userProg?.status === 'solved';
                      const isWorking = userProg?.status === 'in-progress';
                      
                      // Map to full problem if loaded in database
                      const matchedFullProblem = allProblemsMap[p.id];

                      const handleRowClick = () => {
                        if (matchedFullProblem) {
                          onSelectProblem(matchedFullProblem);
                        } else {
                          // Create synthetic problem object for modal
                          const fallbackProblem: DsaProblem = {
                            id: p.id,
                            title: p.title,
                            difficulty: (p.difficulty.toLowerCase() as DsaDifficulty),
                            category: (sec.title.includes('Array') ? 'Arrays & Hashing' : sec.title.includes('Two Pointer') ? 'Two Pointers' : sec.title.includes('Tree') ? 'Trees' : sec.title.includes('Graph') ? 'Graphs' : sec.title.includes('Dynamic') ? 'Dynamic Programming' : 'Arrays & Hashing') as DsaTopic,
                            pattern: (p.pattern || 'Two Pointers') as DsaPattern,
                            description: `Problem statement for **${p.title}** from ${sheet.title}. Select your preferred language to code and test.`,
                            examples: [
                              { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
                            ],
                            constraints: ['1 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9'],
                            testCases: [
                              { id: 1, input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]' },
                            ],
                            approaches: [
                              {
                                title: 'Optimal Approach',
                                type: 'optimal',
                                intuition: `Solve ${p.title} with optimal algorithmic pattern.`,
                                timeComplexity: 'O(N)',
                                spaceComplexity: 'O(1)',
                                explanation: [`1. Analyze constraints for ${p.title}`, `2. Apply ${p.pattern || 'core pattern'}`],
                                code: {
                                  cpp: `class Solution {\npublic:\n    // Solve ${p.title}\n};\n`,
                                  python: `class Solution:\n    # Solve ${p.title}\n    pass\n`,
                                  java: `class Solution {\n    // Solve ${p.title}\n}\n`,
                                  javascript: `var solution = function() {\n    // Solve ${p.title}\n};\n`,
                                },
                              },
                            ],
                            templates: {
                              cpp: `class Solution {\npublic:\n    // Solve ${p.title}\n};\n`,
                              python: `class Solution:\n    # Solve ${p.title}\n    pass\n`,
                              java: `class Solution {\n    // Solve ${p.title}\n}\n`,
                              javascript: `/**\n * @return {any}\n */\nvar solution = function() {\n    \n};\n`,
                            },
                          };
                          onSelectProblem(fallbackProblem);
                        }
                      };

                      return (
                        <div
                          key={p.id}
                          className={`px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            isCompleted
                              ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                              : isWorking
                              ? 'bg-amber-950/10 hover:bg-amber-950/20'
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          {/* Left: Status Toggle & Title */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Checkbox toggle */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetStatus(p.id, isCompleted ? 'todo' : 'completed');
                              }}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                                isCompleted
                                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/40'
                                  : isWorking
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                  : 'border-slate-700 bg-slate-900/80 hover:border-slate-500 text-transparent'
                              }`}
                              title={isCompleted ? 'Mark as Unsolved' : 'Mark as Solved'}
                            >
                              <HiCheckCircle size={14} className={isCompleted ? 'opacity-100' : 'opacity-0'} />
                            </button>

                            {/* Problem Title & Pattern Chips */}
                            <div
                              onClick={handleRowClick}
                              className="cursor-pointer min-w-0 flex-1 group"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs sm:text-sm font-bold transition-colors ${
                                  isCompleted
                                    ? 'text-emerald-300 line-through opacity-80'
                                    : 'text-slate-200 group-hover:text-primary'
                                }`}>
                                  {p.title}
                                </span>

                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  p.difficulty === 'Easy'
                                    ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                                    : p.difficulty === 'Medium'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}>
                                  {p.difficulty}
                                </span>

                                {p.pattern && (
                                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                                    {p.pattern}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Practice Button */}
                          <div className="flex items-center gap-2 justify-end flex-shrink-0">
                            <button
                              onClick={handleRowClick}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-primary text-slate-300 hover:text-white text-xs font-bold transition-all shadow hover:shadow-primary/20 flex items-center gap-1.5 cursor-pointer"
                            >
                              <HiCode size={14} />
                              <span>Practice</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
