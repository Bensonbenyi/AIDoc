'use client';

import { useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ChevronRight, Loader2, PanelLeftClose, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DocumentTreeNode as DocTreeNodeType } from '@/types/document';
import { useDocumentStore } from '@/stores/documentStore';
import { useAppStore } from '@/stores/appStore';

function DraggableTreeItem({ node, depth }: { node: DocTreeNodeType; depth: number }) {
  const router = useRouter();
  const activeDocId = useAppStore((s) => s.activeDocId);
  const setActiveDocId = useAppStore((s) => s.setActiveDocId);
  const toggleTreeNode = useDocumentStore((s) => s.toggleTreeNode);
  const addChildNode = useDocumentStore((s) => s.addChildNode);
  const isActive = node.id === activeDocId;
  const hasChildren = node.children.length > 0;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tree-${node.id}`,
    data: { type: 'file-to-editor', node },
  });

  const handleClick = () => {
    setActiveDocId(node.id);
    router.push(`/documents/${node.id}`, { scroll: false });
  };

  return (
    <div>
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
        <span className="text-sm truncate flex-1">{node.title}</span>
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
