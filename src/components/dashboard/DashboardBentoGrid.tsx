'use client';

import React, { useState } from 'react';
import { FlowStation } from './FlowStation';
import { DailyQuests, ActiveQuests, TargetMilestone } from './QuestPanels';
import { NotesDeck } from './NotesDeck';
import { StudyVelocity, DailyChest } from './VelocityChest';
import { LoFiStation } from './LoFiStation';
import { Modal, Btn } from './ui';
import { Swords } from 'lucide-react';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { playXP } from '@/lib/sounds';
import toast from 'react-hot-toast';

export default function DashboardBentoGrid() {
  const { addQuest } = useDailyQuests();
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [modalQuestText, setModalQuestText] = useState('');

  const handleCreateQuestModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalQuestText.trim()) return;
    try {
      await addQuest(modalQuestText.trim());
      setModalQuestText('');
      setShowQuestModal(false);
      playXP();
      toast.success('+25 XP Bounty added!');
    } catch {
      toast.error('Failed to add quest');
    }
  };

  return (
    <>
      <div className="dash-grid">
        {/* Left Column (5 Cols) */}
        <FlowStation />
        <LoFiStation />

        {/* Center Column (4 Cols) */}
        <DailyQuests onOpenAddModal={() => setShowQuestModal(true)} />
        <ActiveQuests />
        <StudyVelocity />

        {/* Right Column (3 Cols) */}
        <NotesDeck />
        <TargetMilestone />
        <DailyChest />
      </div>

      {/* Quick Add Quest Modal */}
      {showQuestModal && (
        <Modal
          title="New Daily Quest"
          icon={Swords}
          tone="solar"
          onClose={() => setShowQuestModal(false)}
        >
          <form onSubmit={handleCreateQuestModal} className="flex flex-col gap-3.5">
            <input
              autoFocus
              value={modalQuestText}
              onChange={(e) => setModalQuestText(e.target.value)}
              placeholder="e.g. Revise 10 flashcards"
              className="w-full rounded-xl bg-white/80 dark:bg-[#080D1D] border border-amber-500/40 p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              maxLength={60}
            />
            <Btn
              type="submit"
              tone="solar"
              disabled={!modalQuestText.trim()}
              className="!py-2.5"
            >
              Add Quest · +25 XP
            </Btn>
          </form>
        </Modal>
      )}
    </>
  );
}
