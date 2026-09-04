import { NextResponse } from 'next/server';
import { executeServerAiCompletion, ServerAiPayload } from '@/lib/serverAi';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body: ServerAiPayload = await req.json();
    const result = await executeServerAiCompletion(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          quotaExceeded: result.quotaExceeded,
          unconfigured: result.unconfigured,
          quota: result.quota,
        },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[AI Completion Route] Unhandled server error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error processing AI request.' },
      { status: 500 }
    );
  }
}
