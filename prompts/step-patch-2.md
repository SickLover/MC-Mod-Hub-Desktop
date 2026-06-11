# 修复 Prompt — Step 补丁-2：收藏夹筛选改为下拉菜单

> 参考网页版：`D:\VScode\VS Code Project\vibe-coding\my-project\personal-web\src\app\collections\[id]\page.tsx` 第 303-333 行

## 问题

收藏夹详情页的"加载器""全部类型"是按钮芯片样式，改为 `<select>` 下拉菜单（与网页版一致，更紧凑）。

## 修改文件

仅 `src/app/collections/[id]/page.tsx`

## 实现

1. 状态从 `''` 改为 `string | null`（null = 全部）
2. 选项标签改为网页版格式：`'加载器: 全部'`、`'版本类型: 全部'`
3. 替换按钮芯片 JSX（第 396-431 行）为两个 `<select>`：
   ```tsx
   <select value={selectedLoader || ''}
           onChange={(e) => setSelectedLoader(e.target.value || null)}
           className="bg-mc-card text-xs text-mc-text border border-white/10 rounded-md px-2.5 py-1.5 
                      focus:outline-none focus:border-mc-green">
     {LOADER_OPTIONS.map(opt => <option value={opt.value}>{opt.label}</option>)}
   </select>
   ```
4. 筛选逻辑不动（`!selectedLoader` 兼容 null）

## 验收

- 下拉正常展开、切换筛选项生效、组合筛选正常
- `npm run build` 无错

---

## 实际执行记录

- 多做了：无
- 少做了：无
- 改动点：select 加了 `appearance-none pr-7` 移除原生下拉箭头，option 加了 `className="bg-mc-card text-mc-text"` 保证暗色主题下可见
- 实际新增文件：无
