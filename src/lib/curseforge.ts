import { ResourceItem, ResourceType } from '@/types';

const API_BASE = 'https://api.curseforge.com';
const GAME_ID = 432;

const CLASS_IDS: Record<ResourceType, number> = {
  mod: 6,
  shader: 12,
  resourcepack: 17,
};

function getApiKey(): string | null {
  return process.env.CURSEFORGE_API_KEY || null;
}

interface CfLogo {
  url: string;
}

interface CfAuthor {
  name: string;
}

interface CfCategory {
  name: string;
}

interface CfFile {
  gameVersions: string[];
}

interface CfMod {
  id: number;
  name: string;
  summary: string;
  logo: CfLogo | null;
  downloadCount: number;
  authors: CfAuthor[];
  categories: CfCategory[];
  classId: number;
  dateCreated: string;
  dateModified: string;
  latestFiles: CfFile[];
  slug: string;
}

interface CfSearchResponse {
  data: CfMod[];
  pagination: { totalCount: number };
}

interface CfModResponse {
  data: CfMod;
}

interface CfDependency {
  modId: number;
  relationType: number;
}

interface CfFileEntry {
  id: number;
  displayName: string;
  fileName: string;
  gameVersions: string[];
  releaseType: string;
  fileLength: number;
  downloadUrl: string | null;
  fileDate: string;
  dependencies?: CfDependency[];
}

interface CfFilesResponse {
  data: CfFileEntry[];
}

async function cfGet<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch (err) {
    console.error('CurseForge API 请求失败:', err);
    return null;
  }
}

export function mapClassToType(classId: number): ResourceType {
  switch (classId) {
    case 6: return 'mod';
    case 12: return 'shader';
    case 17: return 'resourcepack';
    default: return 'mod';
  }
}

function toResourceItem(mod: CfMod): ResourceItem {
  return {
    id: String(mod.id),
    source: 'curseforge',
    type: mapClassToType(mod.classId),
    name: mod.name,
    summary: mod.summary,
    iconUrl: mod.logo?.url || null,
    downloadCount: mod.downloadCount,
    author: mod.authors?.[0]?.name || 'Unknown',
    categories: mod.categories?.map((c) => c.name) || [],
    gameVersions: mod.latestFiles?.[0]?.gameVersions || [],
    createdAt: mod.dateCreated || '',
    updatedAt: mod.dateModified || '',
  };
}

export async function fetchPopular(type: ResourceType, limit = 8): Promise<ResourceItem[]> {
  const classId = CLASS_IDS[type];
  const data = await cfGet<CfSearchResponse>('/v1/mods/search', {
    gameId: String(GAME_ID),
    classId: String(classId),
    sortBy: '6',
    sortOrder: 'desc',
    pageSize: String(limit),
  });
  if (!data?.data) return [];
  return data.data.slice(0, limit).map(toResourceItem);
}

export async function fetchPopularList(
  type: ResourceType,
  limit = 40,
  offset = 0,
): Promise<ResourceItem[]> {
  const classId = CLASS_IDS[type];
  const data = await cfGet<CfSearchResponse>('/v1/mods/search', {
    gameId: String(GAME_ID),
    classId: String(classId),
    sortBy: '6',
    sortOrder: 'desc',
    pageSize: String(limit + offset),
  });
  if (!data?.data) return [];
  return data.data.slice(offset, offset + limit).map(toResourceItem);
}

export async function searchMods(query: string, limit = 8): Promise<ResourceItem[]> {
  const data = await cfGet<CfSearchResponse>('/v1/mods/search', {
    gameId: String(GAME_ID),
    searchFilter: query,
    sortBy: '6',
    sortOrder: 'desc',
    pageSize: String(limit),
  });
  if (!data?.data) return [];
  return data.data.slice(0, limit).map(toResourceItem);
}

export async function getModDetail(modId: string): Promise<CfMod | null> {
  const data = await cfGet<CfModResponse>(`/v1/mods/${modId}`);
  return data?.data || null;
}

export async function getModFiles(modId: string): Promise<CfFileEntry[]> {
  const data = await cfGet<CfFilesResponse>(`/v1/mods/${modId}/files`, {
    pageSize: '50',
    index: '0',
  });
  return data?.data || [];
}

export async function getModsBatch(modIds: string[]): Promise<Record<string, string>> {
  if (modIds.length === 0) return {};
  const apiKey = getApiKey();
  if (!apiKey) return {};

  try {
    const res = await fetch(`${API_BASE}/v1/mods`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modIds: modIds.map(Number) }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    const json = await res.json();
    const result: Record<string, string> = {};
    if (json.data && Array.isArray(json.data)) {
      for (const mod of json.data) {
        result[String(mod.id)] = mod.name;
      }
    }
    return result;
  } catch (err) {
    console.error('CurseForge batch query failed:', err);
    return {};
  }
}

export async function getModFileDownloadUrl(modId: string, fileId: string): Promise<string | null> {
  const data = await cfGet<{ data: { downloadUrl: string } }>(
    `/v1/mods/${modId}/files/${fileId}/download-url`,
  );
  return data?.data?.downloadUrl || null;
}
