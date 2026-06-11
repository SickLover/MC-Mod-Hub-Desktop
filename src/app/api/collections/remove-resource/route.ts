import { NextRequest, NextResponse } from 'next/server';
import { execAndSave } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { collectionId, resourceId, source } = body;

  if (!collectionId || !resourceId || !source) {
    return NextResponse.json(
      { success: false, error: '缺少必填字段：collectionId, resourceId, source' },
      { status: 400 },
    );
  }

  await execAndSave(
    'DELETE FROM collection_items WHERE collection_id = ? AND resource_id = ? AND source = ?',
    [collectionId, resourceId, source],
  );

  return NextResponse.json({ success: true, data: null });
}
