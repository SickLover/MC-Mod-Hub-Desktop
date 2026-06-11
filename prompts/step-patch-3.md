# 修复 Prompt — Step 补丁-3：收藏夹添加游戏版本筛选

> 参考网页版：`D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\collections\[id]\page.tsx`

## 问题

收藏夹没有游戏版本筛选。选某版本后，mod 的版本下拉应该只显示兼容该游戏版本的版本，且切换游戏版本时清除已选版本。

## 修改文件

1. `src/app/collections/[id]/page.tsx` — 添加游戏版本下拉、传 filter 给 ItemRow
2. `src/components/collection/ItemRow.tsx` — 接收 filter props、过滤版本列表
3. `src/app/api/collections/[id]/route.ts` — PUT 支持 gameVersion 字段

## 实现

### API：`api/collections/[id]/route.ts`

PUT 新增 `gameVersion` 处理，更新 DB 同时清除所有 item 的 `selected_file_id`：

```ts
if (gameVersion !== undefined) {
  await execAndSave("UPDATE collections SET game_version = ? ...", [gameVersion, id]);
  await execAndSave("UPDATE collection_items SET selected_file_id = NULL, selected_file_name = NULL, selected_game_version = NULL WHERE collection_id = ?", [id]);
}
```

### 页面：`collections/[id]/page.tsx`

- 新增 `handleGameVersionChange` → 调 PUT API 后 `fetchCollection()`
- 在 filter bar（加载器/版本类型下拉旁）插入游戏版本 `<select>`，选项来自 `gameVersions` state（已存在）
- 传给 `<ItemRow>` 三个 filter props：`loaderFilter`、`releaseTypeFilter`、`gameVersionFilter`
- 移除 header 中静态的"游戏版本: xxx"文本行

### 组件：`ItemRow.tsx`

- Props 新增 `loaderFilter?`、`releaseTypeFilter?`、`gameVersionFilter?`（均为 `string | null`）
- 过滤逻辑：
  ```ts
  const filteredVersions = allVersions.filter(v => {
    if (loaderFilter && !v.loaders.includes(loaderFilter)) return false;
    if (releaseTypeFilter && v.releaseType !== releaseTypeFilter) return false;
    if (gameVersionFilter && !v.gameVersions.includes(gameVersionFilter)) return false;
    return true;
  });
  ```
- 版本 `<select>` 内容改用 `filteredVersions`

## 验收

- 游戏版本下拉可见、选版本后过滤生效
- 切换版本清除已选、三级筛选联合生效
- 刷新页面游戏版本保持
- `npm run build` 无错

---

## 实际执行记录

- 多做了：ItemRow select + no-match 消息用 `<>...</>` fragment 包裹（SWC 要求三元表达式 truthy 分支单根元素）
- 少做了：无
- 改动点：filteredVersions 首次用 `&&` 表达式后改回 if-block（对齐 prompt）；noMatchReasons 详细提示推迟到补丁-5
- 实际新增文件：无
