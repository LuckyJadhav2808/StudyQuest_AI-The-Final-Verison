'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiX,
  HiPlay,
  HiCheckCircle,
  HiSparkles,
  HiCode,
  HiDocumentText,
  HiLightBulb,
  HiPencilAlt,
  HiBookOpen,
  HiRefresh,
  HiTerminal,
  HiClipboardCopy,
  HiCheck,
  HiExternalLink,
  HiArrowsExpand,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { marked } from 'marked';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import CodeEditor from '@/components/ui/CodeEditor';
import { DsaProblem, ProblemStatus } from '@/types/dsa';
import { executeCode } from '@/lib/codeRunner';
import { spawnXPFromEvent } from '@/components/gamification/FloatingXP';
import { playSuccess } from '@/lib/sounds';

interface DsaProblemDetailModalProps {
  problem: DsaProblem | null;
  userProgress?: {
    status?: ProblemStatus;
    userCode?: Record<string, string>;
    notes?: string;
  };
  onClose: () => void;
  onSetStatus: (problemId: string, status: ProblemStatus) => void;
  onSaveCode: (problemId: string, lang: string, code: string) => void;
  onSaveNotes: (problemId: string, notes: string) => void;
  onOpenAiAssistant: (problem: DsaProblem) => void;
}

type LeftTabMode = 'description' | 'approaches' | 'testcases' | 'notes';

export default function DsaProblemDetailModal({
  problem,
  userProgress,
  onClose,
  onSetStatus,
  onSaveCode,
  onSaveNotes,
  onOpenAiAssistant,
}: DsaProblemDetailModalProps) {
  const [currentProblem, setCurrentProblem] = useState<DsaProblem | null>(problem);
  const [isFetchingSolutions, setIsFetchingSolutions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftTabMode>('description');
  const [selectedLanguage, setSelectedLanguage] = useState<'javascript' | 'python' | 'java' | 'cpp'>('cpp');
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [activeApproachIdx, setActiveApproachIdx] = useState(0);
  const [notes, setNotes] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [mobileViewTab, setMobileViewTab] = useState<'problem' | 'editor'>('problem');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (problem) {
      setCurrentProblem(problem);
      document.body.style.overflow = 'hidden';
      const savedCode = userProgress?.userCode?.[selectedLanguage];
      setCode(savedCode || problem.templates[selectedLanguage] || '');
      setNotes(userProgress?.notes || '');
      setConsoleOutput('');
      setExecutionTime(null);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [problem, selectedLanguage, userProgress]);

  const handleFetchSolutions = async () => {
    if (!currentProblem) return;
    setIsFetchingSolutions(true);
    const toastId = toast.loading('Fetching full multi-language solutions from LeetCode...');
    try {
      const query = currentProblem.id || String(currentProblem.leetcodeId || '');
      const res = await fetch('/api/dsa/fetch-leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.success && data.problem) {
        setCurrentProblem(data.problem);
        toast.success(`✨ Loaded ${data.problem.approaches?.length || 1} full working solutions!`, { id: toastId });
      } else {
        toast.error(data.error || 'No additional community solutions found on LeetCode.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch solutions.', { id: toastId });
    } finally {
      setIsFetchingSolutions(false);
    }
  };

  if (!mounted || !problem || !currentProblem) return null;

  const handleLanguageChange = (lang: 'javascript' | 'python' | 'java' | 'cpp') => {
    setSelectedLanguage(lang);
    const savedCode = userProgress?.userCode?.[lang];
    setCode(savedCode || problem.templates[lang] || '');
  };

  const handleResetCode = () => {
    const defaultTemplate = problem.templates[selectedLanguage] || '';
    setCode(defaultTemplate);
    toast.success(`Reset code to default ${selectedLanguage.toUpperCase()} template.`);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setExecutionTime(null);
    setConsoleOutput('⏳ Compiling and executing code against test suite...');
    try {
      const sampleInput = problem.testCases?.[0]?.input || (problem.examples?.[0]?.input ? `${problem.examples[0].input}` : '');
      const methodNameHint = problem.id.replace(/-\w/g, (m) => m[1].toUpperCase());
      const res = await executeCode(code, selectedLanguage, sampleInput, methodNameHint);
      setExecutionTime(res.executionTimeMs ?? null);

      const cleanStdout = (res.stdout || '').trim();
      const cleanStderr = (res.stderr || '').trim();

      if (cleanStdout) {
        if (cleanStderr) {
          setConsoleOutput(`✅ Output:\n${cleanStdout}\n\n⚠️ Compiler Notes / Warnings:\n${cleanStderr}`);
        } else {
          setConsoleOutput(`✅ Output:\n${cleanStdout}`);
        }
      } else if (cleanStderr) {
        const isWarningOnly = cleanStderr.toLowerCase().includes('warning:') && !cleanStderr.toLowerCase().includes('error:');
        if (isWarningOnly) {
          setConsoleOutput(`✅ Code executed successfully.\n\n⚠️ Compiler Notes:\n${cleanStderr}`);
        } else {
          setConsoleOutput(`❌ Compilation / Runtime Error:\n${cleanStderr}`);
        }
      } else {
        setConsoleOutput('✅ Code executed successfully with zero runtime errors.');
      }
    } catch (e) {
      setConsoleOutput(`❌ Execution failed: ${(e as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleMarkSolved = (e?: React.MouseEvent) => {
    onSetStatus(problem.id, 'solved');
    if (code) {
      onSaveCode(problem.id, selectedLanguage, code);
    }
    spawnXPFromEvent(25, e);
    playSuccess();
    toast.success(`🎉 "${problem.title}" marked as Solved! +25 XP awarded.`);
  };

  const handleSavePersonalNotes = () => {
    onSaveNotes(problem.id, notes);
    toast.success('📝 Personal notes saved directly to your profile!');
  };

  const handleCopySolutionCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isSolved = userProgress?.status === 'solved';

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="w-full max-w-[1450px] h-[95vh] bg-[#0c0f17] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Top Header Bar */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2 sm:pr-4">
            <span className="text-lg sm:text-xl flex-shrink-0">⚔️</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-heading font-black text-white truncate">
                  {problem.leetcodeId ? `${problem.leetcodeId}. ` : ''}
                  {problem.title}
                </h2>
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
                <Badge variant="muted" size="sm" className="hidden sm:inline-flex">
                  {problem.pattern}
                </Badge>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono hidden sm:block">
                Category: {problem.category} • Pattern: {problem.pattern}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Toggle Code Editor Mode */}
            <button
              onClick={() => setShowCodeEditor(!showCodeEditor)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                showCodeEditor
                  ? 'bg-primary/20 border-primary text-primary-light'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <HiCode className="text-sm" />
              <span className="hidden sm:inline">{showCodeEditor ? 'Hide Editor' : 'Code Mode'}</span>
            </button>

            {/* Mark as Solved Button */}
            <button
              onClick={(e) => handleMarkSolved(e)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isSolved
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 hover:scale-105'
              }`}
            >
              <HiCheck className="text-base" />
              <span className="hidden sm:inline">{isSolved ? 'Solved' : 'Mark Solved'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-0.5 sm:ml-1"
              title="Close Workspace"
            >
              <HiX className="text-lg sm:text-xl" />
            </button>
          </div>
        </div>

        {/* Mobile Segmented View Switcher (When Editor is Active) */}
        {showCodeEditor && (
          <div className="lg:hidden flex items-center bg-slate-900 border-b border-slate-800 p-1.5 flex-shrink-0">
            <button
              onClick={() => setMobileViewTab('problem')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mobileViewTab === 'problem'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HiDocumentText className="text-sm" /> Problem & Solution
            </button>
            <button
              onClick={() => setMobileViewTab('editor')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mobileViewTab === 'editor'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HiCode className="text-sm" /> Code Editor
            </button>
          </div>
        )}

        {/* Workspace Body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {showCodeEditor ? (
            /* 2-Column Interactive Coding Mode */
            <div className="grid grid-cols-1 lg:grid-cols-12 h-full min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              
              {/* Left Column: Problem Details & Solutions (5 Cols on Desktop) */}
              <div className={`${mobileViewTab === 'problem' ? 'flex' : 'hidden'} lg:flex lg:col-span-5 flex-col h-full overflow-hidden bg-slate-900/30`}>
                <div className="flex items-center gap-1 px-3 pt-2 border-b border-slate-800 bg-slate-900/50 flex-shrink-0 overflow-x-auto">
                  <button
                    onClick={() => setActiveLeftTab('description')}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      activeLeftTab === 'description'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HiDocumentText className="text-sm" />
                    Statement
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('approaches')}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      activeLeftTab === 'approaches'
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HiLightBulb className="text-sm" />
                    Solutions ({problem.approaches?.length || 1})
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('testcases')}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      activeLeftTab === 'testcases'
                        ? 'border-teal text-teal'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HiCode className="text-sm" />
                    Test Cases
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('notes')}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      activeLeftTab === 'notes'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HiPencilAlt className="text-sm" />
                    Notes
                  </button>
                </div>

                <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs text-slate-200">
                  {activeLeftTab === 'description' && renderProblemStatement(currentProblem)}
                  {activeLeftTab === 'approaches' && renderApproaches(
                    currentProblem,
                    selectedLanguage,
                    activeApproachIdx,
                    setActiveApproachIdx,
                    (c) => setCode(c),
                    copiedCode,
                    handleCopySolutionCode,
                    handleFetchSolutions,
                    isFetchingSolutions
                  )}
                  {activeLeftTab === 'testcases' && renderTestCases(currentProblem)}
                  {activeLeftTab === 'notes' && renderNotes(notes, setNotes, handleSavePersonalNotes)}
                </div>
              </div>

              {/* Right Column: Code Editor & Execution Console (7 Cols on Desktop) */}
              <div className={`${mobileViewTab === 'editor' ? 'flex' : 'hidden'} lg:flex lg:col-span-7 flex-col h-full overflow-hidden bg-[#090b11]`}>
                {/* Language Toolbar & Run Actions */}
                <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Language:
                      </span>
                      <select
                        value={selectedLanguage}
                        onChange={(e) =>
                          handleLanguageChange(e.target.value as any)
                        }
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="cpp">C++ (GCC STL)</option>
                        <option value="java">Java (OpenJDK)</option>
                        <option value="python">Python 3</option>
                        <option value="javascript">JavaScript (Node)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleResetCode}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Reset to Template"
                    >
                      <HiRefresh className="text-sm" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRunCode}
                      loading={isRunning}
                      icon={<HiPlay className="text-emerald-300" />}
                    >
                      Run Code
                    </Button>
                  </div>
                </div>

                {/* Monaco Code Editor */}
                <div className="flex-1 min-h-0 relative overflow-hidden bg-[#090b11]">
                  <CodeEditor
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    language={
                      selectedLanguage === 'cpp'
                        ? 'cpp'
                        : selectedLanguage === 'java'
                        ? 'java'
                        : selectedLanguage === 'python'
                        ? 'python'
                        : 'javascript'
                    }
                    minHeight="100%"
                  />
                </div>

                {/* Console Output Drawer */}
                <div className="h-44 border-t border-slate-800 bg-black/90 p-3 font-mono text-xs flex flex-col flex-shrink-0">
                  <div className="flex items-center justify-between text-slate-400 pb-1.5 mb-1.5 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-300">
                        <HiTerminal className="text-primary text-sm" />
                        Terminal Output Console
                      </span>
                      {executionTime !== null && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono font-bold text-emerald-400">
                          ⚡ {executionTime} ms
                        </span>
                      )}
                    </div>
                    {consoleOutput && (
                      <button
                        onClick={() => {
                          setConsoleOutput('');
                          setExecutionTime(null);
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto text-emerald-400 whitespace-pre-wrap text-[11px] leading-relaxed">
                    {consoleOutput ||
                      '// Click "Run Code" to compile and execute your solution.'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Full-Width Study & Solution Breakdown Mode (Default) */
            <div className="h-full flex flex-col overflow-hidden bg-slate-900/20">
              {/* Study Mode Navigation Tabs */}
              <div className="flex items-center justify-between px-6 pt-3 border-b border-slate-800 bg-slate-900/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveLeftTab('description')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeLeftTab === 'description'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HiDocumentText className="text-sm" />
                    Problem Statement & Intuition
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('approaches')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeLeftTab === 'approaches'
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HiLightBulb className="text-sm" />
                    Solutions & Step-by-Step Logic ({problem.approaches?.length || 1})
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('testcases')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeLeftTab === 'testcases'
                        ? 'border-teal text-teal'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HiCode className="text-sm" />
                    Predefined Test Cases
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('notes')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeLeftTab === 'notes'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HiPencilAlt className="text-sm" />
                    My Notes & Edge Cases
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCodeEditor(true)}
                  icon={<HiPlay className="text-emerald-400" />}
                >
                  Write & Run Code →
                </Button>
              </div>

              {/* Study Mode Content Area */}
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-5xl mx-auto w-full space-y-6 text-sm text-slate-200">
                {activeLeftTab === 'description' && renderProblemStatement(currentProblem)}
                {activeLeftTab === 'approaches' && renderApproaches(
                  currentProblem,
                  selectedLanguage,
                  activeApproachIdx,
                  setActiveApproachIdx,
                  (c) => { setCode(c); setShowCodeEditor(true); },
                  copiedCode,
                  handleCopySolutionCode,
                  handleFetchSolutions,
                  isFetchingSolutions
                )}
                {activeLeftTab === 'testcases' && renderTestCases(currentProblem)}
                {activeLeftTab === 'notes' && renderNotes(notes, setNotes, handleSavePersonalNotes)}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

function formatProblemDescription(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']');

  // Format Example and Constraint section headers for clean presentation
  cleaned = cleaned.replace(/\*\*(Example \d+:?)\*\*/gi, '\n\n### $1\n');
  cleaned = cleaned.replace(/\*\*(Constraints:?)\*\*/gi, '\n\n### $1\n');

  try {
    return marked.parse(cleaned, { gfm: true, breaks: true }) as string;
  } catch {
    return cleaned;
  }
}

function renderProblemStatement(problem: DsaProblem) {
  const descLower = (problem.description || '').toLowerCase();
  const hasEmbeddedExamples = descLower.includes('example 1') || descLower.includes('input:');
  const hasEmbeddedConstraints = descLower.includes('constraint');

  return (
    <div className="space-y-6">
      {/* Problem Statement Explanation Banner */}
      {problem.statementExplanation && (
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider">
            <HiBookOpen className="text-base" />
            Plain-English Intuition & Summary
          </div>
          <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
            {problem.statementExplanation}
          </p>
        </div>
      )}

      {/* Problem Breakdown Strategy */}
      {problem.problemBreakdown && problem.problemBreakdown.length > 0 && (
        <div className="bg-slate-800/40 p-4 rounded-xl space-y-2.5 border border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Algorithmic Breakdown & Goals
          </h4>
          <ul className="space-y-2 text-slate-300 font-medium text-xs sm:text-sm">
            {problem.problemBreakdown.map((pt, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rich Formatted Description */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Problem Description & Examples
        </h4>
        <div
          className="dsa-markdown-body bg-slate-900/60 border border-slate-800 p-5 rounded-xl text-slate-200 text-xs sm:text-sm"
          dangerouslySetInnerHTML={{ __html: formatProblemDescription(problem.description) }}
        />
      </div>

      {/* Fallback Examples Section only if not already in markdown */}
      {!hasEmbeddedExamples && problem.examples && problem.examples.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Examples & Walkthroughs
          </h4>
          {problem.examples.map((ex, idx) => (
            <div
              key={idx}
              className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs"
            >
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">Input:</span>
                <span className="text-slate-300">{ex.input}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">Output:</span>
                <span className="text-slate-300">{ex.output}</span>
              </div>
              {ex.explanation && (
                <div className="text-slate-400 font-sans text-xs pt-2 border-t border-slate-800">
                  <strong className="text-slate-300">Explanation: </strong>
                  {ex.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fallback Constraints Section only if not already in markdown */}
      {!hasEmbeddedConstraints && problem.constraints && problem.constraints.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Constraints & Boundaries
          </h4>
          <ul className="list-disc list-inside bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-slate-400 font-mono space-y-1 text-xs">
            {problem.constraints.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function renderApproaches(
  problem: DsaProblem,
  selectedLanguage: 'cpp' | 'java' | 'python' | 'javascript',
  approachIdx: number,
  setApproachIdx: (idx: number) => void,
  onLoadCode: (code: string) => void,
  copied: boolean,
  onCopy: (code: string) => void,
  onRefreshSolutions: () => void,
  isRefreshing: boolean
) {
  const approaches = problem.approaches || [];
  const currentApproach = approaches[approachIdx] || approaches[0];

  if (!currentApproach) {
    return <div className="text-slate-400">No solution walkthrough available for this question.</div>;
  }

  const rawCode = currentApproach.code[selectedLanguage] || currentApproach.code['cpp'] || '';
  const solutionCode = rawCode
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '    ')
    .replace(/\\r/g, '')
    .replace(/^\[\]\s*\n*/, '')
    .trim();

  const intuitionText = (currentApproach.intuition || '')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const explanationSteps = (currentApproach.explanation || []).map((step) =>
    step.replace(/\\n/g, ' ').replace(/\\r/g, '').replace(/\s+/g, ' ').trim()
  );

  const sampleTestCase = (problem.testCases?.[0] || problem.examples?.[0]) as any;
  const sampleInput = (sampleTestCase && 'input' in sampleTestCase ? sampleTestCase.input : '') || 'Sample Input';
  const sampleOutput = (sampleTestCase && 'expectedOutput' in sampleTestCase ? sampleTestCase.expectedOutput : sampleTestCase && 'output' in sampleTestCase ? sampleTestCase.output : '') || 'Sample Output';

  return (
    <div className="space-y-6">
      {/* Approach Switcher Tabs & Live Fetch Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          {approaches.map((app, idx) => (
            <button
              key={idx}
              onClick={() => setApproachIdx(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                approachIdx === idx
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {app.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshSolutions}
            disabled={isRefreshing}
            className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
            title="Fetch full working solutions from LeetCode live"
          >
            <HiSparkles className={isRefreshing ? 'animate-spin text-amber-300' : 'text-amber-300'} />
            {isRefreshing ? 'Fetching...' : '⚡ Fetch Fresh Solutions'}
          </button>
          <Badge variant="pink" size="sm">
            ⏱️ Time: {currentApproach.timeComplexity}
          </Badge>
          <Badge variant="muted" size="sm">
            💾 Space: {currentApproach.spaceComplexity}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* Core Intuition & Strategy Card */}
        <div className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-purple-400 uppercase tracking-wider">
            <HiLightBulb className="text-base" />
            Core Intuition & Algorithmic Strategy
          </div>
          <p className="text-slate-200 leading-relaxed text-xs sm:text-sm">
            {intuitionText}
          </p>
        </div>

        {/* Step-by-Step Logic Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <HiBookOpen className="text-primary" />
              Step-by-Step Execution Logic
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {explanationSteps.length} Key Milestones
            </span>
          </div>

          <div className="space-y-2.5">
            {explanationSteps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-mono font-bold text-xs">
                  {idx + 1}
                </span>
                <p className="text-slate-300 leading-relaxed text-xs sm:text-sm pt-0.5">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Test Case Walkthrough Box */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 uppercase tracking-wider text-[11px]">
              <HiCheck className="text-sm" />
              Test Case Verification Trace
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Sample Trace</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-2.5 bg-black/40 rounded-lg border border-slate-800/80">
              <span className="text-primary font-bold block mb-1">Input Given:</span>
              <span className="text-slate-300 break-all">{sampleInput}</span>
            </div>
            <div className="p-2.5 bg-black/40 rounded-lg border border-slate-800/80">
              <span className="text-emerald-400 font-bold block mb-1">Expected Output:</span>
              <span className="text-slate-300 break-all">{sampleOutput}</span>
            </div>
          </div>
        </div>

        {/* Multi-Language Solution Code */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {selectedLanguage.toUpperCase()} Solution Code
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopy(solutionCode)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copied ? <HiCheck className="text-emerald-400" /> : <HiClipboardCopy />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>
              <button
                onClick={() => onLoadCode(solutionCode)}
                className="text-xs text-primary font-bold px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer flex items-center gap-1"
              >
                Open in Code Editor →
              </button>
            </div>
          </div>
          <pre className="p-4 bg-black/80 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed max-h-96">
            {solutionCode || '// Solution template not provided for this language.'}
          </pre>
        </div>
      </div>
    </div>
  );
}

function renderTestCases(problem: DsaProblem) {
  const testCases = problem.testCases && problem.testCases.length > 0 ? problem.testCases : [
    { id: 1, input: 'Standard Input Parameters', expectedOutput: 'Expected Result' }
  ];

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-xs sm:text-sm">
        Predefined verification test cases for this challenge:
      </p>
      <div className="space-y-3">
        {testCases.map((tc) => (
          <div key={tc.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold">Test Case #{tc.id}</span>
              <Badge variant="teal" size="sm">Verification</Badge>
            </div>
            <div>
              <span className="text-primary font-bold">Input: </span>
              <span className="text-slate-300">{tc.input}</span>
            </div>
            <div>
              <span className="text-emerald-400 font-bold">Expected Output: </span>
              <span className="text-slate-300">{tc.expectedOutput}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderNotes(
  notes: string,
  setNotes: (val: string) => void,
  onSave: () => void
) {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-xs sm:text-sm">
        Personal notes and edge-case reminders for this problem (auto-synced to your cloud profile):
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write key edge cases, tricky pointer conditions, recursion base conditions, or revision tips..."
        className="w-full h-64 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-mono">
          {notes.length} characters
        </span>
        <Button variant="primary" size="sm" onClick={onSave}>
          Save Notes 💾
        </Button>
      </div>
    </div>
  );
}
