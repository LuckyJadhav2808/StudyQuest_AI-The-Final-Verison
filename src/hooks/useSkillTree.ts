'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToDocument, setDocument } from '@/lib/firestore';
import { useAuthContext } from '@/context/AuthContext';
import { SkillTreeData } from '@/types';
import { SKILL_TREE_NODES } from '@/lib/constants';

const DEFAULT_SKILL_TREE: SkillTreeData = {
  skillPoints: 0,
  unlockedSkills: [],
};

export function useSkillTree() {
  const { user } = useAuthContext();
  const [skillTree, setSkillTree] = useState<SkillTreeData>(DEFAULT_SKILL_TREE);
  const [loading, setLoading] = useState(true);

  // Subscribe to skill tree data
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const ref = doc(db, 'users', user.uid, 'data', 'skillTree');
    const unsub = subscribeToDocument<SkillTreeData>(ref, (data) => {
      setSkillTree(data ? { ...DEFAULT_SKILL_TREE, ...data } : DEFAULT_SKILL_TREE);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  // Check if a skill is unlocked
  const hasSkill = useCallback((skillId: string): boolean => {
    return skillTree.unlockedSkills.includes(skillId);
  }, [skillTree.unlockedSkills]);

  // Check if a skill can be unlocked (prerequisites met + enough SP)
  const canUnlock = useCallback((skillId: string): boolean => {
    const node = SKILL_TREE_NODES.find(n => n.id === skillId);
    if (!node) return false;
    if (hasSkill(skillId)) return false;
    if (skillTree.skillPoints < node.cost) return false;
    // Check prerequisites
    return node.requires.every(reqId => hasSkill(reqId));
  }, [skillTree, hasSkill]);

  // Unlock a skill
  const unlockSkill = useCallback(async (skillId: string): Promise<boolean> => {
    if (!user?.uid || !canUnlock(skillId)) return false;
    const node = SKILL_TREE_NODES.find(n => n.id === skillId);
    if (!node) return false;

    const updated: SkillTreeData = {
      skillPoints: skillTree.skillPoints - node.cost,
      unlockedSkills: [...skillTree.unlockedSkills, skillId],
    };

    const ref = doc(db, 'users', user.uid, 'data', 'skillTree');
    await setDocument(ref, updated, false);
    return true;
  }, [user?.uid, skillTree, canUnlock]);

  // Add skill points (called on level up)
  const addSkillPoints = useCallback(async (amount: number) => {
    if (!user?.uid) return;
    const ref = doc(db, 'users', user.uid, 'data', 'skillTree');
    const updated: SkillTreeData = {
      ...skillTree,
      skillPoints: skillTree.skillPoints + amount,
    };
    await setDocument(ref, updated, false);
  }, [user?.uid, skillTree]);

  // Check if an effect is active
  const hasEffect = useCallback((effectKey: string): boolean => {
    return skillTree.unlockedSkills.some(id => {
      const node = SKILL_TREE_NODES.find(n => n.id === id);
      return node?.effect === effectKey;
    });
  }, [skillTree.unlockedSkills]);

  // Get total unlocked count per branch
  const getBranchProgress = useCallback((branch: 'focus' | 'combat' | 'beast') => {
    const branchNodes = SKILL_TREE_NODES.filter(n => n.branch === branch);
    const unlocked = branchNodes.filter(n => hasSkill(n.id)).length;
    return { unlocked, total: branchNodes.length };
  }, [hasSkill]);

  return {
    skillTree,
    loading,
    hasSkill,
    canUnlock,
    unlockSkill,
    addSkillPoints,
    hasEffect,
    getBranchProgress,
  };
}
