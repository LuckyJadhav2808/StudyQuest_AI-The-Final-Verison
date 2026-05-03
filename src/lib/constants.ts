// ============================================================
// StudyQuest AI — Constants & Configuration
// ============================================================

import { Achievement, GamificationData } from '@/types';

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
