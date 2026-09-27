// ============================================================
// StudyQuest AI — TypeScript Type Definitions
// ============================================================

// ----- User & Profile -----
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  avatarSeed: string;
  avatarStyle: string;
  friendCode: string;       // 6-char shareable code
  lastSeen: number;         // timestamp for online status
  openRouterKey?: string;
  aiMode?: 'system' | 'custom';
  equippedTitle?: string;   // equipped title ID from TITLES
  theme: 'light' | 'dark';
  createdAt: number;
  updatedAt: number;
}

// ----- Friends -----
export interface Friend {
  uid: string;
  displayName: string;
  avatarSeed: string;
  avatarStyle: string;
  friendCode: string;
  addedAt: number;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromName: string;
  fromAvatar: string;
  fromAvatarStyle: string;
  toUid: string;
  status: FriendRequestStatus;
  createdAt: number;
}

// ----- Gamification -----
export interface GamificationData {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string; // ISO date string YYYY-MM-DD
  achievements: string[]; // achievement IDs
  unlockedTitles: string[]; // title IDs
  totalTasksCompleted: number;
  totalFocusMinutes: number;
  totalNotesCreated: number;
  totalCodeRuns: number;     // for Code Wizard title
  nightOwlCount: number;     // for Night Owl title
  dailyChallengeStreak: number;       // consecutive days of daily challenge
  lastDailyChallengeDate: string;     // ISO date YYYY-MM-DD
  triviaDungeonFloor?: number;        // user's highest reached floor in Trivia Dungeon
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  condition: (data: GamificationData) => boolean;
}

export interface XPEvent {
  amount: number;
  reason: string;
  timestamp: number;
}

// ----- Tasks -----
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null; // ISO date string
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// ----- Events -----
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  color: string;
  createdAt: number;
}

// ----- Habits -----
export interface Habit {
  id: string;
  title: string;
  icon: string; // emoji
  color: string;
  completedDates: string[]; // ISO date strings
  bestStreak: number;
  createdAt: number;
}

// ----- Notes -----
export interface Note {
  id: string;
  title: string;
  content: string; // markdown/HTML
  markdownSource?: string; // raw markdown source (preserved for re-editing)
  folder: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// ----- Focus Sessions -----
export interface FocusSession {
  id: string;
  duration: number; // minutes
  type: 'focus' | 'short-break' | 'long-break';
  completedAt: number;
}

// ----- Timetable -----
export interface TimetableBlock {
  id: string;
  subject: string;
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  location: string;
  color: string;
}

// ----- Study Groups -----
export type GroupRole = 'owner' | 'admin' | 'member';

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  ownerId: string;
  members: GroupMember[];
  createdAt: number;
}

export interface GroupMember {
  uid: string;
  displayName: string;
  avatarSeed: string;
  role: GroupRole;
  joinedAt: number;
}

export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: number;
}

// ----- Code Snippets -----
export interface CodeSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  tags: string[];
  createdAt: number;
}

// ----- Saved Queries (SQL Playground) -----
export interface SavedQuery {
  id: string;
  title: string;
  sql: string;
  createdAt: number;
}

// ----- Resources Vault -----
export type ResourceType = 'link' | 'pdf' | 'youtube' | 'drive' | 'github' | 'text';

export interface ResourceFolder {
  id: string;
  name: string;
  color: string;       // hex color from candy palette
  icon: string;        // emoji
  createdAt: number;
  updatedAt: number;
}

export interface Resource {
  id: string;
  folderId: string;
  type: ResourceType;
  title: string;
  content: string;     // URL for links, base64/URL for PDFs, text content for text
  description: string;
  tags: string[];
  isPinned?: boolean;
  thumbnailUrl?: string;
  embedUrl?: string;
  createdAt: number;
  updatedAt: number;
}

// ----- Code Arena IDE -----
export interface CodeProject {
  id: string;
  name: string;
  language: string;      // primary language or 'web' for HTML/CSS/JS projects
  createdAt: number;
  updatedAt: number;
}

export interface CodeFile {
  id: string;
  projectId: string;
  name: string;          // e.g., "index.html", "style.css", "main.py"
  content: string;       // file content
  createdAt: number;
  updatedAt: number;
}

// ----- Exams (Countdown Timer) -----
export interface Exam {
  id: string;
  title: string;
  subject: string;
  emoji: string;
  date: number;       // timestamp of exam date/time
  color: string;      // hex color
  createdAt: number;
}

// ----- Sticky Notes (Quick Capture) -----
export interface StickyNote {
  id: string;
  content: string;
  color: string;      // hex background color
  x: number;          // position X
  y: number;          // position Y
  createdAt: number;
}

// ----- Navigation -----
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

// ----- Item Shop & Quest Coins -----
export type ShopCategory = 'petFood' | 'petAccessory' | 'border' | 'sound' | 'cursor';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: ShopCategory;
  price: number;
  emoji: string;
  rarity: ItemRarity;
  consumable?: boolean;     // true for pet food
  effect?: string;          // identifier for applying the item
}

export interface UserInventory {
  coins: number;
  ownedItems: string[];
  equippedItems: Record<string, string>;  // category → equipped item ID
  gachaHistory: string[];
  lastTreasureChestClaim?: string;        // ISO date YYYY-MM-DD — daily reward tracker
  ingredients?: Record<string, number>;   // ingredient ID → quantity
  activeEffects?: ActiveEffect[];         // currently active potions/buffs
}

// ----- Alchemy Lab (Crafting System) -----
export interface AlchemyIngredient {
  id: string;
  name: string;
  emoji: string;
  rarity: ItemRarity;
  description: string;
  dropChance: number;       // 0-100 percentage
}

export interface AlchemyRecipe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  ingredients: Record<string, number>;  // ingredient ID → required count
  effect: string;                        // machine-readable effect key
  effectDescription: string;             // human-readable effect
  duration?: number;                     // duration in minutes (0 = instant)
  rarity: ItemRarity;
}

export interface ActiveEffect {
  recipeId: string;
  effectKey: string;
  expiresAt: number;        // timestamp when the effect ends
}

// ----- Bug Reports -----
export interface BugReport {
  id: string;
  uid: string;
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  adminNote?: string;
  createdAt: number;
  updatedAt: number;
}

// ----- Patch Notes -----
export interface PatchNote {
  version: string;
  title: string;
  date: string;                // ISO date
  entries: PatchEntry[];
}

export interface PatchEntry {
  type: 'fix' | 'feature' | 'improvement';
  text: string;
}

// ----- Virtual Pet -----
export type PetSpecies = 'owl' | 'cat' | 'dragon' | 'fox' | 'bunny';
export type PetStage = 0 | 1 | 2 | 3 | 4; // egg → baby → teen → adult → legendary

// Evolution can be triggered by multiple activity paths
export type EvolutionPathKey = 'tasks' | 'focus' | 'streak' | 'care' | 'style';

export interface EvolutionRequirement {
  key: EvolutionPathKey;
  label: string;
  emoji: string;
  description: string;
  current: number;       // current progress
  target: number;        // required to satisfy this path
}

export interface PetData {
  id: string;
  name: string;
  species: PetSpecies;
  stage: PetStage;
  xp: number;
  happiness: number;   // 0-100
  energy: number;      // 0-100
  hunger: number;      // 0-100
  equippedAccessories: string[];
  lastFedAt: number;
  lastPlayedAt: number;
  hatchedAt: number | null;
  createdAt: number;
  // Evolution tracking — multiple paths
  totalFeedings: number;
  totalPlaySessions: number;
  level?: number;
  exp?: number;
}

// ----- Auto-Quiz -----
export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// ----- Calendar Focus Blocks -----
export interface FocusBlock {
  id: string;
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  startTime: string;
  endTime: string;
  label: string;
  color: string;
}

// ----- Skill Tree -----
export type SkillBranch = 'focus' | 'combat' | 'beast';

export interface SkillNodeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  branch: SkillBranch;
  tier: 0 | 1 | 2 | 3; // 0=root, 1=basic, 2=advanced, 3=ultimate
  cost: number;        // skill points required
  requires: string[];  // prerequisite skill IDs
  effect: string;      // machine-readable effect key
}

export interface SkillTreeData {
  skillPoints: number;
  unlockedSkills: string[]; // skill IDs
}

// ----- Study & Syllabus Progress Tracker -----
export type TopicStatus = 'pending' | 'in-progress' | 'done' | 'revised' | 'todo' | 'mastered';

export interface TrackerTopic {
  id: string;
  title: string;
  status: TopicStatus;
  confidence: number;         // 1 to 5 stars
  revisionCount: number;
  notes?: string;
  estimatedHours?: number;
  completedAt?: number;
  pyqDone?: boolean;
  dateCompleted?: string;     // ISO YYYY-MM-DD
  dateRevised?: string;       // ISO YYYY-MM-DD
}

export interface TrackerUnit {
  id: string;
  unitNumber: number;
  title: string;
  description?: string;
  topics: TrackerTopic[];
}

export interface TrackerSubject {
  id: string;
  name: string;
  code?: string;
  color: string;              // theme color / hex accent
  icon: string;               // emoji
  weightage?: number;         // marks or percentage weightage
  targetExamDate?: string;    // ISO date YYYY-MM-DD
  units: TrackerUnit[];
}

export interface SyllabusTrack {
  id: string;
  title: string;              // e.g. "GATE CSE 2026", "Semester 6 Exams", "Self-Taught ML"
  description?: string;
  isDefault?: boolean;
  subjects: TrackerSubject[];
  createdAt: number;
  updatedAt: number;
}

// Fixed study session slot definition (e.g. 8-10 AM)
export interface StudyTimeSlotDef {
  id: string;
  label: string;
  defaultHours: number;
}

// User-customizable daily habit entity with full CRUD control
export interface DailyStudyHabit {
  id: string;
  name: string;
  icon: string;
  active: boolean;
}

// Daily study log entry (spans prep window)
export interface DailyLogSlot {
  activity: string;
  hours: number;
  completed: boolean;
}

export interface DailyLogEntry {
  id: string;
  trackId: string;
  date: string;               // YYYY-MM-DD
  dayNumber: number;          // Day count from prep start (Day 1, 2, 3...)
  month: string;              // e.g. "Jul", "Aug", "Sep"
  isoWeek: number;            // ISO week number
  weekday: string;            // "Mon", "Tue", etc.
  slots: Record<string, DailyLogSlot>;
  bonusHours: number;
  totalHours: number;         // Auto-rolled up sum
  primarySubjectId?: string;  // FK to TrackerSubject
  subjectIds: string[];       // FKs to TrackerSubject
  topicIds: string[];         // FKs to TrackerTopic (Relational Link)
  dpp: {
    completed: boolean;
    score?: number;
    totalMarks?: number;
  };
  habitStatus: Record<string, boolean>; // habitId -> boolean
  focusRating: number;        // 1 to 5 scale
  notes?: string;
  updatedAt: number;
}

// Append-only test log entry
export type TestType = 'DPP' | 'Topic' | 'Subject' | 'Mixed' | 'Quiz' | 'Mock';

export interface TestLogEntry {
  id: string;
  trackId: string;
  date: string;               // YYYY-MM-DD
  testType: TestType;
  testName: string;
  subjectId?: string;         // FK to TrackerSubject
  topicId?: string;           // FK to TrackerTopic
  score: number;
  totalMarks: number;
  percentage: number;         // (score / totalMarks) * 100
  weakTopicIds: string[];     // FKs to TrackerTopic
  notes?: string;
  createdAt: number;
}

// Configurable settings and reference lists
export interface StudyTrackerSettings {
  prepStartDate: string;      // YYYY-MM-DD
  prepEndDate: string;        // YYYY-MM-DD
  idealWeeklyHours: number;   // default 52.5
  totalSyllabusHours: number; // default 1158.78
  habits: DailyStudyHabit[];
  slots: StudyTimeSlotDef[];
}

export interface TrackerKPIs {
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  todoTopics: number;
  overallCompletionPct: number;
  weightedReadinessScore: number; // 0-100 based on status & confidence
  averageConfidence: number;      // 1-5 scale
  totalSubjects: number;
  weakTopicsCount: number;        // low confidence (<= 2) or stuck in-progress
  estimatedHoursLeft: number;
  completedThisWeekCount: number;
  
  // Enhanced Command Center KPIs
  keyStats: {
    daysElapsed: number;
    daysRemaining: number;
    totalStudyHours: number;
    avgHoursPerDay: number;
    bestDayHours: number;
    daysWith5PlusHours: number;
    topicsDoneOrRevised: number;
  };
  slotStats: {
    slot1Pct: number;
    slot2Pct: number;
    slot3Pct: number;
    slot4Pct: number;
    dppDonePct: number;
    avgFocusScore: number;
  };
  habitStats: Record<string, {
    name: string;
    icon: string;
    completionPct: number;
    daysCompleted: number;
  }>;
  weeklyHours: Array<{
    weekNumber: number;
    startDate: string;
    endDate: string;
    actualHours: number;
    idealHours: number;
    gapPct: number;
    dailyAvg: number;
  }>;
  monthlyHours: Array<{
    month: string;
    totalHours: number;
    daysCount: number;
    dailyAvg: number;
  }>;
  subjectHoursBreakdown: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode?: string;
    color: string;
    icon: string;
    actualHours: number;
    idealHours: number;
  }>;
  testStats: {
    overallAvgPct: number;
    totalTests: number;
    avgByType: Record<string, number>;
  };
  burnDown: {
    totalSyllabusHours: number;
    completedHours: number;
    remainingHours: number;
    remainingPct: number;
    rolling7DayDailyAvg: number;
    projectedCompletionDate: string;
  };
  priorityRevisionQueue: Array<{
    topicId: string;
    topicTitle: string;
    subjectName: string;
    subjectColor: string;
    subjectIcon: string;
    reason: string;
    confidence: number;
  }>;
}

// ----- AI Quota & System Telemetry -----
export interface UserDailyAiUsage {
  count: number;
  lastUsedAt: number;
  date: string;
}

export interface SystemAiUsageDoc {
  date: string;                     // YYYY-MM-DD
  totalRequests: number;
  systemTierRequests: number;
  customTierRequests: number;
  uniqueUsersCount?: number;
  features: {
    chat: number;
    dsa: number;
    notes: number;
    quiz: number;
    code: number;
    ocr: number;
    other: number;
  };
  providers: {
    gemini: number;
    openrouter: number;
    groq: number;
  };
  updatedAt: number;
}

export * from './notebook';
export * from './ml';
