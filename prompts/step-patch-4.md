# 修复 Prompt — Step 补丁-4：添加 Mod 兼容性检测

> 参考网页版：
> - `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\components\collection\CompatibilityCheck.tsx`
> - `D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\api\resolve-names\route.ts`

## 问题

桌面版数据层已有 `dependencies` / `incompatibilities` 字段但无 UI 消费。用户无法知道收藏夹中的 mod 是否有版本冲突、缺失前置依赖。

## 前置条件

补丁-3 必须先完成。

## 修改/新建文件

1. **新建** `src/components/collection/CompatibilityCheck.tsx`
2. `src/app/collections/[id]/page.tsx` — 集成检测面板

## 实现

### CompatibilityCheck.tsx

完整照搬网页版同名文件，仅替换色板：

| 网页版 | → | 桌面版 |
|--------|---|--------|
| `bg-[#252525]` | → | `bg-mc-card` |
| `border-gray-800` | → | `border-white/5` |
| `text-gray-500` | → | `text-mc-muted` |
| `bg-purple-600/20` | → | `bg-mc-green/20` |
| `text-purple-400` | → | `text-mc-green-light` |
| `rounded-lg` | → | `rounded-mc` |

检测项（逻辑不动）：
1. **版本匹配**：已选版本的 gameVersions 是否含 collection.gameVersion
2. **缺失依赖**：dependencies 中的 ID 不在收藏夹 → warning，通过 `/api/resolve-names` 拿名称
3. **冲突**：incompatibilities 中的 ID 在收藏夹 → error
4. **未选版本**：有兼容版本 → info 提示

结果排序：error → warning → info → success。颜色沿用网页版（red/yellow/green/blue）。

### 页面集成

`collections/[id]/page.tsx` 改为双栏布局（`lg:grid-cols-3`，左 2 右 1）：

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">{/* 原有列表 */}</div>
  <div>{collection?.gameVersion && <CompatibilityCheck ... />}</div>
</div>
```

构建 `versionMap` 和 `compatSelectedVersions` 传给组件。

## 验收

- 右侧出现兼容性面板
- 版本匹配/不匹配/缺失依赖/冲突 四种场景正确展示
- 全部通过显示绿色横幅
- `npm run build` 无错

---

## 实际执行记录

- 多做了：为 `/api/resolve-names` 新增 GET handler（桌面版原只有 POST，CompatibilityCheck 调 GET）
- 少做了：无
- 改动点：检测逻辑完全照搬网页版；布局使用 `lg:col-span-2 space-y-4` 包裹左侧栏而非原 `<>` fragment
- 实际新增文件：`src/components/collection/CompatibilityCheck.tsx`
