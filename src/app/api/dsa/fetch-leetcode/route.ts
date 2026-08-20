import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  resolveTitleSlug,
  fetchLeetcodeQuestionDetail,
  fetchLeetcodeCommunitySolutions,
  formatLeetcodeToDsaProblem,
} from '@/lib/leetcodeApi';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body?.query;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { success: false, error: 'A valid LeetCode problem URL, number (e.g. 3471), or title is required.' },
        { status: 400 }
      );
    }

    // 1. Resolve slug
    const titleSlug = await resolveTitleSlug(query);
    if (!titleSlug) {
      return NextResponse.json(
        { success: false, error: `Could not resolve problem from query: "${query}".` },
        { status: 404 }
      );
    }

    // 2. Fetch Question Details from LeetCode Public GraphQL
    const rawQuestion = await fetchLeetcodeQuestionDetail(titleSlug);
    if (!rawQuestion) {
      return NextResponse.json(
        { success: false, error: `Problem "${titleSlug}" was not found on LeetCode.` },
        { status: 404 }
      );
    }

    if (rawQuestion.isPaidOnly && !rawQuestion.content) {
      return NextResponse.json(
        {
          success: false,
          error: `Problem "${rawQuestion.title}" is a LeetCode Premium subscriber-only problem.`,
        },
        { status: 403 }
      );
    }

    // 3. Fetch Top Community Solutions
    const rawSolutions = await fetchLeetcodeCommunitySolutions(titleSlug);

    // 4. Format into standardized StudyQuest DsaProblem
    const problem = formatLeetcodeToDsaProblem(rawQuestion, rawSolutions);

    // 5. Append to Main Server-Side Dataset (synced_contest_problems.json)
    try {
      const outputDir = path.join(process.cwd(), 'src', 'data', 'datasets');
      const syncLogPath = path.join(outputDir, 'synced_contest_problems.json');

      let existingSync: any[] = [];
      if (fs.existsSync(syncLogPath)) {
        try {
          existingSync = JSON.parse(fs.readFileSync(syncLogPath, 'utf-8'));
          if (!Array.isArray(existingSync)) existingSync = [];
        } catch {
          existingSync = [];
        }
      }

      // Check if already in file
      const alreadyExists = existingSync.some(
        (p) => p.titleSlug === rawQuestion.titleSlug || String(p.frontendQuestionId) === String(rawQuestion.questionFrontendId)
      );

      if (!alreadyExists) {
        existingSync.push({
          frontendQuestionId: rawQuestion.questionFrontendId,
          title: rawQuestion.title,
          titleSlug: rawQuestion.titleSlug,
          difficulty: rawQuestion.difficulty,
          topicTags: (rawQuestion.topicTags || []).map((t: any) => t.name),
          hints: rawQuestion.hints || [],
          sampleTestCase: rawQuestion.sampleTestCase || '',
          codeSnippets: rawQuestion.codeSnippets || [],
          content: rawQuestion.content || '',
          syncedAt: Date.now(),
        });

        fs.writeFileSync(syncLogPath, JSON.stringify(existingSync, null, 2), 'utf-8');
      }
    } catch (fsErr) {
      console.warn('Could not persist to server dataset file (read-only filesystem or serverless):', fsErr);
    }

    return NextResponse.json({
      success: true,
      problem,
      source: 'leetcode-live-graphql',
      persistedToMainDataset: true,
    });
  } catch (error: any) {
    console.error('Error in /api/dsa/fetch-leetcode:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch problem from LeetCode.',
      },
      { status: 500 }
    );
  }
}
