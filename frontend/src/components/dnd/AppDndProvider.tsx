'use client';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useAppStore } from '@/stores/appStore';
import { useDocumentStore } from '@/stores/documentStore';
import { blockIcon, blockTitle } from '@/lib/block-utils';
import { DocumentBlock } from '@/types/block';
import { DocumentTreeNode } from '@/types/document';

function DragPreview({ data }: { data: Record<string, unknown> | undefined }) {
  if (!data) return null;

  if (data.type === 'file-to-editor') {
    const node = data.node as DocumentTreeNode;
    return (
      <div className="pointer-events-none flex max-w-[240px] items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm shadow-xl shadow-indigo-950/10">
        <span className="text-base">{node.icon}</span>
        <span className="truncate font-medium text-foreground/85">{node.title}</span>
      </div>
    );
  }

  if (data.type === 'block-reference') {
    const block = data.block as DocumentBlock;
    return (
      <div className="pointer-events-none flex max-w-[260px] items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-xl shadow-black/10">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
          {blockIcon(block.blockType)}
        </span>
        <span className="truncate text-foreground/85">{blockTitle(block)}</span>
      </div>
    );
  }

  return null;
}

export function AppDndProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [activeDragData, setActiveDragData] = useState<Record<string, unknown> | undefined>();
  const addPendingAttachment = useAIChatStore((s) => s.addPendingAttachment);
  const activeDocId = useAppStore((s) => s.activeDocId);
  const blocks = useDocumentStore((s) => s.blocks);
  const moveBlock = useDocumentStore((s) => s.moveBlock);
  const addDocLinkBlock = useDocumentStore((s) => s.addDocLinkBlock);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragData(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragData(undefined);
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Block dragged to AI chat as a citation/reference.
    if (activeData?.type === 'block-reference' && overData?.type === 'ai-chat') {
      const block = activeData.block as DocumentBlock;
      addPendingAttachment({
        id: `block-${block.id}`,
        kind: 'block',
        title: blockTitle(block),
        icon: blockIcon(block.blockType),
        preview: blockTitle(block),
        docId: block.documentId,
        blockId: block.id,
        blockType: block.blockType,
      });
      return;
    }

    if (activeData?.type === 'block-reference' && overData?.type === 'block-reference') {
      const oldIdx = blocks.findIndex((b) => b.id === active.id);
      const newIdx = blocks.findIndex((b) => b.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        moveBlock(active.id as string, newIdx);
      }
      return;
    }

    // Tree item dragged to the editor becomes an internal document link/subpage block.
    if (
      activeData?.type === 'file-to-editor' &&
      (overData?.type === 'editor-drop' || overData?.type === 'block-reference')
    ) {
      const node = activeData.node;
      const targetIndex = overData?.type === 'block-reference' ? blocks.findIndex((b) => b.id === over.id) : undefined;
      addDocLinkBlock(node, activeDocId, targetIndex);
      return;
    }

    // Tree item dragged to AI chat
    if (activeData?.type === 'file-to-editor' && overData?.type === 'ai-chat') {
      const node = activeData.node as DocumentTreeNode;
      addPendingAttachment({
        id: `doc-${node.id}`,
        kind: 'document',
        title: node.title,
        icon: node.icon,
        docId: node.id,
      });
      return;
    }
  };

  const handleDragCancel = () => {
    setActiveDragData(undefined);
  };

  return mounted ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={{ duration: 160, easing: 'ease-out' }}>
        <DragPreview data={activeDragData} />
      </DragOverlay>
    </DndContext>
  ) : null;
}
