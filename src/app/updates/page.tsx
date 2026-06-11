'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Loading from '@/components/common/Loading';
import type { UpdateAlert } from '@/components/home/UpdateAlerts';

const TYPE_ORDER = ['mod', 'shader', 'resourcepack'] as const;
const TYPE_LABELS: Record<string, string> = {
  mod: 'Mod',
  shader: '光影',
  resourcepack: '材质包',
};
const TYPE_ICONS: Record<string, string> = {
  mod: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  shader: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  resourcepack:
    'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
};

export default function UpdatesPage() {
  const [alerts, setAlerts] = useState<UpdateAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/check-updates')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setAlerts(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="加载更新提醒..." />;

  const grouped: Record<string, UpdateAlert[]> = {};
  for (const type of TYPE_ORDER) {
    grouped[type] = alerts.filter((a) => a.resourceType === type);
  }

  const total = alerts.length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="text-mc-muted hover:text-mc-green-light transition-colors duration-200 inline-flex items-center gap-1 mb-3 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>返回首页</span>
        </Link>
        <h1 className="text-2xl font-bold text-mc-text">全部更新提醒</h1>
        <p className="text-sm text-mc-muted mt-1">
          {total === 0 ? '所有资源都是最新版本 ✨' : `共 ${total} 个资源可更新`}
        </p>
      </div>

      {total === 0 ? (
        <div className="text-center py-20 text-mc-muted text-sm">
          所有资源都是最新版本 ✨
        </div>
      ) : (
        TYPE_ORDER.filter((type) => grouped[type].length > 0).map((type) => (
          <section key={type}>
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-mc-green-light"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TYPE_ICONS[type]} />
              </svg>
              <h2 className="text-lg font-bold text-mc-text">
                {TYPE_LABELS[type]}
                <span className="text-sm text-mc-muted ml-2">({grouped[type].length})</span>
              </h2>
            </div>
            <div className="space-y-2">
              {grouped[type].map((alert) => (
                <div
                  key={`${alert.resourceId}-${alert.collectionId}`}
                  className="flex items-center justify-between py-3 px-4 bg-mc-card rounded-mc border border-white/5"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/resource/${alert.source}/${alert.resourceId}`}
                      className="text-sm text-mc-text hover:text-mc-green-light transition-colors duration-200 font-medium"
                    >
                      {alert.resourceName}
                    </Link>
                    <p className="text-xs text-mc-muted mt-0.5">
                      收藏夹:{' '}
                      <Link
                        href={`/collections/${alert.collectionId}`}
                        className="hover:text-mc-green-light transition-colors duration-200"
                      >
                        {alert.collectionName}
                      </Link>
                    </p>
                  </div>
                  <span className="text-xs text-mc-green-light flex-shrink-0 ml-3">
                    新版本: {alert.newVersionName}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
