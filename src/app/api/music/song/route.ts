/**
 * /api/music/song — Song details and stream URL resolver
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveStreamUrl } from '@/lib/musicEngine';

const SAAVN_BASE = process.env.JIOSAAVN_API_URL || 'https://saavn.dev/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Song ID parameter is required' },
        { status: 400 }
      );
    }

    // Default stream URL points to our HTTP 206 range proxy
    const proxyStreamUrl = `/api/music/stream?id=${encodeURIComponent(id)}`;

    // If it's a Saavn track, get rich metadata
    if (id.startsWith('saavn_') || !id.startsWith('yt_')) {
      const cleanId = id.replace('saavn_', '');
      try {
        const response = await fetch(`${SAAVN_BASE}/songs/${encodeURIComponent(cleanId)}`, {
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          const song = Array.isArray(data?.data) ? data.data[0] : data?.data;

          if (song) {
            let image = '';
            if (song.image && song.image.length > 0) {
              image = song.image[song.image.length - 1].url;
            }

            let artists = '';
            if (song.artists?.primary && song.artists.primary.length > 0) {
              artists = song.artists.primary.map((a: { name: string }) => a.name).join(', ');
            } else if (song.primaryArtists) {
              artists = song.primaryArtists;
            }

            return NextResponse.json({
              success: true,
              song: {
                id,
                name: song.name,
                artists,
                image,
                duration: song.duration || 0,
                album: song.album?.name || '',
                year: song.year || '',
                streamUrl: proxyStreamUrl,
              },
            });
          }
        }
      } catch (err) {
        console.warn('[Music Song API] Saavn fetch failed, falling back:', err);
      }
    }

    // For YouTube / generic tracks, return the proxy stream URL
    return NextResponse.json({
      success: true,
      song: {
        id,
        streamUrl: proxyStreamUrl,
      },
    });
  } catch (error: any) {
    console.error('[Music Song API] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch song' },
      { status: 500 }
    );
  }
}
