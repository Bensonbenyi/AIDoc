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

function DraggableTreeItem({ node, depth }: { node: DocTreeNodeType; depth: number }) {
  const router = useRouter();
  const activeDocId = useAppStore((s) => s.activeDocId);
  const setActiveDocId = useAppStore((s) => s.setActiveDocId);
  const toggleTreeNode = useDocumentStore((s) => s.toggleTreeNode);
  const addChildNode = useDocumentStore((s) => s.addChildNode);
  const deleteDocument = useDocumentStore((s) => s.deleteDocument);
  const renameDocument = useDocumentStore((s) => s.renameDocument);
  const isActive = node.id === activeDocId;
  const hasChildren = node.children.length > 0;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tree-${node.id}`,
    data: { type: 'file-to-editor', node },
  });

  const startRename = () => {
    setEditValue(node.title);
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const confirmRename = async () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.title) {
      try {
        await renameDocument(node.id, trimmed);
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
      if (activeDocId === node.id) {
        router.push('/');
      }
    } catch (error) {
      console.error('删除文档失败:', error);
    }
  };

  const handleClick = () => {
    if (isEditing) return;
    setActiveDocId(node.id);
    router.push(`/documents/${node.id}`, { scroll: false });
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          data-doc-id={node.id}
          className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer group transition-all select-none ${
            isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-muted/60 text-foreground/80'
          } ${isDragging ? 'opacity-50' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` } as React.CSSProperties}
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

export function DocumentTree() {
  const router = useRouter();
  const tree = useDocumentStore((s) => s.tree);
  const isTreeLoading = useDocumentStore((s) => s.isTreeLoading);
  const loadTree = useDocumentStore((s) => s.loadTree);
  const addNewRootDoc = useDocumentStore((s) => s.addNewRootDoc);
  const setActiveDocId = useAppStore((s) => s.setActiveDocId);
  const toggleLeftSidebar = useAppStore((s) => s.toggleLeftSidebar);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="text-xs text-muted-foreground font-medium">文档空间</div>
        <button
          type="button"
          onClick={toggleLeftSidebar}
          className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="收起文档空间"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {isTreeLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm">加载中...</span>
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm mb-2">暂无文档</p>
            <button
              type="button"
              onClick={async () => {
                const newDocId = await addNewRootDoc();
                if (newDocId) {
                  setActiveDocId(newDocId);
                  router.push(`/documents/${newDocId}`, { scroll: false });
                }
              }}
              className="text-sm text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              创建第一个文档
            </button>
          </div>
        ) : (
          tree.map((node) => (
            <DraggableTreeItem key={node.id} node={node} depth={0} />
          ))
        )}
      </div>
      <div className="p-3 border-t border-border">
        <button
          type="button"
          onClick={async () => {
            const newDocId = await addNewRootDoc();
            if (newDocId) {
              setActiveDocId(newDocId);
              router.push(`/documents/${newDocId}`, { scroll: false });
            }
          }}
          className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md text-sm text-muted-foreground hover:border-indigo-400 hover:text-indigo-500 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> 新建文档
        </button>
      </div>
    </div>
  );
}
