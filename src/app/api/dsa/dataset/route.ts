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

// In-memory cache for parsed catalog & full details
let cachedCatalog: DsaProblem[] | null = null;
let cachedFullDetailsMap: Map<string, DsaProblem> | null = null;
let lastSyncedMtime = 0;

function buildDataset() {
  const syncedPath = path.join(process.cwd(), 'src', 'data', 'datasets', 'synced_contest_problems.json');
  const csvPath = path.join(process.cwd(), 'src', 'data', 'datasets', 'Leetcode_Questions_updated (2024-11-02).csv');
  const jsonlPath = path.join(process.cwd(), 'src', 'data', 'datasets', 'leetcode-solutions.jsonl');

  const catalogMap = new Map<string, DsaProblem>();
  const fullMap = new Map<string, DsaProblem>();

  // 1. Ingest all 3,308+ questions from Leetcode_Questions_updated (2024-11-02).csv
  if (fs.existsSync(csvPath)) {
    try {
      const csvLines = fs.readFileSync(csvPath, 'utf-8').split('\n');
      for (let i = 1; i < csvLines.length; i++) {
        const line = csvLines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);
        const qNum = parseInt(cols[0], 10);
        if (!qNum) continue;

        const rawTitle = cols[1] || `Problem ${qNum}`;
        const title = rawTitle.replace(/^\d+\.\s*/, '').trim();
        const link = cols[6] || '';
        const slugMatch = link.match(/problems\/([^\/]+)/);
        const slug = slugMatch ? slugMatch[1] : `problem-${qNum}`;
        const tags = cols[2] || '';
        const difficulty = normalizeDifficulty(cols[5]);
        const category = normalizeTopic(tags, title);
        const pattern = normalizePattern(tags, title);

        const defaultTemplates = {
          cpp: `class Solution {\npublic:\n    // Solution for ${title}\n};\n`,
          python: `class Solution:\n    # Solution for ${title}\n    pass\n`,
          java: `class Solution {\n    // Solution for ${title}\n}\n`,
          javascript: `/**\n * @return {any}\n */\nvar solution = function() {\n    \n};\n`,
        };

        const problemObj: DsaProblem = {
          id: slug,
          leetcodeId: qNum,
          title,
          difficulty,
          category,
          pattern,
          description: `Challenge **${title}** (#${qNum}). Solve with ${pattern} algorithmic strategy.`,
          statementExplanation: `Review the constraints and implement the optimal ${pattern} algorithmic strategy for ${title}.`,
          problemBreakdown: [
            `💡 Goal: Implement optimal solution for ${title} (#${qNum}).`,
            `🎯 Topic: ${category} using ${pattern}.`,
            `⚡ Complexity: Aim for optimal execution.`,
          ],
          constraints: ['1 <= N <= 10^5'],
          examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
          templates: defaultTemplates,
          testCases: [{ id: 1, input: 'Sample Test', expectedOutput: 'Expected' }],
          approaches: [
            {
              title: 'Optimal Approach',
              type: 'optimal' as const,
              intuition: `Apply ${pattern} strategy to solve ${title}.`,
              timeComplexity: difficulty === 'easy' ? 'O(N)' : difficulty === 'medium' ? 'O(N log N)' : 'O(N^2)',
              spaceComplexity: difficulty === 'easy' ? 'O(1)' : 'O(N)',
              explanation: [
                'Analyze problem constraints and state invariants.',
                `Apply ${pattern} to traverse elements and maintain state.`,
                'Return the optimal result in the required format.',
              ],
              code: defaultTemplates,
            },
          ],
        };

        catalogMap.set(slug, problemObj);
      }
    } catch (err) {
      console.warn('Error reading LeetCode questions CSV:', err);
    }
  }

  // 2. Parse leetcode-solutions.jsonl with enriched solutions and approaches
  if (fs.existsSync(jsonlPath)) {
    try {
      const fileContent = fs.readFileSync(jsonlPath, 'utf-8');
      const lines = fileContent.split('\n').filter((line) => line.trim().length > 0);

      for (let idx = 0; idx < lines.length; idx++) {
        try {
          const item = JSON.parse(lines[idx]);
          const numId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
          const slug = item.slug || `problem-${numId || idx + 1}`;
          const existing = catalogMap.get(slug);

          const rawTitle = item.title || existing?.title || `Problem ${numId || idx + 1}`;
          const title = rawTitle.replace(/^\d+\.\s*/, '').trim();
          const difficulty = normalizeDifficulty(item.difficulty || existing?.difficulty);
          const tagStr = `${Array.isArray(item.tags) ? item.tags.join(' ') : (item.tags || item.category || existing?.category || '')}`;
          const category = existing?.category || normalizeTopic(tagStr, title);
          const pattern = existing?.pattern || normalizePattern(tagStr, title);

          const desc = item.content || item.description || existing?.description || 'No description available.';
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
            cpp: cppCode || existing?.templates?.cpp || `#include <iostream>\n\nclass Solution {\npublic:\n    // Solution for ${title}\n};\n`,
            python: pyCode || existing?.templates?.python || `class Solution:\n    # Solution for ${title}\n    pass\n`,
            java: javaCode || existing?.templates?.java || `class Solution {\n    // Solution for ${title}\n}\n`,
            javascript: jsCode || existing?.templates?.javascript || `var solution = function() {\n  // Solution for ${title}\n};\n`,
          };

          const rawExplanation = item.answer?.explanation || '';
          const timeMatch = rawExplanation.match(/time complexity of\s*([A-Za-z0-9^()]+)/i);
          const spaceMatch = rawExplanation.match(/space complexity of\s*([A-Za-z0-9^()]+)/i);
          const parsedTime = timeMatch ? timeMatch[1].replace(/n/g, 'N') : difficulty === 'easy' ? 'O(N)' : difficulty === 'medium' ? 'O(N log N)' : 'O(N^2)';
          const parsedSpace = spaceMatch ? spaceMatch[1].replace(/n/g, 'N') : difficulty === 'easy' ? 'O(1)' : 'O(N)';

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
              'Analyze problem constraints and state invariants.',
              `Apply ${pattern} to traverse elements and maintain state.`,
              'Return the optimal result in the required format.',
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

          const fullProblem: DsaProblem = {
            id: slug,
            leetcodeId: numId || existing?.leetcodeId || idx + 1,
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
          };

          fullMap.set(slug, fullProblem);
          if (numId) {
            fullMap.set(String(numId), fullProblem);
          }

          // Catalog entry with clean description
          if (existing) {
            existing.description = cleanDesc;
            existing.templates = templates;
            existing.approaches = approaches;
          } else {
            catalogMap.set(slug, fullProblem);
          }
        } catch {
          // Skip malformed lines
        }
      }
    } catch (err) {
      console.warn('Error reading leetcode solutions JSONL:', err);
    }
  }

  // 3. Parse synced_contest_problems.json if available
  if (fs.existsSync(syncedPath)) {
    try {
      const syncedItems = JSON.parse(fs.readFileSync(syncedPath, 'utf-8'));
      if (Array.isArray(syncedItems)) {
        for (const s of syncedItems) {
          const numId = parseInt(s.frontendQuestionId, 10);
          const title = s.title || `Problem ${numId}`;
          const id = s.titleSlug || `problem-${numId}`;
          const difficulty = normalizeDifficulty(s.difficulty);
          const tagStr = (s.topicTags || []).join(' ');
          const category = normalizeTopic(tagStr, title);
          const pattern = normalizePattern(tagStr, title);
          const cleanDesc = (s.content || '').replace(/<[^>]*>/g, '').trim();

          const snippets = s.codeSnippets || [];
          const cppSnippet = snippets.find((x: any) => x.langSlug === 'cpp')?.code || `#include <iostream>\n\nclass Solution {\npublic:\n    // Solution for ${title}\n};\n`;
          const javaSnippet = snippets.find((x: any) => x.langSlug === 'java')?.code || `class Solution {\n    // Solution for ${title}\n};\n`;
          const pySnippet = snippets.find((x: any) => x.langSlug === 'python3' || x.langSlug === 'python')?.code || `class Solution:\n    # Solution for ${title}\n    pass\n`;
          const jsSnippet = snippets.find((x: any) => x.langSlug === 'javascript')?.code || `var solution = function() {\n  // Solution for ${title}\n};\n`;

          const templates = {
            cpp: cppSnippet,
            java: javaSnippet,
            python: pySnippet,
            javascript: jsSnippet,
          };

          const hints = s.hints || [];
          const approaches = [
            {
              title: 'Optimal Approach',
              type: 'optimal' as const,
              intuition: hints[0] ? `Official Hint: ${hints[0].replace(/<[^>]*>/g, '')}` : `Apply ${pattern} strategy to solve within time limits.`,
              timeComplexity: difficulty === 'easy' ? 'O(N)' : difficulty === 'medium' ? 'O(N log N)' : 'O(N^2)',
              spaceComplexity: difficulty === 'easy' ? 'O(1)' : 'O(N)',
              explanation: hints.length > 0
                ? hints.map((h: string) => h.replace(/<[^>]*>/g, ''))
                : [
                    'Analyze problem constraints and state invariants.',
                    `Apply ${pattern} to traverse elements and maintain state.`,
                    'Return the optimal result in the required format.',
                  ],
              code: templates,
            },
          ];

          const problem: DsaProblem = {
            id,
            leetcodeId: numId,
            title,
            difficulty,
            category,
            pattern,
            description: cleanDesc || s.content || 'No description available.',
            statementExplanation: `This challenge asks you to solve ${title}. Review the constraints and apply the optimal ${pattern} strategy.`,
            problemBreakdown: [
              `💡 Goal: Implement a tested solution for ${title} (#${numId}).`,
              `🎯 Category & Pattern: ${category} (${pattern}).`,
              `⚡ Target Complexity: ${difficulty === 'easy' ? 'O(N) Time, O(1) Space' : 'Optimal Execution'}.`,
            ],
            constraints: ['1 <= N <= 10^5'],
            examples: [{ input: s.sampleTestCase || 'Sample Input', output: 'Sample Output' }],
            templates,
            testCases: [{ id: 1, input: s.sampleTestCase || 'Sample Test', expectedOutput: 'Expected' }],
            approaches,
          };

          catalogMap.set(id, problem);
          fullMap.set(id, problem);
          if (numId) fullMap.set(String(numId), problem);
        }
      }
    } catch (err) {
      console.warn('Error reading synced contest problems:', err);
    }
  }

  // 4. Ensure canonical definitions for foundational roadmap questions
  DSA_PROBLEMS.forEach((dp) => {
    catalogMap.set(dp.id, dp);
    fullMap.set(dp.id, dp);
    if (dp.leetcodeId) fullMap.set(String(dp.leetcodeId), dp);
  });

  const combinedCatalog = Array.from(catalogMap.values());
  // Sort catalog numerically by LeetCode ID where available
  combinedCatalog.sort((a, b) => (a.leetcodeId || 99999) - (b.leetcodeId || 99999));

  cachedCatalog = combinedCatalog;
  cachedFullDetailsMap = fullMap;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('id');

    const syncedPath = path.join(process.cwd(), 'src', 'data', 'datasets', 'synced_contest_problems.json');
    let currentMtime = 0;
    if (fs.existsSync(syncedPath)) {
      try {
        currentMtime = fs.statSync(syncedPath).mtimeMs;
      } catch {}
    }

    if (!cachedCatalog || currentMtime !== lastSyncedMtime) {
      buildDataset();
      lastSyncedMtime = currentMtime;
    }

    // Single problem detail on-demand lookup
    if (targetId) {
      const fullProblem = cachedFullDetailsMap?.get(targetId) || cachedCatalog?.find((p) => p.id === targetId || String(p.leetcodeId) === targetId);
      if (fullProblem) {
        return NextResponse.json({ success: true, problem: fullProblem });
      }
      return NextResponse.json({ success: false, error: `Problem "${targetId}" not found` }, { status: 404 });
    }

    // Default: Return the complete catalog of all 3,367+ questions
    return NextResponse.json(
      {
        success: true,
        problems: cachedCatalog,
        count: cachedCatalog?.length || 0,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err) {
    console.error('Error serving DSA dataset:', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
