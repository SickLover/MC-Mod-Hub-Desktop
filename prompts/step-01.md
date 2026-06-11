# 开发执行 Prompt — MC Mod Hub 桌面版 Step 1

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 项目背景

MC Mod Hub 桌面版是一个 Windows 桌面软件，帮 Minecraft 玩家从 CurseForge 和 Modrinth 搜索模组/光影/材质包，管理收藏夹，批量下载。基于 Electron + Next.js 14。整个项目分为 **10 个独立步骤**开发，本文档是 **Step 1**。

## 当前目标

**Step 1：项目初始化** — 配好所有配置文件，`npm run dev` 能启动一个空的 Next.js 项目。

这是整个项目的起点，只做配置，不写任何业务代码。

## 要完成的内容

在 `D:\vibe coding\projects\MC-Mod-Hub` 创建以下文件：

### 1. package.json
- name: `mc-mod-hub`
- version: `1.0.0`
- private: true
- scripts: `dev` (next dev), `build` (next build), `start` (next start), `lint` (next lint)
- dependencies: `next` (^14.2.0), `react` (^18.3.0), `react-dom` (^18.3.0), `sql.js` (^1.11.0), `jszip` (^3.10.1)
- devDependencies: `typescript` (^5.5.0), `@types/node` (^20.14.0), `@types/react` (^18.3.0), `@types/react-dom` (^18.3.0), `tailwindcss` (^3.4.0), `postcss` (^8.4.0), `autoprefixer` (^10.4.0)

### 2. tsconfig.json
- strict 模式
- `@/*` 路径别名映射到 `./src/*`
- jsx: preserve
- module: esnext, moduleResolution: bundler
- include: next-env.d.ts, **/*.ts, **/*.tsx, .next/types/**/*.ts

### 3. next.config.js
- `output: 'standalone'`
- webpack externals 排除 `sql.js`（server 端）

### 4. tailwind.config.ts
- 自定义 Minecraft 暗色色板：
  - `creeper`: DEFAULT #5a9e3a, light #7ec850, dark #3d6e25
  - `surface`: DEFAULT #1f1f1f, alt #252525, deep #1a1a1a
  - `border`: DEFAULT #1f2937
- content 路径：./src/**/*.{js,ts,jsx,tsx,mdx}

### 5. postcss.config.js
- tailwindcss + autoprefixer 插件

### 6. .env.local
```env
CURSEFORGE_API_KEY=your_api_key_here
```

### 7. .gitignore
```
node_modules/
.next/
data/app.db
.env.local
.claude/
next-env.d.ts
tsconfig.tsbuildinfo
*.jar
```

### 8. 安装依赖
运行 `npm install`

## 约束条件

- 不创建任何 src/ 下的业务代码（那是 Step 2+ 的事）
- 不安装 electron（那是 Step 9 的事）
- 不创建任何组件或页面

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | npm run dev 无报错 | 终端运行，看到 Next.js 启动成功 |
| 2 | 浏览器访问 localhost:3000 | 看到 Next.js 默认欢迎页 |
| 3 | npm run build 成功 | 终端运行无错误 |
| 4 | @/ 路径别名生效 | 在 src 下任意文件 import 不报路径错误 |
| 5 | .gitignore 覆盖到位 | data/app.db、.env.local 不被 git 跟踪 |

## 完成后

完成后告诉我：Step 1 已完成，可以进入 Step 2。

---

## Step 2 执行修正记录

Step 1 实际执行时偏离了本文档，在 Step 2 进行了以下修正：

| 文件 | 问题 | 修正 |
|------|------|------|
| `package.json` | 安装了 `better-sqlite3` + `@types/better-sqlite3`（文档要求 `sql.js`） | 替换为 `sql.js` (^1.12.0)，移除 `better-sqlite3` 相关依赖；新增 `@types/sql.js` 作为 devDependency |
| `next.config.js` | 缺少 webpack externals 配置 | 补充 `sql.js` 的 externals 排除 |
| `src/types/css.d.ts` | 缺失（Step 1 未创建） | 新建，解决 CSS import 的 TypeScript 类型报错 |
| 多个页面/组件/API 路由 | 提前创建了 Step 3+ 的文件，使用了与网页版不一致的类型名（`Resource`/`mergeResources` 等） | 统一改为网页版的 `ResourceItem`/`mergeResults` 等 |
