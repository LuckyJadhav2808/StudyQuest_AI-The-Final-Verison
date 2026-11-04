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
  const streak = gamification?.streak || 1;
  const pct = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;

  const [quickInput, setQuickInput] = useState(false);
  const [quickText, setQuickText] = useState('');

  const handleToggle = async (id: string, wasCompleted: boolean) => {
    try {
      await toggleQuest(id);
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
    <Panel area="dq" tone="solar" delay={120} className="gap-2.5 justify-between">
      <PanelHeader
        icon={Zap}
        tone="solar"
        title="Daily Quests"
        tag="Bounties"
        sub="Habit & Discipline Engine"
        right={
          <div className="flex items-center gap-2">
            <div className="relative h-9 w-9 sm:h-10 sm:w-10">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--well)" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={94.2}
                  strokeDashoffset={94.2 * (1 - pct / 100)}
                  style={{
                    transition: 'stroke-dashoffset .6s',
                    filter: 'drop-shadow(0 0 4px #f59e0b)',
                  }}
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-[9px] sm:text-[10px] font-bold font-mono text-slate-800 dark:text-white">
                {todayCompleted}/{todayTotal}
              </span>
            </div>
          </div>
        }
      />

      <div className="thin-scroll -mr-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        {quickInput && (
          <form onSubmit={handleAddSubmit} className="flex items-center gap-1.5 p-1">
            <input
              type="text"
              autoFocus
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder="e.g. Read 15 mins of textbook..."
              className="flex-1 bg-white/80 dark:bg-[#080D1D] border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-[10px] shadow-xs cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setQuickInput(false)}
              className="px-2 py-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </form>
        )}

        {quests.length === 0 && !quickInput && (
          <div className="well grid flex-1 place-items-center rounded-2xl p-3 text-center text-xs text-slate-400">
            No active habit bounties. Add a quest to earn +25 XP!
          </div>
        )}

        {quests.map((q) => (
          <button
            key={q.id}
            onClick={() => handleToggle(q.id, q.completed)}
            className={`raised tone-solar flex w-full items-center gap-2.5 rounded-2xl px-3 py-1.5 sm:py-2 text-left cursor-pointer transition-all ${
              q.completed ? 'is-active opacity-80' : ''
            }`}
          >
            <span
              className={`grid h-5 w-5 sm:h-6 sm:w-6 shrink-0 place-items-center rounded-lg transition-all ${
                q.completed
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                  : 'well !rounded-lg text-transparent'
              }`}
            >
              <Check size={13} strokeWidth={3.5} />
            </span>
            <span
              className={`flex-1 truncate text-xs sm:text-[13px] font-bold ${
                q.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {q.title}
            </span>
            <Chip tone={q.completed ? 'mint' : 'solar'}>
              {q.completed ? 'Claimed' : '+25 XP'}
            </Chip>
          </button>
        ))}
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-slate-200/80 dark:border-white/8 pt-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500 font-mono">
          <Flame size={15} className="drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]" /> {streak}d streak
        </span>
        <Btn
          tone="solar"
          onClick={() => {
            if (onOpenAddModal) onOpenAddModal();
            else setQuickInput((prev) => !prev);
          }}
          className="!px-3 !py-1"
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
    <Panel area="aq" tone="iris" delay={180} className="gap-2 justify-between">
      <PanelHeader
        icon={ClipboardList}
        tone="iris"
        title="Active Quests"
        tag="Sprints"
        sub={`${activeTasks.length} Active · +50 XP per bounty`}
        size={34}
        right={
          <Btn
            tone="iris"
            onClick={() => router.push('/tasks')}
            className="!px-2.5 !py-1 text-xs"
          >
            <span>Quest Log</span>
            <ChevronRight size={13} strokeWidth={3} />
          </Btn>
        }
      />

      {activeTasks.length === 0 ? (
        <div className="well flex min-h-0 flex-1 items-center justify-between rounded-2xl px-3 py-2 text-xs text-slate-400">
          <span>All mission sprints clear! Ready for new tasks</span>
          <button
            onClick={() => router.push('/tasks')}
            className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[9px] cursor-pointer"
          >
            + Task
          </button>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
          {activeTasks.slice(0, 2).map((t) => {
            const isHigh = t.priority === 'high';
            return (
              <div
                key={t.id}
                onClick={() => router.push('/tasks')}
                className="well flex min-w-0 flex-col justify-center gap-1 rounded-2xl p-2 cursor-pointer hover:border-blue-500/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                  <span className="truncate text-slate-800 dark:text-slate-100">{t.title}</span>
                  <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-extrabold ${
                    isHigh ? 'bg-rose-500/20 text-rose-400' : 'text-blue-400'
                  }`}>
                    {isHigh ? 'RANK S' : '+50 XP'}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/30">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 shadow-[0_0_8px_rgba(37,99,235,0.8)]"
                    style={{ width: t.status === 'in-progress' ? '60%' : '20%' }}
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
    <Panel area="tgt" tone="aqua" delay={300} className="gap-2 justify-between">
      <PanelHeader
        icon={Crosshair}
        tone="aqua"
        title="Target Milestone"
        sub={nextExam ? 'Target locked · radar active' : 'Exam & Horizon Radar'}
        size={34}
      />
      <div className="flex min-h-0 flex-1 items-center gap-2.5">
        {/* Radar scope animation */}
        <div className="relative aspect-square h-full max-h-12 sm:max-h-14 shrink-0 overflow-hidden rounded-full border border-sky-400/40 bg-[radial-gradient(circle,rgba(56,189,248,0.18),transparent_70%)] shadow-[0_0_18px_-2px_rgba(56,189,248,0.5)]">
          <div className="absolute inset-[22%] rounded-full border border-sky-400/30" />
          <div className="absolute inset-[42%] rounded-full border border-sky-400/30" />
          <div
            className="absolute inset-0 animate-sweep rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 70%, rgba(56,189,248,0.65))',
            }}
          />
          {nextExam && (
            <span className="absolute top-[24%] right-[26%] h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#38BDF8]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {nextExam ? (
            <>
              <div className="font-heading truncate text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                {nextExam.subject || nextExam.title}
              </div>
              <div className="text-[11px] text-sky-400 font-mono">
                <b className="text-sm font-black text-slate-900 dark:text-white">{days}</b> days to go
              </div>
            </>
          ) : (
            <>
              <div className="font-heading text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                All Targets Clear
              </div>
              <div className="truncate text-[10px] text-slate-400">No exams on horizon</div>
            </>
          )}
        </div>

        <Btn
          tone="aqua"
          onClick={() => router.push('/exams')}
          className="!px-2.5 !py-1 text-xs"
        >
          {nextExam ? <Radar size={13} /> : <Plus size={13} strokeWidth={3} />}
          <span>{nextExam ? 'Edit' : 'Exam'}</span>
        </Btn>
      </div>
    </Panel>
  );
}
