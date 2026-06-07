/**
 * /api/music/song — Proxy for JioSaavn song details + stream URL
 *
 * Query params:
 *   - id: JioSaavn song ID (required)
 */

import { NextRequest, NextResponse } from 'next/server';

const SAAVN_BASE = process.env.JIOSAAVN_API_URL || 'https://saavn.dev/api';

interface SaavnDownloadUrl {
  quality: string;
  url: string;
}

interface SaavnImage {
  quality: string;
  url: string;
}

interface SaavnSongDetail {
  id: string;
  name: string;
  duration: number;
  language: string;
  year: string;
  image: SaavnImage[];
  downloadUrl: SaavnDownloadUrl[];
  artists?: {
    primary?: { name: string }[];
  };
  primaryArtists?: string;
  album?: {
    id: string;
    name: string;
  };
}

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

    const url = `${SAAVN_BASE}/songs/${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }, // Cache song details for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `JioSaavn API returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!data?.data || (Array.isArray(data.data) && data.data.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Song not found' },
        { status: 404 }
      );
    }

    // data.data can be an array or a single object depending on the endpoint
    const song: SaavnSongDetail = Array.isArray(data.data) ? data.data[0] : data.data;

    // Get the best quality download URL (prefer 320kbps, fallback to 160kbps, then any)
    let streamUrl = '';
    if (song.downloadUrl && song.downloadUrl.length > 0) {
      const q320 = song.downloadUrl.find((d: SaavnDownloadUrl) => d.quality === '320kbps');
      const q160 = song.downloadUrl.find((d: SaavnDownloadUrl) => d.quality === '160kbps');
      streamUrl = q320?.url || q160?.url || song.downloadUrl[song.downloadUrl.length - 1].url;
    }

    // Get image
    const image = song.image && song.image.length > 0
      ? song.image[song.image.length - 1].url
      : '';

    // Get artists
    let artists = '';
    if (song.artists?.primary && song.artists.primary.length > 0) {
      artists = song.artists.primary.map((a: { name: string }) => a.name).join(', ');
    } else if (song.primaryArtists) {
      artists = song.primaryArtists;
    }

    return NextResponse.json({
      success: true,
      song: {
        id: song.id,
        name: song.name,
        artists,
        image,
        duration: song.duration || 0,
        album: song.album?.name || '',
        year: song.year || '',
        language: song.language || '',
        streamUrl,
      },
    });
  } catch (error) {
    console.error('[Music Song API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch song details' },
      { status: 500 }
    );
  }
}
