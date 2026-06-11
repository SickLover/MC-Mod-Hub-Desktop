# 开发执行 Prompt — MC Mod Hub 桌面版 Step 10

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 项目背景

MC Mod Hub 桌面版是一个 Windows 桌面软件。基于 Electron + Next.js 14。现在是最后一步——打包成 exe 安装包并发布到 GitHub。

## 当前状态

Step 1-9 全部完成。**所有功能已就绪**：搜索、热门、资源详情、单文件下载、收藏夹 CRUD、批量下载（zip+folder）、最近浏览、更新提醒、设置页（Electron IPC + localStorage 双模式）、Electron 窗口。

| 关键文件 | 状态 |
|------|------|
| `electron/main.js` | ✅ 窗口创建(1280x800) + IPC(3 handles) + settings 读写 |
| `electron/preload.js` | ✅ contextBridge 暴露 electronAPI |
| `package.json` | ✅ main/electron:dev/package 脚本，electron 28 + electron-builder 24 |
| `next.config.js` | ✅ output: 'standalone' |
| `src/app/settings/page.tsx` | ✅ 完整设置页（IPC + localStorage 回退） |
| `src/types/electron.d.ts` | ✅ 类型声明 |
| `public/` | ⚠️ **空目录**（无图标） |
| `electron-builder.yml` | ❌ **不存在** |
| `.github/workflows/release.yml` | ❌ **不存在** |
| `.gitignore` | ✅ 已有，可能需要更新 |

## 当前目标

**Step 10：打包 + GitHub 发布** — 生成 Windows .exe 安装包，推 tag 后 GitHub Actions 自动构建并发布 Release。

## 需要创建的文件

```
electron-builder.yml              — electron-builder 打包配置
.github/workflows/release.yml     — GitHub Actions 自动构建发布
public/icon.png                   — 应用图标（256x256）
```

## 需要修改的文件

```
package.json                      — 完善 scripts + build 配置
.gitignore                        — 添加 electron-builder 输出目录
```

## 开发步骤

### 1. 创建应用图标 — `public/icon.png`

创建一个 256x256 的 PNG 图标。

**要求**：
- 尺寸：256×256 像素
- 风格：Minecraft 风格，苦力怕绿色调
- 建议内容：⛏️ 镐子 + 绿色方块 / MC 风格字母 M / 草方块纹理
- 如果不会设计，创建一个带 "MC" 文字 + `#5a9e3a` 绿色背景 + `#1a1a1a` 深色边框的简约图标

**生成方案**（AI 可以执行）：
用 Node.js/Canvas 或纯 SVG 转换来生成。如果没有图形库，创建一个最小有效的 PNG（1x1 像素占位），然后提示用户替换。

或者：用 data URI 方式内嵌一个 SVG 然后提示用户用工具转换。最简单可行的方案是创建一个占位说明文件 `public/icon-readme.md`，让用户自行替换图标，同时生成一个临时占位图。

**本步先做占位**：创建 `public/icon.png` 作为占位（可用 Node.js buffer 写入一个最小 PNG），然后提示用户替换。重点是把打包流水线跑通。

### 2. 创建 electron-builder.yml

```yaml
appId: com.mcmodhub.app
productName: MC Mod Hub
directories:
  output: release
  buildResources: public
win:
  target:
    - target: nsis
      arch: [x64]
  icon: public/icon.png
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  installerIcon: public/icon.png
  uninstallerIcon: public/icon.png
files:
  - electron/**/*
  - .next/standalone/**/*
  - .next/static/**/*
  - public/**/*
  - package.json
extraMetadata:
  main: electron/main.js
```

**关键说明**：
- `files` 字段指定打包时包含哪些文件。需要包含 Next.js standalone 构建产物（`.next/standalone/` 和 `.next/static/`）
- `extraMetadata.main` 确保打包后的入口指向 electron/main.js
- `nsis.oneClick: false` 允许用户选择安装路径

### 3. 完善 package.json 脚本

当前 package.json 的 scripts：

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "electron:dev": "electron .",
  "package": "electron-builder"
}
```

需要增加打包前构建 Next.js 的步骤。改为：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "electron:dev": "electron .",
    "package": "npm run build && electron-builder --win",
    "package:dir": "npm run build && electron-builder --win --dir"
  }
}
```

- `package`：先 build Next.js → 再 electron-builder 打包成 exe
- `package:dir`：打包成解压目录（调试用，不生成安装包）

### 4. 创建 GitHub Actions — `.github/workflows/release.yml`

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js
        run: npm run build

      - name: Package Electron
        run: npx electron-builder --win
        env:
          ELECTRON_MIRROR: https://npmmirror.com/mirrors/electron/

      - name: Upload to Release
        uses: softprops/action-gh-release@v1
        with:
          files: release/*.exe
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**关键说明**：
- `ELECTRON_MIRROR` 使用淘宝镜像加速 Electron 二进制下载（国内网络环境）
- 触发条件：push tag `v*`（如 v1.0.0）或手动触发（workflow_dispatch）
- 用 `npm ci` 而非 `npm install`（CI 环境更快更稳）
- `softprops/action-gh-release` 自动创建 GitHub Release 并上传 exe

### 5. 更新 .gitignore

确保以下条目被忽略：

```
# Electron 打包输出
release/

# 系统文件
nul
```

`nul` 文件（已出现在项目根目录，应该忽略）。检查当前 `.gitignore` 是否包含这些条目，如缺少则追加。

### 6. 验证打包（本地测试）

```bash
# 1. 先构建 Next.js
npm run build

# 2. 打包成解压目录（更快，调试用）
npm run package:dir

# 3. 打包成安装包（完整流程）
npm run package
```

检查 `release/` 目录下是否生成了 `MC-Mod-Hub-Setup-0.1.0.exe`。

安装包双击测试：
- 能正常安装
- 安装后桌面有快捷方式（如果 `createDesktopShortcut: true`）
- 打开后 Next.js 能正常启动，功能完整

### 7. 常见打包问题及处理

| 问题 | 原因 | 解决 |
|------|------|------|
| `sql.js` 的 WASM 文件找不到 | standalone 模式路径问题 | 在 `next.config.js` 中已有 webpack externals 配置，应该已处理好 |
| `.next/standalone` 不存在 | `next build` 未使用 standalone 模式 | 确认 `next.config.js` 有 `output: 'standalone'` |
| 打包后白屏 | Next.js server 未正常启动 | 检查 main.js 加载 URL 是否为 `http://localhost:3000`（打包后需要改为启动 standalone server） |
| electron-builder 下载慢 | 网络问题 | 使用 `ELECTRON_MIRROR` 环境变量指向国内镜像 |

**特别提醒**：当前 `electron/main.js` 加载的是 `http://localhost:3000`（开发模式）。打包后需要启动 Next.js standalone server（用 `child_process.spawn` 或直接 `require` standalone server.js）。这个问题比较复杂，**本步先做基础打包配置，打包后的自启动问题可以作为 Step 10.5 单独处理**。

如果打包后需要用户手动 `npm start` + 再开 Electron，那安装包里的 `main.js` 需要改成自动启动 server。这是 pack 流水线中最棘手的部分，先记录问题不阻塞发布。

### 8. Git 操作与发布

```bash
# 提交所有改动
git add .
git commit -m "Step 10: 打包配置 + GitHub Actions"

# 打 tag
git tag v0.1.0

# 推送代码和 tag
git push origin main
git push origin v0.1.0
```

推送后访问 GitHub 仓库的 Actions 页面，确认 `Build and Release` workflow 成功运行。成功后访问 Releases 页面确认有安装包下载。

## 约束条件

- 不修改 Step 1-9 的核心业务代码
- `electron-builder.yml` 的 `files` 字段必须正确包含 Next.js standalone 构建产物
- GitHub Actions 使用 `windows-latest` runner
- 图标如无法生成高质量版本，先用占位并标注提示
- 打包流水线必须能在 GitHub Actions 上跑通（或至少本地能跑通）

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | `npm run build` 成功 | 终端运行，无错误，.next/standalone 目录存在 |
| 2 | `npm run package:dir` 成功 | 本地生成 `release/win-unpacked/` 目录，内有可运行的 exe |
| 3 | `electron-builder.yml` 配置正确 | 打包过程无配置错误 |
| 4 | `.github/workflows/release.yml` 存在 | workflow 文件语法正确 |
| 5 | `.gitignore` 包含 release/ 等输出目录 | `git status` 不显示 release/ 为新增 |
| 6 | icon.png 存在 | `public/icon.png` 存在且为 256x256 PNG |
| 7 | git tag 正常推送 | `git tag -l` 能看到版本号 |

## 完成后

完成后告诉我：**Step 10 已完成，10 步开发全部结束！** 🎉

并简要说明：
1. 本地打包是否成功（生成的 exe 文件名）
2. GitHub Actions 是否跑通
3. Release 页面 URL（如有）
4. 实际执行中做了哪些与计划不同的改动

---

> 历史步骤存档：`prompts/step-01.md` ~ `prompts/step-09.md`。复盘时直接查看对应文件。

---

## 实际执行记录

相比原计划：
- 多做了：
  - 创建了完整的 `.gitignore`（原计划仅追加 release/ 和 nul），涵盖了 node_modules、.next、data、.env、IDE/OS 文件等
  - 在 `electron-builder.yml` 中添加了 `signAndEditExecutable: false`（Windows 非管理员账户无法创建符号链接，导致 winCodeSign 7z 解压失败）
  - 设置了 `ELECTRON_BUILDER_CACHE` 到项目内 `.cache/` 目录（并加入 .gitignore）
  - 验证了 asar 包内容（确认 electron、.next/standalone、.next/static、public 均正确打包）
- 少做了：
  - 未执行 `npm run package`（完整 NSIS 安装包）—— winCodeSign 符号链接问题导致本地无法完成 NSIS 打包，但 `--dir` 模式验证通过；CI（windows-latest 管理员权限）预期可正常完成
  - 未创建/更新图标—— `public/icon.png` 已存在（Step 9 产出）
  - 未执行 git 操作——项目尚未初始化 git 仓库
- 改动点：
  - `electron-builder.yml`：新增 `signAndEditExecutable: false`（原因见上）
  - `.gitignore`：完整覆盖了 node_modules/、.next/、release/、.cache/、data/、.env*、nul、Thumbs.db、Desktop.ini、IDE/OS 文件、npm-debug.log*
  - `package.json`：新增 `dev:app` 脚本已存在（Step 9），`package` 改为 `npm run build && electron-builder --win`，新增 `package:dir`

实际新增文件：
- `electron-builder.yml`：electron-builder NSIS 打包配置（含 signAndEditExecutable: false 绕过本地 symlink 问题）
- `.github/workflows/release.yml`：GitHub Actions 自动构建发布（windows-latest + ELECTRON_MIRROR 国内镜像）
- `.gitignore`：全新创建（原项目无此文件）
- `.cache/`：electron-builder 缓存目录（已加入 .gitignore）

本地验证结果：
- `npm run build` ✅ — .next/standalone/ 生成成功
- `npm run package:dir` ✅ — release/win-unpacked/ 生成成功，asar 包内容验证通过
- `npm run package` ⚠️ — 本地因 winCodeSign symlink 问题跳过；CI 环境预期正常

已知问题（不阻塞 v0.1.0）：
- 打包后 Electron 加载 `http://localhost:3000`，需用户手动启动 Next.js server；自动启动逻辑留到 v0.2.0
- 本地执行 `npm run package` 需设置 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 环境变量（国内网络）
- winCodeSign 的 7z 解压在 Windows 非管理员账户下会因 macOS .dylib 符号链接失败——暂用 `signAndEditExecutable: false` 绕过
