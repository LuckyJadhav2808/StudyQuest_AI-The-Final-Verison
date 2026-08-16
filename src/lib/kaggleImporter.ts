// ============================================================
// StudyQuest AI — Kaggle DSA Dataset Importer & Parser
// Converts downloaded Kaggle LeetCode JSON/CSV datasets into DsaProblem models
// ============================================================

import { DsaProblem, DsaTopic, DsaPattern, DsaDifficulty, CodeTemplates, ApproachSolution } from '@/types/dsa';

export interface KaggleRawProblem {
  id?: string | number;
  leetcode_id?: number;
  title?: string;
  question_title?: string;
  name?: string;
  difficulty?: string;
  level?: string;
  category?: string;
  topic?: string;
  pattern?: string;
  description?: string;
  problem_description?: string;
  statement?: string;
  explanation?: string;
  statement_explanation?: string;
  constraints?: string | string[];
  examples?: any[];
  solution_python?: string;
  solution_cpp?: string;
  solution_java?: string;
  solution_js?: string;
  solution?: string;
  code?: string;
  optimal_solution?: string;
  brute_force_solution?: string;
}

/**
 * Normalizes topic names into standard DsaTopic categories
 */
function normalizeTopic(categoryStr?: string): DsaTopic {
  if (!categoryStr) return 'Arrays & Hashing';
  const lower = categoryStr.toLowerCase();
  if (lower.includes('two pointer') || lower.includes('pointer')) return 'Two Pointers';
  if (lower.includes('window')) return 'Sliding Window';
  if (lower.includes('stack') || lower.includes('queue')) return 'Stack & Queue';
  if (lower.includes('binary search') || lower.includes('search')) return 'Binary Search';
  if (lower.includes('linked list') || lower.includes('list')) return 'Linked List';
  if (lower.includes('tree') || lower.includes('trie')) return 'Trees';
  if (lower.includes('heap') || lower.includes('priority')) return 'Heaps & Priority Queue';
  if (lower.includes('backtrack') || lower.includes('combination')) return 'Backtracking';
  if (lower.includes('graph')) return 'Graphs';
  if (lower.includes('dp') || lower.includes('dynamic')) return 'Dynamic Programming';
  if (lower.includes('bit')) return 'Bit Manipulation';
  return 'Arrays & Hashing';
}

/**
 * Normalizes pattern names into standard DsaPattern categories
 */
function normalizePattern(patternStr?: string, categoryStr?: string): DsaPattern {
  const combined = `${patternStr || ''} ${categoryStr || ''}`.toLowerCase();
  if (combined.includes('two pointer')) return 'Two Pointers';
  if (combined.includes('sliding window')) return 'Sliding Window';
  if (combined.includes('slow') || combined.includes('fast') || combined.includes('cycle')) return 'Fast & Slow Pointers';
  if (combined.includes('monotonic')) return 'Monotonic Stack';
  if (combined.includes('top-k') || combined.includes('top k') || combined.includes('heap')) return 'Top-K Elements';
  if (combined.includes('interval')) return 'Overlapping Intervals';
  if (combined.includes('reverse') || combined.includes('in-place')) return 'In-place Reversal';
  if (combined.includes('subset') || combined.includes('backtrack')) return 'Subsets & Combinations';
  if (combined.includes('topological')) return 'Topological Sort';
  if (combined.includes('matrix') || combined.includes('grid')) return 'Matrix Traversal';
  if (combined.includes('knapsack')) return '0/1 Knapsack (DP)';
  if (combined.includes('lcs') || combined.includes('subsequence')) return 'Longest Common Subsequence (DP)';
  if (combined.includes('dfs') || combined.includes('bfs')) return 'Tree DFS/BFS';
  return 'Two Pointers';
}

/**
 * Normalizes difficulty strings into 'easy' | 'medium' | 'hard'
 */
function normalizeDifficulty(diffStr?: string): DsaDifficulty {
  if (!diffStr) return 'easy';
  const lower = diffStr.toLowerCase();
  if (lower.includes('hard') || lower === '3') return 'hard';
  if (lower.includes('med') || lower === '2') return 'medium';
  return 'easy';
}

/**
 * Generates an automated problem statement explanation from description text
 */
function generateStatementExplanation(title: string, desc: string): string {
  if (!desc) return `Solve the algorithmic challenge '${title}' by implementing the optimal time and space complexity algorithm.`;
  const clean = desc.replace(/<[^>]*>/g, '').trim();
  const firstSentence = clean.split('.')[0];
  return `This problem requires you to ${firstSentence.toLowerCase()}. Pay close attention to corner cases and time complexity requirements.`;
}

/**
 * Parses a Kaggle / HuggingFace JSON or JSONL string into an array of DsaProblem items
 */
export function parseKaggleJsonDataset(jsonContent: string): DsaProblem[] {
  try {
    let list: KaggleRawProblem[] = [];

    const trimmed = jsonContent.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const rawData = JSON.parse(jsonContent);
        list = Array.isArray(rawData) ? rawData : rawData.problems || rawData.data || [rawData];
      } catch {
        // Fallback to line-by-line parsing for JSONL
        list = jsonContent
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .map((line) => JSON.parse(line));
      }
    } else {
      // JSONL format (one JSON object per line)
      list = jsonContent
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line));
    }

    return list.map((item, idx) => {
      const title = item.title || item.question_title || item.name || `Problem ${idx + 1}`;
      const id = item.id ? String(item.id) : `dataset-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const desc = item.description || item.problem_description || item.statement || 'No description provided in dataset.';
      
      const difficulty = normalizeDifficulty(item.difficulty || item.level);
      const category = normalizeTopic(item.category || item.topic);
      const pattern = normalizePattern(item.pattern, item.category);

      const templates: CodeTemplates = {
        javascript: item.solution_js || `function solution(input) {\n  // Write your code for ${title}\n}\nconsole.log(solution([1, 2, 3]));`,
        python: item.solution_python || `def solution(input):\n    # Write your code for ${title}\n    pass\n\nprint(solution([1, 2, 3]))`,
        java: item.solution_java || `class Solution {\n    public static void main(String[] args) {\n        System.out.println("Solution for ${title}");\n    }\n}`,
        cpp: item.solution_cpp || `#include <iostream>\n\nint main() {\n    std::cout << "Solution for ${title}" << std::endl;\n    return 0;\n}`,
      };

      const statementExplanation = item.statement_explanation || item.explanation || generateStatementExplanation(title, desc);

      const problemBreakdown: string[] = [
        `💡 Problem Overview: Understand the input constraints and return values for ${title}.`,
        `🎯 Optimization Target: Aim for optimal Time Complexity $O(N)$ and Space Complexity $O(1)$ where possible.`,
        `⚠️ Edge Cases: Watch for empty inputs, single element arrays, and duplicate elements.`,
      ];

      const approaches: ApproachSolution[] = [
        {
          title: 'Optimal Approach Solution',
          type: 'optimal',
          intuition: item.explanation || `Use ${pattern} strategy to achieve optimal performance.`,
          timeComplexity: difficulty === 'easy' ? 'O(N)' : difficulty === 'medium' ? 'O(N log N)' : 'O(N^2)',
          spaceComplexity: 'O(1) or O(N)',
          explanation: [
            `Initialize pointers or tracking data structure.`,
            `Traverse elements sequentially and apply ${pattern} conditions.`,
            `Return computed solution.`,
          ],
          code: templates,
        },
      ];

      return {
        id,
        leetcodeId: typeof item.leetcode_id === 'number' ? item.leetcode_id : undefined,
        title,
        difficulty,
        category,
        pattern,
        description: desc,
        statementExplanation,
        problemBreakdown,
        constraints: Array.isArray(item.constraints) ? item.constraints : item.constraints ? [item.constraints] : ['1 <= N <= 10^5'],
        examples: Array.isArray(item.examples) ? item.examples : [{ input: 'Sample Input', output: 'Sample Output' }],
        templates,
        testCases: [
          { id: 1, input: 'Sample Test 1', expectedOutput: 'Expected 1' },
          { id: 2, input: 'Sample Test 2', expectedOutput: 'Expected 2' },
        ],
        approaches,
      };
    });
  } catch (err) {
    console.error('Failed to parse Kaggle JSON dataset:', err);
    throw new Error('Invalid JSON format. Please ensure your Kaggle file is valid JSON.');
  }
}
