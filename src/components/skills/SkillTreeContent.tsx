'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiSparkles, HiLockClosed, HiCheck, HiInformationCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useSkillTree } from '@/hooks/useSkillTree';
import { useGamification } from '@/hooks/useGamification';
import { SKILL_TREE_NODES } from '@/lib/constants';
import { SkillBranch, SkillNodeDef } from '@/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import PageTransition from '@/components/layout/PageTransition';
import { playSuccess, playClick } from '@/lib/sounds';

const BRANCHES: { id: SkillBranch; name: string; emoji: string; color: string; gradient: string; description: string }[] = [
  { id: 'focus', name: 'Focus Mage', emoji: '🧠', color: '#7C3AED', gradient: 'from-violet-500 to-purple-600', description: 'Boost XP and coins from Pomodoro focus sessions' },
  { id: 'combat', name: 'Task Slayer', emoji: '⚔️', color: '#EF4444', gradient: 'from-red-500 to-orange-600', description: 'Critical hits and bonus rewards from completing tasks' },
  { id: 'beast', name: 'Beastmaster', emoji: '🐾', color: '#10B981', gradient: 'from-emerald-500 to-teal-600', description: 'Keep your pet happy and strong with slower decay' },
];

const TIER_COLORS = ['#6B7280', '#3B82F6', '#8B5CF6', '#F59E0B'];
const TIER_LABELS = ['Root', 'Basic', 'Advanced', 'Ultimate'];

export default function SkillTreeContent() {
  const { skillTree, loading, hasSkill, canUnlock, unlockSkill, getBranchProgress } = useSkillTree();
  const { gamification } = useGamification();
  const [selectedSkill, setSelectedSkill] = useState<SkillNodeDef | null>(null);
  const [activeBranch, setActiveBranch] = useState<SkillBranch>('focus');
  const [unlocking, setUnlocking] = useState(false);

  const level = gamification?.level || 0;

  const handleUnlock = async (skill: SkillNodeDef) => {
    if (!canUnlock(skill.id)) return;
    setUnlocking(true);
    const success = await unlockSkill(skill.id);
    if (success) {
      playSuccess();
      toast.success(`🎉 Unlocked "${skill.name}"!`);
    } else {
      toast.error('Could not unlock skill.');
    }
    setUnlocking(false);
    setSelectedSkill(null);
  };

  const branchNodes = SKILL_TREE_NODES.filter(n => n.branch === activeBranch);
  const branchInfo = BRANCHES.find(b => b.id === activeBranch)!;
  const branchProgress = getBranchProgress(activeBranch);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-64">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">
              🌳 Skill Tree
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Spend skill points to unlock powerful perks. You earn 1 SP per level.
            </p>
          </div>
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-primary/30 bg-primary/5"
            key={skillTree.skillPoints}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
          >
            <HiSparkles className="text-primary" size={18} />
            <span className="text-lg font-heading font-black text-primary">{skillTree.skillPoints}</span>
            <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">SP</span>
          </motion.div>
        </div>

        {/* Branch Tabs */}
        <div className="grid grid-cols-3 gap-3">
          {BRANCHES.map((branch) => {
            const prog = getBranchProgress(branch.id);
            const isActive = activeBranch === branch.id;
            return (
              <motion.button
                key={branch.id}
                onClick={() => setActiveBranch(branch.id)}
                className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                  isActive
                    ? 'border-primary shadow-[0_0_20px_var(--color-primary-glow)]'
                    : 'border-[var(--card-border)] hover:border-primary/20'
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{branch.emoji}</span>
                  <div>
                    <p className="text-sm font-heading font-bold">{branch.name}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{branch.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--card-border)]">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${branch.gradient}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(prog.unlocked / prog.total) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)]">{prog.unlocked}/{prog.total}</span>
                </div>
                {isActive && (
                  <motion.div
                    className="absolute -bottom-px left-4 right-4 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full"
                    layoutId="branchIndicator"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Skill Tree Visualization */}
        <Card padding="lg" hover={false} className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, ${branchInfo.color}40, transparent 50%), radial-gradient(circle at 80% 50%, ${branchInfo.color}30, transparent 50%)`,
          }} />

          <div className="relative z-10">
            {/* Tier labels */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              {TIER_LABELS.map((label, i) => (
                <div key={label} className="text-center">
                  <Badge variant={i === 3 ? 'amber' : i === 2 ? 'primary' : i === 1 ? 'teal' : 'muted'} size="sm">
                    {label}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Skill nodes by tier */}
            <div className="grid grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((tier) => {
                const tierNodes = branchNodes.filter(n => n.tier === tier);
                return (
                  <div key={tier} className="flex flex-col items-center gap-3">
                    {tierNodes.map((node, i) => {
                      const isUnlocked = hasSkill(node.id);
                      const canBuy = canUnlock(node.id);
                      const isLocked = !isUnlocked && !canBuy;

                      return (
                        <motion.button
                          key={node.id}
                          onClick={() => setSelectedSkill(node)}
                          className={`relative w-full p-3 rounded-2xl border-2 text-center transition-all ${
                            isUnlocked
                              ? 'border-teal/50 bg-teal/5 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                              : canBuy
                                ? 'border-primary/50 bg-primary/5 shadow-[0_0_12px_var(--color-primary-glow)] cursor-pointer'
                                : 'border-[var(--card-border)] opacity-50'
                          }`}
                          whileHover={!isLocked ? { scale: 1.05, y: -2 } : undefined}
                          whileTap={!isLocked ? { scale: 0.95 } : undefined}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: isLocked ? 0.5 : 1, y: 0 }}
                          transition={{ delay: i * 0.1 + tier * 0.15 }}
                        >
                          {/* Emoji icon */}
                          <div className="text-2xl mb-1">{node.emoji}</div>

                          {/* Name */}
                          <p className="text-xs font-heading font-bold truncate">{node.name}</p>

                          {/* Cost */}
                          {node.cost > 0 && !isUnlocked && (
                            <p className="text-[9px] mt-1 font-bold" style={{ color: TIER_COLORS[tier] }}>
                              {node.cost} SP
                            </p>
                          )}

                          {/* Status indicator */}
                          {isUnlocked && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal flex items-center justify-center">
                              <HiCheck size={12} className="text-white" />
                            </div>
                          )}
                          {isLocked && node.cost > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--card-border)] flex items-center justify-center">
                              <HiLockClosed size={10} className="text-[var(--muted-foreground)]" />
                            </div>
                          )}
                          {canBuy && (
                            <motion.div
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <HiSparkles size={10} className="text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Connection lines hint */}
            <div className="mt-4 text-center">
              <p className="text-[10px] text-[var(--muted-foreground)]">
                <HiInformationCircle className="inline mr-1" size={12} />
                Click any skill to see details. Unlock skills from left to right.
              </p>
            </div>
          </div>
        </Card>

        {/* Info section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card padding="md">
            <h3 className="text-sm font-heading font-bold mb-2">📊 Your Stats</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Level</span>
                <span className="font-bold">{level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Available SP</span>
                <span className="font-bold text-primary">{skillTree.skillPoints}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Skills Unlocked</span>
                <span className="font-bold">{skillTree.unlockedSkills.length} / {SKILL_TREE_NODES.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">SP Spent</span>
                <span className="font-bold">
                  {SKILL_TREE_NODES.filter(n => hasSkill(n.id)).reduce((sum, n) => sum + n.cost, 0)}
                </span>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <h3 className="text-sm font-heading font-bold mb-2">⚡ Active Perks</h3>
            {skillTree.unlockedSkills.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">No perks active yet. Unlock skills to get bonuses!</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {skillTree.unlockedSkills.map(id => {
                  const node = SKILL_TREE_NODES.find(n => n.id === id);
                  if (!node || node.effect === 'none') return null;
                  return (
                    <div key={id} className="flex items-center gap-2 text-xs">
                      <span>{node.emoji}</span>
                      <span className="font-semibold">{node.name}</span>
                      <span className="text-[var(--muted-foreground)] text-[10px]">— {node.description}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Skill Detail Modal */}
      <Modal isOpen={!!selectedSkill} onClose={() => setSelectedSkill(null)} title={selectedSkill?.name || ''}>
        {selectedSkill && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl block mb-2">{selectedSkill.emoji}</span>
              <h3 className="text-lg font-heading font-bold">{selectedSkill.name}</h3>
              <Badge variant={selectedSkill.tier === 3 ? 'amber' : selectedSkill.tier === 2 ? 'primary' : 'teal'} size="sm">
                {TIER_LABELS[selectedSkill.tier]}
              </Badge>
            </div>

            <p className="text-sm text-center text-[var(--muted-foreground)]">
              {selectedSkill.description}
            </p>

            {selectedSkill.cost > 0 && (
              <div className="text-center">
                <span className="text-xs font-bold text-[var(--muted-foreground)]">Cost: </span>
                <span className="text-sm font-heading font-black text-primary">{selectedSkill.cost} SP</span>
              </div>
            )}

            {selectedSkill.requires.length > 0 && (
              <div className="text-center">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Requires: </span>
                {selectedSkill.requires.map(reqId => {
                  const req = SKILL_TREE_NODES.find(n => n.id === reqId);
                  return (
                    <Badge key={reqId} variant={hasSkill(reqId) ? 'teal' : 'muted'} size="sm" className="mx-0.5">
                      {req?.emoji} {req?.name}
                    </Badge>
                  );
                })}
              </div>
            )}

            <div className="flex justify-center gap-3 pt-2">
              {hasSkill(selectedSkill.id) ? (
                <Badge variant="teal" size="md">✅ Unlocked</Badge>
              ) : canUnlock(selectedSkill.id) ? (
                <Button
                  variant="primary"
                  onClick={() => handleUnlock(selectedSkill)}
                  disabled={unlocking}
                  icon={<HiSparkles />}
                >
                  {unlocking ? 'Unlocking...' : `Unlock for ${selectedSkill.cost} SP`}
                </Button>
              ) : (
                <Badge variant="muted" size="md">🔒 Locked</Badge>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
