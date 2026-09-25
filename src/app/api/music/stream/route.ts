/**
 * /api/music/stream — Chunked Audio Streaming Proxy
 * 
 * Streams audio bytes with HTTP 206 Partial Content (Range requests)
 * Bypasses browser CORS restrictions, CDN token expiry, and IP locks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveStreamUrl } from '@/lib/musicEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const directUrl = searchParams.get('url');

    let streamUrl = directUrl;
    let mimeType = 'audio/mp4';

    if (!streamUrl && id) {
      const resolved = await resolveStreamUrl(id);
      if (resolved) {
        streamUrl = resolved.streamUrl;
        mimeType = resolved.mimeType;
      }
    }

    if (!streamUrl) {
      return NextResponse.json(
        { success: false, error: 'Could not resolve audio stream for track' },
        { status: 404 }
      );
    }

    const rangeHeader = request.headers.get('range');
    const upstreamHeaders: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
    };

    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const upstreamRes = await fetch(streamUrl, {
      headers: upstreamHeaders,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return NextResponse.json(
        { success: false, error: 'Upstream stream request failed', status: upstreamRes.status },
        { status: 502 }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || mimeType);
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=7200, immutable');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[StreamProxy Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Streaming proxy failed' },
      { status: 500 }
    );
  }
}
