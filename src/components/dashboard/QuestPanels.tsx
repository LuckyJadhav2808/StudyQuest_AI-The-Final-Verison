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

const DEFAULT_BOUNTIES = [
  { id: 'def-1', title: "Review yesterday's notes", completed: false, xp: 25 },
  { id: 'def-2', title: "Solve 5 practice problems", completed: false, xp: 25 },
];

export function DailyQuests({ onOpenAddModal }: { onOpenAddModal?: () => void }) {
  const { quests, toggleQuest, addQuest, todayCompleted, todayTotal } = useDailyQuests();
  const { gamification, awardXP } = useGamification();
  const streak = gamification?.streak || 3;

  const [quickInput, setQuickInput] = useState(false);
  const [quickText, setQuickText] = useState('');

  // Use real quests if available; otherwise show default bounties so dashboard looks rich like Image 2
  const displayQuests = quests.length > 0 ? quests : DEFAULT_BOUNTIES;
  const effectiveTotal = todayTotal > 0 ? todayTotal : displayQuests.length;
  const effectiveDone = todayTotal > 0 ? todayCompleted : displayQuests.filter((q) => q.completed).length;
  const pct = effectiveTotal > 0 ? (effectiveDone / effectiveTotal) * 100 : 0;

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
          <div className="text-right text-xs sm:text-sm font-bold font-mono text-slate-300">
            <span className="text-[#fcd34d] font-extrabold">{effectiveDone}</span>
            <span className="text-slate-400 font-normal">/{effectiveTotal}</span>
          </div>
        }
      />

      <div className="thin-scroll flex min-h-0 flex-1 flex-col justify-center gap-2 overflow-y-auto pr-0.5">
        {quickInput && (
          <form onSubmit={handleAddSubmit} className="flex items-center gap-1.5 p-1">
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

        {displayQuests.slice(0, 2).map((q) => (
          <button
            key={q.id}
            onClick={() => handleToggle(q.id, q.completed)}
            className={`raised tone-solar flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left cursor-pointer transition-all ${
              q.completed ? 'is-active opacity-80' : ''
            }`}
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all ${
                q.completed
                  ? 'border-amber-400 bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                  : 'border-white/15 bg-black/45 text-transparent'
              }`}
            >
              <Check size={12} strokeWidth={3.5} />
            </span>
            <span
              className={`flex-1 truncate text-xs sm:text-[13px] font-bold ${
                q.completed ? 'text-slate-400 line-through' : 'text-slate-100'
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
          className="!px-3.5 !py-1 text-xs"
        >
          <Plus size={14} strokeWidth={3} /> Add Quest
        </Btn>
      </footer>
    </Panel>
  );
}

const DEFAULT_SPRINTS = [
  { id: 'sp-1', name: 'Physics Ch.4 pro...', progress: 40, grad: 'from-[#06b6d4] to-[#8b5cf6]' },
  { id: 'sp-2', name: 'Essay outline draft', progress: 60, grad: 'from-[#8b5cf6] to-[#ec4899]' },
];

export function ActiveQuests() {
  const router = useRouter();
  const tasks = useTasksStore((state) => state.tasks);
  const activeTasks = tasks.filter((t) => t.status !== 'done');

  const displaySprints = activeTasks.length > 0
    ? activeTasks.slice(0, 2).map((t, idx) => ({
        id: t.id,
        name: t.title,
        progress: t.status === 'in-progress' ? 60 : 35,
        grad: idx === 0 ? 'from-[#06b6d4] to-[#8b5cf6]' : 'from-[#8b5cf6] to-[#ec4899]',
      }))
    : DEFAULT_SPRINTS;

  return (
    <Panel area="aq" tone="iris" delay={180} className="gap-2 justify-between h-full">
      <PanelHeader
        icon={ClipboardList}
        tone="iris"
        title="Active Quests"
        tag="SPRINTS"
        sub={`${displaySprints.length} Active · +50 XP per bounty`}
        size={34}
        right={
          <Btn
            tone="iris"
            onClick={() => router.push('/tasks')}
            className="!px-3 !py-1 text-xs whitespace-nowrap"
          >
            <span>Quest Log</span>
            <ChevronRight size={13} strokeWidth={3} />
          </Btn>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 items-center">
        {displaySprints.map((s) => (
          <div
            key={s.id}
            onClick={() => router.push('/tasks')}
            className="well flex min-w-0 flex-col justify-center gap-1.5 rounded-2xl p-2.5 cursor-pointer hover:border-[#a78bfa]/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-1 text-xs font-bold">
              <span className="truncate text-slate-100">{s.name}</span>
              <span className="text-[#c4b5fd] font-mono text-[11px] shrink-0">{s.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/40">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${s.grad} shadow-[0_0_10px_rgba(139,92,246,0.8)] transition-all duration-500`}
                style={{ width: `${s.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
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
    <Panel area="tgt" tone="aqua" delay={300} className="gap-2 justify-between h-full">
      <PanelHeader
        icon={Crosshair}
        tone="aqua"
        title="Target Milestone"
        sub="Exam & Horizon Radar"
        size={34}
      />
      <div className="flex min-h-0 flex-1 items-center gap-3">
        {/* Radar scope animation matching Image 2 */}
        <div className="relative aspect-square h-full max-h-12 shrink-0 overflow-hidden rounded-full border border-[#22d3ee]/40 bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_70%)] shadow-[0_0_18px_-2px_rgba(34,211,238,0.5)]">
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

        <div className="min-w-0 flex-1">
          {nextExam ? (
            <>
              <div className="font-heading truncate text-xs sm:text-sm font-bold text-white">
                {nextExam.subject || nextExam.title}
              </div>
              <div className="text-[11px] text-[#67e8f9] font-mono">
                <b className="text-sm font-black text-white">{days}</b> days to go
              </div>
            </>
          ) : (
            <>
              <div className="font-heading text-xs sm:text-sm font-bold text-white truncate">
                All Targets Clear
              </div>
              <div className="truncate text-[10px] text-slate-400">No exams on the horizon</div>
            </>
          )}
        </div>

        <Btn
          tone="aqua"
          onClick={() => router.push('/exams')}
          className="!px-3 !py-1 text-xs shrink-0"
        >
          {nextExam ? <Radar size={13} /> : <Plus size={13} strokeWidth={3} />}
          <span>{nextExam ? 'Edit' : 'Exam'}</span>
        </Btn>
      </div>
    </Panel>
  );
}
