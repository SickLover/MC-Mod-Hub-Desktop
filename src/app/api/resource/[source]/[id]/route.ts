import { NextRequest, NextResponse } from 'next/server';
import { getModDetail, getModFiles, mapClassToType } from '@/lib/curseforge';
import { getProjectDetail, getProjectVersions } from '@/lib/modrinth';
import { ResourceDetail, ResourceType, VersionFile } from '@/types';

const CF_URL_MAP: Record<ResourceType, string> = {
  mod: 'https://www.curseforge.com/minecraft/mc-mods',
  shader: 'https://www.curseforge.com/minecraft/shaders',
  resourcepack: 'https://www.curseforge.com/minecraft/texture-packs',
};

const MR_URL_MAP: Record<ResourceType, string> = {
  mod: 'https://modrinth.com/mod',
  shader: 'https://modrinth.com/shader',
  resourcepack: 'https://modrinth.com/resourcepack',
};

const KNOWN_LOADERS = new Set(['fabric', 'forge', 'neoforge', 'quilt']);
const CF_DEPENDENCY_REQUIRED = 3;
const CF_DEPENDENCY_INCOMPATIBLE = 5;

export async function GET(
  _request: NextRequest,
  { params }: { params: { source: string; id: string } },
) {
  const { source, id } = params;

  if (source !== 'curseforge' && source !== 'modrinth') {
    return NextResponse.json(
      { success: false, error: 'Invalid source. Use: curseforge or modrinth' },
      { status: 400 },
    );
  }

  try {
    if (source === 'curseforge') {
      const [mod, files] = await Promise.all([getModDetail(id), getModFiles(id)]);

      if (!mod) {
        return NextResponse.json(
          { success: false, error: 'Resource not found' },
          { status: 404 },
        );
      }

      const rType: ResourceType = mapClassToType(mod.classId);
      const slug = mod.slug || mod.name.toLowerCase().replace(/\s+/g, '-');

      const detail: ResourceDetail = {
        id: String(mod.id),
        source: 'curseforge',
        type: rType,
        name: mod.name,
        summary: mod.summary,
        description: mod.summary,
        iconUrl: mod.logo?.url || null,
        downloadCount: mod.downloadCount,
        author: mod.authors?.[0]?.name || 'Unknown',
        categories: mod.categories?.map((c: { name: string }) => c.name) || [],
        gameVersions: mod.latestFiles?.[0]?.gameVersions || [],
        websiteUrl: `${CF_URL_MAP[rType]}/${slug}`,
        createdAt: mod.dateCreated || '',
        updatedAt: mod.dateModified || '',
        versions: (files || []).map((f) => {
          const gameVersions: string[] = [];
          const loaders: string[] = [];
          for (const gv of f.gameVersions || []) {
            const lower = gv.toLowerCase();
            if (KNOWN_LOADERS.has(lower)) {
              loaders.push(lower);
            } else {
              gameVersions.push(gv);
            }
          }
          return {
            id: String(f.id),
            fileName: f.fileName || f.displayName || `file-${f.id}.jar`,
            gameVersions,
            loaders,
            releaseType: (
              f.releaseType === 'beta' || f.releaseType === 'alpha'
                ? f.releaseType
                : 'release'
            ) as VersionFile['releaseType'],
            fileSize: f.fileLength || 0,
            downloadUrl: f.downloadUrl || null,
            publishedAt: f.fileDate || '',
            dependencies: (f.dependencies || [])
              .filter((d) => d.relationType === CF_DEPENDENCY_REQUIRED)
              .map((d) => String(d.modId)),
            incompatibilities: (f.dependencies || [])
              .filter((d) => d.relationType === CF_DEPENDENCY_INCOMPATIBLE)
              .map((d) => String(d.modId)),
          };
        }),
      };

      return NextResponse.json({ success: true, data: detail });
    }

    // Modrinth
    const [project, versions] = await Promise.all([
      getProjectDetail(id),
      getProjectVersions(id),
    ]);

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 },
      );
    }

    const mrType: ResourceType =
      project.project_type === 'mod'
        ? 'mod'
        : project.project_type === 'shader'
          ? 'shader'
          : 'resourcepack';

    const detail: ResourceDetail = {
      id: project.id,
      source: 'modrinth',
      type: mrType,
      name: project.title,
      summary: project.description,
      description: project.body || '',
      iconUrl: project.icon_url || null,
      downloadCount: project.downloads,
      author: project.slug || 'Unknown',
      categories: project.categories || [],
      gameVersions: project.versions || [],
      websiteUrl: `${MR_URL_MAP[mrType]}/${project.slug || project.id}`,
      createdAt: project.published || '',
      updatedAt: project.updated || '',
      versions: (versions || []).map((v) => ({
        id: v.id,
        fileName: v.files?.[0]?.filename || `${v.name}.jar`,
        gameVersions: v.game_versions || [],
        loaders: (v.loaders || []).map((l: string) => l.toLowerCase()),
        releaseType: (
          v.release_type === 'beta' || v.release_type === 'alpha'
            ? v.release_type
            : 'release'
        ) as VersionFile['releaseType'],
        fileSize: v.files?.[0]?.size || 0,
        downloadUrl: v.files?.[0]?.url || null,
        publishedAt: v.date_published || '',
        dependencies: (v.dependencies || [])
          .filter((d: { dependency_type: string }) => d.dependency_type === 'required')
          .map((d: { project_id: string }) => d.project_id),
        incompatibilities: (v.dependencies || [])
          .filter((d: { dependency_type: string }) => d.dependency_type === 'incompatible')
          .map((d: { project_id: string }) => d.project_id),
      })),
    };

    return NextResponse.json({ success: true, data: detail });
  } catch (err) {
    console.error('Resource detail error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
