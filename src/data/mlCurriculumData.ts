import { MlTier, MlConceptNode, MlLesson, MlFormulaItem } from '@/types/ml';
import { tier1Data } from './mlCurriculum/tier1';
import { tier2Data } from './mlCurriculum/tier2';
import { tier3Data } from './mlCurriculum/tier3';
import { tier4Data } from './mlCurriculum/tier4';
import { tier5Data } from './mlCurriculum/tier5';
import { tier6Data } from './mlCurriculum/tier6';
import { tier7Data } from './mlCurriculum/tier7';
import { ML_FORMULA_SHEET as FORMULAS } from './mlCurriculum/formulas';

/**
 * The Master 7-Tier Machine Learning & Data Analytics Curriculum
 * Inspired by Prof. Andrew Ng's Stanford Specialization and Jean de Dieu Nyandwi's Complete ML Package.
 */
export const ML_TIERS: MlTier[] = [
  tier1Data,
  tier2Data,
  tier3Data,
  tier4Data,
  tier5Data,
  tier6Data,
  tier7Data,
];

/**
 * Flat list of all concept nodes across all tiers.
 */
export const ALL_ML_CONCEPTS: MlConceptNode[] = ML_TIERS.flatMap((tier) => tier.concepts);

/**
 * Standardized transformation from MlConceptNode to MlLesson
 * Conforms to the 6-Part Pedagogical Note Architecture:
 * 1. Formal Definition & Nomenclature
 * 2. Intuition & Mental Model
 * 3. Mathematical Formulation & Derivations (KaTeX)
 * 4. Production Python / Scikit-Learn Pipeline
 * 5. Hyperparameters & Architectural Trade-offs
 * 6. Common Pitfalls, Edge Cases & Interview Traps
 */
export function conceptToLesson(concept: MlConceptNode): MlLesson {
  const mathMarkdown =
    concept.mathFormulas && concept.mathFormulas.length > 0
      ? concept.mathFormulas
          .map((f) => `### ${f.title}\n\n$$${f.latex}$$\n\n${f.explanation}`)
          .join('\n\n')
      : '';

  const prosConsMarkdown = concept.prosAndCons
    ? `### Architectural Trade-offs & Comparisons\n\n**Key Advantages:**\n${concept.prosAndCons.pros
        .map((p) => `- ${p}`)
        .join('\n')}\n\n**Engineering Limitations:**\n${concept.prosAndCons.cons
        .map((c) => `- ${c}`)
        .join('\n')}`
    : '';

  const keyTakeawaysMarkdown =
    concept.keyTakeaways && concept.keyTakeaways.length > 0
      ? `### Key Architectural Takeaways\n\n${concept.keyTakeaways
          .map((t) => `- ${t}`)
          .join('\n')}`
      : '';

  return {
    id: concept.id,
    tierId: concept.tierId,
    title: concept.title,
    category: concept.category,
    difficulty: concept.difficulty,
    estimatedMinutes: concept.estimatedMinutes,
    tags: concept.tags,
    shortSummary: concept.summary,
    description: concept.summary,
    theoryMarkdown: `## Intuition & Mental Model\n\n${concept.intuition}\n\n## Formal Definition & Technical Foundations\n\n${concept.technicalExplanation}\n\n${keyTakeawaysMarkdown}`,
    pythonCode: concept.pythonSnippet.code,
    deepDiveMarkdown: `## Mathematical Formulations & Derivations\n\n${
      mathMarkdown || 'Empirical optimization algorithm formulated via loss minimization.'
    }\n\n${prosConsMarkdown}`,
    commonPitfalls:
      concept.prosAndCons?.cons && concept.prosAndCons.cons.length > 0
        ? concept.prosAndCons.cons
        : [
            'Avoid data leakage by applying all transforms inside pipelines after train/test splits.',
            'Always inspect feature distributions and scaling before feeding into distance-sensitive models.',
            'Do not rely solely on accuracy metrics when evaluating imbalanced datasets.',
          ],
    interviewQuestions: concept.interviewPrep.map((q) => ({
      question: q.question,
      answer: q.answer,
      trapOrTip: q.trapOrTip,
    })),
    keyFormulas: concept.mathFormulas.map((f) => ({
      name: f.title,
      formula: f.latex,
    })),
    rawConcept: concept,
  };
}

/**
 * All generated lessons accessible across the application.
 */
export const ALL_ML_LESSONS: MlLesson[] = ALL_ML_CONCEPTS.map(conceptToLesson);

/**
 * Fetch a specific lesson by its unique ID.
 */
export function getLessonById(id: string): MlLesson | undefined {
  return ALL_ML_LESSONS.find((l) => l.id === id);
}

/**
 * Re-export Curated Machine Learning Formula Reference Sheet.
 */
export const ML_FORMULA_SHEET: MlFormulaItem[] = FORMULAS;
