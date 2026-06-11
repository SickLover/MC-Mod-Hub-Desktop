'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export interface UpdateAlert {
  resourceName: string;
  resourceId: string;
  source: string;
  resourceType: string;
  collectionName: string;
  collectionId: string;
  newVersionName: string;
  newVersionId: string;
}

const MAX_VISIBLE = 3;

const TYPE_LABELS: Record<string, string> = {
  mod: 'Mod',
  shader: '光影',
  resourcepack: '材质包',
};

export default function UpdateAlerts() {
  const [alerts, setAlerts] = useState<UpdateAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/check-updates')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setAlerts(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('检查更新提醒失败:', err);
        setLoading(false);
      });
  }, []);

  if (loading || alerts.length === 0) return null;

  return (
    <section className="animate-fade-in">
      <div className="bg-mc-card rounded-mc border border-mc-green/30 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-mc-green-light"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <h2 className="text-lg font-bold text-mc-green-light">
              更新提醒
            </h2>
            <span className="text-xs text-mc-green bg-mc-green/10 px-1.5 py-0.5 rounded">
              {alerts.length}
            </span>
          </div>
          <Link
            href="/updates"
            className="text-xs text-mc-green-light hover:text-mc-green transition-colors duration-200"
          >
            查看全部
          </Link>
        </div>

        {/* Alert list */}
        <div className="space-y-2">
          {alerts.slice(0, MAX_VISIBLE).map((alert, i) => (
            <div
              key={`${alert.resourceId}-${alert.collectionId}-${i}`}
              className="flex items-center justify-between py-2.5 px-3 bg-mc-bg rounded-lg border border-white/5"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/resource/${alert.source}/${alert.resourceId}`}
                  className="text-sm text-mc-text hover:text-mc-green-light transition-colors duration-200 font-medium"
                >
                  {alert.resourceName}
                </Link>
                <p className="text-xs text-mc-muted mt-0.5">
                  {TYPE_LABELS[alert.resourceType] || alert.resourceType}
                  {' · '}收藏夹:{' '}
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
      </div>
    </section>
  );
}
