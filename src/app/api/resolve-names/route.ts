import { NextRequest, NextResponse } from 'next/server';
import { getModsBatch } from '@/lib/curseforge';
import { getProjectsBatch } from '@/lib/modrinth';

export const dynamic = 'force-dynamic';

interface ResolveId {
  source: string;
  id: string;
}

// GET: used by CompatibilityCheck for lazy name resolution
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  const idsStr = searchParams.get('ids');

  if (!source || !idsStr) {
    return NextResponse.json(
      { success: false, error: 'Missing source or ids' },
      { status: 400 },
    );
  }

  const ids = idsStr.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ success: true, data: {} });
  }

  const result: Record<string, string> = {};

  try {
    if (source === 'curseforge') {
      const cfNames = await getModsBatch(ids);
      for (const [id, name] of Object.entries(cfNames)) {
        result[id] = name;
      }
    } else if (source === 'modrinth') {
      const mrNames = await getProjectsBatch(ids);
      for (const [id, name] of Object.entries(mrNames)) {
        result[id] = name;
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('Resolve names failed:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve names' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ids: ResolveId[] = body?.ids;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid ids array' },
      { status: 400 },
    );
  }

  // Separate by source
  const curseforgeIds: string[] = [];
  const modrinthIds: string[] = [];

  for (const item of ids) {
    if (item.source === 'curseforge') {
      curseforgeIds.push(item.id);
    } else if (item.source === 'modrinth') {
      modrinthIds.push(item.id);
    }
  }

  const result: Record<string, string> = {};

  try {
    // Batch CurseForge
    if (curseforgeIds.length > 0) {
      const cfNames = await getModsBatch(curseforgeIds);
      for (const [id, name] of Object.entries(cfNames)) {
        result[`curseforge:${id}`] = name;
      }
    }

    // Batch Modrinth
    if (modrinthIds.length > 0) {
      const mrNames = await getProjectsBatch(modrinthIds);
      for (const [id, name] of Object.entries(mrNames)) {
        result[`modrinth:${id}`] = name;
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('Resolve names failed:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve names' },
      { status: 500 },
    );
  }
}
