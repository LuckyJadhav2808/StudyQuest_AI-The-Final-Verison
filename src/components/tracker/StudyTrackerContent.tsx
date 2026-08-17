'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiAcademicCap, HiSearch, HiSparkles, HiFolderAdd,
  HiFilter, HiTrash, HiCheckCircle, HiExclamationCircle,
} from 'react-icons/hi';
import FeatureGuard from '@/components/ui/FeatureGuard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';

import { useStudyTracker } from '@/hooks/useStudyTracker';
import TrackerKpiDashboard from './TrackerKpiDashboard';
import SubjectCard from './SubjectCard';
import PresetSelectorModal from './PresetSelectorModal';

const EMOJI_PICKER = ['📚', '💻', '🌐', '⚡', '🗄️', '📐', '🔬', '🧠', '🧪', '🎨', '🚀', '📊', '🛡️', '⚙️'];
const ACCENT_COLORS = ['#7C3AED', '#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#EF4444', '#14B8A6', '#8B5CF6'];

export default function StudyTrackerContent() {
  const {
    tracks,
    activeTrack,
    activeTrackId,
    setActiveTrackId,
    kpis,
    loading,
    createTrack,
    deleteTrack,
    loadPresetTemplate,
    addSubject,
    updateSubject,
    deleteSubject,
    addUnit,
    deleteUnit,
    addTopic,
    bulkAddTopics,
    updateTopic,
    deleteTopic,
    toggleTopicStatus,
  } = useStudyTracker();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'mastered' | 'in-progress' | 'todo'>('all');

  // Modals
  const [showPresetModal, setShowPresetModal] = useState<boolean>(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState<boolean>(false);
  const [showAddTrackModal, setShowAddTrackModal] = useState<boolean>(false);

  // Form states
  const [newTrackTitle, setNewTrackTitle] = useState<string>('');
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectCode, setNewSubjectCode] = useState<string>('');
  const [newSubjectIcon, setNewSubjectIcon] = useState<string>('📚');
  const [newSubjectColor, setNewSubjectColor] = useState<string>(ACCENT_COLORS[0]);
  const [newSubjectWeightage, setNewSubjectWeightage] = useState<number>(10);

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    if (!activeTrack) return [];
    let items = activeTrack.subjects;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.map((sub) => {
        const matchingUnits = sub.units.map((u) => ({
          ...u,
          topics: u.topics.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              (t.notes && t.notes.toLowerCase().includes(q))
          ),
        })).filter((u) => u.topics.length > 0 || u.title.toLowerCase().includes(q));

        return { ...sub, units: matchingUnits };
      }).filter(
        (sub) =>
          sub.name.toLowerCase().includes(q) ||
          (sub.code && sub.code.toLowerCase().includes(q)) ||
          sub.units.length > 0
      );
    }

    if (filterStatus === 'mastered') {
      items = items.map((sub) => ({
        ...sub,
        units: sub.units.map((u) => ({
          ...u,
          topics: u.topics.filter((t) => t.status === 'mastered'),
        })).filter((u) => u.topics.length > 0),
      })).filter((sub) => sub.units.length > 0);
    } else if (filterStatus === 'in-progress') {
      items = items.map((sub) => ({
        ...sub,
        units: sub.units.map((u) => ({
          ...u,
          topics: u.topics.filter((t) => t.status === 'in-progress'),
        })).filter((u) => u.topics.length > 0),
      })).filter((sub) => sub.units.length > 0);
    } else if (filterStatus === 'todo') {
      items = items.map((sub) => ({
        ...sub,
        units: sub.units.map((u) => ({
          ...u,
          topics: u.topics.filter((t) => t.status === 'todo'),
        })).filter((u) => u.topics.length > 0),
      })).filter((sub) => sub.units.length > 0);
    }


    return items;
  }, [activeTrack, searchQuery, filterStatus]);

  const handleCreateTrackSubmit = () => {
    if (!newTrackTitle.trim()) return;
    createTrack(newTrackTitle.trim());
    setNewTrackTitle('');
    setShowAddTrackModal(false);
  };

  const handleCreateSubjectSubmit = () => {
    if (!newSubjectName.trim()) return;
    addSubject(
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 space-x-3 text-xs text-[var(--muted-foreground)]">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Loading study tracker syllabus data...</span>
      </div>
    );
  }

  return (
    <FeatureGuard feature="studyTracker" redirectIfDisabled={false}>
      <PageTransition>
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
          
          {/* Header & Track Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="primary" size="sm">
                  <HiAcademicCap className="mr-1" /> Dynamic Syllabus Engine
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-white">
                Study & Syllabus Progress Tracker
              </h1>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
                Structure custom subjects, units, and topics. Track prep confidence with real-time KPI readiness metrics.
              </p>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                icon={<HiSparkles size={14} />}
                onClick={() => setShowPresetModal(true)}
              >
                Starter Presets
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

          {/* Syllabus Track Selector Tabs Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] shadow-md">
            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
              <span className="text-xs font-bold text-[var(--muted-foreground)] whitespace-nowrap pl-1 flex items-center gap-1.5">
                <HiAcademicCap className="text-primary" size={16} /> Syllabus Track:
              </span>

              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 max-w-full">
                {tracks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTrackId(t.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-heading transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      t.id === activeTrackId
                        ? 'bg-primary text-white shadow-md shadow-primary/25 border border-primary/50'
                        : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{t.title}</span>
                  </button>
                ))}

                <button
                  onClick={() => setShowAddTrackModal(true)}
                  className="px-2.5 py-1.5 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/10 text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap"
                  title="Create New Syllabus Track"
                >
                  <HiPlus size={14} />
                  <span>New Track</span>
                </button>
              </div>
            </div>

            {activeTrack && (
              <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                <button
                  onClick={() => deleteTrack(activeTrack.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all border border-red-500/30 whitespace-nowrap"
                  title="Delete current track"
                >
                  Delete Track
                </button>
              </div>
            )}
          </div>

          {/* Real-Time Dynamic KPI Dashboard */}
          {activeTrack && <TrackerKpiDashboard kpis={kpis} trackTitle={activeTrack.title} />}

          {/* Search Bar & Status Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, unit titles, or personal study notes..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] text-xs sm:text-sm focus:border-primary outline-none transition-colors"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'all' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Topics
              </button>
              <button
                onClick={() => setFilterStatus('mastered')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'mastered' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mastered
              </button>
              <button
                onClick={() => setFilterStatus('in-progress')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'in-progress' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setFilterStatus('todo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'todo' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                To Learn
              </button>

            </div>
          </div>

          {/* Subject Cards Stack */}
          {filteredSubjects.length > 0 ? (
            <div className="space-y-5">
              {filteredSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onUpdateSubject={(updates) => updateSubject(subject.id, updates)}
                  onDeleteSubject={() => deleteSubject(subject.id)}
                  onAddUnit={(title, desc) => addUnit(subject.id, title, desc)}
                  onDeleteUnit={(unitId) => deleteUnit(subject.id, unitId)}
                  onAddTopic={(unitId, title, conf, hours) => addTopic(subject.id, unitId, title, conf, hours)}
                  onBulkAddTopics={(unitId, text) => bulkAddTopics(subject.id, unitId, text)}
                  onUpdateTopic={(unitId, topicId, updates) => updateTopic(subject.id, unitId, topicId, updates)}
                  onDeleteTopic={(unitId, topicId) => deleteTopic(subject.id, unitId, topicId)}
                  onToggleTopicStatus={(unitId, topicId) => toggleTopicStatus(subject.id, unitId, topicId)}
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

              {!searchQuery && filterStatus === 'all' && (
                <div className="flex justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setShowPresetModal(true)}>
                    Load Starter Preset
                  </Button>
                  <Button variant="primary" size="sm" icon={<HiPlus size={14} />} onClick={() => setShowAddSubjectModal(true)}>
                    Add Subject
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Preset Selector Modal */}
          <PresetSelectorModal
            isOpen={showPresetModal}
            onClose={() => setShowPresetModal(false)}
            onSelectPreset={loadPresetTemplate}
            onCreateCustom={() => setShowAddTrackModal(true)}
          />

          {/* Create New Track Modal */}
          <Modal
            isOpen={showAddTrackModal}
            onClose={() => setShowAddTrackModal(false)}
            title="Create New Syllabus Track"
            maxWidth="max-w-md"
          >
            <div className="space-y-4 pt-2">
              <Input
                label="Syllabus Track Title"
                value={newTrackTitle}
                onChange={(e) => setNewTrackTitle(e.target.value)}
                placeholder="e.g. Semester 6 Final Exams, UPSC CS, Machine Learning"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddTrackModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleCreateTrackSubmit}>
                  Create Track
                </Button>
              </div>
            </div>
          </Modal>

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
      </PageTransition>
    </FeatureGuard>
  );
}
