'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiCheck, HiTrash, HiPencilAlt, HiRefresh, HiSave,
} from 'react-icons/hi';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { TrackerTopic, TopicStatus } from '@/types';

interface TopicRowProps {
  topic: TrackerTopic;
  onToggleStatus: () => void;
  onUpdateTopic: (updates: Partial<TrackerTopic>) => void;
  onDeleteTopic: () => void;
}

export default function TopicRow({
  topic,
  onToggleStatus,
  onUpdateTopic,
  onDeleteTopic,
}: TopicRowProps) {
  const [showNotesModal, setShowNotesModal] = useState<boolean>(false);
  const [notesText, setNotesText] = useState<string>(topic.notes || '');

  const getStatusBadge = (status: TopicStatus) => {
    switch (status) {
      case 'mastered':
        return (
          <button
            onClick={onToggleStatus}
            className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 hover:bg-emerald-500/25 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Mastered</span>
          </button>
        );
      case 'in-progress':
        return (
          <button
            onClick={onToggleStatus}
            className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 hover:bg-amber-500/25 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>In Progress</span>
          </button>
        );
      default:
        return (
          <button
            onClick={onToggleStatus}
            className="px-3 py-1 rounded-xl bg-slate-800/60 text-slate-400 border border-slate-700/50 text-[11px] font-bold flex items-center gap-1.5 hover:bg-slate-700/60 hover:text-white transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>To Learn</span>
          </button>
        );
    }
  };

  const handleSaveNotes = () => {
    onUpdateTopic({ notes: notesText });
    setShowNotesModal(false);
  };

  return (
    <motion.div
      layout
      className={`group p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        topic.status === 'mastered'
          ? 'bg-slate-950/40 border-emerald-500/20'
          : topic.status === 'in-progress'
          ? 'bg-amber-950/10 border-amber-500/25'
          : 'bg-slate-900/40 border-[var(--card-border)] hover:border-primary/30'
      }`}
    >
      {/* Left: Checkbox & Topic Title */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <button
          onClick={onToggleStatus}
          className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 sm:mt-0 ${
            topic.status === 'mastered'
              ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
              : topic.status === 'in-progress'
              ? 'bg-amber-500/20 border-amber-400 text-amber-400'
              : 'border-slate-600 hover:border-primary bg-slate-950/50'
          }`}
        >
          {topic.status === 'mastered' && <HiCheck size={13} className="stroke-[3]" />}
          {topic.status === 'in-progress' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
        </button>

        <div className="min-w-0 flex-1">
          <span
            onClick={onToggleStatus}
            className={`text-xs sm:text-sm font-semibold cursor-pointer hover:text-primary transition-colors block leading-relaxed ${
              topic.status === 'mastered'
                ? 'line-through text-slate-400'
                : 'text-white'
            }`}
          >
            {topic.title}
          </span>

          {topic.notes && (
            <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-1 mt-0.5 italic">
              ✍️ {topic.notes}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls: Status Pill, Revision Count, Actions */}
      <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/60 flex-shrink-0">
        
        {/* Status Pill */}
        {getStatusBadge(topic.status)}

        {/* Revision Count Button */}
        <button
          onClick={() => onUpdateTopic({ revisionCount: (topic.revisionCount || 0) + 1 })}
          title="Click to increment revision count"
          className="px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 text-[11px] font-bold flex items-center gap-1 transition-all"
        >
          <HiRefresh size={11} />
          <span>Rev: {topic.revisionCount || 0}</span>
        </button>

        {/* Notes Action */}
        <button
          onClick={() => setShowNotesModal(true)}
          title="Add or edit study notes"
          className={`p-1.5 rounded-lg border text-xs transition-colors ${
            topic.notes
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
              : 'border-slate-800 hover:bg-slate-800 text-[var(--muted-foreground)]'
          }`}
        >
          <HiPencilAlt size={14} />
        </button>

        {/* Delete Action */}
        <button
          onClick={onDeleteTopic}
          title="Delete topic"
          className="p-1.5 rounded-lg border border-slate-800 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 text-slate-600 transition-colors"
        >
          <HiTrash size={14} />
        </button>
      </div>

      {/* Quick Notes Modal */}
      <Modal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        title={`Study Notes: ${topic.title}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-[var(--muted-foreground)] block mb-1">
              Personal Formulas, Key Definitions & Reminders
            </label>
            <textarea
              rows={5}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="e.g. Key definitions, formulas, or exam points to remember..."
              className="w-full p-3 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] text-xs focus:border-primary outline-none transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowNotesModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" icon={<HiSave size={14} />} onClick={handleSaveNotes}>
              Save Notes
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
