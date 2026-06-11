# 修复 Prompt — Bug B：热门板块缺少"查看全部"入口

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 问题

首页三个热门板块（热门 Mod、热门光影、热门材质包）只展示 10 张卡片，没有跳转到全量列表的入口。分类浏览页（`/category/[type]`）已存在且功能完整但无法从首页触达。

这是与网页版相比的功能阉割。

## 根因

`HotSection` 组件的标题行只包含图标 + 标题 + 资源数量，缺少链接跳转。

## 修复目标

每个热门板块标题行右侧增加"查看全部 →"链接，点击跳转到对应分类页。

## 需要修改的文件

**仅一个文件**：`src/components/home/HotSection.tsx`

## 具体实现

### 1. 新增加载
```tsx
import Link from 'next/link';
```

### 2. 标题行改为左右布局

当前标题行：
```tsx
<div className="flex items-center gap-2 mb-4">
  <span className="text-xl">{icon}</span>
  <h2 className="text-lg font-bold text-mc-text">{title}</h2>
  {resources.length > 0 && (
    <span className="text-xs text-mc-muted ml-2">{resources.length} 个资源</span>
  )}
</div>
```

改为：
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <span className="text-xl">{icon}</span>
    <h2 className="text-lg font-bold text-mc-text">{title}</h2>
    {resources.length > 0 && (
      <span className="text-xs text-mc-muted ml-2">{resources.length} 个资源</span>
    )}
  </div>
  {resources.length > 0 && (
    <Link
      href={`/category/${type}`}
      className="text-xs text-mc-muted hover:text-mc-green-light transition-colors duration-200 flex items-center gap-1 flex-shrink-0"
    >
      查看全部
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )}
</div>
```

### 3. 路由对应关系

HotSection 已有 `type` prop（`ResourceType`：`mod` | `shader` | `resourcepack`），Link 直接拼 `/category/${type}` 即可。

现有路由：
- `/category/mod` → 热门 Mod 全量列表
- `/category/shader` → 热门光影全量列表
- `/category/resourcepack` → 热门材质包全量列表

## 约束条件

- 仅修改 `src/components/home/HotSection.tsx`
- 不修改 HotSection 的 props 接口
- 链接样式保持与现有 UI 一致（`text-mc-muted hover:text-mc-green-light`）
- 有资源时才显示链接（空板块不显示"查看全部"）

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | "查看全部"链接可见 | 首页三个热门板块标题右侧都有"查看全部 →" |
| 2 | 点击跳转正常 | 点 Mod 板块的"查看全部"→ 跳转到 `/category/mod`，正常展示 |
| 3 | 分类页返回正常 | 从分类页点"← 返回首页"能回到首页 |
| 4 | 空板块不显示链接 | （当前不会出现，热门 API 始终有数据） |
| 5 | npm run build 成功 | 无类型或编译错误 |
