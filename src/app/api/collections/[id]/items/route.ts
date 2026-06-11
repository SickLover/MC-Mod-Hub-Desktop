import { NextRequest, NextResponse } from 'next/server';
import { execAndSave, queryOne } from '@/lib/db';
import type { Collection, CollectionItem } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  const collection = await queryOne<Collection>(
    'SELECT id FROM collections WHERE id = ?',
    [id],
  );

  if (!collection) {
    return NextResponse.json(
      { success: false, error: '收藏夹不存在' },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { resourceType, resourceId, resourceName, source, iconUrl } = body;

  if (!resourceType || !resourceId || !resourceName || !source) {
    return NextResponse.json(
      { success: false, error: '缺少必填字段：resourceType, resourceId, resourceName, source' },
      { status: 400 },
    );
  }

  // 检查重复
  const existing = await queryOne<CollectionItem>(
    'SELECT id FROM collection_items WHERE collection_id = ? AND resource_id = ? AND source = ?',
    [id, resourceId, source],
  );

  if (existing) {
    return NextResponse.json(
      { success: false, error: '该资源已在收藏夹中' },
      { status: 409 },
    );
  }

  const itemId = crypto.randomUUID();

  await execAndSave(
    `INSERT INTO collection_items (id, collection_id, resource_type, resource_id, resource_name, source, icon_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [itemId, id, resourceType, resourceId, resourceName, source, iconUrl || null],
  );

  const item = await queryOne<CollectionItem>(
    `SELECT id, collection_id as collectionId, resource_type as resourceType, resource_id as resourceId,
            resource_name as resourceName, source, icon_url as iconUrl,
            selected_file_id as selectedFileId, selected_file_name as selectedFileName,
            selected_game_version as selectedGameVersion, added_at as addedAt
     FROM collection_items WHERE id = ?`,
    [itemId],
  );

  // 更新收藏夹时间戳
  await execAndSave("UPDATE collections SET updated_at = datetime('now') WHERE id = ?", [id]);

  return NextResponse.json({ success: true, data: item }, { status: 201 });
}
