// ============================================================
// GET /api/search — 搜索 API
// 同时搜索 CurseForge + Modrinth，合并去重后返回
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { searchMods } from '@/lib/curseforge';
import { searchProjects } from '@/lib/modrinth';
import { mergeResults } from '@/lib/merger';
import type { ApiResponse, ResourceItem } from '@/types';

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ResourceItem[]>>> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || !query.trim()) {
    return NextResponse.json(
      { success: false, error: 'Missing search query: ?q=xxx' },
      { status: 400 },
    );
  }

  try {
    const [cfResults, mrResults] = await Promise.all([
      searchMods(query.trim(), 16),
      searchProjects(query.trim(), 16),
    ]);

    const merged = mergeResults(cfResults, mrResults);

    return NextResponse.json({ success: true, data: merged });
  } catch (err) {
    console.error('/api/search error:', err);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 },
    );
  }
}
