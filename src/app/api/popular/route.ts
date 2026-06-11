// ============================================================
// GET /api/popular — 热门内容 API
// 合并 CurseForge + Modrinth 两平台数据
// ============================================================

import { NextResponse } from 'next/server';
import type { ApiResponse, ResourceItem, ResourceType } from '@/types';
import { fetchPopular as cfFetchPopular } from '@/lib/curseforge';
import { fetchPopular as mrFetchPopular } from '@/lib/modrinth';
import { mergeResults } from '@/lib/merger';
import { getDb } from '@/lib/db';

// 确保数据库在首次请求时初始化
getDb();

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<ApiResponse<Record<string, ResourceItem[]>>>> {
  try {
    const [cfMods, cfShaders, cfPacks, mrMods, mrShaders, mrPacks] = await Promise.all([
      cfFetchPopular('mod', 10),
      cfFetchPopular('shader', 10),
      cfFetchPopular('resourcepack', 10),
      mrFetchPopular('mod', 10),
      mrFetchPopular('shader', 10),
      mrFetchPopular('resourcepack', 10),
    ]);

    const data = {
      mod: mergeResults(cfMods, mrMods, 'mod'),
      shader: mergeResults(cfShaders, mrShaders, 'shader'),
      resourcepack: mergeResults(cfPacks, mrPacks, 'resourcepack'),
    };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('/api/popular error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch popular resources' },
      { status: 500 }
    );
  }
}
