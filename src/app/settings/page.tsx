'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/common/ToastProvider';

export default function SettingsPage() {
  const toast = useToast();

  const [apiKey, setApiKey] = useState('');
  const [downloadDir, setDownloadDir] = useState('');
  const [checkUpdates, setCheckUpdates] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 从 Electron 或 localStorage 读取已有设置
    if (window.electronAPI) {
      window.electronAPI.getSettings().then((s) => {
        if (s) {
          setApiKey(s.curseforgeApiKey || '');
          setDownloadDir(s.defaultDownloadDir || '');
          setCheckUpdates(s.checkUpdatesOnStartup ?? true);
        }
      });
    } else {
      try {
        const raw = localStorage.getItem('mc-mod-hub-settings');
        if (raw) {
          const s = JSON.parse(raw);
          setApiKey(s.curseforgeApiKey || '');
          setDownloadDir(s.defaultDownloadDir || '');
          setCheckUpdates(s.checkUpdatesOnStartup ?? true);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const settings = {
      curseforgeApiKey: apiKey.trim(),
      defaultDownloadDir: downloadDir,
      checkUpdatesOnStartup: checkUpdates,
    };

    if (window.electronAPI) {
      await window.electronAPI.saveSettings(settings);
      toast?.success('设置已保存');
    } else {
      localStorage.setItem('mc-mod-hub-settings', JSON.stringify(settings));
      toast?.success('设置已保存（浏览器模式）');
    }
    setSaving(false);
  };

  const handlePickDir = async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.selectDir();
      if (dir) setDownloadDir(dir);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* 返回链接 */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-mc-muted hover:text-mc-green-light transition-colors mb-8"
      >
        ← 返回首页
      </Link>

      <h1 className="text-2xl font-bold text-mc-text mb-8">⚙️ 设置</h1>

      {/* API Key 设置 */}
      <section className="bg-mc-card border border-white/5 rounded-mc p-6 mb-6">
        <h2 className="text-base font-semibold text-mc-text mb-1">
          CurseForge API Key
        </h2>
        <p className="text-sm text-mc-muted mb-4">
          从 CurseForge 开发者控制台获取 Key（
          <a
            href="https://console.curseforge.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mc-green-light hover:underline"
          >
            console.curseforge.com
          </a>
          {' → API Keys → 新建'}）。Modrinth 无需 Key。
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="$2a$10$..."
          className="w-full px-4 py-3 bg-mc-bg border border-white/10 rounded-md text-mc-text text-sm placeholder:text-mc-muted/60 focus:outline-none focus:border-mc-green-light transition-colors"
        />
        {mounted && !window.electronAPI && (
          <p className="text-xs text-mc-muted mt-2">
            💡 浏览器模式下，建议在 <code className="text-mc-green-light">.env.local</code> 中设置
            <code className="text-mc-green-light"> CURSEFORGE_API_KEY</code>
          </p>
        )}
      </section>

      {/* 下载目录 */}
      <section className="bg-mc-card border border-white/5 rounded-mc p-6 mb-6">
        <h2 className="text-base font-semibold text-mc-text mb-1">
          默认下载目录
        </h2>
        <p className="text-sm text-mc-muted mb-4">
          批量下载时文件的默认保存位置。
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={downloadDir}
            readOnly
            placeholder="未设置（每次提示选择位置）"
            className="flex-1 px-4 py-3 bg-mc-bg border border-white/10 rounded-md text-mc-text text-sm placeholder:text-mc-muted/60 truncate"
          />
          <button
            type="button"
            onClick={handlePickDir}
            disabled={!mounted || !window.electronAPI}
            className="shrink-0 px-5 py-3 bg-mc-card border border-white/10 rounded-md text-sm text-mc-text hover:bg-mc-card-hover hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            选择文件夹
          </button>
        </div>
        {mounted && !window.electronAPI && (
          <p className="text-xs text-mc-muted mt-2">
            💡 目录选择需在桌面版中使用。
          </p>
        )}
      </section>

      {/* 偏好设置 */}
      <section className="bg-mc-card border border-white/5 rounded-mc p-6 mb-8">
        <h2 className="text-base font-semibold text-mc-text mb-1">偏好设置</h2>
        <p className="text-sm text-mc-muted mb-4">其他行为选项。</p>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checkUpdates}
            onChange={(e) => setCheckUpdates(e.target.checked)}
            className="w-4 h-4 accent-mc-green"
          />
          <span className="text-sm text-mc-text">启动时自动检查收藏夹资源更新</span>
        </label>
      </section>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full sm:w-auto px-8 py-3 bg-mc-green hover:bg-mc-green-dark text-white font-medium text-sm rounded-mc
                   shadow-lg shadow-mc-green/15 active:scale-[0.98] transition-all duration-200
                   disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            保存中...
          </>
        ) : (
          '保存设置'
        )}
      </button>
    </div>
  );
}
