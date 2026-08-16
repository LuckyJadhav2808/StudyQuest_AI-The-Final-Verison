'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiChevronDown,
  HiCheckCircle,
  HiCode,
  HiBookmark,
  HiStar,
  HiArrowRight,
  HiSparkles,
  HiOutlineBookOpen,
} from 'react-icons/hi';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { DsaProblem, DsaTopic, DsaPattern, UserDsaMap } from '@/types/dsa';

interface DsaRoadmapViewProps {
  problems: DsaProblem[];
  userProgress: UserDsaMap;
  onSelectProblem: (problem: DsaProblem) => void;
  onToggleStar: (problemId: string) => void;
  onToggleSolved?: (problemId: string, event?: React.MouseEvent) => void;
}

type RoadmapMode = 'topics' | 'patterns';

export default function DsaRoadmapView({
  problems,
  userProgress,
  onSelectProblem,
  onToggleStar,
  onToggleSolved,
}: DsaRoadmapViewProps) {
  const [mode, setMode] = useState<RoadmapMode>('topics');
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [chapterLimits, setChapterLimits] = useState<Record<string, number>>({});

  // Group problems by Data Structure Topic
  const topicsGroup = React.useMemo(() => {
    const map: Record<string, DsaProblem[]> = {};
    problems.forEach((p) => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });
    return map;
  }, [problems]);

  // Group problems by Algorithmic Pattern
  const patternsGroup = React.useMemo(() => {
    const map: Record<string, DsaProblem[]> = {};
    problems.forEach((p) => {
      if (!map[p.pattern]) map[p.pattern] = [];
      map[p.pattern].push(p);
    });
    return map;
  }, [problems]);

  const activeGroup = mode === 'topics' ? topicsGroup : patternsGroup;

  const toggleChapter = (chapterName: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterName]: !prev[chapterName],
    }));
  };

  const handleToggleAllChapters = () => {
    const allChapters = Object.keys(activeGroup);
    const anyExpanded = allChapters.some((c) => expandedChapters[c]);
    const nextMap: Record<string, boolean> = {};
    if (!anyExpanded) {
      allChapters.forEach((c) => {
        nextMap[c] = true;
      });
    }
    setExpandedChapters(nextMap);
  };

  const toggleShowAll = (chapterName: string, totalCount: number) => {
    setChapterLimits((prev) => {
      const current = prev[chapterName] || 15;
      return {
        ...prev,
        [chapterName]: current >= totalCount ? 15 : totalCount,
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Sleek Horizontal Chip Subnav Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 bg-[var(--card-bg)] border border-[var(--card-border)] p-2.5 sm:p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setMode('topics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'topics'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface-hover/80 text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <span>📚</span> Topics
          </button>
          <button
            onClick={() => setMode('patterns')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'patterns'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-surface-hover/80 text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <span>⚡</span> Patterns
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 px-1 sm:px-0">
          <button
            onClick={handleToggleAllChapters}
            className="text-xs font-bold text-primary hover:underline px-2 py-0.5 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
          >
            {Object.keys(activeGroup).some((c) => expandedChapters[c]) ? '▲ Collapse All' : '▼ Expand All'}
          </button>
          <div className="text-[11px] sm:text-xs text-[var(--muted-foreground)] font-medium truncate">
            {mode === 'topics' ? '12 Data Structures' : '13 Patterns'} • {problems.length} Problems
          </div>
        </div>
      </div>

      {/* Chapters Accordion List */}
      <div className="space-y-4">
        {Object.entries(activeGroup).map(([chapterName, chapterProblems]) => {
          const solvedInChapter = chapterProblems.filter(
            (p) => userProgress[p.id]?.status === 'solved'
          ).length;
          const chapterPercent =
            chapterProblems.length > 0
              ? Math.round((solvedInChapter / chapterProblems.length) * 100)
              : 0;
          const isExpanded = !!expandedChapters[chapterName];
          const currentLimit = chapterLimits[chapterName] || 15;
          const visibleProblems = chapterProblems.slice(0, currentLimit);
          const hasMore = chapterProblems.length > 15;
          const isShowingAll = currentLimit >= chapterProblems.length;

          return (
            <Card key={chapterName} className="overflow-hidden border border-[var(--card-border)]">
              {/* Chapter Header Bar */}
              <button
                onClick={() => toggleChapter(chapterName)}
                className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <HiOutlineBookOpen className="text-lg" />
                  </div>
                  <div>
                    <h2 className="text-base font-heading font-black text-[var(--foreground)]">
                      {chapterName}
                    </h2>
                    <p className="text-xs text-[var(--muted-foreground)] font-medium">
                      {chapterProblems.length} Problems • {solvedInChapter} Solved
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Progress Badge */}
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-24 bg-surface-hover h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${chapterPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-emerald-400">
                      {chapterPercent}%
                    </span>
                  </div>

                  <HiChevronDown
                    className={`text-lg text-[var(--muted-foreground)] transition-transform duration-300 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Problems List in Chapter */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-[var(--card-border)] divide-y divide-[var(--card-border)]"
                  >
                    {visibleProblems.map((problem) => {
                      const status = userProgress[problem.id]?.status || 'unsolved';
                      const isStarred = userProgress[problem.id]?.starred || false;
                      const optimalApproach = problem.approaches?.find((a) => a.type === 'optimal') || problem.approaches?.[problem.approaches.length - 1] || problem.approaches?.[0];
                      const optimalTime = optimalApproach?.timeComplexity || (problem.difficulty === 'easy' ? 'O(N)' : problem.difficulty === 'medium' ? 'O(N log N)' : 'O(N^2)');
                      const optimalSpace = optimalApproach?.spaceComplexity || (problem.difficulty === 'easy' ? 'O(1)' : 'O(N)');

                      return (
                        <div
                          key={problem.id}
                          className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-surface-hover/50 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Interactive Solved Status Toggle Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSolved?.(problem.id, e);
                              }}
                              className="flex-shrink-0 cursor-pointer p-1 rounded-full hover:scale-110 transition-transform"
                              title={status === 'solved' ? 'Click to unmark solved' : 'Click to mark solved (+25 XP)'}
                            >
                              {status === 'solved' ? (
                                <HiCheckCircle className="text-emerald-400 text-xl" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-[var(--card-border)] group-hover:border-primary transition-colors" />
                              )}
                            </button>

                            {/* Problem Info - Clickable to open workspace */}
                            <div
                              onClick={() => onSelectProblem(problem)}
                              className="min-w-0 flex-1 space-y-1"
                            >
                              {/* Line 1: Problem Title (Full Width) */}
                              <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] group-hover:text-primary transition-colors leading-snug truncate">
                                {problem.leetcodeId ? `${problem.leetcodeId}. ` : ''}
                                {problem.title}
                              </h3>

                              {/* Line 2: Compact Meta Badges */}
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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

                                <span className="text-[10px] sm:text-xs text-[var(--muted-foreground)] font-medium">
                                  {mode === 'topics' ? problem.pattern : problem.category}
                                </span>

                                {optimalTime && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-500/10 border border-purple-500/20 text-[9px] sm:text-[10px] font-mono font-bold text-purple-300">
                                    ⏱️ {optimalTime}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Controls: Star & Desktop Practice Button */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Star Bookmark */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleStar(problem.id);
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isStarred
                                  ? 'text-amber-400 hover:bg-amber-400/10'
                                  : 'text-[var(--muted-foreground)] hover:text-amber-400 hover:bg-surface-hover'
                              }`}
                              title={isStarred ? 'Unstar Question' : 'Star Question'}
                            >
                              <HiStar className="text-base sm:text-lg" />
                            </button>

                            {/* Desktop-only Practice Button */}
                            <div className="hidden sm:block">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e?.stopPropagation();
                                  onSelectProblem(problem);
                                }}
                                icon={<HiCode />}
                              >
                                Practice
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Show All / Show Less Button */}
                    {hasMore && (
                      <div className="p-3 bg-surface-hover/30 text-center">
                        <button
                          onClick={() => toggleShowAll(chapterName, chapterProblems.length)}
                          className="text-xs font-bold text-primary hover:underline transition-all cursor-pointer py-1 px-4 rounded-lg hover:bg-primary/10"
                        >
                          {isShowingAll
                            ? '▲ Show top 15 questions only'
                            : `▼ Show all ${chapterProblems.length} questions in ${chapterName} (${chapterProblems.length - currentLimit} more)`}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
