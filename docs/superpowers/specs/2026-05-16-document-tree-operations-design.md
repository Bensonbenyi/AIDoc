# 文档树操作功能设计

## 概述

为左侧文档树添加右键菜单，支持重命名和删除文档。

## 功能需求

### 1. 右键菜单

在文档树节点上右键弹出菜单，包含两个选项：

- **重命名** — 触发内联编辑
- **删除** — 弹出确认对话框

使用 shadcn/ui `ContextMenu` 组件实现。

### 2. 重命名

**触发方式**（两种，行为相同）：
1. 双击文档标题
2. 右键菜单选择「重命名」

**交互流程**：
1. 标题 `<span>` 变为 `<input>` 输入框
2. 输入框自动获得焦点，内容全选
3. 用户编辑标题
4. 确认方式：按 Enter 键 或 点击外部
5. 确认后调用 API 保存，输入框变回 `<span>`
6. 空标题恢复原标题

**API**：`PATCH /api/documents/{docId}` → `{ title: "新标题" }`

**状态**：组件内 `useState`（`isEditing`、`editValue`）

### 3. 删除

**交互流程**：
1. 右键菜单选择「删除」
2. 弹出 AlertDialog 确认对话框
   - 标题：「确定要删除吗？」
   - 描述：「将删除「文档标题」及其所有子文档」
   - 按钮：「取消」/「删除」（红色危险样式）
3. 确认后调用 API 删除
4. 从文档树移除节点
5. 若删除当前打开的文档，跳转首页

**API**：`DELETE /api/documents/{docId}`

**Store**：`documentStore` 新增 `deleteDocument(docId)` 方法

## 技术方案

### 新增依赖

```bash
npx shadcn@latest add context-menu
npx shadcn@latest add alert-dialog
```

### 文件变更

| 文件 | 变更内容 |
|------|----------|
| `frontend/src/components/ui/context-menu.tsx` | 新增（shadcn 自动生成） |
| `frontend/src/components/ui/alert-dialog.tsx` | 新增（shadcn 自动生成） |
| `frontend/src/components/sidebar/DocumentTree.tsx` | 添加右键菜单、重命名交互、删除确认 |
| `frontend/src/stores/documentStore.ts` | 新增 `deleteDocument` 方法 |

### 实现细节

#### DocumentTree.tsx

`DraggableTreeItem` 组件增加：
- `ContextMenu` 包裹节点，菜单项：重命名、删除
- `AlertDialog` 用于删除确认
- 双击标题触发重命名
- 重命名时渲染 `<input>`，监听 Enter 和 blur 事件
- 删除后若为当前文档，`router.push('/')`

#### documentStore.ts

新增 `deleteDocument(docId: string)`：
- 调用 `documentsAPI.delete(docId)`
- 从 `documentTree` 中移除节点
- 若 `activeDocId === docId`，清除激活状态

## 不在范围内

- description（描述）字段 — 后续单独实现
- 图标修改 — 后续实现
- 批量删除 — 后续实现
