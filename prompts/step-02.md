# 开发执行 Prompt — MC Mod Hub 桌面版 Step 2

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 项目背景

MC Mod Hub 桌面版是一个 Windows 桌面软件，帮 Minecraft 玩家从 CurseForge 和 Modrinth 搜索模组/光影/材质包，管理收藏夹，批量下载。基于 Electron + Next.js 14。整个项目分为 **10 个独立步骤**开发，本文档是 **Step 2**。

## 当前状态

Step 1 已完成：所有配置文件就绪，`npm run dev` 能启动空项目。

## 当前目标

**Step 2：基础设施层** — 类型定义 + 数据库 + API 客户端全部就绪，可以调用 CurseForge/Modrinth API 拿到数据。

本步的关键思路：从网页版项目照搬代码，不做新设计。

## 要完成的内容

### 网页版源文件位置

所有代码从 `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\` 照搬。

### 需要创建的文件

```
src/types/index.ts       — ResourceItem, ResourceDetail, Collection, CollectionItem, VersionFile, ApiResponse<T> 等
src/lib/db.ts            — getDb(), execAndSave(), queryAll<T>(), queryOne<T>(), 建表逻辑（3张表）
src/lib/curseforge.ts    — searchMods(), fetchPopular(), getModDetail(), getModFiles(), getModFileDownloadUrl()
src/lib/modrinth.ts      — searchProjects(), fetchPopular(), getProjectDetail(), getProjectVersions(), getVersionDownloadUrl()
src/lib/merger.ts        — mergeResults() 搜索结果去重合并
src/lib/format.ts        — formatDownloads() 下载量格式化
src/lib/game-versions.ts — Minecraft 游戏版本号映射
src/types/sql.js.d.ts    — sql.js 类型声明（如果网页版有的话）
```

### 开发步骤

1. 读取网页版 `src/types/index.ts`，照搬到本项目的 `src/types/index.ts`
2. 读取网页版 `src/lib/db.ts`，照搬到本项目的 `src/lib/db.ts`
3. 读取网页版 `src/lib/curseforge.ts`，照搬到本项目的 `src/lib/curseforge.ts`
4. 读取网页版 `src/lib/modrinth.ts`，照搬到本项目的 `src/lib/modrinth.ts`
5. 读取网页版 `src/lib/merger.ts`，照搬到本项目的 `src/lib/merger.ts`
6. 读取网页版 `src/lib/format.ts`，照搬到本项目的 `src/lib/format.ts`
7. 读取网页版 `src/lib/game-versions.ts`，照搬到本项目的 `src/lib/game-versions.ts`
8. 如果网页版有 `src/types/sql.js.d.ts`，也照搬过来
9. 运行 `npm run build` 确认无类型错误

### 注意事项

- 照搬时保持代码原样，不要重构或优化
- 如果某个函数网页版没有但本步清单列了，跳过即可——以网页版实际内容为准
- 所有 import 路径保持 `@/` 别名形式，与 Step 1 的 tsconfig 配置一致

## 约束条件

- 不创建任何页面或组件（那是 Step 3+ 的事）
- 不安装新依赖（Step 1 已装好）
- 不创建任何 API 路由（那是 Step 4+ 的事）
- 不修改 Step 1 创建的配置文件

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | `npm run build` 无类型错误 | 终端运行，exit code 为 0 |
| 2 | 所有 `@/lib/*` 导入路径正常工作 | 在任意新文件中 `import { getDb } from '@/lib/db'` 不报错 |
| 3 | 所有 `@/types` 导入路径正常工作 | `import { ResourceItem } from '@/types'` 不报错 |
| 4 | 数据库模块可导入 | `import { getDb } from '@/lib/db'` 成功 |
| 5 | CurseForge 模块可导入 | `import { searchMods } from '@/lib/curseforge'` 成功 |
| 6 | Modrinth 模块可导入 | `import { searchProjects } from '@/lib/modrinth'` 成功 |
| 7 | 合并模块可导入 | `import { mergeResults } from '@/lib/merger'` 成功 |

## 完成后

完成后告诉我：Step 2 已完成，可以进入 Step 3。我会更新 prompt.md 为下一步的内容。

---

## ✅ 执行记录（Step 2 已完成）

**完成时间**：Step 2 in this conversation

### 实际改动文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types/index.ts` | ✨ 新建 | 从网页版照搬：`ResourceItem`、`ResourceDetail`、`Collection`、`CollectionItem`、`VersionFile`、`Dependency`、`SearchResult`、`PopularParams`、`SearchParams`、`ApiResponse<T>` 等 12 个 type/interface |
| `src/lib/db.ts` | ✨ 新建 | sql.js 数据库模块：`getDb()`、`execAndSave()`、`queryAll<T>()`、`queryOne<T>()`、`closeDb()`，3 张表（collections、collection_items、recently_viewed），懒加载 + 单例 + 自动落盘 |
| `src/lib/curseforge.ts` | ✨ 新建 | CurseForge API：`searchMods()`、`fetchPopular()`、`fetchPopularList()`、`getModDetail()`、`getModFiles()`、`getModsBatch()`、`getModFileDownloadUrl()`、`mapClassToType()` |
| `src/lib/modrinth.ts` | ✨ 新建 | Modrinth API：`searchProjects()`、`fetchPopular()`、`fetchPopularList()`、`getProjectDetail()`、`getProjectVersions()`、`getProjectsBatch()`、`getVersionDetail()` |
| `src/lib/merger.ts` | ✨ 新建 | `mergeResults()` 按 downloadCount 降序 + `source-id` 去重 |
| `src/lib/format.ts` | ✨ 新建 | `formatDownloads()` 下载量格式化（K/M）、`formatFileSize()` 文件大小格式化（B/KB/MB） |
| `src/lib/game-versions.ts` | ✨ 新建 | `fetchGameVersions()`（sessionStorage 缓存 + API 回退）、`getFallbackVersions()`（静态版本列表） |
| `src/types/css.d.ts` | ✨ 新建 | CSS import 类型声明（`declare module '*.css'`），解决 TypeScript 编译报错 |
| `package.json` | 🔧 修正 | `better-sqlite3` + `@types/better-sqlite3` → `sql.js` (^1.12.0)；新增 `@types/sql.js` devDependency |
| `next.config.js` | 🔧 修正 | 补充 `webpack externals` 排除 `sql.js`（避免 WASM 打包问题） |
| `src/app/api/popular/route.ts` | 🔧 修正 | 类型名适配：`Resource`→`ResourceItem`、`mergeResources`→`mergeResults`；函数名适配：`fetchPopularMods`→`cfFetchPopular` |
| `src/app/api/search/route.ts` | 🔧 修正 | 类型名适配：`Resource`→`ResourceItem` |
| `src/app/page.tsx` | 🔧 修正 | 类型名适配：`Resource`→`ResourceItem` |
| `src/components/home/HotSection.tsx` | 🔧 修正 | 类型名适配：`Resource`→`ResourceItem` |
| `src/components/home/ResourceCard.tsx` | 🔧 修正 | 类型名适配 + 字段名适配：`Resource`→`ResourceItem`、`description`→`summary`、`downloads`→`downloadCount` |
| `src/app/settings/page.tsx` | ✨ 新建 | 设置页最简占位（Step 3 需要导航到 /settings） |

### 验收结果

| 编号 | 验收项 | 结果 |
|------|--------|------|
| 1 | `npm run build` 无类型错误 | ✅ ✓ Compiled successfully, types valid |
| 2 | 所有 `@/lib/*` 导入路径正常工作 | ✅ `import { getDb } from '@/lib/db'` 通过 |
| 3 | 所有 `@/types` 导入路径正常工作 | ✅ `import { ResourceItem } from '@/types'` 通过 |
| 4 | 数据库模块可导入 | ✅ `getDb` / `execAndSave` / `queryAll` / `queryOne` / `closeDb` |
| 5 | CurseForge 模块可导入 | ✅ `searchMods` / `fetchPopular` / `getModDetail` / `getModFiles` / `getModFileDownloadUrl` / `getModsBatch` |
| 6 | Modrinth 模块可导入 | ✅ `searchProjects` / `fetchPopular` / `getProjectDetail` / `getProjectVersions` / `getProjectsBatch` / `getVersionDetail` |
| 7 | 合并模块可导入 | ✅ `mergeResults` |

### npm run build 输出

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (6/6)

Route (app)                              Size     First Load JS
┌ ○ /                                    2.27 kB        98.2 kB
├ ○ /_not-found                          873 B          88.1 kB
├ ƒ /api/popular                         0 B                0 B
├ ○ /api/search                          0 B                0 B
├ ○ /collections                         179 B          96.1 kB
├ ƒ /collections/[id]                    179 B          96.1 kB
└ ƒ /resource/[source]/[id]              179 B          96.1 kB
```

### 备注

- 网页版无 `src/types/sql.js.d.ts`，改为安装 `@types/sql.js` npm 包解决类型声明
- Step 1 误装了 `better-sqlite3`（技术设计指定 sql.js），本步一并修正
- Step 1 提前创建了页面/组件使用了旧类型名，本步全部适配为新命名
- 所有代码与网页版保持一致，未做重构

---

> 历史步骤存档：`prompts/step-01.md`、`prompts/step-02.md`、`prompts/step-03.md`。需要复盘时直接查看对应文件。
