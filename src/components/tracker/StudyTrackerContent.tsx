'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiAcademicCap, HiSparkles, HiPlus, HiCog,
  HiChartBar, HiCalendar, HiBookOpen, HiClipboardList,
} from 'react-icons/hi';
import { useSearchParams, useRouter } from 'next/navigation';
import FeatureGuard from '@/components/ui/FeatureGuard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';

import { useStudyTracker } from '@/hooks/useStudyTracker';
import TrackerDashboardView from './views/TrackerDashboardView';
import TrackerDailyLogView from './views/TrackerDailyLogView';
import TrackerSyllabusView from './views/TrackerSyllabusView';
import TrackerTestLogView from './views/TrackerTestLogView';
import TrackerSettingsDrawer from './modals/TrackerSettingsDrawer';
import PresetSelectorModal from './PresetSelectorModal';

type TrackerSubTab = 'dashboard' | 'log' | 'syllabus' | 'tests';

export default function StudyTrackerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab State synced with URL query parameter
  const tabParam = searchParams.get('tab') as TrackerSubTab | null;
  const [activeTab, setActiveTab] = useState<TrackerSubTab>(
    tabParam && ['dashboard', 'log', 'syllabus', 'tests'].includes(tabParam)
      ? tabParam
      : 'dashboard'
  );

  useEffect(() => {
    if (tabParam && ['dashboard', 'log', 'syllabus', 'tests'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TrackerSubTab) => {
    setActiveTab(tab);
    router.replace(`/tracker?tab=${tab}`, { scroll: false });
  };

  // Study Tracker Master Hook
  const {
    tracks,
    activeTrack,
    activeTrackId,
    setActiveTrackId,
    dailyLogs,
    testLogs,
    trackerSettings,
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
    saveDailyLog,
    deleteDailyLog,
    saveTestLog,
    deleteTestLog,
    updateTrackerSettings,
    addHabit,
    deleteHabit,
    restoreHabit,
    exportTrackerData,
  } = useStudyTracker();

  // Modals & Drawer State
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [showPresetModal, setShowPresetModal] = useState<boolean>(false);
  const [showAddTrackModal, setShowAddTrackModal] = useState<boolean>(false);
  const [newTrackTitle, setNewTrackTitle] = useState<string>('');

  const handleCreateTrackSubmit = () => {
    if (!newTrackTitle.trim()) return;
    createTrack(newTrackTitle.trim());
    setNewTrackTitle('');
    setShowAddTrackModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 space-x-3 text-xs text-[var(--muted-foreground)]">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Loading Study & GATE Command Center...</span>
      </div>
    );
  }

  return (
    <FeatureGuard feature="studyTracker" redirectIfDisabled={false}>
      <PageTransition>
        <div className="max-w-7xl mx-auto space-y-6 pb-16">
          
          {/* Top Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="primary" size="sm">
                  <HiAcademicCap className="mr-1" /> GATE & Exam Command Center
                </Badge>
                <span className="text-[11px] text-[var(--muted-foreground)] font-semibold">
                  Relational Syllabus & Pacing Engine
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-white">
                Study Tracker & Prep Hub
              </h1>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
                Unified prep suite for syllabus mastery, 4-slot daily logs, dynamic habits, and diagnostic mock test analytics.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                icon={<HiSparkles size={14} />}
                onClick={() => setShowPresetModal(true)}
              >
                Syllabus Presets
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={<HiCog size={15} />}
                onClick={() => setShowSettingsDrawer(true)}
              >
                Settings & Pacing
              </Button>
            </div>
          </div>

          {/* Syllabus Track Selector Tabs Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] shadow-md">
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

          {/* Master 4-View Segmented Navigation Tabs */}
          <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-slate-950/80 border-2 border-[var(--card-border)] overflow-x-auto [scrollbar-width:none]">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.01]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <HiChartBar size={16} />
              <span>Command Center</span>
            </button>

            <button
              onClick={() => handleTabChange('log')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'log'
                  ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.01]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <HiCalendar size={16} />
              <span>Daily Log & Matrix</span>
            </button>

            <button
              onClick={() => handleTabChange('syllabus')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'syllabus'
                  ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.01]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <HiBookOpen size={16} />
              <span>Syllabus Curriculum</span>
            </button>

            <button
              onClick={() => handleTabChange('tests')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'tests'
                  ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.01]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <HiClipboardList size={16} />
              <span>Test Performance Log</span>
            </button>
          </div>

          {/* Active View Container */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <TrackerDashboardView
                  kpis={kpis}
                  trackTitle={activeTrack?.title || 'Syllabus'}
                  activeTrack={activeTrack}
                  onTabChange={handleTabChange}
                  onOpenSettings={() => setShowSettingsDrawer(true)}
                />
              )}

              {activeTab === 'log' && (
                <TrackerDailyLogView
                  dailyLogs={dailyLogs}
                  activeTrack={activeTrack}
                  settings={trackerSettings}
                  onSaveDailyLog={saveDailyLog}
                  onDeleteDailyLog={deleteDailyLog}
                />
              )}

              {activeTab === 'syllabus' && (
                <TrackerSyllabusView
                  activeTrack={activeTrack}
                  onAddSubject={addSubject}
                  onUpdateSubject={updateSubject}
                  onDeleteSubject={deleteSubject}
                  onAddUnit={addUnit}
                  onDeleteUnit={deleteUnit}
                  onAddTopic={addTopic}
                  onBulkAddTopics={bulkAddTopics}
                  onUpdateTopic={updateTopic}
                  onDeleteTopic={deleteTopic}
                  onToggleTopicStatus={toggleTopicStatus}
                  onOpenPresets={() => setShowPresetModal(true)}
                />
              )}

              {activeTab === 'tests' && (
                <TrackerTestLogView
                  testLogs={testLogs}
                  activeTrack={activeTrack}
                  kpis={kpis}
                  onSaveTestLog={saveTestLog}
                  onDeleteTestLog={deleteTestLog}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Settings & Pacing Drawer */}
          <TrackerSettingsDrawer
            isOpen={showSettingsDrawer}
            onClose={() => setShowSettingsDrawer(false)}
            settings={trackerSettings}
            onUpdateSettings={updateTrackerSettings}
            onAddHabit={addHabit}
            onDeleteHabit={deleteHabit}
            onRestoreHabit={restoreHabit}
            onExportData={exportTrackerData}
          />

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

        </div>
      </PageTransition>
    </FeatureGuard>
  );
}
