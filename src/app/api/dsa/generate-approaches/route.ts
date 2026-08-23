import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DsaApproach, DsaProblem } from '@/types/dsa';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const problem: DsaProblem = body?.problem;
    const openRouterKey: string | undefined = body?.openRouterKey;

    if (!problem || !problem.title) {
      return NextResponse.json(
        { success: false, error: 'Valid problem metadata is required.' },
        { status: 400 }
      );
    }

    let approaches: DsaApproach[] = [];

    // If OpenRouter API Key is provided, use Google Gemini 2.5 Flash for high-precision generation
    if (openRouterKey && openRouterKey.startsWith('sk-')) {
      try {
        const prompt = `You are a Principal DSA Instructor.
Generate 3 distinct, progressive solution approaches for this problem:
Title: ${problem.title} (#${problem.leetcodeId || problem.id})
Difficulty: ${problem.difficulty}
Category: ${problem.category}
Pattern: ${problem.pattern}
Description: ${problem.description?.slice(0, 1500)}
Constraints: ${problem.constraints?.join(', ')}

Requirements:
Generate exactly 3 progressive approaches in JSON format:
1. "1. Brute Force (Naive)": The most basic approach. Explain the intuition, where redundant work happens, and why it hits Time/Space limits.
2. "2. Better (Intermediate Optimization)": Uses sorting, hash map, two pointers, or memoization to optimize the bottleneck.
3. "3. Optimal Solution": The most optimal approach (e.g. single pass, state reduction, monotonic deque, bit manipulation) reaching theoretical lower bounds.

For each approach, provide:
- "title": string (e.g. "1. Brute Force (Nested Loop Check)")
- "type": "naive" | "intermediate" | "optimal"
- "intuition": string (Concise 2-4 sentence explanation of algorithmic idea and trade-off)
- "timeComplexity": string (e.g. "O(N^2)", "O(N log N)", "O(N)")
- "spaceComplexity": string (e.g. "O(1)", "O(N)")
- "explanation": string[] (Array of 3-5 numbered logical steps)
- "code": { "cpp": string, "java": string, "python": string, "javascript": string } (Clean, working code implementations)

Return ONLY valid JSON matching this exact structure:
{
  "approaches": [
    { ...approach 1... },
    { ...approach 2... },
    { ...approach 3... }
  ]
}`;

        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'https://studyquest.ai',
            'X-Title': 'StudyQuest DSA Solution Generator',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: 'You are an expert DSA instructor. Always output valid JSON with an "approaches" array.',
              },
              { role: 'user', content: prompt },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const content = aiData?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed?.approaches) && parsed.approaches.length > 0) {
              approaches = parsed.approaches;
            }
          }
        }
      } catch (aiErr) {
        console.warn('AI generation error, falling back to structured synthesis:', aiErr);
      }
    }

    // Fallback: If AI is not configured or failed, synthesize 3 progressive structured approaches
    if (approaches.length === 0) {
      approaches = synthesizeProgressiveApproaches(problem);
    }

    // Cache updated approaches to synced_contest_problems.json
    try {
      const outputDir = path.join(process.cwd(), 'src', 'data', 'datasets');
      const syncLogPath = path.join(outputDir, 'synced_contest_problems.json');
      if (fs.existsSync(syncLogPath)) {
        const fileContent = fs.readFileSync(syncLogPath, 'utf-8');
        const parsedList = JSON.parse(fileContent);
        const idx = parsedList.findIndex((p: any) => p.id === problem.id || String(p.leetcodeId) === String(problem.leetcodeId));
        if (idx !== -1) {
          parsedList[idx].approaches = approaches;
          fs.writeFileSync(syncLogPath, JSON.stringify(parsedList, null, 2), 'utf-8');
        }
      }
    } catch (e) {
      console.warn('Failed to cache approaches to synced_contest_problems.json:', e);
    }

    return NextResponse.json({
      success: true,
      approaches,
    });
  } catch (error: any) {
    console.error('Error generating approaches:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate approaches' },
      { status: 500 }
    );
  }
}

/**
 * Deterministic rule-based synthesis for 3 progressive approaches when offline.
 */
function synthesizeProgressiveApproaches(problem: DsaProblem): DsaApproach[] {
  const title = problem.title;
  const pattern = problem.pattern || 'Two Pointers';
  const category = problem.category || 'Arrays & Hashing';
  const templates = problem.templates || {
    cpp: `// Solution for ${title}`,
    java: `// Solution for ${title}`,
    python: `# Solution for ${title}`,
    javascript: `// Solution for ${title}`,
  };

  return [
    {
      title: `1. Brute Force (Exhaustive Search)`,
      type: 'brute-force',
      intuition: `Iterate through all possible combinations and evaluate the target condition. This guarantees correctness but suffers from redundant recalculations on overlapping subproblems.`,
      timeComplexity: problem.difficulty === 'hard' ? 'O(2^N)' : 'O(N^2)',
      spaceComplexity: 'O(1)',
      explanation: [
        `Initialize nested loops or exhaustive recursion to generate all candidate states for ${title}.`,
        'Check each state against constraints and record the best valid answer.',
        'Return the collected result. Identify the inner loop bottleneck for optimization.',
      ],
      code: templates,
    },
    {
      title: `2. Better (Intermediate: ${pattern})`,
      type: 'better',
      intuition: `Optimize the brute force bottleneck by applying ${pattern} or auxiliary data structures to eliminate redundant iterations.`,
      timeComplexity: problem.difficulty === 'easy' ? 'O(N)' : 'O(N log N)',
      spaceComplexity: 'O(N)',
      explanation: [
        `Pre-process or sort data elements to order the search space for ${title}.`,
        `Apply ${pattern} to traverse elements and maintain intermediate bounds.`,
        'Return the optimized result within improved time boundaries.',
      ],
      code: templates,
    },
    {
      title: `3. Optimal (State-of-the-Art: ${category})`,
      type: 'optimal',
      intuition: `Achieve theoretical lower bounds using optimal state transitions, single-pass hash tracking, or in-place space optimization for ${title}.`,
      timeComplexity: problem.difficulty === 'easy' ? 'O(N)' : problem.difficulty === 'medium' ? 'O(N)' : 'O(N log N)',
      spaceComplexity: problem.difficulty === 'easy' ? 'O(1)' : 'O(N)',
      explanation: [
        `Establish mathematical invariants and boundary conditions for ${title}.`,
        'Execute a single-pass traversal maintaining optimal space bounds.',
        'Return the optimal result meeting production-grade performance requirements.',
      ],
      code: templates,
    },
  ];
}
