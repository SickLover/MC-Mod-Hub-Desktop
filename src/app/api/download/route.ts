import { NextRequest, NextResponse } from 'next/server';
import { getModFileDownloadUrl } from '@/lib/curseforge';
import { getVersionDetail } from '@/lib/modrinth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  const fileId = searchParams.get('fileId');
  const fileName = searchParams.get('fileName') || 'download.jar';
  const modId = searchParams.get('modId');

  if (!source || !fileId) {
    return NextResponse.json(
      { success: false, error: 'Missing required params: source, fileId' },
      { status: 400 },
    );
  }

  try {
    let downloadUrl: string | null = null;

    if (source === 'curseforge') {
      if (!modId) {
        return NextResponse.json(
          { success: false, error: 'Missing modId for CurseForge download' },
          { status: 400 },
        );
      }
      downloadUrl = await getModFileDownloadUrl(modId, fileId);
    } else if (source === 'modrinth') {
      const version = await getVersionDetail(fileId);
      downloadUrl = version?.files?.[0]?.url || null;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid source' },
        { status: 400 },
      );
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { success: false, error: 'Download URL not found' },
        { status: 404 },
      );
    }

    const remoteRes = await fetch(downloadUrl);
    if (!remoteRes.ok || !remoteRes.body) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch file from source' },
        { status: 502 },
      );
    }

    const headers = new Headers();
    headers.set(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );
    headers.set(
      'Content-Type',
      remoteRes.headers.get('content-type') || 'application/octet-stream',
    );
    const contentLength = remoteRes.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(remoteRes.body, {
      status: 200,
      statusText: 'OK',
      headers,
    });
  } catch (err) {
    console.error('Download proxy error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
