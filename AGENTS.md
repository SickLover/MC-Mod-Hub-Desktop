# AGENTS.md — MC Mod Hub 桌面版

Minecraft Mod/光影/材质包桌面管理工具，基于 Electron + Next.js，从 CurseForge 和 Modrinth 搜索资源、管理收藏夹、批量下载。分发为 Windows .exe 安装包。

## 项目背景

- 这是一个 **Windows 桌面软件**，不是网页
- 用户是国内 Minecraft 玩家，小范围朋友间使用
- 不需要登录，所有数据存本地电脑
- 第一版照搬网页版功能：搜索、收藏夹、版本选择、批量下载
- 开发分为 **10 个独立步骤**，本对话只执行其中一步

## 技术栈约定

- **桌面框架**：Electron（主进程 `electron/main.ts`，预加载 `electron/preload.ts`）
- **前端**：Next.js 14 App Router，`output: 'standalone'`
- **语言**：TypeScript strict 模式
- **样式**：Tailwind CSS + 自定义 Minecraft 主题（苦力怕绿 `#5a9e3a`）
- **数据库**：SQLite（sql.js），通过 `src/lib/db.ts` 统一访问
- **打包**：electron-builder，输出 Windows .exe
- **外部 API**：CurseForge（需 Key）+ Modrinth（无需 Key）
- **路径别名**：`@/` → `src/`

## 目录结构约定

- `electron/` — Electron 主进程代码（窗口管理、IPC、原生功能）
- `src/app/` — Next.js 页面和 API 路由
- `src/components/` — React 组件，按功能分 `layout/` `home/` `resource/` `collection/` `common/`
- `src/lib/` — 业务逻辑：db、curseforge、modrinth、merger、format、game-versions
- `src/types/` — TypeScript 接口定义
- `data/` — SQLite 数据库文件（运行时自动创建，不提交 git）
- `public/` — 静态资源（图标等）
- 根目录放配置文件（`next.config.js`、`tailwind.config.ts`、`electron-builder.yml`）

## 代码风格约定

- **组件**：函数式组件 + Hooks。默认 Server Component，需要交互加 `'use client'`
- **命名**：组件 PascalCase（`SearchBar.tsx`），工具 camelCase（`curseforge.ts`），API 路由按 App Router 约定
- **类型**：精确接口定义在 `src/types/index.ts`，禁止 `any`
- **导入**：统一用 `@/` 路径别名，不用相对路径
- **API 响应**：统一 `{ success: boolean, data?: T, error?: string }` 格式
- **一个文件只做一件事**，新功能新建文件

## UI 风格约定

- **Minecraft 风**：深色背景 + 像素感边框 + 适中圆角（`rounded-mc` = 0.75rem）
- **Tailwind 自定义色板**定义在 `tailwind.config.ts`，含两套命名：
  - `creeper` / `surface` / `border`：语义色名
  - `mc-*`：便捷别名（`mc-green` / `mc-bg` / `mc-card` / `mc-card-hover` / `mc-text` / `mc-muted`），**实际开发统一使用 `mc-*`**
- **主色**：苦力怕绿 `mc-green`（`#5a9e3a`）、`mc-green-light`（`#7ec850`）、`mc-green-dark`（`#3d6e25`）
- **背景**：`mc-bg`（`#1a1a1a` 全局）、`mc-card`（`#252525` 卡片）、`mc-card-hover`（`#2a2a2a` 悬停）
- **文字**：`mc-text`（`#e5e5e5` 正文）、`mc-muted`（`#9ca3af` 次要）
- **动画**：transition `duration-200`，卡片悬停上浮 4px
- **圆角**：`rounded-mc`（0.75rem）用于卡片，`rounded-md` 用于按钮
- 只做暗色主题，不做切换

## 数据库约定

- 所有数据库操作通过 `src/lib/db.ts` 的 `getDb()` `execAndSave()` `queryAll<T>()` `queryOne<T>()`
- 不直接在其他地方操作 sql.js
- 数据文件位置由 Electron 主进程在启动时传给 Next.js（开发环境 `data/app.db`，生产环境 `%APPDATA%/mc-mod-hub/data/app.db`）

## Electron 约定

- 主进程只做窗口管理和启动 Next.js 服务器，不放业务逻辑
- 前端调用原生功能（文件对话框、设置读写）必须通过 `preload.ts` 暴露的安全 API
- **不要**在渲染进程直接使用 `require('electron')` 或 Node.js API
- 新加原生功能：先在 `preload.ts` 用 `contextBridge.exposeInMainWorld` 暴露，前端通过 `window.electronAPI.xxx()` 调用
- **打包**：`electron-builder.yml` 配置 NSIS 安装包；`signAndEditExecutable: false` 绕过 Windows 非管理员 symlink 权限问题（CI 环境管理员权限不受影响）
- **国内网络**：本地打包前设置 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 加速 Electron 二进制下载
- **已知限制**：打包后 Electron 窗口加载 `http://localhost:3000`，需手动启动 Next.js server（v0.2.0 处理自动启动）

## 开发流程约定

1. **先理解，再动手**：修改前先读相关文件，理解现有结构
2. **最小改动**：只改和当前任务相关的文件
3. **每步验证**：改完就跑 `npm run dev` 确认不报错
4. **保持干净**：不引入不需要的 npm 包

## 分步开发规则

本项目分 10 步开发，当前对话只执行其中一步。详细步骤说明见 `technical-design.md` 第 17 节。

- 每个对话只完成一个步骤的内容
- 完成当前步骤后，不需要考虑下一步
- 如果当前步骤提到"占位页"，只需做一个显示标题的最简页面即可，不要过度实现
- 如果当前步骤的文件清单中标为"可能需要修改"，只在确实需要时才改

## 执行同步规则（重要）

每次实际执行中对项目做了任何与 AGENTS.md 或 prompt 计划不同的改动时，必须同步更新：

- **AGENTS.md**：如果实际执行中新增了代码约定、Tailwind class 命名规范、组件书写模式等，必须同步写入 AGENTS.md 对应章节
- **prompts/ 对应步骤文件**：本步完成后，将实际执行中的改动（相比 prompt 计划多做了什么、少做了什么、改了什么）以简表形式追加到 `prompts/step-0X.md` 末尾的「实际执行记录」小节
- **原因**：确保下一步的 AI 读到的是项目最新状态，而不是过时的计划

「实际执行记录」格式：
```
## 实际执行记录

相比原计划：
- 多做了：[列表]
- 少做了：[列表]
- 改动点：[列表，含原因]

实际新增文件：
- [文件路径]：[一句话说明]

实际 UI 约定（如有新增）：
- [约定描述]
```

## 禁止行为

- ❌ **不要**随意改动与当前任务无关的文件
- ❌ **不要**擅自更换技术栈（不用 Tauri、不用 Vue、不用其他框架）
- ❌ **不要**引入不必要的新依赖（除非技术文档明确要求）
- ❌ **不要**过度设计（第一版不做兼容性检查、不做自动更新、不做 i18n）
- ❌ **不要**在代码里硬编码 API Key
- ❌ **不要**删除已有的功能代码（除非明确要求砍掉）
- ❌ **不要**把 Electron 和 Next.js 的代码混在一起
- ❌ **不要**跨步骤开发——本对话只做分配的那一步，不要提前做后面步骤的功能

## 测试与验证要求

- 每完成一个功能模块，先 `npm run dev` 启动确认无编译错误
- 在浏览器中手动点一遍流程（Electron 集成在 Step 9，之前步骤用浏览器验证）
- 验证数据持久化（关闭重开数据还在）

## 每次改动后

在完成改动后，简要说明：
1. 改了什么（文件列表）
2. 为什么改（对应哪个需求）
3. 如何验证（启动后看哪里）

---

## 应急功能协议（AI 必须遵守）

当用户要求在当前步骤之外添加新功能时：

### 必须遵守的约束

- ✅ **可以做的**：
  - 新建 `src/components/新功能/` 目录和组件文件
  - 新建 `src/app/api/新接口/route.ts` API 路由
  - 新建 `src/app/新页面/page.tsx` 页面
  - 新建 `src/lib/新模块.ts` 工具模块
  - 在 `src/types/index.ts` 末尾新增 interface（不修改已有 interface）
  - 在 `src/lib/db.ts` 的 `initTables()` 中新增 `CREATE TABLE IF NOT EXISTS`（不修改已有表）
  - 在 `electron/preload.ts` 末尾新增 IPC 方法
  - 在 `src/components/layout/Navbar.tsx` 导航链接列表末尾追加新链接

- ❌ **禁止做的**：
  - 修改已有数据库表结构（ALTER TABLE）
  - 修改已有页面核心逻辑（page.tsx 中的主要组件和数据流）
  - 修改已有 API 接口签名（请求参数/响应格式）
  - 修改 `tailwind.config.ts` 中已定义的色板值
  - 删除任何已有代码或文件

### 执行前检查

开发新功能前，在回复中先确认以下三点，通过后再动手：
1. 数据库：新功能不修改已有表结构（需要新数据就建新表）
2. API：新功能不修改已有接口的请求/响应格式（需要新数据就新建路由）
3. UI：新功能复用 tailwind.config.ts 中的已有色板（不从零定义颜色）

---

## 遇到不确定的问题时

- **产品问题**：参考 `requirements.md`，仍有疑问可提问
- **技术问题**：参考 `technical-design.md`，优先按文档自行判断
- **文档冲突**：以 `technical-design.md` 为准，同时提醒文档需要更新
- **步骤范围问题**：如果不确定某个功能是否属于当前步骤，先确认再动手

---

## 已知 Bug 修复记录

### Bug A — ContextMenu 弹出层被下方卡片遮挡（已修复）
- **文件**：`src/components/home/ContextMenu.tsx`
- **修法**：用 React Portal（`createPortal`）将弹出菜单渲染到 `document.body`，`fixed` 定位 + `getBoundingClientRect()` 计算位置
- **Prompt**：`prompts/bugfix-a.md`

### Bug B — 热门板块缺"查看全部"（已修复）
- **文件**：`src/components/home/HotSection.tsx`
- **修法**：标题行右侧加 `<Link href="/category/{type}">查看全部 →</Link>`，用 `justify-between` 左右布局
- **Prompt**：`prompts/bugfix-b.md`

---

## 补丁修复记录

以下 5 个补丁在基础功能完成后追加，覆盖分页、筛选、兼容性检测等增强功能。每个补丁的详细 Prompt 见 `prompts/step-patch-*.md`。

### 补丁总览

| # | 名称 | 修改文件 | 关键约定 |
|---|------|----------|----------|
| 补丁-1 | 分类页分页 | `category/[type]/page.tsx`、`api/list/route.ts` | PAGE_SIZE=20，内联 Pagination 组件，limit 封顶 60，fetchSize=limit×5 |
| 补丁-2 | 筛选改下拉 | `collections/[id]/page.tsx` | 状态 string\|null，select 标签 mc-* 色板，appearance-none |
| 补丁-3 | 游戏版本筛选 | `collections/[id]/page.tsx`、`ItemRow.tsx`、`api/collections/[id]/route.ts` | 三级 filter props，PUT 清除 selected_file_id，filteredVersions 用 if-block |
| 补丁-4 | Mod 兼容性检测 | **新建** `CompatibilityCheck.tsx`、`collections/[id]/page.tsx`、`api/resolve-names/route.ts` | 双栏布局 lg:col-span-2+1，GET resolve-names，绿色横幅全通过 |
| 补丁-5 | 筛选无匹配原因 | `ItemRow.tsx` | noMatchReasons 数组诊断三个筛选条件，显示 `无匹配版本: 无X+Y的版本` |

### 补丁后追加的 ad-hoc 修复

- **搜索结果"返回首页"按钮**：`src/app/page.tsx` — 搜索结果视图添加 `← 返回首页`，点击 `router.push('/')` + `setSearchResults(null)`
- **版本类型筛选行为变更**：`filteredItems` 从"加载器+版本类型双过滤"改为"仅按加载器过滤"，版本类型无匹配的 mod 不再隐藏，ItemRow 内显示诊断原因
- **热门板块缩略卡**：`HotSection.tsx` — 每类热门资源固定显示前 6 张卡片（`resources.slice(0, 6)`）
- **首页布局顺序**：搜索栏 → 最近浏览 → 更新提醒 → 热门板块（Mod/光影/材质包）
- **补丁-1/3 精简对齐**：fetchSize 去 Math.min(200) 封顶、ItemRow filteredVersions 改回 if-block 块体
