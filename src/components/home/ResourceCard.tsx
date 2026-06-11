'use client';

import Link from 'next/link';
import type { ResourceItem } from '@/types';
import { formatDownloads } from '@/lib/format';
import ContextMenu from '@/components/home/ContextMenu';

interface ResourceCardProps {
  resource: ResourceItem;
  favorited?: boolean;
  onFavoritesChanged?: () => void;
}

export default function ResourceCard({ resource, favorited = false, onFavoritesChanged }: ResourceCardProps) {
  const fallbackIcon = () => {
    switch (resource.type) {
      case 'shader':
        return '✨';
      case 'resourcepack':
        return '🎨';
      default:
        return '🔧';
    }
  };

  const sourceLabel = resource.source === 'curseforge' ? 'CF' : 'MR';
  const sourceColor =
    resource.source === 'curseforge'
      ? 'bg-orange-500/20 text-orange-400'
      : 'bg-blue-500/20 text-blue-400';

  return (
    <Link
      href={`/resource/${resource.source}/${resource.id}`}
      className="block group"
    >
      <div
        className="relative bg-mc-card border border-white/5 rounded-mc p-4
                    transition-all duration-200 hover:bg-mc-card-hover hover:border-mc-green/20
                    hover:-translate-y-1 hover:shadow-lg hover:shadow-mc-green/5"
      >
        {/* 图标 + 标题行 */}
        <div className="flex items-start gap-3 mb-3">
          {/* 图标 */}
          <div className="w-12 h-12 rounded-lg bg-mc-bg border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {resource.iconUrl ? (
              <img
                src={resource.iconUrl}
                alt={resource.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-xl">{fallbackIcon()}</span>
            )}
          </div>

          {/* 标题 + 作者 */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-mc-text truncate group-hover:text-mc-green-light transition-colors">
              {resource.name}
            </h3>
            <p className="text-xs text-mc-muted mt-0.5 truncate">
              {resource.author}
            </p>
          </div>
        </div>

        {/* 描述 */}
        <p className="text-xs text-mc-muted line-clamp-2 mb-3 leading-relaxed">
          {resource.summary || '暂无描述'}
        </p>

        {/* 底部信息行 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 平台标签 */}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sourceColor}`}>
              {sourceLabel}
            </span>
            {/* 下载量 */}
            <span className="text-xs text-mc-muted">
              {formatDownloads(resource.downloadCount)} ↓
            </span>
          </div>

          {/* ⋮ 按钮 + 上下文菜单 */}
          <ContextMenu item={resource} favorited={favorited} onFavoritesChanged={onFavoritesChanged} />
        </div>
      </div>
    </Link>
  );
}
