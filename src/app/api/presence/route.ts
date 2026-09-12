import { NextResponse } from 'next/server';

/**
 * Presence Beacon Route Handler
 * Uses lightweight REST endpoint to eliminate Node client-SDK gRPC stream connection drops.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId) {
      // Fire-and-forget lightweight REST PATCH to Firestore to avoid spawning Node gRPC stream
      const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/data/presence?updateMask.fieldPaths=online&updateMask.fieldPaths=lastSeen&updateMask.fieldPaths=activity`;
      fetch(restUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            online: { booleanValue: body.online ?? false },
            lastSeen: { integerValue: String(body.lastSeen ?? Date.now()) },
            activity: { stringValue: body.activity ?? 'offline' },
          }
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: true });
  }
}
