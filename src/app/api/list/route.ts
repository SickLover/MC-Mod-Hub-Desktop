// ============================================================
// GET /api/list — 按类型浏览资源列表
// 合并 CurseForge + Modrinth 的热门数据，支持分页
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { fetchPopularList as cfPopularList } from '@/lib/curseforge';
import { fetchPopularList as mrPopularList } from '@/lib/modrinth';
import { mergeResults } from '@/lib/merger';
import type { ApiResponse, ResourceItem, ResourceType } from '@/types';

const VALID_TYPES: ResourceType[] = ['mod', 'shader', 'resourcepack'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as ResourceType | null;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(60, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { success: false, error: 'Invalid type. Use: mod, shader, or resourcepack' },
      { status: 400 },
    );
  }

  try {
    // Fetch more to allow proper merging and pagination
    const fetchSize = limit * 5;

    const [cfResults, mrResults] = await Promise.all([
      cfPopularList(type, fetchSize, 0),
      mrPopularList(type, fetchSize, 0),
    ]);

    const merged = mergeResults(cfResults, mrResults, type);
    const total = merged.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const items = merged.slice(start, start + limit);

    return NextResponse.json<ApiResponse<ResourceItem[]> & { total: number; page: number; totalPages: number }>({
      success: true,
      data: items,
      total,
      page: safePage,
      totalPages,
    });
  } catch (err) {
    console.error('/api/list error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch resource list' },
      { status: 500 },
    );
  }
}