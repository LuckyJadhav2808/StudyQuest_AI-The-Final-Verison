'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageTransition from '@/components/layout/PageTransition';
import {
  HiAcademicCap,
  HiSparkles,
  HiLightningBolt,
  HiBookOpen,
  HiCheckCircle,
  HiTerminal,
  HiArrowRight,
  HiMenuAlt2,
  HiChartBar,
  HiCode,
  HiFire,
  HiExternalLink,
  HiSearch,
  HiChevronRight,
} from 'react-icons/hi';
import MlSidebar from '@/components/ml/MlSidebar';
import MlLessonViewer from '@/components/ml/MlLessonViewer';
import MlQuizViewer from '@/components/ml/MlQuizViewer';
import MlFormulaSheet from '@/components/ml/MlFormulaSheet';
import MlSpotlightSearch from '@/components/ml/MlSpotlightSearch';
import { useMlCurriculum } from '@/hooks/useMlCurriculum';
import { useGamification } from '@/hooks/useGamification';
import { ML_LAB_TEMPLATES, MlLabTemplate } from '@/data/mlNotebookTemplates';
import { Notebook } from '@/types/notebook';
import toast from 'react-hot-toast';

export default function MachineLearningPage() {
  const router = useRouter();
  const { awardXP } = useGamification();

  const {
    tiers,
    allLessons,
    filteredLessons,
    completedLessonIds,
    bookmarkedLessonIds,
    toggleLessonComplete,
    toggleBookmark,
    progressMetrics,
    searchQuery,
    setSearchQuery,
    selectedTierId,
    setSelectedTierId,
    showBookmarksOnly,
    setShowBookmarksOnly,
  } = useMlCurriculum();

  // Navigation / View State
  const [activeView, setActiveView] = useState<'overview' | 'lesson' | 'quiz' | 'cheatSheet'>('overview');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Senior-grade shortcut listener (Capture phase + stopImmediatePropagation)
  // This intercepts Ctrl+K so the app-wide CommandPalette doesn't conflict on /ml
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl+K or Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setSpotlightOpen((prev) => !prev);
        return;
      }

      // 2. Press '/' when not inside an input/textarea
      if (e.key === '/' && !spotlightOpen) {
        const target = e.target as HTMLElement | null;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isInput) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setSpotlightOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // true = capture phase!
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [spotlightOpen]);

  // Active Lesson
  const activeLesson = useMemo(() => {
    if (!activeLessonId) return null;
    return allLessons.find((l) => l.id === activeLessonId) || null;
  }, [activeLessonId, allLessons]);

  // Current lesson index among all lessons for next/prev navigation
  const activeLessonIndex = useMemo(() => {
    if (!activeLessonId) return -1;
    return allLessons.findIndex((l) => l.id === activeLessonId);
  }, [activeLessonId, allLessons]);

  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setActiveView('lesson');
    setMobileSidebarOpen(false);
  };

  const handleNextLesson = () => {
    if (activeLessonIndex >= 0 && activeLessonIndex < allLessons.length - 1) {
      setActiveLessonId(allLessons[activeLessonIndex + 1].id);
    }
  };

  const handlePrevLesson = () => {
    if (activeLessonIndex > 0) {
      setActiveLessonId(allLessons[activeLessonIndex - 1].id);
    }
  };

  const handleToggleComplete = async (lessonId: string) => {
    const isCompleted = completedLessonIds.includes(lessonId);
    toggleLessonComplete(lessonId);
    if (!isCompleted) {
      try {
        await awardXP(50, `Mastered ML Concept: ${activeLesson?.title || 'Lesson'}`);
      } catch (e) {
        console.error('Failed to award gamification XP', e);
      }
    }
  };

  const handleSendFormulaToNotebook = (code: string) => {
    try {
      const STORAGE_NOTEBOOKS_KEY = 'studyquest_notebooks_cache_v1';
      const STORAGE_ACTIVE_KEY = 'studyquest_active_notebook_id_v1';

      const existingRaw = localStorage.getItem(STORAGE_NOTEBOOKS_KEY);
      let list: Notebook[] = [];
      if (existingRaw) {
        try {
          list = JSON.parse(existingRaw);
        } catch {
          list = [];
        }
      }

      const newNbId = `nb_formula_${Date.now()}`;
      const newNotebook: Notebook = {
        id: newNbId,
        title: 'Formula Lab: NumPy Verification',
        folderId: null,
        cells: [
          {
            id: `cell_md_${Date.now()}`,
            cell_type: 'markdown',
            source: '# Machine Learning Formula Lab\n\nVectorized NumPy verification and computational testbed.',
            execution_count: null,
            outputs: [],
            status: 'idle',
          },
          {
            id: `cell_code_${Date.now() + 1}`,
            cell_type: 'code',
            source: code,
            execution_count: null,
            outputs: [],
            status: 'idle',
          },
        ],
        metadata: {
          kernelspec: {
            display_name: 'Python 3 (Pyodide WASM)',
            language: 'python',
            name: 'python3',
          },
          language_info: {
            name: 'python',
            version: '3.11.0',
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_NOTEBOOKS_KEY, JSON.stringify([newNotebook, ...list]));
      localStorage.setItem(STORAGE_ACTIVE_KEY, newNbId);
      toast.success('Formula sent to Data Forge! Opening notebook...');
      router.push('/notebook');
    } catch {
      toast.error('Failed to launch notebook');
    }
  };

  const handleLaunchLabTemplate = (lab: MlLabTemplate) => {
    try {
      const STORAGE_NOTEBOOKS_KEY = 'studyquest_notebooks_cache_v1';
      const STORAGE_ACTIVE_KEY = 'studyquest_active_notebook_id_v1';

      const existingRaw = localStorage.getItem(STORAGE_NOTEBOOKS_KEY);
      let list: Notebook[] = [];
      if (existingRaw) {
        try {
          list = JSON.parse(existingRaw);
        } catch {
          list = [];
        }
      }

      const instanceId = `nb_lab_${lab.id}_${Date.now()}`;
      const labNotebook: Notebook = {
        ...lab.notebook,
        id: instanceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_NOTEBOOKS_KEY, JSON.stringify([labNotebook, ...list]));
      localStorage.setItem(STORAGE_ACTIVE_KEY, instanceId);
      toast.success(`Lab loaded: ${lab.title}! Opening Data Forge...`);
      router.push('/notebook');
    } catch {
      toast.error('Failed to launch lab');
    }
  };

  // Find the first unfinished lesson for quick resume
  const nextUpLesson = useMemo(() => {
    return allLessons.find((l) => !completedLessonIds.includes(l.id)) || allLessons[0];
  }, [allLessons, completedLessonIds]);

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-950 text-slate-100">
        {/* Desktop Collapsible Sidebar */}
        <div
          className={`hidden lg:block transition-all duration-300 ease-in-out flex-shrink-0 h-full overflow-hidden ${
            sidebarCollapsed ? 'w-0' : 'w-64 xl:w-72'
          }`}
        >
          <div className="w-64 xl:w-72 h-full">
            <MlSidebar
              tiers={tiers}
              allLessons={allLessons}
              activeLessonId={activeLessonId}
              completedLessonIds={completedLessonIds}
              bookmarkedLessonIds={bookmarkedLessonIds}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedTierId={selectedTierId}
              onSelectTierFilter={setSelectedTierId}
              showBookmarksOnly={showBookmarksOnly}
              onToggleBookmarksOnly={() => setShowBookmarksOnly((prev) => !prev)}
              onSelectLesson={handleSelectLesson}
              onOpenQuiz={() => setActiveView('quiz')}
              onOpenFormulaSheet={() => setActiveView('cheatSheet')}
              onOpenSpotlight={() => setSpotlightOpen(true)}
              onToggleCollapse={() => setSidebarCollapsed(true)}
              activeView={activeView === 'overview' ? 'lesson' : activeView}
            />
          </div>
        </div>

        {/* Mobile Sidebar Overlay Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-80 max-w-[85vw] h-full bg-slate-950 shadow-2xl z-10">
              <MlSidebar
                tiers={tiers}
                allLessons={allLessons}
                activeLessonId={activeLessonId}
                completedLessonIds={completedLessonIds}
                bookmarkedLessonIds={bookmarkedLessonIds}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedTierId={selectedTierId}
                onSelectTierFilter={setSelectedTierId}
                showBookmarksOnly={showBookmarksOnly}
                onToggleBookmarksOnly={() => setShowBookmarksOnly((prev) => !prev)}
                onSelectLesson={handleSelectLesson}
                onOpenQuiz={() => {
                  setActiveView('quiz');
                  setMobileSidebarOpen(false);
                }}
                onOpenFormulaSheet={() => {
                  setActiveView('cheatSheet');
                  setMobileSidebarOpen(false);
                }}
                onOpenSpotlight={() => {
                  setSpotlightOpen(true);
                  setMobileSidebarOpen(false);
                }}
                activeView={activeView === 'overview' ? 'lesson' : activeView}
                onCloseMobile={() => setMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0 relative">
          {/* Reopen Curriculum Sidebar Button (Desktop) */}
          {sidebarCollapsed && (
            <div className="hidden lg:flex items-center gap-2 p-2 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500 text-slate-200 hover:text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all group"
                title="Expand Curriculum Sidebar"
              >
                <HiChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                <span>Show Curriculum</span>
              </button>
              <span className="text-[11px] text-slate-500">
                Zen Reading Mode Active
              </span>
            </div>
          )}

          {/* Mobile Header Bar */}
          <div className="lg:hidden p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold"
            >
              <HiMenuAlt2 className="w-4 h-4" />
              <span>Curriculum</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSpotlightOpen(true)}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1"
                title="Search"
              >
                <HiSearch className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Search</span>
              </button>
              <button
                onClick={() => setActiveView('cheatSheet')}
                className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/60 text-purple-300 text-xs font-medium"
              >
                Formulas
              </button>
              <button
                onClick={() => {
                  setActiveLessonId(activeLessonId || allLessons[0]?.id || null);
                  setActiveView('lesson');
                }}
                className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 text-xs font-medium"
              >
                Notes
              </button>
            </div>
          </div>

          {/* VIEW ROUTER */}
          {activeView === 'cheatSheet' && (
            <MlFormulaSheet
              onBackToLessons={() => setActiveView('overview')}
              onSendToNotebook={handleSendFormulaToNotebook}
            />
          )}

          {activeView === 'quiz' && (
            <MlQuizViewer onBackToLessons={() => setActiveView('overview')} />
          )}

          {activeView === 'lesson' && activeLesson && (
            <MlLessonViewer
              lesson={activeLesson}
              isCompleted={completedLessonIds.includes(activeLesson.id)}
              isBookmarked={bookmarkedLessonIds.includes(activeLesson.id)}
              onToggleComplete={() => handleToggleComplete(activeLesson.id)}
              onToggleBookmark={() => toggleBookmark(activeLesson.id)}
              onNextLesson={activeLessonIndex < allLessons.length - 1 ? handleNextLesson : undefined}
              onPrevLesson={activeLessonIndex > 0 ? handlePrevLesson : undefined}
              onBackToCurriculum={() => setActiveView('overview')}
              isSidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
            />
          )}

          {/* DEFAULT / OVERVIEW DASHBOARD */}
          {(activeView === 'overview' || (!activeLesson && activeView === 'lesson')) && (
            <div className="max-w-6xl mx-auto py-8 px-4 sm:px-8 flex flex-col gap-8">
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-purple-950/60 border border-slate-800 p-6 sm:p-10 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col gap-4 max-w-3xl">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                      <HiAcademicCap className="w-4 h-4" />
                      StudyQuest Academy
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                      <HiFire className="w-4 h-4" />
                      +50 XP Per Lesson
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                    Machine Learning & Data Science Academy
                  </h1>

                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                    Master modern statistical modeling, mathematical derivations, ensemble algorithms, deep neural
                    architectures, and production MLOps through hands-on Python labs and interactive quizzes.
                  </p>

                  {/* Spotlight Search Trigger Bar */}
                  <button
                    onClick={() => setSpotlightOpen(true)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-850/90 border border-slate-700/80 hover:border-indigo-500/60 shadow-lg group transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 group-hover:text-indigo-300 transition-all">
                        <HiSearch className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                          Universal ML Spotlight Search
                        </span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          • Instant lookup across 1,070+ concepts, LaTeX formulas & labs
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                      <kbd className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold group-hover:border-slate-600 transition-colors">
                        Ctrl
                      </kbd>
                      <span>+</span>
                      <kbd className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold group-hover:border-slate-600 transition-colors">
                        K
                      </kbd>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {nextUpLesson && (
                      <button
                        onClick={() => handleSelectLesson(nextUpLesson.id)}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all"
                      >
                        <HiBookOpen className="w-4 h-4" />
                        <span>
                          {completedLessonIds.length > 0 ? 'Resume Lesson: ' : 'Start Academy: '}
                          {nextUpLesson.title}
                        </span>
                        <HiArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => setActiveView('cheatSheet')}
                      className="px-5 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-850 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-all shadow-md"
                    >
                      <HiSparkles className="w-4 h-4 text-purple-400" />
                      <span>Formula Sheet</span>
                    </button>

                    <button
                      onClick={() => setActiveView('quiz')}
                      className="px-5 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-850 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-all shadow-md"
                    >
                      <HiLightningBolt className="w-4 h-4 text-indigo-400" />
                      <span>Mastery Quiz</span>
                    </button>

                    <button
                      onClick={() => router.push('/notebook')}
                      className="px-5 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-850 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-all shadow-md ml-auto"
                    >
                      <HiTerminal className="w-4 h-4 text-emerald-400" />
                      <span>Data Forge Colab</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Curriculum Progress Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-medium">Mastered Lessons</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{completedLessonIds.length}</span>
                    <span className="text-xs text-slate-500 font-mono">/ {allLessons.length}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${progressMetrics.overallPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-medium">Curriculum Mastery</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-emerald-400">
                      {progressMetrics.overallPercentage}%
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2">7 Tiers • Beginner to Pro</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-medium">Bookmarked Topics</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-amber-400">
                      {bookmarkedLessonIds.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2">Quick review list</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-medium">Calculated XP Bonus</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-purple-400">
                      +{completedLessonIds.length * 50}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">XP</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2">Level up companion pets</span>
                </div>
              </div>

              {/* Curated Repository Foundation Badges */}
              <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/90 flex flex-col gap-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HiSparkles className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Curated from 4 Premier Open-Source Repositories
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">Gold-Standard Machine Learning Pedagogy</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <a
                    href="https://github.com/jakevdp/PythonDataScienceHandbook"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900/70 transition-all flex flex-col justify-between gap-2 group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-300 mb-1">
                        <span>Python Data Science</span>
                        <HiExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Jake VanderPlas’ O’Reilly classic: NumPy vectorization, Pandas wrangling, Scikit-Learn pipelines, SVM & PCA.
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">jakevdp / O’Reilly Media</span>
                  </a>

                  <a
                    href="https://github.com/bfortuner/ml-glossary"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-purple-500/50 hover:bg-slate-900/70 transition-all flex flex-col justify-between gap-2 group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-purple-300 mb-1">
                        <span>ML Glossary</span>
                        <HiExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Brendan Fortuner’s mathematical derivations, LaTeX formulas, and pure NumPy forward & backward prop.
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">bfortuner / ml-cheatsheet</span>
                  </a>

                  <a
                    href="https://github.com/microsoft/ML-For-Beginners"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-900/70 transition-all flex flex-col justify-between gap-2 group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1">
                        <span>ML For Beginners</span>
                        <HiExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Microsoft’s 12-week curriculum: practical classification, regression pipelines, clustering & ROC-AUC diagnostics.
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">microsoft / 26 Lessons</span>
                  </a>

                  <a
                    href="https://github.com/Zendin110206/ml-path-to-mastery"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-900/70 transition-all flex flex-col justify-between gap-2 group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
                        <span>Path to Mastery</span>
                        <HiExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Zendin’s math roadmap: Eigendecomposition, SVD, Gradient vectors, Jacobians & Hessian curvature.
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Zendin / Math for ML</span>
                  </a>
                </div>
              </div>

              {/* Interactive Hands-On Labs Section */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <HiCode className="w-5 h-5 text-emerald-400" />
                      <span>Interactive Python Labs (100% In-Browser)</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Pre-configured executable notebooks powered by Pyodide WebAssembly Python 3.11
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ML_LAB_TEMPLATES.map((lab) => (
                    <div
                      key={lab.id}
                      className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 shadow-lg group"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-semibold border border-slate-700">
                            {lab.author}
                          </span>
                          <span className="text-slate-400 font-mono">⏱ {lab.estimatedMinutes} mins</span>
                        </div>

                        <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {lab.title}
                        </h3>

                        <p className="text-xs text-slate-400 leading-relaxed">{lab.subtitle}</p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {lab.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <a
                          href={lab.sourceRepo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                        >
                          <span>View Source Repo</span>
                          <HiExternalLink className="w-3 h-3" />
                        </a>

                        <button
                          onClick={() => handleLaunchLabTemplate(lab)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all"
                        >
                          <HiTerminal className="w-3.5 h-3.5" />
                          <span>Launch Lab in Colab</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tiers Grid */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Curriculum Tiers</h2>
                    <p className="text-xs text-slate-400">
                      Sequential roadmap structured for algorithmic clarity and interview rigor
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tiers.map((tier) => {
                    const tierLessons = allLessons.filter((l) => l.tierId === tier.id);
                    const tierCompleted = tierLessons.filter((l) => completedLessonIds.includes(l.id)).length;
                    const tierProgress =
                      tierLessons.length > 0 ? Math.round((tierCompleted / tierLessons.length) * 100) : 0;

                    return (
                      <div
                        key={tier.id}
                        className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-4 shadow-lg group"
                      >
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{tier.icon || '📘'}</span>
                              <div>
                                <span className="text-[11px] uppercase font-bold text-indigo-400 tracking-wider">
                                  {tier.badge || `Tier ${tier.tierNumber}`}
                                </span>
                                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                                  {tier.title}
                                </h3>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-400">
                              {tierCompleted}/{tierLessons.length}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed">{tier.description}</p>

                          {/* Concepts chips preview */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {tier.concepts.map((concept) => (
                              <button
                                key={concept.id}
                                onClick={() => handleSelectLesson(concept.id)}
                                className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
                                  completedLessonIds.includes(concept.id)
                                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                                }`}
                              >
                                {concept.title.split(':')[0]}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tier progress bar */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-4">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                              style={{ width: `${tierProgress}%` }}
                            />
                          </div>
                          {tierLessons.length > 0 && (
                            <button
                              onClick={() => handleSelectLesson(tierLessons[0].id)}
                              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                              <span>Explore Tier</span>
                              <HiArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Universal ML Spotlight Search Modal */}
      <MlSpotlightSearch
        isOpen={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        onSelectLesson={handleSelectLesson}
        onSelectFormula={(formulaId) => {
          setActiveView('cheatSheet');
        }}
        onLaunchLab={handleLaunchLabTemplate}
      />
    </PageTransition>
  );
}
