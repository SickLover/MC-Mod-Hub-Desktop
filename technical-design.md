# 技术方案文档 — MC Mod Hub 桌面版

## 1. 推荐技术栈

| 层级 | 技术 | 为什么这么选 |
|------|------|-------------|
| 桌面框架 | **Electron** | 最成熟的 Web 转桌面方案。可以几乎不改动现有 Next.js 代码，直接包进桌面窗口运行 |
| 前端 | **Next.js 14（App Router）** | 复用网页版全部页面和组件，Server Component + Client Component 混合 |
| 语言 | **TypeScript** | 全项目统一，类型安全 |
| 样式 | **Tailwind CSS** | 快速开发，Minecraft 风格自定义色板 |
| 数据库 | **SQLite（sql.js）** | 纯 JS 实现，数据存用户本地电脑，无需安装任何数据库 |
| 打包工具 | **electron-builder** | 把 Electron + Next.js 打包成 Windows .exe 安装包 |
| 外部 API | CurseForge API + Modrinth API | 模组数据来源 |

### 为什么选 Electron 而不是 Tauri

| 对比项 | Electron | Tauri |
|--------|----------|-------|
| 代码复用 | 直接复用现有 Next.js 代码 | 需要大量改写 |
| 开发速度 | 快，改动小 | 慢，需要适配 |
| 安装包大小 | ~150MB（含 Chromium） | ~10MB |
| 内存占用 | 较高 | 较低 |
| 生态成熟度 | 非常成熟 | 较新 |

**结论**：第一版选 Electron。用户是小范围朋友，安装包大小和内存占用不是核心问题。最重要的是快速把网页版功能搬过来，改动越少越好。

---

## 2. 项目目录结构

```
MC-Mod-Hub/
├── package.json                  # 项目依赖 + Electron 入口配置
├── next.config.js                # Next.js 配置（standalone 模式）
├── tailwind.config.ts            # Tailwind CSS 配置（苦力怕绿色主题）
├── tsconfig.json                 # TypeScript 配置
├── postcss.config.js             # PostCSS 配置
├── electron-builder.yml          # electron-builder 打包配置
├── .env.local                    # 开发环境变量（不提交到 git）
├── .gitignore                    # Git 忽略规则
├── data/                         # 运行时生成
│   └── app.db                    # SQLite 数据库文件（自动创建）
├── electron/                     # Electron 主进程代码
│   ├── main.ts                   # 主进程入口（创建窗口、启动 Next.js）
│   └── preload.ts                # 预加载脚本（暴露安全 API 给前端）
├── src/                          # Next.js 应用代码（复用网页版结构）
│   ├── app/
│   │   ├── globals.css           # 全局样式（Minecraft 暗色主题）
│   │   ├── layout.tsx            # 根布局
│   │   ├── page.tsx              # 首页
│   │   ├── settings/
│   │   │   └── page.tsx          # 设置页（API Key、下载目录）
│   │   ├── category/
│   │   │   └── [type]/
│   │   │       └── page.tsx      # 分类浏览页
│   │   ├── collections/
│   │   │   ├── page.tsx          # 收藏夹列表页
│   │   │   └── [id]/
│   │   │       └── page.tsx      # 收藏夹详情页
│   │   ├── resource/
│   │   │   └── [source]/
│   │   │       └── [id]/
│   │   │           └── page.tsx  # 资源详情页
│   │   ├── updates/
│   │   │   └── page.tsx          # 更新提醒页
│   │   └── api/
│   │       ├── search/route.ts
│   │       ├── popular/route.ts
│   │       ├── list/route.ts
│   │       ├── resource/[source]/[id]/route.ts
│   │       ├── download/route.ts
│   │       ├── batch-download/route.ts
│   │       ├── check-updates/route.ts
│   │       ├── game-versions/route.ts
│   │       ├── resolve-names/route.ts
│   │       ├── recently-viewed/route.ts
│   │       └── collections/
│   │           ├── route.ts
│   │           ├── favorited/route.ts
│   │           ├── remove-resource/route.ts
│   │           └── [id]/
│   │               ├── route.ts
│   │               └── items/route.ts
│   ├── components/
│   │   ├── layout/Navbar.tsx
│   │   ├── home/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── HotSection.tsx
│   │   │   ├── ResourceCard.tsx
│   │   │   ├── ContextMenu.tsx
│   │   │   ├── RecentlyViewed.tsx
│   │   │   └── UpdateAlerts.tsx
│   │   ├── resource/
│   │   │   ├── ResourceHeader.tsx
│   │   │   ├── VersionSelector.tsx
│   │   │   └── DownloadButton.tsx
│   │   ├── collection/
│   │   │   ├── CollectionCard.tsx
│   │   │   ├── ItemRow.tsx
│   │   │   └── CompatibilityCheck.tsx
│   │   └── common/
│   │       ├── Loading.tsx
│   │       ├── Empty.tsx
│   │       └── Toast.tsx
│   ├── lib/
│   │   ├── db.ts                 # SQLite 数据库操作
│   │   ├── curseforge.ts         # CurseForge API 封装
│   │   ├── modrinth.ts           # Modrinth API 封装
│   │   ├── merger.ts             # 两平台结果合并
│   │   ├── format.ts             # 格式化工具
│   │   └── game-versions.ts      # 游戏版本映射
│   └── types/
│       └── index.ts              # TypeScript 类型定义
├── public/
│   ├── icon.png                  # 应用图标（256x256）
│   └── favicon.ico
├── requirements.md               # 需求文档
├── technical-design.md           # 本文件
├── AGENTS.md                     # AI 编程规则
└── prompt.md                     # 开发执行 Prompt（Step 1）
```

---

## 3. Electron 层实现方案

### 3.1 启动流程

```
用户双击 MC-Mod-Hub.exe
  → Electron 主进程启动（electron/main.ts）
  → 主进程启动 Next.js standalone 服务器（localhost:随机端口）
  → 等待服务器就绪（轮询检查）
  → 创建 BrowserWindow，加载 http://localhost:PORT
  → 用户看到首页
  → 关闭窗口时，主进程关闭 Next.js 服务器，退出
```

### 3.2 主进程职责（electron/main.ts）

- 启动 Next.js standalone server
- 管理窗口生命周期（创建、关闭、最小化、全屏）
- 设置窗口标题为 "MC Mod Hub"
- 设置窗口图标
- 注册 IPC 通道，供前端调用原生功能

### 3.3 预加载脚本职责（electron/preload.ts）

通过 contextBridge 安全地向前端暴露以下能力：

| 方法 | 作用 |
|------|------|
| getSettings() | 读取用户设置（API Key、下载目录） |
| saveSettings(settings) | 保存用户设置 |
| selectDownloadDir() | 打开系统文件夹选择对话框 |
| saveFileDialog(defaultName) | 打开系统"保存文件"对话框 |
| getAppVersion() | 返回当前 App 版本号 |

### 3.4 Next.js standalone 配置

```js
// next.config.js
const nextConfig = {
  output: 'standalone',  // 关键：独立部署模式
  // ...其余配置不变
};
```

---

## 4. 前端实现方案

### 4.1 整体架构

- 沿用 Next.js App Router，文件即路由
- Server Component 优先（首页热门内容等不需要交互的部分）
- 需要交互的部分加 'use client'（搜索、下载、收藏夹操作）
- 不引入 Redux/Zustand，用 React Context + useState

### 4.2 页面列表

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | / | 搜索 + 热门板块 + 最近浏览 + 更新提醒 |
| 资源详情 | /resource/[source]/[id] | 资源信息 + 版本列表 + 下载 |
| 分类列表 | /category/[type] | 按类型浏览所有资源 |
| 收藏夹列表 | /collections | 查看/创建/删除收藏夹 |
| 收藏夹详情 | /collections/[id] | 资源管理 + 版本选择 + 批量下载 |
| 更新提醒 | /updates | 收藏夹资源更新列表 |
| 设置 | /settings | API Key 配置、下载目录 |

### 4.3 状态管理

- 跨页面状态（收藏夹列表、设置）使用 React Context
- 页面内状态使用 useState
- 搜索条件放 URL 参数里

### 4.4 UI 风格

- **Minecraft 风格**：深色背景，像素感边框，圆角适中
- **主色调**：苦力怕绿色（#5a9e3a 主色，#7ec850 亮色，#3d6e25 暗色）
- 背景色：深石板灰（#1a1a1a 全局，#252525 卡片）
- 字体：系统默认等宽 / Minecraft 风格字体（可选，不必须）
- 所有过渡动画 duration-200，轻快不拖沓
- Tailwind 自定义色板在 tailwind.config.ts 中定义

---

## 5. 后端实现方案（Next.js API Routes）

### 5.1 API 设计

| 路由 | 方法 | 说明 |
|------|------|------|
| /api/search?q=xxx&type=xxx | GET | 合并搜索 CurseForge + Modrinth |
| /api/popular?type=mod|shader|resourcepack | GET | 获取热门内容 |
| /api/list?type=xxx&offset=xxx&limit=xxx | GET | 分页获取资源列表 |
| /api/resource/:source/:id | GET | 获取资源详情 + 版本列表 |
| /api/download?source=xxx&fileId=xxx&fileName=xxx | GET | 代理下载单个文件 |
| /api/batch-download | POST | 批量下载（zip 打包或逐个下载） |
| /api/check-updates | GET | 检查收藏夹中资源的更新 |
| /api/game-versions | GET | 获取可用游戏版本列表 |
| /api/resolve-names | POST | 批量解析 Mod ID 为名称 |
| /api/recently-viewed | GET/POST | 最近浏览记录 |
| /api/collections | GET/POST | 收藏夹 CRUD |
| /api/collections/:id | PUT/DELETE | 单个收藏夹操作 |
| /api/collections/:id/items | POST | 添加资源到收藏夹 |
| /api/collections/favorited | GET | 检查哪些资源已收藏 |
| /api/collections/remove-resource | POST | 从收藏夹移除资源 |

### 5.2 批量下载实现

**方案 A：打包成 zip**
1. 前端发 POST /api/batch-download，body 包含文件列表
2. 后端逐个下载文件到临时目录
3. 用 jszip 打包成 zip
4. 返回 zip 文件的路径
5. 前端通过 IPC 调 Electron 的 saveFileDialog，让用户选保存位置
6. 把 zip 从临时目录移到用户指定位置

**方案 B：逐个下载到文件夹**
1. 前端通过 IPC 调 Electron 的 selectDownloadDir，让用户选目录
2. 前端逐个调 /api/download 下载文件
3. 每下载完一个，通过 IPC 写入用户选的目录
4. 全部完成后弹提示

---

## 6. 数据库设计

沿用网页版的表结构，数据文件存在用户电脑 %APPDATA%/mc-mod-hub/data/app.db。

```sql
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  game_version TEXT NOT NULL,
  release_type TEXT DEFAULT 'release',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE collection_items (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  source TEXT NOT NULL,
  icon_url TEXT,
  selected_file_id TEXT,
  selected_file_name TEXT,
  selected_game_version TEXT,
  added_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

CREATE TABLE recently_viewed (
  id TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  source TEXT NOT NULL,
  icon_url TEXT,
  viewed_at TEXT DEFAULT (datetime('now'))
);
```

数据库文件位置：
- 开发环境：项目根目录 data/app.db
- 生产环境（打包后）：%APPDATA%/mc-mod-hub/data/app.db

---

## 7. 用户设置方案

### 设置内容

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| CurseForge API Key | 用户自己申请的 Key | 空（首次使用引导填写） |
| 默认下载目录 | 单个下载时的默认保存位置 | Windows 下载文件夹 |
| 启动时检查更新 | 是否在启动时检查收藏夹资源更新 | 开启 |

存储位置：%APPDATA%/mc-mod-hub/settings.json

---

## 8. 登录 / 支付方案

**都不需要。**

---

## 9. 打包与发布方案

### 9.1 打包工具：electron-builder

```yaml
# electron-builder.yml
appId: com.mcmodhub.app
productName: MC Mod Hub
directories:
  output: release
win:
  target:
    - target: nsis
      arch: [x64]
  icon: public/icon.png
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
```

### 9.2 GitHub Actions

```yaml
name: Build and Release
on:
  push:
    tags:
      - 'v*'
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm run package
      - uses: softprops/action-gh-release@v1
        with:
          files: release/*.exe
```

---

## 10. 环境变量说明

```env
# .env.local（开发环境）
CURSEFORGE_API_KEY=your_api_key_here
```

打包后 API Key 由用户在设置页填写，通过 Electron preload 脚本运行时注入。

---

## 11. 第三方服务说明

| 服务 | 用途 | 费用 |
|------|------|------|
| CurseForge API | 搜索 Mod、获取详情、下载 | 免费（需个人申请 Key） |
| Modrinth API | 搜索 Mod、获取详情、下载 | 免费（无需 Key） |
| GitHub Releases | 发布安装包给朋友下载 | 免费 |

---

## 12. 与网页版的关键区别

| 方面 | 网页版 | 桌面版 |
|------|--------|--------|
| 启动方式 | npm run dev | 双击 exe |
| API Key | .env.local 文件 | 设置页填写 |
| 数据位置 | 项目目录 data/app.db | %APPDATA%/mc-mod-hub/data/app.db |
| 文件下载 | 浏览器下载 | 系统保存对话框 |
| 窗口 | 浏览器标签页 | 独立桌面窗口 |
| 分发 | 需要教朋友装依赖 | 发 exe 安装包 |

---

## 13. 容易踩坑的地方

| 坑 | 说明 | 怎么避免 |
|----|------|----------|
| sql.js 与 Electron 兼容 | sql.js 的 WASM 文件在 Electron 打包后路径可能找不到 | 配置 webpack externals，将 sql.js 的 WASM 路径设为绝对路径 |
| Next.js standalone 端口冲突 | 启动时端口可能被占用 | 用 get-port 库自动找可用端口 |
| Electron 窗口白屏 | Next.js 还没启动完就加载页面 | 在 main.ts 里轮询等待服务器就绪再显示窗口 |
| 打包后静态资源 404 | public/ 下的文件路径在 standalone 模式下变掉 | 检查 next.config.js 的 assetPrefix |
| API Key 安全 | 不能硬编码在代码里 | 用设置页 + Electron 存储，不随代码提交 |
| 下载大文件内存溢出 | 几百 MB 的 Mod 包 | 用流式传输，不把整个文件读进内存 |
| electron-builder 打包慢 | 网络问题导致下载 Electron 二进制慢 | 配置 ELECTRON_MIRROR 使用国内镜像 |

---

## 14. 第一版不建议过度开发的地方

| 不要做 | 原因 |
|--------|------|
| Tauri 重写 | 第一版用 Electron 最快 |
| 自动更新功能 | 小范围分发，手动下载新版本 |
| 兼容性检查 | 第一版先砍掉，降低复杂度 |
| Docker/CI 复杂流水线 | GitHub Actions 够用 |
| 单元测试/E2E 测试 | 先跑通功能 |
| i18n 国际化 | 只有中文 |
| 深色/浅色切换 | 只做深色 |
| 引入 Prisma/ORM | 只有 3 张表，手写 SQL |
| Redux/Zustand | React Context + useState 够用 |
| 崩溃上报/埋点 | 小范围使用不需要 |

---

## 15. 架构扩展点（新增功能的安全入口）

以下位置专门设计为可扩展点，新功能应优先从这些入口接入，避免修改已有核心逻辑：

| 扩展点 | 位置 | 新增方式 |
|--------|------|----------|
| 新页面 | src/app/新路由/page.tsx | 新建文件，App Router 自动注册路由 |
| 新 API | src/app/api/新接口/route.ts | 新建文件，自动成为 API 端点 |
| 新组件 | src/components/功能名/新组件.tsx | 新建文件，按功能分目录 |
| 新工具模块 | src/lib/新模块.ts | 新建文件，@/lib/新模块 导入 |
| 导航栏新链接 | src/components/layout/Navbar.tsx | 在导航链接列表末尾追加 |
| 新数据库表 | src/lib/db.ts initTables() | 新加 CREATE TABLE IF NOT EXISTS |
| 类型扩展 | src/types/index.ts | 新增 interface，不修改已有 interface 字段 |
| Electron IPC 扩展 | electron/preload.ts | 在 contextBridge 中新增方法 |
| Tailwind 色板扩展 | tailwind.config.ts | 新增颜色 key，不修改已有色值 |

---

## 16. 应急功能协议

### 何时触发

当需要在 10 步开发流程中间插入新功能时使用。

### 操作流程

1. **确认插入位置**：新功能在哪个步骤完成之后加入？（如 Step 6 完成后）
2. **命名**：给新步骤命名为 Step X.5 - 功能简称（如 Step 6.5 - 兼容性检查）
3. **更新步骤索引**：在本文档第 17 节的步骤表中插入新行，标注依赖
4. **写功能说明**：描述目标、文件清单、验收标准（参考已有步骤格式）
5. **开新对话**：将功能说明交给 AI，附上约束：

> 请严格按照 AGENTS.md 的应急协议规则开发。只能创建新文件或在扩展点追加代码。禁止修改已有功能的核心逻辑。

### 安全约束

- 允许：新建文件、在扩展点末尾追加代码、新增数据库表（不修改已有表）、新增 API 路由（不修改已有路由签名）
- 禁止：修改已有数据库表结构、修改已有页面核心逻辑、修改已有 API 接口签名、修改 Tailwind 已有色值、删除任何代码

### 新功能开发条件（三步检查）

在开发新功能前，确认以下三点：

1. **数据库**：新功能不改已有表的列。如需新数据，新建表
2. **API**：新功能不改已有接口的请求/响应。如需新数据，新建 API 路由
3. **UI**：新功能使用已有 Tailwind token。不从零定义颜色，复用 tailwind.config.ts 中的色板

---

## 17. 开发步骤（10 步独立对话）

> **使用说明**：每步开一个新对话。将对应步骤的说明告诉 AI 即可开始。每步完成后，把项目文件夹交给下一步。每步约需 30-90 分钟。

---

### Step 1：项目初始化

**目标**：配好所有配置文件，npm run dev 能启动一个空的 Next.js 项目。

**依赖**：无（第一步）

**需要创建的文件**：
- package.json — 项目元信息 + 依赖声明
- tsconfig.json — TypeScript strict 配置 + @/ 路径别名
- next.config.js — output: 'standalone' + sql.js externals
- tailwind.config.ts — Minecraft 暗色主题色板（苦力怕绿）
- postcss.config.js — Tailwind + Autoprefixer 插件
- .env.local — CURSEFORGE_API_KEY 占位
- .gitignore — node_modules, .next, data/app.db, .env.local, *.jar

**开发步骤**：
1. 创建 package.json，声明 name、scripts（dev/build/start/lint）、dependencies（next/react/react-dom/sql.js/jszip）和 devDependencies（typescript/tailwindcss/postcss/autoprefixer/@types/*）
2. 创建 tsconfig.json，配置 strict 模式 + @/ 映射到 src/ 路径别名
3. 创建 next.config.js，设置 output: 'standalone'，webpack externals 排除 sql.js
4. 创建 tailwind.config.ts，自定义色板：creeper（苦力怕绿系）、surface（石板灰系）
5. 创建 postcss.config.js
6. 创建 .env.local
7. 创建 .gitignore
8. 运行 npm install

**验收标准**：
- npm run dev 无报错
- 浏览器访问 http://localhost:3000 看到 Next.js 默认页面
- npm run build 成功

**交给 AI 的 Prompt**：
> 请完成 MC Mod Hub 桌面版的 Step 1：项目初始化。参考 technical-design.md 第 17 节 Step 1 的详细说明。在 D:\vibe coding\projects\MC-Mod-Hub 创建所有配置文件，安装依赖，确保 npm run dev 能启动。

---

### Step 2：基础设施层

**目标**：类型定义 + 数据库 + API 客户端全部就绪，可以调用 CurseForge/Modrinth API 拿到数据。

**依赖**：Step 1（配置文件就绪）

**需要创建的文件**：
- src/types/index.ts — ResourceItem, ResourceDetail, Collection, CollectionItem, VersionFile, ApiResponse 等
- src/lib/db.ts — getDb(), execAndSave(), queryAll, queryOne(), 建表逻辑
- src/lib/curseforge.ts — searchMods(), fetchPopular(), getModDetail(), getModFiles(), getModFileDownloadUrl()
- src/lib/modrinth.ts — searchProjects(), fetchPopular(), getProjectDetail(), getProjectVersions(), getVersionDownloadUrl()
- src/lib/merger.ts — mergeResults() 搜索结果去重合并
- src/lib/format.ts — formatDownloads() 下载量格式化
- src/lib/game-versions.ts — Minecraft 游戏版本号映射

**开发步骤**：
1. 创建 src/types/index.ts，从网页版 src/types/index.ts 照搬所有类型定义
2. 创建 src/lib/db.ts，从网页版 src/lib/db.ts 照搬，建 3 张表
3. 创建 src/lib/curseforge.ts，从网页版照搬所有 API 封装函数
4. 创建 src/lib/modrinth.ts，从网页版照搬
5. 创建 src/lib/merger.ts，从网页版照搬
6. 创建 src/lib/format.ts，从网页版照搬
7. 创建 src/lib/game-versions.ts，从网页版照搬
8. 运行 npm run build 确认无类型错误

**验收标准**：
- npm run build 无类型错误
- 所有 @/lib/* 和 @/types 导入路径正常工作

**交给 AI 的 Prompt**：
> 请完成 MC Mod Hub 桌面版的 Step 2：基础设施层。参考 technical-design.md 第 17 节 Step 2 的详细说明。从网页版项目 D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\ 照搬 types、lib 目录下的所有文件到本项目 src/ 目录。确保 npm run build 无类型错误。

---

### Step 3：全局 UI + 导航

**目标**：看到 Minecraft 暗色风格的导航栏和页面框架。

**依赖**：Step 2（基础设施就绪）

**需要创建的文件**：
- src/app/globals.css — 暗色主题 + 滚动条 + 卡片动画
- src/components/common/Loading.tsx — 加载中状态
- src/components/common/Empty.tsx — 空状态
- src/components/common/Toast.tsx — 消息提示
- src/components/layout/Navbar.tsx — 导航栏（Logo + 首页/收藏夹/设置入口）
- src/app/layout.tsx — 根布局（导航栏 + 内容区）

**开发步骤**：
1. 更新 tailwind.config.ts，完善色板（creeper/surface/border 语义色，参考网页版但改绿色调）
2. 创建 src/app/globals.css，Minecraft 暗色主题样式
3. 创建 Loading.tsx、Empty.tsx、Toast.tsx 公共组件
4. 创建 Navbar.tsx：Logo + 导航链接 + 当前页高亮 + 苦力怕绿点缀
5. 创建 src/app/layout.tsx：引入 globals.css + 导航栏 + main 内容区
6. 运行 npm run dev，浏览器看效果

**验收标准**：
- 浏览器访问 localhost:3000 看到深色背景 + 绿色导航栏
- 导航栏有 Logo、首页、收藏夹、设置 四个入口
- 页面无布局错乱

**交给 AI 的 Prompt**：
> 请完成 MC Mod Hub 桌面版的 Step 3：全局 UI + 导航。参考 technical-design.md 第 17 节 Step 3。创建 Minecraft 暗色主题样式、公共组件、导航栏和根布局。UI 规范：主色苦力怕绿 #5a9e3a，全局背景 #1a1a1a，卡片 #252525。全部手写，不使用 shadcn/ui 等组件库。

---

### Step 4：首页 - 搜索 + 热门

**目标**：首页完整功能，搜索栏 + 三大热门板块（Mod/光影/材质包）+ 资源卡片。数据来自真实 API。

**依赖**：Step 3（UI 框架就绪）

**需要创建的文件**：
- src/app/api/popular/route.ts — GET /api/popular?type=mod|shader|resourcepack
- src/app/api/search/route.ts — GET /api/search?q=xxx
- src/components/home/SearchBar.tsx — 搜索栏（居中置顶）
- src/components/home/HotSection.tsx — 热门板块容器
- src/components/home/ResourceCard.tsx — 资源卡片
- src/app/page.tsx — 首页组装
- src/app/category/[type]/page.tsx — 分类浏览页

**开发步骤**：
1. 创建 popular API：调 curseforge.fetchPopular + modrinth.fetchPopular，合并返回
2. 创建 search API：调 curseforge.searchMods + modrinth.searchProjects，合并返回
3. 创建 SearchBar.tsx：居中搜索框
4. 创建 HotSection.tsx：标题 + 横向卡片列表
5. 创建 ResourceCard.tsx：图标、名称、简介、下载量、平台标签（CF 橙/MR 绿）
6. 创建 page.tsx：SearchBar + 三个 HotSection + 搜索结果列表
7. 创建 category page：按类型分页浏览
8. 验证：首页能看到真实 Mod 数据

**验收标准**：
- 首页展示 Mod/光影/材质包三个热门板块，每板块至少 4 张卡片
- 卡片显示真实图标、名称、下载量、平台来源标签
- 搜索框输入关键词后能看到合并搜索结果

**交给 AI 的 Prompt**：
> 请完成 MC Mod Hub 桌面版的 Step 4：首页 - 搜索 + 热门。参考 technical-design.md 第 17 节 Step 4。创建搜索和热门 API（数据来自 CurseForge + Modrinth 合并），搜索栏组件，热门板块组件，资源卡片组件，组装首页。参考网页版的对应文件实现。

---

### Step 5：资源详情 + 单文件下载

**目标**：从首页点卡片 → 看到资源详情页（版本列表）→ 选版本 → 点击下载 → 文件保存到本地。

**依赖**：Step 4（首页就绪，卡片可点击）

**需要创建的文件**：
- src/app/api/resource/[source]/[id]/route.ts — GET 资源详情 + 版本列表
- src/app/api/download/route.ts — GET 代理下载单个文件
- src/app/resource/[source]/[id]/page.tsx — 资源详情页
- src/components/resource/ResourceHeader.tsx — 资源头部信息
- src/components/resource/VersionSelector.tsx — 版本列表选择器
- src/components/resource/DownloadButton.tsx — 下载按钮

**开发步骤**：
1. 创建资源详情 API：根据 source+id 调 CurseForge/Modrinth 获取详情和版本列表
2. 创建下载 API：代理下载，流式传输文件
3. 创建 ResourceHeader.tsx：图标、名称、描述、作者、下载量、分类标签
4. 创建 VersionSelector.tsx：版本列表，显示游戏版本、加载器、发布类型
5. 创建 DownloadButton.tsx：点击触发下载，显示进度
6. 创建详情页 page.tsx：组装以上组件
7. 修改 ResourceCard.tsx 的链接指向详情页
8. 验证完整下载流程

**验收标准**：
- 点首页卡片 → 跳转到详情页，显示名称、图标、描述、版本列表
- 选一个版本 → 点下载 → 文件成功保存到本地下载文件夹
- 文件完整可用

**交给 AI 的 Prompt**：
> 请完成 MC Mod Hub 桌面版的 Step 5：资源详情 + 单文件下载。参考 technical-design.md 第 17 节 Step 5。从网页版对应文件照搬或改写资源详情页、版本选择器、下载按钮、详情 API、下载 API。确保从首页卡片到详情页到下载的完整链路可用。

---

### Step 6：收藏夹管理

**目标**：收藏夹列表页完整 CRUD，能创建/删除/重命名收藏夹，能从资源卡片快捷菜单添加资源到收藏夹。

**依赖**：Step 5（资源详情和下载就绪）

**需要创建的文件**：
- src/app/api/collections/route.ts — GET 列表 + POST 创建
- src/app/api/collections/[id]/route.ts — PUT 重命名 + DELETE 删除
- src/app/api/collections/[id]/items/route.ts — POST 添加资源
- src/app/api/collections/favorited/route.ts — GET 检查已收藏状态
- src/app/api/collections/remove-resource/route.ts — POST 从收藏夹移除资源
- src/app/collections/page.tsx — 收藏夹列表页
- src/app/collections/[id]/page.tsx — 收藏夹详情页（本步只需占位）
- src/components/collection/CollectionCard.tsx — 收藏夹卡片
- src/components/home/ContextMenu.tsx — 资源卡片上的快捷菜单

**开发步骤**：
1. 创建收藏夹 CRUD API（5 个路由文件）
2. 创建 CollectionCard.tsx：收藏夹名称、游戏版本、资源数量、操作按钮
3. 创建 ContextMenu.tsx：按钮弹出菜单选"添加到收藏夹"
4. 创建收藏夹列表页：列表 + 新建表单
5. 创建收藏夹详情占位页（显示收藏夹名称即可）
6. 将 ContextMenu 集成到 ResourceCard 中
7. 验证完整流程

**验收标准**：
- 收藏夹列表页能创建/重命名/删除收藏夹
- 资源卡片上点菜单选择收藏夹添加成功
- 收藏夹数据关闭 App 后重启仍存在

**交给 AI 的 Prompt**：
> 请完成 MC Mod Hub 桌面版的 Step 6：收藏夹管理。参考 technical-design.md 第 17 节 Step 6。从网页版照搬收藏夹相关 API 和组件。创建收藏夹 CRUD 接口、列表页、卡片组件、资源快捷菜单。收藏夹详情页先做占位。

---

### Step 7：收藏夹详情 + 批量下载

**目标**：收藏夹详情页完整功能，资源列表 + 版本选择 + 筛选 + zip 打包/文件夹批量下载。

**依赖**：Step 6（收藏夹管理就绪）

**需要创建的文件**：
- src/app/collections/[id]/page.tsx — 收藏夹详情页（覆盖占位）
- src/app/api/batch-download/route.ts — POST 批量下载
- src/components/collection/ItemRow.tsx — 收藏夹内资源行（版本选择 + 勾选）

**可能需要修改的文件**：
- src/app/api/download/route.ts — 如有需要，增强批量场景支持

**开发步骤**：
1. 创建 ItemRow.tsx：每行显示资源图标/名称、版本下拉选择器、勾选框
2. 完善收藏夹详情页：资源列表 + 筛选栏（加载器/发布类型/游戏版本）+ 批量下载按钮组（打包 zip / 下载到文件夹）
3. 创建 batch-download API：
   - zip 模式：逐个下载到临时目录，jszip 打包，返回 zip 路径
   - folder 模式：逐个下载，返回文件路径列表
4. 集成 Electron 文件对话框（如果还没做 Electron，先用浏览器默认下载行为替代）
5. 验证两种批量下载方式

**验收标准**：
- 收藏夹详情页能看到所有资源，每个资源有版本选择下拉框
- 筛选功能正常（可按加载器、发布类型、游戏版本过滤）
- 勾选 5 个 Mod 选"打包成 zip"得到一个包含 5 个文件的 zip
- 勾选 5 个 Mod 选"下载到文件夹"指定目录出现 5 个文件
- 某个文件下载失败时，其他文件不受影响，失败的显示错误提示

**交给 AI 的 Prompt**：
> 请完成 MC Mod Hub 桌面版的 Step 7：收藏夹详情 + 批量下载。参考 technical-design.md 第 17 节 Step 7。实现收藏夹详情页（资源行、版本选择、筛选）、批量下载 API（zip 打包 + 文件夹下载两种模式）。参考网页版 batch-download 和 download API 实现。

---

### Step 8：补充功能

**目标**：最近浏览记录 + 更新提醒 + 分类浏览完善。

**依赖**：Step 7（核心功能全部就绪）

**需要创建的文件**：
- src/app/api/recently-viewed/route.ts — GET/POST 最近浏览
- src/app/api/check-updates/route.ts — GET 检查收藏夹资源更新
- src/app/api/game-versions/route.ts — GET 游戏版本列表
- src/app/api/resolve-names/route.ts — POST 批量解析 Mod 名称
- src/components/home/RecentlyViewed.tsx — 最近浏览板块
- src/components/home/UpdateAlerts.tsx — 更新提醒板块
- src/app/updates/page.tsx — 更新提醒详情页

**可能需要修改的文件**：
- src/app/page.tsx — 首页加入 RecentlyViewed + UpdateAlerts
- src/app/resource/[source]/[id]/page.tsx — 浏览时记录到 recently_viewed 表

**开发步骤**：
1. 创建 recently-viewed API：记录和查询浏览历史
2. 创建 check-updates API：遍历收藏夹资源对比最新版本
3. 创建 game-versions API：返回 Minecraft 游戏版本列表
4. 创建 resolve-names API：批量解析 Mod ID
5. 创建 RecentlyViewed.tsx：横向卡片列表
6. 创建 UpdateAlerts.tsx：有更新时显示红点 + 列表
7. 创建 updates page：更新详情页
8. 集成到首页和详情页

**验收标准**：
- 浏览 3 个 Mod 后回首页，最近浏览板块显示这 3 个
- 收藏夹中有 Mod 发布新版本时，首页更新提醒显示
- 关闭重开，最近浏览记录保留

**交给 AI 的 Prompt**：
> 请完成 MC Mod Hub 桌面版的 Step 8：补充功能。参考 technical-design.md 第 17 节 Step 8。实现最近浏览记录、更新提醒、游戏版本列表 API 及对应前端组件。参考网页版对应实现。

---

### Step 9：设置页 + Electron 壳

**目标**：Electron 窗口能打开，设置页可填 API Key 和下载目录，下载时弹出原生系统对话框。

**依赖**：Step 8（前端功能全部就绪）

**需要创建的文件**：
- electron/main.ts — Electron 主进程
- electron/preload.ts — 预加载脚本
- src/app/settings/page.tsx — 设置页

**可能需要修改的文件**：
- src/components/resource/DownloadButton.tsx — 使用 Electron 保存对话框替代浏览器下载
- src/lib/curseforge.ts — API Key 优先从 Electron 设置读取
- package.json — 添加 electron 相关脚本

**开发步骤**：
1. 安装 electron 依赖
2. 创建 electron/main.ts：启动 Next.js server 轮询等待创建 BrowserWindow
3. 创建 electron/preload.ts：暴露 getSettings/saveSettings/selectDownloadDir/saveFileDialog
4. 创建 settings page：API Key 输入框、下载目录选择、保存按钮
5. 修改 API Key 读取逻辑：优先从 window.electronAPI.getSettings() 读取
6. 修改下载按钮：使用 window.electronAPI.saveFileDialog() 选择保存位置
7. 添加 npm run electron:dev 脚本到 package.json

**验收标准**：
- npm run electron:dev Electron 窗口打开，显示首页
- 设置页能填入 API Key 并保存，关闭重开 Key 还在
- 下载 Mod 时弹出系统原生"保存文件"对话框
- 窗口标题为 "MC Mod Hub"，有应用图标

**交给 AI 的 Prompt**：
> 请完成 MC Mod Hub 桌面版的 Step 9：设置页 + Electron 壳。参考 technical-design.md 第 17 节 Step 9。创建 Electron 主进程和预加载脚本，创建设置页，将下载逻辑接入 Electron 原生文件对话框。API Key 存储到 %APPDATA%/mc-mod-hub/settings.json。

---

### Step 10：打包 + GitHub 发布

**目标**：GitHub Release 页面上有可下载的 exe 安装包。

**依赖**：Step 9（完整应用可 Electron 运行）

**需要创建的文件**：
- electron-builder.yml — 打包配置
- .github/workflows/release.yml — GitHub Actions 自动构建
- public/icon.png — 应用图标（256x256）

**开发步骤**：
1. 创建 electron-builder.yml：Windows NSIS 安装包配置
2. 创建 public/icon.png：应用图标
3. 配置 package.json：添加 package 脚本、main 字段指向 electron/main.ts
4. 创建 .github/workflows/release.yml：push tag v* 自动构建 exe 并创建 Release
5. 打 tag v1.0.0 推送到 GitHub，触发 Actions
6. 验证 Release 页面有 exe下载

**验收标准**：
- 本地 npm run package 能生成 exe
- GitHub Actions 推送 tag 后自动构建成功
- Release 页面有 MC-Mod-Hub-Setup-1.0.0.exe 可供下载
- 下载安装后双击能打开，功能正常

**交给 AI 的 Prompt**：
> 请完成 MC Mod Hub 桌面版的 Step 10：打包 + GitHub 发布。参考 technical-design.md 第 17 节 Step 10。配置 electron-builder 打包 Windows exe，创建 GitHub Actions 自动发布流程。

---

## 18. 步骤间依赖关系图

```
Step 1 (项目初始化)
  └─→ Step 2 (基础设施)
        └─→ Step 3 (全局 UI + 导航)
              └─→ Step 4 (首页搜索+热门)
                    └─→ Step 5 (资源详情+下载)
                          └─→ Step 6 (收藏夹管理)
                                └─→ Step 7 (批量下载)
                                      └─→ Step 8 (补充功能)
                                            └─→ Step 9 (Electron壳)
                                                  └─→ Step 10 (打包发布)
```

每一步的输出是下一步的输入。如果某步发现问题，只需回退到上一步重做，不影响更早的步骤。如需插入新功能，在依赖链上找到插入点，使用第 16 节的应急协议。
