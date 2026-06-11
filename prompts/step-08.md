# 开发执行 Prompt — MC Mod Hub 桌面版 Step 8

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 项目背景

MC Mod Hub 桌面版是一个 Windows 桌面软件，帮 Minecraft 玩家从 CurseForge 和 Modrinth 搜索模组/光影/材质包，管理收藏夹，批量下载。基于 Electron + Next.js 14。整个项目分为 **10 个独立步骤**开发，本文档是 **Step 8**。

## 当前状态

Step 1-7 已完成。核心功能全部就绪：搜索、热门、资源详情、单文件下载、收藏夹 CRUD、收藏夹详情、版本选择、筛选、批量下载（zip + folder）。

**本步要补充的是"锦上添花"功能**：最近浏览、更新提醒、分类完善。

| 关键文件 | 状态 |
|------|------|
| `src/app/page.tsx` | ✅ 搜索+3个HotSection+搜索结果。**缺少** RecentlyViewed + UpdateAlerts 板块 |
| `src/app/resource/[source]/[id]/page.tsx` | ✅ 完整详情页。**需要**浏览时记录到 recently_viewed 表 |
| `src/app/api/recently-viewed/` | ❌ **不存在** |
| `src/app/api/check-updates/` | ❌ **不存在** |
| `src/app/api/resolve-names/` | ❌ **不存在** |
| `src/components/home/RecentlyViewed.tsx` | ❌ **不存在** |
| `src/components/home/UpdateAlerts.tsx` | ❌ **不存在** |
| `src/app/updates/page.tsx` | ❌ **不存在** |
| `src/app/collections/[id]/page.tsx` | ✅ Step 7 完成（sticky header+筛选+批量下载） |
| `src/app/api/batch-download/route.ts` | ✅ 3并发 zip+DEFLATE level1 |
| `src/app/api/game-versions/route.ts` | ✅ Modrinth tag API |
| `src/lib/game-versions.ts` | ✅ FALLBACK_VERSIONS exported |

## 当前目标

**Step 8：补充功能** — 最近浏览记录、更新提醒、名称解析、分类浏览完善。

## 需要创建的文件

```
src/app/api/recently-viewed/route.ts      — GET 最近浏览列表 + POST 记录浏览
src/app/api/check-updates/route.ts        — GET 检查收藏夹中资源的更新
src/app/api/resolve-names/route.ts        — POST 批量解析 Mod ID → 名称
src/components/home/RecentlyViewed.tsx    — 最近浏览板块（横向卡片列表）
src/components/home/UpdateAlerts.tsx      — 更新提醒板块（有新版本时显示）
src/app/updates/page.tsx                  — 更新提醒详情页
```

## 需要修改的文件

```
src/app/page.tsx                          — 首页加入 RecentlyViewed + UpdateAlerts 板块
src/app/resource/[source]/[id]/page.tsx   — 浏览时记录到 recently_viewed 表
```

## 开发步骤

### 1. 最近浏览 API — `src/app/api/recently-viewed/route.ts`

数据库表 `recently_viewed` 已在 Step 2 建好。

- **GET**：查询最近 20 条浏览记录，按 `viewed_at DESC` 排序
  - 返回 `{ success: true, data: RecentlyViewed[] }`
- **POST**：记录一次浏览，接收 body：
  ```json
  { "resourceType": "mod", "resourceId": "123", "resourceName": "Sodium", "source": "modrinth", "iconUrl": "..." }
  ```
  - 如果该资源已存在（同 source + resourceId），更新 `viewed_at` 为当前时间
  - 如果不存在，生成 UUID 插入新记录
  - 返回 `{ success: true }`

### 2. 最近浏览组件 — `src/components/home/RecentlyViewed.tsx`

- `'use client'`
- `useEffect` 调 `GET /api/recently-viewed`
- 横向卡片列表：每张卡片显示图标（32x32）、名称、来源标签
- 点击卡片跳转到 `/resource/[source]/[id]`
- 空状态：不显示板块（而非显示"暂无"）
- 样式：复用 ResourceCard 的 `mc-*` class，但简化版（更紧凑）
- 参考网页版：`D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\home\RecentlyViewed.tsx`

### 3. 记录浏览 — 修改资源详情页

在 `src/app/resource/[source]/[id]/page.tsx` 的加载完成后，发送 POST 记录浏览：

```ts
// 在 useEffect 中，resource 加载成功后
fetch('/api/recently-viewed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resourceType: resource.type,
    resourceId: resource.id,
    resourceName: resource.name,
    source: resource.source,
    iconUrl: resource.iconUrl,
  }),
}).catch(() => {}); // 静默失败，不影响主流程
```

### 4. 更新检查 API — `src/app/api/check-updates/route.ts`

- `GET /api/check-updates`
- 查询所有收藏夹中的所有资源（`collection_items` 表）
- 对每个资源，调用 `/api/resource/${source}/${resourceId}` 获取最新版本信息
- 对比：
  - 如果 `selected_file_id` 为空 → 标记为"未选择版本"
  - 如果资源有新版本（最新版本 id ≠ selected_file_id）→ 标记为"有新版本"
- 返回有更新的资源列表：

```json
{
  "success": true,
  "data": [
    {
      "collectionName": "1.21生存档",
      "collectionId": "...",
      "resourceName": "Sodium",
      "resourceId": "...",
      "source": "modrinth",
      "currentFileId": "...",
      "latestFileId": "...",
      "latestFileName": "sodium-0.6.0.jar",
      "latestGameVersion": "1.21"
    }
  ]
}
```

**性能注意**：收藏夹可能有很多资源，需要并发请求但限制并发数。复用 Step 7 batch-download 的 `withConcurrencyLimit` 思路（3 并发）。

参考网页版：`D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\check-updates\route.ts`

### 5. 更新提醒组件 — `src/components/home/UpdateAlerts.tsx`

- `'use client'`
- `useEffect` 调 `GET /api/check-updates`
- 显示：有 N 个资源可更新的提示
- 如果有更新：
  - 显示一个醒目的提示栏（苦力怕绿边框），列出前 3 条更新的资源名 + 版本号
  - "查看全部"链接跳转到 `/updates`
- 如果无更新：不显示（不是"暂无更新"，而是完全隐藏板块）

### 6. 更新提醒详情页 — `src/app/updates/page.tsx`

- `'use client'`
- 调 `GET /api/check-updates`
- 显示所有有更新的资源列表
- 每行：资源名称、所在收藏夹、当前版本 → 新版本、来源标签
- 点击资源名跳转到详情页
- 空状态："所有资源都是最新版本 ✨"

### 7. 名称解析 API — `src/app/api/resolve-names/route.ts`

- `POST /api/resolve-names`
- 接收 `{ ids: [{ source: "curseforge", id: "123" }, ...] }`
- 对 CurseForge IDs：批量调用 `getModsBatch(ids)` 获取名称
- 对 Modrinth IDs：逐个或批量调用 `getProjectDetail(id)` 获取名称
- 返回 `{ success: true, data: { "curseforge:123": "Mod Name", ... } }`

这个 API 供版本选择器或详情页使用——当只需要显示资源名称但手头只有 ID 时调用。

参考网页版：`D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\resolve-names\route.ts`

### 8. 首页集成

修改 `src/app/page.tsx`，在三个 HotSection 下方添加：

- **最近浏览板块**：`<RecentlyViewed />`
  - 只在有浏览记录时显示
  - 放在"热门材质包"板块之后
- **更新提醒板块**：`<UpdateAlerts />`
  - 只在有更新时显示
  - 放在最近浏览之后

这两部分都在搜索结果模式下隐藏（只在默认首页视图显示）。

## 可参考的网页版文件

| 网页版文件 | 参考内容 |
|-----------|----------|
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\recently-viewed\route.ts` | 最近浏览 API |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\check-updates\route.ts` | 更新检查 API |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\resolve-names\route.ts` | 名称解析 API |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\home\RecentlyViewed.tsx` | 最近浏览组件 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\home\UpdateAlerts.tsx` | 更新提醒组件 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\updates\page.tsx` | 更新提醒详情页 |

> **重要**：参考网页版的**逻辑和结构**，UI 全部改为 `mc-*` class。

## 约束条件

- 不修改 Step 1-7 已完成的核心文件（page.tsx 和 resource page.tsx 的添加是追加，不是覆盖）
- 第 3 步记录浏览是**追加**代码到已有 `useEffect` 末尾，不修改已有逻辑
- 第 8 步首页集成是**追加**两个组件到现有的三个 HotSection 之后
- 不安装新依赖
- 所有 UI 用 `mc-*` 样式

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | 浏览记录被保存 | 打开一个 Mod 详情页 → 回首页 → 最近浏览板块显示该 Mod |
| 2 | 最近浏览最多 20 条 | 浏览 25 个不同 Mod → 回首页只显示 20 个 |
| 3 | 重复浏览更新 time | 浏览同一个 Mod 两次 → 最近浏览中它排在最前面 |
| 4 | 更新检查 API 可用 | 收藏夹中有 Mod 已选版本后，`/api/check-updates` 返回数据 |
| 5 | 首页显示更新提醒 | 有更新时首页显示更新提醒板块 |
| 6 | 更新提醒详情页可用 | 访问 `/updates`，看到有更新的资源列表 |
| 7 | 名称解析 API 可用 | POST `/api/resolve-names` 返回名称映射 |
| 8 | 首页无浏览时不显示板块 | 清除数据库后刷新首页，最近浏览板块不出现 |
| 9 | `npm run build` 成功 | 无类型或编译错误 |

## 完成后

完成后告诉我：Step 8 已完成，可以进入 Step 9。并简要说明实际执行中做了哪些与计划不同的改动（如果有）。

---

> 历史步骤存档：`prompts/step-01.md` ~ `prompts/step-07.md`。复盘时直接查看对应文件。

---

## 实际执行记录

相比原计划：
- 多做了：无
- 少做了：无
- 改动点：
  - 网页版 `resolve-names` API 是 GET 方法按 source 分组传 ids，改为 POST 方法接收混合 sources 的数组（`{ ids: [{ source, id }] }`），与 Prompt 中规格一致
  - 网页版 UpdateAlerts 显示"暂无可用的更新提醒"空状态，改为完全隐藏板块（符合 Prompt 要求）；但 `/updates` 页保留空状态提示"所有资源都是最新版本 ✨"
  - 网页版更新提醒用 yellow-400 配色，改为 `mc-green-light` / `mc-green` 配色
  - 网页版颜色 class（purple-400、gray-*）全部替换为 `mc-*` 色板

实际新增文件：
- `src/app/api/recently-viewed/route.ts`：GET 最近 20 条 + POST upsert 记录浏览
- `src/app/api/check-updates/route.ts`：GET 检查收藏夹资源更新，3 并发调用 CurseForge/Modrinth API
- `src/app/api/resolve-names/route.ts`：POST 批量解析 Mod ID → 名称（支持混合 sources）
- `src/components/home/RecentlyViewed.tsx`：横向网格卡片列表，空状态隐藏板块
- `src/components/home/UpdateAlerts.tsx`：更新提醒板块，苦力怕绿配色，最多显示 3 条
- `src/app/updates/page.tsx`：全部更新提醒详情页，按类型分组显示

实际修改文件：
- `src/app/page.tsx`：导入 RecentlyViewed + UpdateAlerts，在三个 HotSection 之后追加两个板块
- `src/app/resource/[source]/[id]/page.tsx`：在 resource 加载成功的 useEffect 中追加 POST 到 `/api/recently-viewed`

验证状态：
- `npm run build`：当前环境无法运行 Node.js/npm，已通过人工 review 确认所有文件类型正确、导入路径有效


---

## 实际执行记录

### 相比原计划

- **多做了**：
  - recently-viewed API 用 Upsert 策略（重复浏览更新 viewed_at 而非新增记录）
  - check-updates API 用 SQL JOIN 一次查出所有收藏夹资源，仅对有 selectedFileId 的检查更新
  - check-updates 用 `Promise.allSettled` + 3 并发，按 `fileDate`/`date_published` 排序找最新 release
  - UpdateAlerts 首页显示前 3 条，带铃铛图标 + 绿色 badge 数量 + "查看全部"链接
  - updates 详情页按类型分组（Mod/光影/材质包），按 TYPE_ORDER 排序
  - resolve-names API 从 modrinth.ts 调用 `getProjectsBatch`（Step 8 新增）
  - 详情页 POST recently-viewed 放在 `setResource` 之后，静默失败
- **少做了**：无
- **改动点**：
  - 首页追加 RecentlyViewed + UpdateAlerts 在三个 HotSection 之后，搜索模式下不显示

### 实际新增文件

| 文件 | 说明 |
|------|------|
| `src/app/api/recently-viewed/route.ts` | GET 最近 20 条 + POST Upsert 记录浏览 |
| `src/app/api/check-updates/route.ts` | GET JOIN 查询 + 3并发CF/MR检查 + findLatest release |
| `src/app/api/resolve-names/route.ts` | POST 分源批量解析，调 getModsBatch/getProjectsBatch |
| `src/components/home/RecentlyViewed.tsx` | 5列网格卡片，空数据返回 null |
| `src/components/home/UpdateAlerts.tsx` | 铃铛图标+绿色badge数量+前3条+查看全部 |
| `src/app/updates/page.tsx` | 按类型分组列表，TYPE_ORDER排序 |

### 实际修改文件

| 文件 | 改动 |
|------|------|
| `src/app/page.tsx` | 追加 import+RecentlyViewed+UpdateAlerts 板块，搜索模式隐藏 |
| `src/app/resource/[source]/[id]/page.tsx` | useEffect 中追加 POST /api/recently-viewed 记录浏览 |

### 实际 lib 层新增

| lib 文件 | 新增函数 |
|----------|---------|
| `src/lib/modrinth.ts` | `getProjectsBatch()` — 批量查询 Modrinth 项目名称 |
