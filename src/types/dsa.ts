// ============================================================
// StudyQuest AI — Data Structures & Algorithms Types
// ============================================================

export type DsaDifficulty = 'easy' | 'medium' | 'hard';
export type ProblemStatus = 'unsolved' | 'in-progress' | 'solved' | 'revision';

export type DsaTopic =
  | 'Arrays & Hashing'
  | 'Two Pointers'
  | 'Sliding Window'
  | 'Stack & Queue'
  | 'Binary Search'
  | 'Linked List'
  | 'Trees'
  | 'Heaps & Priority Queue'
  | 'Backtracking'
  | 'Graphs'
  | 'Dynamic Programming'
  | 'Bit Manipulation';

export type DsaPattern =
  | 'Two Pointers'
  | 'Sliding Window'
  | 'Fast & Slow Pointers'
  | 'Monotonic Stack'
  | 'Top-K Elements'
  | 'Overlapping Intervals'
  | 'In-place Reversal'
  | 'Subsets & Combinations'
  | 'Topological Sort'
  | 'Matrix Traversal'
  | '0/1 Knapsack (DP)'
  | 'Longest Common Subsequence (DP)'
  | 'Tree DFS/BFS';

export interface CodeTemplates {
  javascript: string;
  python: string;
  java: string;
  cpp: string;
}

export interface ProblemTestCase {
  id: number;
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface ApproachSolution {
  title: string; // e.g. "Brute Force", "Better Approach", "Optimal Solution"
  type: 'brute-force' | 'better' | 'optimal';
  intuition: string;
  timeComplexity: string; // e.g. "O(N)"
  spaceComplexity: string; // e.g. "O(1)"
  explanation: string[];
  code: CodeTemplates;
}

export interface DsaProblem {
  id: string;
  leetcodeId?: number;
  title: string;
  difficulty: DsaDifficulty;
  category: DsaTopic;
  pattern: DsaPattern;
  leetcodeUrl?: string;
  description: string;
  statementExplanation?: string;
  problemBreakdown?: string[];
  constraints: string[];
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  templates: CodeTemplates;
  testCases: ProblemTestCase[];
  approaches: ApproachSolution[];
  tips?: string[];
}

export interface UserProblemProgress {
  status: ProblemStatus;
  userCode?: Record<string, string>; // lang -> code
  notes?: string;
  starred?: boolean;
  lastSolvedAt?: number;
  attemptsCount?: number;
}

export type UserDsaMap = Record<string, UserProblemProgress>;

export interface TopicProgressStats {
  topic: DsaTopic;
  total: number;
  solved: number;
}

export interface PatternProgressStats {
  pattern: DsaPattern;
  total: number;
  solved: number;
}
