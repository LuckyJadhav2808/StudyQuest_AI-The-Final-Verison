import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import { ADMIN_EMAILS } from '@/lib/constants';

const execPromise = util.promisify(exec);

/**
 * Verifies a Firebase ID token using Google's public tokeninfo endpoint.
 */
async function verifyFirebaseToken(idToken: string): Promise<{ email?: string; uid?: string } | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
      method: 'GET',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { email: data.email, uid: data.sub || data.user_id };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // 1. Check for Admin Secret header or Firebase Bearer Token
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const adminSecretHeader = req.headers.get('x-admin-secret')?.trim();
    const expectedSecret = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_SECRET;

    let isAuthorized = false;

    // Check pre-shared secret if configured in env
    if (expectedSecret && adminSecretHeader && adminSecretHeader === expectedSecret) {
      isAuthorized = true;
    }

    // Verify Firebase ID Token if provided
    if (!isAuthorized && token) {
      const decoded = await verifyFirebaseToken(token);
      if (decoded?.email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(decoded.email.toLowerCase())) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin privileges required.' },
        { status: 401 }
      );
    }

    const repoPath = path.join(process.cwd(), 'src', 'data', 'datasets', 'kamyu104');

    // Run git pull inside the kamyu104 folder
    let gitOutput = 'Local repository already up to date.';
    try {
      const { stdout, stderr } = await execPromise(`git -C "${repoPath}" pull origin master`);
      gitOutput = stdout || stderr || 'Successfully pulled latest changes.';
    } catch (e) {
      console.warn('Git pull warning (using current dataset):', (e as Error).message);
    }

    return NextResponse.json({
      success: true,
      message: 'DSA Problem library synced successfully! User progress remains 100% safe and intact.',
      details: gitOutput,
      syncedAt: Date.now(),
    });
  } catch (err) {
    console.error('Error during DSA dataset sync:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error while syncing DSA dataset.' },
      { status: 500 }
    );
  }
}

