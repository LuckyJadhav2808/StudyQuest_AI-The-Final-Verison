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
  totalTasksCompleted: number;
  totalFocusMinutes: number;
  totalNotesCreated: number;
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
export type ResourceType = 'link' | 'pdf' | 'text';

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

// ----- Navigation -----
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}
