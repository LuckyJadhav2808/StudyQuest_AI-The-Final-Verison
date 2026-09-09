'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  HiSearch,
  HiX,
  HiBookOpen,
  HiSparkles,
  HiTerminal,
  HiAcademicCap,
  HiExternalLink,
  HiDuplicate,
  HiCheck,
  HiArrowRight,
  HiTag,
  HiClock,
} from 'react-icons/hi';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import toast from 'react-hot-toast';

import { ALL_ML_LESSONS, ML_FORMULA_SHEET } from '@/data/mlCurriculumData';
import { ML_CONCEPTS, MlConcept } from '@/data/machineLearningConcepts';
import { ML_LAB_TEMPLATES, MlLabTemplate } from '@/data/mlNotebookTemplates';
import { MlLesson, MlFormulaItem } from '@/types/ml';

export type SearchTab = 'all' | 'lessons' | 'formulas' | 'glossary' | 'labs';

export type SearchResultItem =
  | { type: 'lesson'; data: MlLesson; id: string; title: string; subtitle: string; category: string }
  | { type: 'formula'; data: MlFormulaItem; id: string; title: string; subtitle: string; category: string }
  | { type: 'glossary'; data: MlConcept; id: string; title: string; subtitle: string; category: string }
  | { type: 'lab'; data: MlLabTemplate; id: string; title: string; subtitle: string; category: string };

interface MlSpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLesson: (lessonId: string) => void;
  onSelectFormula: (formulaId: string) => void;
  onLaunchLab: (lab: MlLabTemplate) => void;
}

export default function MlSpotlightSearch({
  isOpen,
  onClose,
  onSelectLesson,
  onSelectFormula,
  onLaunchLab,
}: MlSpotlightSearchProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedText, setCopiedText] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-focus input when opened, reset search, and lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
      setCopiedText(false);
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
      setActiveTab('all');
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Index all data
  const searchResults: SearchResultItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Lessons
    const lessonItems: SearchResultItem[] = ALL_ML_LESSONS.map((l) => ({
      type: 'lesson',
      id: l.id,
      title: l.title,
      subtitle: l.shortSummary,
      category: l.category,
      data: l,
    }));

    // 2. Formulas
    const formulaItems: SearchResultItem[] = ML_FORMULA_SHEET.map((f) => ({
      type: 'formula',
      id: f.id,
      title: f.title,
      subtitle: f.intuition,
      category: f.category,
      data: f,
    }));

    // 3. Labs
    const labItems: SearchResultItem[] = ML_LAB_TEMPLATES.map((lab) => ({
      type: 'lab',
      id: lab.id,
      title: lab.title,
      subtitle: `${lab.author} • ${lab.subtitle}`,
      category: 'Data Forge Lab',
      data: lab,
    }));

    // 4. 1,070 Q&A Concepts (Search first 1,070)
    const glossaryItems: SearchResultItem[] = ML_CONCEPTS.slice(0, 1070).map((c) => ({
      type: 'glossary',
      id: c.id,
      title: c.question,
      subtitle: c.answer,
      category: c.categories[0] || 'Concept',
      data: c,
    }));

    // Filter by Tab
    let pool: SearchResultItem[] = [];
    if (activeTab === 'lessons') pool = lessonItems;
    else if (activeTab === 'formulas') pool = formulaItems;
    else if (activeTab === 'labs') pool = labItems;
    else if (activeTab === 'glossary') pool = glossaryItems;
    else {
      // 'all' tab: balanced mix
      pool = [...lessonItems, ...formulaItems, ...labItems, ...glossaryItems];
    }

    if (!q) {
      // Return top curated suggestions when query is empty
      if (activeTab === 'all') {
        return [
          ...lessonItems.slice(0, 4),
          ...formulaItems.slice(0, 3),
          ...labItems.slice(0, 4),
          ...glossaryItems.slice(0, 4),
        ];
      }
      return pool.slice(0, 30);
    }

    // Filter by query
    const filtered = pool.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSub = item.subtitle.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      return matchTitle || matchSub || matchCat;
    });

    return filtered.slice(0, 40); // Cap at 40 items for snappy performance
  }, [query, activeTab]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= searchResults.length) {
      setSelectedIndex(Math.max(0, searchResults.length - 1));
    }
  }, [searchResults.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const activeEl = listEl.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const selectedItem = searchResults[selectedIndex] || null;

  // Execute primary action on current item
  const handleExecute = (item: SearchResultItem) => {
    if (item.type === 'lesson') {
      onSelectLesson(item.data.id);
      onClose();
    } else if (item.type === 'formula') {
      onSelectFormula(item.data.id);
      onClose();
    } else if (item.type === 'lab') {
      onLaunchLab(item.data);
      onClose();
    } else if (item.type === 'glossary') {
      navigator.clipboard.writeText(`${item.data.question}\n\n${item.data.answer}`);
      toast.success('Concept Q&A copied to clipboard!');
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedItem) {
        handleExecute(selectedItem);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Cycle tabs
      const tabs: SearchTab[] = ['all', 'lessons', 'formulas', 'glossary', 'labs'];
      const nextTab = tabs[(tabs.indexOf(activeTab) + 1) % tabs.length];
      setActiveTab(nextTab);
      setSelectedIndex(0);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    toast.success('Copied to clipboard!');
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 md:p-10 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden text-slate-100 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <HiSearch className="w-5 h-5 text-indigo-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search 1,000+ ML concepts, LaTeX equations, VanderPlas labs, algorithms..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 border-0 outline-none ring-0 focus:outline-none focus:ring-0 shadow-none p-0"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white mr-2"
            >
              <HiX className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-slate-400 select-none">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/30 overflow-x-auto text-xs scrollbar-none">
          {[
            { id: 'all', label: 'All Results', count: searchResults.length },
            { id: 'lessons', label: 'Curriculum Lessons', count: ALL_ML_LESSONS.length },
            { id: 'formulas', label: 'LaTeX Formulas', count: ML_FORMULA_SHEET.length },
            { id: 'glossary', label: '1,070 Concepts', count: 1070 },
            { id: 'labs', label: 'Python Labs', count: ML_LAB_TEMPLATES.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as SearchTab);
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className={`px-3 py-1 rounded-xl whitespace-nowrap font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Body: Split List & Inspector */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[360px] max-h-[550px]">
          {/* Results List */}
          <div
            ref={listRef}
            className="w-full md:w-1/2 overflow-y-auto border-r border-slate-800/80 p-2 space-y-1"
          >
            {searchResults.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <p>No concepts, equations, or labs match "{query}".</p>
                <p className="text-xs text-slate-500 mt-1">
                  Try searching for "overfitting", "sigmoid", "gradient", or "vanderplas".
                </p>
              </div>
            ) : (
              searchResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;

                let icon = <HiBookOpen className="w-4 h-4 text-indigo-400" />;
                let typeBadge = 'Lesson';
                let badgeColor = 'bg-indigo-950/80 text-indigo-300 border-indigo-800';

                if (item.type === 'formula') {
                  icon = <HiSparkles className="w-4 h-4 text-purple-400" />;
                  typeBadge = 'Formula';
                  badgeColor = 'bg-purple-950/80 text-purple-300 border-purple-800';
                } else if (item.type === 'glossary') {
                  icon = <HiAcademicCap className="w-4 h-4 text-sky-400" />;
                  typeBadge = 'Q&A Concept';
                  badgeColor = 'bg-sky-950/80 text-sky-300 border-sky-800';
                } else if (item.type === 'lab') {
                  icon = <HiTerminal className="w-4 h-4 text-emerald-400" />;
                  typeBadge = 'Colab Lab';
                  badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
                }

                return (
                  <div
                    key={`${item.type}_${item.id}`}
                    data-index={idx}
                    onClick={() => {
                      setSelectedIndex(idx);
                      handleExecute(item);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all flex items-start gap-3 select-none ${
                      isSelected
                        ? 'bg-slate-800/80 text-white border border-slate-700 shadow-md'
                        : 'text-slate-300 hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">{icon}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] px-2 py-0.2 rounded-full border font-bold ${badgeColor}`}>
                          {typeBadge}
                        </span>
                        <span className="text-xs font-semibold truncate text-white">
                          {item.title}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Detail Inspector (Desktop only) */}
          <div className="hidden md:flex md:w-1/2 flex-col p-6 bg-slate-950/60 overflow-y-auto">
            {selectedItem ? (
              <div className="flex flex-col justify-between h-full gap-4">
                <div className="flex flex-col gap-3">
                  {/* Category & Type header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-400">
                      {selectedItem.category}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {selectedItem.type.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-snug">
                    {selectedItem.title}
                  </h3>

                  {/* 1. LESSON PREVIEW */}
                  {selectedItem.type === 'lesson' && (
                    <div className="flex flex-col gap-3 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono">
                          {selectedItem.data.tierId.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {selectedItem.data.difficulty}
                        </span>
                        <span className="text-slate-400 font-mono flex items-center gap-1">
                          <HiClock className="w-3 h-3" />
                          {selectedItem.data.estimatedMinutes} mins
                        </span>
                      </div>

                      <p className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 leading-relaxed text-slate-300">
                        {selectedItem.data.shortSummary}
                      </p>

                      {selectedItem.data.tags && (
                        <div className="flex flex-wrap gap-1">
                          {selectedItem.data.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono flex items-center gap-1"
                            >
                              <HiTag className="w-2.5 h-2.5" />
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. FORMULA PREVIEW */}
                  {selectedItem.type === 'formula' && (
                    <div className="flex flex-col gap-3 text-xs">
                      <div
                        className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center text-slate-100 overflow-x-auto my-1"
                        dangerouslySetInnerHTML={{
                          __html: katex.renderToString(selectedItem.data.latex, {
                            displayMode: true,
                            throwOnError: false,
                          }),
                        }}
                      />

                      <p className="text-slate-300 leading-relaxed text-xs">
                        {selectedItem.data.intuition}
                      </p>

                      {selectedItem.data.variables && (
                        <div className="flex flex-col gap-1 text-[11px] pt-1">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            Variable Parameters:
                          </span>
                          {selectedItem.data.variables.map((v, idx) => (
                            <span key={idx} className="font-mono text-slate-300">
                              <strong className="text-purple-400">{v.name}</strong>: {v.meaning}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. GLOSSARY Q&A PREVIEW */}
                  {selectedItem.type === 'glossary' && (
                    <div className="flex flex-col gap-3 text-xs">
                      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 leading-relaxed max-h-56 overflow-y-auto">
                        <span className="font-bold text-sky-300 block mb-1">Answer & Explanation:</span>
                        {selectedItem.data.answer}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {selectedItem.data.categories.map((c, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400 font-mono"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. LAB PREVIEW */}
                  {selectedItem.type === 'lab' && (
                    <div className="flex flex-col gap-3 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-bold text-emerald-400">
                          {selectedItem.data.author}
                        </span>
                        <span className="text-slate-400 font-mono">
                          ⏱ {selectedItem.data.estimatedMinutes} mins
                        </span>
                      </div>

                      <p className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 leading-relaxed text-slate-300">
                        {selectedItem.data.subtitle}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {selectedItem.data.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Inspector Action Buttons */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                  {selectedItem.type === 'formula' && (
                    <button
                      onClick={() => handleCopyText(selectedItem.data.latex)}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
                    >
                      {copiedText ? (
                        <>
                          <HiCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied LaTeX</span>
                        </>
                      ) : (
                        <>
                          <HiDuplicate className="w-3.5 h-3.5" />
                          <span>Copy LaTeX</span>
                        </>
                      )}
                    </button>
                  )}

                  {selectedItem.type === 'glossary' && (
                    <button
                      onClick={() => handleCopyText(`${selectedItem.data.question}\n\n${selectedItem.data.answer}`)}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
                    >
                      {copiedText ? (
                        <>
                          <HiCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <HiDuplicate className="w-3.5 h-3.5" />
                          <span>Copy Q&A</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleExecute(selectedItem)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 ml-auto transition-all"
                  >
                    <span>
                      {selectedItem.type === 'lesson'
                        ? 'Open Curriculum Lesson'
                        : selectedItem.type === 'formula'
                        ? 'Inspect in Formula Sheet'
                        : selectedItem.type === 'lab'
                        ? 'Launch Lab in Colab'
                        : 'Copy Concept Answer'}
                    </span>
                    <HiArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                Select an item to view detailed notes and equations
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Keyboard Shortcuts Hint */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
                ↑
              </kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
                ↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
                ↵
              </kbd>{' '}
              Select Action
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
                TAB
              </kbd>{' '}
              Switch Category
            </span>
          </div>

          <span>1,070 Concepts Indexed</span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
