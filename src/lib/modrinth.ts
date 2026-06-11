import { ResourceItem, ResourceType } from '@/types';

const API_BASE = 'https://api.modrinth.com/v2';

interface MrHit {
  project_id: string;
  project_type: string;
  slug: string;
  author: string;
  title: string;
  description: string;
  icon_url: string | null;
  downloads: number;
  categories: string[];
  versions: string[];
  date_modified: string;
}

interface MrSearchResponse {
  hits: MrHit[];
  total_hits: number;
}

interface MrProject {
  id: string;
  project_type: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  icon_url: string | null;
  downloads: number;
  categories: string[];
  versions: string[];
  published: string;
  updated: string;
}

interface MrDependency {
  project_id: string;
  dependency_type: string;
  version_id: string | null;
}

interface MrVersion {
  id: string;
  name: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  release_type: string;
  files: { url: string; filename: string; size: number }[];
  date_published: string;
  dependencies: MrDependency[];
}

async function mrGet<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch (err) {
    console.error('Modrinth API 请求失败:', err);
    return null;
  }
}

function toResourceItem(hit: MrHit): ResourceItem {
  const typeMap: Record<string, ResourceType> = {
    mod: 'mod',
    shader: 'shader',
    resourcepack: 'resourcepack',
  };

  return {
    id: hit.project_id,
    source: 'modrinth',
    type: typeMap[hit.project_type] || 'mod',
    name: hit.title,
    summary: hit.description,
    iconUrl: hit.icon_url || null,
    downloadCount: hit.downloads,
    author: hit.author || 'Unknown',
    categories: hit.categories || [],
    gameVersions: hit.versions || [],
    createdAt: '',
    updatedAt: hit.date_modified || '',
  };
}

function buildFacet(type: ResourceType): string {
  const facetMap: Record<ResourceType, string> = {
    mod: 'project_type:mod',
    shader: 'project_type:shader',
    resourcepack: 'project_type:resourcepack',
  };
  return JSON.stringify([[facetMap[type]]]);
}

export async function fetchPopular(type: ResourceType, limit = 8): Promise<ResourceItem[]> {
  const data = await mrGet<MrSearchResponse>('/search', {
    facets: buildFacet(type),
    sort: 'downloads',
    limit: String(limit),
  });
  if (!data?.hits) return [];
  return data.hits.slice(0, limit).map(toResourceItem);
}

export async function fetchPopularList(
  type: ResourceType,
  limit = 40,
  offset = 0,
): Promise<ResourceItem[]> {
  const data = await mrGet<MrSearchResponse>('/search', {
    facets: buildFacet(type),
    sort: 'downloads',
    limit: String(limit + offset),
  });
  if (!data?.hits) return [];
  return data.hits.slice(offset, offset + limit).map(toResourceItem);
}

export async function searchProjects(query: string, limit = 16): Promise<ResourceItem[]> {
  const data = await mrGet<MrSearchResponse>('/search', {
    query,
    limit: String(limit),
    sort: 'relevance',
  });
  if (!data?.hits) return [];
  return data.hits.slice(0, limit).map(toResourceItem);
}

export async function getProjectDetail(projectId: string): Promise<MrProject | null> {
  return mrGet<MrProject>(`/project/${projectId}`);
}

export async function getProjectVersions(projectId: string): Promise<MrVersion[]> {
  const data = await mrGet<MrVersion[]>(`/project/${projectId}/version`);
  return data || [];
}

export async function getProjectsBatch(projectIds: string[]): Promise<Record<string, string>> {
  if (projectIds.length === 0) return {};
  const ids = JSON.stringify(projectIds);
  const data = await mrGet<MrProject[]>(`/projects`, { ids });
  if (!data || !Array.isArray(data)) return {};
  const result: Record<string, string> = {};
  for (const project of data) {
    result[project.id] = project.title;
  }
  return result;
}

export async function getVersionDetail(versionId: string): Promise<MrVersion | null> {
  return mrGet<MrVersion>(`/version/${versionId}`);
}
