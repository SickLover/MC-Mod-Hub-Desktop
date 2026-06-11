import { NextResponse } from 'next/server';
import { FALLBACK_VERSIONS } from '@/lib/game-versions';

const MR_API = 'https://api.modrinth.com/v2';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${MR_API}/tag/game_version`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json({ success: true, data: FALLBACK_VERSIONS });
    }

    const data = await res.json();
    const versions: string[] = (data || [])
      .filter((v: { version_type: string }) => v.version_type === 'release')
      .map((v: { version: string }) => v.version);

    if (versions.length === 0) {
      return NextResponse.json({ success: true, data: FALLBACK_VERSIONS });
    }

    return NextResponse.json({ success: true, data: versions });
  } catch (err) {
    console.error('获取游戏版本失败:', err);
    return NextResponse.json({ success: true, data: FALLBACK_VERSIONS });
  }
}
