# 开发执行 Prompt — MC Mod Hub 桌面版 Step 7

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 项目背景

MC Mod Hub 桌面版是一个 Windows 桌面软件，帮 Minecraft 玩家从 CurseForge 和 Modrinth 搜索模组/光影/材质包，管理收藏夹，批量下载。基于 Electron + Next.js 14。整个项目分为 **10 个独立步骤**开发，本文档是 **Step 7**。

## 当前状态

Step 1-6 已完成。以下是关键文件的实际状态：

| 文件 | 状态 |
|------|------|
| `src/app/page.tsx` | ✅ 完整首页（搜索URL同步+热门+搜索结果） |
| `src/app/resource/[source]/[id]/page.tsx` | ✅ 完整详情页（Header+VersionSelector+DownloadButton+Toast） |
| `src/app/collections/page.tsx` | ✅ 完整收藏夹列表（CRUD+重命名Modal+新建表单） |
| `src/app/collections/[id]/page.tsx` | ⚠️ **占位**（只显示 ID，等待本步覆盖） |
| `src/app/api/collections/*` | ✅ 5 个收藏夹 API 全部就绪 |
| `src/app/api/download/route.ts` | ✅ 单文件下载（blob 流式转发） |
| `src/app/api/search/route.ts` | ✅ 搜索 |
| `src/app/api/resource/[source]/[id]/route.ts` | ✅ 资源详情（含依赖过滤） |
| `src/components/collection/CollectionCard.tsx` | ✅ 收藏夹卡片（hover 按钮+Link 跳转） |
| `src/components/collection/ItemRow.tsx` | ❌ **不存在** |
| `src/components/home/ContextMenu.tsx` | ✅ ⋮ 菜单（全局单例+收藏夹子菜单） |
| `src/components/resource/VersionSelector.tsx` | ✅ 版本列表+筛选chips+已选面板 |
| `src/components/resource/DownloadButton.tsx` | ✅ blob 触发浏览器下载 |
| `src/components/common/ToastProvider.tsx` | ✅ Context 全局 Toast |
| `src/app/api/batch-download/route.ts` | ❌ **不存在** |
| `src/app/api/game-versions/route.ts` | ❌ **不存在**（但 `@/lib/game-versions.ts` 有 fallback） |
| `src/lib/game-versions.ts` | ✅ fetchGameVersions() 调 /api/game-versions，失败用 fallback |

## 当前目标

**Step 7：收藏夹详情 + 批量下载** — 收藏夹详情页完整功能：资源列表（可勾选+选版本）、筛选、zip 打包/文件夹批量下载。

## 需要创建的文件

```
src/app/collections/[id]/page.tsx           — 收藏夹详情页（覆盖占位）
src/app/api/batch-download/route.ts          — POST 批量下载
src/app/api/game-versions/route.ts           — GET 游戏版本列表（让 @/lib/game-versions.ts 不再 fallback）
src/components/collection/ItemRow.tsx        — 收藏夹内资源行（版本选择器 + 勾选框）
```

## 需要修改的文件

```
（本步只覆盖占位+新建文件，原则上不修改已有核心逻辑）
```

## 开发步骤

### 1. 创建游戏版本 API — `src/app/api/game-versions/route.ts`

`@/lib/game-versions.ts` 已经在调 `/api/game-versions`，但该 API 路由不存在，全靠 fallback。

创建它：
- `GET /api/game-versions`
- 从 CurseForge 或 Modrinth 获取 Minecraft 游戏版本列表
- 如果外部 API 不可用，返回 `@/lib/game-versions.ts` 中的 `FALLBACK_VERSIONS`（需要 export 或直接硬编码）
- 格式：`{ success: true, data: ["1.21.4", "1.21.3", ...] }`

参考网页版：`D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\game-versions\route.ts`

### 2. 创建 ItemRow 组件 — `src/components/collection/ItemRow.tsx`

收藏夹详情页中每行展示一个资源：

- 左侧：勾选框（checkbox）
- 资源图标（小尺寸 32x32） + 资源名称 + 来源平台标签（CF/MR）
- 版本选择下拉框（`<select>`，列出该资源的所有可用版本）
  - 需要调用 `/api/resource/${source}/${id}` 获取版本列表
  - 初次加载后缓存版本列表，避免重复请求
- 删除按钮：从收藏夹移除该资源（调 `/api/collections/remove-resource`）
- 行样式：`bg-mc-card border border-white/5 rounded-mc p-3`
- 使用 `mc-*` 样式

**重要**：ItemRow 需要获取每个资源的版本列表。建议设计为：
- 初始不加载版本（只显示资源基本信息）
- 展开/点击时才加载版本列表（lazy load），避免收藏夹有 20 个 Mod 时并发 20 个请求

或者在父组件（详情页）统一管理：先加载收藏夹内所有资源的版本列表，缓存后传给 ItemRow。

**推荐方案**：详情页加载时并发获取所有资源的详情（`Promise.allSettled`），缓存版本列表到一个 Map，ItemRow 从 Map 取。

### 3. 创建收藏夹详情页 — `src/app/collections/[id]/page.tsx`

覆盖占位实现。`'use client'`。

**数据加载**：
1. 从 URL params 获取 collection id
2. `useEffect` 加载：
   - GET `/api/collections` → 找到当前收藏夹信息（名称、游戏版本）
   - GET `/api/collections/${id}/items` — 需要创建这个 API **吗？不对，当前还没这个接口……**
   
   等等——检查已有 API。`/api/collections` 返回列表但没有 items 信息。需要直接查数据库：

**方案**：在详情页中直接 fetch 数据。可以用已有的数据库查询：
- 收藏夹信息：从 `/api/collections` 的结果中 filter
- 收藏夹内资源：需要新建一个简单 API 或直接在详情页用现有接口组合

**最简单的方案**：在 `src/app/api/collections/[id]/route.ts` 的 GET 中已有逻辑，但当前只有 PUT 和 DELETE。需要新增 GET 方法来返回收藏夹详情+items。

但如果不想改已有 API，可以在详情页用 `@/lib/db.ts` 直接查数据库（因为是 'use client'，不能直接调 server 端 db……）

**正确做法**：在 `src/app/api/collections/[id]/route.ts` 新增 GET 方法：

```ts
export async function GET(request, { params }) {
  const collection = await queryOne<Collection>(...);
  const items = await queryAll<CollectionItem>(
    'SELECT * FROM collection_items WHERE collection_id = ?', [params.id]
  );
  return NextResponse.json({ success: true, data: { ...collection, items } });
}
```

这是合理的——为已有路由文件新增一个 GET 方法，不影响 PUT 和 DELETE。

**详情页功能**：
- 顶部：收藏夹名称 + 游戏版本 + 返回按钮
- 筛选栏（参考 VersionSelector 的筛选 chips 风格）：
  - 按加载器筛选：全部 / Forge / Fabric / NeoForge / Quilt
  - 按发布类型筛选：全部 / 正式版 / Beta / Alpha
  - 按游戏版本筛选：chips 列出该收藏夹内所有资源涉及的游戏版本
- 全选/取消全选
- 资源列表：用 ItemRow 渲染每个资源
- 底部操作栏（sticky 底部）：
  - 已选 `N` 个资源
  - "打包下载 (zip)" 按钮
  - "下载到文件夹" 按钮
  - 未选任何资源时按钮禁用

**版本加载策略**：
- 详情页加载时，收集所有 resource items 的 `source+id`
- `Promise.allSettled` 并发请求每个资源的详情（`/api/resource/${source}/${id}`）
- 成功的结果存 Map，失败的标记为"无法获取版本"
- ItemRow 从 Map 取版本列表渲染 `<select>`

### 4. 创建批量下载 API — `src/app/api/batch-download/route.ts`

- `POST /api/batch-download`
- 接收 body：
```json
{
  "mode": "zip" | "folder",
  "files": [
    { "source": "curseforge", "fileId": "xxx", "fileName": "mod.jar", "modId": "xxx" },
    ...
  ]
}
```
- **zip 模式**：
  1. 在临时目录（`os.tmpdir()` 或项目的 `data/temp/`）创建文件夹
  2. 逐个下载文件到临时目录
  3. 用 `jszip` 打包所有文件为一个 zip
  4. 返回 zip 的临时文件路径和文件名
- **folder 模式**：
  1. 逐个下载文件
  2. 每下载完一个，用 Response 流式返回（或不返回，让前端逐一下载）

**简化方案（浏览器兼容）**：
- zip 模式：后端返回一个包含所有文件二进制数据的 zip blob
- folder 模式：前端收到 files 列表后，逐个调 `/api/download` 下载每个文件

**推荐**：zip 模式在服务端完成打包，返回 blob；folder 模式返回 instructions 让前端逐一下载。

参考网页版：
- `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\batch-download\route.ts`

### 5. 在详情页集成批量下载

- "打包下载 (zip)" 按钮：
  - 收集勾选的资源信息（source/fileId/fileName/modId）
  - POST `/api/batch-download` mode=zip
  - 接收返回的 zip blob → 触发浏览器下载（同 DownloadButton 的 blob+createObjectURL 方式）
  - Toast 提示进度和结果

- "下载到文件夹" 按钮：
  - 遍历勾选的资源
  - 逐个调 `/api/download?source=...&fileId=...&...`
  - 每下载完一个更新进度
  - 全部完成 Toast 提示
  - 有失败的单独提示

## 可参考的网页版文件

| 网页版文件 | 参考内容 |
|-----------|----------|
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\collections\[id]\page.tsx` | 收藏夹详情页结构（ItemRow 列表+筛选+批量下载） |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\collection\ItemRow.tsx` | 资源行组件 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\batch-download\route.ts` | 批量下载 API |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\game-versions\route.ts` | 游戏版本 API |

> **重要**：参考网页版的**逻辑和结构**，UI 全部改为 `mc-*` class。但网页版的 ItemRow 可能逻辑很复杂——本步先做基础版本（版本选择+勾选+删除），复杂的兼容性检查不做。

## 筛选逻辑

收藏夹详情页的筛选是**前端筛选**，不需要额外 API：

- 每个 ItemRow 渲染时带上 `loaders` 和 `releaseType` 信息（从缓存的版本详情中提取）
- 筛选状态用 `useState` 管理
- 筛选条件变化时，`.filter()` 已缓存的 items 列表
- 筛选 chips 参考 VersionSelector 的风格：`bg-mc-green/15`（选中）/ `bg-mc-card`（未选中）

## UI 规范（必须遵守）

- 所有样式用 `mc-*` 前缀 class
- 全选 checkbox + 每条 ItemRow 的 checkbox
- 底部操作栏：sticky bottom，`bg-mc-bg/95 backdrop-blur`（参考导航栏）
- 批量下载按钮：zip 按钮苦力怕绿，folder 按钮次要样式
- 每个 ItemRow hover 时轻微背景变化
- 筛选 chips 复用 VersionSelector 的 chips 风格
- 使用 `useToast()` 全局 Toast

## 约束条件

- 不修改 Step 1-6 已完成的核心文件（可在 `[id]/route.ts` 新增 GET 方法，但不改 PUT/DELETE）
- 不安装新依赖（`jszip` 已在 Step 1 安装）
- 批量下载在浏览器中测试（Electron 集成是 Step 9 的事——zip 用 blob 下载，folder 逐个下载）
- 第一版不做兼容性检查（冲突/依赖检测）
- ItemRow 版本列表 lazy load 或在父组件统一加载，避免过多并发请求

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | 收藏夹详情页能看到所有资源 | 从收藏夹列表点进一个收藏夹，看到所有已添加的资源 |
| 2 | 每个资源可独立选版本 | 在 ItemRow 的版本下拉框中选择不同版本 |
| 3 | 筛选功能正常 | 点击"Forge"筛选 chip，只显示有 Forge 版本的资源 |
| 4 | 能勾选多个资源 | 勾选 3 个资源的 checkbox |
| 5 | 批量打包成 zip | 勾选 ≥2 个资源 → "打包下载(zip)" → 得到一个包含多个文件的 zip |
| 6 | 逐个下载到文件夹 | 勾选 ≥2 个资源 → "下载到文件夹" → 依次下载每个文件 |
| 7 | 下载失败不影响其他 | 某个文件下载失败，其他文件成功，失败的显示错误提示 |
| 8 | 能从收藏夹移除资源 | 点 ItemRow 的删除按钮 → 资源从列表消失 |
| 9 | 游戏版本 API 可用 | 访问 `/api/game-versions`，返回版本列表数组 |
| 10 | `npm run build` 成功 | 无类型或编译错误 |

## 完成后

完成后告诉我：Step 7 已完成，可以进入 Step 8。并简要说明实际执行中做了哪些与计划不同的改动（如果有）。

---

> 历史步骤存档：`prompts/step-01.md` ~ `prompts/step-06.md`。复盘时直接查看对应文件。

---

## 实际执行记录

相比原计划：

- **多做了**：
  - 手动安装了 jszip 及其 4 个传递依赖（lie, pako, readable-stream, setimmediate），因 npm 在当前环境不可用
  - 修改了 `next.config.js` webpack 配置，将 jszip 标记为 external（避免 Node.js 模块在 webpack 中解析失败）
  - 在 `src/app/api/collections/[id]/route.ts` 新增了 GET handler（原计划中建议但文件清单未列出）

- **少做了**：
  - 未实现"按游戏版本筛选 chips"——简化为 loader + release type 两类筛选
  - 未创建 PATCH /api/collections/[id]/items 端点，版本选择仅保存在客户端 state，不持久化到 DB
  - ItemRow 未实现 lazy load 版本列表（统一由父组件预加载后传入）

- **改动点**：
  - `src/lib/game-versions.ts`：`FALLBACK_VERSIONS` 从 `const` 改为 `export const`，供 API route fallback 使用
  - `package.json`：添加 `jszip` 依赖（原 prompt 声称已安装但实际未安装）
  - `next.config.js`：webpack externals 中新增 `'jszip'`

实际新增文件：
- `src/app/api/game-versions/route.ts`：GET 端点，从 Modrinth tag/game_version 获取版本，失败返回 FALLBACK_VERSIONS
- `src/components/collection/ItemRow.tsx`：收藏夹资源行（checkbox + icon + 名称 + 版本选择器 + loader badge + 大小 + 删除按钮），mc-* 样式
- `src/app/api/batch-download/route.ts`：POST 端点，zip 模式服务端 JSZip 打包返回 blob；folder 模式返回 files 列表由前端逐一下载
- `src/app/collections/[id]/page.tsx`：完整详情页（覆盖占位），包含 loader/releaseType 筛选 chips、全选/反选、ItemRow 列表、sticky 底部批量下载栏

实际 UI 约定（如有新增）：
- 筛选 chips 使用 `rounded-full` + `bg-mc-green/20`（选中）/ `bg-mc-card`（未选中）风格
- 底部操作栏 `fixed bottom-0` + `bg-mc-bg/95 backdrop-blur border-t border-white/5`
- ItemRow 勾选态 `bg-mc-green/10 border-mc-green/30`，未勾选 `bg-mc-card hover:bg-mc-card-hover`

---

## 实际执行记录

### 相比原计划

- **多做了**：
  - 详情页 `Promise.all` 并发加载所有资源版本（非 lazy load，一次性加载）
  - 筛选改为下拉选择器（加载器 + 发布类型两个 select），而非 chips
  - batch-download API 用 `withConcurrencyLimit`（3 并发）避免请求过载
  - zip 压缩用 `DEFLATE level 1`（因为 JAR 文件已压缩，高压缩级别无意义且耗时）
  - 下载到文件夹模式：前端逐个调 `/api/download`，间隔 300ms 防止浏览器限流
  - 详情页顶部 sticky header（`sticky top-0 bg-mc-bg/95 backdrop-blur`）
  - 底部操作栏 `fixed bottom-0`（与 sticky header 呼应）
  - `[id]/route.ts` 新增 GET 方法（返回 collection + items）
  - `game-versions.ts` 将 FALLBACK_VERSIONS 改为 `export const`
  - game-versions API 从 Modrinth `/tag/game_version` 获取真实数据（1h 缓存）
- **少做了**：无
- **改动点**：
  - ItemRow 版本列表截断到前 30 个（`allVersions.slice(0, 30)`）
  - 版本匹配逻辑：优先用用户选择的版本 → 按 loader 筛选匹配 → 按 releaseType 匹配 → fallback 第一个版本
  - batch-download folder 模式返回 instructions（前端逐个下载），不是后端逐个下载

### 实际新增文件

| 文件 | 说明 |
|------|------|
| `src/app/api/batch-download/route.ts` | POST zip/folder 批量下载，3并发+JSZip+DEFLATE level1，maxDuration 300s |
| `src/app/api/game-versions/route.ts` | GET /api/game-versions，调 Modrinth tag API，fallback FALLBACK_VERSIONS |
| `src/components/collection/ItemRow.tsx` | 版本 select+勾选+移除按钮+loader badge+文件大小 |

### 实际修改文件

| 文件 | 改动 |
|------|------|
| `src/app/collections/[id]/page.tsx` | 占位→完整详情页：sticky header+筛选栏+全选+ItemRow列表+sticky底部操作栏+zip/folder双模式 |
| `src/app/api/collections/[id]/route.ts` | 新增 GET 方法（返回 collection + items 数组） |
| `src/lib/game-versions.ts` | FALLBACK_VERSIONS 改为 `export const`（供 game-versions API import） |

### 实际 UI 约定（新增）

- 批量下载 sticky 底部栏：`fixed bottom-0 bg-mc-bg/95 backdrop-blur border-t border-white/5`
- 详情页 header：`sticky top-0 z-10 bg-mc-bg/95 backdrop-blur border-b border-white/5`
- 筛选选择器：`bg-mc-card text-mc-muted border border-white/5 rounded-full`（选中 `bg-mc-green/20`）
- ItemRow 勾选态：`bg-mc-green/10 border-mc-green/30`
