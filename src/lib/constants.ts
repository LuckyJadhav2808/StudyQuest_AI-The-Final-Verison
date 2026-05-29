// ============================================================
// StudyQuest AI — Constants & Configuration
// ============================================================

import { Achievement, GamificationData, ShopItem } from '@/types';

// ----- XP Awards -----
export const XP_AWARDS = {
  TASK_COMPLETE: 25,
  TASK_COMPLETE_URGENT: 50,
  POMODORO_COMPLETE: 15,
  NOTE_CREATED: 10,
  HABIT_CHECKED: 10,
  STREAK_BONUS: 5, // per day of streak
  DAILY_LOGIN: 5,
  GROUP_MESSAGE: 2,
  DAILY_CHALLENGE_MULTIPLIER: 3, // 3x XP for daily code challenge
} as const;

// ----- Level Thresholds -----
// Level N requires LEVEL_THRESHOLDS[N] total XP
export const LEVEL_THRESHOLDS = [
  0,     // Level 0 (starter)
  100,   // Level 1
  300,   // Level 2
  600,   // Level 3
  1000,  // Level 4
  1500,  // Level 5
  2100,  // Level 6
  2800,  // Level 7
  3600,  // Level 8
  4500,  // Level 9
  5500,  // Level 10
  6600,  // Level 11
  7800,  // Level 12
  9100,  // Level 13
  10500, // Level 14
  12000, // Level 15
  13600, // Level 16
  15300, // Level 17
  17100, // Level 18
  19000, // Level 19
  21000, // Level 20
];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length - 1;

// Calculate level from XP
export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

// Get XP progress within current level (0.0 - 1.0)
export function getLevelProgress(xp: number): number {
  const level = getLevelFromXP(xp);
  if (level >= MAX_LEVEL) return 1;
  const currentThreshold = LEVEL_THRESHOLDS[level];
  const nextThreshold = LEVEL_THRESHOLDS[level + 1];
  return (xp - currentThreshold) / (nextThreshold - currentThreshold);
}

// ----- Achievements -----
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-task',
    title: 'First Steps',
    description: 'Complete your first task',
    icon: '🎯',
    xpReward: 50,
    condition: (d: GamificationData) => d.totalTasksCompleted >= 1,
  },
  {
    id: 'task-master-10',
    title: 'Task Apprentice',
    description: 'Complete 10 tasks',
    icon: '📋',
    xpReward: 100,
    condition: (d: GamificationData) => d.totalTasksCompleted >= 10,
  },
  {
    id: 'task-master-50',
    title: 'Task Master',
    description: 'Complete 50 tasks',
    icon: '🏆',
    xpReward: 250,
    condition: (d: GamificationData) => d.totalTasksCompleted >= 50,
  },
  {
    id: 'task-legend-100',
    title: 'Task Legend',
    description: 'Complete 100 tasks',
    icon: '👑',
    xpReward: 500,
    condition: (d: GamificationData) => d.totalTasksCompleted >= 100,
  },
  {
    id: 'streak-3',
    title: 'Getting Started',
    description: '3-day activity streak',
    icon: '🔥',
    xpReward: 50,
    condition: (d: GamificationData) => d.streak >= 3,
  },
  {
    id: 'streak-7',
    title: 'On Fire',
    description: '7-day activity streak',
    icon: '🔥',
    xpReward: 100,
    condition: (d: GamificationData) => d.streak >= 7,
  },
  {
    id: 'streak-30',
    title: 'Unstoppable',
    description: '30-day activity streak',
    icon: '💎',
    xpReward: 500,
    condition: (d: GamificationData) => d.streak >= 30,
  },
  {
    id: 'focus-master',
    title: 'Focus Master',
    description: 'Complete 100 minutes of focus time',
    icon: '🧠',
    xpReward: 150,
    condition: (d: GamificationData) => d.totalFocusMinutes >= 100,
  },
  {
    id: 'deep-focus',
    title: 'Deep Focus',
    description: 'Complete 500 minutes of focus time',
    icon: '🎓',
    xpReward: 400,
    condition: (d: GamificationData) => d.totalFocusMinutes >= 500,
  },
  {
    id: 'note-taker',
    title: 'Note Taker',
    description: 'Create 10 notes',
    icon: '📝',
    xpReward: 75,
    condition: (d: GamificationData) => d.totalNotesCreated >= 10,
  },
  {
    id: 'level-5',
    title: 'Rising Star',
    description: 'Reach Level 5',
    icon: '⭐',
    xpReward: 200,
    condition: (d: GamificationData) => d.level >= 5,
  },
  {
    id: 'level-10',
    title: 'Veteran',
    description: 'Reach Level 10',
    icon: '🌟',
    xpReward: 500,
    condition: (d: GamificationData) => d.level >= 10,
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Complete a task after midnight',
    icon: '🦉',
    xpReward: 50,
    condition: () => false, // Special: checked at task completion time
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Complete a task before 6 AM',
    icon: '🐦',
    xpReward: 50,
    condition: () => false, // Special: checked at task completion time
  },
];

// ----- Unlockable Titles -----
export interface TitleDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: (d: GamificationData) => boolean;
}

export const TITLES: TitleDef[] = [
  {
    id: 'newcomer',
    name: 'The Newcomer',
    emoji: '🌱',
    description: 'Begin your StudyQuest journey',
    condition: (d) => d.level >= 1,
  },
  {
    id: 'night-owl',
    name: 'The Night Owl',
    emoji: '🦉',
    description: 'Study past midnight 5 times',
    condition: (d) => (d.nightOwlCount || 0) >= 5,
  },
  {
    id: 'early-riser',
    name: 'The Early Riser',
    emoji: '🌅',
    description: 'Reach Level 3',
    condition: (d) => d.level >= 3,
  },
  {
    id: 'code-wizard',
    name: 'Code Wizard',
    emoji: '🧙‍♂️',
    description: 'Run 100 code snippets in the Arena',
    condition: (d) => (d.totalCodeRuns || 0) >= 100,
  },
  {
    id: 'unbroken',
    name: 'Unbroken',
    emoji: '⛓️',
    description: 'Achieve a 30-day streak',
    condition: (d) => d.longestStreak >= 30,
  },
  {
    id: 'scholar',
    name: 'The Scholar',
    emoji: '📚',
    description: 'Create 25 notes',
    condition: (d) => d.totalNotesCreated >= 25,
  },
  {
    id: 'task-slayer',
    name: 'Task Slayer',
    emoji: '⚔️',
    description: 'Complete 50 tasks',
    condition: (d) => d.totalTasksCompleted >= 50,
  },
  {
    id: 'focus-sage',
    name: 'Focus Sage',
    emoji: '🧘',
    description: 'Accumulate 1000 minutes of focus time',
    condition: (d) => d.totalFocusMinutes >= 1000,
  },
  {
    id: 'rising-star',
    name: 'Rising Star',
    emoji: '⭐',
    description: 'Reach Level 5',
    condition: (d) => d.level >= 5,
  },
  {
    id: 'veteran',
    name: 'The Veteran',
    emoji: '🎖️',
    description: 'Reach Level 10',
    condition: (d) => d.level >= 10,
  },
  {
    id: 'legend',
    name: 'The Legend',
    emoji: '👑',
    description: 'Reach Level 20',
    condition: (d) => d.level >= 20,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    emoji: '💯',
    description: 'Complete 100 tasks',
    condition: (d) => d.totalTasksCompleted >= 100,
  },
];

// ----- Navigation Items -----
export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'HiHome' },
  { label: 'Tasks', href: '/tasks', icon: 'HiClipboardCheck' },
  { label: 'Notes', href: '/notes', icon: 'HiPencilAlt' },
  { label: 'Habits', href: '/habits', icon: 'HiLightningBolt' },
  { label: 'Timer', href: '/timer', icon: 'HiClock' },
  { label: 'Timetable', href: '/timetable', icon: 'HiCalendar' },
  { label: 'AI Chat', href: '/chat', icon: 'HiChatAlt2' },
  { label: 'Analytics', href: '/analytics', icon: 'HiChartBar' },
  { label: 'Groups', href: '/groups', icon: 'HiUserGroup' },
  { label: 'Resources', href: '/resources', icon: 'HiCollection' },
  { label: 'SQL Lab', href: '/sql', icon: 'HiDatabase' },
  { label: 'Code', href: '/code', icon: 'HiCode' },
  { label: 'Code Arena IDE', href: '/ide', icon: 'HiTerminal' },
  { label: 'DSA', href: '/dsa', icon: 'HiCubeTransparent' },
  { label: 'Skill Tree', href: '/skills', icon: 'HiSparkles' },
  { label: 'Snippets', href: '/snippets', icon: 'HiBookmark' },
  { label: 'Settings', href: '/settings', icon: 'HiCog' },
];

// ----- Pomodoro Defaults -----
export const POMODORO_DEFAULTS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  sessionsBeforeLongBreak: 4,
};

// ----- DiceBear Avatar -----
export const DICEBEAR_STYLES = [
  'adventurer',
  'adventurer-neutral',
  'avataaars',
  'big-ears',
  'big-smile',
  'bottts',
  'fun-emoji',
  'lorelei',
  'miniavs',
  'open-peeps',
  'pixel-art',
  'thumbs',
] as const;

export function getAvatarUrl(seed: string, style: string = 'adventurer'): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// ----- Task Colors -----
export const PRIORITY_COLORS = {
  low: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700' },
  medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700' },
  urgent: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-700' },
} as const;

export const STATUS_COLUMNS = [
  { id: 'todo' as const, label: 'To Do', color: 'from-violet-500 to-purple-600' },
  { id: 'in-progress' as const, label: 'In Progress', color: 'from-amber-500 to-orange-600' },
  { id: 'done' as const, label: 'Done', color: 'from-emerald-500 to-green-600' },
];

// ----- Quest Coin Awards -----
export const COIN_AWARDS = {
  TASK_COMPLETE: 5,
  POMODORO_COMPLETE: 3,
  NOTE_CREATED: 2,
  STREAK_BONUS: 1,
  ACHIEVEMENT_UNLOCK: 10,
  LEVEL_UP: 15,
  QUIZ_CORRECT: 2,
  QUIZ_PERFECT: 10,
} as const;

// ----- Daily Treasure Chest Rewards -----
export interface TreasureReward {
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  coins: number;
  xp: number;
  emoji: string;
  title: string;
  description: string;
}

export const TREASURE_CHEST_REWARDS: { weight: number; reward: Omit<TreasureReward, 'coins' | 'xp'>; coinRange: [number, number]; xpRange: [number, number] }[] = [
  {
    weight: 60,
    reward: { rarity: 'common', emoji: '🪙', title: 'A Handful of Coins', description: 'A modest but welcome find!' },
    coinRange: [5, 15],
    xpRange: [0, 0],
  },
  {
    weight: 25,
    reward: { rarity: 'rare', emoji: '💎', title: 'Hidden Gems', description: 'You found something special!' },
    coinRange: [15, 30],
    xpRange: [15, 25],
  },
  {
    weight: 12,
    reward: { rarity: 'epic', emoji: '🔮', title: 'Arcane Treasures', description: 'An ancient power surges through you!' },
    coinRange: [30, 50],
    xpRange: [40, 60],
  },
  {
    weight: 3,
    reward: { rarity: 'legendary', emoji: '👑', title: 'LEGENDARY HAUL!', description: 'The rarest of finds! Fortune smiles upon you!' },
    coinRange: [75, 120],
    xpRange: [80, 120],
  },
];

// ----- Shop Item Catalog -----
export const SHOP_ITEMS: ShopItem[] = [
  // Pet Food (consumable)
  { id: 'food-apple', name: 'Apple', description: 'A crisp, juicy apple. +20 hunger.', category: 'petFood', price: 5, emoji: '🍎', rarity: 'common', consumable: true, effect: 'hunger-20' },
  { id: 'food-pizza', name: 'Pizza', description: 'Cheesy goodness! +40 hunger.', category: 'petFood', price: 10, emoji: '🍕', rarity: 'common', consumable: true, effect: 'hunger-40' },
  { id: 'food-cake', name: 'Cake', description: 'Delicious cake! +60 hunger, +10 happiness.', category: 'petFood', price: 20, emoji: '🎂', rarity: 'rare', consumable: true, effect: 'hunger-60-happy-10' },
  { id: 'food-star', name: 'Star Treat', description: 'Magical star! Full hunger + happiness.', category: 'petFood', price: 50, emoji: '✨', rarity: 'epic', consumable: true, effect: 'full-restore' },
  // Pet Accessories
  { id: 'acc-bow', name: 'Red Bow', description: 'A cute red bow for your pet.', category: 'petAccessory', price: 15, emoji: '🎀', rarity: 'common', effect: 'bow-red' },
  { id: 'acc-scarf', name: 'Blue Scarf', description: 'A cozy scarf for cold nights.', category: 'petAccessory', price: 20, emoji: '🧣', rarity: 'common', effect: 'scarf-blue' },
  { id: 'acc-hat', name: 'Top Hat', description: 'Fancy and distinguished!', category: 'petAccessory', price: 30, emoji: '🎩', rarity: 'rare', effect: 'hat-top' },
  { id: 'acc-glasses', name: 'Cool Glasses', description: 'Your pet looks scholarly.', category: 'petAccessory', price: 25, emoji: '🕶️', rarity: 'rare', effect: 'glasses-cool' },
  { id: 'acc-crown', name: 'Royal Crown', description: 'For true royalty.', category: 'petAccessory', price: 75, emoji: '👑', rarity: 'epic', effect: 'crown-gold' },
  { id: 'acc-aura', name: 'Rainbow Aura', description: 'A mystical, glowing aura.', category: 'petAccessory', price: 150, emoji: '🌈', rarity: 'legendary', effect: 'aura-rainbow' },
  // Profile Borders
  { id: 'border-crystal', name: 'Crystal Frame', description: 'Blue sparkle border.', category: 'border', price: 40, emoji: '💎', rarity: 'rare', effect: 'border-crystal' },
  { id: 'border-flame', name: 'Flame Frame', description: 'Animated fire border.', category: 'border', price: 60, emoji: '🔥', rarity: 'epic', effect: 'border-flame' },
  { id: 'border-celestial', name: 'Celestial Frame', description: 'Gold star particles.', category: 'border', price: 100, emoji: '⭐', rarity: 'legendary', effect: 'border-celestial' },
  // Sound Packs
  { id: 'sound-retro', name: 'Retro Pack', description: '8-bit sound effects.', category: 'sound', price: 20, emoji: '🎵', rarity: 'rare', effect: 'sound-retro' },
  { id: 'sound-nature', name: 'Nature Pack', description: 'Calming nature sounds.', category: 'sound', price: 20, emoji: '🎶', rarity: 'rare', effect: 'sound-nature' },
  // Cursors
  { id: 'cursor-wand', name: 'Magic Wand', description: 'A sparkly wand cursor.', category: 'cursor', price: 35, emoji: '🪄', rarity: 'rare', effect: 'cursor-wand' },
  { id: 'cursor-sword', name: 'Pixel Sword', description: 'An RPG sword cursor.', category: 'cursor', price: 35, emoji: '⚔️', rarity: 'rare', effect: 'cursor-sword' },
];

// ----- Pet Evolution Config -----
export const PET_STAGES = [
  { stage: 0, name: 'Egg', requirement: 'Just created!' },
  { stage: 1, name: 'Baby', requirement: 'Complete 5 tasks to hatch' },
  { stage: 2, name: 'Teen', requirement: 'Reach Level 5' },
  { stage: 3, name: 'Adult', requirement: 'Reach Level 10' },
  { stage: 4, name: 'Legendary', requirement: 'Reach Level 20' },
] as const;

export const PET_SPECIES_CONFIG = {
  owl:    { name: 'Owl',    emoji: ['🥚', '🐣', '🐥', '🦅', '🦉'], color: '#8B5CF6' },
  cat:    { name: 'Cat',    emoji: ['🥚', '🐱', '😺', '🐈', '🐈‍⬛'], color: '#EC4899' },
  dragon: { name: 'Dragon', emoji: ['🥚', '🐉', '🔥', '🐲', '🐲'], color: '#EF4444' },
  fox:    { name: 'Fox',    emoji: ['🥚', '🦊', '🦊', '🦊', '🦊'], color: '#F59E0B' },
  bunny:  { name: 'Bunny',  emoji: ['🥚', '🐰', '🐇', '🐇', '🐇'], color: '#10B981' },
} as const;

// ----- Skill Point Awards -----
export const SKILL_POINT_AWARDS = {
  LEVEL_UP: 1,         // 1 SP per level
} as const;

// ----- Skill Tree Nodes -----
import { SkillNodeDef } from '@/types';

export const SKILL_TREE_NODES: SkillNodeDef[] = [
  // ── Focus Mage Branch ──
  { id: 'focus-root', name: 'Focus Initiate', emoji: '🧠', description: 'Begin the path of the Focus Mage.', branch: 'focus', tier: 0, cost: 0, requires: [], effect: 'none' },
  { id: 'focus-1a', name: 'Deep Concentration', emoji: '🎯', description: '+10% XP from Pomodoro sessions.', branch: 'focus', tier: 1, cost: 1, requires: ['focus-root'], effect: 'pomodoro-xp-10' },
  { id: 'focus-1b', name: 'Study Endurance', emoji: '⏳', description: '+1 bonus coin per Pomodoro session.', branch: 'focus', tier: 1, cost: 1, requires: ['focus-root'], effect: 'pomodoro-coin-1' },
  { id: 'focus-2a', name: 'Meditation Master', emoji: '🧘', description: '+20% XP from Pomodoro sessions.', branch: 'focus', tier: 2, cost: 2, requires: ['focus-1a'], effect: 'pomodoro-xp-20' },
  { id: 'focus-2b', name: 'Time Warp', emoji: '⚡', description: '+2 bonus coins per Pomodoro session.', branch: 'focus', tier: 2, cost: 2, requires: ['focus-1b'], effect: 'pomodoro-coin-2' },
  { id: 'focus-3', name: 'Zen Sage', emoji: '✨', description: 'Focus sessions award double XP. Ultimate perk.', branch: 'focus', tier: 3, cost: 3, requires: ['focus-2a', 'focus-2b'], effect: 'pomodoro-xp-double' },

  // ── Task Slayer Branch ──
  { id: 'combat-root', name: 'Task Recruit', emoji: '⚔️', description: 'Begin the path of the Task Slayer.', branch: 'combat', tier: 0, cost: 0, requires: [], effect: 'none' },
  { id: 'combat-1a', name: 'Sharp Strike', emoji: '🗡️', description: '10% chance of critical hit (+5 bonus coins) on task completion.', branch: 'combat', tier: 1, cost: 1, requires: ['combat-root'], effect: 'task-crit-10' },
  { id: 'combat-1b', name: 'Quest Bonus', emoji: '📋', description: '+5 bonus XP per completed task.', branch: 'combat', tier: 1, cost: 1, requires: ['combat-root'], effect: 'task-xp-5' },
  { id: 'combat-2a', name: 'Ruthless Efficiency', emoji: '💥', description: '20% crit chance (+10 bonus coins) on task completion.', branch: 'combat', tier: 2, cost: 2, requires: ['combat-1a'], effect: 'task-crit-20' },
  { id: 'combat-2b', name: 'Urgent Slayer', emoji: '🔥', description: 'Urgent tasks award double XP.', branch: 'combat', tier: 2, cost: 2, requires: ['combat-1b'], effect: 'task-urgent-double' },
  { id: 'combat-3', name: 'Legendary Slayer', emoji: '👑', description: '30% crit chance + all tasks award +10 bonus XP. Ultimate perk.', branch: 'combat', tier: 3, cost: 3, requires: ['combat-2a', 'combat-2b'], effect: 'task-legendary' },

  // ── Beastmaster Branch ──
  { id: 'beast-root', name: 'Pet Pal', emoji: '🐾', description: 'Begin the path of the Beastmaster.', branch: 'beast', tier: 0, cost: 0, requires: [], effect: 'none' },
  { id: 'beast-1a', name: 'Gentle Touch', emoji: '💖', description: 'Pet loses hunger 25% slower.', branch: 'beast', tier: 1, cost: 1, requires: ['beast-root'], effect: 'pet-hunger-slow-25' },
  { id: 'beast-1b', name: 'Happy Vibes', emoji: '😊', description: 'Pet gains +5 extra happiness from playing.', branch: 'beast', tier: 1, cost: 1, requires: ['beast-root'], effect: 'pet-happy-5' },
  { id: 'beast-2a', name: 'Iron Stomach', emoji: '🛡️', description: 'Pet loses hunger 50% slower.', branch: 'beast', tier: 2, cost: 2, requires: ['beast-1a'], effect: 'pet-hunger-slow-50' },
  { id: 'beast-2b', name: 'Bond of Friendship', emoji: '🤝', description: 'Pet earns double XP from your activities.', branch: 'beast', tier: 2, cost: 2, requires: ['beast-1b'], effect: 'pet-xp-double' },
  { id: 'beast-3', name: 'Alpha Tamer', emoji: '🦁', description: 'Pet never loses hunger. +10 coins per pet level-up. Ultimate perk.', branch: 'beast', tier: 3, cost: 3, requires: ['beast-2a', 'beast-2b'], effect: 'pet-ultimate' },
];
