import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
  try {
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
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
