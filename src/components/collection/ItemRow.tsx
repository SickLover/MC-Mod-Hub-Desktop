'use client';

import { CollectionItem, VersionFile } from '@/types';
import { formatFileSize } from '@/lib/format';

interface ItemRowProps {
  item: CollectionItem;
  allVersions: VersionFile[];
  selectedVersionId: string | null;
  loaderFilter?: string | null;
  releaseTypeFilter?: string | null;
  gameVersionFilter?: string | null;
  checked: boolean;
  onToggleCheck: () => void;
  onVersionSelect: (fileId: string, fileName: string, gameVersion: string) => void;
  onRemove: () => void;
}

const LOADER_BADGES: Record<string, string> = {
  fabric: 'Fabric',
  forge: 'Forge',
  neoforge: 'NeoForge',
  quilt: 'Quilt',
};

export default function ItemRow({
  item,
  allVersions,
  selectedVersionId,
  loaderFilter,
  releaseTypeFilter,
  gameVersionFilter,
  checked,
  onToggleCheck,
  onVersionSelect,
  onRemove,
}: ItemRowProps) {
  const filteredVersions = allVersions.filter((v) => {
    if (loaderFilter && !v.loaders.includes(loaderFilter)) return false;
    if (releaseTypeFilter && v.releaseType !== releaseTypeFilter) return false;
    if (gameVersionFilter && !v.gameVersions.includes(gameVersionFilter)) return false;
    return true;
  });

  const selectedVersion = filteredVersions.find((v) => v.id === selectedVersionId) || null;

  // 诊断每个筛选条件是否是导致空结果的原因
  const noMatchReasons: string[] = [];
  if (loaderFilter && allVersions.every((v) => !v.loaders.includes(loaderFilter))) {
    noMatchReasons.push(`加载器(${LOADER_BADGES[loaderFilter] || loaderFilter})`);
  }
  if (releaseTypeFilter && allVersions.every((v) => v.releaseType !== releaseTypeFilter)) {
    noMatchReasons.push(`版本类型(${releaseTypeFilter})`);
  }
  if (gameVersionFilter && allVersions.every((v) => !v.gameVersions.includes(gameVersionFilter))) {
    noMatchReasons.push(`游戏版本(${gameVersionFilter})`);
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-mc border border-white/5 transition-all duration-200 ${
        checked ? 'bg-mc-green/10 border-mc-green/30' : 'bg-mc-card hover:bg-mc-card-hover'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggleCheck}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 transition-colors duration-200 flex items-center justify-center ${
          checked
            ? 'bg-mc-green border-mc-green'
            : 'border-white/20 hover:border-white/40'
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Icon */}
      <div className="w-8 h-8 rounded overflow-hidden bg-mc-bg flex-shrink-0">
        {item.iconUrl ? (
          <img src={item.iconUrl} alt={item.resourceName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-mc-muted text-[10px]">N/A</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-mc-text font-medium truncate">{item.resourceName}</p>
        <p className="text-xs text-mc-muted">
          {item.source === 'curseforge' ? 'CurseForge' : 'Modrinth'}
        </p>
      </div>

      {/* Version selector */}
      <div className="flex-shrink-0 w-48">
        {allVersions.length > 0 ? (
          <>
            <select
              value={selectedVersionId || ''}
              onChange={(e) => {
                const v = filteredVersions.find((vf) => vf.id === e.target.value);
                if (v) {
                  const gv = v.gameVersions[0] || '';
                  onVersionSelect(v.id, v.fileName, gv);
                }
              }}
              className="w-full bg-mc-bg text-xs text-mc-text border border-white/10 rounded-md px-2 py-1.5 focus:outline-none focus:border-mc-green transition-colors duration-200"
            >
              <option value="">选择版本</option>
              {filteredVersions.slice(0, 30).map((v) => {
                const loaderBadge = v.loaders.length > 0
                  ? v.loaders.map((l) => LOADER_BADGES[l] || l).join(', ')
                  : null;
                return (
                  <option key={v.id} value={v.id}>
                    {v.fileName} ({v.gameVersions.slice(0, 2).join(', ')}
                    {loaderBadge ? ` | ${loaderBadge}` : ''})
                  </option>
                );
              })}
            </select>
            {filteredVersions.length === 0 && allVersions.length > 0 && (
              <p className="text-xs text-mc-muted mt-1">
                {noMatchReasons.length > 0
                  ? `无匹配版本: 无${noMatchReasons.join('+')}的版本`
                  : '筛选条件组合无匹配版本'}
              </p>
            )}
          </>
        ) : (
          <span className="text-xs text-mc-muted">无版本信息</span>
        )}
      </div>

      {/* Loader badges + file size */}
      {selectedVersion && (
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {selectedVersion.loaders.slice(0, 2).map((l) => (
            <span
              key={l}
              className="text-xs px-1.5 py-0.5 rounded bg-mc-green/20 text-mc-green-light"
            >
              {LOADER_BADGES[l] || l}
            </span>
          ))}
          <span className="text-xs text-mc-muted">{formatFileSize(selectedVersion.fileSize)}</span>
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className="p-1.5 text-mc-muted hover:text-red-400 transition-colors duration-200 flex-shrink-0"
        title="移除"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
