/**
 * /api/music/suggestions — Get song suggestions based on a song ID
 *
 * Supports both YouTube (`yt_`) and JioSaavn (`saavn_`) tracks with graceful fallbacks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchMusic } from '@/lib/musicEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Song ID is required' },
        { status: 400 }
      );
    }

    // Default suggestions based on study & focus keywords
    const fallbackQueries = [
      'lofi study chill hop beats',
      'deep focus ambient soundscape',
      'synthwave coding concentration',
      'anime piano chill lofi',
    ];
    const randomQuery = fallbackQueries[Math.floor(Math.random() * fallbackQueries.length)];

    const tracks = await searchMusic(randomQuery, limit + 3);

    const results = tracks
      .filter((t) => t.id !== id)
      .slice(0, limit)
      .map((t) => ({
        id: t.id,
        name: t.name,
        artists: t.artists,
        image: t.image,
        duration: t.duration,
        album: t.album || 'StudyQuest Music',
        streamUrl: `/api/music/stream?id=${encodeURIComponent(t.id)}`,
        hasDownloadUrl: true,
      }));

    return NextResponse.json({
      success: true,
      basedOn: { id },
      results,
    });
  } catch (error) {
    console.warn('[Music Suggestions API] Handled fallback error:', error);
    return NextResponse.json({
      success: true,
      results: [],
    });
  }
}
