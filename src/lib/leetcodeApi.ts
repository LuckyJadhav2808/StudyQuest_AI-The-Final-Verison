// ============================================================
// StudyQuest AI — LeetCode Public GraphQL Client & Solution Extractor
// Zero-Key, High-Performance Problem Ingestion Engine
// ============================================================

import { DsaProblem, DsaTopic, DsaPattern, DsaDifficulty, DsaApproach } from '@/types/dsa';

const LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';

const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://leetcode.com',
};

/**
 * Normalizes user input (URL, problem number like 3471, or slug) into a clean LeetCode titleSlug.
 */
export async function resolveTitleSlug(input: string): Promise<string> {
  const trimmed = input.trim();
  const cleanInput = trimmed.replace(/^#/, '').replace(/^leetcode\s*[:#-]?\s*/i, '').trim();

  // 1. Direct URL: https://leetcode.com/problems/find-the-largest-almost-missing-integer/ (or .cn)
  const urlMatch = cleanInput.match(/leetcode\.(?:com|cn)\/problems\/([^/?#]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].toLowerCase();
  }

  // 2. Direct Slug string (contains lowercase and hyphens)
  if (/^[a-z0-9-]+$/.test(cleanInput) && !/^\d+$/.test(cleanInput)) {
    return cleanInput.toLowerCase();
  }

  // 3. Problem Number (e.g. "3471" or 3471) or Title string -> Query LeetCode problemset directory
  try {
    const query = `
      query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
        problemsetQuestionList: questionList(
          categorySlug: $categorySlug
          limit: $limit
          skip: $skip
          filters: $filters
        ) {
          total: totalNum
          questions: data {
            frontendQuestionId: questionFrontendId
            titleSlug
            title
          }
        }
      }
    `;

    const res = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        query,
        variables: {
          categorySlug: '',
          skip: 0,
          limit: 50,
          filters: { searchKeywords: cleanInput },
        },
      }),
    });

    const data = await res.json();
    const questions = data?.data?.problemsetQuestionList?.questions || [];

    // Check for exact frontend ID match first
    const exactIdMatch = questions.find(
      (q: any) => String(q.frontendQuestionId) === cleanInput
    );
    if (exactIdMatch) return exactIdMatch.titleSlug;

    // Check for exact or best title match
    if (questions.length > 0) {
      return questions[0].titleSlug;
    }
  } catch (err) {
    console.error('Error resolving slug from LeetCode problem list:', err);
  }

  // Fallback: convert title to slug format
  return trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Fetches full HTML question details, constraints, sample test cases, official hints, and language snippets.
 */
export async function fetchLeetcodeQuestionDetail(titleSlug: string): Promise<any> {
  const query = `
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        questionFrontendId
        title
        titleSlug
        difficulty
        isPaidOnly
        topicTags {
          name
          slug
        }
        content
        hints
        sampleTestCase
        exampleTestcaseList
        codeSnippets {
          lang
          langSlug
          code
        }
      }
    }
  `;

  const res = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      query,
      variables: { titleSlug },
    }),
  });

  const data = await res.json();
  return data?.data?.question || null;
}

/**
 * Fetches top upvoted community solutions and extracts code blocks for multiple languages.
 */
export async function fetchLeetcodeCommunitySolutions(titleSlug: string): Promise<any[]> {
  try {
    const query = `
      query questionSolutions($questionSlug: String!, $skip: Int!, $first: Int!) {
        questionSolutions(
          filters: { questionSlug: $questionSlug, skip: $skip, first: $first, orderBy: most_votes }
        ) {
          solutions {
            id
            title
            post {
              id
              content
              voteCount
            }
          }
        }
      }
    `;

    const res = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        query,
        variables: { questionSlug: titleSlug, skip: 0, first: 4 },
      }),
    });

    const data = await res.json();
    return data?.data?.questionSolutions?.solutions || [];
  } catch (err) {
    console.error('Error fetching community solutions:', err);
    return [];
  }
}

/**
 * Extracts a code snippet for a specific language from markdown content.
 */
function extractCodeBlock(markdown: string, langKey: string): string {
  if (!markdown) return '';
  const langAliases: Record<string, string[]> = {
    cpp: ['cpp', 'c\\+\\+', 'c'],
    java: ['java'],
    python: ['python', 'python3', 'py'],
    javascript: ['javascript', 'js', 'typescript', 'ts'],
  };

  const aliases = langAliases[langKey] || [langKey];
  for (const alias of aliases) {
    const regex = new RegExp('```(?:' + alias + ')[\\s\\r\\n]+([\\s\\S]*?)```', 'i');
    const match = markdown.match(regex);
    if (match && match[1]) {
      let code = match[1].trim();
      code = code.replace(/^\[\]\s*\n*/, '').trim();
      if (code.length > 15) return code;
    }
  }

  // Fallback to any generic code block
  const genericMatch = markdown.match(/```[\\s\\r\\n]+([\\s\\S]*?)```/);
  if (genericMatch && genericMatch[1]) {
    let code = genericMatch[1].trim();
    code = code.replace(/^\[\]\s*\n*/, '').trim();
    if (code.length > 15) return code;
  }

  return '';
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
  if (s.includes('backtrack') || s.includes('combination') || s.includes('permutation') || s.includes('subset')) return 'Subsets & Combinations';
  if (s.includes('sliding window') || s.includes('substring')) return 'Sliding Window';
  if (s.includes('slow') || s.includes('fast') || s.includes('cycle') || s.includes('two pointer')) return 'Two Pointers';
  if (s.includes('monotonic') || s.includes('next greater') || s.includes('stack')) return 'Monotonic Stack';
  if (s.includes('heap') || s.includes('priority queue') || s.includes('top-k') || s.includes('kth')) return 'Top-K Elements';
  if (s.includes('interval') || s.includes('merge intervals')) return 'Overlapping Intervals';
  if (s.includes('reverse') || s.includes('in-place')) return 'In-place Reversal';
  if (s.includes('topological') || s.includes('course schedule')) return 'Topological Sort';
  if (s.includes('matrix') || s.includes('grid') || s.includes('island')) return 'Matrix Traversal';
  if (s.includes('knapsack') || s.includes('climbing stairs') || s.includes('coin change')) return '0/1 Knapsack (DP)';
  if (s.includes('subsequence') || s.includes('edit distance')) return 'Longest Common Subsequence (DP)';
  if (s.includes('tree') || s.includes('dfs') || s.includes('bfs')) return 'Tree DFS/BFS';
  return 'Two Pointers';
}

/**
 * Converts LeetCode GraphQL payload into StudyQuest's standard DsaProblem schema.
 */
export function formatLeetcodeToDsaProblem(
  rawQuestion: any,
  rawSolutions: any[] = []
): DsaProblem {
  const numId = parseInt(rawQuestion.questionFrontendId, 10) || parseInt(rawQuestion.questionId, 10);
  const title = rawQuestion.title || `Problem ${numId}`;
  const id = rawQuestion.titleSlug || `problem-${numId}`;

  const diffStr = (rawQuestion.difficulty || 'Easy').toLowerCase();
  const difficulty: DsaDifficulty = diffStr.includes('hard') ? 'hard' : diffStr.includes('med') ? 'medium' : 'easy';

  const tagsList = (rawQuestion.topicTags || []).map((t: any) => t.name);
  const tagStr = tagsList.join(' ');
  const category = normalizeTopic(tagStr, title);
  const pattern = normalizePattern(tagStr, title);

  const rawHtml = rawQuestion.content || '<p>No description available.</p>';
  const cleanText = rawHtml.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  const firstSentence = cleanText.split('.')[0] || '';
  const statementExplanation = `This challenge asks you to ${firstSentence.toLowerCase()}. Analyze the constraints and apply the optimal ${pattern} strategy.`;

  // Parse examples from HTML
  const examples: { input: string; output: string; explanation?: string }[] = [];
  const exampleBlocks = rawHtml.match(/<strong>Input:<\/strong>\s*([\s\S]*?)<strong>Output:<\/strong>\s*([\s\S]*?)(?:<strong>Explanation:<\/strong>\s*([\s\S]*?))?(?:<\/pre>|<p>)/gi) || [];

  exampleBlocks.forEach((block: string) => {
    const inMatch = block.match(/<strong>Input:<\/strong>\s*([\s\S]*?)(?=<strong>Output:|$)/i);
    const outMatch = block.match(/<strong>Output:<\/strong>\s*([\s\S]*?)(?=<strong>Explanation:|$|<\/pre>|<p>)/i);
    const expMatch = block.match(/<strong>Explanation:<\/strong>\s*([\s\S]*?)(?=<\/pre>|<p>|$)/i);

    if (inMatch && outMatch) {
      examples.push({
        input: inMatch[1].replace(/<[^>]*>/g, '').trim(),
        output: outMatch[1].replace(/<[^>]*>/g, '').trim(),
        explanation: expMatch ? expMatch[1].replace(/<[^>]*>/g, '').trim() : undefined,
      });
    }
  });

  if (examples.length === 0 && rawQuestion.sampleTestCase) {
    examples.push({
      input: rawQuestion.sampleTestCase,
      output: 'Refer to problem description',
    });
  }

  // Parse Constraints from HTML
  const constraints: string[] = [];
  const constraintSection = rawHtml.match(/<strong[^>]*>Constraints:<\/strong>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
  if (constraintSection && constraintSection[1]) {
    const liMatches = constraintSection[1].match(/<li>([\s\S]*?)<\/li>/gi) || [];
    liMatches.forEach((li: string) => {
      const clean = li.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&le;/g, '<=').replace(/&ge;/g, '>=').trim();
      if (clean) constraints.push(clean);
    });
  }
  if (constraints.length === 0) {
    constraints.push('1 <= N <= 10^5', 'Review problem statement for detailed numerical limits');
  }

  // Starter Code Templates from codeSnippets
  const snippets = rawQuestion.codeSnippets || [];
  const cppSnippet = snippets.find((s: any) => s.langSlug === 'cpp')?.code || `#include <iostream>\n#include <vector>\n\nclass Solution {\npublic:\n    // Write your C++ solution here\n};`;
  const javaSnippet = snippets.find((s: any) => s.langSlug === 'java')?.code || `class Solution {\n    // Write your Java solution here\n}`;
  const pySnippet = snippets.find((s: any) => s.langSlug === 'python3' || s.langSlug === 'python')?.code || `class Solution:\n    # Write your Python solution here\n    pass`;
  const jsSnippet = snippets.find((s: any) => s.langSlug === 'javascript')?.code || `/**\n * @return {any}\n */\nvar solution = function() {\n    // Write your JavaScript solution here\n};`;

  const templates = {
    cpp: cppSnippet,
    java: javaSnippet,
    python: pySnippet,
    javascript: jsSnippet,
  };

  // Build Approaches from Community Solutions or Hints
  const approaches: DsaApproach[] = [];

function cleanCommunityPostText(raw: string, pattern: string, title: string): { intuition: string; steps: string[] } {
  if (!raw) {
    return {
      intuition: `Apply the ${pattern} algorithmic strategy to solve ${title} within optimal time limits.`,
      steps: [
        `Analyze the problem requirements and constraints for ${title}.`,
        `Apply the ${pattern} strategy to process elements and manage state.`,
        'Handle edge cases and return the optimal result in the required format.',
      ],
    };
  }

  let text = raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[*_#`~]/g, ' ')
    .replace(/\[\s*\]/g, ' ');

  const bannedKeywords = [
    'video solution',
    'video explanation',
    'youtube',
    'subscribe',
    'upvote',
    'please upvote',
    'motivates me',
    'thank you',
    'complexity',
    'time complexity',
    'space complexity',
    'approach',
    'intuition',
    'code',
  ];

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      const cleanLine = l.replace(/^[-*•#:]+\s*/, '').trim();
      if (cleanLine.length < 15) return false;
      const lower = cleanLine.toLowerCase();
      if (
        lower.includes('time complexity') ||
        lower.includes('space complexity') ||
        lower.includes('thank you') ||
        lower.includes('subscribe') ||
        lower.includes('upvote') ||
        lower.includes('video') ||
        lower.includes('motivates') ||
        bannedKeywords.some((b) => lower === b || lower.startsWith(b + ':'))
      ) {
        return false;
      }
      return true;
    });

  let intuition = lines[0] || `Apply the ${pattern} algorithmic strategy to solve ${title} within optimal complexity limits.`;
  if (intuition.length > 300) {
    intuition = intuition.slice(0, 300) + '...';
  }

  let steps = lines.slice(1, 5);
  if (steps.length < 2) {
    steps = [
      `Analyze the input constraints and identify state invariants for ${title}.`,
      `Apply ${pattern} logic to traverse elements and maintain optimal state.`,
      'Return the calculated result adhering to time and space limits.',
    ];
  }

  return { intuition, steps };
}

  if (rawSolutions.length > 0) {
    rawSolutions.slice(0, 2).forEach((sol: any, idx: number) => {
      const postContent = sol.post?.content || '';
      const appTitle = idx === 0 ? 'Optimal Community Solution' : 'Alternative Approach';
      const appType = idx === 0 ? 'optimal' : 'alternative';

      const cppCode = extractCodeBlock(postContent, 'cpp') || cppSnippet;
      const javaCode = extractCodeBlock(postContent, 'java') || javaSnippet;
      const pyCode = extractCodeBlock(postContent, 'python') || pySnippet;
      const jsCode = extractCodeBlock(postContent, 'javascript') || jsSnippet;

      const { intuition, steps } = cleanCommunityPostText(postContent, pattern, title);

      approaches.push({
        title: `${appTitle} (${sol.title ? sol.title.replace(/[*_#]/g, '').slice(0, 35).trim() : 'Standard'})`,
        type: appType as any,
        intuition,
        timeComplexity: difficulty === 'easy' ? 'O(N)' : difficulty === 'medium' ? 'O(N log N)' : 'O(N^2)',
        spaceComplexity: difficulty === 'easy' ? 'O(1)' : 'O(N)',
        explanation: steps,
        code: {
          cpp: cppCode,
          java: javaCode,
          python: pyCode,
          javascript: jsCode,
        },
      });
    });
  }

  // Fallback approach if no community solutions were found
  if (approaches.length === 0) {
    const hints = rawQuestion.hints || [];
    approaches.push({
      title: 'Optimal Approach',
      type: 'optimal',
      intuition: hints[0] ? `Official Hint: ${hints[0].replace(/<[^>]*>/g, '')}` : `Use an optimal ${pattern} strategy to solve within time limits.`,
      timeComplexity: difficulty === 'easy' ? 'O(N)' : difficulty === 'medium' ? 'O(N log N)' : 'O(N^2)',
      spaceComplexity: difficulty === 'easy' ? 'O(1)' : 'O(N)',
      explanation: hints.length > 0
        ? hints.map((h: string) => h.replace(/<[^>]*>/g, ''))
        : [
            'Break down problem constraints and identify frequency/boundary invariants.',
            `Use ${pattern} to process the input efficiently.`,
            'Handle edge cases (e.g. single element or entire array size).',
          ],
      code: templates,
    });
  }

  // Test Cases
  const testCases = examples.map((ex, i) => ({
    id: i + 1,
    input: ex.input,
    expectedOutput: ex.output,
  }));

  const problemBreakdown = [
    `💡 Goal: Implement a robust, tested solution for ${title} (#${numId}).`,
    `🎯 Algorithmic Pattern: Classified under ${category} (${pattern}).`,
    `⚠️ Constraints Watch: Adhere to bounds (${constraints[0] || 'O(N) complexity'}).`,
    `⚡ Complexity Goal: Aim for ${difficulty === 'easy' ? 'O(N) Time, O(1) Space' : 'optimal execution'}.`,
  ];

  return {
    id,
    leetcodeId: numId,
    title,
    difficulty,
    category,
    pattern,
    leetcodeUrl: `https://leetcode.com/problems/${id}/`,
    description: rawHtml,
    statementExplanation,
    problemBreakdown,
    constraints,
    examples,
    templates,
    testCases,
    approaches,
  };
}
