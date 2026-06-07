/**
 * /api/music/search — Proxy for JioSaavn song search
 *
 * Query params:
 *   - query: search term (required)
 *   - limit: number of results (default 20)
 */

import { NextRequest, NextResponse } from 'next/server';

const SAAVN_BASE = process.env.JIOSAAVN_API_URL || 'https://saavn.dev/api';

interface SaavnImage {
  quality: string;
  url: string;
}

interface SaavnDownloadUrl {
  quality: string;
  url: string;
}

interface SaavnSong {
  id: string;
  name: string;
  duration: number;
  language: string;
  year: string;
  playCount: number;
  image: SaavnImage[];
  downloadUrl: SaavnDownloadUrl[];
  artists?: {
    primary?: { name: string }[];
    featured?: { name: string }[];
    all?: { name: string }[];
  };
  primaryArtists?: string;
  album?: {
    id: string;
    name: string;
    url: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const limit = searchParams.get('limit') || '20';

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const url = `${SAAVN_BASE}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 5 minutes to reduce API calls
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `JioSaavn API returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!data?.data?.results) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Transform to our clean format
    const results = data.data.results.map((song: SaavnSong) => {
      // Get the best quality image (last entry is usually highest)
      const image = song.image && song.image.length > 0
        ? song.image[song.image.length - 1].url
        : '';

      // Get artist names
      let artists = '';
      if (song.artists?.primary && song.artists.primary.length > 0) {
        artists = song.artists.primary.map((a: { name: string }) => a.name).join(', ');
      } else if (song.primaryArtists) {
        artists = song.primaryArtists;
      }

      return {
        id: song.id,
        name: song.name,
        artists,
        image,
        duration: song.duration || 0,
        album: song.album?.name || '',
        year: song.year || '',
        language: song.language || '',
        playCount: song.playCount || 0,
        hasDownloadUrl: !!(song.downloadUrl && song.downloadUrl.length > 0),
      };
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[Music Search API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search songs' },
      { status: 500 }
    );
  }
}
