# 开发执行 Prompt — MC Mod Hub 桌面版 Step 10（最终步）

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 项目背景

MC Mod Hub 桌面版是一个 Windows 桌面软件，帮 Minecraft 玩家从 CurseForge 和 Modrinth 搜索模组/光影/材质包，管理收藏夹，批量下载。基于 Electron + Next.js 14。这是**最后一步**——打包成 exe 安装包并发布到 GitHub。

## 当前状态

Step 1-9 全部完成 + Bug A/B 修复 + 5 个补丁已应用。**所有功能已就绪**：

| 关键文件/功能 | 状态 |
|------|------|
| 首页 | ✅ 搜索(URL同步) + 热门板块(前6张缩略卡) + 最近浏览 + 更新提醒 |
| 首页布局 | ✅ 搜索栏 → 最近浏览 → 更新提醒 → 热门三板块 |
| 分类页 | ✅ 含分页(PAGE_SIZE=20,页数按钮+跳页输入) |
| 搜索 | ✅ CF+MR 合并搜索 + 搜索结果"返回首页"按钮 |
| 资源详情 | ✅ Header+VersionSelector(筛选chips)+DownloadButton+Toast+浏览记录 |
| 收藏夹 CRUD | ✅ 列表页(新建/重命名Modal/删除) + ContextMenu(Portal 到 body) |
| 收藏夹详情 | ✅ sticky header+筛选(加载器+类型双select+游戏版本select) + 勾选+全选+批量下载(zip+folder) + sticky 底部栏 |
| 兼容性检测 | ✅ CompatibilityCheck 双栏布局(左资源列表/右检测面板)，4 种检测项 |
| ItemRow | ✅ 三级筛选过滤版本 + noMatchReasons 诊断文字 |
| 设置页 | ✅ API Key(password)+下载目录+偏好设置，Electron IPC + localStorage 双模式 |
| Electron 窗口 | ✅ 1280x800 + autoHideMenuBar + contextIsolation |
| `public/icon.png` | ✅ 真实图标(50KB) |
| `start-dev.bat` / `start-dev.js` | ✅ 一键自启动(自动检测 Node.js+清理端口+启动 Next.js→Electron) |
| `dev:app` 脚本 | ✅ package.json 已配置 |
| `next.config.js` | ✅ standalone + sql.js/jszip externals |
| `src/components/collection/CompatibilityCheck.tsx` | ✅ 完整兼容性检测 |

**剩余待完成**（本步任务）：

| 文件/功能 | 状态 |
|------|------|
| `electron-builder.yml` | ❌ **不存在** |
| `.github/workflows/release.yml` | ❌ **不存在** |
| `public/icon.png` | ✅ 已有，但需确认 256x256 |
| package.json `package` 脚本 | ⚠️ 需改为 `npm run build && electron-builder --win` |

## 当前目标

**Step 10：打包 + GitHub 发布** — 生成 Windows .exe 安装包，推 tag 后 GitHub Actions 自动构建并发布 Release。

## 需要创建的文件

```
electron-builder.yml              — electron-builder 打包配置
.github/workflows/release.yml     — GitHub Actions 自动构建发布
```

## 需要修改的文件

```
package.json                      — 完善 package 脚本（npm run build → electron-builder）
.gitignore                        — 追加 release/ 和 nul
```

## 开发步骤

### 1. 创建 electron-builder.yml

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

关键点：
- `files` 指定打包时包含 Next.js standalone 产物（`.next/standalone/` + `.next/static/`）
- `extraMetadata.main` 确保打包后入口指向 `electron/main.js`
- `nsis.oneClick: false` 允许用户选安装路径
- `ELECTRON_MIRROR` 环境变量在 package.json 或 CI 中设为 `https://npmmirror.com/mirrors/electron/`

### 2. 完善 package.json 的 package 脚本

当前：
```json
"package": "electron-builder"
```

改为：
```json
"package": "npm run build && electron-builder --win",
"package:dir": "npm run build && electron-builder --win --dir"
```

- `package`：先 build Next.js → electron-builder 打包 exe
- `package:dir`：打包成解压目录（调试用）

### 3. 创建 GitHub Actions — `.github/workflows/release.yml`

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

### 4. 更新 .gitignore

检查当前 `.gitignore`，确保以下条目存在（追加缺失的）：

```
# Electron 打包输出
release/

# 系统文件
nul
```

### 5. 本地打包验证

```bash
# 完整打包（生成安装包）
npm run package

# 快速测试（生成解压目录，不生成安装包）
npm run package:dir
```

检查 `release/` 目录下是否生成了 `MC-Mod-Hub-Setup-0.1.0.exe`。

### 6. 已知问题（本步不阻塞）

**打包后需手动启动 Next.js server**：当前 `electron/main.js` 加载 `http://localhost:3000`，但安装包中不会有已启动的 server。用户需要手动运行一次 Next.js server 再打开 Electron 窗口。

`start-dev.js` 已实现了自动启动 Next.js → 等待 Ready → 启动 Electron 的逻辑。打包后可在 `main.js` 中复用类似逻辑（用 `child_process.spawn` 启动 standalone `server.js`）。但这个改动较复杂，**留到 v0.2.0 处理**，不阻塞 v0.1.0 发布。

### 7. Git 操作与发布

```bash
git add .
git commit -m "Step 10: 打包配置 + GitHub Actions"
git tag v0.1.0
git push origin main
git push origin v0.1.0
```

推送后访问 GitHub Actions 页面确认 workflow 成功运行。

## 约束条件

- 不修改 Step 1-9 和补丁-1~5 的核心业务代码
- `electron-builder.yml` 的 `files` 字段必须正确包含 `.next/standalone` 和 `.next/static`
- GitHub Actions 使用 `windows-latest` runner
- 本地先跑 `npm run package:dir` 验证打包流程再推 CI
- 如打包失败，优先检查 `files` 路径和 `.next/standalone` 是否存在

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | `npm run build` 成功 | 终端运行，.next/standalone 目录存在 |
| 2 | `npm run package:dir` 成功 | 本地生成 `release/win-unpacked/` 目录 |
| 3 | `npm run package` 生成 exe | `release/` 下有 `.exe` 安装包 |
| 4 | `electron-builder.yml` 配置正确 | 打包过程无配置错误 |
| 5 | `.github/workflows/release.yml` 存在 | workflow 文件语法正确 |
| 6 | `.gitignore` 包含 release/ 和 nul | `git status` 不显示这些为新文件 |
| 7 | git tag 正常推送 | `git tag -l` 能看到 v0.1.0 |
| 8 | GitHub Actions 跑通 | 推 tag 后 CI 绿色，Release 页有 exe |

## 完成后

完成后告诉我：**🎉 Step 10 已完成，10 步开发全部结束！**

并简要说明：
1. 本地打包是否成功（生成的 exe 文件名和大小）
2. GitHub Actions 是否跑通（Actions 页 URL）
3. Release 页面 URL
4. 实际执行中做了哪些与计划不同的改动

---

> 历史步骤存档：`prompts/step-01.md` ~ `prompts/step-09.md`，补丁：`prompts/step-patch-1.md` ~ `prompts/step-patch-5.md`，Bug修复：`prompts/bugfix-a.md`、`prompts/bugfix-b.md`。

---

## 实际执行记录

相比原计划：
- 多做了：
  - 创建完整 `.gitignore`（覆盖 node_modules、.next、release、.cache、data、.env、nul、IDE/OS 文件等），而非仅追加 release/ 和 nul
  - `electron-builder.yml` 中新增 `signAndEditExecutable: false`（Windows 非管理员 symlink 权限问题）
  - 验证 asar 包内容（确认 electron、.next/standalone、.next/static、public 均正确）
  - `.gitignore` 中新增 `.cache/` 条目
- 少做了：
  - 未执行 `npm run package`（NSIS 安装包）—— winCodeSign 7z 解压 symlink 问题；CI 环境（管理员权限）预期正常
  - 未初始化 git / 推送 tag（项目尚未 git init）
- 改动点：
  - `electron-builder.yml`：新增 `signAndEditExecutable: false`
  - `.gitignore`：全新创建（原项目无此文件）
  - `package.json`：`package` 改为 `npm run build && electron-builder --win`，新增 `package:dir`

实际新增文件：
- `electron-builder.yml`：打包配置（NSIS + signAndEditExecutable: false）
- `.github/workflows/release.yml`：CI 自动构建发布
- `.gitignore`：全新创建

已知问题（不阻塞 v0.1.0）：
- 打包后 Electron 加载 http://localhost:3000，须手动启动 Next.js server（v0.2.0 处理）
- 本地 `npm run package` 需设 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`
- winCodeSign symlink 问题：暂用 `signAndEditExecutable: false` 绕过
