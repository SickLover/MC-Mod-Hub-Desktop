'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RecentlyViewed as RecentlyViewedType } from '@/types';

export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/recently-viewed')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setItems(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('加载最近浏览失败:', err);
        setLoading(false);
      });
  }, []);

  if (loading || items.length === 0) return null;

  const sourceLabel = (source: string) =>
    source === 'curseforge' ? 'CF' : 'MR';
  const sourceColor = (source: string) =>
    source === 'curseforge'
      ? 'bg-orange-500/20 text-orange-400'
      : 'bg-blue-500/20 text-blue-400';

  return (
    <section className="animate-fade-in">
      <h2 className="text-lg font-bold text-mc-text mb-4">最近浏览</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/resource/${item.source}/${item.resourceId}`}
            className="flex items-center gap-3 p-3 bg-mc-card rounded-mc border border-white/5
                       hover:bg-mc-card-hover hover:border-mc-green/20
                       transition-all duration-200 hover:-translate-y-1"
          >
            {/* 图标 */}
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-mc-bg flex-shrink-0 border border-white/5">
              {item.iconUrl ? (
                <img
                  src={item.iconUrl}
                  alt={item.resourceName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-mc-muted text-xs">
                  N/A
                </div>
              )}
            </div>
            {/* 名称 + 来源 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-mc-text font-medium truncate">
                {item.resourceName}
              </p>
              <p className="text-xs text-mc-muted mt-0.5">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sourceColor(item.source)}`}
                >
                  {sourceLabel(item.source)}
                </span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
