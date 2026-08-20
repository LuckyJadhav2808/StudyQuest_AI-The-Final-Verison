#!/usr/bin/env node
/**
 * StudyQuest AI — Weekly LeetCode Problem Sync & Ingestion Script
 * Usage: node scripts/syncLeetcode.js [--limit=50]
 */

const fs = require('fs');
const path = require('path');

const LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';

const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://leetcode.com',
};

async function fetchLatestQuestions(limit = 50) {
  console.log(`🚀 Querying LeetCode for latest ${limit} published problems...`);
  const query = `
    query problemsetQuestionList($limit: Int, $skip: Int) {
      problemsetQuestionList: questionList(
        categorySlug: ""
        limit: $limit
        skip: $skip
        filters: { orderBy: FRONTEND_ID, sortOrder: DESCENDING }
      ) {
        total: totalNum
        questions: data {
          frontendQuestionId: questionFrontendId
          titleSlug
          title
          difficulty
          isPaidOnly
          topicTags { name }
        }
      }
    }
  `;

  const res = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      query,
      variables: { limit, skip: 0 },
    }),
  });

  const data = await res.json();
  return data?.data?.problemsetQuestionList?.questions || [];
}

async function fetchQuestionDetail(titleSlug) {
  const query = `
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        questionFrontendId
        title
        titleSlug
        difficulty
        isPaidOnly
        topicTags { name slug }
        content
        hints
        sampleTestCase
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

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 25;

  try {
    const latestQuestions = await fetchLatestQuestions(limit);
    console.log(`✅ Retrieved ${latestQuestions.length} recent contest questions.`);

    const freeQuestions = latestQuestions.filter((q) => !q.isPaidOnly);
    console.log(`📦 ${freeQuestions.length} questions are public (non-premium).\n`);

    const outputDir = path.join(__dirname, '..', 'src', 'data', 'datasets');
    const syncLogPath = path.join(outputDir, 'synced_contest_problems.json');

    let existingSync = [];
    if (fs.existsSync(syncLogPath)) {
      try {
        existingSync = JSON.parse(fs.readFileSync(syncLogPath, 'utf-8'));
      } catch (e) {
        existingSync = [];
      }
    }

    const existingSlugs = new Set(existingSync.map((p) => p.titleSlug));
    let newlyIngested = 0;

    for (const q of freeQuestions) {
      if (existingSlugs.has(q.titleSlug)) {
        console.log(`⏩ [Skipped] #${q.frontendQuestionId} ${q.title} (Already Synced)`);
        continue;
      }

      console.log(`⚡ [Ingesting] #${q.frontendQuestionId} ${q.title}...`);
      const detail = await fetchQuestionDetail(q.titleSlug);
      if (detail && detail.content) {
        existingSync.push({
          frontendQuestionId: detail.questionFrontendId,
          title: detail.title,
          titleSlug: detail.titleSlug,
          difficulty: detail.difficulty,
          topicTags: detail.topicTags?.map((t) => t.name) || [],
          hints: detail.hints || [],
          sampleTestCase: detail.sampleTestCase || '',
          codeSnippets: detail.codeSnippets || [],
          syncedAt: Date.now(),
        });
        existingSlugs.add(q.titleSlug);
        newlyIngested++;
        // Small delay to be polite to LeetCode API
        await new Promise((r) => setTimeout(r, 350));
      }
    }

    fs.writeFileSync(syncLogPath, JSON.stringify(existingSync, null, 2), 'utf-8');
    console.log(`\n🎉 Ingestion Complete! ${newlyIngested} new contest problems saved to:`);
    console.log(`   ${syncLogPath}`);
  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  }
}

main();
