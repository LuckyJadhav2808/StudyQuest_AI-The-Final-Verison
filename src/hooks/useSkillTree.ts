'use client';

// ============================================================
// StudyQuest AI — useSkillTree Hook
// Re-exports from shared SkillTreeContext to ensure singleton listener
// and 100% backward compatibility for all consuming components.
// ============================================================

import { useSkillTreeContext } from '@/context/SkillTreeContext';
import type { SkillTreeContextValue } from '@/context/SkillTreeContext';

export type UseSkillTreeReturn = SkillTreeContextValue;

export function useSkillTree(): SkillTreeContextValue {
  return useSkillTreeContext();
}
