'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ResourceItem, Collection } from '@/types';
import { useToast } from '@/components/common/ToastProvider';

interface ContextMenuProps {
  item: ResourceItem;
  favorited?: boolean;
  onFavoritesChanged?: () => void;
}

// 全局关闭回调，确保同一时间只有一个菜单打开
let globalCloseCallback: (() => void) | null = null;

export default function ContextMenu({ item, favorited = false, onFavoritesChanged }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [adding, setAdding] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // 关闭自己
  const close = useCallback(() => {
    setOpen(false);
    setShowCollectionPicker(false);
    if (globalCloseCallback === close) {
      globalCloseCallback = null;
    }
  }, []);

  // 打开菜单
  const openMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 关闭其他已打开的菜单
    if (globalCloseCallback && globalCloseCallback !== close) {
      globalCloseCallback();
    }

    // 检测是否需要向上弹出 & 计算 Portal 位置
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuAbove = spaceBelow < 280;

      setMenuStyle({
        position: 'fixed',
        top: menuAbove ? rect.top - 8 : rect.bottom + 8,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      });
    }

    setOpen(true);
    globalCloseCallback = close;
  }, [close]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const clickedInsideButton = ref.current && ref.current.contains(e.target as Node);
      const clickedInsideMenu = menuRef.current && menuRef.current.contains(e.target as Node);
      if (!clickedInsideButton && !clickedInsideMenu) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  const handleAddToCollection = async (collectionId: string, collectionName: string) => {
    setAdding(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType: item.type,
          resourceId: item.id,
          resourceName: item.name,
          source: item.source,
          iconUrl: item.iconUrl,
        }),
      });
      if (res.ok) {
        toast?.success(`已添加到 ${collectionName}`);
        onFavoritesChanged?.();
      } else if (res.status === 409) {
        toast?.info('该资源已在收藏夹中');
      } else {
        toast?.error('添加失败');
      }
    } catch (err) {
      console.error('添加到收藏夹失败:', err);
      toast?.error('添加失败');
    }
    setAdding(false);
    close();
  };

  const handleRemoveFromCollection = async () => {
    try {
      // 先获取该资源所在的收藏夹
      const checkRes = await fetch(`/api/collections/favorited?source=${item.source}&resourceIds=${item.id}`);
      const checkJson = await checkRes.json();
      const favoritedMap = checkJson.data || {};
      // 如果已收藏，需要找到所在收藏夹并移除
      // 先从 collections API 获取所有收藏夹，然后尝试从每个收藏夹移除
      const collRes = await fetch('/api/collections');
      const collJson = await collRes.json();
      const allCollections: Collection[] = collJson.data || [];

      let removed = false;
      for (const coll of allCollections) {
        const removeRes = await fetch('/api/collections/remove-resource', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionId: coll.id, resourceId: item.id, source: item.source }),
        });
        if (removeRes.ok) {
          const removeJson = await removeRes.json();
          if (removeJson.success) {
            toast?.success('已从收藏夹移除');
            removed = true;
            break;
          }
        }
      }
      if (!removed) {
        toast?.error('移除失败');
      }
      onFavoritesChanged?.();
    } catch (err) {
      console.error('从收藏夹移除失败:', err);
      toast?.error('移除失败');
    }
    close();
  };

  const openCollectionPicker = async () => {
    try {
      const res = await fetch('/api/collections');
      const json = await res.json();
      setCollections(json.data || []);
    } catch (err) {
      console.error('加载收藏夹列表失败:', err);
      setCollections([]);
    }
    setShowCollectionPicker(true);
  };

  return (
    <div ref={ref} className="absolute bottom-3 right-3 z-10">
      {/* ⋮ 按钮 */}
      <button
        ref={buttonRef}
        onClick={openMenu}
        className="w-7 h-7 flex items-center justify-center rounded-md
                   text-mc-muted hover:text-mc-text hover:bg-white/5
                   transition-colors duration-200"
        title="更多操作"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {/* 下拉菜单 — 通过 Portal 渲染到 body，避免被卡片层叠上下文遮挡 */}
      {createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className={`fixed w-48 bg-mc-card border border-white/10 rounded-lg py-1.5 shadow-xl
                     transition-all duration-200 ${
                       open
                         ? 'opacity-100 scale-100'
                         : 'opacity-0 scale-95 pointer-events-none'
                     }`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {showCollectionPicker ? (
            <>
              <div className="px-3 py-1.5 text-xs text-mc-muted border-b border-white/5 mb-1">
                选择收藏夹
              </div>
              {adding && (
                <div className="px-3 py-2 text-xs text-mc-muted flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/20 border-t-mc-green rounded-full animate-spin" />
                  添加中...
                </div>
              )}
              {!adding && collections.length === 0 && (
                <div className="px-3 py-2 text-xs text-mc-muted">暂无收藏夹</div>
              )}
              {!adding && collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAddToCollection(c.id, c.name)}
                  className="w-full text-left px-4 py-2 text-sm text-mc-text hover:text-white hover:bg-white/5 transition-colors duration-200"
                >
                  {c.name}
                  <span className="text-xs text-mc-muted ml-2">({c.gameVersion})</span>
                </button>
              ))}
              <button
                onClick={() => setShowCollectionPicker(false)}
                className="w-full text-left px-4 py-2 text-sm text-mc-muted hover:text-mc-text transition-colors duration-200 border-t border-white/5 mt-1"
              >
                ← 返回
              </button>
            </>
          ) : (
            <>
              {favorited ? (
                <button
                  onClick={handleRemoveFromCollection}
                  className="w-full text-left px-4 py-2 text-sm text-mc-text hover:text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  从收藏夹移除
                </button>
              ) : (
                <button
                  onClick={openCollectionPicker}
                  className="w-full text-left px-4 py-2 text-sm text-mc-text hover:text-white hover:bg-white/5 transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-mc-green-light flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  添加到收藏夹
                </button>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
