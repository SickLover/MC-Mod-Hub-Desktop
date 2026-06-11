// Electron 预加载脚本暴露给渲染进程的 API 类型声明
interface ElectronAPI {
  getSettings: () => Promise<{
    curseforgeApiKey: string;
    defaultDownloadDir: string;
    checkUpdatesOnStartup: boolean;
  } | null>;
  saveSettings: (settings: {
    curseforgeApiKey: string;
    defaultDownloadDir: string;
    checkUpdatesOnStartup: boolean;
  }) => Promise<void>;
  selectDir: () => Promise<string | null>;
  getAppVersion: () => string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
