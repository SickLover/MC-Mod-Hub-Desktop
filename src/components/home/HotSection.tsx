import Link from 'next/link';
import type { ResourceItem, ResourceType } from '@/types';
import ResourceCard from './ResourceCard';
import Empty from '@/components/common/Empty';

interface HotSectionProps {
  title: string;
  icon: string;
  type: ResourceType;
  resources: ResourceItem[];
}

export default function HotSection({ title, icon, type, resources }: HotSectionProps) {
  return (
    <section className="mb-10">
      {/* 板块标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h2 className="text-lg font-bold text-mc-text">{title}</h2>
          {resources.length > 0 && (
            <span className="text-xs text-mc-muted ml-2">
              {resources.length} 个资源
            </span>
          )}
        </div>
        {resources.length > 0 && (
          <Link
            href={`/category/${type}`}
            className="text-xs text-mc-muted hover:text-mc-green-light transition-colors duration-200 flex items-center gap-1 flex-shrink-0"
          >
            查看全部
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* 卡片网格 */}
      {resources.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {resources.slice(0, 6).map((r) => (
            <ResourceCard key={`${r.source}-${r.id}`} resource={r} />
          ))}
        </div>
      ) : (
        <Empty message={`暂无热门${title}`} />
      )}
    </section>
  );
}
