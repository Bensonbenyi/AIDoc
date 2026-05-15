'use client';

import { useDraggable } from '@dnd-kit/core';
import { ChevronRight, PanelLeftClose, Plus } from 'lucide-react';
import { DocumentTreeNode } from '@/types/document';
import { useDocumentStore } from '@/stores/documentStore';
import { useAppStore } from '@/stores/appStore';

function DraggableTreeItem({ node, depth }: { node: DocumentTreeNode; depth: number }) {
  const activeDocId = useAppStore((s) => s.activeDocId);
  const setActiveDocId = useAppStore((s) => s.setActiveDocId);
  const toggleTreeNode = useDocumentStore((s) => s.toggleTreeNode);
  const addChildNode = useDocumentStore((s) => s.addChildNode);
  const isActive = node.id === activeDocId;
  const hasChildren = node.children.length > 0;

  // Make tree items draggable to editor
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tree-${node.id}`,
    data: { type: 'file-to-editor', node },
  });

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
        onClick={() => setActiveDocId(node.id)}
      >
        <button
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
          className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-indigo-500 transition-all shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            addChildNode(node.id);
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
  const tree = useDocumentStore((s) => s.tree);
  const addNewRootDoc = useDocumentStore((s) => s.addNewRootDoc);
  const toggleLeftSidebar = useAppStore((s) => s.toggleLeftSidebar);

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
        {tree.map((node) => (
          <DraggableTreeItem key={node.id} node={node} depth={0} />
        ))}
      </div>
      <div className="p-3 border-t border-border">
        <button
          onClick={addNewRootDoc}
          className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md text-sm text-muted-foreground hover:border-indigo-400 hover:text-indigo-500 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> 新建文档
        </button>
      </div>
    </div>
  );
}
