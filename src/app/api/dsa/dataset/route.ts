import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DsaProblem, DsaTopic, DsaPattern, DsaDifficulty } from '@/types/dsa';
import { DSA_PROBLEMS } from '@/data/dsaDataset';

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function normalizeTopic(tagStr?: string, title?: string): DsaTopic {
  const s = `${tagStr || ''} ${title || ''}`.toLowerCase();
  if (s.includes('backtrack') || s.includes('n-queen') || s.includes('sudoku')) return 'Backtracking';
  if (s.includes('dynamic') || s.includes('dp') || s.includes('memoization')) return 'Dynamic Programming';
  if (s.includes('binary search') || s.includes('search in') || s.includes('search a 2d')) return 'Binary Search';
  if (s.includes('tree') || s.includes('trie') || s.includes('bst') || s.includes('binary tree')) return 'Trees';
  if (s.includes('graph') || s.includes('depth-first search') || s.includes('breadth-first search') || s.includes('union find') || s.includes('shortest path') || s.includes('topological')) return 'Graphs';
  if (s.includes('heap') || s.includes('priority queue')) return 'Heaps & Priority Queue';
  if (s.includes('linked list') || s.includes('doubly-linked')) return 'Linked List';
  if (s.includes('sliding window')) return 'Sliding Window';
  if (s.includes('two pointers') || s.includes('two pointer') || s.includes('3sum') || s.includes('4sum')) return 'Two Pointers';
  if (s.includes('stack') || s.includes('monotonic stack') || s.includes('queue') || s.includes('monotonic queue')) return 'Stack & Queue';
  if (s.includes('bit manipulation') || s.includes('bitwise')) return 'Bit Manipulation';
  if (s.includes('math') || s.includes('geometry') || s.includes('number theory')) return 'Binary Search';
  return 'Arrays & Hashing';
}

function normalizePattern(tagStr?: string, title?: string): DsaPattern {
  const s = `${tagStr || ''} ${title || ''}`.toLowerCase();
  if (s.includes('backtrack') || s.includes('combination') || s.includes('permutation') || s.includes('subset') || s.includes('n-queen')) return 'Subsets & Combinations';
  if (s.includes('sliding window') || s.includes('substring')) return 'Sliding Window';
  if (s.includes('slow') || s.includes('fast') || s.includes('cycle') || s.includes('two pointer') || s.includes('two pointers') || s.includes('3sum')) return 'Two Pointers';
  if (s.includes('monotonic') || s.includes('daily temperature') || s.includes('next greater') || s.includes('stack')) return 'Monotonic Stack';
  if (s.includes('heap') || s.includes('priority queue') || s.includes('top-k') || s.includes('kth largest') || s.includes('kth smallest')) return 'Top-K Elements';
  if (s.includes('interval') || s.includes('merge intervals') || s.includes('meeting room')) return 'Overlapping Intervals';
  if (s.includes('reverse') || s.includes('in-place') || s.includes('linked list')) return 'In-place Reversal';
  if (s.includes('topological') || s.includes('course schedule')) return 'Topological Sort';
  if (s.includes('matrix') || s.includes('grid') || s.includes('island') || s.includes('spiral')) return 'Matrix Traversal';
  if (s.includes('dynamic') || s.includes('dp') || s.includes('knapsack') || s.includes('memoization') || s.includes('robber') || s.includes('climbing stairs') || s.includes('coin change')) return '0/1 Knapsack (DP)';
  if (s.includes('subsequence') || s.includes('longest common') || s.includes('edit distance')) return 'Longest Common Subsequence (DP)';
  if (s.includes('tree') || s.includes('trie') || s.includes('depth-first search') || s.includes('breadth-first search') || s.includes('graph')) return 'Tree DFS/BFS';
  if (s.includes('binary search') || s.includes('divide and conquer') || s.includes('math') || s.includes('pow')) return 'Fast & Slow Pointers';
  return 'Two Pointers';
}

function normalizeDifficulty(diffStr?: string): DsaDifficulty {
  if (!diffStr) return 'easy';
  const lower = diffStr.toLowerCase();
  if (lower.includes('hard') || lower === '3') return 'hard';
  if (lower.includes('med') || lower === '2') return 'medium';
  return 'easy';
}

// In-memory cache for parsed problems
let cachedProblems: DsaProblem[] | null = null;

export async function GET() {
  try {
    if (cachedProblems && cachedProblems.length > 0) {
      return NextResponse.json({ success: true, problems: cachedProblems, count: cachedProblems.length });
    }

    const csvPath = path.join(process.cwd(), 'src', 'data', 'datasets', 'Leetcode_Questions_updated (2024-11-02).csv');
    const jsonlPath = path.join(process.cwd(), 'src', 'data', 'datasets', 'leetcode-solutions.jsonl');

    // 1. Build Tag Lookup Map from verified CSV
    const idToMeta = new Map<number, { tags: string; difficulty?: string; title?: string }>();
    if (fs.existsSync(csvPath)) {
      const csvLines = fs.readFileSync(csvPath, 'utf-8').split('\n');
      for (let i = 1; i < csvLines.length; i++) {
        const line = csvLines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);
        const qNum = parseInt(cols[0], 10);
        if (qNum) {
          idToMeta.set(qNum, {
            title: cols[1],
            tags: cols[2] || '',
            difficulty: cols[5],
          });
        }
      }
    }

    const problemsMap: Map<string, DsaProblem> = new Map();

    // 2. Parse leetcode-solutions.jsonl with enriched metadata
    if (fs.existsSync(jsonlPath)) {
      const fileContent = fs.readFileSync(jsonlPath, 'utf-8');
      const lines = fileContent.split('\n').filter((line) => line.trim().length > 0);

      for (let idx = 0; idx < lines.length; idx++) {
        try {
          const item = JSON.parse(lines[idx]);
          const numId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
          const csvMeta = numId ? idToMeta.get(numId) : undefined;

          const rawTitle = item.title || csvMeta?.title || `Problem ${numId || idx + 1}`;
          const title = rawTitle.replace(/^\d+\.\s*/, '').trim();
          const id = item.slug || `problem-${numId || idx + 1}`;
          const difficulty = normalizeDifficulty(item.difficulty || csvMeta?.difficulty);

          const tagStr = `${csvMeta?.tags || ''} ${Array.isArray(item.tags) ? item.tags.join(' ') : (item.tags || item.category || '')}`;
          const category = normalizeTopic(tagStr, title);
          const pattern = normalizePattern(tagStr, title);

          const desc = item.content || item.description || 'No description available.';
          const cleanDesc = desc.replace(/<[^>]*>/g, '').trim();
          const firstSentence = cleanDesc.split('.')[0] || '';
          const statementExplanation = `This challenge asks you to ${firstSentence.toLowerCase()}. Review the constraints and apply the optimal ${pattern} strategy.`;

          const problemBreakdown = [
            `💡 Goal: Implement an optimal solution for ${title}.`,
            `🎯 Category & Pattern: ${category} using ${pattern}.`,
            `⚠️ Complexity Requirement: Aim for optimal Time and Space Complexity.`,
          ];

          const cppCode = item.answer?.['c++']?.replace(/```cpp|```/g, '').trim() || '';
          const pyCode = item.answer?.python?.replace(/```python|```/g, '').trim() || '';
          const javaCode = item.answer?.java?.replace(/```java|```/g, '').trim() || '';
          const jsCode = item.answer?.javascript?.replace(/```javascript|```/g, '').trim() || '';

          const templates = {
            cpp: cppCode || `#include <iostream>\n\nint main() {\n    // Solution for ${title}\n    return 0;\n}`,
            python: pyCode || `def solution():\n    # Solution for ${title}\n    pass`,
            java: javaCode || `class Solution {\n    public static void main(String[] args) {\n        // Solution for ${title}\n    }\n}`,
            javascript: jsCode || `function solution() {\n  // Solution for ${title}\n}`,
          };

          const rawExplanation = item.answer?.explanation || '';
          // Extract time and space complexity if mentioned in explanation text
          const timeMatch = rawExplanation.match(/time complexity of\s*([A-Za-z0-9^()]+)/i);
          const spaceMatch = rawExplanation.match(/space complexity of\s*([A-Za-z0-9^()]+)/i);
          const parsedTime = timeMatch ? timeMatch[1].replace(/n/g, 'N') : difficulty === 'easy' ? 'O(N)' : difficulty === 'medium' ? 'O(N log N)' : 'O(N^2)';
          const parsedSpace = spaceMatch ? spaceMatch[1].replace(/n/g, 'N') : difficulty === 'easy' ? 'O(1)' : 'O(N)';

          // Parse explanation into clean bullet steps
          let explanationSteps: string[] = [];
          if (rawExplanation.includes('1.') && rawExplanation.includes('2.')) {
            explanationSteps = rawExplanation
              .split(/\n(?=\d+\.)/)
              .map((s: string) => s.replace(/^\d+\.\s*/, '').trim())
              .filter((s: string) => s.length > 0);
          } else if (rawExplanation) {
            explanationSteps = rawExplanation
              .split(/(?<=\.)\s+/)
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 10);
          }
          if (explanationSteps.length === 0) {
            explanationSteps = [
              'Analyze the constraints and edge cases.',
              `Apply the ${pattern} algorithmic strategy to traverse elements.`,
              'Return the optimal result in required format.',
            ];
          }

          const approaches = [
            {
              title: 'Optimal Solution',
              type: 'optimal' as const,
              intuition: rawExplanation || `Apply the ${pattern} algorithmic strategy for optimal performance.`,
              timeComplexity: parsedTime,
              spaceComplexity: parsedSpace,
              explanation: explanationSteps,
              code: templates,
            },
          ];

          problemsMap.set(id, {
            id,
            leetcodeId: numId,
            title,
            difficulty,
            category,
            pattern,
            description: cleanDesc,
            statementExplanation,
            problemBreakdown,
            constraints: ['1 <= N <= 10^5'],
            examples: [{ input: 'Sample Input', output: 'Sample Output' }],
            templates,
            testCases: [{ id: 1, input: 'Sample Test', expectedOutput: 'Expected' }],
            approaches,
          });
        } catch {
          // Skip malformed lines
        }
      }
    }

    // 3. Ensure canonical definitions for foundational 150 questions
    DSA_PROBLEMS.forEach((dp) => {
      problemsMap.set(dp.id, dp);
    });

    const combinedList = Array.from(problemsMap.values());
    cachedProblems = combinedList;

    return NextResponse.json({
      success: true,
      problems: combinedList,
      count: combinedList.length,
    });
  } catch (err) {
    console.error('Error serving DSA dataset:', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
