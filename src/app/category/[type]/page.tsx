'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ResourceItem, ResourceType, ApiResponse } from '@/types';
import ResourceCard from '@/components/home/ResourceCard';
import Loading from '@/components/common/Loading';

const TYPE_LABELS: Record<ResourceType, string> = {
  mod: 'Mod',
  shader: '光影',
  resourcepack: '材质包',
};

const TYPE_ICONS: Record<ResourceType, string> = {
  mod: '🔧',
  shader: '✨',
  resourcepack: '🎨',
};

const PAGE_SIZE = 20;

// ─── Pagination 内联组件 ───────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const [jumpInput, setJumpInput] = useState('');

  const handleJump = () => {
    const p = parseInt(jumpInput, 10);
    if (p >= 1 && p <= totalPages) {
      onPageChange(p);
      setJumpInput('');
    }
  };

  const getPages = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 pt-8 pb-4">
      {/* 上一页 */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm rounded-lg border border-white/10 text-mc-muted hover:text-mc-text hover:border-mc-green/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
      >
        上一页
      </button>

      {/* 页码 */}
      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-mc-muted">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 text-sm rounded-lg border transition-all duration-200 ${
              p === page
                ? 'bg-mc-green/20 border-mc-green/30 text-mc-green-light'
                : 'border-white/5 text-mc-muted hover:border-white/20 hover:text-mc-text'
            }`}
          >
            {p}
          </button>
        ),
      )}

      {/* 下一页 */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm rounded-lg border border-white/10 text-mc-muted hover:text-mc-text hover:border-mc-green/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
      >
        下一页
      </button>

      {/* 跳页 */}
      <div className="flex items-center gap-1.5 ml-4">
        <span className="text-xs text-mc-muted">跳至</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJump()}
          className="w-14 px-2 py-1 text-sm bg-mc-card border border-white/10 rounded-lg text-mc-text text-center focus:outline-none focus:border-mc-green/50 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-xs text-mc-muted">页</span>
      </div>
    </div>
  );
}

// ─── 主页面（Suspense 边界） ────────────────────────────────────

export default function CategoryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CategoryPageContent />
    </Suspense>
  );
}

function CategoryPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = params.type as ResourceType;
  const page = parseInt(searchParams?.get('page') || '1', 10);

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!type) return;

    setLoading(true);
    setError(null);

    fetch(`/api/list?type=${type}&page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => res.json())
      .then((json: ApiResponse<ResourceItem[]> & { total?: number; page?: number; totalPages?: number }) => {
        if (json.success && json.data) {
          setResources(json.data);
          setTotal(json.total || json.data.length);
          setTotalPages(json.totalPages || 1);
        } else {
          setError(json.error || '加载失败');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [type, page]);

  const handlePageChange = (p: number) => {
    router.push(`/category/${type}?page=${p}`);
  };

  const label = TYPE_LABELS[type] || type;
  const icon = TYPE_ICONS[type] || '📦';

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 返回链接 */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-mc-muted hover:text-mc-green-light transition-colors duration-200 mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        ← 返回首页
      </Link>

      {/* 标题 */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-2xl">{icon}</span>
        <h1 className="text-2xl font-bold text-mc-text">{label}</h1>
        {!loading && (
          <span className="text-sm text-mc-muted ml-2">
            共 {total} 个资源
          </span>
        )}
      </div>

      {/* 内容 */}
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="text-center py-16 text-red-400 text-sm">{error}</div>
      ) : resources.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {resources.map((r) => (
              <ResourceCard key={`${r.source}-${r.id}`} resource={r} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : (
        <div className="text-center py-16 text-mc-muted text-sm">
          暂无{label}资源
        </div>
      )}
    </div>
  );
}
