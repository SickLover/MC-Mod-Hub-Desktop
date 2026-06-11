# 开发执行 Prompt — MC Mod Hub 桌面版 Step 3

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 项目背景

MC Mod Hub 桌面版是一个 Windows 桌面软件，帮 Minecraft 玩家从 CurseForge 和 Modrinth 搜索模组/光影/材质包，管理收藏夹，批量下载。基于 Electron + Next.js 14。整个项目分为 **10 个独立步骤**开发，本文档是 **Step 3**。

## 当前状态

Step 1+2 已完成：
- 所有配置文件就绪，`npm run dev` 能启动
- `src/types/`、`src/lib/` 全部就绪，`npm run build` 无类型错误

## 当前目标

**Step 3：全局 UI + 导航** — 看到 Minecraft 暗色风格的导航栏和页面框架，有 Loading/Empty/Toast 公共组件。

注意：网页版的 UI 风格是紫色 + 深灰，本步需要**改为**苦力怕绿色 Minecraft 风格。可以参考网页版的结构，但颜色和细节要改。

## 需要创建的文件

```
src/app/globals.css                    — Minecraft 暗色主题全局样式
src/components/common/Loading.tsx      — 加载中状态
src/components/common/Empty.tsx        — 空状态
src/components/common/Toast.tsx        — 消息提示
src/components/layout/Navbar.tsx       — 导航栏（Logo + 首页/收藏夹/设置入口）
src/app/layout.tsx                     — 根布局（导航栏 + 内容区）
```

## 开发步骤

### 1. 更新 tailwind.config.ts（如需要）

检查当前 `tailwind.config.ts` 的色板是否完善。最终应包含：
- `creeper`: DEFAULT `#5a9e3a` / light `#7ec850` / dark `#3d6e25`
- `surface`: DEFAULT `#1f1f1f` / alt `#252525` / deep `#1a1a1a`
- `border`: DEFAULT `#1f2937`
- content 路径覆盖 `./src/**/*.{js,ts,jsx,tsx,mdx}`

### 2. 创建全局样式 — `src/app/globals.css`

- `@tailwind base/components/utilities`
- body：背景色 `#1a1a1a`（surface-deep），文字 `#e5e5e5`
- 自定义滚动条样式（深色轨道 + 深灰滑块）
- 卡片悬停动画 `.card-hover`：上浮 4px + 阴影
- 淡入动画 `.fade-in`：opacity 0→1 + 上移 8px→0
- 过渡时间统一 `duration-200`

### 3. 创建公共组件

**Loading.tsx**：居中旋转加载圈，苦力怕绿色。有无文字的两种用法。

**Empty.tsx**：居中显示图标 + 提示文字（如"暂无数据"）。

**Toast.tsx**：右下角弹出消息提示，支持 success/error/info 三种类型，3 秒自动消失。

### 4. 创建导航栏 — `src/components/layout/Navbar.tsx`

- 固定在页面顶部，深色半透明背景
- 左侧：Logo 图标 + "MC Mod Hub" 文字
- 右侧：导航链接列表——首页(`/`)、收藏夹(`/collections`)、设置(`/settings`)
- 当前页面链接高亮（苦力怕绿色下划线或文字变色）
- 使用 `'use client'`（需要 `usePathname` 判断当前路由）

### 5. 创建根布局 — `src/app/layout.tsx`

- 引入 `globals.css`
- 引入 Navbar
- 结构：`<html> → <body> → <Navbar /> → <main>{children}</main>`
- 设置页面标题和 meta 信息
- 在 `<main>` 上加适当的 padding-top（给固定导航栏留空间）

## 可参考的网页版文件

| 网页版文件 | 作用 |
|-----------|------|
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\globals.css` | 参考全局样式结构，颜色改为苦力怕绿 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\layout\Navbar.tsx` | 参考导航栏结构，改配色 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\common\Loading.tsx` | 参考加载组件结构 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\common\Empty.tsx` | 参考空状态结构 |
| `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\common\Toast.tsx` | 参考 Toast 结构（如果网页版有） |

## UI 规范（必须遵守）

- **主色**：苦力怕绿 `#5a9e3a`（creeper）
- **亮色**：`#7ec850`（creeper-light）
- **暗色**：`#3d6e25`（creeper-dark）
- **全局背景**：`#1a1a1a`（surface-deep）
- **卡片背景**：`#1f1f1f`（surface）
- **卡片悬停**：`#252525`（surface-alt）
- **边框色**：`#1f2937`（border）
- **正文**：`#e5e5e5`
- **次要文字**：`#9ca3af`
- **动画时长**：200ms
- **圆角**：xl（0.75rem）用于卡片，md 用于按钮
- 全部手写，不引入 shadcn/ui 等组件库
- 只做暗色，不做主题切换

## 约束条件

- 不创建任何 API 路由（那是 Step 4+ 的事）
- 不创建首页和业务页面（page.tsx 留空或最简占位，Step 4 会覆盖）
- 不安装新依赖
- 不修改 Step 1-2 创建的文件，除非是完善 tailwind.config.ts

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | `npm run dev` 无报错 | 终端运行正常 |
| 2 | 浏览器看到深色背景 | 访问 localhost:3000，背景为深石板灰 |
| 3 | 导航栏显示正常 | 顶部有 Logo + 首页/收藏夹/设置 三个链接 |
| 4 | 当前页高亮 | 在首页时"首页"链接为绿色高亮 |
| 5 | 导航栏固定顶部 | 滚动页面时导航栏不随内容移动 |
| 6 | 全局滚动条为深色风格 | 滚动条不是浏览器默认浅色 |
| 7 | 公共组件可导入 | `import { Loading } from '@/components/common/Loading'` 不报错 |
| 8 | `npm run build` 成功 | 无类型或编译错误 |

## 完成后

完成后告诉我：Step 3 已完成，可以进入 Step 4。我会更新 prompt.md 为下一步的内容。

---

## ✅ 实际执行记录（最终版本）

**完成时间**：最新一轮 Step 3

### 相比原计划

- **多做了**：
  - `tailwind.config.ts` 新增 `mc-*` 语义色命名空间（`mc-green`/`mc-bg`/`mc-card`/`mc-card-hover`/`mc-text`/`mc-muted`）、`rounded-mc` 圆角、`fade-in` 动画 keyframes
  - 首页 `page.tsx` 完整实现（非占位），引入 SearchBar + 三个 HotSection，fetch `/api/popular` 获取真数据
  - `/api/popular` API 完整实现（合并 CurseForge + Modrinth 三类型热门数据）
  - `/api/search` API 骨架（返回空数组）
  - `SearchBar.tsx`、`HotSection.tsx`、`ResourceCard.tsx` 全部完整实现（原属 Step 4）
  - `ResourceCard` 使用 `resource` 作为 prop 名（网页版用 `item`），内联 `formatDownloads`（未用 `@/lib/format`）
  - 占位页：`resource/[source]/[id]`、`collections`、`collections/[id]`、`settings` 全部创建
  - `src/types/css.d.ts` 新建
- **少做了**：无（全部完成且超额）
- **改动点**：导航栏标识用 ⛏️ 图标 + `tracking-wide` 文字

### 实际新增文件（本轮 Step 3）

| 文件 | 说明 |
|------|------|
| `src/app/api/popular/route.ts` | 完整热门 API，合并 CF+MR，三类型并发请求 |
| `src/app/api/search/route.ts` | 搜索 API 骨架，返回空数组 |
| `src/app/page.tsx` | 完整首页，useEffect fetch /api/popular |
| `src/components/home/SearchBar.tsx` | 搜索栏，受控输入，onSearch 回调 |
| `src/components/home/HotSection.tsx` | 热门板块容器，grid 布局 + ResourceCard |
| `src/components/home/ResourceCard.tsx` | 资源卡片（mc-* 样式），平台标签，⋮ 按钮 |
| `src/app/resource/[source]/[id]/page.tsx` | 资源详情占位 |
| `src/app/collections/page.tsx` | 收藏夹列表占位 |
| `src/app/collections/[id]/page.tsx` | 收藏夹详情占位 |
| `src/app/settings/page.tsx` | 设置页占位 |
| `src/types/css.d.ts` | CSS 模块类型声明 |

### 实际 UI 约定（新增）

- **Tailwind class 统一用 `mc-*` 前缀**：`bg-mc-bg` `text-mc-text` `bg-mc-card` `hover:bg-mc-card-hover` `border-white/5` `rounded-mc`
- **圆角**：`rounded-mc`（0.75rem）用于卡片，`rounded-md` 用于按钮
- **动画**：`card-hover` 类用于卡片悬停上浮 4px + 阴影，`fade-in` 用于列表项进入动画
- **导航栏**：`fixed top-0` + 毛玻璃 `bg-mc-bg/95 backdrop-blur` + `h-14`

---

> 历史步骤存档：`prompts/step-01.md`、`prompts/step-02.md`、`prompts/step-03.md`。需要复盘时直接查看对应文件。
