// ============================================================
// StudyQuest AI — Production Synthetic Health & Telemetry Probe
// ============================================================

import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus: 'healthy' | 'degraded' | 'unconfigured' = 'healthy';

  try {
    if (!env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      dbStatus = 'unconfigured';
    }
  } catch {
    dbStatus = 'degraded';
  }

  const responseTimeMs = Date.now() - startTime;
  const memory = process.memoryUsage();

  const healthData = {
    status: dbStatus === 'degraded' ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    service: 'studyquest-ai',
    version: '0.1.0',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    responseTimeMs,
    checks: {
      database: dbStatus,
      aiGateway: env.GEMINI_API_KEY || env.OPENROUTER_API_KEY || env.GROQ_API_KEY ? 'ready' : 'fallback-only',
    },
    memory: {
      rssMb: Math.round(memory.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
    },
  };

  return NextResponse.json(healthData, {
    status: dbStatus === 'degraded' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Content-Type': 'application/json',
    },
  });
}
