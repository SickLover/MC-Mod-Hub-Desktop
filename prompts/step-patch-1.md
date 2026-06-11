# 修复 Prompt — Step 补丁-1：分类页添加分页

> 参考网页版：`D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\category\[type]\page.tsx`

## 问题

分类页 `/category/[type]` 一次性加载 40 条就没了，无法翻页浏览剩余资源。

## 目标

添加分页：页码按钮 + 上一页/下一页 + 跳页输入框。让用户能浏览 API 合并池中全部 ~100 条资源。

## 修改文件

1. `src/app/category/[type]/page.tsx` — 主改
2. `src/app/api/list/route.ts` — 拉大 fetchSize 池子

## 实现

### API：`src/app/api/list/route.ts`

仅改一行，第 18 行 limit 封顶从 40 → 60、第 29 行 fetchSize 倍数从 3 → 5：

```
const limit = Math.min(60, ...);
const fetchSize = limit * 5;  // limit=12 时拉 60 条，limit=20 时拉 100 条
```

### 页面：`src/app/category/[type]/page.tsx`

照搬网页版结构：
- 新增 `useSearchParams`、`useRouter` 导入
- `PAGE_SIZE = 20`，从 URL 读 `?page=` 参数
- API 请求改为 `fetch(\`/api/list?type=${type}&page=${page}&limit=${PAGE_SIZE}\`)`
- 内联 `Pagination` 组件，样式全部用 mc-* 色板（不要紫色）
- `useEffect` 依赖加上 `page`
- 保留现有标题行和返回链接不变

网页版 Pagination 核心逻辑直接复制：
- `getPages()`：首页、末页、当前 ±1、省略号
- 跳页 `<input>`，回车跳转
- `router.push(\`/category/${type}?page=${p}\`)` 切换页码
- 色板映射：purple → mc-green、gray → mc-muted

## 验收

- 进入分类页 → 底部有分页组件
- 翻页/跳页正常、URL 同步 `?page=N`
- `npm run build` 无错

---

## 实际执行记录

- 多做了：CategoryPage 拆外层 Suspense 边界 + 内层 Content（Next.js 14 要求 useSearchParams 必须在 Suspense 内）
- 少做了：无
- 改动点：fetchSize 原为 `Math.min(limit*5, 200)` 后精简为 `limit*5`（对齐 prompt）
- 实际新增文件：无
