# 开发执行 Prompt — MC Mod Hub 桌面版 Step 4

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 项目背景

MC Mod Hub 桌面版是一个 Windows 桌面软件，帮 Minecraft 玩家从 CurseForge 和 Modrinth 搜索模组/光影/材质包，管理收藏夹，批量下载。基于 Electron + Next.js 14。整个项目分为 **10 个独立步骤**开发，本文档是 **Step 4**。

## 当前状态

Step 1-3 已完成。**注意：Step 3 实际执行超出了原计划**，以下内容已经存在：

| 已存在 | 状态 |
|--------|------|
| `tailwind.config.ts` | ✅ 含 `mc-*` 语义色 + `creeper`/`surface`/`border` + `rounded-mc` + 动画 |
| `src/app/globals.css` | ✅ 暗色主题 + 滚动条 + `.card-hover` + `.fade-in` |
| `src/app/layout.tsx` | ✅ 导航栏 + main 布局 |
| `src/components/layout/Navbar.tsx` | ✅ ⛏️ Logo + 首页/收藏夹/设置，`mc-*` 样式 |
| `src/components/common/Loading.tsx` | ✅ 旋转加载圈 |
| `src/components/common/Empty.tsx` | ✅ 空状态 |
| `src/components/common/Toast.tsx` | ✅ success/error/info 三种类型 |
| `src/components/home/SearchBar.tsx` | ✅ 受控搜索框 + onSearch 回调 |
| `src/components/home/HotSection.tsx` | ✅ grid 卡片网格 + Empty fallback |
| `src/components/home/ResourceCard.tsx` | ✅ 图标/名称/作者/平台标签/下载量/⋮ 按钮，**内联 formatDownloads** |
| `src/app/page.tsx` | ✅ 完整首页，fetch `/api/popular`，3 个 HotSection。**搜索回调仅 console.log** |
| `src/app/api/popular/route.ts` | ✅ 完整实现，CF+MR 合并三类型 |
| `src/app/api/search/route.ts` | ⚠️ **骨架**，始终返回 `{ success: true, data: [] }` |
| `src/app/resource/[source]/[id]/page.tsx` | ✅ 占位 |
| `src/app/collections/page.tsx` | ✅ 占位 |
| `src/app/collections/[id]/page.tsx` | ✅ 占位 |
| `src/app/settings/page.tsx` | ✅ 占位 |
| `src/types/css.d.ts` | ✅ CSS module 声明 |

## 当前目标

**Step 4：搜索 + 分类浏览** — 搜索功能完整可用（输入关键词→显示结果），按 Mod/光影/材质包分类浏览。

## 需要创建/修改的文件

### 新创建
```
src/app/category/[type]/page.tsx      — 按类型浏览所有资源页
```

### 需要修改（完善功能）
```
src/app/api/search/route.ts            — 从骨架→完整搜索（调 CF+MR）
src/app/page.tsx                       — 搜索 onSubmit 展示结果（不再是 console.log）
src/components/home/ResourceCard.tsx   — 用 @/lib/format 替换内联 formatDownloads
```

## 开发步骤

### 1. 完善搜索 API — `src/app/api/search/route.ts`

把骨架 API 改为完整实现。参考 `/api/popular` 的结构：

- 接收 `?q=xxx` 查询参数
- 并行调用 `curseforge.searchMods(q, 16)` + `modrinth.searchProjects(q, 16)`
- 调用 `mergeResults()` 合并去重
- 返回 `{ success: true, data: merged[] }`
- 无查询参数时返回 `{ success: false, error: '...' }` + 400 状态码

可参考网页版 `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\search\route.ts`。

### 2. 首页接入搜索结果 — `src/app/page.tsx`

当前 `handleSearch` 只做了 `console.log`，需要改为：

- 新增 `searchResults` state（`ResourceItem[] | null`）
- 新增 `isSearching` state
- `handleSearch` 触发后：设置 isSearching → fetch `/api/search?q=xxx` → 赋值 searchResults
- 页面渲染逻辑：
  - 有搜索结果 → 展示搜索结果列表（复用 HotSection 或新的搜索结果区）
  - 无搜索 + loading → Loading
  - 无搜索 + 有数据 → 三个 HotSection（保持当前逻辑）
  - 搜索返回空 → "未找到相关资源" 提示
- 搜索时 URL 参数同步 `?q=xxx`（可选，建议做）

### 3. 分类浏览页 — `src/app/category/[type]/page.tsx`

新建页面，路由 `/category/mod`、`/category/shader`、`/category/resourcepack`：

- 从 URL 读取 `type` 参数
- 调用 `/api/list?type=xxx&offset=0&limit=40`（如果 `/api/list` 不存在，直接调 CurseForge + Modrinth 的 fetchPopularList/fetchPopular 获取大量数据）
- 顶部标题：对应的中文名（Mod / 光影 / 材质包）+ 资源数量
- 返回按钮："← 返回首页"
- 用 ResourceCard 网格展示
- 加载中和空状态处理

注意：如果 `@/lib/curseforge.ts` 和 `@/lib/modrinth.ts` 中的函数签名与网页版一致，`/api/list` 可能还不存在。可以：
- 方案 A：创建 `/api/list/route.ts`（推荐，后续步骤也需要）
- 方案 B：在 client component 中直接调 `/api/popular?type=xxx` 获取更多数据

推荐方案 A。如果选择创建 `/api/list`，参考网页版 `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\list\route.ts` 实现。

### 4. 修复 ResourceCard — `src/components/home/ResourceCard.tsx`

当前 ResourceCard 自己写了一个 `formatDownloads` 函数：

```ts
const formatDownloads = (n: number): string => { ... }
```

而 Step 2 已从网页版照搬了 `src/lib/format.ts`，里面已经有一个 `formatDownloads`。

把 ResourceCard 中的内联函数删除，改为：
```ts
import { formatDownloads } from '@/lib/format';
```

确认 `@/lib/format.ts` 导出的 `formatDownloads` 签名与使用方式一致（接收 number，返回 string）。

### 5. 补充——导航栏添加分类入口（可选）

如果觉得有必要，在 Navbar 中添加"分类"下拉菜单或链接。当前 Navbar 只有 首页/收藏夹/设置。这一步不是必须，自行判断。

## 约束条件

- 不修改 `tailwind.config.ts` 已有色板
- 不创建 Electron 相关文件（那是 Step 9 的事）
- 不修改 Step 1-3 已完成的 `layout.tsx`、`Navbar.tsx`、`globals.css` 核心结构
- 不安装新依赖
- 所有新增/修改文件的样式必须用 `mc-*` 前缀 class（`bg-mc-card`、`text-mc-text` 等）
- ResourceCard 的 prop 名保持 `resource`，不要改回网页版的 `item`
- 搜索 API 保持与现有 `/api/popular` 一致的响应格式

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | 搜索 API 返回真数据 | 浏览器访问 `/api/search?q=sodium`，返回非空数组，含 CF+MR 结果 |
| 2 | 首页搜索可用 | 搜索框输入 "sodium" → 回车 → 看到搜索结果卡片 |
| 3 | 搜索结果正确 | 结果中的 sodium mod 显示名称、图标、下载量 |
| 4 | 分类浏览页可用 | 访问 `/category/mod`，看到大量 Mod 卡片 |
| 5 | 分类页类型切换 | 访问 `/category/shader`，显示光影；`/category/resourcepack` 显示材质包 |
| 6 | ResourceCard 用 @/lib/format | 确认 import { formatDownloads } from '@/lib/format'，没有内联函数 |
| 7 | `npm run build` 成功 | 无类型或编译错误 |
| 8 | 搜索空结果提示 | 搜索 "asdfghjklxyz"，显示"未找到"提示 |

## 完成后

完成后告诉我：Step 4 已完成，可以进入 Step 5。并简要说明实际执行中做了哪些与计划不同的改动（如果有）。

---

> 历史步骤存档：`prompts/step-01.md`、`prompts/step-02.md`、`prompts/step-03.md`。复盘时直接查看对应文件。

---

## 实际执行记录

### 相比原计划

- **多做了**：
  - 首页 `page.tsx` 用 `Suspense` 包裹 `useSearchParams`（Next.js 要求）
  - 首页搜索实现 URL 参数同步（`router.push + searchParams`）
  - `/api/list` 增加完整分页支持（`page` / `limit` / `total` / `totalPages`）
  - `category/[type]` 页增加 TYPE_LABELS + TYPE_ICONS 映射表
- **少做了**：
  - 导航栏未添加分类入口（原计划标记为"可选"，实际判断不必要时跳过）
- **改动点**：
  - 搜索 API 未做 `.slice(0, 24)` 截断，直接返回全部 mergeResults
  - ResourceCard 内联 `formatDownloads` 已删除，改用 `@/lib/format`

### 实际新增文件

| 文件 | 说明 |
|------|------|
| `src/app/api/list/route.ts` | 按类型分页列表 API，CF+MR 合并，含 total/page/totalPages |
| `src/app/category/[type]/page.tsx` | 分类浏览页，TYPE_LABELS/TYPE_ICONS 映射，← 返回首页 |

### 实际修改文件

| 文件 | 改动 |
|------|------|
| `src/app/api/search/route.ts` | 骨架→完整实现，CF+MR 合并搜索 |
| `src/app/page.tsx` | 3 种状态切换（搜索中/搜索结果/热门默认），Suspense + useSearchParams URL 同步 |
| `src/components/home/ResourceCard.tsx` | 删除内联 formatDownloads，改用 @/lib/format |
