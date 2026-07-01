'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiStar, HiFire, HiClipboardCheck, HiClock,
  HiPencilAlt, HiTrendingUp, HiGlobe,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useGamification } from '@/hooks/useGamification';
import { useAuthContext } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useFriends } from '@/hooks/useFriends';
import { useLeaderboard, LeaderboardEntry } from '@/hooks/useLeaderboard';
import { ACHIEVEMENTS, getLevelProgress, getLevelFromXP, LEVEL_THRESHOLDS, TITLES } from '@/lib/constants';
import { getProfileRef, setDocument } from '@/lib/firestore';
import { getAvatarUrl } from '@/lib/constants';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import XPBar from '@/components/gamification/XPBar';
import LevelBadge from '@/components/gamification/LevelBadge';
import QuestMap from '@/components/gamification/QuestMap';
import PageTransition from '@/components/layout/PageTransition';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

type AnalyticsTab = 'stats' | 'leaderboard';

// Leaderboard Tab Component
function LeaderboardTab() {
  const { leaders, loading, userRank } = useLeaderboard();
  const { user } = useAuthContext();

  if (loading) {
    return (
      <Card padding="lg" hover={false}>
        <div className="text-center py-12">
          <motion.div
            className="text-4xl mb-3"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            🌍
          </motion.div>
          <p className="text-sm font-semibold">Loading leaderboard...</p>
        </div>
      </Card>
    );
  }

  if (leaders.length === 0) {
    return (
      <Card padding="lg" hover={false}>
        <div className="text-center py-12">
          <span className="text-5xl block mb-4">🏆</span>
          <p className="text-lg font-heading font-bold mb-2">No rankings yet!</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Complete tasks, focus sessions, and daily quests to earn XP and appear on the leaderboard.
          </p>
        </div>
      </Card>
    );
  }

  const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const RANK_COLORS: Record<number, string> = {
    1: 'from-amber-400/20 to-yellow-300/20 border-amber-400/50',
    2: 'from-slate-300/20 to-gray-200/20 border-slate-300/50',
    3: 'from-orange-400/20 to-amber-300/20 border-orange-400/50',
  };

  return (
    <div className="space-y-3">
      {/* Top 3 Podium */}
      {leaders.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          {[1, 0, 2].map((podiumIdx) => {
            const entry = leaders[podiumIdx];
            const rank = podiumIdx + 1;
            const isCurrentUser = user?.uid === entry.uid;
            return (
              <motion.div
                key={entry.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: podiumIdx * 0.1 }}
              >
                <Card
                  padding="md"
                  hover={false}
                  className={`text-center relative overflow-hidden p-2 sm:p-5 ${
                    isCurrentUser ? 'ring-2 ring-primary shadow-[0_0_16px_var(--color-primary-glow)]' : ''
                  }`}
                  gradient={rank <= 3 ? `linear-gradient(135deg, ${rank === 1 ? 'rgba(251,191,36,0.1)' : rank === 2 ? 'rgba(148,163,184,0.1)' : 'rgba(251,146,60,0.1)'}, transparent)` : undefined}
                >
                  <div className="text-xl sm:text-3xl mb-1">{RANK_MEDALS[rank]}</div>
                  <img
                    src={getAvatarUrl(entry.avatarSeed || entry.uid, entry.avatarStyle || 'adventurer')}
                    alt={entry.displayName}
                    className="w-8 h-8 sm:w-12 sm:h-12 rounded-full mx-auto mb-1.5 sm:mb-2 border border-[var(--card-border)] sm:border-2"
                  />
                  <p className="text-[10px] sm:text-xs font-heading font-bold truncate">{entry.displayName}</p>
                  <p className="text-sm sm:text-lg font-heading font-black text-primary">{entry.xp.toLocaleString()}</p>
                  <p className="text-[8px] sm:text-[9px] text-[var(--muted-foreground)] uppercase tracking-wider font-bold">XP • Lv.{entry.level}</p>
                  {isCurrentUser && (
                    <Badge variant="primary" size="sm" className="mt-1">You</Badge>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Rest of the leaderboard */}
      <Card padding="sm" hover={false}>
        <div className="divide-y divide-[var(--card-border)]">
          {leaders.map((entry, idx) => {
            const rank = idx + 1;
            const isCurrentUser = user?.uid === entry.uid;

            return (
              <motion.div
                key={entry.uid}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isCurrentUser
                    ? 'bg-primary/5 ring-1 ring-primary/30'
                    : rank <= 3
                      ? 'bg-gradient-to-r ' + (RANK_COLORS[rank] || '')
                      : 'hover:bg-[var(--card-border)]/20'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  {RANK_MEDALS[rank] ? (
                    <span className="text-lg">{RANK_MEDALS[rank]}</span>
                  ) : (
                    <span className="text-xs font-heading font-black text-[var(--muted-foreground)]">#{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <img
                  src={getAvatarUrl(entry.avatarSeed || entry.uid, entry.avatarStyle || 'adventurer')}
                  alt={entry.displayName}
                  className="w-8 h-8 rounded-full border border-[var(--card-border)] flex-shrink-0"
                />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-heading font-bold truncate">
                    {entry.displayName}
                    {isCurrentUser && <span className="text-primary ml-1">(You)</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-[var(--muted-foreground)]">Lv.{entry.level}</span>
                    {entry.streak > 0 && (
                      <span className="text-[9px] font-bold text-orange-500 flex items-center gap-0.5">
                        🔥 {entry.streak}d
                      </span>
                    )}
                  </div>
                </div>

                {/* XP */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-heading font-black text-primary">{entry.xp.toLocaleString()}</p>
                  <p className="text-[8px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">XP</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* User's rank if not in top 50 */}
      {user && !userRank && (
        <Card padding="md" hover={false} className="text-center">
          <p className="text-xs text-[var(--muted-foreground)]">
            You&apos;re not in the Top 50 yet. Keep earning XP to climb the ranks! 💪
          </p>
        </Card>
      )}
    </div>
  );
}

export default function AnalyticsContent() {
  const { gamification } = useGamification();
  const { user, profile } = useAuthContext();
  const { tasks } = useTasks();
  const { friends } = useFriends();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('stats');

  const g = gamification;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const totalTasks = tasks.length;
  const level = g?.level || 0;
  const xp = g?.xp || 0;
  const nextLevelXP = level < LEVEL_THRESHOLDS.length - 1 ? LEVEL_THRESHOLDS[level + 1] : xp;
  const currentLevelXP = LEVEL_THRESHOLDS[level] || 0;
  const xpToNext = nextLevelXP - xp;

  const stats = [
    { label: 'Total XP', value: xp.toLocaleString(), icon: <HiStar className="text-primary" size={22} />, color: 'from-primary/20 to-secondary/20' },
    { label: 'Current Level', value: `Level ${level}`, icon: <HiTrendingUp className="text-teal" size={22} />, color: 'from-teal/20 to-lime/20' },
    { label: 'Current Streak', value: `${g?.streak || 0} days`, icon: <HiFire className="text-orange-500" size={22} />, color: 'from-orange-500/20 to-amber/20' },
    { label: 'Longest Streak', value: `${g?.longestStreak || 0} days`, icon: <HiFire className="text-coral" size={22} />, color: 'from-coral/20 to-pink/20' },
    { label: 'Tasks Completed', value: completedTasks.toString(), icon: <HiClipboardCheck className="text-primary" size={22} />, color: 'from-primary/20 to-sky/20' },
    { label: 'Focus Minutes', value: `${g?.totalFocusMinutes || 0}m`, icon: <HiClock className="text-sky" size={22} />, color: 'from-sky/20 to-teal/20' },
    { label: 'Notes Created', value: (g?.totalNotesCreated || 0).toString(), icon: <HiPencilAlt className="text-amber" size={22} />, color: 'from-amber/20 to-lime/20' },
    { label: 'Friends', value: friends.length.toString(), icon: <span className="text-xl">🤝</span>, color: 'from-secondary/20 to-primary/20' },
  ];

  // Separate unlocked and locked achievements
  const unlockedIds = new Set(g?.achievements || []);
  const unlocked = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id));
  const locked = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id));

  const handleEquipTitle = async (titleId: string) => {
    const title = TITLES.find((t) => t.id === titleId);
    if (!title || !user || !gamification) return;

    const isUnlocked = title.condition(gamification);
    if (!isUnlocked) {
      toast.error(`🔒 ${title.description} to unlock!`);
      return;
    }

    const isEquipped = profile?.equippedTitle === titleId;
    await setDocument(getProfileRef(user.uid), {
      equippedTitle: isEquipped ? '' : titleId,
      updatedAt: Date.now(),
    });
    toast.success(isEquipped ? 'Title unequipped' : `${title.emoji} "${title.name}" equipped!`);
  };

  return (
    <PageTransition>
      <motion.div
        className="max-w-5xl mx-auto space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-heading font-bold">Hall of Fame</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Your complete adventure log and achievement showcase.</p>
        </motion.div>

        {/* Tab Bar */}
        <motion.div variants={itemVariants}>
          <div className="flex rounded-2xl bg-[var(--card-border)]/40 p-1.5 border-2 border-[var(--card-border)]">
            {([
              { id: 'stats' as const, label: '📊 My Stats' },
              { id: 'leaderboard' as const, label: '🌍 Leaderboard' },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-heading font-bold rounded-xl transition-all duration-200 relative uppercase tracking-wider ${
                  activeTab === tab.id ? 'text-white' : 'text-[var(--muted-foreground)]'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-secondary shadow-[0_4px_0_rgba(88,28,135,0.3)]"
                    layoutId="analytics-tab"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <motion.div variants={itemVariants}>
            <LeaderboardTab />
          </motion.div>
        )}

        {/* Stats Tab — existing content */}
        {activeTab === 'stats' && (
          <>
            {/* Level Banner */}
            <motion.div variants={itemVariants}>
              <Card
                padding="lg"
                hover={false}
                className="relative overflow-hidden"
                gradient="linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(236, 72, 153, 0.08), rgba(255, 209, 102, 0.08))"
              >
                <div className="flex items-center gap-6">
                  <LevelBadge level={level} size="xl" />
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Level Journey</p>
                    <h2 className="text-3xl font-heading font-bold mb-2">Level {level}</h2>
                    {gamification && <XPBar xp={gamification.xp} size="md" />}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">
                        {xp.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
                      </span>
                      <span className="text-[10px] font-bold text-primary">
                        {xpToNext > 0 ? `${xpToNext.toLocaleString()} XP to Level ${level + 1}` : 'MAX LEVEL! 🏆'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Quest Map */}
            <motion.div variants={itemVariants}>
              <Card padding="lg" hover={false}>
                <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                  🗺️ Quest Map
                  <Badge variant="primary" size="sm">Progression</Badge>
                </h2>
                <div className="rounded-xl overflow-hidden">
                  <QuestMap />
                </div>
              </Card>
            </motion.div>

            {/* Equippable Titles */}
            <motion.div variants={itemVariants}>
              <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                🏷️ Titles
                <Badge variant="pink" size="sm">
                  {gamification ? TITLES.filter((t) => t.condition(gamification)).length : 0}/{TITLES.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {TITLES.map((title) => {
                  const isUnlocked = gamification ? title.condition(gamification) : false;
                  const isEquipped = profile?.equippedTitle === title.id;

                  return (
                    <motion.button
                      key={title.id}
                      onClick={() => handleEquipTitle(title.id)}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        isEquipped
                          ? 'border-primary bg-primary/10 shadow-[0_0_12px_var(--color-primary-glow)]'
                          : isUnlocked
                            ? 'border-[var(--card-border)] hover:border-primary/30 bg-[var(--card-bg)]'
                            : 'border-[var(--card-border)] bg-[var(--card-bg)] opacity-40 cursor-not-allowed'
                      }`}
                      whileHover={isUnlocked ? { scale: 1.03, y: -2 } : undefined}
                      whileTap={isUnlocked ? { scale: 0.97 } : undefined}
                    >
                      <div className="text-2xl mb-1">{isUnlocked ? title.emoji : '🔒'}</div>
                      <p className="text-xs font-heading font-bold">{title.name}</p>
                      <p className="text-[8px] text-[var(--muted-foreground)] mt-0.5">{title.description}</p>
                      {isEquipped && (
                        <Badge variant="primary" size="sm" className="mt-1.5">✦ EQUIPPED</Badge>
                      )}
                      {isUnlocked && !isEquipped && (
                        <span className="text-[8px] font-bold text-primary mt-1 block">Click to equip</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
              variants={itemVariants}
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card padding="md" hover={false}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                        {stat.icon}
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">{stat.label}</p>
                        <p className="text-lg font-heading font-bold">{stat.value}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Unlocked Achievements */}
            <motion.div variants={itemVariants}>
              <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                🏆 Unlocked Achievements
                <Badge variant="teal" size="sm">{unlocked.length}/{ACHIEVEMENTS.length}</Badge>
              </h2>

              {unlocked.length === 0 ? (
                <Card padding="lg" hover={false}>
                  <div className="text-center py-6">
                    <span className="text-4xl block mb-3">🏅</span>
                    <p className="text-sm font-semibold">No achievements yet!</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Complete quests, build streaks, and earn XP to unlock them.</p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {unlocked.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card padding="md" hover={false} className="text-center">
                        <motion.div
                          className="text-4xl mb-2"
                          whileHover={{ scale: 1.2, rotate: 10 }}
                        >
                          {a.icon}
                        </motion.div>
                        <p className="text-xs font-heading font-bold">{a.title}</p>
                        <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5">{a.description}</p>
                        <Badge variant="primary" size="sm" className="mt-2">+{a.xpReward} XP</Badge>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Locked Achievements */}
            {locked.length > 0 && (
              <motion.div variants={itemVariants}>
                <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] mb-3">
                  🔒 Locked ({locked.length} remaining)
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {locked.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.03 }}
                    >
                      <Card padding="md" hover={false} className="text-center opacity-50">
                        <div className="text-3xl mb-2 grayscale">🔒</div>
                        <p className="text-xs font-heading font-bold">{a.title}</p>
                        <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5">{a.description}</p>
                        <Badge variant="muted" size="sm" className="mt-2">+{a.xpReward} XP</Badge>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </PageTransition>
  );
}
