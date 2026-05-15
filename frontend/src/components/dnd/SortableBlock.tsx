'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { BlockType, DocumentBlock } from '@/types/block';
import { BlockRenderer } from '@/components/editor/BlockRenderer';
import { BlockActionMenu } from '@/components/editor/BlockActionMenu';
import { blockIcon, blockTitle } from '@/lib/block-utils';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useAppStore } from '@/stores/appStore';
import { useDocumentStore } from '@/stores/documentStore';
import {
  focusBaseTextLine,
  focusEditorTarget,
  focusedEditableElement,
  getEditorText,
  isBlockEmpty,
  isEditableSelectionAtEnd,
  isEditableSelectionAtStart,
} from '@/lib/editor-interactions';

interface Props {
  block: DocumentBlock;
}

export function SortableBlock({ block }: Props) {
  const { highlightedBlockId, rightSidebarCollapsed, toggleRightSidebar } = useAppStore();
  const removeBlock = useDocumentStore((s) => s.removeBlock);
  const blocks = useDocumentStore((s) => s.blocks);
  const duplicateBlock = useDocumentStore((s) => s.duplicateBlock);
  const replaceBlockFromSlash = useDocumentStore((s) => s.replaceBlockFromSlash);
  const updateBlock = useDocumentStore((s) => s.updateBlock);
  const addPendingAttachment = useAIChatStore((s) => s.addPendingAttachment);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: { type: 'block-reference', block },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isHighlighted = highlightedBlockId === block.id;

  const askAI = () => {
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
    if (rightSidebarCollapsed) toggleRightSidebar();
  };

  const currentText =
    typeof block.content.text === 'string'
      ? block.content.text
      : Array.isArray(block.content.items)
        ? block.content.items.join('\n')
        : '';

  const convertBlock = (nextType: BlockType) => {
    replaceBlockFromSlash(block.id, nextType, {
      ...block.content,
      text: currentText,
    });
  };

  const updateTextStyle = (style: Record<string, unknown>) => {
    updateBlock(block.id, { ...block.content, ...style });
  };

  const handleKeyboardNavigation = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      e.key !== 'Enter' &&
      e.key !== 'Backspace' &&
      e.key !== 'Delete' &&
      e.key !== 'ArrowUp' &&
      e.key !== 'ArrowDown'
    ) {
      return;
    }

    const container = e.currentTarget;
    const editable = focusedEditableElement(container);
    const index = blocks.findIndex((item) => item.id === block.id);
    const target = e.target;
    const isControlTarget = target instanceof HTMLElement && target.closest('button, [data-block-handle]');

    if (e.key === 'Enter') {
      if (e.shiftKey || editable instanceof HTMLTextAreaElement || isControlTarget) return;

      e.preventDefault();
      e.stopPropagation();
      focusBaseTextLine(index + 1, 'start');
      return;
    }

    if (e.key === 'ArrowUp') {
      if (!editable || isEditableSelectionAtStart(editable)) {
        e.preventDefault();
        e.stopPropagation();
        focusBaseTextLine(Math.max(index, 0));
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      if (!editable || isEditableSelectionAtEnd(editable)) {
        e.preventDefault();
        e.stopPropagation();
        focusBaseTextLine(index + 1, 'start');
      }
      return;
    }

    if (editable) {
      const selectedText = window.getSelection()?.toString();
      if (selectedText) return;

      const liveText =
        editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement
          ? editable.value
          : getEditorText(editable);
      const shouldDeleteBlock =
        !liveText.trim() ||
        (e.key === 'Backspace' && isEditableSelectionAtStart(editable)) ||
        (e.key === 'Delete' && isEditableSelectionAtEnd(editable));
      if (!shouldDeleteBlock) return;
    } else if (document.activeElement !== container && !isBlockEmpty(block, container)) {
      if (isControlTarget) return;
    }

    e.preventDefault();
    e.stopPropagation();
    const previousBlockId = index > 0 ? blocks[index - 1].id : undefined;
    removeBlock(block.id);
    window.requestAnimationFrame(() => focusEditorTarget(previousBlockId));
  };

  return (
    <div
      ref={setNodeRef}
      data-block-id={block.id}
      tabIndex={0}
      style={style}
      onKeyDownCapture={handleKeyboardNavigation}
      className={`group relative flex items-start gap-0 rounded-md outline-none transition-all focus-visible:bg-muted/30 ${
        isHighlighted ? 'bg-indigo-50 shadow-[inset_3px_0_0_#6366f1] animate-[blockflash_1.5s_ease-out]' : ''
      } ${isDragging ? 'z-50' : ''}`}
    >
      {/* Block actions and drag handle */}
      <div className="flex items-start gap-0.5 pt-1 pr-1">
        <BlockActionMenu
          label="内容块操作"
          onDelete={() => removeBlock(block.id)}
          onDuplicate={() => duplicateBlock(block.id)}
          onAskAI={askAI}
          blockType={block.blockType}
          onConvert={convertBlock}
          onStyleChange={updateTextStyle}
        />
        <div
          {...attributes}
          {...listeners}
          data-block-handle={block.id}
          className="flex h-6 w-4 items-center justify-center opacity-0 transition-opacity cursor-grab active:cursor-grabbing shrink-0 group-hover:opacity-100"
          title="拖拽移动 / 拖到AI聊天框作为引用"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/45 hover:text-muted-foreground transition-colors" />
        </div>
      </div>

      {/* Block content */}
      <div className="flex-1 min-w-0 py-1">
        <BlockRenderer block={block} />
      </div>
    </div>
  );
}
