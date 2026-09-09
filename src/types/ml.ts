/**
 * StudyQuest AI — Machine Learning & Data Analytics Academy Types
 * Defines data structures for the 7-tier beginner-to-pro curriculum,
 * concept notes, mathematical derivations, code recipes, and user progress.
 */

export type MlTierId = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5' | 'tier6' | 'tier7';

export type MlCategory =
  | 'Foundations & Stack'
  | 'Statistics & Math'
  | 'Supervised Learning'
  | 'Evaluation & Tuning'
  | 'Unsupervised Learning'
  | 'NLP & Time Series'
  | 'Deep Learning & MLOps';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';

export interface MlInterviewQnA {
  question: string;
  answer: string;
  trapOrTip?: string;
}

export interface MlConceptNode {
  id: string;
  tierId: MlTierId;
  title: string;
  category: MlCategory;
  difficulty: DifficultyLevel;
  summary: string;
  estimatedMinutes: number;
  tags: string[];

  // Detailed study material
  intuition: string; // "Explain like I'm 5" + core conceptual analogy
  technicalExplanation: string; // Senior engineer level depth
  mathFormulas: {
    title: string;
    latex: string;
    explanation: string;
  }[];
  pythonSnippet: {
    title: string;
    code: string;
    explanation: string;
    isRunnableInDataForge: boolean;
  };
  keyTakeaways: string[];
  prosAndCons?: {
    pros: string[];
    cons: string[];
  };
  interviewPrep: MlInterviewQnA[];
}

export interface MlTier {
  id: MlTierId;
  tierNumber: number;
  title: string;
  subtitle: string;
  badge: string;
  icon?: string;
  difficulty: DifficultyLevel;
  description: string;
  accentColor: string;
  concepts: MlConceptNode[];
}

export interface MlFormulaItem {
  id: string;
  category: string;
  title: string;
  intuition: string;
  latex: string;
  variables?: { name: string; meaning: string }[];
  pythonSnippet?: string;
}

export interface MlLesson {
  id: string;
  tierId: MlTierId;
  title: string;
  category: MlCategory;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  tags?: string[];
  shortSummary: string;
  description?: string;
  theoryMarkdown: string;
  pythonCode: string;
  deepDiveMarkdown: string;
  commonPitfalls: string[];
  interviewQuestions: { question: string; answer: string; trapOrTip?: string }[];
  keyFormulas?: { name: string; formula: string }[];
  rawConcept?: MlConceptNode;
}

export interface MlUserProgress {
  masteredConceptIds: string[];
  starredConceptIds: string[];
  tierQuizScores: Record<string, number>; // tierId -> highest score percentage (0-100)
  totalXpEarned: number;
  lastStudiedAt: number;
}

export interface MlQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  tierId?: MlTierId;
  category?: string;
}

