# 修复 Prompt — Step 补丁-5：筛选无匹配时显示原因

> 参考网页版：`D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\collection\ItemRow.tsx` 第 46-55 行

## 问题

三级筛选后，某 mod 没有匹配版本时只显示空白下拉，用户不知道原因。

## 前置条件

补丁-3 必须先完成。

## 修改文件

仅 `src/components/collection/ItemRow.tsx`

## 实现

在版本过滤逻辑之后添加诊断代码（网页版第 46-55 行照搬）：

```ts
const noMatchReasons: string[] = [];
if (loaderFilter && allVersions.every(v => !v.loaders.includes(loaderFilter)))
  noMatchReasons.push(`加载器(${LOADER_BADGES[loaderFilter] || loaderFilter})`);
if (releaseTypeFilter && allVersions.every(v => v.releaseType !== releaseTypeFilter))
  noMatchReasons.push(`版本类型(${releaseTypeFilter})`);
if (gameVersionFilter && allVersions.every(v => !v.gameVersions.includes(gameVersionFilter)))
  noMatchReasons.push(`游戏版本(${gameVersionFilter})`);
```

当 `filteredVersions.length === 0 && allVersions.length > 0` 时，在版本 `<select>` 下方渲染：

```tsx
<p className="text-xs text-mc-muted mt-1">
  {noMatchReasons.length > 0
    ? `无匹配版本: 无${noMatchReasons.join('+')}的版本`
    : '筛选条件组合无匹配版本'}
</p>
```

示例输出：`无匹配版本: 无加载器(Fabric)+游戏版本(1.21)的版本`

## 验收

- 选 Forge → 纯 Fabric mod 下方显示"无加载器(Forge)的版本"
- 多筛选 → 显示联合原因
- 有匹配版本 → 不显示
- `npm run build` 无错

---

## 实际执行记录

- 多做了：无
- 少做了：无
- 改动点：此前补丁-3 已完成 `<>` fragment 和基础 no-match 消息，本次仅在其上方新增 noMatchReasons 数组并将消息改为 `noMatchReasons.length > 0 ? 原因拼接 : fallback`
- 实际新增文件：无
