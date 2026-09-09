'use client';

import React, { useState } from 'react';
import {
  HiSearch,
  HiDuplicate,
  HiCheck,
  HiSparkles,
  HiCode,
  HiBookOpen,
} from 'react-icons/hi';
import katex from 'katex';
import { ML_FORMULA_SHEET } from '@/data/mlCurriculumData';
import { MlFormulaItem } from '@/types/ml';

interface MlFormulaSheetProps {
  onBackToLessons: () => void;
  onSendToNotebook?: (code: string) => void;
}

export default function MlFormulaSheet({
  onBackToLessons,
  onSendToNotebook,
}: MlFormulaSheetProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formulas: MlFormulaItem[] = ML_FORMULA_SHEET;

  const categories = [
    { id: 'all', label: 'All Equations' },
    { id: 'Supervised Learning', label: 'Supervised' },
    { id: 'Ensembles & Trees', label: 'Ensembles' },
    { id: 'Unsupervised Learning', label: 'Unsupervised' },
    { id: 'Deep Learning', label: 'Deep Learning' },
    { id: 'Transformers & GenAI', label: 'Transformers & LLMs' },
    { id: 'Evaluation Metrics', label: 'Metrics' },
  ];

  const filteredFormulas = formulas.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.intuition.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.latex.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopyLatex = (item: MlFormulaItem) => {
    navigator.clipboard.writeText(item.latex);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderKatex = (latex: string) => {
    try {
      return (
        <div
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(latex, {
              displayMode: true,
              throwOnError: false,
            }),
          }}
        />
      );
    } catch (e) {
      return <div className="font-mono text-xs text-amber-300">{latex}</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <HiSparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Machine Learning Formula & Architecture Reference
              </h1>
              <p className="text-xs text-slate-400">
                Mathematical formulations, intuition, variable breakdowns, and vectorized NumPy implementations
              </p>
            </div>
          </div>

          <button
            onClick={onBackToLessons}
            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            ← Back to Lessons
          </button>
        </div>

        {/* Controls: Search and Category Pills */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by equation name, symbol, or term (e.g., Attention, Gini, Softmax)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Formulas Grid */}
      <div className="space-y-4">
        {filteredFormulas.map((formula) => {
          const isCopied = copiedId === formula.id;

          return (
            <div
              key={formula.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-md flex flex-col gap-4 hover:border-slate-700 transition-colors"
            >
              {/* Formula Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-slate-700">
                      {formula.category}
                    </span>
                    <h3 className="text-base font-bold text-white">{formula.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {formula.intuition}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleCopyLatex(formula)}
                    title="Copy LaTeX string"
                    className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <HiCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 text-[11px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <HiDuplicate className="w-3.5 h-3.5" />
                        <span className="text-[11px]">LaTeX</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* KaTeX Math Box */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center text-slate-100 overflow-x-auto my-1">
                {renderKatex(formula.latex)}
              </div>

              {/* Variables breakdown */}
              {formula.variables && formula.variables.length > 0 && (
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {formula.variables.map((v: { name: string; meaning: string }, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 font-mono"
                    >
                      <strong className="text-purple-400">{v.name}</strong>: {v.meaning}
                    </span>
                  ))}
                </div>
              )}

              {/* Code Snippet */}
              {formula.pythonSnippet && (
                <div className="rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950">
                  <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono flex items-center gap-1.5 text-indigo-300">
                      <HiCode className="w-3.5 h-3.5" />
                      NumPy Vectorized Implementation
                    </span>
                    {onSendToNotebook && (
                      <button
                        onClick={() => onSendToNotebook(formula.pythonSnippet!)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        Run in Notebook →
                      </button>
                    )}
                  </div>
                  <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
                    <code>{formula.pythonSnippet}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}

        {filteredFormulas.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
            No mathematical formulas matched "{search}".
          </div>
        )}
      </div>
    </div>
  );
}
