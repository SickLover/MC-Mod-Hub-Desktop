'use client';

import { useState, useEffect } from 'react';
import { CollectionItem, VersionFile } from '@/types';

interface CompatibilityCheckProps {
  collectionGameVersion: string;
  items: CollectionItem[];
  versionMap: Record<string, VersionFile[]>;
  selectedVersions: Record<string, string | null>;
}

interface CheckResult {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  itemName?: string;
}

const SEVERITY: Record<string, number> = {
  error: 0,
  warning: 1,
  info: 2,
  success: 3,
};

export default function CompatibilityCheck({
  collectionGameVersion,
  items,
  versionMap,
  selectedVersions,
}: CompatibilityCheckProps) {
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});
  const results: CheckResult[] = [];

  // Lazy-fetch names for missing dependencies
  useEffect(() => {
    const missingBySource: Record<string, string[]> = {};
    items.forEach((item) => {
      const selectedVersionId = selectedVersions[item.id];
      const versions = versionMap[item.id] || [];
      if (selectedVersionId) {
        const version = versions.find((v) => v.id === selectedVersionId);
        if (version?.dependencies) {
          for (const depId of version.dependencies) {
            if (!items.some((i) => i.resourceId === depId)) {
              if (!missingBySource[item.source]) missingBySource[item.source] = [];
              if (!missingBySource[item.source].includes(depId)) {
                missingBySource[item.source].push(depId);
              }
            }
          }
        }
      }
    });

    const entries = Object.entries(missingBySource);
    if (entries.length === 0) return;

    Promise.all(
      entries.map(([source, ids]) =>
        fetch(`/api/resolve-names?source=${source}&ids=${ids.join(',')}`)
          .then((r) => r.json())
          .then((res) => (res.success ? res.data : {}))
          .catch(() => ({})),
      ),
    ).then((resolved) => {
      const merged: Record<string, string> = {};
      resolved.forEach((r) => Object.assign(merged, r));
      setResolvedNames(merged);
    });
  }, [items, versionMap, selectedVersions]);

  const itemById: Record<string, CollectionItem> = {};
  items.forEach((item) => {
    itemById[item.resourceId] = item;
  });

  items.forEach((item) => {
    const selectedVersionId = selectedVersions[item.id];
    const versions = versionMap[item.id] || [];

    if (selectedVersionId) {
      const version = versions.find((v) => v.id === selectedVersionId);
      if (version) {
        const matchesGameVersion = version.gameVersions.some(
          (gv) => gv === collectionGameVersion,
        );
        if (matchesGameVersion) {
          results.push({
            type: 'success',
            message: `${item.resourceName} 已选择兼容版本 (${version.fileName})`,
            itemName: item.resourceName,
          });
        } else {
          results.push({
            type: 'warning',
            message: `版本不匹配: ${item.resourceName} 选中的版本 (${version.fileName}) 不兼容 ${collectionGameVersion}`,
          });
        }

        // Dependency check
        const deps = version.dependencies;
        if (deps && deps.length > 0) {
          for (const depId of deps) {
            const found = items.some((i) => i.resourceId === depId);
            if (!found) {
              results.push({
                type: 'warning',
                message: `缺失依赖: ${item.resourceName} 缺少前置依赖 ${resolvedNames[depId] || depId}，请添加到收藏夹`,
              });
            }
          }
        }

        // Incompatibility check
        const conflicts = version.incompatibilities;
        if (conflicts && conflicts.length > 0) {
          for (const conflictId of conflicts) {
            const conflictingItem = itemById[conflictId];
            if (conflictingItem) {
              results.push({
                type: 'error',
                message: `${item.resourceName} 与 ${conflictingItem.resourceName} 不兼容，请移除其中一个`,
              });
            }
          }
        }
      }
    } else {
      // No version selected — always show a prompt
      const hasCompatible = versions.some((v) =>
        v.gameVersions.includes(collectionGameVersion),
      );
      if (hasCompatible) {
        results.push({
          type: 'info',
          message: `${item.resourceName} 尚未选择版本，存在兼容 ${collectionGameVersion} 的版本可用`,
          itemName: item.resourceName,
        });
      } else {
        results.push({
          type: 'info',
          message: `${item.resourceName} 尚未选择版本`,
          itemName: item.resourceName,
        });
      }
    }
  });

  // Sort by severity: error → warning → info → success
  results.sort((a, b) => SEVERITY[a.type] - SEVERITY[b.type]);

  const warningCount = results.filter((r) => r.type === 'warning').length;
  const infoCount = results.filter((r) => r.type === 'info').length;
  const errorCount = results.filter((r) => r.type === 'error').length;

  if (results.length === 0) {
    return (
      <div className="p-4 bg-mc-card rounded-mc border border-white/5">
        <h4 className="text-sm font-semibold text-mc-text mb-2">兼容性检查</h4>
        <p className="text-xs text-mc-muted">选择版本后自动检查兼容性</p>
      </div>
    );
  }

  // All passed
  if (errorCount === 0 && warningCount === 0 && infoCount === 0) {
    return (
      <div className="p-4 bg-mc-card rounded-mc border border-white/5">
        <h4 className="text-sm font-semibold text-mc-text mb-3">兼容性检查</h4>
        <div className="flex items-center gap-2 p-3 rounded bg-green-600/10 text-green-400 border border-green-600/20 text-xs">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>全部通过 — 所有资源版本均兼容 {collectionGameVersion}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-mc-card rounded-mc border border-white/5">
      <h4 className="text-sm font-semibold text-mc-text mb-3">兼容性检查</h4>
      <div className="space-y-2">
        {results.map((r, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 text-xs p-2 rounded ${
              r.type === 'warning'
                ? 'bg-yellow-600/10 text-yellow-400 border border-yellow-600/20'
                : r.type === 'error'
                  ? 'bg-red-600/10 text-red-400 border border-red-600/20'
                  : r.type === 'success'
                    ? 'bg-green-600/10 text-green-400 border border-green-600/20'
                    : 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
            }`}
          >
            <span className="flex-shrink-0 mt-0.5">
              {r.type === 'warning' ? '⚠' : r.type === 'error' ? '✕' : r.type === 'success' ? '✓' : 'ℹ'}
            </span>
            <span>{r.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
