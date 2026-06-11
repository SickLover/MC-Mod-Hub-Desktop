# 开发执行 Prompt — MC Mod Hub 桌面版 Step 5

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 项目背景

MC Mod Hub 桌面版是一个 Windows 桌面软件，帮 Minecraft 玩家从 CurseForge 和 Modrinth 搜索模组/光影/材质包，管理收藏夹，批量下载。基于 Electron + Next.js 14。整个项目分为 **10 个独立步骤**开发，本文档是 **Step 5**。

## 当前状态

Step 1-4 已完成。以下是关键文件的实际状态：

| 文件 | 状态 |
|------|------|
| `src/app/page.tsx` | ✅ 完整首页：搜索(URL同步) + 3个热门板块 + 搜索结果展示，Suspense 包裹 |
| `src/app/api/search/route.ts` | ✅ 完整搜索 API，CF+MR 合并 |
| `src/app/api/popular/route.ts` | ✅ 完整热门 API |
| `src/app/api/list/route.ts` | ✅ 分页列表 API，含 total/page/totalPages |
| `src/app/category/[type]/page.tsx` | ✅ 分类浏览页 |
| `src/components/home/ResourceCard.tsx` | ✅ 卡片组件（prop 名 `resource`，用 `@/lib/format`） |
| `src/components/home/SearchBar.tsx` | ✅ 搜索栏 |
| `src/components/home/HotSection.tsx` | ✅ 热门板块容器 |
| `src/components/layout/Navbar.tsx` | ✅ 导航栏（mc-* 样式） |
| `src/components/common/Loading.tsx` | ✅ 加载组件 |
| `src/components/common/Empty.tsx` | ✅ 空状态 |
| `src/components/common/Toast.tsx` | ✅ Toast 提示 |
| `src/app/resource/[source]/[id]/page.tsx` | ⚠️ **占位**，只有标题+参数展示，无数据 |
| `src/app/api/resource/` | ❌ **不存在** |
| `src/app/api/download/` | ❌ **不存在** |
| `src/components/resource/` | ❌ **目录不存在** |
| `src/app/collections/page.tsx` | ✅ 占位（Step 6 实现） |
| `src/app/collections/[id]/page.tsx` | ✅ 占位（Step 7 实现） |
| `src/app/settings/page.tsx` | ✅ 占位（Step 9 实现） |

## 当前目标

**Step 5：资源详情 + 单文件下载** — 从首页/搜索结果点卡片 → 看到完整的资源详情页（版本列表、描述、元信息）→ 选版本 → 点击下载 → 文件保存到本地。

## 需要创建的文件

```
src/app/api/resource/[source]/[id]/route.ts   — GET 资源详情 + 版本列表
src/app/api/download/route.ts                  — GET 代理下载单个文件
src/components/resource/ResourceHeader.tsx     — 资源头部（图标/名称/作者/下载量/描述）
src/components/resource/VersionSelector.tsx    — 版本列表选择器
src/components/resource/DownloadButton.tsx     — 下载按钮
```

## 需要修改的文件

```
src/app/resource/[source]/[id]/page.tsx        — 占位→完整详情页
```

## 开发步骤

### 1. 创建资源详情 API — `src/app/api/resource/[source]/[id]/route.ts`

- 从 URL params 读取 `source`（curseforge | modrinth）和 `id`
- 根据 source 调用对应的详情+版本 API：
  - CurseForge：`getModDetail(id)` + `getModFiles(id)`，将文件列表转为 `VersionFile[]` 格式
  - Modrinth：`getProjectDetail(id)` + `getProjectVersions(id)`
- 将详情数据组装为 `ResourceDetail` 类型返回
- 响应格式：`{ success: true, data: ResourceDetail }`
- 参考网页版：`D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\resource\[source]\[id]\route.ts`

### 2. 创建下载 API — `src/app/api/download/route.ts`

- 接收 `?source=xxx&fileId=xxx&fileName=xxx&modId=xxx` 查询参数
- 根据 source 调用对应的下载链接获取 API：
  - CurseForge：`getModFileDownloadUrl(modId, fileId)` → 获取真实下载 URL
  - Modrinth：`getVersionDownloadUrl(fileId)` → 获取真实下载 URL
- 用 `fetch` 请求真实下载 URL，以**流式**方式转发给前端
- 设置正确的响应头（Content-Disposition、Content-Type、Content-Length）
- 参考网页版：`D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\download\route.ts`

### 3. 创建 ResourceHeader 组件 — `src/components/resource/ResourceHeader.tsx`

接收 `ResourceDetail` 类型 prop，展示：
- 大图标（64x64 或更大，带圆角）
- 资源名称（大字）
- 作者
- 下载量（用 `formatDownloads`）
- 描述文字（支持多行）
- 来源平台标签（CF/MR，颜色与 ResourceCard 一致：CF 橙、MR 蓝）
- 分类标签列表
- "在 CurseForge/Modrinth 查看" 外部链接

使用 `mc-*` 样式 class。

### 4. 创建 VersionSelector 组件 — `src/components/resource/VersionSelector.tsx`

接收 `VersionFile[]` 类型 prop，展示：
- 版本列表（每个版本一行），显示：
  - 文件名
  - 游戏版本标签（如 1.21、1.20.1）
  - 加载器标签（Forge、Fabric、Quilt 等）
  - 发布类型标签（Release=绿、Beta=黄、Alpha=红）
  - 文件大小（用 `formatFileSize`）
  - 发布日期
- 点击某一行选中该版本（高亮为苦力怕绿色边框/背景）
- 默认选中第一个版本（或最新 release 版本）

### 5. 创建 DownloadButton 组件 — `src/components/resource/DownloadButton.tsx`

- 接收选中的 VersionFile 信息 + source + modId
- 点击触发下载：调用 `/api/download?source=xxx&fileId=xxx&fileName=xxx&modId=xxx`
- 下载时按钮显示"下载中..."并禁用
- 下载完成后恢复，Toast 提示成功
- 下载失败 Toast 提示失败原因
- 按钮样式：苦力怕绿背景 + 白色文字 + rounded-mc

### 6. 组装资源详情页 — `src/app/resource/[source]/[id]/page.tsx`

覆盖当前占位实现，改为完整详情页：

- `'use client'`（需要 fetch + state）
- 从 URL params 读取 source 和 id
- `useEffect` 调用 `/api/resource/${source}/${id}`
- 三个状态：Loading → Error → 数据
- 布局：
  - ← 返回按钮（保留现有返回逻辑）
  - ResourceHeader（顶部）
  - VersionSelector（中部，版本列表）
  - DownloadButton（底部，选中版本后可下载）
- 选中版本后下载按钮才可用

## 可参考的网页版文件

| 网页版文件 | 参考内容 |
|-----------|----------|
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\resource\[source]\[id]\route.ts` | 详情 API 实现 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\download\route.ts` | 下载 API 实现 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\resource\ResourceHeader.tsx` | 头部组件结构 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\resource\VersionSelector.tsx` | 版本选择器结构 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\resource\DownloadButton.tsx` | 下载按钮结构 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\resource\[source]\[id]\page.tsx` | 详情页布局 |

> **重要**：参考网页版的**逻辑和结构**，但 UI 样式全部改为本项目的 `mc-*` class（`bg-mc-card`、`text-mc-text`、`text-mc-muted`、`rounded-mc` 等），颜色从紫色系改为苦力怕绿色系。

## UI 规范（必须遵守）

- 所有样式用 `mc-*` 前缀 class
- 组件用 `'use client'`
- 加载态用 `<Loading />`
- 空/错误状态清晰提示
- 版本选中高亮用 `border-mc-green` 或 `bg-mc-green/10`
- 发布类型标签颜色：release=绿(bg-green-500/20 text-green-400)，beta=黄(bg-yellow-500/20 text-yellow-400)，alpha=红(bg-red-500/20 text-red-400)
- 平台标签颜色：CurseForge=橙(bg-orange-500/20 text-orange-400)，Modrinth=蓝(bg-blue-500/20 text-blue-400)

## 约束条件

- 不修改 Step 1-4 已完成的核心文件（除非只是修复 bug）
- 不安装新依赖
- 下载功能在浏览器中测试（Electron 集成是 Step 9 的事）
- ResourceCard 的 prop 名保持 `resource`，组件的 prop 名可自由命名
- 所有 API 保持统一响应格式 `{ success, data?, error? }`

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | 资源详情 API 返回完整数据 | 浏览器访问 `/api/resource/curseforge/12345`，返回名称/描述/版本列表 |
| 2 | 详情页展示完整信息 | 首页点卡片→详情页显示图标/名称/作者/下载量/描述/版本列表 |
| 3 | 版本列表可选中 | 点击版本行，该行高亮为绿色边框 |
| 4 | 下载按钮可用 | 选中版本后点下载，文件开始下载 |
| 5 | 下载文件完整 | 下载后的 Mod 文件大小 > 0，文件名正确 |
| 6 | 加载态正常 | 详情页加载时显示 Loading 组件 |
| 7 | 返回按钮可用 | 点"← 返回"回到上一页 |
| 8 | `npm run build` 成功 | 无类型或编译错误 |

## 完成后

完成后告诉我：Step 5 已完成，可以进入 Step 6。并简要说明实际执行中做了哪些与计划不同的改动（如果有）。

---

> 历史步骤存档：`prompts/step-01.md` ~ `prompts/step-04.md`。复盘时直接查看对应文件。

## 实际执行记录

相比原计划：
- 无多做的内容
- 无少做的内容
- 改动点：
  - DownloadButton 改用了 `fetch` + `blob()` 流式下载方式（创建临时 URL 触发下载），而非原网页版的 `<a>` 标签直接链接方式。原因是这样能先校验响应是否为错误 JSON，失败时通过 Toast 提示错误信息，体验更好
  - DownloadButton 新增了 `onSuccess` / `onError` 回调 prop，让父组件控制 Toast 显示
  - 详情页的"返回"按钮改用 `router.back()` 代替 `<Link href="/">`，这样用户从分类页进入时也能回到正确位置
  - 详情页自动选中第一个 release 版本（而非简单第一个版本），更符合使用习惯

实际新增文件：
- `src/app/api/resource/[source]/[id]/route.ts`：资源详情 API，支持 CF+MR，组装 ResourceDetail 含版本列表
- `src/app/api/download/route.ts`：下载代理 API，CF 通过 getModFileDownloadUrl，MR 通过 getVersionDetail 获取下载链接
- `src/components/resource/ResourceHeader.tsx`：资源头部组件（图标/名称/作者/下载量/分类/来源标签/外链）
- `src/components/resource/VersionSelector.tsx`：版本选择器（游戏版本筛选 Chip + 版本列表 + 选中高亮）
- `src/components/resource/DownloadButton.tsx`：下载按钮（fetch blob 流式下载 + Toast 回调）
- `src/app/resource/[source]/[id]/page.tsx`：完整详情页（覆盖占位），含 Loading/Error/数据三态

实际 UI 约定（如有新增）：
- 加载器 badge 色：`bg-mc-green/15 text-mc-green-light`（替代原网页版紫色系）
- 分类标签色：`bg-mc-green/15 text-mc-green-light border border-mc-green/20`
- 下载按钮：`bg-mc-green hover:bg-mc-green-dark` + `shadow-mc-green/15`
- 描述区域：`bg-mc-card rounded-mc border border-white/5`，内容区 max-h-[300px] 可滚动
- 版本列表容器：`bg-mc-bg rounded-mc border border-white/5`
- 描述不足 200 字时显示"完整描述请查看源页面"提示


---

## 实际执行记录

### 相比原计划

- **多做了**：
  - VersionSelector 增加游戏版本筛选 chips（全部 / 1.21 / 1.20.1 …），`useMemo` 收集去重版本号
  - VersionSelector 底部增加「已选版本」详情面板（选中后显示文件名 + 游戏版本标签）
  - ResourceHeader 分类标签改为苦力怕绿圆角 badge（`bg-mc-green/15 text-mc-green-light`）
  - 详情页增加描述区块（卡片内展示，短描述提示去源站看完整版）
  - 详情页集成 Toast 组件（下载成功/失败提示）
  - 详情页自动选中第一个 release 版本（fallback 到第一个版本）
- **少做了**：无
- **改动点**：
  - DownloadButton 用 `blob + createObjectURL + <a> click` 触发下载（非直接使用 Electron 对话框，浏览器兼容方式）
  - 详情API 增加了依赖/不兼容过滤逻辑（CurseForge 按 relationType=3/5 筛选，Modrinth 按 dependency_type=required/incompatible）
  - API 统一 `{ success, data?, error? }` 格式

### 实际新增文件

| 文件 | 说明 |
|------|------|
| `src/app/api/resource/[source]/[id]/route.ts` | 详情 API，CF/MR 双源，含版本依赖过滤 |
| `src/app/api/download/route.ts` | 下载代理 API，fetch 流式转发 |
| `src/components/resource/ResourceHeader.tsx` | 图标+名称+作者+分类绿badge+源站链接+下载量 |
| `src/components/resource/VersionSelector.tsx` | 版本列表+游戏版本筛选chips+已选面板 |
| `src/components/resource/DownloadButton.tsx` | 下载按钮（blob+createObjectURL触发浏览器下载） |

### 实际修改文件

| 文件 | 改动 |
|------|------|
| `src/app/resource/[source]/[id]/page.tsx` | 占位→完整详情页，含 Loading/Error/Toast/描述/返回 |

### 实际 UI 约定（如有新增）

- 分类标签：`bg-mc-green/15 text-mc-green-light border border-mc-green/20 rounded-full`
- 版本行选中：`bg-mc-green/10 border-mc-green/30` + 圆形 radio indicator
- 游戏版本筛选 chips：`bg-mc-green/15`（选中）/ `bg-mc-card`（未选中）
