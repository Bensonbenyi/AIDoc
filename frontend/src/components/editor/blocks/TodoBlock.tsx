'use client';

import { DocumentBlock } from '@/types/block';
import { BlockActionMenu } from '@/components/editor/BlockActionMenu';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useAppStore } from '@/stores/appStore';
import { useDocumentStore } from '@/stores/documentStore';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function TodoBlock({ block, onUpdate }: Props) {
  const { rightSidebarCollapsed, toggleRightSidebar } = useAppStore();
  const addPendingAttachment = useAIChatStore((s) => s.addPendingAttachment);
  const removeBlock = useDocumentStore((s) => s.removeBlock);
  const toggleTodoItem = useDocumentStore((s) => s.toggleTodoItem);
  const items = (block.content.items as { text: string; done: boolean }[]) || [];

  const commitItems = (nextItems: { text: string; done: boolean }[]) => {
    if (nextItems.length === 0) {
      removeBlock(block.id);
      return;
    }
    onUpdate({ ...block.content, items: nextItems });
  };

  const updateItemText = (itemIndex: number, text: string) => {
    const nextItems = items.map((item, i) => (i === itemIndex ? { ...item, text } : item));
    commitItems(nextItems);
  };

  const deleteItem = (itemIndex: number) => {
    commitItems(items.filter((_, i) => i !== itemIndex));
  };

  const duplicateItem = (itemIndex: number) => {
    const nextItems = [...items];
    nextItems.splice(itemIndex + 1, 0, { ...items[itemIndex] });
    commitItems(nextItems);
  };

  const askAIAboutItem = (itemIndex: number) => {
    const item = items[itemIndex];
    addPendingAttachment({
      id: `todo-${block.id}-${itemIndex}`,
      kind: 'block',
      title: item.text || `待办事项 ${itemIndex + 1}`,
      icon: item.done ? '☑' : '☐',
      preview: item.text,
      docId: block.documentId,
      blockId: block.id,
      blockType: 'todo',
    });
    if (rightSidebarCollapsed) toggleRightSidebar();
  };

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div
          key={i}
          className="group flex items-center gap-1"
        >
          <BlockActionMenu
            label={`待办事项 ${i + 1} 操作`}
            onDelete={() => deleteItem(i)}
            onDuplicate={() => duplicateItem(i)}
            onAskAI={() => askAIAboutItem(i)}
            className="-ml-1"
          />
          <button
            type="button"
            onClick={() => toggleTodoItem(block.id, i)}
            onKeyDown={(e) => {
              if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                deleteItem(i);
              }
            }}
            className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center text-[11px] transition-all ${
              item.done
                ? 'bg-indigo-500 border-indigo-500 text-white'
                : 'border-gray-300 group-hover:border-indigo-400'
            }`}
            aria-label={item.done ? '标记为未完成' : '标记为已完成'}
            title="勾选 / Delete 删除该待办"
          >
            {item.done && '✓'}
          </button>
          <input
            data-editor-focus-target={i === 0 ? 'true' : undefined}
            value={item.text}
            onChange={(e) => updateItemText(i, e.target.value)}
            className={`min-w-0 flex-1 bg-transparent text-[15px] outline-none ${
              item.done ? 'text-muted-foreground line-through' : 'text-foreground/90'
            }`}
          />
        </div>
      ))}
    </div>
  );
}
