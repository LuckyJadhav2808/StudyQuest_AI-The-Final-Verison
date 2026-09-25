/**
 * /api/music/trending — Curated Study Playlists & Trending Explore Categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { CURATED_CATEGORIES, searchMusic } from '@/lib/musicEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('category');

    if (categoryId) {
      const category = CURATED_CATEGORIES.find((c) => c.id === categoryId);
      if (!category) {
        return NextResponse.json(
          { success: false, error: 'Category not found' },
          { status: 404 }
        );
      }
      const tracks = await searchMusic(category.query, 15);
      return NextResponse.json({
        success: true,
        category,
        results: tracks.map((t) => ({
          ...t,
          streamUrl: `/api/music/stream?id=${encodeURIComponent(t.id)}`,
          hasDownloadUrl: true,
        })),
      });
    }

    // Return all categories
    return NextResponse.json({
      success: true,
      categories: CURATED_CATEGORIES,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch trending music' },
      { status: 500 }
    );
  }
}
