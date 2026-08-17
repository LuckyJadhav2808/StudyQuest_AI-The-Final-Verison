'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiChevronDown, HiChevronUp, HiPlus, HiTrash, HiDocumentAdd,
  HiAcademicCap, HiFolderOpen, HiChartBar,
} from 'react-icons/hi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import TopicRow from './TopicRow';
import { TrackerSubject, TrackerTopic } from '@/types';

interface SubjectCardProps {
  subject: TrackerSubject;
  onUpdateSubject: (updates: Partial<TrackerSubject>) => void;
  onDeleteSubject: () => void;
  onAddUnit: (title: string, description?: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onAddTopic: (unitId: string, title: string, confidence?: number, hours?: number) => void;
  onBulkAddTopics: (unitId: string, rawText: string) => void;
  onUpdateTopic: (unitId: string, topicId: string, updates: Partial<TrackerTopic>) => void;
  onDeleteTopic: (unitId: string, topicId: string) => void;
  onToggleTopicStatus: (unitId: string, topicId: string) => void;
}

export default function SubjectCard({
  subject,
  onUpdateSubject,
  onDeleteSubject,
  onAddUnit,
  onDeleteUnit,
  onAddTopic,
  onBulkAddTopics,
  onUpdateTopic,
  onDeleteTopic,
  onToggleTopicStatus,
}: SubjectCardProps) {
  const [expanded, setExpanded] = useState<boolean>(true);
  
  // Modals state
  const [showAddUnitModal, setShowAddUnitModal] = useState<boolean>(false);
  const [newUnitTitle, setNewUnitTitle] = useState<string>('');

  const [showAddTopicModal, setShowAddTopicModal] = useState<boolean>(false);
  const [activeUnitForTopic, setActiveUnitForTopic] = useState<string>('');
  const [topicMode, setTopicMode] = useState<'single' | 'bulk'>('single');
  const [singleTopicTitle, setSingleTopicTitle] = useState<string>('');
  const [bulkText, setBulkText] = useState<string>('');
  const [singleTopicHours, setSingleTopicHours] = useState<number>(2);
  const [singleTopicConfidence, setSingleTopicConfidence] = useState<number>(3);

  // Compute subject level stats
  let totalTopics = 0;
  let masteredTopics = 0;
  subject.units.forEach((unit) => {
    unit.topics.forEach((t) => {
      totalTopics++;
      if (t.status === 'mastered') masteredTopics++;
    });
  });
  const completionPct = totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0;

  const handleCreateUnit = () => {
    if (!newUnitTitle.trim()) return;
    onAddUnit(newUnitTitle.trim());
    setNewUnitTitle('');
    setShowAddUnitModal(false);
  };

  const handleOpenAddTopic = (unitId: string) => {
    setActiveUnitForTopic(unitId);
    setTopicMode('single');
    setSingleTopicTitle('');
    setBulkText('');
    setShowAddTopicModal(true);
  };

  const handleSaveTopic = () => {
    if (!activeUnitForTopic) return;
    if (topicMode === 'single') {
      if (!singleTopicTitle.trim()) return;
      onAddTopic(activeUnitForTopic, singleTopicTitle.trim(), singleTopicConfidence, singleTopicHours);
    } else {
      if (!bulkText.trim()) return;
      onBulkAddTopics(activeUnitForTopic, bulkText);
    }
    setShowAddTopicModal(false);
  };

  return (
    <Card hover={false} className="border-2 border-[var(--card-border)] overflow-hidden shadow-lg">
      
      {/* Subject Header Bar */}
      <div
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-950/80 to-[var(--card-bg)] border-b border-[var(--card-border)] cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-md"
            style={{ backgroundColor: `${subject.color}25`, border: `1.5px solid ${subject.color}50` }}
          >
            {subject.icon || '📚'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-black text-base sm:text-lg text-white line-clamp-1">
                {subject.name}
              </h3>
              {subject.code && (
                <Badge variant="sky" size="sm" className="font-mono text-[10px]">
                  {subject.code}
                </Badge>
              )}

              {subject.weightage && (
                <span className="text-[11px] font-bold text-sky-400">
                  ({subject.weightage}% weight)
                </span>
              )}
            </div>

            <p className="text-xs text-[var(--muted-foreground)]">
              {masteredTopics} / {totalTopics} topics mastered ({completionPct}%)
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
          <div className="w-24 sm:w-32 bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 hidden xs:block">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{ width: `${completionPct}%`, backgroundColor: subject.color }}
            />
          </div>

          <button
            onClick={() => setShowAddUnitModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold flex items-center gap-1 transition-all"
          >
            <HiPlus size={13} />
            <span>Unit</span>
          </button>

          <button
            onClick={onDeleteSubject}
            title="Delete Subject"
            className="p-1.5 rounded-xl border border-slate-800 hover:bg-red-500/20 hover:border-red-500/40 text-slate-500 hover:text-red-400 transition-all"
          >
            <HiTrash size={15} />
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 transition-all"
          >
            {expanded ? <HiChevronUp size={18} /> : <HiChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Units & Topics */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="p-4 space-y-5"
          >
            {subject.units.length > 0 ? (
              subject.units.map((unit) => {
                const unitDone = unit.topics.length > 0 && unit.topics.every((t) => t.status === 'mastered');

                return (
                  <div
                    key={unit.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      unitDone
                        ? 'bg-emerald-950/10 border-emerald-500/30'
                        : 'bg-slate-950/40 border-slate-800/80'
                    }`}
                  >
                    {/* Unit Header */}
                    <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-800/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-sky-400 text-[10px] font-mono font-bold">
                          Unit {unit.unitNumber}
                        </span>
                        <h4 className="font-heading font-bold text-sm text-white line-clamp-1">
                          {unit.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenAddTopic(unit.id)}
                          className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                        >
                          <HiPlus size={12} />
                          <span>Topic</span>
                        </button>

                        <button
                          onClick={() => onDeleteUnit(unit.id)}
                          className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                          title="Delete Unit"
                        >
                          <HiTrash size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Unit Topics Checklist */}
                    {unit.topics.length > 0 ? (
                      <div className="space-y-2">
                        {unit.topics.map((topic) => (
                          <TopicRow
                            key={topic.id}
                            topic={topic}
                            onToggleStatus={() => onToggleTopicStatus(unit.id, topic.id)}
                            onUpdateTopic={(updates) => onUpdateTopic(unit.id, topic.id, updates)}
                            onDeleteTopic={() => onDeleteTopic(unit.id, topic.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center border-2 border-dashed border-slate-800 rounded-xl">
                        <p className="text-xs text-[var(--muted-foreground)] mb-2">No topics added to this unit yet.</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<HiPlus size={13} />}
                          onClick={() => handleOpenAddTopic(unit.id)}
                        >
                          Add First Topic
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                <p className="text-xs text-[var(--muted-foreground)] mb-3">No units created for {subject.name}.</p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<HiPlus size={14} />}
                  onClick={() => setShowAddUnitModal(true)}
                >
                  Create Unit 1
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Unit Modal */}
      <Modal
        isOpen={showAddUnitModal}
        onClose={() => setShowAddUnitModal(false)}
        title={`Add Unit to ${subject.name}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Unit Title"
            value={newUnitTitle}
            onChange={(e) => setNewUnitTitle(e.target.value)}
            placeholder="e.g. Unit 2: Process Scheduling & Threads"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddUnitModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateUnit}>
              Add Unit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Topic Modal (Single or Bulk Parser) */}
      <Modal
        isOpen={showAddTopicModal}
        onClose={() => setShowAddTopicModal(false)}
        title="Add Topics to Unit"
        maxWidth="max-w-xl"
      >

        <div className="space-y-4 pt-1">
          {/* Switcher Tab */}
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setTopicMode('single')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-heading transition-all ${
                topicMode === 'single' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Single Topic
            </button>
            <button
              onClick={() => setTopicMode('bulk')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-heading transition-all flex items-center justify-center gap-1.5 ${
                topicMode === 'bulk' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <HiDocumentAdd size={14} />
              <span>Bulk Text Parser</span>
            </button>
          </div>

          {topicMode === 'single' ? (
            <div className="space-y-3">
              <Input
                label="Topic Title"
                value={singleTopicTitle}
                onChange={(e) => setSingleTopicTitle(e.target.value)}
                placeholder="e.g. CPU Scheduling Algorithms (FCFS, SJF, RR)"
                autoFocus
              />

              <div>
                <label className="text-xs font-bold text-[var(--muted-foreground)] block mb-1">
                  Est. Study Hours
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={singleTopicHours}
                  onChange={(e) => setSingleTopicHours(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] text-xs text-white outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--muted-foreground)] block">
                Paste Syllabus Bullet Points (One Topic Per Line)
              </label>
              <textarea
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`1. CPU Scheduling (FCFS, SJF, Priority)\n2. Semaphores & Deadlock Handling\n3. Banker's Algorithm & Resource Allocation\n4. Memory Paging & Segmentation`}
                className="w-full p-3 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] text-xs focus:border-primary outline-none font-mono"
              />
              <p className="text-[11px] text-slate-400">
                💡 Tip: Prefixing with bullets or numbers (like 1., •, -) will be automatically cleaned up.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddTopicModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveTopic}>
              {topicMode === 'single' ? 'Add Topic' : 'Parse & Bulk Import'}
            </Button>
          </div>
        </div>
      </Modal>

    </Card>
  );
}
