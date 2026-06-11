import { NextRequest, NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface FavoritedRow {
  source: string;
  resource_id: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  const resourceIdsStr = searchParams.get('resourceIds');

  if (!source || !resourceIdsStr) {
    // 无参数时返回所有已收藏资源 ID
    const rows = await queryAll<FavoritedRow>(
      'SELECT DISTINCT source, resource_id FROM collection_items',
    );
    const ids = rows.map((r) => `${r.source}:${r.resource_id}`);
    return NextResponse.json({ success: true, data: ids });
  }

  const resourceIds = resourceIdsStr.split(',').map((s) => s.trim()).filter(Boolean);

  if (resourceIds.length === 0) {
    return NextResponse.json({ success: true, data: {} });
  }

  // 查询哪些 resourceId 已在任意收藏夹中（指定 source）
  const placeholders = resourceIds.map(() => '?').join(',');
  const rows = await queryAll<FavoritedRow>(
    `SELECT DISTINCT resource_id FROM collection_items WHERE source = ? AND resource_id IN (${placeholders})`,
    [source, ...resourceIds],
  );

  const favoritedMap: Record<string, boolean> = {};
  for (const id of resourceIds) {
    favoritedMap[id] = false;
  }
  for (const row of rows) {
    favoritedMap[row.resource_id] = true;
  }

  return NextResponse.json({ success: true, data: favoritedMap });
}
