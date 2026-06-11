'use client';

import { useState, useMemo } from 'react';
import { VersionFile } from '@/types';
import { formatFileSize } from '@/lib/format';

interface VersionSelectorProps {
  versions: VersionFile[];
  selectedId: string | null;
  onSelect: (version: VersionFile) => void;
}

const LOADER_BADGES: Record<string, string> = {
  fabric: 'Fabric',
  forge: 'Forge',
  neoforge: 'NeoForge',
  quilt: 'Quilt',
};

const RELEASE_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  release: { label: '正式版', color: 'text-green-400' },
  beta: { label: 'Beta', color: 'text-yellow-400' },
  alpha: { label: 'Alpha', color: 'text-red-400' },
};

export default function VersionSelector({
  versions,
  selectedId,
  onSelect,
}: VersionSelectorProps) {
  const [filterGameVersion, setFilterGameVersion] = useState<string | null>(
    null,
  );

  // Collect all unique game versions
  const allGameVersions = useMemo(() => {
    const set = new Set<string>();
    versions.forEach((v) => v.gameVersions.forEach((gv) => set.add(gv)));
    return Array.from(set).sort().reverse();
  }, [versions]);

  const selectedVersion = versions.find((v) => v.id === selectedId);

  const filteredVersions = filterGameVersion
    ? versions.filter((v) => v.gameVersions.includes(filterGameVersion))
    : versions;

  return (
    <div>
      <h3 className="text-lg font-bold text-mc-text mb-4">版本列表</h3>

      {/* Game version filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterGameVersion(null)}
          className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
            !filterGameVersion
              ? 'bg-mc-green/15 text-mc-green-light border border-mc-green/20'
              : 'bg-mc-card text-mc-muted border border-white/5 hover:text-mc-text'
          }`}
        >
          全部
        </button>
        {allGameVersions.slice(0, 15).map((gv) => (
          <button
            key={gv}
            onClick={() =>
              setFilterGameVersion(gv === filterGameVersion ? null : gv)
            }
            className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
              filterGameVersion === gv
                ? 'bg-mc-green/15 text-mc-green-light border border-mc-green/20'
                : 'bg-mc-card text-mc-muted border border-white/5 hover:text-mc-text'
            }`}
          >
            {gv}
          </button>
        ))}
        {allGameVersions.length > 15 && (
          <span className="px-2 py-1 text-xs text-mc-muted">
            +{allGameVersions.length - 15}
          </span>
        )}
      </div>

      {/* Version list */}
      {filteredVersions.length === 0 ? (
        <p className="text-sm text-mc-muted py-8 text-center">暂无版本</p>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {filteredVersions.map((v) => {
            const typeInfo =
              RELEASE_TYPE_LABEL[v.releaseType] || RELEASE_TYPE_LABEL.release;
            return (
              <div
                key={v.id}
                onClick={() => onSelect(v)}
                className={`flex items-center gap-3 p-3 rounded-mc border cursor-pointer transition-all duration-200 ${
                  selectedId === v.id
                    ? 'bg-mc-green/10 border-mc-green/30'
                    : 'bg-mc-card border-white/5 hover:border-white/10'
                }`}
              >
                {/* Radio indicator */}
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors duration-200 ${
                    selectedId === v.id
                      ? 'border-mc-green bg-mc-green'
                      : 'border-mc-muted'
                  }`}
                >
                  {selectedId === v.id && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-0.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-mc-text font-medium truncate">
                      {v.fileName}
                    </span>
                    <span
                      className={`text-xs flex-shrink-0 ${typeInfo.color}`}
                    >
                      {typeInfo.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {v.gameVersions.slice(0, 4).map((gv) => (
                      <span
                        key={gv}
                        className="text-xs text-mc-muted bg-mc-bg px-1.5 py-0.5 rounded"
                      >
                        {gv}
                      </span>
                    ))}
                    {v.gameVersions.length > 4 && (
                      <span className="text-xs text-mc-muted">
                        +{v.gameVersions.length - 4}
                      </span>
                    )}
                  </div>
                  {v.loaders.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {v.loaders.slice(0, 2).map((l) => (
                        <span
                          key={l}
                          className="text-xs px-1.5 py-0.5 rounded bg-mc-green/15 text-mc-green-light"
                        >
                          {LOADER_BADGES[l] || l}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-xs text-mc-muted flex-shrink-0 text-right">
                  {formatFileSize(v.fileSize)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected version detail */}
      {selectedVersion && (
        <div className="mt-4 p-4 bg-mc-card rounded-mc border border-white/5 animate-fade-in">
          <p className="text-sm text-mc-muted mb-2">
            已选版本:{' '}
            <span className="text-mc-text font-medium">
              {selectedVersion.fileName}
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedVersion.gameVersions.map((gv) => (
              <span
                key={gv}
                className="px-2 py-0.5 text-xs rounded bg-mc-green/15 text-mc-green-light border border-mc-green/20"
              >
                {gv}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
