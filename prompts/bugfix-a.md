# 修复 Prompt — Bug A：ContextMenu 弹出层被卡片遮挡

> 具体产品需求请参考 `requirements.md`，详细技术方案请参考 `technical-design.md`，开发规则请参考 `AGENTS.md`。请严格按照这些文档执行，不要自由发挥。

---

## 问题

在首页或搜索结果中点击资源卡片的 ⋮ 按钮后，弹出的收藏夹选择菜单会被下方其他卡片遮挡一部分，导致无法正常选择收藏夹。

## 根因

ContextMenu 当前在卡片 DOM 内部渲染弹出层（`absolute` 定位，`z-20`）。每个卡片都是一个独立的层叠上下文，下方卡片在 DOM 中位置更靠后，会覆盖上方卡片的弹出菜单。

## 修复目标

让 ContextMenu 的弹出层不受卡片层叠上下文影响，始终显示在最上层。

## 修复方案

使用 React Portal（`createPortal`）将弹出层渲染到 `document.body`，脱离卡片的 DOM 树。

## 需要修改的文件

**仅一个文件**：`src/components/home/ContextMenu.tsx`

## 具体实现

### 1. 新增加载
```tsx
import { createPortal } from 'react-dom';
```

### 2. 新增 state：弹出层位置
```tsx
const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
```

在 `openMenu` 函数中，计算弹出层在视口内的绝对位置：

```tsx
const openMenu = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  if (globalCloseCallback && globalCloseCallback !== close) {
    globalCloseCallback();
  }

  if (buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setMenuAbove(spaceBelow < 280);

    // 计算弹出层在 body 中的绝对位置（用于 Portal）
    setMenuStyle({
      position: 'fixed',
      top: menuAbove ? rect.top - 8 : rect.bottom + 8,
      right: window.innerWidth - rect.right,
      zIndex: 9999,
    });
  }

  setOpen(true);
  globalCloseCallback = close;
}, [close]);
```

### 3. 弹出层改用 Portal 渲染

将当前的下拉菜单 JSX（从 `{/* 下拉菜单 */}` 开始的 `<div>` 块）包裹在 `createPortal` 中：

```tsx
{open && createPortal(
  <div
    style={menuStyle}
    className="w-48 bg-mc-card border border-white/10 rounded-lg py-1.5 shadow-xl
               transition-all duration-200"
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
  >
    {/* 保留原有菜单内容不变 */}
    {showCollectionPicker ? (
      // ... 收藏夹选择列表
    ) : (
      // ... 添加/移除按钮
    )}
  </div>,
  document.body
)}
```

**注意**：用 Portal 后不再需要 `absolute right-0 top-full` 等定位 class，位置完全由 `menuStyle` 的 `top/right` 控制。同时移除 `z-20`、`menuAbove ? 'bottom-full mb-2' : 'top-full mt-2'` 以及 `opacity/visible/scale` 的过渡 class。

### 4. 过渡动画

保留动画效果——在 menuStyle 基础上根据 `open` 状态调整 opacity/transform：

用 CSS 类或 style 动态控制。最简单的保持方式：在 style 中加 `opacity` 和 `transform` 过渡，用 condition 切换。

或者给弹出层加一个 wrapper：Portal 内用一个不依赖 absolute 定位的 div：

```tsx
<div className={`fixed transition-all duration-200 ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`} style={menuStyle}>
  {/* 菜单内容 */}
</div>
```

### 5. 保留内容不变

菜单内部逻辑（打开收藏夹列表、添加、移除）完全保留不改。

## 关键点

- 仅修改 `ContextMenu.tsx`，不改其他文件
- Portal target 是 `document.body`
- 弹出层位置用 `fixed + top/right` 计算，基于 `buttonRef.current.getBoundingClientRect()`
- 菜单内容逻辑（收藏夹列表、添加/移除）完全不动
- 点击外部关闭的 `handleClickOutside` 逻辑保留
- `globalCloseCallback` 全局单例逻辑保留
- 保留 `duration-200` 过渡动画

## 验收标准

| 编号 | 验收项 | 验证方法 |
|------|--------|----------|
| 1 | 顶部卡片 ⋮ 菜单不被遮挡 | 点击第一行卡片的 ⋮ → 弹出菜单完整可见 |
| 2 | 底部卡片 ⋮ 菜单完整可见 | 点击最后一行卡片的 ⋮ → 弹出菜单不被视口裁切 |
| 3 | 菜单功能正常 | 添加资源到收藏夹 → Toast 提示成功 |
| 4 | 点击外部关闭 | 弹出菜单后点击页面空白处 → 菜单关闭 |
| 5 | npm run build 成功 | 无类型或编译错误 |
