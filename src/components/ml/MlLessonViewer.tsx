'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  HiBookOpen,
  HiCode,
  HiAcademicCap,
  HiExclamationCircle,
  HiCheckCircle,
  HiBookmark,
  HiPlay,
  HiRefresh,
  HiDuplicate,
  HiCheck,
  HiExternalLink,
  HiArrowLeft,
  HiArrowRight,
  HiLightningBolt,
  HiChevronDown,
  HiChevronUp,
  HiDownload,
  HiEye,
  HiViewList,
  HiAdjustments,
} from 'react-icons/hi';
import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import toast from 'react-hot-toast';

import { MlLesson } from '@/types/ml';
import { pyodideBridge, ExecutionResponse } from '@/lib/pyodideBridge';
import { Notebook } from '@/types/notebook';

function renderMarkdownWithMath(markdown: string): string {
  if (!markdown) return '';
  try {
    // 1. Replace display math $$ ... $$
    let processed = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
      try {
        return `<div class="my-4 text-center overflow-x-auto py-3 px-4 rounded-xl bg-slate-950/90 border border-slate-800 text-indigo-300 shadow-inner">${katex.renderToString(
          tex.trim(),
          { displayMode: true, throwOnError: false }
        )}</div>`;
      } catch {
        return `$$${tex}$$`;
      }
    });

    // 2. Replace inline math $ ... $
    processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, tex) => {
      try {
        return `<span class="inline-block px-1 py-0.5 rounded bg-slate-800/80 text-indigo-300 font-mono text-[0.92em] mx-0.5">${katex.renderToString(
          tex.trim(),
          { displayMode: false, throwOnError: false }
        )}</span>`;
      } catch {
        return `$${tex}$`;
      }
    });

    return marked.parse(processed, { async: false }) as string;
  } catch {
    return markdown;
  }
}

function generateLessonMarkdown(lesson: MlLesson): string {
  let md = `# ${lesson.title}\n\n`;
  md += `**Category**: ${lesson.category} | **Difficulty**: ${lesson.difficulty} | **Est. Time**: ${lesson.estimatedMinutes} mins\n\n`;
  md += `> ${lesson.shortSummary}\n\n`;
  md += `---\n\n## 1. Theory & Intuition\n\n${lesson.theoryMarkdown}\n\n`;
  md += `---\n\n## 2. Mathematical Rigor & Derivations\n\n${lesson.deepDiveMarkdown}\n\n`;
  md += `---\n\n## 3. Python Implementation\n\n\`\`\`python\n${lesson.pythonCode}\n\`\`\`\n\n`;
  if (lesson.commonPitfalls && lesson.commonPitfalls.length > 0) {
    md += `---\n\n## 4. Production Pitfalls & Common Traps\n\n`;
    lesson.commonPitfalls.forEach((p, idx) => {
      md += `${idx + 1}. ${p}\n`;
    });
    md += `\n`;
  }
  if (lesson.interviewQuestions && lesson.interviewQuestions.length > 0) {
    md += `---\n\n## 5. FAANG Interview Questions & Model Answers\n\n`;
    lesson.interviewQuestions.forEach((qa, idx) => {
      md += `### Q${idx + 1}: ${qa.question}\n\n**Model Answer**:\n${qa.answer}\n\n`;
      if (qa.trapOrTip) {
        md += `> **Pro Tip / Common Trap**: ${qa.trapOrTip}\n\n`;
      }
    });
  }
  return md;
}

interface MlLessonViewerProps {
  lesson: MlLesson;
  isCompleted: boolean;
  isBookmarked: boolean;
  onToggleComplete: () => void;
  onToggleBookmark: () => void;
  onNextLesson?: () => void;
  onPrevLesson?: () => void;
  onBackToCurriculum: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

type TabType = 'all' | 'theory' | 'math' | 'code' | 'interview';
type FontSize = 'sm' | 'base' | 'lg';

export default function MlLessonViewer({
  lesson,
  isCompleted,
  isBookmarked,
  onToggleComplete,
  onToggleBookmark,
  onNextLesson,
  onPrevLesson,
  onBackToCurriculum,
  isSidebarCollapsed,
  onToggleSidebar,
}: MlLessonViewerProps) {
  const router = useRouter();

  // Reader Mode: 'all' (continuous textbook, default) or individual tab
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [copiedNotes, setCopiedNotes] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Live Pyodide runner state
  const [liveCode, setLiveCode] = useState(lesson.pythonCode);
  const [isRunning, setIsRunning] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<ExecutionResponse | null>(null);
  const [streamLogs, setStreamLogs] = useState<string[]>([]);
  const [expandedInterviewQ, setExpandedInterviewQ] = useState<number | null>(null);

  // Update liveCode when lesson changes
  useEffect(() => {
    setLiveCode(lesson.pythonCode);
    setExecutionOutput(null);
    setStreamLogs([]);
    setActiveTab('all');
  }, [lesson.id]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(liveCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success('Code copied to clipboard!');
  };

  const handleCopyAllNotes = () => {
    const md = generateLessonMarkdown(lesson);
    navigator.clipboard.writeText(md);
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
    toast.success('Complete study notes copied in Markdown!');
  };

  const handleDownloadNotes = () => {
    try {
      const md = generateLessonMarkdown(lesson);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${lesson.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Notes.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Notes downloaded as Markdown!');
    } catch {
      toast.error('Failed to download notes');
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setStreamLogs([]);
    setExecutionOutput(null);

    const cleanup = pyodideBridge.onStream((name, text) => {
      if (name === 'stderr' && (text.includes('non-GUI backend') || text.includes('currently using agg'))) {
        return;
      }
      setStreamLogs((prev) => [...prev, text]);
    });

    try {
      const resp = await pyodideBridge.executeCell(`lesson_${lesson.id}`, liveCode);
      setExecutionOutput(resp);
      if (resp.error) {
        toast.error('Execution encountered an error');
      } else {
        toast.success(`Executed in ${resp.executionTimeMs}ms!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Execution failed');
    } finally {
      cleanup();
    }
  };

  const handleLaunchInColab = () => {
    try {
      const STORAGE_NOTEBOOKS_KEY = 'studyquest_notebooks_cache_v1';
      const STORAGE_ACTIVE_KEY = 'studyquest_active_notebook_id_v1';

      const existingRaw = localStorage.getItem(STORAGE_NOTEBOOKS_KEY);
      let list: Notebook[] = [];
      if (existingRaw) {
        try {
          list = JSON.parse(existingRaw);
        } catch (e) {
          list = [];
        }
      }

      const newNbId = `nb_ml_${lesson.id}_${Date.now()}`;
      const newNotebook: Notebook = {
        id: newNbId,
        title: `ML Lab: ${lesson.title}`,
        folderId: null,
        cells: [
          {
            id: `cell_md_${Date.now()}`,
            cell_type: 'markdown',
            source: `# ${lesson.title}\n\n**Tier**: ${lesson.tierId} | **Category**: ${lesson.category} | **Difficulty**: ${lesson.difficulty}\n\n${lesson.theoryMarkdown}`,
            execution_count: null,
            outputs: [],
            status: 'idle',
          },
          {
            id: `cell_math_${Date.now() + 1}`,
            cell_type: 'markdown',
            source: `## Mathematical Rigor & Derivations\n\n${lesson.deepDiveMarkdown}`,
            execution_count: null,
            outputs: [],
            status: 'idle',
          },
          {
            id: `cell_code_${Date.now() + 2}`,
            cell_type: 'code',
            source: liveCode,
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

      const updatedList = [newNotebook, ...list];
      localStorage.setItem(STORAGE_NOTEBOOKS_KEY, JSON.stringify(updatedList));
      localStorage.setItem(STORAGE_ACTIVE_KEY, newNbId);

      toast.success('Notebook initialized! Opening Data Forge...');
      router.push('/notebook');
    } catch (err) {
      toast.error('Could not open notebook');
    }
  };

  const scrollToAnchor = (id: string) => {
    setActiveTab('all');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const fontClass = {
    sm: 'text-xs sm:text-sm leading-normal',
    base: 'text-sm sm:text-base leading-relaxed',
    lg: 'text-base sm:text-lg leading-loose',
  }[fontSize];

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8 pb-40 flex flex-col gap-5">
      {/* Top Header & Reader Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToCurriculum}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            <HiArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </button>

          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title={isSidebarCollapsed ? 'Show Curriculum Sidebar' : 'Hide Sidebar (Focus / Zen Mode)'}
              className={`p-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
                isSidebarCollapsed
                  ? 'bg-indigo-950/60 border-indigo-600/50 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <HiEye className="w-4 h-4" />
              <span className="hidden md:inline">
                {isSidebarCollapsed ? 'Show Sidebar' : 'Focus Mode'}
              </span>
            </button>
          )}
        </div>

        {/* Reader Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Font Size Adjuster */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setFontSize('sm')}
              title="Small Text"
              className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                fontSize === 'sm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('base')}
              title="Normal Text"
              className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                fontSize === 'base' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              title="Large Text"
              className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                fontSize === 'lg' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              A+
            </button>
          </div>

          {/* Copy All Notes */}
          <button
            onClick={handleCopyAllNotes}
            title="Copy Complete Notes as Markdown"
            className="p-1.5 px-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copiedNotes ? (
              <>
                <HiCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <HiDuplicate className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy Notes</span>
              </>
            )}
          </button>

          {/* Download Notes */}
          <button
            onClick={handleDownloadNotes}
            title="Download Notes (.md)"
            className="p-1.5 px-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <HiDownload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Bookmark Button */}
          <button
            onClick={onToggleBookmark}
            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Lesson'}
            className={`p-1.5 px-2.5 rounded-xl border text-xs flex items-center gap-1 transition-colors ${
              isBookmarked
                ? 'bg-amber-950/60 border-amber-600/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <HiBookmark className="w-3.5 h-3.5" />
          </button>

          {/* Mark Completed Button */}
          <button
            onClick={onToggleComplete}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isCompleted
                ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <HiCheckCircle
              className={`w-4 h-4 ${isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}
            />
            <span className="hidden sm:inline">{isCompleted ? 'Done' : 'Mark Done'}</span>
          </button>

          {/* Launch in Data Forge */}
          <button
            onClick={handleLaunchInColab}
            title="Open interactive sandbox in Data Forge"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1 transition-all"
          >
            <HiExternalLink className="w-3.5 h-3.5" />
            <span>Data Forge</span>
          </button>
        </div>
      </div>

      {/* Lesson Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800">
            {lesson.category}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full border ${
              lesson.difficulty === 'Beginner'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : lesson.difficulty === 'Intermediate'
                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                : 'bg-rose-950/80 text-rose-300 border-rose-800'
            }`}
          >
            {lesson.difficulty}
          </span>
          <span className="text-slate-400 font-mono">⏱ {lesson.estimatedMinutes} mins</span>
        </div>

        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          {lesson.title}
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
          {lesson.shortSummary}
        </p>
      </div>

      {/* Mode / Category Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <HiViewList className="w-3.5 h-3.5" />
            <span>📖 Full Notes (All-in-One)</span>
          </button>

          <button
            onClick={() => setActiveTab('theory')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'theory'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <HiBookOpen className="w-3.5 h-3.5" />
            <span>Intuition</span>
          </button>

          <button
            onClick={() => setActiveTab('math')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'math'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <HiAcademicCap className="w-3.5 h-3.5" />
            <span>Math Rigor</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'code'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <HiCode className="w-3.5 h-3.5" />
            <span>Python Lab</span>
          </button>

          <button
            onClick={() => setActiveTab('interview')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'interview'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <HiLightningBolt className="w-3.5 h-3.5" />
            <span>Interview Q&A</span>
          </button>
        </div>

        {/* Quick Outline Jump Pills in All-Notes Mode */}
        {activeTab === 'all' && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 overflow-x-auto">
            <span>Jump:</span>
            <button
              onClick={() => scrollToAnchor('sec-theory')}
              className="hover:text-indigo-400 hover:underline"
            >
              Theory
            </button>
            <span>•</span>
            <button
              onClick={() => scrollToAnchor('sec-math')}
              className="hover:text-purple-400 hover:underline"
            >
              Math
            </button>
            <span>•</span>
            <button
              onClick={() => scrollToAnchor('sec-code')}
              className="hover:text-emerald-400 hover:underline"
            >
              Code
            </button>
            <span>•</span>
            <button
              onClick={() => scrollToAnchor('sec-interview')}
              className="hover:text-amber-400 hover:underline"
            >
              Q&A
            </button>
          </div>
        )}
      </div>

      {/* CONTENT SECTIONS */}
      <div className="flex flex-col gap-8">
        {/* SECTION 1: THEORY & INTUITION */}
        {(activeTab === 'all' || activeTab === 'theory') && (
          <div id="sec-theory" className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                  1
                </span>
                <span>Theory & Core Intuition</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Mental models & engineering architecture
              </span>
            </div>

            <div className="p-5 sm:p-7 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div
                className={`prose prose-invert prose-indigo max-w-none text-slate-200 ${fontClass}`}
                dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(lesson.theoryMarkdown) }}
              />
            </div>
          </div>
        )}

        {/* SECTION 2: MATHEMATICAL RIGOR & DERIVATIONS */}
        {(activeTab === 'all' || activeTab === 'math') && (
          <div id="sec-math" className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
                <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">
                  2
                </span>
                <span>Mathematical Rigor & Derivations</span>
              </div>
              <span className="text-[11px] text-slate-500">
                LaTeX equations, proofs & vector calculus
              </span>
            </div>

            <div className="p-5 sm:p-7 rounded-2xl bg-slate-900 border border-purple-900/40 shadow-md">
              <div
                className={`prose prose-invert prose-purple max-w-none text-slate-200 ${fontClass}`}
                dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(lesson.deepDiveMarkdown) }}
              />
            </div>
          </div>
        )}

        {/* SECTION 3: PYTHON IMPLEMENTATION & LIVE PLAYGROUND */}
        {(activeTab === 'all' || activeTab === 'code') && (
          <div id="sec-code" className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                  3
                </span>
                <span>Python Implementation & Live Sandbox</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Interactive Pyodide WASM execution
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-slate-300">
                    Live In-Browser Sandbox (Python 3.12)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLiveCode(lesson.pythonCode)}
                    className="p-1.5 px-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
                    title="Reset to starter snippet"
                  >
                    <HiRefresh className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>

                  <button
                    onClick={handleCopyCode}
                    className="p-1.5 px-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <HiCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <HiDuplicate className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleRunCode}
                    disabled={isRunning}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                  >
                    {isRunning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Executing...</span>
                      </>
                    ) : (
                      <>
                        <HiPlay className="w-3.5 h-3.5" />
                        <span>Run Code Live</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Editable Code Box */}
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs">
                <textarea
                  value={liveCode}
                  onChange={(e) => setLiveCode(e.target.value)}
                  rows={12}
                  className="w-full p-4 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none resize-y leading-relaxed font-mono selection:bg-indigo-500/30"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-1">
                <span>
                  Tip: Edit any parameter above and click{' '}
                  <strong className="text-slate-300">Run Code Live</strong> to verify results.
                </span>
                <span>$0 Cloud Costs • 100% Client-Side WASM</span>
              </div>
            </div>

            {/* Live Outputs */}
            {(executionOutput || streamLogs.length > 0 || isRunning) && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Execution Output
                  </span>
                  {executionOutput && (
                    <span className="text-[11px] font-mono text-indigo-400">
                      Completed in {executionOutput.executionTimeMs}ms
                    </span>
                  )}
                </div>

                {/* Stdout Logs */}
                {streamLogs.length > 0 && (
                  <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800/80 max-h-60 overflow-y-auto">
                    {streamLogs.join('')}
                  </pre>
                )}

                {/* Error */}
                {executionOutput?.error && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 font-mono text-xs whitespace-pre-wrap">
                    {executionOutput.error}
                  </div>
                )}

                {/* Matplotlib Figures */}
                {executionOutput?.images && executionOutput.images.length > 0 && (
                  <div className="flex flex-col gap-3 items-center py-2">
                    {executionOutput.images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl overflow-hidden border border-slate-800 bg-white p-2 shadow-lg max-w-full"
                      >
                        <img
                          src={imgUrl}
                          alt={`Output figure ${idx + 1}`}
                          className="max-h-[450px] object-contain mx-auto"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: PRODUCTION PITFALLS & GOTCHAS */}
        {(activeTab === 'all' || activeTab === 'interview') && lesson.commonPitfalls?.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
                  4
                </span>
                <span>Production Gotchas & Common Pitfalls</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Real-world edge cases from Microsoft ML
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col gap-3">
              <ul className="space-y-2.5">
                {lesson.commonPitfalls.map((pitfall: string, idx: number) => (
                  <li
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs sm:text-sm text-slate-300 flex items-start gap-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      !
                    </span>
                    <span className="leading-relaxed">{pitfall}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* SECTION 5: FAANG INTERVIEW QUESTIONS */}
        {(activeTab === 'all' || activeTab === 'interview') && (
          <div id="sec-interview" className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                  5
                </span>
                <span>Top Interview Questions & Model Answers</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Interview-ready explanations
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col gap-3">
              <div className="space-y-3">
                {lesson.interviewQuestions.map((qa: { question: string; answer: string; trapOrTip?: string }, idx: number) => {
                  const isExpanded = expandedInterviewQ === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden transition-colors"
                    >
                      <button
                        onClick={() =>
                          setExpandedInterviewQ(isExpanded ? null : idx)
                        }
                        className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white transition-colors"
                      >
                        <span className="flex-1">
                          <strong className="text-indigo-400 mr-2">Q{idx + 1}.</strong>
                          {qa.question}
                        </span>
                        {isExpanded ? (
                          <HiChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        ) : (
                          <HiChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-4 pt-2 border-t border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed bg-indigo-950/20 space-y-2">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                              Model Answer
                            </div>
                            <p className="leading-relaxed">{qa.answer}</p>
                          </div>
                          {qa.trapOrTip && (
                            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                              <strong>💡 Pro Tip / Trap:</strong> {qa.trapOrTip}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Paging Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
        <button
          onClick={onPrevLesson}
          disabled={!onPrevLesson}
          className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <HiArrowLeft className="w-4 h-4" />
          <span>Previous Lesson</span>
        </button>

        <button
          onClick={onNextLesson}
          disabled={!onNextLesson}
          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Next Lesson</span>
          <HiArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
