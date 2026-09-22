import { NextResponse } from 'next/server';

/**
 * Presence Beacon Route Handler
 * Validates UID pattern and bounds presence updates.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    
    // Strict UID pattern validation to prevent injection or malicious inputs
    if (!uid || typeof uid !== 'string' || !/^[a-zA-Z0-9_-]{10,128}$/.test(uid)) {
      return NextResponse.json({ error: 'Invalid or missing uid' }, { status: 400 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const online = Boolean(body.online);
    const activity = typeof body.activity === 'string' ? body.activity.slice(0, 32).trim() : 'offline';
    const now = Date.now();
    const lastSeen = typeof body.lastSeen === 'number' && body.lastSeen > 0 && body.lastSeen <= now + 60000 
      ? body.lastSeen 
      : now;

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId) {
      // Fire-and-forget lightweight REST PATCH to Firestore
      const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/data/presence?updateMask.fieldPaths=online&updateMask.fieldPaths=lastSeen&updateMask.fieldPaths=activity`;
      fetch(restUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            online: { booleanValue: online },
            lastSeen: { integerValue: String(lastSeen) },
            activity: { stringValue: activity },
          }
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}

