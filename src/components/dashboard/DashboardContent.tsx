'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiLightningBolt, HiClipboardCheck,
  HiClock, HiTrendingUp, HiStar, HiCalendar,
  HiPlay, HiSparkles, HiFire, HiUserAdd, HiTrash,
  HiCheck, HiBell, HiClipboardCopy,
} from 'react-icons/hi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useTasks } from '@/hooks/useTasks';
import { useFriends } from '@/hooks/useFriends';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { getAvatarUrl, ACHIEVEMENTS, XP_AWARDS } from '@/lib/constants';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import XPBar from '@/components/gamification/XPBar';
import LevelBadge from '@/components/gamification/LevelBadge';
import StreakCounter from '@/components/gamification/StreakCounter';
import PageTransition from '@/components/layout/PageTransition';
import StudyHeatmap from '@/components/dashboard/StudyHeatmap';
import { playSuccess, playXP } from '@/lib/sounds';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardContent() {
  const { profile } = useAuthContext();
  const { gamification, checkStreak, awardXP, xpHistory } = useGamification();
  const { tasks } = useTasks();
  const { friends, incomingRequests, acceptRequest, rejectRequest } = useFriends();
  const { quests, addQuest, toggleQuest, deleteQuest, todayCompleted, todayTotal } = useDailyQuests();

  const [newQuest, setNewQuest] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => { checkStreak(); }, [checkStreak]);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifs]);

  const copyFriendCode = () => {
    if (profile?.friendCode) {
      navigator.clipboard.writeText(profile.friendCode);
      toast.success('Friend code copied! 📋');
    }
  };

  const todayTasks = tasks.filter((t) => t.status !== 'done');
  const completedToday = tasks.filter((t) => {
    if (t.status !== 'done') return false;
    const today = new Date().toISOString().split('T')[0];
    return new Date(t.updatedAt).toISOString().split('T')[0] === today;
  });

  const streakMessage = gamification?.streak && gamification.streak >= 3
    ? `You've studied for ${gamification.streak} days straight. ${
        gamification.streak < 10
          ? `Only ${10 - gamification.streak} more days until "Eternal Scholar"!`
          : 'Amazing dedication! 🏆'
      }`
    : 'Start a study streak to earn bonus XP!';

  const isNightOwlTime = new Date().getHours() >= 21;

  const handleAddQuest = async () => {
    if (!newQuest.trim()) return;
    await addQuest(newQuest);
    toast.success('Quest added! 🎯');
    setNewQuest('');
  };

  const handleToggleQuest = async (id: string, wasCompleted: boolean) => {
    await toggleQuest(id);
    if (!wasCompleted) {
      await awardXP(XP_AWARDS.TASK_COMPLETE, 'Daily quest completed');
      playSuccess();
      toast.success('+25 XP! Quest complete! ⚡');
    }
  };

  const handleDeleteQuest = (id: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Delete this quest?</span>
        <button onClick={() => { deleteQuest(id); toast.dismiss(t.id); toast.success('Quest removed'); }} className="px-3 py-1 bg-[#FF6B6B] text-white rounded-lg text-xs font-bold">Yes</button>
        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">No</button>
      </div>
    ), { duration: 5000 });
  };

  return (
    <PageTransition>
      <motion.div className="space-y-6 max-w-6xl mx-auto" variants={containerVariants} initial="hidden" animate="show">
        {/* ============ Welcome Banner ============ */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-primary/10 via-secondary/10 to-tertiary/10 p-6 md:p-8 border-2 border-primary/15">
            <div className="relative z-10 flex items-start gap-4">
              <motion.div className="hidden sm:flex flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary items-center justify-center text-3xl shadow-lg" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>🦉</motion.div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-heading font-black mb-1">Welcome back! Your streak is alive! 🔥</h1>
                <p className="text-sm text-[var(--muted-foreground)] max-w-xl">{streakMessage}</p>
              </div>
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <motion.button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="p-2.5 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors relative"
                  whileTap={{ scale: 0.9 }}
                >
                  <HiBell size={20} />
                  {incomingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-coral text-white text-[9px] font-bold flex items-center justify-center">{incomingRequests.length}</span>
                  )}
                </motion.button>

                {/* Notification Dropdown */}
                <AnimatePresence>
                  {showNotifs && (
                    <motion.div
                      className="absolute right-0 top-12 w-72 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-xl z-50 overflow-hidden"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    >
                      <div className="px-4 py-3 border-b-2 border-[var(--card-border)]">
                        <p className="text-xs font-heading font-bold">Notifications</p>
                      </div>
                      {incomingRequests.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-xs text-[var(--muted-foreground)]">All clear! No new notifications 🎉</p>
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto">
                          {incomingRequests.map((req) => (
                            <div key={req.id} className="px-4 py-3 border-b border-[var(--card-border)]/50 last:border-0">
                              <div className="flex items-center gap-2 mb-2">
                                <img src={getAvatarUrl(req.fromAvatar, req.fromAvatarStyle)} alt="" className="w-7 h-7 rounded-full" />
                                <p className="text-xs font-semibold flex-1">{req.fromName} wants to be friends!</p>
                              </div>
                              <div className="flex gap-1.5">
                                <button onClick={() => { acceptRequest(req); toast.success(`You and ${req.fromName} are now friends!`); }} className="flex-1 px-2 py-1 bg-teal/15 text-teal text-[10px] font-bold rounded-lg hover:bg-teal/25 transition-colors">Accept</button>
                                <button onClick={() => { rejectRequest(req.id); toast('Request declined'); }} className="flex-1 px-2 py-1 bg-coral/15 text-coral text-[10px] font-bold rounded-lg hover:bg-coral/25 transition-colors">Decline</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {gamification && gamification.streak > 0 && (
                <motion.div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/15 border-2 border-orange-500/20" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <HiFire className="text-orange-500" size={24} />
                  <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">{gamification.streak} Day Streak</p>
                </motion.div>
              )}
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 right-20 w-32 h-32 bg-secondary/10 rounded-full blur-2xl" />
          </div>
        </motion.div>

        {/* ============ Daily Quest CRUD + Level Journey ============ */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4" variants={itemVariants}>
          {/* Daily Quest Card — CRUD */}
          <Card className="lg:col-span-2 relative overflow-hidden" padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><HiSparkles className="text-primary" size={18} /></div>
              <h3 className="text-base font-heading font-bold">Daily Quests</h3>
              <Badge variant="primary" size="sm" dot>Today</Badge>
              {todayTotal > 0 && (
                <Badge variant={todayCompleted >= todayTotal ? 'teal' : 'amber'} size="sm">{todayCompleted}/{todayTotal}</Badge>
              )}
            </div>

            {/* Add quest input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add a quest for today..."
                value={newQuest}
                onChange={(e) => setNewQuest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddQuest()}
                className="flex-1 px-3 py-2 rounded-xl border-2 border-[var(--card-border)] bg-transparent text-sm font-medium focus:border-primary focus:outline-none transition-colors"
              />
              <Button variant="primary" size="sm" icon={<HiPlus />} onClick={handleAddQuest}>Add</Button>
            </div>

            {/* Quest list */}
            {quests.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] text-center py-4">No quests yet. Add one above to get started! ⚡</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {quests.map((quest) => (
                  <motion.div key={quest.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[var(--card-border)]/50 hover:border-primary/20 transition-colors" layout>
                    <motion.button onClick={() => handleToggleQuest(quest.id, quest.completed)} className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${quest.completed ? 'bg-teal/15 border-teal/30' : 'border-[var(--card-border)]'}`} whileTap={{ scale: 0.8 }}>
                      {quest.completed && <HiCheck className="text-teal" size={14} />}
                    </motion.button>
                    <span className={`flex-1 text-sm font-semibold ${quest.completed ? 'line-through opacity-50' : ''}`}>{quest.title}</span>
                    <button onClick={() => handleDeleteQuest(quest.id)} className="p-1 rounded-lg hover:bg-coral/10 text-[var(--muted-foreground)] hover:text-coral transition-colors"><HiTrash size={14} /></button>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Progress bar */}
            {todayTotal > 0 && (
              <div className="mt-3">
                <div className="xp-bar-track h-2.5">
                  <motion.div className="xp-bar-fill" animate={{ width: `${(todayCompleted / todayTotal) * 100}%` }} transition={{ duration: 0.8 }} />
                </div>
                {todayCompleted >= todayTotal && (
                  <p className="text-xs text-teal font-bold mt-1.5">🎉 All quests complete!</p>
                )}
              </div>
            )}
          </Card>

          {/* Level Journey Card */}
          <Card className="relative overflow-hidden" padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <LevelBadge level={gamification?.level || 0} size="lg" />
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Level Journey</p>
                <p className="text-2xl font-heading font-black">Level {gamification?.level || 0}</p>
              </div>
            </div>
            <XPBar xp={gamification?.xp || 0} size="md" />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">{gamification?.achievements.length || 0} achievements</span>
              <span className="text-[10px] font-bold text-primary-light">{gamification?.xp?.toLocaleString() || 0} total XP</span>
            </div>
          </Card>
        </motion.div>

        {/* ============ Stat Cards ============ */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" variants={itemVariants}>
          <Card padding="md"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center"><HiStar className="text-primary" size={22} /></div><div><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Total XP</p><motion.p className="text-xl font-heading font-black" key={gamification?.xp} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>{gamification?.xp?.toLocaleString() || 0}</motion.p></div></div></Card>
          <Card padding="md"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center"><StreakCounter streak={gamification?.streak || 0} size="md" /></div><div><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Streak</p><p className="text-xl font-heading font-black">{gamification?.streak || 0} Days</p></div></div><p className="text-[9px] text-[var(--muted-foreground)] mt-1 font-semibold">Best: {gamification?.longestStreak || 0} days</p></Card>
          <Card padding="md"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-teal/15 flex items-center justify-center"><HiClipboardCheck className="text-teal" size={22} /></div><div><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Active Quests</p><p className="text-xl font-heading font-black">{todayTasks.length}</p></div></div><p className="text-[9px] text-teal font-bold mt-1">✅ {completedToday.length} completed today</p></Card>
          <Card padding="md"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber/15 flex items-center justify-center text-xl">🏆</div><div><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Trophies</p><p className="text-xl font-heading font-black">{gamification?.achievements.length || 0}</p></div></div><p className="text-[9px] text-[var(--muted-foreground)] mt-1 font-semibold">of {ACHIEVEMENTS.length} total</p></Card>
        </motion.div>

        {/* ============ Study Heatmap ============ */}
        <motion.div variants={itemVariants}>
          <Card padding="md" hover={false}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-heading font-bold flex items-center gap-2">
                <HiCalendar className="text-primary" /> Study Activity
              </h3>
              <Badge variant="primary" size="sm">Heatmap</Badge>
            </div>
            <StudyHeatmap xpByDate={xpHistory} />
          </Card>
        </motion.div>

        {/* ============ Quick Actions ============ */}
        <motion.div variants={itemVariants}>
          <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/tasks"><Button variant="primary" size="sm" icon={<HiPlus />}>New Quest</Button></Link>
            <Link href="/timer"><Button variant="coral" size="sm" icon={<HiPlay />}>Focus Session</Button></Link>
            <Link href="/notes"><Button variant="teal" size="sm" icon={<HiPlus />}>New Scroll</Button></Link>
            <Link href="/habits"><Button variant="amber" size="sm" icon={<HiLightningBolt />}>Daily Quests</Button></Link>
          </div>
        </motion.div>

        {/* ============ Bottom Grid ============ */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4" variants={itemVariants}>
          {/* Active Quests */}
          <Card className="lg:col-span-2" padding="md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-heading font-bold flex items-center gap-2"><HiClipboardCheck className="text-primary" /> Active Quests</h3>
              <Link href="/tasks" className="text-xs text-primary font-bold hover:underline uppercase tracking-wider">View All →</Link>
            </div>
            {todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <motion.span className="text-4xl mb-3 block" animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }}>🎉</motion.span>
                <p className="text-sm font-semibold mb-1">All caught up!</p>
                <p className="text-xs text-[var(--muted-foreground)]">You&apos;ve crushed all your tasks.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 5).map((task, i) => (
                  <motion.div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-all" whileHover={{ x: 4 }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${task.priority === 'urgent' ? 'bg-coral' : task.priority === 'high' ? 'bg-orange-500' : task.priority === 'medium' ? 'bg-amber' : 'bg-teal'}`} />
                    <span className="text-sm font-semibold truncate flex-1">{task.title}</span>
                    <Badge variant={task.status === 'in-progress' ? 'amber' : 'muted'} size="sm">{task.status === 'in-progress' ? 'In Progress' : 'To Do'}</Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>

          {/* Right column */}
          <div className="space-y-4">
            {isNightOwlTime && (
              <Card className="relative overflow-hidden" padding="md" gradient="linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(236, 72, 153, 0.15))">
                <div className="flex items-center gap-2 mb-2"><span className="text-2xl">🌙</span><div><p className="text-xs font-bold uppercase tracking-wider text-secondary">Night Owl Event!</p><p className="text-[10px] text-[var(--muted-foreground)]">Active now</p></div></div>
                <p className="text-xs text-[var(--muted-foreground)]">Study between 9PM - 12AM for 2x XP multipliers.</p>
              </Card>
            )}

            {/* Achievements Grid */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-heading font-bold flex items-center gap-2">🏆 Hall of Fame</h3>
                <Link href="/analytics" className="text-[10px] text-primary font-bold hover:underline uppercase tracking-wider">View All</Link>
              </div>
              {(!gamification || gamification.achievements.length === 0) ? (
                <div className="text-center py-4"><span className="text-3xl mb-2 block">🏅</span><p className="text-xs text-[var(--muted-foreground)]">Complete quests to unlock achievements!</p></div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {gamification.achievements.slice(0, 6).map((id) => {
                    const a = ACHIEVEMENTS.find((x) => x.id === id);
                    if (!a) return null;
                    return (
                      <motion.div key={id} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[var(--card-border)]/30" whileHover={{ scale: 1.1, y: -2 }} title={`${a.title}: ${a.description}`}>
                        <span className="text-2xl">{a.icon}</span>
                        <span className="text-[8px] font-bold text-center truncate w-full">{a.title}</span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Friends */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-heading font-bold flex items-center gap-2"><HiTrendingUp className="text-teal" /> Friends {incomingRequests.length > 0 && <Badge variant="coral" size="sm">{incomingRequests.length} new</Badge>}</h3>
                <Link href="/groups" className="text-[10px] text-primary font-bold hover:underline uppercase tracking-wider">Manage</Link>
              </div>
              {friends.length === 0 ? (
                <div className="text-center py-3"><p className="text-xs text-[var(--muted-foreground)] mb-2">No friends yet!</p><Link href="/groups"><Button variant="primary" size="sm" icon={<HiUserAdd />}>Add Friends</Button></Link></div>
              ) : (
                <div>
                  <div className="flex items-center -space-x-2 mb-2">
                    {friends.slice(0, 5).map((friend, i) => (
                      <motion.img key={friend.uid} src={getAvatarUrl(friend.avatarSeed, friend.avatarStyle)} alt={friend.displayName} className="w-9 h-9 rounded-full ring-2 ring-[var(--card-bg)] bg-surface-200" initial={{ scale: 0, x: -10 }} animate={{ scale: 1, x: 0 }} transition={{ delay: i * 0.08 }} title={friend.displayName} />
                    ))}
                    {friends.length > 5 && <div className="w-9 h-9 rounded-full ring-2 ring-[var(--card-bg)] bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">+{friends.length - 5}</div>}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-semibold">{friends.length} friend{friends.length !== 1 ? 's' : ''}</p>
                </div>
              )}
              {/* Your Friend Code */}
              <div className="mt-3 pt-3 border-t-2 border-[var(--card-border)]">
                <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1">Your Friend Code</p>
                <div className="flex items-center gap-2">
                  <span className="text-base font-heading font-black tracking-[0.2em] text-primary">{profile?.friendCode || '------'}</span>
                  <button onClick={copyFriendCode} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Copy code"><HiClipboardCopy size={14} className="text-primary" /></button>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
