'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  HiPlus, HiTrendingUp, HiTrash, HiSearch, HiCheckCircle,
  HiClipboardList, HiAcademicCap, HiCalendar,
} from 'react-icons/hi';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import {
  TestLogEntry,
  TestType,
  SyllabusTrack,
  TrackerKPIs,
} from '@/types';
import { getLocalDateString } from '@/lib/dateUtils';
import { v4 as uuidv4 } from 'uuid';

interface TrackerTestLogViewProps {
  testLogs: TestLogEntry[];
  activeTrack: SyllabusTrack | null;
  kpis: TrackerKPIs;
  onSaveTestLog: (test: TestLogEntry) => void;
  onDeleteTestLog: (testId: string) => void;
}

const TEST_TYPES: TestType[] = ['DPP', 'Topic', 'Subject', 'Mixed', 'Quiz', 'Mock'];

export default function TrackerTestLogView({
  testLogs,
  activeTrack,
  kpis,
  onSaveTestLog,
  onDeleteTestLog,
}: TrackerTestLogViewProps) {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form State
  const [formDate, setFormDate] = useState<string>(getLocalDateString(new Date()));
  const [formType, setFormType] = useState<TestType>('Topic');
  const [formName, setFormName] = useState<string>('');
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formTopicId, setFormTopicId] = useState<string>('');
  const [formScore, setFormScore] = useState<number>(38);
  const [formTotalMarks, setFormTotalMarks] = useState<number>(50);
  const [formWeakTopicIds, setFormWeakTopicIds] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState<string>('');

  // Available topics for selected subject
  const availableTopics = useMemo(() => {
    if (!activeTrack) return [];
    if (!formSubjectId) {
      return activeTrack.subjects.flatMap((s) => s.units.flatMap((u) => u.topics));
    }
    const found = activeTrack.subjects.find((s) => s.id === formSubjectId);
    return found ? found.units.flatMap((u) => u.topics) : [];
  }, [activeTrack, formSubjectId]);

  // Topic lookup map for displaying weak topic badges
  const topicLookup = useMemo(() => {
    const map = new Map<string, string>();
    if (activeTrack) {
      activeTrack.subjects.forEach((s) => {
        s.units.forEach((u) => {
          u.topics.forEach((t) => {
            map.set(t.id, t.title);
          });
        });
      });
    }
    return map;
  }, [activeTrack]);

  // Filtered Test Logs
  const filteredTests = useMemo(() => {
    return testLogs.filter((t) => {
      const matchesType = selectedTypeFilter === 'all' || t.testType.toLowerCase() === selectedTypeFilter.toLowerCase();
      const matchesQuery = !searchQuery.trim() || t.testName.toLowerCase().includes(searchQuery.toLowerCase()) || (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesQuery;
    });
  }, [testLogs, selectedTypeFilter, searchQuery]);

  const handleOpenAdd = () => {
    setFormDate(getLocalDateString(new Date()));
    setFormType('Topic');
    setFormName('');
    setFormSubjectId(activeTrack?.subjects[0]?.id || '');
    setFormTopicId('');
    setFormScore(38);
    setFormTotalMarks(50);
    setFormWeakTopicIds([]);
    setFormNotes('');
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formTotalMarks <= 0) return;

    const percentage = Number(((formScore / formTotalMarks) * 100).toFixed(1));

    const newTest: TestLogEntry = {
      id: uuidv4(),
      trackId: activeTrack?.id || '',
      date: formDate,
      testType: formType,
      testName: formName.trim(),
      subjectId: formSubjectId || undefined,
      topicId: formTopicId || undefined,
      score: Number(formScore),
      totalMarks: Number(formTotalMarks),
      percentage,
      weakTopicIds: formWeakTopicIds,
      notes: formNotes.trim() || undefined,
      createdAt: Date.now(),
    };

    onSaveTestLog(newTest);
    setShowAddModal(false);
  };

  const toggleWeakTopic = (topicId: string) => {
    setFormWeakTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (pct >= 60) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    if (pct >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-red-400 bg-red-500/10 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Tests</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-heading font-black text-white">{kpis.testStats.totalTests}</span>
            <span className="text-xs text-[var(--muted-foreground)]">recorded</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Overall Average</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-heading font-black text-emerald-400">{kpis.testStats.overallAvgPct}%</span>
            <span className="text-xs text-slate-400">accuracy</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mock Test Avg</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-heading font-black text-purple-400">
              {kpis.testStats.avgByType['Mock'] ? `${kpis.testStats.avgByType['Mock']}%` : '—'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">DPP Accuracy</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-heading font-black text-sky-400">
              {kpis.testStats.avgByType['DPP'] ? `${kpis.testStats.avgByType['DPP']}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search test names, test series, or notes..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] text-xs sm:text-sm focus:border-primary outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <Button
            variant="primary"
            size="md"
            icon={<HiPlus size={16} />}
            onClick={handleOpenAdd}
            className="shadow-md shadow-primary/25 whitespace-nowrap"
          >
            Record Test Score
          </Button>
        </div>
      </div>

      {/* 3. Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] py-0.5">
        <button
          onClick={() => setSelectedTypeFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedTypeFilter === 'all' ? 'bg-primary text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          All Tests ({testLogs.length})
        </button>
        {TEST_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedTypeFilter(type)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedTypeFilter.toLowerCase() === type.toLowerCase()
                ? 'bg-primary text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* 4. Append-Only Test Log Table */}
      <Card hover={false} className="p-5 space-y-4">
        {filteredTests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Test Name</th>
                  <th className="py-2.5 px-3">Subject / Topic</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3">Percentage</th>
                  <th className="py-2.5 px-3">Weak Topics Tagged</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTests.map((test) => {
                  const subMatch = activeTrack?.subjects.find((s) => s.id === test.subjectId);

                  return (
                    <tr key={test.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        {test.date}
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {test.testType}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-white max-w-[200px] truncate" title={test.testName}>
                        {test.testName}
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {subMatch ? (
                          <span className="flex items-center gap-1 font-semibold text-xs">
                            <span>{subMatch.icon}</span>
                            <span>{subMatch.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-semibold text-white">
                        {test.score} / {test.totalMarks}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPercentageColor(
                            test.percentage
                          )}`}
                        >
                          {test.percentage.toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3 px-3 max-w-[220px]">
                        {test.weakTopicIds && test.weakTopicIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {test.weakTopicIds.map((wId) => (
                              <span
                                key={wId}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-pink-500/15 text-pink-300 border border-pink-500/30 truncate max-w-[130px]"
                                title={topicLookup.get(wId) || wId}
                              >
                                {topicLookup.get(wId) || 'Weak Topic'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-400 text-[11px] max-w-[180px] truncate" title={test.notes}>
                        {test.notes || '—'}
                      </td>

                      <td className="py-3 px-3">
                        <button
                          onClick={() => onDeleteTestLog(test.id)}
                          className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"
                          title="Delete test entry"
                        >
                          <HiTrash size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-[var(--muted-foreground)]">
            <HiClipboardList size={36} className="mx-auto mb-2 text-slate-600" />
            <p className="font-semibold text-white mb-1">No test records found</p>
            <p>Record your test performances (DPP, Topic tests, Full Mocks) to unlock accuracy trends!</p>
          </div>
        )}
      </Card>

      {/* Record Test Score Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Test Performance Score"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Test Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Test Category</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as TestType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary"
              >
                {TEST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type} Test
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Test Name / Series Title"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Theory of Computation Unit 1 Diagnostic Test"
            autoFocus
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Related Subject (Optional)</label>
              <select
                value={formSubjectId}
                onChange={(e) => {
                  setFormSubjectId(e.target.value);
                  setFormTopicId('');
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white outline-none focus:border-primary"
              >
                <option value="">-- None / Mixed --</option>
                {activeTrack?.subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.icon} {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Related Topic (Optional)</label>
              <select
                value={formTopicId}
                onChange={(e) => setFormTopicId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white outline-none focus:border-primary"
              >
                <option value="">-- None / General --</option>
                {availableTopics.map((top) => (
                  <option key={top.id} value={top.id}>
                    {top.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Marks Obtained</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formScore}
                onChange={(e) => setFormScore(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Total Marks</label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={formTotalMarks}
                onChange={(e) => setFormTotalMarks(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          {/* Weak Topics Tagging (Spaced Repetition Integration) */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Tag Weak Topics (Adds to Priority Revision Radar)
            </label>
            <div className="max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              {availableTopics.map((top) => {
                const isSelected = formWeakTopicIds.includes(top.id);
                return (
                  <div
                    key={top.id}
                    onClick={() => toggleWeakTopic(top.id)}
                    className={`p-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                        : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <span className="truncate pr-2">{top.title}</span>
                    <span className="text-[10px] font-bold">
                      {isSelected ? '✓ Tagged Weak' : '+ Tag'}
                    </span>
                  </div>
                );
              })}
              {availableTopics.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-600">Select a subject to list topics</div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Test Notes & Analysis</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Lost 4 marks in negative marking for MSQ questions..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Test Score (+30 XP)
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
