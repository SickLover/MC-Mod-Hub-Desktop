# 开发执行 Prompt — MC Mod Hub 桌面版 Step 9

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 项目背景

MC Mod Hub 桌面版是一个 Windows 桌面软件，帮 Minecraft 玩家从 CurseForge 和 Modrinth 搜索模组/光影/材质包，管理收藏夹，批量下载。基于 Electron + Next.js 14。整个项目分为 **10 个独立步骤**开发，本文档是 **Step 9**。

## 当前状态

Step 1-8 已完成。前端功能已全部就绪：搜索、热门、详情、下载、收藏夹 CRUD、批量下载（zip+folder）、最近浏览、更新提醒、名称解析。

**但**：目前只能在浏览器中通过 `npm run dev` 使用。本步将其变为真正的桌面 App。

| 关键文件 | 状态 |
|------|------|
| `package.json` | ✅ 有 next/react/sql.js/jszip，**无 electron 相关依赖和脚本** |
| `next.config.js` | ✅ `output: 'standalone'` |
| `src/app/settings/page.tsx` | ⚠️ **占位**（⚙️ 图标 + "设置功能将在后续阶段实现"） |
| `src/lib/curseforge.ts` | ✅ 从 `process.env.CURSEFORGE_API_KEY` 读取 Key |
| `src/components/resource/DownloadButton.tsx` | ✅ blob+createObjectURL 触发浏览器下载 |
| `electron/` | ❌ **目录不存在** |
| `electron-builder.yml` | ❌ **不存在** |

## 当前目标

**Step 9：设置页 + Electron 壳** — Electron 窗口能打开，设置页可填 API Key 和下载目录，下载时弹出系统原生"保存文件"对话框。

## 需要创建的文件

```
electron/main.ts                      — Electron 主进程（启动 Next.js → 创建窗口）
electron/preload.ts                   — 预加载脚本（暴露设置/文件对话框 API）
```

## 需要修改/覆盖的文件

```
package.json                          — 新增 electron 依赖 + scripts
src/app/settings/page.tsx             — 占位→完整设置页
src/lib/curseforge.ts                 — API Key 优先从 Electron 设置读取
src/components/resource/DownloadButton.tsx  — 使用 Electron 保存对话框
```

## 开发步骤

### 1. 安装 Electron 依赖

在 `package.json` 中添加：

```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "electron:dev": "electron .",
    "package": "electron-builder"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

然后运行 `npm install`。

> **注意**：`electron/main.js`（不是 `.ts`）—— Electron 主进程通常用 CommonJS。如果用 TS 需要额外编译步骤。为了简化，**Electron 主进程文件用 `.js` 后缀，写 CommonJS 风格**（`require` 而非 `import`）。

### 2. 创建 Electron 主进程 — `electron/main.js`

用 CommonJS 风格：

```js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

// 设置文件路径
const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');

// ...
```

**启动流程**：
1. App ready 后 → `spawn` 启动 Next.js standalone server
   - 开发模式：直接用 `next dev` 或连接到已有的 localhost:3000
   - **第一阶段简化**：选择固定端口 3000，要求用户先手动 `npm run dev`，Electron 只是加载 `http://localhost:3000`
2. 轮询等待服务器就绪（尝试 `http.get` 直到响应 200）
3. 创建 BrowserWindow（标题 "MC Mod Hub"，暗色背景 `#1a1a1a`）
4. 加载 `http://localhost:3000`
5. 窗口关闭时 app.quit()

**IPC 处理**（`ipcMain.handle`）：
- `getSettings`：读取 `settingsPath` JSON 文件，不存在返回默认值
- `saveSettings`：写入 `settingsPath` JSON 文件
- `selectDir`：打开 `dialog.showOpenDialog({ properties: ['openDirectory'] })` 选择下载目录
- `saveFile`：打开 `dialog.showSaveDialog({ defaultPath: fileName })` 让用户选保存位置，返回选中路径

**简化建议**：第一版 Electron 只做两件事：
1. 开一个窗口加载 `http://localhost:3000`
2. 提供 IPC 让前端能调原生对话框

不需要自动启动 Next.js server（太复杂）。用户先 `npm run dev`，然后 `npm run electron:dev`。

### 3. 创建预加载脚本 — `electron/preload.js`

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('getSettings'),
  saveSettings: (settings) => ipcRenderer.invoke('saveSettings', settings),
  selectDir: () => ipcRenderer.invoke('selectDir'),
  saveFile: (defaultName) => ipcRenderer.invoke('saveFile', defaultName),
  getAppVersion: () => '1.0.0',
});
```

在 `main.js` 创建 BrowserWindow 时指定：
```js
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
}
```

### 4. 创建设置页 — `src/app/settings/page.tsx`

覆盖占位实现。`'use client'`。

**内容**：
- CurseForge API Key 输入框（`type="password"` 遮罩显示）
- 默认下载目录选择（按钮 + 显示当前路径）
- 启动时检查更新复选框
- 保存按钮
- 保存成功后 Toast 提示

**实现**：
```ts
const [apiKey, setApiKey] = useState('');
const [downloadDir, setDownloadDir] = useState('');
const [checkUpdates, setCheckUpdates] = useState(true);

useEffect(() => {
  // 从 Electron 读取设置
  if (window.electronAPI) {
    window.electronAPI.getSettings().then((s) => {
      if (s) {
        setApiKey(s.curseforgeApiKey || '');
        setDownloadDir(s.defaultDownloadDir || '');
        setCheckUpdates(s.checkUpdatesOnStartup ?? true);
      }
    });
  }
}, []);

const handleSave = async () => {
  if (window.electronAPI) {
    await window.electronAPI.saveSettings({
      curseforgeApiKey: apiKey.trim(),
      defaultDownloadDir: downloadDir,
      checkUpdatesOnStartup: checkUpdates,
    });
    toast?.success('设置已保存');
  } else {
    // 浏览器回退：存 localStorage
    localStorage.setItem('settings', JSON.stringify({...}));
    toast?.success('设置已保存（浏览器模式）');
  }
};

const handlePickDir = async () => {
  if (window.electronAPI) {
    const dir = await window.electronAPI.selectDir();
    if (dir) setDownloadDir(dir);
  }
};
```

**UI**：
- 页面上方标题 + "← 返回首页"
- 三块设置区域（卡片式，`bg-mc-card rounded-mc`）：
  1. API Key 设置（带说明：CurseForge 账号 → console.curseforge.com → API Keys → 新建）
  2. 下载目录设置（路径 + "选择文件夹" 按钮）
  3. 偏好设置（启动检查更新 checkbox）
- 底部保存按钮（苦力怕绿）

### 5. 修改 API Key 读取 — `src/lib/curseforge.ts`

当前 `getApiKey()` 只从 `process.env.CURSEFORGE_API_KEY` 读取。需要改为：

```ts
function getApiKey(): string | null {
  // 优先级 1: 环境变量（开发模式）
  if (process.env.CURSEFORGE_API_KEY) return process.env.CURSEFORGE_API_KEY;
  
  // 优先级 2: Electron 设置（生产模式）
  // 注意：这里不能直接调 window.electronAPI（server 端）
  // 改用全局变量或 process.env 注入
  // 简单方案：Electron 主进程启动时将设置注入 process.env
  return null;
}
```

**推荐方案**：不修改 `curseforge.ts`。改为在 Electron 主进程启动 Next.js 时注入环境变量：

```js
// 在 main.js 中启动 Next.js 时
const settings = readSettings();
process.env.CURSEFORGE_API_KEY = settings.curseforgeApiKey || '';
```

但由于我们第一版用"先手动 `npm run dev`"的方式，这个注入暂时做不了。

**更简单的方案**：在 API Route 层面做 fallback。修改每个 API Route（只需改 popular 和 search 这两个最常用的）：

不，这改动范围太大。换个思路——

**最简方案**：不修改 `curseforge.ts`。在设置页保存后，如果是在浏览器模式（无 Electron），将 API Key 存到 `localStorage`。API 调用时每个路由从 query 参数或 header 中读取…… 这也很麻烦。

**实际最简单的可行方案**：
1. 保持 `curseforge.ts` 从 `process.env.CURSEFORGE_API_KEY` 读
2. Electron 主进程中，启动前将 settings 中的 apiKey 写入一个新的 `.env.electron` 文件或直接设 `process.env`
3. 但因为我们先手动 `npm run dev`，用户需要在 `.env.local` 中配置 Key

**结论**：本步先保持 API Key 从 `.env.local` 读取。设置页的 API Key 保存功能先做 UI，实际生效留给 Step 10（打包时 Electron 自动注入环境变量）。设置页保存的 settings.json 里的 apiKey 在打包后会由 main.js 读取并注入。

本步设置页的保存按钮先做以下回退：
- 有 Electron → 保存到 `%APPDATA%/mc-mod-hub/settings.json`
- 无 Electron（浏览器） → 提示"请配置 .env.local 中的 CURSEFORGE_API_KEY"

### 6. 修改下载按钮 — `src/components/resource/DownloadButton.tsx`

当前用 `blob + createObjectURL + <a> click` 触发下载。改为：

```ts
const handleDownload = async () => {
  if (!version) return;
  setDownloading(true);

  try {
    const params = new URLSearchParams({...});
    const response = await fetch(`/api/download?${params.toString()}`);

    if (!response.ok) { /* error handling */ }

    const blob = await response.blob();

    // 尝试用 Electron 原生保存对话框
    if (window.electronAPI) {
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      
      const filePath = await window.electronAPI.saveFile(version.fileName);
      if (filePath) {
        // 需要 IPC 写文件——新增一个 IPC 方法 writeFile
        // 简化：Electron 环境下仍用 blob 下载，用户手动移文件
      }
    }
    
    // Fallback: 浏览器 blob 下载（保持原有逻辑）
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = version.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onSuccess?.();
  } catch (err) { ... }
};
```

**简化方案**：Electron 模式下直接在 blob 下载后，文件保存在浏览器默认下载目录。第一版不做 Electron 自定义保存对话框。这个功能很难做（需要 IPC 传大量二进制数据）。

**结论**：Step 9 保持现有 blob 下载逻辑不变。仅确保 Electron 窗口内的下载能正常工作。等打包后测试，如果下载行为正常就不改。

实际需要改的只是：在 `preload.js` 中可以不暴露 `saveFile`（太复杂）。只暴露 `selectDir`、`getSettings`、`saveSettings`。

### 7. 补充类型声明

创建 `src/types/electron.d.ts`：

```ts
interface ElectronAPI {
  getSettings: () => Promise<{ curseforgeApiKey: string; defaultDownloadDir: string; checkUpdatesOnStartup: boolean } | null>;
  saveSettings: (settings: { curseforgeApiKey: string; defaultDownloadDir: string; checkUpdatesOnStartup: boolean }) => Promise<void>;
  selectDir: () => Promise<string | null>;
  getAppVersion: () => string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
```

这样 TypeScript 不会在 `window.electronAPI` 上报错。

## 可参考的文件

| 文件 | 参考内容 |
|------|----------|
| `technical-design.md` 第 3 节 | Electron 层实现方案 |
| `technical-design.md` 第 7 节 | 用户设置方案（settings.json 格式） |

## 约束条件

- 不修改 Step 1-8 已完成的核心文件（修改仅限于上面标明的 4 个文件）
- `electron/main.js` 和 `electron/preload.js` 用 CommonJS（`.js` 文件，`require`）
- 第一版 Electron 不自动启动 Next.js server——用户先 `npm run dev`，再 `npm run electron:dev`
- 下载逻辑暂不改（保持 blob 方式，打包后测试再决定）
- API Key 读取暂不修改——开发模式继续用 `.env.local`
- 设置页在无 Electron 环境时用 localStorage 回退
- 所有 UI 用 `mc-*` 样式

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | `npm run dev` 能启动 Next.js | localhost:3000 正常访问 |
| 2 | `npm run electron:dev` 能打开窗口 | Electron 窗口显示首页内容 |
| 3 | 窗口标题为 "MC Mod Hub" | 标题栏显示正确 |
| 4 | 窗口内所有功能正常 | 搜索/浏览/下载/收藏夹在 Electron 窗口中都能用 |
| 5 | 设置页能打开 | 导航栏点"设置"→看到完整设置页 |
| 6 | 设置页保存成功 | 填 Key + 选目录 + 保存 → Toast "设置已保存" |
| 7 | 设置读取回显 | 保存后刷新页面 → 设置页显示之前保存的值 |
| 8 | 目录选择对话框弹出 | 点"选择文件夹" → 系统原生文件夹选择对话框弹出 |
| 9 | 无 Electron 时回退正常 | 浏览器中打开设置页 → 保存到 localStorage → 刷新回显 |
| 10 | `npm run build` 成功 | 无类型或编译错误 |

## 完成后

完成后告诉我：Step 9 已完成，可以进入 Step 10（最后一步：打包发布）。并简要说明实际执行中做了哪些与计划不同的改动（如果有）。

---

> 历史步骤存档：`prompts/step-01.md` ~ `prompts/step-08.md`。复盘时直接查看对应文件。

---

## 实际执行记录

### 相比原计划

- **多做了**：
  - `electron/main.js` 完整实现：DEFAULT_SETTINGS + readSettings/writeSettings + IPC handles（getSettings/saveSettings/selectDir）+ 窗口创建（1280x800, min 800x600, autoHideMenuBar, #1a1a1a 背景）+ 生命周期管理
  - `electron/preload.js`：contextBridge 暴露 getSettings/saveSettings/selectDir/getAppVersion
  - `src/types/electron.d.ts`：ElectronAPI 接口 + Window 全局类型声明
  - 设置页完整实现：3 块卡片（API Key+下载目录+偏好设置），Electron 用 IPC 读写，浏览器用 localStorage('mc-mod-hub-settings') 回退，mounted 防 hydration 差异
  - 设置页浏览器/Electron 模式区分提示（💡 tips）
  - API Key 输入用 `type=password` 遮罩
- **少做了**：
  - 下载按钮未修改（保持 blob 下载逻辑，Step 9 prompt 明确说明简化）
  - API Key 读取逻辑未修改（保持 .env.local，Step 9 prompt 明确说明暂不改）
- **改动点**：
  - `package.json` 新增 main/electron:dev/package + electron 依赖（^28）+ electron-builder（^24）

### 实际新增文件

| 文件 | 说明 |
|------|------|
| `electron/main.js` | CJS 主进程：IPC(3 handles) + 窗口(1280x800) + settings 读写 |
| `electron/preload.js` | contextBridge 暴露 4 个 electronAPI 方法 |
| `src/types/electron.d.ts` | ElectronAPI 接口 + Window 全局扩展 |

### 实际修改文件

| 文件 | 改动 |
|------|------|
| `package.json` | 新增 main/electron:dev/package + electron 28 + electron-builder 24 |
| `src/app/settings/page.tsx` | 占位→完整设置页（3 卡片 + IPC/localStorage 双模式 + mounted 防护） |

### 关键设计决策记录

- Electron 不自动启动 Next.js（用户先 npm run dev 再 npm run electron:dev）
- 下载按钮保持 blob 方式（打包后测试再决定）
- API Key 开发模式继续用 .env.local，设置页保存到 Electron userData（%APPDATA%/{appName}/settings.json）

---

## 已知 Bug（Step 10 前需修复）

### Bug A — ContextMenu 被下方卡片遮挡
- **现象**：点击资源卡片的 ⋮ → 收藏夹选择弹出层被下方卡片遮挡一部分
- **根因**：弹出层渲染在卡片 DOM 内（absolute + z-20），下方卡片的自然层叠顺序更靠后
- **修法**：用 React Portal（createPortal）将弹出层渲染到 document.body，脱离卡片层叠上下文

### Bug B — 热门板块缺"查看全部"
- **现象**：首页三个热门板块只展示 10 张卡片，没有跳转到全量列表的入口
- **根因**：HotSection 组件缺少链接（`/category/[type]` 已存在且功能完整）
- **修法**：HotSection 标题行右侧加"查看全部 →"链接
