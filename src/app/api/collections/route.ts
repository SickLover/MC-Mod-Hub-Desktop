import { NextRequest, NextResponse } from 'next/server';
import { execAndSave, queryAll } from '@/lib/db';
import type { Collection } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collections = await queryAll<Collection>(
    'SELECT id, name, game_version as gameVersion, release_type as releaseType, created_at as createdAt, updated_at as updatedAt FROM collections ORDER BY updated_at DESC',
  );
  return NextResponse.json({ success: true, data: collections });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, gameVersion, releaseType } = body;

  if (!name || !gameVersion) {
    return NextResponse.json(
      { success: false, error: '缺少必填字段：name, gameVersion' },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();

  await execAndSave(
    'INSERT INTO collections (id, name, game_version, release_type) VALUES (?, ?, ?, ?)',
    [id, name, gameVersion, releaseType || 'release'],
  );

  const rows = await queryAll<Collection>(
    'SELECT id, name, game_version as gameVersion, release_type as releaseType, created_at as createdAt, updated_at as updatedAt FROM collections WHERE id = ?',
    [id],
  );

  return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
}
