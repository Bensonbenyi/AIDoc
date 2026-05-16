# 文档树操作功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为左侧文档树添加右键菜单，支持重命名和删除文档

**Architecture:** 使用 shadcn/ui ContextMenu 和 AlertDialog 组件，在 DocumentTree.tsx 中添加交互逻辑，documentStore 中新增 deleteDocument 方法

**Tech Stack:** React, Zustand, shadcn/ui, Next.js

---

## 文件变更总览

| 文件 | 操作 |
|------|------|
| `frontend/src/components/ui/context-menu.tsx` | 新增（shadcn 自动生成） |
| `frontend/src/components/ui/alert-dialog.tsx` | 新增（shadcn 自动生成） |
| `frontend/src/stores/documentStore.ts` | 修改 — 新增 `deleteDocument` 方法 |
| `frontend/src/components/sidebar/DocumentTree.tsx` | 修改 — 添加右键菜单、重命名、删除确认 |

---

### Task 1: 安装 shadcn/ui 组件

**Files:**
- Create: `frontend/src/components/ui/context-menu.tsx`
- Create: `frontend/src/components/ui/alert-dialog.tsx`

- [ ] **Step 1: 安装 context-menu 组件**

```bash
cd /Users/zhengbenyi/Downloads/AIDoc/frontend && npx shadcn@latest add context-menu -y
```

- [ ] **Step 2: 安装 alert-dialog 组件**

```bash
cd /Users/zhengbenyi/Downloads/AIDoc/frontend && npx shadcn@latest add alert-dialog -y
```

- [ ] **Step 3: 验证文件已生成**

```bash
ls -la /Users/zhengbenyi/Downloads/AIDoc/frontend/src/components/ui/context-menu.tsx /Users/zhengbenyi/Downloads/AIDoc/frontend/src/components/ui/alert-dialog.tsx
```

Expected: 两个文件都存在

---

### Task 2: documentStore 新增 deleteDocument 方法

**Files:**
- Modify: `frontend/src/stores/documentStore.ts`

- [ ] **Step 1: 在 interface DocumentState 中添加 deleteDocument 方法签名**

在 `saveDocument` 声明之前（第 47 行之前）添加：

```typescript
deleteDocument: (docId: string) => Promise<void>;
```

- [ ] **Step 2: 实现 deleteDocument 方法**

在 `saveDocument` 实现之前（第 495 行之前）添加：

```typescript
deleteDocument: async (docId: string) => {
  try {
    await documentsAPI.delete(docId);
    // 从本地树中移除节点
    const removeNodeFromTree = (nodes: DocumentTreeNode[]): DocumentTreeNode[] => {
      return nodes
        .filter((n) => n.id !== docId)
        .map((n) => ({
          ...n,
          children: removeNodeFromTree(n.children),
        }));
    };
    set((s) => ({
      tree: removeNodeFromTree(s.tree),
      // 如果删除的是当前激活文档，清除激活状态
      currentDocId: s.currentDocId === docId ? null : s.currentDocId,
      currentDocMeta: s.currentDocId === docId ? null : s.currentDocMeta,
      blocks: s.currentDocId === docId ? [] : s.blocks,
    }));
  } catch (error) {
    console.error('删除文档失败:', error);
    throw error;
  }
},
```

- [ ] **Step 3: 验证 TypeScript 编译通过**

```bash
cd /Users/zhengbenyi/Downloads/AIDoc/frontend && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: 无错误

---

### Task 3: DocumentTree 添加右键菜单和删除确认

**Files:**
- Modify: `frontend/src/components/sidebar/DocumentTree.tsx`

- [ ] **Step 1: 添加 import 语句**

将第 1-9 行替换为：

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ChevronRight, Loader2, PanelLeftClose, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DocumentTreeNode as DocTreeNodeType } from '@/types/document';
import { useDocumentStore } from '@/stores/documentStore';
import { useAppStore } from '@/stores/appStore';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

- [ ] **Step 2: 重写 DraggableTreeItem 组件**

将第 11-86 行替换为：

```typescript
function DraggableTreeItem({ node, depth }: { node: DocTreeNodeType; depth: number }) {
  const router = useRouter();
  const activeDocId = useAppStore((s) => s.activeDocId);
  const setActiveDocId = useAppStore((s) => s.setActiveDocId);
  const toggleTreeNode = useDocumentStore((s) => s.toggleTreeNode);
  const addChildNode = useDocumentStore((s) => s.addChildNode);
  const deleteDocument = useDocumentStore((s) => s.deleteDocument);
  const isActive = node.id === activeDocId;
  const hasChildren = node.children.length > 0;

  // 重命名状态
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 删除确认状态
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tree-${node.id}`,
    data: { type: 'file-to-editor', node },
  });

  const handleClick = () => {
    if (isEditing) return;
    setActiveDocId(node.id);
    router.push(`/documents/${node.id}`, { scroll: false });
  };

  const startRename = () => {
    setEditValue(node.title);
    setIsEditing(true);
    // 等待渲染完成后聚焦并全选
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const confirmRename = async () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.title) {
      try {
        const { documentsAPI } = await import('@/lib/api');
        await documentsAPI.update(node.id, { title: trimmed });
        // 重新加载树以获取最新状态
        const { loadTree } = useDocumentStore.getState();
        await loadTree();
      } catch (error) {
        console.error('重命名失败:', error);
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDocument(node.id);
      // 如果删除的是当前文档，跳转到首页
      if (activeDocId === node.id) {
        setActiveDocId(null);
        router.push('/');
      }
    } catch (error) {
      console.error('删除文档失败:', error);
    }
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            data-doc-id={node.id}
            className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer group transition-all select-none ${
              isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-muted/60 text-foreground/80'
            } ${isDragging ? 'opacity-50' : ''}`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={handleClick}
          >
            <button
              type="button"
              className={`w-4 h-4 flex items-center justify-center shrink-0 transition-transform ${
                hasChildren && node.isOpen ? 'rotate-90' : ''
              } ${!hasChildren ? 'invisible' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleTreeNode(node.id);
              }}
            >
              <ChevronRight className="w-3 h-3" />
            </button>
            <span className="text-sm shrink-0">{node.icon}</span>
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={confirmRename}
                onKeyDown={handleKeyDown}
                className="flex-1 text-sm bg-background border border-input rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-ring"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="text-sm truncate flex-1"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startRename();
                }}
              >
                {node.title}
              </span>
            )}
            <button
              type="button"
              className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-indigo-500 transition-all shrink-0"
              onClick={async (e) => {
                e.stopPropagation();
                const newDocId = await addChildNode(node.id);
                if (newDocId) {
                  setActiveDocId(newDocId);
                  router.push(`/documents/${newDocId}`, { scroll: false });
                }
              }}
              title="新建子文档"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={startRename}>重命名</ContextMenuItem>
          <ContextMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {hasChildren && (
        <div
          className={`overflow-hidden transition-all duration-200 ${
            node.isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {node.children.map((child) => (
            <DraggableTreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{node.title}」及其所有子文档
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 4: 验证 TypeScript 编译通过**

```bash
cd /Users/zhengbenyi/Downloads/AIDoc/frontend && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: 无错误

- [ ] **Step 5: 启动开发服务器验证功能**

```bash
cd /Users/zhengbenyi/Downloads/AIDoc/frontend && npm run dev
```

在浏览器中测试：
1. 右键点击文档节点 → 应显示菜单（重命名、删除）
2. 点击「重命名」→ 标题变为输入框
3. 双击标题 → 标题变为输入框
4. 输入新标题后按 Enter → 标题更新
5. 输入新标题后点击外部 → 标题更新
6. 按 Escape → 取消重命名
7. 点击「删除」→ 弹出确认对话框
8. 点击「取消」→ 不删除
9. 点击「删除」按钮 → 文档被删除

- [ ] **Step 6: Commit**

```bash
cd /Users/zhengbenyi/Downloads/AIDoc
git add frontend/src/components/ui/context-menu.tsx frontend/src/components/ui/alert-dialog.tsx frontend/src/stores/documentStore.ts frontend/src/components/sidebar/DocumentTree.tsx
git commit -m "feat: 添加文档树右键菜单，支持重命名和删除"
```
