import { NextRequest, NextResponse } from 'next/server';
import { execAndSave, queryAll, queryOne } from '@/lib/db';
import { RecentlyViewed } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await queryAll<RecentlyViewed>(
    `SELECT id, resource_type as resourceType, resource_id as resourceId,
            resource_name as resourceName, source, icon_url as iconUrl, viewed_at as viewedAt
     FROM recently_viewed ORDER BY viewed_at DESC LIMIT 20`,
  );
  return NextResponse.json({ success: true, data: items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { resourceType, resourceId, resourceName, source, iconUrl } = body;

  if (!resourceType || !resourceId || !resourceName || !source) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 },
    );
  }

  // Upsert: update existing record or insert new one
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM recently_viewed WHERE resource_id = ? AND source = ?',
    [resourceId, source],
  );

  if (existing) {
    await execAndSave(
      `UPDATE recently_viewed SET viewed_at = datetime('now'), resource_name = ?, icon_url = ?, resource_type = ? WHERE id = ?`,
      [resourceName, iconUrl || null, resourceType, existing.id],
    );
  } else {
    const id = crypto.randomUUID();
    await execAndSave(
      'INSERT INTO recently_viewed (id, resource_type, resource_id, resource_name, source, icon_url) VALUES (?, ?, ?, ?, ?, ?)',
      [id, resourceType, resourceId, resourceName, source, iconUrl || null],
    );
  }

  return NextResponse.json({ success: true, data: null });
}
