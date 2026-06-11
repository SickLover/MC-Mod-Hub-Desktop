'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ResourceDetail, VersionFile } from '@/types';
import ResourceHeader from '@/components/resource/ResourceHeader';
import VersionSelector from '@/components/resource/VersionSelector';
import DownloadButton from '@/components/resource/DownloadButton';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const source = params?.source as string;
  const id = params?.id as string;

  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);
    },
    [],
  );

  useEffect(() => {
    if (!source || !id) return;

    setLoading(true);
    fetch(`/api/resource/${source}/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setResource(res.data);
          // Auto-select first release version, or first version
          const versions: VersionFile[] = res.data.versions || [];
          const firstRelease = versions.find((v) => v.releaseType === 'release');
          setSelectedVersionId(firstRelease?.id || versions[0]?.id || null);

          // 记录浏览
          fetch('/api/recently-viewed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resourceType: res.data.type,
              resourceId: res.data.id,
              resourceName: res.data.name,
              source: res.data.source,
              iconUrl: res.data.iconUrl,
            }),
          }).catch(() => {});
        } else {
          setError(res.error || 'Failed to load resource');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load resource detail:', err);
        setError('Network error');
        setLoading(false);
      });
  }, [source, id]);

  const selectedVersion =
    resource?.versions.find((v) => v.id === selectedVersionId) || null;

  if (loading) return <Loading text="加载资源详情..." />;

  if (error || !resource) {
    return (
      <div className="py-20 text-center">
        <p className="text-mc-muted mb-4">{error || '资源不存在'}</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-mc-green-light hover:text-mc-green transition-colors duration-200"
        >
          ← 返回
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-mc-muted hover:text-mc-green-light transition-colors duration-200 mb-6"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        ← 返回
      </button>

      {/* Header */}
      <ResourceHeader resource={resource} />

      {/* Description */}
      {resource.description && (
        <div className="mb-8 p-5 bg-mc-card rounded-mc border border-white/5">
          <h3 className="text-sm font-semibold text-mc-muted mb-3">描述</h3>
          <div className="text-sm text-mc-text leading-relaxed whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
            {resource.description}
          </div>
          {resource.description.length < 200 && (
            <p className="mt-3 text-xs text-mc-muted flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              完整描述请查看{' '}
              <a
                href={resource.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-mc-green-light hover:underline"
              >
                {resource.source === 'curseforge' ? 'CurseForge' : 'Modrinth'}
              </a>{' '}
              源页面
            </p>
          )}
        </div>
      )}

      {/* Version selector */}
      {resource.versions.length > 0 && (
        <div className="mb-6">
          <div className="bg-mc-bg rounded-mc border border-white/5 p-5">
            <VersionSelector
              versions={resource.versions}
              selectedId={selectedVersionId}
              onSelect={(v) => setSelectedVersionId(v.id)}
            />
          </div>
        </div>
      )}

      {/* Download button */}
      <div className="flex items-center gap-4">
        <DownloadButton
          resource={resource}
          version={selectedVersion}
          onSuccess={() => showToast('下载完成！', 'success')}
          onError={(msg) => showToast(msg, 'error')}
        />
        {selectedVersion && (
          <span className="text-xs text-mc-muted">
            共 {resource.versions.length} 个版本
          </span>
        )}
      </div>

      {/* Toast */}
      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}
