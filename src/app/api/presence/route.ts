import { NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const presenceRef = doc(db, 'users', uid, 'data', 'presence');

    setDoc(presenceRef, {
      online: body.online ?? false,
      lastSeen: body.lastSeen ?? Date.now(),
      activity: body.activity ?? 'offline',
    }, { merge: true }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating presence beacon:', err);
    return NextResponse.json({ error: err.message || err }, { status: 500 });
  }
}
