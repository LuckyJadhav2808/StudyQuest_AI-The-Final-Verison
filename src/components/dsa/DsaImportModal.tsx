'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiX,
  HiDownload,
  HiSparkles,
  HiLightningBolt,
  HiCheckCircle,
  HiExternalLink,
  HiClipboardCopy,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { DsaProblem } from '@/types/dsa';

interface DsaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (problem: DsaProblem) => void;
  onImportProblem: (query: string) => Promise<DsaProblem>;
}

export default function DsaImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  onImportProblem,
}: DsaImportModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const quickSamples = [
    { label: '#3471 Almost Missing', query: '3471' },
    { label: '#3472 Longest Palindrome Subsequence', query: '3472' },
    { label: '#3461 Check If Digits Equal', query: '3461' },
    { label: 'Two Sum URL', query: 'https://leetcode.com/problems/two-sum/' },
  ];

  const handleImport = async (targetQuery?: string) => {
    const q = (targetQuery || query).trim();
    if (!q) {
      toast.error('Please enter a LeetCode problem number, slug, or URL.');
      return;
    }

    setLoading(true);
    setStatusMessage('Connecting to LeetCode GraphQL server...');

    try {
      setTimeout(() => setStatusMessage('Fetching statement, hints & code templates...'), 400);
      setTimeout(() => setStatusMessage('Extracting multi-language solutions...'), 800);
      setTimeout(() => setStatusMessage('Broadcasting to Global Shared Cloud Dataset...'), 1200);

      const problem = await onImportProblem(q);
      toast.success(
        `✨ Ingested #${problem.leetcodeId ? `${problem.leetcodeId} ` : ''}${problem.title}!\n💾 Saved to your library & synced to the main global dataset for all users.`,
        { duration: 5000 }
      );
      onImportSuccess(problem);
      setQuery('');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to import problem from LeetCode.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setQuery(text);
        toast.success('Pasted from clipboard! 📋');
      }
    } catch {
      toast.error('Clipboard permission denied');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📥 Ingest Any LeetCode Problem" maxWidth="max-w-xl">
      <div className="space-y-5">
        {/* Header explanation banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-teal/10 border border-primary/20 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <HiSparkles className="text-base animate-pulse text-amber-400" />
            Universal On-Demand Ingestion Engine
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Enter <strong>any LeetCode problem number (e.g. 3471)</strong>, slug, or full URL. StudyQuest will fetch the problem statement, test cases, C++/Java/Python/JS starter templates, and community solutions live from LeetCode.
          </p>
        </div>

        {/* Query Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>LeetCode URL / Problem Number / Slug</span>
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <HiClipboardCopy size={12} /> Paste Clipboard
            </button>
          </label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleImport();
              }}
              placeholder="e.g. 3471, or https://leetcode.com/problems/find-the-largest-almost-missing-integer/"
              disabled={loading}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary transition-all font-mono shadow-inner"
            />
          </div>
        </div>

        {/* Quick Sample Buttons */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Quick Ingest 2025/2026 Contest Questions:
          </span>
          <div className="flex flex-wrap gap-2">
            {quickSamples.map((sample) => (
              <button
                key={sample.query}
                type="button"
                onClick={() => {
                  setQuery(sample.query);
                  handleImport(sample.query);
                }}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-[11px] font-semibold text-slate-300 hover:text-white border border-slate-700/60 hover:border-primary/40 transition-all cursor-pointer flex items-center gap-1"
              >
                <HiLightningBolt className="text-amber-400" size={12} />
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ingestion Loading Status */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-3 text-xs text-purple-300"
            >
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="font-medium animate-pulse">{statusMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleImport()}
            loading={loading}
            icon={<HiDownload size={14} />}
          >
            Fetch & Add to Dungeon
          </Button>
        </div>
      </div>
    </Modal>
  );
}
