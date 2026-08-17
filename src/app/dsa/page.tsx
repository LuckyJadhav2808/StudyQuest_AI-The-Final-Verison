'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiSearch,
  HiFilter,
  HiCheckCircle,
  HiStar,
  HiCode,
  HiViewGrid,
  HiViewList,
  HiSparkles,
  HiX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import PageTransition from '@/components/layout/PageTransition';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DsaHeaderStats from '@/components/dsa/DsaHeaderStats';
import DsaAnalyticsSection from '@/components/dsa/DsaAnalyticsSection';
import DsaRoadmapView from '@/components/dsa/DsaRoadmapView';
import DsaCuratedSheetView from '@/components/dsa/DsaCuratedSheetView';
import DsaProblemDetailModal from '@/components/dsa/DsaProblemDetailModal';
import DsaAiAssistantModal from '@/components/dsa/DsaAiAssistantModal';
import { useDsaTracker } from '@/hooks/useDsaTracker';
import { DsaProblem, DsaDifficulty, ProblemStatus } from '@/types/dsa';
import { spawnXPFromEvent } from '@/components/gamification/FloatingXP';
import { playSuccess } from '@/lib/sounds';

export default function DsaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading DSA Dungeon...</div>}>
      <DsaPageContent />
    </Suspense>
  );
}

function DsaPageContent() {
  const searchParams = useSearchParams();
  const problemParam = searchParams ? searchParams.get('problem') : null;

  const {
    allProblems,
    curatedRoadmapProblems,
    userProgress,
    loading,
    stats,
    setProblemStatus,
    saveUserCode,
    toggleStar,
    saveNotes,
  } = useDsaTracker();

  // Curated Sheet Tracker State ('neetcode150' | 'striverA2Z' | 'blind75' | 'all')
  const [activeCuratedSheet, setActiveCuratedSheet] = useState<'neetcode150' | 'striverA2Z' | 'blind75' | 'all'>('neetcode150');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [viewLayout, setViewLayout] = useState<'roadmap' | 'grid'>('roadmap');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // Modals state
  const [activeProblem, setActiveProblem] = useState<DsaProblem | null>(null);
  const [aiModalProblem, setAiModalProblem] = useState<DsaProblem | null>(null);

  // Map of all problems for instant O(1) modal hydration
  const allProblemsMap = useMemo(() => {
    const map: Record<string, DsaProblem> = {};
    allProblems.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [allProblems]);

  // Auto-open problem if specified in URL query
  useEffect(() => {
    if (problemParam && allProblems.length > 0) {
      const target = allProblems.find((p) => p.id === problemParam || String(p.leetcodeId) === problemParam);
      if (target) {
        setActiveProblem(target);
      }
    }
  }, [problemParam, allProblems]);

  // Pick dataset source: All 2,360+ categorized LeetCode problems
  const datasetSource = useMemo(() => {
    return allProblems;
  }, [allProblems]);

  // Filtered Problems Calculation
  const filteredProblems = useMemo(() => {
    return datasetSource.filter((problem) => {
      // 1. Search Query (Title, ID, or Pattern)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = problem.title.toLowerCase().includes(q);
        const matchesId = problem.leetcodeId ? String(problem.leetcodeId) === q : false;
        const matchesPattern = problem.pattern.toLowerCase().includes(q);
        const matchesCategory = problem.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesId && !matchesPattern && !matchesCategory) {
          return false;
        }
      }

      // 2. Difficulty Filter
      if (selectedDifficulty !== 'all' && problem.difficulty !== selectedDifficulty) {
        return false;
      }

      // 3. Status Filter (Solved / Unsolved / Starred)
      if (selectedStatus !== 'all') {
        const userStatus = userProgress[problem.id]?.status || 'unsolved';
        const isStarred = userProgress[problem.id]?.starred || false;
        if (selectedStatus === 'solved' && userStatus !== 'solved') return false;
        if (selectedStatus === 'unsolved' && userStatus !== 'unsolved') return false;
        if (selectedStatus === 'starred' && !isStarred) return false;
      }

      // 4. Topic Filter
      if (selectedTopic !== 'all' && problem.category !== selectedTopic) {
        return false;
      }

      return true;
    });
  }, [datasetSource, searchQuery, selectedDifficulty, selectedStatus, selectedTopic, userProgress]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDifficulty, selectedStatus, selectedTopic, viewLayout]);

  // Pagination slice for Grid view
  const totalPages = Math.ceil(filteredProblems.length / itemsPerPage) || 1;
  const paginatedProblems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProblems.slice(start, start + itemsPerPage);
  }, [filteredProblems, currentPage, itemsPerPage]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedDifficulty !== 'all' || selectedStatus !== 'all' || selectedTopic !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDifficulty('all');
    setSelectedStatus('all');
    setSelectedTopic('all');
    setCurrentPage(1);
  };

  const handleToggleSolved = (problemId: string, event?: React.MouseEvent) => {
    const currentStatus = userProgress[problemId]?.status;
    const nextStatus: ProblemStatus = currentStatus === 'solved' ? 'unsolved' : 'solved';
    setProblemStatus(problemId, nextStatus);
    if (nextStatus === 'solved') {
      spawnXPFromEvent(25, event);
      playSuccess();
      toast.success('🎉 Problem marked as Solved! +25 XP');
    } else {
      toast('Problem marked as Unsolved.', { icon: '⭕' });
    }
  };

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Stats Dashboard */}
        <DsaHeaderStats
          stats={stats}
          onSelectProblem={(p) => setActiveProblem(p)}
        />

        {/* Pattern & Performance Analytics Sub-Section */}
        <DsaAnalyticsSection stats={stats} />

        {/* Curated Track Mode vs Full Library */}
        {activeCuratedSheet !== 'all' ? (
          <DsaCuratedSheetView
            activeSheetId={activeCuratedSheet}
            onSelectSheet={(sheetId) => setActiveCuratedSheet(sheetId)}
            userProgressMap={userProgress as any}
            allProblemsMap={allProblemsMap}
            onSelectProblem={(p) => setActiveProblem(p)}
            onSetStatus={(id, status) => {
              const mappedStatus: ProblemStatus = status === 'completed' ? 'solved' : 'unsolved';
              setProblemStatus(id, mappedStatus);
              if (mappedStatus === 'solved') {
                spawnXPFromEvent(25);
                playSuccess();
                toast.success('🎉 Problem marked as Solved! +25 XP');
              } else {
                toast('Problem marked as Unsolved.', { icon: '⭕' });
              }
            }}
          />
        ) : (
          <>
            {/* Full 3,369 Database Search & Filter Toolbar */}
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-4 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-4 pb-2 border-b border-[var(--card-border)]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-100">🗺️ Full Library Roadmap</span>
                  <span className="text-xs font-bold text-slate-400">({allProblems.length} questions)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveCuratedSheet('neetcode150')}
                    className="px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    ⚡ NeetCode 150
                  </button>
                  <button
                    onClick={() => setActiveCuratedSheet('striverA2Z')}
                    className="px-3 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    🚀 Striver A2Z
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Search Input with 1-Click Clear */}
                <div className="relative flex-1">
                  <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-base" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search any question by name, # (e.g. 51), topic, or pattern..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-hover border border-[var(--card-border)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-full hover:bg-[var(--card-bg)] transition-colors cursor-pointer"
                      title="Clear search text"
                    >
                      <HiX className="text-sm" />
                    </button>
                  )}
                </div>

                {/* Layout Switcher */}
                <div className="inline-flex p-1 bg-surface-hover rounded-xl border border-[var(--card-border)] w-full sm:w-auto justify-center">
                  <button
                    onClick={() => setViewLayout('roadmap')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewLayout === 'roadmap'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <HiViewList />
                    Roadmap
                  </button>
                  <button
                    onClick={() => setViewLayout('grid')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewLayout === 'grid'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <HiViewGrid />
                    Library ({allProblems.length})
                  </button>
                </div>
              </div>

              {/* Secondary Filter Chips */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[var(--card-border)] overflow-x-auto no-scrollbar py-1">
                <div className="flex items-center gap-2">
                  <HiFilter className="text-[var(--muted-foreground)] text-xs" />
                  <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Filters:
                  </span>
                </div>

                {/* Difficulty Filter */}
                <div className="flex items-center gap-1">
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-surface-hover border border-[var(--card-border)] text-xs text-[var(--foreground)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-surface-hover border border-[var(--card-border)] text-xs text-[var(--foreground)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="solved">Solved</option>
                    <option value="unsolved">Unsolved</option>
                    <option value="starred">Starred ⭐</option>
                  </select>
                </div>

                {/* Reset All Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Reset all search queries and active filters"
                  >
                    <HiX className="text-xs" /> Reset Filters
                  </button>
                )}

                <div className="ml-auto text-xs text-[var(--muted-foreground)] font-medium">
                  {viewLayout === 'roadmap' && !searchQuery ? (
                    <span>📍 Curated Essential Roadmap (<strong>{filteredProblems.length}</strong> top problems)</span>
                  ) : (
                    <span>Showing <strong>{filteredProblems.length}</strong> matching questions in library</span>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area: Roadmap or Grid */}
            {viewLayout === 'roadmap' ? (
              <DsaRoadmapView
                problems={filteredProblems}
                userProgress={userProgress}
                onSelectProblem={(p) => setActiveProblem(p)}
                onToggleStar={(id) => toggleStar(id)}
                onToggleSolved={(id, e) => handleToggleSolved(id, e)}
              />
            ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedProblems.map((problem) => {
                const status = userProgress[problem.id]?.status || 'unsolved';
                const isStarred = userProgress[problem.id]?.starred || false;
                const optimalApproach = problem.approaches?.find((a) => a.type === 'optimal') || problem.approaches?.[problem.approaches.length - 1] || problem.approaches?.[0];
                const optimalTime = optimalApproach?.timeComplexity || (problem.difficulty === 'easy' ? 'O(N)' : problem.difficulty === 'medium' ? 'O(N log N)' : 'O(N^2)');
                const optimalSpace = optimalApproach?.spaceComplexity || (problem.difficulty === 'easy' ? 'O(1)' : 'O(N)');

                return (
                  <Card
                    key={problem.id}
                    className="p-5 flex flex-col justify-between space-y-4 hover:border-primary/50 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSolved(problem.id, e);
                            }}
                            className="flex-shrink-0 cursor-pointer p-0.5 rounded-full hover:scale-110 transition-transform"
                            title={status === 'solved' ? 'Click to unmark solved' : 'Click to mark solved (+25 XP)'}
                          >
                            {status === 'solved' ? (
                              <HiCheckCircle className="text-emerald-400 text-xl" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-[var(--card-border)] group-hover:border-primary transition-colors" />
                            )}
                          </button>
                          <Badge
                            variant={
                              problem.difficulty === 'easy'
                                ? 'teal'
                                : problem.difficulty === 'medium'
                                ? 'amber'
                                : 'coral'
                            }
                            size="sm"
                          >
                            {problem.difficulty}
                          </Badge>
                          {optimalTime && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono font-bold text-purple-300">
                              ⏱️ {optimalTime}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleStar(problem.id)}
                          className={`p-1 rounded transition-colors ${
                            isStarred ? 'text-amber-400' : 'text-[var(--muted-foreground)] hover:text-amber-400'
                          }`}
                        >
                          <HiStar className="text-base" />
                        </button>
                      </div>

                      <h3
                        onClick={() => setActiveProblem(problem)}
                        className="text-base font-bold text-[var(--foreground)] group-hover:text-primary cursor-pointer transition-colors"
                      >
                        {problem.leetcodeId ? `${problem.leetcodeId}. ` : ''}
                        {problem.title}
                      </h3>

                      <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mt-1.5">
                        {problem.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[var(--card-border)] flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate max-w-[170px]">
                        <span className="text-[11px] font-semibold text-[var(--muted-foreground)] truncate">
                          {problem.pattern}
                        </span>
                        {optimalSpace && (
                          <span className="hidden sm:inline text-[10px] font-mono text-cyan-400/80">
                            ({optimalSpace})
                          </span>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveProblem(problem)}
                        icon={<HiCode />}
                      >
                        Practice
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </Button>
                <span className="text-xs font-bold text-[var(--foreground)] px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        )}
        </>
      )}

        {/* Problem Detail Solver Workspace Modal */}
        {activeProblem && (
          <DsaProblemDetailModal
            problem={activeProblem}
            userProgress={userProgress[activeProblem.id]}
            onClose={() => setActiveProblem(null)}
            onSetStatus={setProblemStatus}
            onSaveCode={saveUserCode}
            onSaveNotes={saveNotes}
            onOpenAiAssistant={(p) => setAiModalProblem(p)}
          />
        )}

        {/* AI Assistant Tutor Modal */}
        {aiModalProblem && (
          <DsaAiAssistantModal
            problem={aiModalProblem}
            currentCode={userProgress[aiModalProblem.id]?.userCode?.['cpp']}
            onClose={() => setAiModalProblem(null)}
          />
        )}
      </div>
    </PageTransition>
  );
}
