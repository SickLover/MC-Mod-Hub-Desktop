'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Collection, CollectionItem, VersionFile } from '@/types';
import ItemRow from '@/components/collection/ItemRow';
import CompatibilityCheck from '@/components/collection/CompatibilityCheck';
import { useToast } from '@/components/common/ToastProvider';
import { fetchGameVersions, getFallbackVersions } from '@/lib/game-versions';

interface ItemWithVersions extends CollectionItem {
  versions: VersionFile[];
}

const LOADER_OPTIONS = [
  { value: '', label: '加载器: 全部' },
  { value: 'forge', label: '加载器: Forge' },
  { value: 'fabric', label: '加载器: Fabric' },
  { value: 'neoforge', label: '加载器: NeoForge' },
  { value: 'quilt', label: '加载器: Quilt' },
];

const RELEASE_TYPE_OPTIONS = [
  { value: '', label: '版本类型: 全部' },
  { value: 'release', label: '版本类型: Release' },
  { value: 'beta', label: '版本类型: Beta' },
  { value: 'alpha', label: '版本类型: Alpha' },
];

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const collectionId = params?.id as string;
  const toast = useToast();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<ItemWithVersions[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [selectedLoader, setSelectedLoader] = useState<string | null>(null);
  const [selectedReleaseType, setSelectedReleaseType] = useState<string | null>(null);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [gameVersions, setGameVersions] = useState<string[]>(getFallbackVersions());

  // Track selected versions per item: itemId → { fileId, fileName, gameVersion }
  const [selectedVersions, setSelectedVersions] = useState<
    Record<string, { fileId: string; fileName: string; gameVersion: string } | null>
  >({});

  const fetchCollection = useCallback(async () => {
    if (!collectionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}`);
      const json = await res.json();
      if (json.success && json.data) {
        const col = json.data as Collection & { items: CollectionItem[] };
        setCollection({ id: col.id, name: col.name, gameVersion: col.gameVersion, releaseType: col.releaseType, createdAt: col.createdAt, updatedAt: col.updatedAt });

        // Fetch versions for each item concurrently
        const itemsWithVersions: ItemWithVersions[] = await Promise.all(
          (col.items || []).map(async (item: CollectionItem): Promise<ItemWithVersions> => {
            let versions: VersionFile[] = [];
            try {
              const detailRes = await fetch(`/api/resource/${item.source}/${item.resourceId}`);
              const detailJson = await detailRes.json();
              if (detailJson.success && detailJson.data) {
                versions = detailJson.data.versions || [];
              }
            } catch (err) {
              console.error(`加载资源版本失败: ${item.source}/${item.resourceId}:`, err);
            }
            return { ...item, versions };
          }),
        );
        setItems(itemsWithVersions);
      }
    } catch (err) {
      console.error('加载收藏夹详情失败:', err);
      toast?.error('加载收藏夹失败');
    } finally {
      setLoading(false);
    }
  }, [collectionId, toast]);

  useEffect(() => {
    fetchCollection();
    fetchGameVersions().then((v) => {
      if (v.length > 0) setGameVersions(v);
    });
  }, [fetchCollection]);

  // Filter items based on loader only (release type filtering is per-item in ItemRow)
  const filteredItems = items.filter((item) => {
    if (!selectedLoader) return true;
    const versions = item.versions;
    if (versions.length === 0) return true;

    return versions.some((v) => v.loaders.includes(selectedLoader));
  });

  const handleGameVersionChange = async (gameVersion: string) => {
    try {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameVersion }),
      });
      if (!res.ok) console.error('更新游戏版本失败:', await res.text().catch(() => ''));
    } catch (err) {
      console.error('更新游戏版本失败:', err);
    }
    fetchCollection();
  };

  const handleVersionSelect = (itemId: string, fileId: string, fileName: string, gameVersion: string) => {
    setSelectedVersions((prev) => ({
      ...prev,
      [itemId]: { fileId, fileName, gameVersion },
    }));
  };

  const handleRemoveItem = async (item: CollectionItem) => {
    if (!confirm('确定从收藏夹中移除此资源？')) return;
    try {
      const res = await fetch('/api/collections/remove-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          resourceId: item.resourceId,
          source: item.source,
        }),
      });
      if (!res.ok) {
        console.error('移除资源失败:', await res.text().catch(() => ''));
        toast?.error('移除失败');
        return;
      }
      toast?.success('已从收藏夹移除');
      // Remove from local state
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } catch (err) {
      console.error('移除资源失败:', err);
      toast?.error('移除失败');
    }
  };

  const toggleCheck = (itemId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === filteredItems.length && filteredItems.length > 0) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleBatchDownloadZip = async () => {
    const checkedItems = filteredItems.filter((i) => checkedIds.has(i.id));
    if (checkedItems.length === 0) return;

    setBatchDownloading(true);
    toast?.info(`正在打包 ${checkedItems.length} 个文件...`);

    const files: { source: string; fileId: string; fileName: string; modId?: string }[] = [];

    for (const item of checkedItems) {
      const sel = selectedVersions[item.id];
      let targetFile: VersionFile | null = null;

      if (sel) {
        targetFile = item.versions.find((v) => v.id === sel.fileId) || null;
      }
      if (!targetFile) {
        // Try to match by loader filter
        if (selectedLoader) {
          targetFile = item.versions.find((v) => v.loaders.includes(selectedLoader)) || null;
        }
      }
      if (!targetFile && selectedReleaseType) {
        targetFile = item.versions.find((v) => v.releaseType === selectedReleaseType) || null;
      }
      if (!targetFile) {
        targetFile = item.versions[0] || null;
      }

      if (targetFile) {
        const entry: { source: string; fileId: string; fileName: string; modId?: string } = {
          source: item.source,
          fileId: targetFile.id,
          fileName: targetFile.fileName,
        };
        if (item.source === 'curseforge') {
          entry.modId = item.resourceId;
        }
        files.push(entry);
      }
    }

    if (files.length === 0) {
      toast?.error('没有可下载的文件（请选择版本）');
      setBatchDownloading(false);
      return;
    }

    try {
      const res = await fetch('/api/batch-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'zip', files }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: '下载失败' }));
        toast?.error(errJson.error || '打包下载失败');
        setBatchDownloading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mods-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast?.success(`成功下载 ${files.length} 个文件`);
    } catch (err) {
      console.error('批量下载失败:', err);
      toast?.error('批量下载失败');
    } finally {
      setBatchDownloading(false);
    }
  };

  const handleBatchDownloadFolder = async () => {
    const checkedItems = filteredItems.filter((i) => checkedIds.has(i.id));
    if (checkedItems.length === 0) return;

    setBatchDownloading(true);
    toast?.info(`开始逐个下载 ${checkedItems.length} 个文件...`);

    let successCount = 0;
    let failCount = 0;

    for (const item of checkedItems) {
      const sel = selectedVersions[item.id];
      let targetFile: VersionFile | null = null;

      if (sel) {
        targetFile = item.versions.find((v) => v.id === sel.fileId) || null;
      }
      if (!targetFile && selectedLoader) {
        targetFile = item.versions.find((v) => v.loaders.includes(selectedLoader)) || null;
      }
      if (!targetFile && selectedReleaseType) {
        targetFile = item.versions.find((v) => v.releaseType === selectedReleaseType) || null;
      }
      if (!targetFile) {
        targetFile = item.versions[0] || null;
      }

      if (!targetFile) {
        failCount++;
        continue;
      }

      try {
        const params = new URLSearchParams({
          source: item.source,
          fileId: targetFile.id,
          fileName: targetFile.fileName,
        });
        if (item.source === 'curseforge') {
          params.set('modId', item.resourceId);
        }

        const res = await fetch(`/api/download?${params.toString()}`);
        if (!res.ok) {
          failCount++;
          continue;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = targetFile.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        successCount++;
        // Small delay between downloads to avoid overwhelming the browser
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.error(`下载失败: ${targetFile.fileName}:`, err);
        failCount++;
      }
    }

    if (failCount > 0 && successCount > 0) {
      toast?.info(`成功下载 ${successCount} 个，${failCount} 个失败`);
    } else if (successCount > 0) {
      toast?.success(`成功下载 ${successCount} 个文件`);
    } else {
      toast?.error('所有文件下载失败');
    }

    setBatchDownloading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mc-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-mc-green/30 border-t-mc-green rounded-full animate-spin" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-mc-bg flex flex-col items-center justify-center gap-4">
        <p className="text-mc-muted text-lg">收藏夹不存在</p>
        <Link href="/collections" className="text-mc-green hover:text-mc-green-light transition-colors duration-200 text-sm">
          ← 返回收藏夹列表
        </Link>
      </div>
    );
  }

  // Build version map for extracting loader/releaseType filter options
  const allLoaders = new Set<string>();
  items.forEach((item) => {
    item.versions.forEach((v) => {
      v.loaders.forEach((l) => allLoaders.add(l));
    });
  });

  // Build data for CompatibilityCheck
  const versionMap: Record<string, VersionFile[]> = {};
  items.forEach((item) => { versionMap[item.id] = item.versions; });

  const compatSelectedVersions: Record<string, string | null> = {};
  items.forEach((item) => {
    compatSelectedVersions[item.id] = selectedVersions[item.id]?.fileId || null;
  });

  return (
    <div className="min-h-screen bg-mc-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-mc-bg/95 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/collections"
              className="text-mc-muted hover:text-mc-text transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-mc-text">{collection.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                {collection.releaseType && collection.releaseType !== 'release' && (
                  <span className="text-xs text-mc-muted">
                    类型: {collection.releaseType}
                  </span>
                )}
                <span className="text-xs text-mc-muted">共 {items.length} 个资源</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-mc-muted text-sm">收藏夹是空的</p>
            <Link
              href="/"
              className="inline-block mt-3 text-mc-green hover:text-mc-green-light transition-colors duration-200 text-sm"
            >
              ← 去首页添加资源
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：Item 列表 */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filter bar — 下拉选择菜单 */}
            <div className="flex items-center gap-2 mb-4">
              {/* 加载器 */}
              <select
                value={selectedLoader || ''}
                onChange={(e) => setSelectedLoader(e.target.value || null)}
                className="bg-mc-card text-xs text-mc-text border border-white/10 rounded-md px-2.5 py-1.5 
                           focus:outline-none focus:border-mc-green transition-colors duration-200
                           appearance-none pr-7"
              >
                {LOADER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-mc-card text-mc-text">
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* 版本类型 */}
              <select
                value={selectedReleaseType || ''}
                onChange={(e) => setSelectedReleaseType(e.target.value || null)}
                className="bg-mc-card text-xs text-mc-text border border-white/10 rounded-md px-2.5 py-1.5 
                           focus:outline-none focus:border-mc-green transition-colors duration-200
                           appearance-none pr-7"
              >
                {RELEASE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-mc-card text-mc-text">
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* 游戏版本 */}
              <select
                value={collection?.gameVersion || ''}
                onChange={(e) => handleGameVersionChange(e.target.value)}
                className="bg-mc-card text-xs text-mc-text border border-white/10 rounded-md px-2.5 py-1.5 
                           focus:outline-none focus:border-mc-green transition-colors duration-200
                           appearance-none pr-7 min-w-[130px]"
              >
                <option value="" disabled>选择游戏版本</option>
                {gameVersions.map((v) => (
                  <option key={v} value={v} className="bg-mc-card text-mc-text">{v}</option>
                ))}
              </select>
            </div>

            {/* Select all bar */}
            <div className="flex items-center justify-between p-3 bg-mc-card rounded-mc border border-white/5 mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAll}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 ${
                    checkedIds.size === filteredItems.length && filteredItems.length > 0
                      ? 'bg-mc-green border-mc-green'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  {checkedIds.size === filteredItems.length && filteredItems.length > 0 && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-mc-muted">
                  {checkedIds.size > 0
                    ? `已选 ${checkedIds.size}/${filteredItems.length} 项`
                    : '全选'}
                </span>
              </div>
            </div>

            {/* Item rows */}
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  allVersions={item.versions}
                  selectedVersionId={selectedVersions[item.id]?.fileId || null}
                  loaderFilter={selectedLoader || null}
                  releaseTypeFilter={selectedReleaseType || null}
                  gameVersionFilter={collection?.gameVersion || null}
                  checked={checkedIds.has(item.id)}
                  onToggleCheck={() => toggleCheck(item.id)}
                  onVersionSelect={(fileId, fileName, gameVersion) =>
                    handleVersionSelect(item.id, fileId, fileName, gameVersion)
                  }
                  onRemove={() => handleRemoveItem(item)}
                />
              ))}
            </div>

            {filteredItems.length === 0 && items.length > 0 && (
              <p className="text-center py-8 text-mc-muted text-sm">
                当前筛选条件没有匹配的资源
              </p>
            )}
            </div>

            {/* 右侧：兼容性检测 */}
            <div className="space-y-4">
              {collection && collection.gameVersion && (
                <CompatibilityCheck
                  collectionGameVersion={collection.gameVersion}
                  items={items}
                  versionMap={versionMap}
                  selectedVersions={compatSelectedVersions}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-mc-bg/95 backdrop-blur border-t border-white/5 px-4 py-3 z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span className="text-sm text-mc-muted">
              {checkedIds.size > 0 ? `已选 ${checkedIds.size} 个资源` : '请勾选要下载的资源'}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBatchDownloadFolder}
                disabled={checkedIds.size === 0 || batchDownloading}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                  bg-mc-card text-mc-text border border-white/10
                  hover:bg-mc-card-hover hover:border-white/20
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {batchDownloading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-mc-muted/30 border-t-mc-muted rounded-full animate-spin" />
                    下载中...
                  </span>
                ) : (
                  '下载到文件夹'
                )}
              </button>
              <button
                onClick={handleBatchDownloadZip}
                disabled={checkedIds.size === 0 || batchDownloading}
                className="px-5 py-2 rounded-md text-sm font-medium transition-all duration-200
                  bg-mc-green text-white
                  hover:bg-mc-green-light
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {batchDownloading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    打包中...
                  </span>
                ) : (
                  '打包下载 (zip)'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
