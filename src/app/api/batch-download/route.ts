import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getModFileDownloadUrl } from '@/lib/curseforge';
import { getVersionDetail } from '@/lib/modrinth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large batches

interface BatchFile {
  source: string;
  fileId: string;
  fileName: string;
  modId?: string;
}

async function fetchFileBuffer(
  file: BatchFile,
): Promise<{ fileName: string; buffer: Buffer } | null> {
  try {
    let downloadUrl: string | null = null;

    if (file.source === 'curseforge') {
      if (!file.modId) return null;
      downloadUrl = await getModFileDownloadUrl(file.modId, file.fileId);
    } else if (file.source === 'modrinth') {
      const version = await getVersionDetail(file.fileId);
      downloadUrl = version?.files?.[0]?.url || null;
    } else {
      return null;
    }

    if (!downloadUrl) return null;

    const res = await fetch(downloadUrl);
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    return { fileName: file.fileName, buffer: Buffer.from(arrayBuffer) };
  } catch (err) {
    console.error(`获取文件下载失败: ${file.fileName}:`, err);
    return null;
  }
}

async function withConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R | null>,
): Promise<(R | null)[]> {
  const results: (R | null)[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, files } = body as { mode: 'zip' | 'folder'; files: BatchFile[] };

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有提供要下载的文件' },
        { status: 400 },
      );
    }

    if (mode === 'zip') {
      // Download all files concurrently (max 3 at a time)
      const results = await withConcurrencyLimit(files, 3, fetchFileBuffer);

      const zip = new JSZip();
      let successCount = 0;
      const failedFiles: string[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result) {
          zip.file(result.fileName, result.buffer);
          successCount++;
        } else {
          failedFiles.push(files[i].fileName);
        }
      }

      if (successCount === 0) {
        return NextResponse.json(
          { success: false, error: '所有文件下载失败' },
          { status: 500 },
        );
      }

      // JAR files are already compressed; level 1 is sufficient
      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 1 },
      });

      const timestamp = Date.now();
      const headers = new Headers();
      headers.set('Content-Type', 'application/zip');
      headers.set(
        'Content-Disposition',
        `attachment; filename="mods-${timestamp}.zip"`,
      );
      headers.set('Content-Length', String(zipBuffer.length));

      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers,
      });
    }

    // folder mode: return file list for frontend to download individually
    return NextResponse.json({
      success: true,
      data: {
        mode: 'folder',
        files,
      },
    });
  } catch (err) {
    console.error('Batch download error:', err);
    return NextResponse.json(
      { success: false, error: '批量下载失败' },
      { status: 500 },
    );
  }
}
