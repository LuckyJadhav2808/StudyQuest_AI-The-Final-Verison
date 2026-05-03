'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  HiStar, HiFire, HiClipboardCheck, HiClock,
  HiPencilAlt, HiTrendingUp,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useGamification } from '@/hooks/useGamification';
import { useAuthContext } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useFriends } from '@/hooks/useFriends';
import { ACHIEVEMENTS, getLevelProgress, getLevelFromXP, LEVEL_THRESHOLDS, TITLES } from '@/lib/constants';
import { getProfileRef, setDocument } from '@/lib/firestore';
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

export default function AnalyticsContent() {
  const { gamification } = useGamification();
  const { user, profile } = useAuthContext();
  const { tasks } = useTasks();
  const { friends } = useFriends();

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
                <XPBar xp={xp} size="md" />
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
            <QuestMap />
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
      </motion.div>
    </PageTransition>
  );
}
