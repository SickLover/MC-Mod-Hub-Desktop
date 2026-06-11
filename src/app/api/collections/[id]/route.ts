import { NextRequest, NextResponse } from 'next/server';
import { execAndSave, queryOne, queryAll } from '@/lib/db';
import type { Collection, CollectionItem } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  const collection = await queryOne<Collection>(
    `SELECT id, name, game_version as gameVersion, release_type as releaseType,
            created_at as createdAt, updated_at as updatedAt
     FROM collections WHERE id = ?`,
    [id],
  );

  if (!collection) {
    return NextResponse.json(
      { success: false, error: '收藏夹不存在' },
      { status: 404 },
    );
  }

  const items = await queryAll<CollectionItem>(
    `SELECT id, collection_id as collectionId, resource_type as resourceType,
            resource_id as resourceId, resource_name as resourceName, source,
            icon_url as iconUrl, selected_file_id as selectedFileId,
            selected_file_name as selectedFileName, selected_game_version as selectedGameVersion,
            added_at as addedAt
     FROM collection_items WHERE collection_id = ?
     ORDER BY added_at DESC`,
    [id],
  );

  return NextResponse.json({ success: true, data: { ...collection, items } });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const body = await request.json();
  const { name, gameVersion } = body;

  const existing = await queryOne<Collection>(
    'SELECT id FROM collections WHERE id = ?',
    [id],
  );

  if (!existing) {
    return NextResponse.json(
      { success: false, error: '收藏夹不存在' },
      { status: 404 },
    );
  }

  if (name !== undefined) {
    await execAndSave("UPDATE collections SET name = ?, updated_at = datetime('now') WHERE id = ?", [name, id]);
  }

  if (gameVersion !== undefined) {
    // 更新游戏版本，同时清除所有 item 的版本选择（旧选择可能不再兼容）
    await execAndSave(
      "UPDATE collections SET game_version = ?, updated_at = datetime('now') WHERE id = ?",
      [gameVersion, id],
    );
    await execAndSave(
      "UPDATE collection_items SET selected_file_id = NULL, selected_file_name = NULL, selected_game_version = NULL WHERE collection_id = ?",
      [id],
    );
  }

  const updated = await queryOne<Collection>(
    'SELECT id, name, game_version as gameVersion, release_type as releaseType, created_at as createdAt, updated_at as updatedAt FROM collections WHERE id = ?',
    [id],
  );

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  const existing = await queryOne<Collection>(
    'SELECT id FROM collections WHERE id = ?',
    [id],
  );

  if (!existing) {
    return NextResponse.json(
      { success: false, error: '收藏夹不存在' },
      { status: 404 },
    );
  }

  await execAndSave('DELETE FROM collection_items WHERE collection_id = ?', [id]);
  await execAndSave('DELETE FROM collections WHERE id = ?', [id]);

  return NextResponse.json({ success: true, data: null });
}
