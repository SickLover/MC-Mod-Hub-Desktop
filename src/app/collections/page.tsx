'use client';

import { useState, useEffect } from 'react';
import type { Collection } from '@/types';
import CollectionCard from '@/components/collection/CollectionCard';
import Loading from '@/components/common/Loading';
import { Empty } from '@/components/common/Empty';
import { useToast } from '@/components/common/ToastProvider';
import { fetchGameVersions, getFallbackVersions } from '@/lib/game-versions';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGameVersion, setNewGameVersion] = useState('1.21');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [gameVersions, setGameVersions] = useState<string[]>(getFallbackVersions());
  const toast = useToast();

  const fetchCollections = () => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCollections(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('加载收藏夹列表失败:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCollections();
    fetchGameVersions().then(setGameVersions);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newGameVersion.trim()) return;
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), gameVersion: newGameVersion.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNewName('');
        setShowCreate(false);
        toast?.success('收藏夹已创建');
        fetchCollections();
      } else {
        setCreateError(json.error || '创建失败，请重试');
        toast?.error(json.error || '创建失败');
      }
    } catch (err) {
      console.error('创建收藏夹失败:', err);
      setCreateError('网络错误，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此收藏夹？删除后不可恢复。')) return;
    try {
      await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      toast?.success('收藏夹已删除');
      fetchCollections();
    } catch (err) {
      console.error('删除收藏夹失败:', err);
      toast?.error('删除失败');
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      toast?.success('重命名成功');
      setRenamingId(null);
      fetchCollections();
    } catch (err) {
      console.error('重命名收藏夹失败:', err);
      toast?.error('重命名失败');
    }
  };

  if (loading) return <Loading text="加载收藏夹..." />;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mc-text">📁 我的收藏夹</h1>
          <p className="text-sm text-mc-muted mt-1">管理你的 Mod/光影/材质包收藏</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-mc-green hover:bg-mc-green-dark text-white text-sm rounded-mc
                     transition-all duration-200 flex items-center gap-1.5 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建收藏夹
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 p-4 bg-mc-card border border-white/5 rounded-mc animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="收藏夹名称，如「1.21 生存档」"
              className="flex-1 bg-mc-bg text-mc-text placeholder-mc-muted rounded-lg px-3 py-2 text-sm
                         border border-white/5 focus:outline-none focus:border-mc-green/50 transition-all duration-200"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <select
              value={newGameVersion}
              onChange={(e) => setNewGameVersion(e.target.value)}
              className="w-32 bg-mc-bg text-mc-text rounded-lg px-3 py-2 text-sm
                         border border-white/5 focus:outline-none focus:border-mc-green/50 transition-all duration-200"
            >
              {gameVersions.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newGameVersion.trim()}
              className="px-4 py-2 bg-mc-green hover:bg-mc-green-dark disabled:bg-white/5
                         disabled:text-mc-muted text-white text-sm rounded-lg
                         transition-all duration-200 flex items-center gap-2 active:scale-95"
            >
              {creating ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {creating ? '创建中...' : '创建'}
            </button>
          </div>
          {createError && (
            <p className="text-xs text-red-400 mt-2">{createError}</p>
          )}
        </div>
      )}

      {/* Collection list */}
      {collections.length === 0 ? (
        <Empty message="还没有收藏夹，创建一个吧" icon="📁" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((c) => (
            <div key={c.id} className="relative group">
              <CollectionCard
                collection={c}
                onRename={(id, _name) => {
                  setRenamingId(id);
                  setRenameValue(_name);
                }}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Rename modal */}
      {renamingId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setRenamingId(null)}
        >
          <div
            className="bg-mc-card border border-white/10 rounded-mc p-5 w-96 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-mc-text font-semibold mb-3">重命名收藏夹</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full bg-mc-bg text-mc-text rounded-lg px-3 py-2 text-sm
                         border border-white/5 focus:outline-none focus:border-mc-green/50 mb-3 transition-all duration-200"
              onKeyDown={(e) => e.key === 'Enter' && handleRename(renamingId)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenamingId(null)}
                className="px-3 py-1.5 text-sm text-mc-muted hover:text-mc-text transition-colors duration-200"
              >
                取消
              </button>
              <button
                onClick={() => handleRename(renamingId)}
                className="px-3 py-1.5 text-sm bg-mc-green hover:bg-mc-green-dark text-white rounded-lg transition-all duration-200"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
