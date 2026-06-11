'use client';

import { useState } from 'react';
import { VersionFile, ResourceDetail } from '@/types';

interface DownloadButtonProps {
  resource: ResourceDetail;
  version: VersionFile | null;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export default function DownloadButton({
  resource,
  version,
  onSuccess,
  onError,
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!version) return;

    setDownloading(true);

    const params = new URLSearchParams({
      source: resource.source,
      fileId: version.id,
      fileName: version.fileName,
    });

    if (resource.source === 'curseforge') {
      params.set('modId', resource.id);
    }

    try {
      const response = await fetch(`/api/download?${params.toString()}`);

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        const msg = json?.error || `Download failed (${response.status})`;
        onError?.(msg);
        setDownloading(false);
        return;
      }

      // Stream the response to a blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = version.fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      onSuccess?.();
    } catch (err) {
      console.error('Download error:', err);
      onError?.('Network error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={!version || downloading}
      className={`w-full md:w-auto px-6 py-3 rounded-mc font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
        version
          ? 'bg-mc-green hover:bg-mc-green-dark text-white shadow-lg shadow-mc-green/15 active:scale-[0.98]'
          : 'bg-mc-card text-mc-muted cursor-not-allowed border border-white/5'
      }`}
    >
      {downloading ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          下载中...
        </>
      ) : version ? (
        <>
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          下载 {version.fileName}
        </>
      ) : (
        '请先选择版本'
      )}
    </button>
  );
}
