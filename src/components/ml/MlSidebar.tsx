'use client';

import React, { useState } from 'react';
import {
  HiSearch,
  HiChevronDown,
  HiChevronRight,
  HiChevronLeft,
  HiCheckCircle,
  HiBookmark,
  HiOutlineBookmark,
  HiSparkles,
  HiAcademicCap,
  HiBookOpen,
  HiLightningBolt,
  HiX,
} from 'react-icons/hi';
import { MlLesson, MlTier } from '@/types/ml';

const TIER_EMOJIS: Record<number, string> = {
  1: '📊',
  2: '📈',
  3: '🤖',
  4: '⚖️',
  5: '🌌',
  6: '💬',
  7: '🧠',
};

function getTierEmoji(tierNum: number): string {
  return TIER_EMOJIS[tierNum] || '⚡';
}

interface MlSidebarProps {
  tiers: MlTier[];
  allLessons: MlLesson[];
  activeLessonId: string | null;
  completedLessonIds: string[];
  bookmarkedLessonIds: string[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTierId: string | null;
  onSelectTierFilter: (tierId: string | null) => void;
  showBookmarksOnly: boolean;
  onToggleBookmarksOnly: () => void;
  onSelectLesson: (lessonId: string) => void;
  onOpenQuiz: () => void;
  onOpenFormulaSheet: () => void;
  onOpenSpotlight?: () => void;
  onToggleCollapse?: () => void;
  activeView: 'lesson' | 'quiz' | 'cheatSheet';
  onCloseMobile?: () => void;
}

export default function MlSidebar({
  tiers,
  allLessons,
  activeLessonId,
  completedLessonIds,
  bookmarkedLessonIds,
  searchQuery,
  onSearchChange,
  selectedTierId,
  onSelectTierFilter,
  showBookmarksOnly,
  onToggleBookmarksOnly,
  onSelectLesson,
  onOpenQuiz,
  onOpenFormulaSheet,
  onOpenSpotlight,
  onToggleCollapse,
  activeView,
  onCloseMobile,
}: MlSidebarProps) {
  // Collapsed state for tiers: default all expanded
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    tiers.forEach((t) => {
      init[t.id] = true;
    });
    return init;
  });

  const toggleTierAccordion = (tierId: string) => {
    setExpandedTiers((prev) => ({
      ...prev,
      [tierId]: !prev[tierId],
    }));
  };

  const totalCompleted = completedLessonIds.length;
  const totalLessons = allLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  return (
    <aside className="w-full h-full flex flex-col bg-slate-950/95 border-r border-slate-800/80 select-none">
      {/* Header & Overall Mastery */}
      <div className="p-3 border-b border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <HiAcademicCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-wide">ML Masterclass</h2>
              <p className="text-[10px] text-slate-400">Zero to Production Architect</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Collapse Sidebar"
                className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <HiChevronLeft className="w-4 h-4" />
              </button>
            )}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <HiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Overall Progress Meter */}
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-300">Curriculum Progress</span>
            <span className="text-indigo-400 font-mono">
              {totalCompleted}/{totalLessons} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Nav Tools: Notes, Formulas, Universal Search */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onSelectLesson(activeLessonId || allLessons[0]?.id || '')}
            className={`py-2 px-1 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              activeView === 'lesson'
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
            }`}
            title="Read Complete Concept Study Notes"
          >
            <HiBookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="truncate">Notes</span>
          </button>
          <button
            onClick={onOpenFormulaSheet}
            className={`py-2 px-1 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              activeView === 'cheatSheet'
                ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
            }`}
            title="Machine Learning Formula Reference Sheet"
          >
            <HiSparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="truncate">Formulas</span>
          </button>
          {onOpenSpotlight ? (
            <button
              type="button"
              onClick={onOpenSpotlight}
              className="py-2 px-1 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white hover:border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
              title="Universal Concept & Formula Search (Ctrl+K)"
            >
              <HiSearch className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">Search</span>
            </button>
          ) : (
            <button
              onClick={onOpenQuiz}
              className={`py-2 px-1 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                activeView === 'quiz'
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
              }`}
            >
              <HiLightningBolt className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate">Quiz</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative flex items-center">
          <HiSearch className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search lessons or Ctrl+K..."
            className="w-full pl-9 pr-14 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
            >
              <HiX className="w-3.5 h-3.5" />
            </button>
          ) : onOpenSpotlight ? (
            <button
              type="button"
              onClick={onOpenSpotlight}
              title="Open Universal Spotlight Search (Ctrl+K)"
              className="absolute right-2 top-1.5 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-400 hover:text-indigo-300 text-[10px] font-mono font-medium transition-colors"
            >
              Ctrl+K
            </button>
          ) : null}
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => onSelectTierFilter(null)}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedTierId === null && !showBookmarksOnly
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Tiers
          </button>
          <button
            onClick={onToggleBookmarksOnly}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
              showBookmarksOnly
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <HiBookmark className="w-3.5 h-3.5" />
            <span>Saved ({bookmarkedLessonIds.length})</span>
          </button>
        </div>
      </div>

      {/* Curriculum Tiers Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tiers.map((tier) => {
          const tierLessons = allLessons.filter((l) => l.tierId === tier.id);
          const completedInTier = tierLessons.filter((l) => completedLessonIds.includes(l.id)).length;
          const isTierFinished = tierLessons.length > 0 && completedInTier === tierLessons.length;
          const isExpanded = expandedTiers[tier.id] ?? true;

          // Filter lessons based on search query
          const displayLessons = tierLessons.filter((l) => {
            if (showBookmarksOnly && !bookmarkedLessonIds.includes(l.id)) return false;
            if (selectedTierId && selectedTierId !== tier.id) return false;
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              return (
                l.title.toLowerCase().includes(q) ||
                (l.description || l.shortSummary || '').toLowerCase().includes(q) ||
                l.category.toLowerCase().includes(q)
              );
            }
            return true;
          });

          if (displayLessons.length === 0 && (selectedTierId || searchQuery || showBookmarksOnly)) {
            return null;
          }

          return (
            <div
              key={tier.id}
              className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden transition-colors"
            >
              {/* Tier Header */}
              <button
                onClick={() => toggleTierAccordion(tier.id)}
                className="w-full px-2.5 py-2 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">{tier.icon || getTierEmoji(tier.tierNumber)}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span>{tier.badge || `Tier ${tier.tierNumber}`}</span>
                      <span className="text-slate-400 font-normal truncate">• {tier.title}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">
                    {completedInTier}/{tierLessons.length}
                  </span>
                  {isTierFinished && (
                    <HiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  )}
                  {isExpanded ? (
                    <HiChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <HiChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </button>

              {/* Tier Lessons List */}
              {isExpanded && (
                <div className="px-2 pb-2 space-y-1">
                  {displayLessons.map((lesson) => {
                    const isLessonActive = activeView === 'lesson' && activeLessonId === lesson.id;
                    const isLessonDone = completedLessonIds.includes(lesson.id);
                    const isLessonSaved = bookmarkedLessonIds.includes(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          onSelectLesson(lesson.id);
                          onCloseMobile?.();
                        }}
                        className={`w-full px-2.5 py-2 rounded-lg text-left text-xs transition-all flex items-center justify-between gap-2 ${
                          isLessonActive
                            ? 'bg-indigo-600/20 border border-indigo-500/50 text-white font-medium shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isLessonDone ? (
                            <HiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isLessonSaved && (
                            <HiBookmark className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span className="text-[10px] text-slate-500">
                            {lesson.estimatedMinutes}m
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
