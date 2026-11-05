'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, ClipboardList, Crosshair, Flame, Plus, Radar, Zap } from 'lucide-react';
import { Btn, Chip, Panel, PanelHeader } from './ui';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { useTasksStore } from '@/lib/stores/useTasksStore';
import { useExams } from '@/hooks/useExams';
import { useGamification } from '@/hooks/useGamification';
import { playClick, playSuccess, playXP } from '@/lib/sounds';
import { XP_AWARDS } from '@/lib/constants';
import toast from 'react-hot-toast';

export function DailyQuests({ onOpenAddModal }: { onOpenAddModal?: () => void }) {
  const { quests, toggleQuest, addQuest, todayCompleted, todayTotal } = useDailyQuests();
  const { gamification, awardXP } = useGamification();
  const streak = typeof gamification?.streak === 'number' ? gamification.streak : 0;

  const [quickInput, setQuickInput] = useState(false);
  const [quickText, setQuickText] = useState('');

  const effectiveTotal = todayTotal;
  const effectiveDone = todayCompleted;

  const handleToggle = async (id: string, wasCompleted: boolean) => {
    try {
      if (quests.some((q) => q.id === id)) {
        await toggleQuest(id);
      }
      if (!wasCompleted) {
        await awardXP(XP_AWARDS.TASK_COMPLETE, 'Daily quest completed');
        playSuccess();
        toast.success('+25 XP! Quest completed!');
      } else {
        playClick();
      }
    } catch {
      // ignore
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;
    try {
      await addQuest(quickText.trim());
      setQuickText('');
      setQuickInput(false);
      playXP();
      toast.success('Bounty added!');
    } catch {
      toast.error('Failed to add quest');
    }
  };

  return (
    <Panel area="dq" tone="solar" delay={120} className="gap-2 sm:gap-2.5 justify-between h-full">
      <PanelHeader
        icon={Zap}
        tone="solar"
        title="Daily Quests"
        sub="Habit & Discipline Engine"
        right={
          effectiveTotal === 0 ? (
            <span className="text-[11px] font-medium text-slate-400 font-mono">No quests</span>
          ) : (
            <div className="text-right text-xs sm:text-sm font-bold font-mono text-slate-300">
              <span className="text-[#fcd34d] font-extrabold">{effectiveDone}</span>
              <span className="text-slate-400 font-normal">/{effectiveTotal}</span>
            </div>
          )
        }
      />

      {/* Daily Quests Content Area: Dedicated non-scrolling empty state or masked scroll list */}
      {quests.length === 0 && !quickInput ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center py-1">
          <div className="well flex flex-col items-center justify-center rounded-2xl px-3.5 py-3 sm:py-3.5 text-center gap-1.5 sm:gap-2 w-full">
            <Zap size={18} className="text-amber-400 shrink-0 hidden sm:block drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
            <p className="text-xs sm:text-[13px] font-bold text-white shrink-0">No daily bounties set yet</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 max-w-[220px] leading-tight shrink-0">
              Set daily habits to earn +25 XP each
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent,black_4px,black_calc(100%-4px),transparent)] pt-2 pb-1 pr-0.5">
          {quickInput && (
            <form onSubmit={handleAddSubmit} className="flex items-center gap-1.5 p-1 shrink-0">
              <input
                type="text"
                autoFocus
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="e.g. Read 20 pages of textbook..."
                className="flex-1 bg-[#080D1D] border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-[10px] shadow-xs cursor-pointer shrink-0"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setQuickInput(false)}
                className="px-2 py-1.5 text-slate-400 hover:text-white text-xs cursor-pointer shrink-0"
              >
                ✕
              </button>
            </form>
          )}

          {quests.map((q) => (
            <button
              key={q.id}
              onClick={() => handleToggle(q.id, q.completed)}
              className={`raised tone-solar flex w-full shrink-0 items-center gap-2.5 sm:gap-3 rounded-2xl px-3 py-2.5 text-left cursor-pointer transition-all hover:scale-[1.01] hover:border-amber-400/50 hover:bg-white/[0.06] hover:shadow-[0_4px_16px_-4px_rgba(245,158,11,0.25)] ${
                q.completed ? 'is-active opacity-80' : ''
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-lg border transition-all ${
                  q.completed
                    ? 'border-amber-400 bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                    : 'border-amber-400/50 bg-black/55 hover:border-amber-400 text-transparent shadow-inner'
                }`}
              >
                <Check size={12} strokeWidth={3.5} />
              </span>
              <span
                className={`flex-1 truncate text-[clamp(11.5px,0.9vw,13.5px)] font-bold ${
                  q.completed ? 'text-slate-400 line-through' : 'text-slate-100'
                }`}
              >
                {q.title}
              </span>
              <Chip tone={q.completed ? 'mint' : 'solar'} className="shrink-0">
                {q.completed ? 'Claimed' : '+25 XP'}
              </Chip>
            </button>
          ))}
        </div>
      )}

      <footer className="flex shrink-0 items-center justify-between border-t border-white/8 pt-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 font-mono">
          <Flame size={15} className="drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]" /> {streak}d streak
        </span>
        <Btn
          tone="solar"
          onClick={() => {
            if (onOpenAddModal) onOpenAddModal();
            else setQuickInput((prev) => !prev);
          }}
          className="!px-3.5 !py-1 text-xs min-h-[30px] shrink-0"
        >
          <Plus size={14} strokeWidth={3} /> Add Quest
        </Btn>
      </footer>
    </Panel>
  );
}

export function ActiveQuests() {
  const router = useRouter();
  const tasks = useTasksStore((state) => state.tasks);
  const activeTasks = tasks.filter((t) => t.status !== 'done');

  return (
    <Panel area="aq" tone="iris" delay={180} className="gap-2 justify-between min-h-[108px] sm:min-h-[126px] !h-auto !py-2 sm:!py-2.5">
      <PanelHeader
        icon={ClipboardList}
        tone="iris"
        title="Active Quests"
        sub={activeTasks.length > 0 ? `${activeTasks.length} Active Sprints` : 'Sprint & Task Board'}
        size={30}
        right={
          <Btn
            tone="iris"
            onClick={() => router.push('/tasks')}
            className="!px-3 !py-1 text-xs whitespace-nowrap shrink-0"
          >
            <span>Quest Log</span>
            <ChevronRight size={13} strokeWidth={3} />
          </Btn>
        }
      />

      {activeTasks.length === 0 ? (
        <div className="well flex min-h-[56px] h-auto w-full items-center gap-3 rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 shrink-0">
          <ClipboardList size={18} className="text-[#a78bfa] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-[13px] font-bold text-slate-200 truncate leading-snug">
              All mission sprints clear!
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate leading-tight hidden sm:block">
              Ready for new task bounties · +50 XP
            </p>
          </div>
          <Btn
            tone="iris"
            onClick={() => router.push('/tasks')}
            className="!px-3 !py-1.5 text-xs shrink-0 whitespace-nowrap self-center"
          >
            <Plus size={12} strokeWidth={3} /> Task
          </Btn>
        </div>
      ) : (
        <div className={`grid min-h-0 flex-1 ${activeTasks.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 sm:gap-2.5 items-center w-full`}>
          {activeTasks.slice(0, 2).map((t, idx) => {
            let progress = 25;
            const taskWithSubtasks = t as typeof t & { subtasks?: Array<{ completed?: boolean }> };
            if (taskWithSubtasks.subtasks && taskWithSubtasks.subtasks.length > 0) {
              const done = taskWithSubtasks.subtasks.filter((s) => s.completed).length;
              progress = Math.round((done / taskWithSubtasks.subtasks.length) * 100);
            } else if (t.status === 'in-progress') {
              progress = 60;
            }
            const grad = idx === 0 ? 'from-[#06b6d4] to-[#8b5cf6]' : 'from-[#8b5cf6] to-[#ec4899]';
            return (
              <div
                key={t.id}
                onClick={() => router.push('/tasks')}
                className="well flex min-w-0 flex-col justify-between gap-1.5 rounded-2xl p-2.5 sm:p-3.5 cursor-pointer hover:border-[#a78bfa]/60 transition-colors h-full shadow-inner"
              >
                <div className="flex items-center justify-between gap-1 min-w-0 text-[clamp(10.5px,0.88vw,12.5px)] font-bold">
                  <span className="truncate text-slate-100 flex-1 min-w-0">{t.title}</span>
                  <span className="text-white font-mono tabular-nums font-bold text-[10.5px] bg-white/10 px-1.5 py-0.5 rounded-md border border-white/10 shrink-0 ml-1">
                    {progress}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/60 border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] shrink-0">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${grad} shadow-[0_0_12px_rgba(139,92,246,0.9)] transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export function TargetMilestone() {
  const router = useRouter();
  const { exams } = useExams();

  const nextExam = React.useMemo(() => {
    if (!exams || exams.length === 0) return null;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const upcoming = exams.filter((e) => {
      const examTime = typeof e.date === 'number' ? e.date : new Date(e.date).getTime();
      return examTime >= todayStart.getTime();
    });

    if (upcoming.length === 0) return null;
    return [...upcoming].sort((a, b) => {
      const aTime = typeof a.date === 'number' ? a.date : new Date(a.date).getTime();
      const bTime = typeof b.date === 'number' ? b.date : new Date(b.date).getTime();
      return aTime - bTime;
    })[0];
  }, [exams]);

  const days = React.useMemo(() => {
    if (!nextExam) return null;
    const examTime = typeof nextExam.date === 'number' ? nextExam.date : new Date(nextExam.date).getTime();
    return Math.max(0, Math.ceil((examTime - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [nextExam]);

  return (
    <Panel area="tgt" tone="aqua" delay={300} className="gap-1.5 sm:gap-2 justify-between h-full !py-2 sm:!py-2.5">
      <PanelHeader
        icon={Crosshair}
        tone="aqua"
        title="Target Milestone"
        sub={nextExam ? "Target locked · radar active" : "Exam & Horizon Radar"}
        size={28}
      />
      <div className="flex min-h-0 flex-1 items-center gap-2.5 sm:gap-3 w-full min-w-0">
        {/* Radar scope animation matching Image 2 */}
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full border border-[#22d3ee]/40 bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_70%)] shadow-[0_0_18px_-2px_rgba(34,211,238,0.5)]">
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute inset-[22%] rounded-full border border-[#22d3ee]/30" />
            <div className="absolute inset-[42%] rounded-full border border-[#22d3ee]/30" />
            <div
              className="absolute inset-0 animate-sweep rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent 70%, rgba(34,211,238,0.65))',
              }}
            />
            {nextExam && (
              <span className="absolute top-[24%] right-[26%] h-1.5 w-1.5 rounded-full bg-[#f472b6] shadow-[0_0_8px_#f472b6]" />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {nextExam ? (
            <>
              <div className="font-heading truncate text-[clamp(11px,0.88vw,13.5px)] font-bold text-white leading-tight">
                {nextExam.subject || nextExam.title}
              </div>
              <div className="text-[clamp(8.5px,0.78vw,10.5px)] text-[#67e8f9] font-mono tabular-nums mt-0.5 whitespace-nowrap">
                <b className="text-xs font-black text-white">{days}</b> days to go
              </div>
            </>
          ) : (
            <>
              <div className="font-heading text-[clamp(11px,0.88vw,13.5px)] font-bold text-white truncate leading-tight">
                All Targets Clear
              </div>
              <div className="text-[clamp(9.5px,0.82vw,11.5px)] text-slate-400 mt-0.5 leading-snug">No exams ahead</div>
            </>
          )}
        </div>

        <Btn
          tone="aqua"
          onClick={() => router.push('/exams')}
          className="!px-2.5 sm:!px-3 !py-1 text-xs shrink-0 whitespace-nowrap"
        >
          {nextExam ? <Radar size={12} /> : <Plus size={12} strokeWidth={2.8} />}
          <span>{nextExam ? 'Edit' : 'Exam'}</span>
        </Btn>
      </div>
    </Panel>
  );
}
