'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiAcademicCap, HiSearch, HiSparkles,
  HiViewBoards, HiViewList, HiCheck, HiStar,
  HiRefresh, HiClock,
} from 'react-icons/hi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import SubjectCard from '../SubjectCard';
import {
  SyllabusTrack,
  TrackerSubject,
  TrackerTopic,
  TopicStatus,
} from '@/types';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface TrackerSyllabusViewProps {
  activeTrack: SyllabusTrack | null;
  onAddSubject: (name: string, icon?: string, color?: string, code?: string, weightage?: number) => void;
  onUpdateSubject: (subjectId: string, updates: Partial<TrackerSubject>) => void;
  onDeleteSubject: (subjectId: string) => void;
  onAddUnit: (subjectId: string, title: string, description?: string) => void;
  onDeleteUnit: (subjectId: string, unitId: string) => void;
  onAddTopic: (subjectId: string, unitId: string, title: string, confidence?: number, hours?: number) => void;
  onBulkAddTopics: (subjectId: string, unitId: string, rawText: string) => void;
  onUpdateTopic: (subjectId: string, unitId: string, topicId: string, updates: Partial<TrackerTopic>) => void;
  onDeleteTopic: (subjectId: string, unitId: string, topicId: string) => void;
  onToggleTopicStatus: (subjectId: string, unitId: string, topicId: string) => void;
  onOpenPresets: () => void;
}

const EMOJI_PICKER = ['📚', '💻', '🌐', '⚡', '🗄️', '📐', '🔬', '🧠', '🧪', '🎨', '🚀', '📊', '🛡️', '⚙️'];
const ACCENT_COLORS = ['#7C3AED', '#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#EF4444', '#14B8A6', '#8B5CF6'];

export default function TrackerSyllabusView({
  activeTrack,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onAddUnit,
  onDeleteUnit,
  onAddTopic,
  onBulkAddTopics,
  onUpdateTopic,
  onDeleteTopic,
  onToggleTopicStatus,
  onOpenPresets,
}: TrackerSyllabusViewProps) {
  const router = useRouter();

  // Dual View Mode: Tree vs Kanban
  const [viewMode, setViewMode] = useState<'tree' | 'kanban'>('tree');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'mastered' | 'in-progress' | 'todo' | 'revised'>('all');

  // Add Subject Modal State
  const [showAddSubjectModal, setShowAddSubjectModal] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectCode, setNewSubjectCode] = useState<string>('');
  const [newSubjectIcon, setNewSubjectIcon] = useState<string>('📚');
  const [newSubjectColor, setNewSubjectColor] = useState<string>(ACCENT_COLORS[0]);
  const [newSubjectWeightage, setNewSubjectWeightage] = useState<number>(10);

  // Filtered subjects for Tree View
  const filteredSubjects = useMemo(() => {
    if (!activeTrack) return [];
    let items = activeTrack.subjects;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items
        .map((sub) => {
          const matchingUnits = sub.units
            .map((u) => ({
              ...u,
              topics: u.topics.filter(
                (t) =>
                  t.title.toLowerCase().includes(q) ||
                  (t.notes && t.notes.toLowerCase().includes(q))
              ),
            }))
            .filter((u) => u.topics.length > 0 || u.title.toLowerCase().includes(q));

          return { ...sub, units: matchingUnits };
        })
        .filter(
          (sub) =>
            sub.name.toLowerCase().includes(q) ||
            (sub.code && sub.code.toLowerCase().includes(q)) ||
            sub.units.length > 0
        );
    }

    if (filterStatus === 'mastered') {
      items = items
        .map((sub) => ({
          ...sub,
          units: sub.units
            .map((u) => ({
              ...u,
              topics: u.topics.filter((t) => t.status === 'mastered' || t.status === 'done'),
            }))
            .filter((u) => u.topics.length > 0),
        }))
        .filter((sub) => sub.units.length > 0);
    } else if (filterStatus === 'in-progress') {
      items = items
        .map((sub) => ({
          ...sub,
          units: sub.units
            .map((u) => ({
              ...u,
              topics: u.topics.filter((t) => t.status === 'in-progress'),
            }))
            .filter((u) => u.topics.length > 0),
        }))
        .filter((sub) => sub.units.length > 0);
    } else if (filterStatus === 'todo') {
      items = items
        .map((sub) => ({
          ...sub,
          units: sub.units
            .map((u) => ({
              ...u,
              topics: u.topics.filter((t) => t.status === 'todo' || t.status === 'pending'),
            }))
            .filter((u) => u.topics.length > 0),
        }))
        .filter((sub) => sub.units.length > 0);
    } else if (filterStatus === 'revised') {
      items = items
        .map((sub) => ({
          ...sub,
          units: sub.units
            .map((u) => ({
              ...u,
              topics: u.topics.filter((t) => t.status === 'revised'),
            }))
            .filter((u) => u.topics.length > 0),
        }))
        .filter((sub) => sub.units.length > 0);
    }

    return items;
  }, [activeTrack, searchQuery, filterStatus]);

  // Flattened topics with subject context for Kanban Board
  const allKanbanTopics = useMemo(() => {
    if (!activeTrack) return [];
    const list: Array<{
      subjectId: string;
      subjectName: string;
      subjectColor: string;
      subjectIcon: string;
      unitId: string;
      topic: TrackerTopic;
    }> = [];

    activeTrack.subjects.forEach((sub) => {
      sub.units.forEach((u) => {
        u.topics.forEach((t) => {
          if (
            searchQuery.trim() &&
            !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !sub.name.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            return;
          }
          list.push({
            subjectId: sub.id,
            subjectName: sub.name,
            subjectColor: sub.color,
            subjectIcon: sub.icon,
            unitId: u.id,
            topic: t,
          });
        });
      });
    });

    return list;
  }, [activeTrack, searchQuery]);

  // Kanban Columns
  const kanbanColumns = useMemo(() => {
    return {
      todo: allKanbanTopics.filter(
        (i) => !i.topic.status || i.topic.status === 'todo' || i.topic.status === 'pending'
      ),
      inProgress: allKanbanTopics.filter((i) => i.topic.status === 'in-progress'),
      done: allKanbanTopics.filter((i) => i.topic.status === 'done' || i.topic.status === 'mastered'),
      revised: allKanbanTopics.filter((i) => i.topic.status === 'revised'),
    };
  }, [allKanbanTopics]);

  // Launch Pomodoro Bridge
  const handleLaunchPomodoro = (topicTitle: string) => {
    try {
      localStorage.setItem('studyquest_pomodoro_topic', topicTitle);
    } catch { /* ignore */ }
    toast.success(`🚀 Linked "${topicTitle}" to Pomodoro!`);
    router.push('/pomodoro');
  };

  const handleCreateSubjectSubmit = () => {
    if (!newSubjectName.trim()) return;
    onAddSubject(
      newSubjectName.trim(),
      newSubjectIcon,
      newSubjectColor,
      newSubjectCode.trim() || undefined,
      newSubjectWeightage
    );
    setNewSubjectName('');
    setNewSubjectCode('');
    setShowAddSubjectModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & View Mode Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] shadow-md">
        {/* Search */}
        <div className="relative flex-1">
          <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics, formulas, or study notes across curriculum..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* View Mode Toggle + Add Subject Button */}
        <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto justify-end">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'tree' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <HiViewList size={14} />
              <span>Tree View</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <HiViewBoards size={14} />
              <span>Kanban Board</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<HiSparkles size={14} />}
            onClick={onOpenPresets}
          >
            Presets
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<HiPlus size={14} />}
            onClick={() => setShowAddSubjectModal(true)}
          >
            Add Subject
          </Button>
        </div>
      </div>

      {/* Filter Status Pills (Only relevant in Tree View) */}
      {viewMode === 'tree' && (
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] py-0.5">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'all' ? 'bg-primary text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            All Topics
          </button>
          <button
            onClick={() => setFilterStatus('mastered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'mastered' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Done / Mastered
          </button>
          <button
            onClick={() => setFilterStatus('in-progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'in-progress' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilterStatus('revised')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'revised' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Revised
          </button>
          <button
            onClick={() => setFilterStatus('todo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'todo' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            To Learn
          </button>
        </div>
      )}

      {/* Main Content Area: Tree View vs Kanban Board */}
      {viewMode === 'tree' ? (
        filteredSubjects.length > 0 ? (
          <div className="space-y-5">
            {filteredSubjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onUpdateSubject={(updates) => onUpdateSubject(subject.id, updates)}
                onDeleteSubject={() => onDeleteSubject(subject.id)}
                onAddUnit={(title, desc) => onAddUnit(subject.id, title, desc)}
                onDeleteUnit={(unitId) => onDeleteUnit(subject.id, unitId)}
                onAddTopic={(unitId, title, conf, hours) => onAddTopic(subject.id, unitId, title, conf, hours)}
                onBulkAddTopics={(unitId, text) => onBulkAddTopics(subject.id, unitId, text)}
                onUpdateTopic={(unitId, topicId, updates) => onUpdateTopic(subject.id, unitId, topicId, updates)}
                onDeleteTopic={(unitId, topicId) => onDeleteTopic(subject.id, unitId, topicId)}
                onToggleTopicStatus={(unitId, topicId) => onToggleTopicStatus(subject.id, unitId, topicId)}
              />
            ))}
          </div>
        ) : (
          <Card hover={false} className="text-center py-16">
            <HiAcademicCap className="mx-auto text-[var(--muted)] mb-3" size={48} />
            <h3 className="font-heading font-bold text-lg mb-1">
              {searchQuery || filterStatus !== 'all' ? 'No topics match your filter' : 'No subjects in this syllabus track'}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] max-w-md mx-auto mb-5">
              {searchQuery || filterStatus !== 'all'
                ? 'Try clearing your search query or selecting "All Topics".'
                : 'Add your first subject or load a 1-click starter template to begin tracking your exam preparation!'}
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={onOpenPresets}>
                Load Starter Preset
              </Button>
              <Button variant="primary" size="sm" icon={<HiPlus size={14} />} onClick={() => setShowAddSubjectModal(true)}>
                Add Subject
              </Button>
            </div>
          </Card>
        )
      ) : (
        /* Status Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {/* Column 1: To Learn */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                To Learn
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                {kanbanColumns.todo.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
              {kanbanColumns.todo.map(({ subjectId, subjectName, subjectColor, subjectIcon, unitId, topic }) => (
                <div
                  key={topic.id}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 text-white truncate max-w-[140px]"
                      style={{ backgroundColor: `${subjectColor}33`, borderColor: subjectColor }}
                    >
                      <span>{subjectIcon}</span>
                      <span className="truncate">{subjectName}</span>
                    </span>
                    <button
                      onClick={() => handleLaunchPomodoro(topic.title)}
                      className="text-[10px] font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-0.5"
                      title="Launch Pomodoro"
                    >
                      <HiClock size={12} />
                    </button>
                  </div>

                  <h4 className="text-xs font-semibold text-white leading-snug line-clamp-2">
                    {topic.title}
                  </h4>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500">{topic.estimatedHours || 2}h est</span>
                    <button
                      onClick={() => onToggleTopicStatus(subjectId, unitId, topic.id)}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold hover:bg-amber-500/30 transition-all"
                    >
                      Start →
                    </button>
                  </div>
                </div>
              ))}
              {kanbanColumns.todo.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-600">No topics pending</div>
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="p-3.5 rounded-2xl bg-amber-950/10 border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                In Progress
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                {kanbanColumns.inProgress.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
              {kanbanColumns.inProgress.map(({ subjectId, subjectName, subjectColor, subjectIcon, unitId, topic }) => (
                <div
                  key={topic.id}
                  className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 hover:border-amber-500/50 transition-all space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 text-white truncate max-w-[140px]"
                      style={{ backgroundColor: `${subjectColor}33`, borderColor: subjectColor }}
                    >
                      <span>{subjectIcon}</span>
                      <span className="truncate">{subjectName}</span>
                    </span>
                    <button
                      onClick={() => handleLaunchPomodoro(topic.title)}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-0.5"
                      title="Launch Pomodoro"
                    >
                      <HiClock size={12} />
                    </button>
                  </div>

                  <h4 className="text-xs font-semibold text-white leading-snug line-clamp-2">
                    {topic.title}
                  </h4>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <button
                      onClick={() => onUpdateTopic(subjectId, unitId, topic.id, { pyqDone: !topic.pyqDone })}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        topic.pyqDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {topic.pyqDone ? '✓ PYQ' : '+ PYQ'}
                    </button>
                    <button
                      onClick={() => onToggleTopicStatus(subjectId, unitId, topic.id)}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/30 transition-all"
                    >
                      Complete →
                    </button>
                  </div>
                </div>
              ))}
              {kanbanColumns.inProgress.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-600">No active topics</div>
              )}
            </div>
          </div>

          {/* Column 3: Done */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/10 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Done / Mastered
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                {kanbanColumns.done.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
              {kanbanColumns.done.map(({ subjectId, subjectName, subjectColor, subjectIcon, unitId, topic }) => (
                <div
                  key={topic.id}
                  className="p-3 rounded-xl bg-slate-900 border border-emerald-500/25 hover:border-emerald-500/40 transition-all space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 text-white truncate max-w-[140px]"
                      style={{ backgroundColor: `${subjectColor}33`, borderColor: subjectColor }}
                    >
                      <span>{subjectIcon}</span>
                      <span className="truncate">{subjectName}</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400">✓ Done</span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-300 leading-snug line-clamp-2">
                    {topic.title}
                  </h4>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => onUpdateTopic(subjectId, unitId, topic.id, { confidence: star })}
                          className={`text-[10px] ${
                            star <= (topic.confidence || 0) ? 'text-amber-400' : 'text-slate-700'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => onToggleTopicStatus(subjectId, unitId, topic.id)}
                      className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold hover:bg-purple-500/30 transition-all"
                    >
                      Revise →
                    </button>
                  </div>
                </div>
              ))}
              {kanbanColumns.done.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-600">No topics mastered yet</div>
              )}
            </div>
          </div>

          {/* Column 4: Revised */}
          <div className="p-3.5 rounded-2xl bg-purple-950/10 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                Revised
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">
                {kanbanColumns.revised.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
              {kanbanColumns.revised.map(({ subjectId, subjectName, subjectColor, subjectIcon, unitId, topic }) => (
                <div
                  key={topic.id}
                  className="p-3 rounded-xl bg-slate-900 border border-purple-500/30 hover:border-purple-500/50 transition-all space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 text-white truncate max-w-[140px]"
                      style={{ backgroundColor: `${subjectColor}33`, borderColor: subjectColor }}
                    >
                      <span>{subjectIcon}</span>
                      <span className="truncate">{subjectName}</span>
                    </span>
                    <span className="text-[10px] font-bold text-purple-300">
                      Rev: {topic.revisionCount || 1}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-300 leading-snug line-clamp-2">
                    {topic.title}
                  </h4>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <button
                      onClick={() =>
                        onUpdateTopic(subjectId, unitId, topic.id, {
                          revisionCount: (topic.revisionCount || 1) + 1,
                        })
                      }
                      className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold hover:bg-purple-500/30 transition-all flex items-center gap-1"
                    >
                      <HiRefresh size={10} />
                      <span>+1 Rev</span>
                    </button>
                    <button
                      onClick={() => onToggleTopicStatus(subjectId, unitId, topic.id)}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold hover:text-white transition-all"
                    >
                      Reset ↺
                    </button>
                  </div>
                </div>
              ))}
              {kanbanColumns.revised.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-600">No revisions yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      <Modal
        isOpen={showAddSubjectModal}
        onClose={() => setShowAddSubjectModal(false)}
        title="Add Subject to Syllabus"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 pt-1">
          <Input
            label="Subject Name"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            placeholder="e.g. Operating Systems, Theory of Computation"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject Code / Short Code"
              value={newSubjectCode}
              onChange={(e) => setNewSubjectCode(e.target.value)}
              placeholder="e.g. CS-OS, PCC301"
            />

            <div>
              <label className="text-xs font-bold text-[var(--muted-foreground)] block mb-1">
                Exam Weightage (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={newSubjectWeightage}
                onChange={(e) => setNewSubjectWeightage(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="text-xs font-bold text-[var(--muted-foreground)] block mb-1">
              Choose Subject Emoji Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_PICKER.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewSubjectIcon(emoji)}
                  className={`w-9 h-9 rounded-xl border text-base flex items-center justify-center transition-all ${
                    newSubjectIcon === emoji
                      ? 'border-primary bg-primary/20 scale-110'
                      : 'border-slate-800 hover:border-slate-600 bg-slate-950/40'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Accent Picker */}
          <div>
            <label className="text-xs font-bold text-[var(--muted-foreground)] block mb-1">
              Choose Accent Color
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewSubjectColor(color)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    newSubjectColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddSubjectModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateSubjectSubmit}>
              Add Subject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
