/**
 * musicEngine.ts — BitChord & Nuclear inspired Multi-Provider Music Engine
 * 
 * Provides unified search, metadata resolution, stream URL extraction,
 * and curated study/focus presets across YouTube Music, Piped, and JioSaavn.
 */

export interface UnifiedTrack {
  id: string;
  name: string;
  artists: string;
  album: string;
  image: string;
  duration: number; // in seconds
  source: 'youtube' | 'saavn';
  streamUrl?: string;
  year?: string;
}

export interface CuratedCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  query: string;
  color: string;
}

export const CURATED_CATEGORIES: CuratedCategory[] = [
  {
    id: 'lofi-beats',
    title: 'Lofi Study Beats',
    subtitle: 'Chilled beats to relax & study to',
    icon: '☕',
    query: 'lofi study beats chill hop',
    color: 'from-amber-500/20 to-orange-500/10',
  },
  {
    id: 'deep-focus',
    title: 'Deep Focus Ambient',
    subtitle: 'Binaural beats, ambient soundscapes',
    icon: '🧠',
    query: 'deep focus binaural study soundscape',
    color: 'from-indigo-500/20 to-purple-500/10',
  },
  {
    id: 'coding-synth',
    title: 'Synthwave & Coding Flow',
    subtitle: 'Retrowave & darksynth for programmers',
    icon: '⚡',
    query: 'synthwave cyberpunk coding music',
    color: 'from-cyan-500/20 to-blue-500/10',
  },
  {
    id: 'classical-mind',
    title: 'Classical Focus',
    subtitle: 'Bach, Mozart & Chopin for concentration',
    icon: '🎻',
    query: 'classical piano cello study concentration',
    color: 'from-emerald-500/20 to-teal-500/10',
  },
  {
    id: 'anime-lofi',
    title: 'Anime Piano & Lofi',
    subtitle: 'Ghibli & anime acoustic melodies',
    icon: '🌸',
    query: 'ghibli anime lofi piano acoustic',
    color: 'from-pink-500/20 to-rose-500/10',
  },
  {
    id: 'top-hits',
    title: 'Global Top Hits',
    subtitle: 'Trending songs around the world',
    icon: '🔥',
    query: 'top hits popular songs 2025',
    color: 'from-violet-500/20 to-fuchsia-500/10',
  },
];

// Resilient public Piped & Invidious instances
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.private.coffee',
  'https://piped-api.lunar.icu',
  'https://pipedapi.leptons.xyz',
];

const SAAVN_BASE = process.env.JIOSAAVN_API_URL || 'https://saavn.dev/api';

/** Helper to fetch with timeout */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/** Helper to parse duration string like "3:45" or "1:02:30" into seconds */
function parseDurationString(str: string): number {
  if (!str) return 0;
  const match = str.match(/(?:(\d+):)?(\d+):(\d+)/);
  if (!match) return 0;
  if (match[1]) {
    // HH:MM:SS
    return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
  }
  // MM:SS
  return parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
}

/**
 * Search YouTube via direct YouTube Music Innertube with Piped fallback
 */
async function searchYouTube(query: string, limit = 15): Promise<UnifiedTrack[]> {
  // 1. Direct YouTube Music Innertube search (Fast, reliable, zero third-party dependency)
  try {
    const innertubeRes = await fetchWithTimeout(
      'https://music.youtube.com/youtubei/v1/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'X-YouTube-Client-Name': '67',
          'X-YouTube-Client-Version': '1.20240101.01.00',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB_REMIX',
              clientVersion: '1.20240101.01.00',
              hl: 'en',
              gl: 'US',
            },
          },
          query,
          params: 'Eg-KAQwIARAAGAAgACgAMABqChAEEAMQCRAFEAo%3D',
        }),
      },
      4500
    );

    if (innertubeRes.ok) {
      const data = await innertubeRes.json();
      const sections = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      const tracks: UnifiedTrack[] = [];

      for (const section of sections) {
        const shelf = section?.musicShelfRenderer;
        if (!shelf?.contents) continue;

        for (const item of shelf.contents) {
          const flex = item?.musicResponsiveListItemRenderer;
          if (!flex) continue;

          const videoId = flex?.playlistItemData?.videoId || flex?.navigationEndpoint?.watchEndpoint?.videoId;
          if (!videoId) continue;

          const col0 = flex?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer;
          const titleRuns = col0?.text?.runs || col0?.title?.runs || [];
          const name = titleRuns.map((r: any) => r.text).join('') || 'Unknown Track';

          const col1 = flex?.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer;
          const subtitleRuns = col1?.text?.runs || col1?.title?.runs || [];
          const subtitle = subtitleRuns.map((r: any) => r.text).join('') || '';

          // The first subtitle segment is typically the artist, last segment is often duration
          const artistPart = subtitle.split('•')[0]?.trim() || 'Various Artists';
          const durationPart = parseDurationString(subtitle);

          const thumbnails = flex?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const image = thumbnails[thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

          tracks.push({
            id: `yt_${videoId}`,
            name,
            artists: artistPart,
            album: 'YouTube Music',
            image,
            duration: durationPart,
            source: 'youtube',
          });

          if (tracks.length >= limit) break;
        }
        if (tracks.length >= limit) break;
      }

      if (tracks.length > 0) return tracks;
    }
  } catch {
    // Fall back to Piped instances if needed
  }

  // 2. Piped fallback search
  for (const instance of PIPED_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
      const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 4000);
      if (!res.ok) continue;

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      if (items.length > 0) {
        return items
          .filter((item: any) => item.type === 'stream' || !item.type)
          .slice(0, limit)
          .map((item: any) => {
            const rawId = item.url ? item.url.replace('/watch?v=', '') : item.id;
            return {
              id: `yt_${rawId}`,
              name: item.title || 'Unknown Track',
              artists: item.uploaderName || 'Various Artists',
              album: 'YouTube Music',
              image: item.thumbnail || `https://i.ytimg.com/vi/${rawId}/hqdefault.jpg`,
              duration: typeof item.duration === 'number' ? item.duration : 0,
              source: 'youtube',
            };
          });
      }
    } catch {
      continue;
    }
  }

  return [];
}

/**
 * Search JioSaavn
 */
async function searchSaavn(query: string, limit = 15): Promise<UnifiedTrack[]> {
  try {
    const url = `${SAAVN_BASE}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 4500);
    if (!res.ok) return [];

    const data = await res.json();
    const songs = Array.isArray(data?.data?.results)
      ? data.data.results
      : Array.isArray(data?.data)
      ? data.data
      : [];

    return songs.map((s: any) => {
      // Pick best image
      let image = '';
      if (Array.isArray(s.image) && s.image.length > 0) {
        image = s.image[s.image.length - 1]?.url || s.image[0]?.url || '';
      }

      // Pick artists
      let artists = s.primaryArtists || '';
      if (!artists && s.artists?.primary) {
        artists = s.artists.primary.map((a: any) => a.name).join(', ');
      }
      if (!artists) artists = 'Unknown Artist';

      // Pick direct download URL if available
      let directUrl = '';
      if (Array.isArray(s.downloadUrl) && s.downloadUrl.length > 0) {
        directUrl = s.downloadUrl[s.downloadUrl.length - 1]?.url || s.downloadUrl[0]?.url || '';
      }

      return {
        id: `saavn_${s.id}`,
        name: s.name?.replace(/&quot;/g, '"')?.replace(/&#039;/g, "'") || 'Unknown Track',
        artists: artists.replace(/&quot;/g, '"')?.replace(/&#039;/g, "'"),
        album: s.album?.name || 'Single',
        image,
        duration: parseInt(s.duration, 10) || 0,
        source: 'saavn',
        streamUrl: directUrl,
        year: s.year,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Resolve direct audio stream for a track
 */
export async function resolveStreamUrl(trackId: string): Promise<{ streamUrl: string; mimeType: string } | null> {
  if (trackId.startsWith('saavn_')) {
    const saavnId = trackId.replace('saavn_', '');
    try {
      const res = await fetchWithTimeout(`${SAAVN_BASE}/songs/${encodeURIComponent(saavnId)}`, {}, 4500);
      if (res.ok) {
        const data = await res.json();
        const song = Array.isArray(data?.data) ? data.data[0] : data?.data;
        if (song?.downloadUrl && Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) {
          // Choose highest quality (320kbps or 160kbps)
          const best = song.downloadUrl[song.downloadUrl.length - 1]?.url || song.downloadUrl[0]?.url;
          return { streamUrl: best, mimeType: 'audio/mp4' };
        }
      }
    } catch (err) {
      console.warn('[musicEngine] Saavn song resolve error:', err);
    }
  }

  // Handle YouTube stream resolution
  const ytVideoId = trackId.startsWith('yt_') ? trackId.replace('yt_', '') : trackId;

  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetchWithTimeout(`${instance}/streams/${encodeURIComponent(ytVideoId)}`, {}, 4000);
      if (!res.ok) continue;

      const data = await res.json();
      const audioStreams = Array.isArray(data?.audioStreams) ? data.audioStreams : [];

      if (audioStreams.length > 0) {
        // Sort by bitrate descending to get best quality (e.g. 160k Opus or 128k AAC)
        const sorted = [...audioStreams].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const best = sorted[0];
        return {
          streamUrl: best.url,
          mimeType: best.mimeType || 'audio/webm; codecs="opus"',
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Universal Multi-Provider Search
 */
export async function searchMusic(query: string, limit = 20): Promise<UnifiedTrack[]> {
  if (!query || query.trim().length === 0) return [];

  // Concurrently query YouTube and Saavn
  const [ytResults, saavnResults] = await Promise.all([
    searchYouTube(query, limit).catch(() => [] as UnifiedTrack[]),
    searchSaavn(query, limit).catch(() => [] as UnifiedTrack[]),
  ]);

  // Interleave results with priority on high-quality matches
  const seenIds = new Set<string>();
  const combined: UnifiedTrack[] = [];

  const maxLen = Math.max(ytResults.length, saavnResults.length);
  for (let i = 0; i < maxLen; i++) {
    if (ytResults[i] && !seenIds.has(ytResults[i].id)) {
      seenIds.add(ytResults[i].id);
      combined.push(ytResults[i]);
    }
    if (saavnResults[i] && !seenIds.has(saavnResults[i].id)) {
      seenIds.add(saavnResults[i].id);
      combined.push(saavnResults[i]);
    }
    if (combined.length >= limit) break;
  }

  return combined;
}
