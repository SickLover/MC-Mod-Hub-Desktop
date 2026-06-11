# 开发执行 Prompt — MC Mod Hub 桌面版 Step 6

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 项目背景

MC Mod Hub 桌面版是一个 Windows 桌面软件，帮 Minecraft 玩家从 CurseForge 和 Modrinth 搜索模组/光影/材质包，管理收藏夹，批量下载。基于 Electron + Next.js 14。整个项目分为 **10 个独立步骤**开发，本文档是 **Step 6**。

## 当前状态

Step 1-5 已完成。以下是关键文件的实际状态：

| 文件 | 状态 |
|------|------|
| `src/app/page.tsx` | ✅ 完整首页：搜索(URL同步) + 3个热门板块 + 搜索结果 |
| `src/app/resource/[source]/[id]/page.tsx` | ✅ 完整详情页：ResourceHeader + VersionSelector(含筛选chips) + DownloadButton + Toast |
| `src/app/api/resource/[source]/[id]/route.ts` | ✅ 资源详情 API |
| `src/app/api/download/route.ts` | ✅ 下载代理 API（blob 流式转发） |
| `src/app/api/search/route.ts` | ✅ 搜索 API |
| `src/app/api/popular/route.ts` | ✅ 热门 API |
| `src/app/api/list/route.ts` | ✅ 分页列表 API |
| `src/app/category/[type]/page.tsx` | ✅ 分类浏览页 |
| `src/components/resource/ResourceHeader.tsx` | ✅ 图标/名称/作者/分类badge/源站链接/下载量 |
| `src/components/resource/VersionSelector.tsx` | ✅ 版本列表+游戏版本筛选chips+已选面板+radio indicator |
| `src/components/resource/DownloadButton.tsx` | ✅ blob+createObjectURL 触发浏览器下载 |
| `src/components/home/ResourceCard.tsx` | ✅ 卡片（prop 名 `resource`，⋮ 按钮为 stub） |
| `src/components/common/Toast.tsx` | ✅ success/error/info，visible/onClose 外部控制 |
| `src/components/common/Loading.tsx` | ✅ 加载（可选 text prop） |
| `src/components/common/Empty.tsx` | ✅ 空状态 |
| `src/components/layout/Navbar.tsx` | ✅ ⛏️ Logo + 首页/收藏夹/设置 |
| `src/app/collections/page.tsx` | ⚠️ **占位** |
| `src/app/collections/[id]/page.tsx` | ⚠️ **占位**（Step 7 实现） |
| `src/app/settings/page.tsx` | ✅ 占位（Step 9 实现） |
| **Collections API 路由** | ❌ **全部不存在** |
| **CollectionCard 组件** | ❌ **不存在** |
| **ContextMenu 组件** | ❌ **不存在** |

## 当前目标

**Step 6：收藏夹管理** — 收藏夹列表页完整 CRUD，能从资源卡片的 ⋮ 菜单快速添加资源到收藏夹。

## 需要创建的文件

```
src/app/api/collections/route.ts                  — GET 列表 + POST 创建
src/app/api/collections/[id]/route.ts             — PUT 重命名 + DELETE 删除
src/app/api/collections/[id]/items/route.ts       — POST 添加资源到收藏夹
src/app/api/collections/favorited/route.ts        — GET 检查哪些资源已收藏（返回资源ID集合，供前端判断是否显示⭐）
src/app/api/collections/remove-resource/route.ts  — POST 从收藏夹移除资源
src/components/collection/CollectionCard.tsx       — 收藏夹卡片（名称/游戏版本/资源数量/操作按钮）
src/components/home/ContextMenu.tsx               — 资源卡片的 ⋮ 弹出菜单
```

## 需要修改的文件

```
src/app/collections/page.tsx                      — 占位→完整收藏夹列表页
src/components/home/ResourceCard.tsx              — ⋮ 按钮接入 ContextMenu
```

## 开发步骤

### 1. 创建收藏夹 CRUD API

**`src/app/api/collections/route.ts`**
- `GET`：从数据库查询所有收藏夹，返回 `{ success: true, data: Collection[] }`
- `POST`：接收 `{ name: string, gameVersion: string, releaseType?: string }`，生成 UUID 作为 id，写入数据库，返回创建的 Collection

**`src/app/api/collections/[id]/route.ts`**
- `PUT`：接收 `{ name?: string }`，更新收藏夹名称和 updated_at
- `DELETE`：删除收藏夹（CASCADE 会自动删除关联的 collection_items）

**`src/app/api/collections/[id]/items/route.ts`**
- `POST`：接收 `{ resourceType, resourceId, resourceName, source, iconUrl }`，插入到 collection_items 表
- 如果该资源已在收藏夹中（同 collection_id + resource_id + source），返回 409 提示已存在

**`src/app/api/collections/favorited/route.ts`**
- `GET`：接收 `?source=xxx&resourceIds=id1,id2,id3`，查询哪些资源已在收藏夹中
- 返回 `{ success: true, data: { [resourceId]: boolean } }`

**`src/app/api/collections/remove-resource/route.ts`**
- `POST`：接收 `{ collectionId, resourceId, source }`，从 collection_items 中删除对应记录

所有 API 统一返回 `{ success, data?, error? }` 格式。数据库操作通过 `@/lib/db.ts` 的 `getDb()` / `queryAll<T>()` / `queryOne<T>()` / `execAndSave()`。

参考网页版：
- `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\collections\` 下的所有文件

### 2. 创建 CollectionCard 组件 — `src/components/collection/CollectionCard.tsx`

- 接收 `Collection` 类型 prop
- 显示：收藏夹名称（大字）、游戏版本标签、资源数量（需要查询，先在卡片内部简单的独立 fetch 或接收 count prop）
- 操作按钮：重命名（弹出输入框）、删除（确认后删除）
- 点击卡片跳转到 `/collections/[id]`（目前是占位页，Step 7 完善）
- 统一使用 `mc-*` 样式

### 3. 创建 ContextMenu 组件 — `src/components/home/ContextMenu.tsx`

- 接收 `ResourceItem` 类型 prop + 收藏夹列表 + 已收藏状态
- 点击 ⋮ 弹出上下文菜单
- 菜单项：
  - "添加到收藏夹" → 展开子菜单列出所有收藏夹 → 点击某个收藏夹调用添加 API
  - 如果已收藏，显示"从收藏夹移除" → 调用移除 API
- 弹出位置：避免溢出视口（如果卡片在底部，菜单向上弹出）
- 点击菜单外部关闭菜单
- 添加/移除成功后 Toast 提示

参考网页版：
- `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\home\ContextMenu.tsx`

### 4. 改造 ResourceCard 接入 ContextMenu

- 保留现有的 ⋮ 按钮 UI
- 点击 ⋮ 时显示 ContextMenu
- ContextMenu 需要知道该资源是否已被收藏（调用 `/api/collections/favorited`）和收藏夹列表

### 5. 创建收藏夹列表页 — `src/app/collections/page.tsx`

覆盖当前占位实现：
- `'use client'`
- 加载时 fetch `/api/collections` 获取所有收藏夹
- 新建收藏夹表单：输入名称 + 选择游戏版本 + 创建按钮
- 收藏夹网格（复用 grid 布局）
- 空状态："还没有收藏夹，创建一个吧"
- 加载态：Loading
- 游戏版本可以从 `@/lib/game-versions.ts` 获取常用列表

## 可参考的网页版文件

| 网页版文件 | 参考内容 |
|-----------|----------|
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\collections\route.ts` | 收藏夹列表+创建 API |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\collections\[id]\route.ts` | 收藏夹重命名+删除 API |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\collections\[id]\items\route.ts` | 添加资源到收藏夹 API |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\collections\favorited\route.ts` | 已收藏检查 API |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\collections\remove-resource\route.ts` | 移除资源 API |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\collection\CollectionCard.tsx` | 收藏夹卡片结构 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\home\ContextMenu.tsx` | ⋮ 菜单组件结构 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\collections\page.tsx` | 收藏夹列表页结构 |

> **重要**：照搬逻辑，UI 全部改为 `mc-*` class（`bg-mc-card`、`text-mc-text`、`rounded-mc` 等）。

## API 统一规范

所有 API 路由必须：
- 统一响应格式 `{ success: boolean, data?: T, error?: string }`
- 用 `NextResponse.json()`
- 错误时设置正确的状态码（400/404/409/500）
- 数据库操作通过 `@/lib/db.ts` 工具函数，不直接操作 sql.js

## ContextMenu 行为细节

- 同一时间只能打开一个 ContextMenu（点击其他 ⋮ 时关闭上一个）
- 点击菜单外部（页面空白处）关闭菜单
- 子菜单（收藏夹列表）的交互：
  - 点击某个收藏夹 → POST 添加到该收藏夹 → Toast "已添加到xxx" → 关闭菜单
  - 如果已收藏 → 显示颜色不同的"从xxx移除"选项
- 菜单动画：fade-in 或 scale 动画，duration-200

## 约束条件

- 不修改 Step 1-5 已完成的核心文件（除非只改 ResourceCard 接入 ContextMenu）
- 不安装新依赖
- 收藏夹详情页（`/collections/[id]`）做完整的占位即可，不要提前实现 Step 7 的内容
- 所有 UI 用 `mc-*` 样式

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | 收藏夹列表页可用 | 访问 `/collections`，看到已创建的收藏夹列表 |
| 2 | 能创建收藏夹 | 填写名称+选版本→创建→列表中出现新收藏夹 |
| 3 | 能重命名收藏夹 | 点击重命名→输入新名称→确认→名称更新 |
| 4 | 能删除收藏夹 | 点击删除→确认→收藏夹从列表消失 |
| 5 | 资源卡片 ⋮ 菜单弹出 | 首页点 ⋮ → 弹出菜单 |
| 6 | 能添加到收藏夹 | ⋮ → 添加到收藏夹 → 选目标 → Toast "已添加" |
| 7 | 已收藏资源能识别 | 已收藏的卡片点 ⋮，看到"从xxx移除"而非"添加到收藏夹" |
| 8 | 能从收藏夹移除 | ⋮ → 移除 → Toast 提示 |
| 9 | 数据持久化 | 关闭重开，收藏夹和收藏内容仍存在 |
| 10 | `npm run build` 成功 | 无类型或编译错误 |

## 完成后

完成后告诉我：Step 6 已完成，可以进入 Step 7。并简要说明实际执行中做了哪些与计划不同的改动（如果有）。

---

> 历史步骤存档：`prompts/step-01.md` ~ `prompts/step-05.md`。复盘时直接查看对应文件。

---

## 实际执行记录

### 相比原计划

- **多做了**：
  - 新建 `ToastProvider`（React Context 封装 Toast），`layout.tsx` 用 `<ToastProvider>` 包裹全局
  - ContextMenu 实现全局单例关闭（`globalCloseCallback`）
  - ContextMenu 向上/向下弹出自适应（检测视口底部空间）
  - CollectionCard hover 显示重命名/删除按钮（`opacity-0 group-hover:opacity-100`）
  - 收藏夹列表页有重命名 Modal（`fixed inset-0 bg-black/50` 遮罩层）
  - 新建收藏夹时游戏版本从 `game-versions.ts` 动态获取
  - favorited API 返回格式改为 `{ [resourceId]: boolean }` + 无参时返回所有已收藏ID
- **少做了**：无
- **改动点**：
  - `layout.tsx` 新增 `<ToastProvider>` 包裹，整站可用 `useToast()` hook
  - `ResourceCard` 移除内联 ⋮ 按钮，改为嵌入 `<ContextMenu>` 组件
  - `ResourceCard` 新增 `favorited` / `onFavoritesChanged` props

### 实际新增文件

| 文件 | 说明 |
|------|------|
| `src/app/api/collections/route.ts` | GET 列表(按 updated_at DESC) + POST 创建(crypto.randomUUID) |
| `src/app/api/collections/[id]/route.ts` | PUT 重命名 + DELETE 删除(级联删 items) |
| `src/app/api/collections/[id]/items/route.ts` | POST 添加资源(409防重复)，更新收藏夹时间戳 |
| `src/app/api/collections/favorited/route.ts` | GET 按 source+resourceIds查/无参返全部 |
| `src/app/api/collections/remove-resource/route.ts` | POST 删除 collection_items |
| `src/components/common/ToastProvider.tsx` | React Context，success/error/info 三个方法 |
| `src/components/collection/CollectionCard.tsx` | 书签图标+名称+MC版本+日期+hover操作按钮 |
| `src/components/home/ContextMenu.tsx` | ⋮ 菜单，全局单例，上下自适应，收藏夹子菜单 |

### 实际修改文件

| 文件 | 改动 |
|------|------|
| `src/app/layout.tsx` | 包裹 `<ToastProvider>` |
| `src/app/collections/page.tsx` | 占位→完整 CRUD 页（新建表单+重命名modal+删除确认+游戏版本select） |
| `src/components/home/ResourceCard.tsx` | 接入 ContextMenu，新增 favorited/onFavoritesChanged props |

### 实际 UI 约定（新增）

- ToastProvider 用 Context 全局共享，任意组件用 `useToast()` 取 `{ success, error, info }`
- ContextMenu 用 `absolute bottom-3 right-3 z-10` 定位在卡片内
- 重命名 Modal 用 `fixed inset-0 bg-black/50` 遮罩
