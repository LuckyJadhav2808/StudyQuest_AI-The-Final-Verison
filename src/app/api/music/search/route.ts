/**
 * /api/music/search — Universal Multi-Provider Search
 *
 * Queries YouTube Music, Piped, and JioSaavn with automatic fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchMusic } from '@/lib/musicEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const tracks = await searchMusic(query.trim(), limit);

    const results = tracks.map((track) => ({
      id: track.id,
      name: track.name,
      artists: track.artists,
      image: track.image,
      duration: track.duration,
      album: track.album || '',
      year: track.year || '',
      source: track.source,
      streamUrl: `/api/music/stream?id=${encodeURIComponent(track.id)}`,
      hasDownloadUrl: true,
    }));

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('[Music Search API] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to search songs' },
      { status: 500 }
    );
  }
}
