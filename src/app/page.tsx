'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ResourceItem, ApiResponse } from '@/types';
import SearchBar from '@/components/home/SearchBar';
import HotSection from '@/components/home/HotSection';
import ResourceCard from '@/components/home/ResourceCard';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import UpdateAlerts from '@/components/home/UpdateAlerts';
import Loading from '@/components/common/Loading';

interface PopularData {
  mod: ResourceItem[];
  shader: ResourceItem[];
  resourcepack: ResourceItem[];
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PopularData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<ResourceItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // 初始加载热门数据
  useEffect(() => {
    fetch('/api/popular')
      .then((res) => res.json())
      .then((json: ApiResponse<PopularData>) => {
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || '加载失败');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // URL 参数恢复搜索状态
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && data) {
      doSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const doSearch = useCallback(
    (query: string) => {
      setIsSearching(true);
      setSearchResults(null);

      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((json: ApiResponse<ResourceItem[]>) => {
          if (json.success && json.data) {
            setSearchResults(json.data);
          } else {
            setSearchResults([]);
          }
        })
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    },
    [],
  );

  const handleSearch = (query: string) => {
    // 同步 URL 参数
    const params = new URLSearchParams(searchParams.toString());
    params.set('q', query);
    router.push(`/?${params.toString()}`, { scroll: false });

    doSearch(query);
  };

  // 搜索进行中
  if (isSearching) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-10 pt-4">
          <SearchBar onSearch={handleSearch} />
        </div>
        <Loading />
      </div>
    );
  }

  // 有搜索结果
  if (searchResults !== null) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-10 pt-4">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* 返回首页 */}
        <button
          onClick={() => {
            router.push('/');
            setSearchResults(null);
          }}
          className="inline-flex items-center gap-1 text-sm text-mc-muted hover:text-mc-green-light transition-colors duration-200 mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          ← 返回首页
        </button>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔍</span>
            <h2 className="text-lg font-bold text-mc-text">
              搜索结果
            </h2>
            <span className="text-xs text-mc-muted ml-2">
              {searchResults.length} 个资源
            </span>
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map((r) => (
                <ResourceCard key={`${r.source}-${r.id}`} resource={r} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-mc-muted text-sm">
              未找到相关资源，换个关键词试试？
            </div>
          )}
        </section>
      </div>
    );
  }

  // 默认热门展示
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 搜索栏 */}
      <div className="mb-10 pt-4">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* 热门内容 */}
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="text-center py-16 text-red-400 text-sm">{error}</div>
      ) : data ? (
        <>
          {/* 最近浏览 */}
          <div className="mb-10">
            <RecentlyViewed />
          </div>

          {/* 更新提醒 */}
          <div className="mb-10">
            <UpdateAlerts />
          </div>

          <HotSection
            title="热门 Mod"
            icon="🔧"
            type="mod"
            resources={data.mod}
          />
          <HotSection
            title="热门光影"
            icon="✨"
            type="shader"
            resources={data.shader}
          />
          <HotSection
            title="热门材质包"
            icon="🎨"
            type="resourcepack"
            resources={data.resourcepack}
          />
        </>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <HomeContent />
    </Suspense>
  );
}