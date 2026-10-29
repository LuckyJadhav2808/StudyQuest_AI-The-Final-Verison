'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HiX,
  HiBell,
  HiCheck,
  HiFire,
  HiLightningBolt,
  HiAcademicCap,
  HiSparkles,
  HiClock,
  HiArrowRight,
  HiUserGroup,
  HiGift,
} from 'react-icons/hi';
import { useFriends } from '@/hooks/useFriends';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { useGamification } from '@/hooks/useGamification';
import { useExams } from '@/hooks/useExams';
import { useShop } from '@/hooks/useShop';
import { getAvatarUrl } from '@/lib/constants';
import { playClick, playSuccess } from '@/lib/sounds';
import toast from 'react-hot-toast';
import type { FriendRequest } from '@/types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTreasureChest?: () => void;
}

export default function NotificationDrawer({
  isOpen,
  onClose,
  onOpenTreasureChest,
}: NotificationDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'activity' | 'requests'>('activity');
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Live contextual subscriptions
  const { incomingRequests, acceptRequest, rejectRequest, loading: friendsLoading } = useFriends();
  const { quests, todayCompleted, todayTotal } = useDailyQuests();
  const { gamification } = useGamification();
  const { exams } = useExams();
  const { canClaimTreasureChest } = useShop();

  const isChestReady = canClaimTreasureChest ? canClaimTreasureChest() : false;
  const streak = gamification?.streak || 0;
  const streakMultiplier = streak > 1 ? (1 + Math.min(streak * 0.1, 1.0)).toFixed(1) : null;

  // Upcoming nearest exam milestone
  const nearestExam = useMemo(() => {
    if (!exams || exams.length === 0) return null;
    const now = Date.now();
    const upcoming = exams
      .filter((e) => e.date >= now)
      .sort((a, b) => a.date - b.date);
    if (upcoming.length === 0) return null;

    const diffDays = Math.ceil((upcoming[0].date - now) / (1000 * 60 * 60 * 24));
    return {
      exam: upcoming[0],
      daysLeft: diffDays,
    };
  }, [exams]);

  // Total unread / actionable alerts counter
  const totalCount = useMemo(() => {
    let count = incomingRequests.length;
    if (isChestReady && !dismissedAlerts.includes('chest')) count += 1;
    if (todayTotal > 0 && todayCompleted === todayTotal && !dismissedAlerts.includes('quests-complete')) count += 1;
    if (nearestExam && nearestExam.daysLeft <= 7 && !dismissedAlerts.includes(`exam-${nearestExam.exam.id}`)) count += 1;
    return count;
  }, [incomingRequests.length, isChestReady, todayTotal, todayCompleted, nearestExam, dismissedAlerts]);

  // Escape key listener & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleAcceptRequest = async (request: FriendRequest) => {
    setProcessingId(request.id);
    try {
      await acceptRequest(request);
      playSuccess();
      toast.success(`You and ${request.fromName} are now study partners!`);
    } catch {
      toast.error('Could not accept friend request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await rejectRequest(requestId);
      playClick();
      toast('Request declined');
    } catch {
      toast.error('Could not decline request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismissAlert = (id: string) => {
    playClick();
    setDismissedAlerts((prev) => [...prev, id]);
  };

  const handleClearAllDismissible = () => {
    playClick();
    const ids = ['chest', 'quests-complete'];
    if (nearestExam) ids.push(`exam-${nearestExam.exam.id}`);
    setDismissedAlerts(ids);
    toast.success('Activity notifications cleared');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Smoked Glass Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            aria-hidden="true"
          />

          {/* Slide-over Obsidian Glass Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-md h-full bg-white/95 dark:bg-[#0B0D1E]/95 backdrop-blur-2xl border-l border-indigo-100 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col z-10 overflow-hidden select-none"
            role="dialog"
            aria-modal="true"
            aria-label="Activity & Notification Center"
          >
            {/* Ambient Lighting Sheen */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* ── Drawer Header ── */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-indigo-100/80 dark:border-white/10 relative z-10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-500 shadow-2xs">
                  <HiBell size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-heading font-black tracking-wide text-slate-900 dark:text-white leading-tight">
                      Activity Center
                    </h2>
                    {totalCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white font-mono text-[9px] font-black shadow-xs">
                        {totalCount} New
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Duels, bounties, and milestone radar
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  ESC
                </kbd>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  aria-label="Close notification drawer"
                >
                  <HiX size={16} />
                </button>
              </div>
            </div>

            {/* ── Tabs Segmented Control ── */}
            <div className="px-4 pt-3 pb-2 border-b border-indigo-100/60 dark:border-white/10 relative z-10 shrink-0">
              <div className="grid grid-cols-2 p-1 rounded-xl bg-indigo-50/70 dark:bg-black/30 border border-indigo-100 dark:border-white/10">
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'activity'
                      ? 'bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <HiSparkles size={14} />
                  <span>Activity & Quests</span>
                </button>

                <button
                  onClick={() => setActiveTab('requests')}
                  className={`relative py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'requests'
                      ? 'bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <HiUserGroup size={14} />
                  <span>Friend Requests</span>
                  {incomingRequests.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-coral text-white font-mono text-[9px] font-black flex items-center justify-center shadow-xs">
                      {incomingRequests.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar relative z-10">
              {activeTab === 'activity' ? (
                <>
                  {/* Daily Treasure Chest Banner (if ready) */}
                  {isChestReady && !dismissedAlerts.includes('chest') && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/35 relative overflow-hidden group shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/25 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0">
                          <HiGift size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-heading font-black text-slate-900 dark:text-white">
                              Daily Treasure Chest Ready
                            </span>
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[8px] font-mono font-black uppercase">
                              Loot
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 dark:text-amber-200/80 mt-0.5">
                            Claim today's coins, XP bonus, and study artifacts.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => {
                                onClose();
                                if (onOpenTreasureChest) {
                                  onOpenTreasureChest();
                                } else {
                                  router.push('/');
                                }
                              }}
                              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black shadow-xs transition-colors cursor-pointer"
                            >
                              Open Chest Now
                            </button>
                            <button
                              onClick={() => handleDismissAlert('chest')}
                              className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white px-2 py-1"
                            >
                              Later
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Daily Quests Bounty Milestone */}
                  <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-black/25 border border-indigo-100/80 dark:border-white/10 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-50 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                          <HiLightningBolt size={14} />
                        </div>
                        <span className="text-[11px] font-heading font-black text-slate-900 dark:text-white">
                          Daily Quests Bounty
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                        {todayCompleted} / {todayTotal} Complete
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{
                            width: todayTotal > 0 ? `${Math.round((todayCompleted / todayTotal) * 100)}%` : '0%',
                          }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-2">
                        {todayTotal === 0
                          ? 'No daily quests active. Add a daily bounty on the dashboard!'
                          : todayCompleted === todayTotal
                          ? '🎉 All daily quests completed! +100 XP Bounty unlocked.'
                          : `Complete ${todayTotal - todayCompleted} more quest${
                              todayTotal - todayCompleted > 1 ? 's' : ''
                            } today to maximize your daily reward.`}
                      </p>
                    </div>
                  </div>

                  {/* Streak Retention & Health */}
                  <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-black/25 border border-indigo-100/80 dark:border-white/10 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-50 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                          <HiFire size={14} />
                        </div>
                        <span className="text-[11px] font-heading font-black text-slate-900 dark:text-white">
                          Streak Telemetry
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-mono text-[9px] font-bold">
                        {streak} Days Active
                      </span>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {streak > 0 ? (
                        <p>
                          Your streak is currently protected. Log at least one focus session today to advance toward your next milestone!
                          {streakMultiplier && (
                            <span className="block mt-1 font-bold text-amber-500">
                              ⚡ Active XP Multiplier: {streakMultiplier}x
                            </span>
                          )}
                        </p>
                      ) : (
                        <p>
                          Start a 25-minute Pomodoro focus block on the dashboard today to ignite a new streak!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Nearest Exam / Horizon Radar Milestone */}
                  {nearestExam && !dismissedAlerts.includes(`exam-${nearestExam.exam.id}`) && (
                    <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-500">
                            <HiAcademicCap size={14} />
                          </div>
                          <span className="text-[11px] font-heading font-black text-slate-900 dark:text-white">
                            Exam Horizon Radar
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-600 dark:text-cyan-300 font-mono text-[9px] font-bold">
                          {nearestExam.daysLeft === 0
                            ? 'Today!'
                            : `${nearestExam.daysLeft} Day${nearestExam.daysLeft > 1 ? 's' : ''} Left`}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-900 dark:text-cyan-100 mt-2">
                        {nearestExam.exam.title} ({nearestExam.exam.subject})
                      </p>
                      <p className="text-[10px] text-slate-600 dark:text-cyan-200/80 mt-0.5">
                        Keep revision notes current. Review high-yield formulas before the milestone date.
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <Link
                          href="/exams"
                          onClick={onClose}
                          className="text-[10px] font-bold text-cyan-600 dark:text-cyan-300 hover:underline flex items-center gap-1"
                        >
                          <span>Open Exam Radar</span>
                          <HiArrowRight size={10} />
                        </Link>
                        <button
                          onClick={() => handleDismissAlert(`exam-${nearestExam.exam.id}`)}
                          className="text-[9px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions / Clear Footer */}
                  <div className="pt-2 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">
                      All systems synchronized
                    </span>
                    <button
                      onClick={handleClearAllDismissible}
                      className="text-primary hover:underline font-bold cursor-pointer"
                    >
                      Clear Dismissible
                    </button>
                  </div>
                </>
              ) : (
                /* ── Tab 2: Incoming Friend Requests ── */
                <>
                  {friendsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-[11px] font-semibold mt-2">Loading partner requests...</p>
                    </div>
                  ) : incomingRequests.length > 0 ? (
                    <div className="space-y-2.5">
                      {incomingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-2xl bg-white/80 dark:bg-black/35 border border-indigo-100 dark:border-white/10 shadow-2xs flex items-center justify-between gap-3"
                        >
                          <img
                            src={getAvatarUrl(req.fromAvatar, req.fromAvatarStyle)}
                            alt={req.fromName}
                            className="w-9 h-9 rounded-full ring-2 ring-violet-500/30 object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-heading font-black text-slate-900 dark:text-white truncate">
                              {req.fromName}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              Invited you to be study partners
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <motion.button
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.92 }}
                              disabled={processingId === req.id}
                              onClick={() => handleAcceptRequest(req)}
                              className="w-7 h-7 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                              title="Accept Friend Request"
                            >
                              <HiCheck size={14} strokeWidth={2.5} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.92 }}
                              disabled={processingId === req.id}
                              onClick={() => handleRejectRequest(req.id)}
                              className="w-7 h-7 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                              title="Decline Request"
                            >
                              <HiX size={14} />
                            </motion.button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-white/[0.06] border border-indigo-100 dark:border-white/10 flex items-center justify-center text-primary mb-3">
                        <HiUserGroup size={24} />
                      </div>
                      <h4 className="text-xs font-heading font-black text-slate-900 dark:text-white">
                        No Pending Partner Invites
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[220px]">
                        Share your friend code in the study groups hub to connect with scholars.
                      </p>
                      <Link
                        href="/groups"
                        onClick={onClose}
                        className="mt-4 px-3.5 py-1.5 rounded-full bg-primary text-white text-[10px] font-bold shadow-xs hover:bg-primary-dark transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>Open Study Groups</span>
                        <HiArrowRight size={12} />
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Drawer Bottom Dock ── */}
            <div className="p-3.5 border-t border-indigo-100/80 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 flex items-center justify-between text-[11px] shrink-0">
              <Link
                href="/tasks"
                onClick={onClose}
                className="text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary-light font-bold transition-colors flex items-center gap-1"
              >
                <span>Quest Kanban</span>
                <HiArrowRight size={12} />
              </Link>
              <Link
                href="/groups"
                onClick={onClose}
                className="text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary-light font-bold transition-colors flex items-center gap-1"
              >
                <span>Study Groups</span>
                <HiArrowRight size={12} />
              </Link>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
