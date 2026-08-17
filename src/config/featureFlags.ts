// ============================================================
// StudyQuest AI — Production Feature Flag & Kill-Switch System
// ============================================================

export interface FeatureFlags {
  studyTracker: boolean;
  dsaDungeon: boolean;
  typingArcade: boolean;
  alchemyLab: boolean;
  whiteboard: boolean;
  codeRunner: boolean;
  sqlLab: boolean;
  petSystem: boolean;
  itemShop: boolean;
  skillTree: boolean;
  studyGroups: boolean;
  examsCountdown: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  studyTracker: true,    // Interactive Syllabus & Progress Tracker
  dsaDungeon: true,      // DSA Problem Sheets & Arenas
  typingArcade: true,    // Typing Speed Arcade
  alchemyLab: true,      // Formula & Knowledge Alchemist
  whiteboard: true,      // Canvas & Diagramming
  codeRunner: true,      // Code Execution IDE
  sqlLab: true,          // Interactive SQL Sandbox
  petSystem: true,       // Virtual Mascot Companions
  itemShop: true,        // XP Shop & Customization
  skillTree: true,       // Skill Tree Progression
  studyGroups: true,     // Multiplayer Study Squads
  examsCountdown: true,  // Exam Countdown Timers
};

const STORAGE_KEY = 'studyquest_feature_flag_overrides';

/**
 * Returns active state for a feature flag.
 * Checks runtime localStorage overrides first, then falls back to defaults.
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  if (typeof window === 'undefined') {
    return DEFAULT_FEATURE_FLAGS[flag] ?? true;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const overrides = JSON.parse(raw);
      if (typeof overrides[flag] === 'boolean') {
        return overrides[flag];
      }
    }
  } catch (e) {
    console.warn('Failed to parse feature flag overrides from localStorage', e);
  }

  return DEFAULT_FEATURE_FLAGS[flag] ?? true;
}

/**
 * Returns complete map of feature flags with local overrides applied.
 */
export function getAllFeatureFlags(): FeatureFlags {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_FEATURE_FLAGS };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const overrides = JSON.parse(raw);
      return { ...DEFAULT_FEATURE_FLAGS, ...overrides };
    }
  } catch (e) {
    console.warn('Failed to read feature flags', e);
  }

  return { ...DEFAULT_FEATURE_FLAGS };
}

/**
 * Sets a runtime override for a feature flag (Instant Kill-Switch toggle).
 */
export function setFeatureFlagOverride(flag: keyof FeatureFlags, enabled: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getAllFeatureFlags();
    const updated = { ...current, [flag]: enabled };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('featureflags_updated'));
  } catch (e) {
    console.error('Failed to set feature flag override', e);
  }
}

/**
 * Resets all feature flags back to system defaults.
 */
export function resetFeatureFlags(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('featureflags_updated'));
  } catch (e) {
    console.error('Failed to reset feature flags', e);
  }
}
