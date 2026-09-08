/**
 * StudyQuest AI — Data Science Recipes & Snippet Palette Modal
 * Browse, search, preview, and insert battle-tested Python templates.
 */

'use client';

import React, { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { NOTEBOOK_RECIPES, NotebookRecipe } from '@/data/notebookRecipes';
import { HiSearch, HiSparkles, HiPlus, HiClipboardCopy, HiCheck, HiCode } from 'react-icons/hi';
import toast from 'react-hot-toast';

interface RecipesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertRecipe: (code: string) => void;
}

type RecipeCategory = 'all' | 'cleaning' | 'visualization' | 'ml';

export default function RecipesModal({
  isOpen,
  onClose,
  onInsertRecipe,
}: RecipesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory>('all');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(NOTEBOOK_RECIPES[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter recipes based on category and search query
  const filteredRecipes = useMemo(() => {
    return NOTEBOOK_RECIPES.filter((recipe) => {
      const matchesCategory =
        selectedCategory === 'all' || recipe.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        recipe.title.toLowerCase().includes(q) ||
        recipe.description.toLowerCase().includes(q) ||
        recipe.tags.some((t) => t.toLowerCase().includes(q));

      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  const activeRecipe = useMemo(() => {
    return (
      NOTEBOOK_RECIPES.find((r) => r.id === expandedRecipeId) ||
      filteredRecipes[0] ||
      null
    );
  }, [expandedRecipeId, filteredRecipes]);

  const handleCopyCode = (recipe: NotebookRecipe) => {
    navigator.clipboard.writeText(recipe.code);
    setCopiedId(recipe.id);
    toast.success('Code copied to clipboard! 📋');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsert = (recipe: NotebookRecipe) => {
    onInsertRecipe(recipe.code);
    toast.success(`Inserted "${recipe.title}" recipe! 🚀`);
    onClose();
  };

  const categories: { key: RecipeCategory; label: string; icon: string }[] = [
    { key: 'all', label: 'All Recipes', icon: '⚡' },
    { key: 'cleaning', label: 'Data Cleaning', icon: '🧹' },
    { key: 'visualization', label: 'EDA & Plots', icon: '📊' },
    { key: 'ml', label: 'Machine Learning', icon: '🤖' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Science Recipes & Snippet Palette"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Header Intro */}
        <p className="text-xs text-text-secondary">
          Ready-to-run, battle-tested Python code templates for fast data science, analysis, and ML workflows.
        </p>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-72">
            <HiSearch className="absolute left-3 top-2.5 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search recipes (e.g. heatmap, outliers, random forest)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-background-light border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.key
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-background-light text-text-secondary hover:text-text-primary hover:bg-border/40'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Split Grid: Left Recipe List + Right Code Preview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[420px]">
          {/* Left: Recipe Cards List */}
          <div className="md:col-span-5 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredRecipes.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-xs">
                No recipes matching your search query.
              </div>
            ) : (
              filteredRecipes.map((recipe) => {
                const isSelected = activeRecipe?.id === recipe.id;
                return (
                  <div
                    key={recipe.id}
                    onClick={() => setExpandedRecipeId(recipe.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-background-light hover:border-primary/40 hover:bg-background-light/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-primary' : 'text-text-primary'
                        }`}
                      >
                        {recipe.title}
                      </h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-background border border-border text-text-muted shrink-0">
                        {recipe.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary line-clamp-2 mb-2 leading-relaxed">
                      {recipe.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 bg-background/60 text-text-muted rounded-md"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Code Preview & Insert Actions */}
          <div className="md:col-span-7 flex flex-col bg-slate-950 border border-border rounded-xl overflow-hidden shadow-inner">
            {activeRecipe ? (
              <>
                {/* Preview Header */}
                <div className="px-4 py-2.5 bg-slate-900 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HiCode className="text-primary" size={16} />
                    <span className="text-xs font-bold text-white truncate">
                      {activeRecipe.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyCode(activeRecipe)}
                      className="px-2.5 py-1 text-xs text-text-secondary hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center gap-1 transition-colors"
                      title="Copy Code"
                    >
                      {copiedId === activeRecipe.id ? (
                        <>
                          <HiCheck className="text-emerald-400" size={13} />
                          <span className="text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <HiClipboardCopy size={13} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleInsert(activeRecipe)}
                      icon={<HiPlus size={14} />}
                    >
                      Insert Cell
                    </Button>
                  </div>
                </div>

                {/* Code Preview Body */}
                <div className="flex-1 p-3 overflow-auto font-mono text-[11px] text-emerald-300 leading-relaxed custom-scrollbar selection:bg-primary/30">
                  <pre className="whitespace-pre">{activeRecipe.code}</pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-muted text-xs">
                Select a recipe to preview code.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
