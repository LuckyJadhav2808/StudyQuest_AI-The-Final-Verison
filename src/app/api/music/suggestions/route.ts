/**
 * /api/music/suggestions — Get song suggestions based on a song ID
 *
 * Query params:
 *   - id: JioSaavn song ID (required) — fetches suggestions for this song
 *   - limit: number of results (default 10)
 */

import { NextRequest, NextResponse } from 'next/server';

const SAAVN_BASE = process.env.JIOSAAVN_API_URL || 'https://saavn.dev/api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Song ID is required' },
        { status: 400 }
      );
    }

    // Strategy: fetch the song details first for artist/language, then search for similar
    const songRes = await fetch(`${SAAVN_BASE}/songs/${encodeURIComponent(id)}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!songRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch song details' },
        { status: 502 }
      );
    }

    const songData = await songRes.json();
    const song = Array.isArray(songData?.data) ? songData.data[0] : songData?.data;

    if (!song) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Get the primary artist name for searching similar songs
    let artistQuery = '';
    if (song.artists?.primary && song.artists.primary.length > 0) {
      artistQuery = song.artists.primary[0].name;
    } else if (song.primaryArtists) {
      artistQuery = song.primaryArtists.split(',')[0].trim();
    }

    // Also try album-based suggestions
    const albumName = song.album?.name || '';

    // Search for songs by the same artist
    const searchQuery = artistQuery || albumName || song.name;
    const searchRes = await fetch(
      `${SAAVN_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}&limit=${limit + 5}`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 600 },
      }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ success: true, results: [] });
    }

    const searchData = await searchRes.json();
    const rawResults = searchData?.data?.results || [];

    // Filter out the original song and transform
    const results = rawResults
      .filter((s: { id: string }) => s.id !== id)
      .slice(0, limit)
      .map((s: {
        id: string;
        name: string;
        duration: number;
        image: { quality: string; url: string }[];
        downloadUrl: { quality: string; url: string }[];
        artists?: { primary?: { name: string }[] };
        primaryArtists?: string;
        album?: { name: string };
      }) => {
        const image = s.image && s.image.length > 0
          ? s.image[s.image.length - 1].url
          : '';

        let artists = '';
        if (s.artists?.primary && s.artists.primary.length > 0) {
          artists = s.artists.primary.map((a: { name: string }) => a.name).join(', ');
        } else if (s.primaryArtists) {
          artists = s.primaryArtists;
        }

        return {
          id: s.id,
          name: s.name,
          artists,
          image,
          duration: s.duration || 0,
          album: s.album?.name || '',
          hasDownloadUrl: !!(s.downloadUrl && s.downloadUrl.length > 0),
        };
      });

    return NextResponse.json({
      success: true,
      basedOn: { artist: artistQuery, album: albumName },
      results,
    });
  } catch (error) {
    console.error('[Music Suggestions API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
