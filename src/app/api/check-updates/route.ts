import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { getModFiles } from '@/lib/curseforge';
import { getProjectVersions } from '@/lib/modrinth';

export const dynamic = 'force-dynamic';

interface CheckItem {
  collectionId: string;
  collectionName: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  source: string;
  selectedFileId: string | null;
}

interface UpdateAlert {
  resourceName: string;
  resourceId: string;
  source: string;
  resourceType: string;
  collectionName: string;
  collectionId: string;
  newVersionName: string;
  newVersionId: string;
}

function findLatest<T>(
  items: T[],
  getDate: (item: T) => string,
  isRelease: (item: T) => boolean,
): T | undefined {
  const sorted = [...items].sort(
    (a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime(),
  );
  return sorted.find(isRelease) || sorted[0];
}

async function checkCurseForgeUpdate(item: CheckItem): Promise<UpdateAlert | null> {
  const files = await getModFiles(item.resourceId);
  if (!files || files.length === 0) return null;

  const latest = findLatest(
    files,
    (f) => f.fileDate,
    (f) => f.releaseType === 'release',
  );

  if (latest && String(latest.id) !== item.selectedFileId) {
    return {
      resourceName: item.resourceName,
      resourceId: item.resourceId,
      source: 'curseforge',
      resourceType: item.resourceType,
      collectionName: item.collectionName,
      collectionId: item.collectionId,
      newVersionName: latest.displayName || latest.fileName || `file-${latest.id}`,
      newVersionId: String(latest.id),
    };
  }
  return null;
}

async function checkModrinthUpdate(item: CheckItem): Promise<UpdateAlert | null> {
  const versions = await getProjectVersions(item.resourceId);
  if (!versions || versions.length === 0) return null;

  const latest = findLatest(
    versions,
    (v) => v.date_published,
    (v) => v.release_type === 'release',
  );

  if (latest && latest.id !== item.selectedFileId) {
    return {
      resourceName: item.resourceName,
      resourceId: item.resourceId,
      source: 'modrinth',
      resourceType: item.resourceType,
      collectionName: item.collectionName,
      collectionId: item.collectionId,
      newVersionName: latest.name || latest.version_number || latest.id,
      newVersionId: latest.id,
    };
  }
  return null;
}

export async function GET() {
  // Single JOIN query to avoid N+1
  const items = await queryAll<CheckItem>(
    `SELECT c.id as collectionId, c.name as collectionName,
            ci.resource_type as resourceType, ci.resource_id as resourceId,
            ci.resource_name as resourceName, ci.source,
            ci.selected_file_id as selectedFileId
     FROM collections c
     JOIN collection_items ci ON ci.collection_id = c.id
     ORDER BY c.updated_at DESC`,
  );

  const filtered = items.filter((item) => item.selectedFileId);

  // Parallelize API calls with concurrency limit (3 at a time)
  const concurrency = 3;
  const alerts: UpdateAlert[] = [];
  for (let i = 0; i < filtered.length; i += concurrency) {
    const batch = filtered.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((item) => {
        const checker = item.source === 'curseforge' ? checkCurseForgeUpdate : checkModrinthUpdate;
        return checker(item);
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        alerts.push(result.value);
      } else if (result.status === 'rejected') {
        console.error('检查更新失败:', result.reason);
      }
    }
  }

  return NextResponse.json({ success: true, data: alerts });
}
