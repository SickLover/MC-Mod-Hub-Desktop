'use client';

import Link from 'next/link';
import type { Collection } from '@/types';

interface CollectionCardProps {
  collection: Collection;
  itemCount?: number;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function CollectionCard({ collection, itemCount, onRename, onDelete }: CollectionCardProps) {
  const formattedDate = new Date(collection.updatedAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="block group"
    >
      <div className="relative bg-mc-card border border-white/5 rounded-mc p-5
                      transition-all duration-200 hover:bg-mc-card-hover hover:border-mc-green/20
                      hover:-translate-y-1 hover:shadow-lg hover:shadow-mc-green/5">
        {/* 图标 + 操作按钮 */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 bg-mc-green/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-mc-green-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>

          {/* Hover 操作按钮 */}
          <div
            className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRename(collection.id, collection.name);
              }}
              className="p-1.5 bg-mc-bg rounded-lg text-mc-muted hover:text-mc-text transition-colors duration-200"
              title="重命名"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(collection.id);
              }}
              className="p-1.5 bg-mc-bg rounded-lg text-mc-muted hover:text-red-400 transition-colors duration-200"
              title="删除"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 名称 */}
        <h3 className="text-base font-semibold text-mc-text truncate group-hover:text-mc-green-light transition-colors mb-1.5">
          {collection.name}
        </h3>

        {/* 游戏版本 + 资源数量 */}
        <div className="flex items-center gap-3 text-xs text-mc-muted">
          <span className="inline-flex items-center gap-1">
            <span className="text-mc-green-light">MC</span>
            {collection.gameVersion}
          </span>
          {itemCount !== undefined && (
            <span>{itemCount} 个资源</span>
          )}
        </div>

        {/* 更新日期 */}
        <p className="text-[11px] text-mc-muted/60 mt-2">
          更新于 {formattedDate}
        </p>
      </div>
    </Link>
  );
}
