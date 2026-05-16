'use client';

import { useCallback, useRef, useEffect } from 'react';
import { DocumentBlock } from '@/types/block';
import { focusBaseTextLineAfterBlock, getEditorText, placeCaretAtEnd } from '@/lib/editor-interactions';
import { useDocumentStore } from '@/stores/documentStore';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function NumberedBlock({ block, onUpdate }: Props) {
  const items = (block.content.items as string[]) || [];
  const removeBlock = useDocumentStore((s) => s.removeBlock);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 确保至少有一个空项
  useEffect(() => {
    if (items.length === 0) {
      onUpdate({ items: [''] });
    }
  }, []);

  const commitItemText = useCallback(
    (index: number) => {
      const el = itemRefs.current[index];
      if (!el) return;
      const newItems = [...items];
      newItems[index] = getEditorText(el);
      onUpdate({ items: newItems });
    },
    [items, onUpdate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
      // Enter: 退出列表，创建新 block
      if (e.key === 'Enter' && !e.shiftKey) {
        if (e.nativeEvent.isComposing) return;
        e.preventDefault();
        commitItemText(index);
        window.requestAnimationFrame(() => focusBaseTextLineAfterBlock(block.id));
        return;
      }

      // Shift+Enter: 在列表内添加新项
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();

        // 从 DOM 读取所有项的最新内容
        const currentItems = itemRefs.current.map((el, i) => {
          if (i === index) {
            // 当前项从事件目标读取
            return getEditorText(e.currentTarget);
          }
          return el ? getEditorText(el) : (items[i] || '');
        });

        // 在当前项后插入空项
        const newItems = [...currentItems];
        newItems.splice(index + 1, 0, '');
        onUpdate({ items: newItems });

        // 聚焦到新项
        window.requestAnimationFrame(() => {
          const newRef = itemRefs.current[index + 1];
          if (newRef) {
            placeCaretAtEnd(newRef);
          }
        });
        return;
      }

      // Backspace 在空项上：删除该项
      if (e.key === 'Backspace') {
        const el = itemRefs.current[index];
        if (!el) return;
        const isEmpty = !getEditorText(el).trim();

        if (isEmpty) {
          e.preventDefault();

          // 如果只有一项，删除整个 block
          if (items.length <= 1) {
            removeBlock(block.id);
            return;
          }

          // 删除当前项
          const newItems = items.filter((_, i) => i !== index);
          onUpdate({ items: newItems });

          // 聚焦到前一项
          window.requestAnimationFrame(() => {
            const prevIndex = Math.max(0, index - 1);
            const prevRef = itemRefs.current[prevIndex];
            if (prevRef) {
              placeCaretAtEnd(prevRef);
            }
          });
          return;
        }
      }

      // ArrowUp: 聚焦到上一项
      if (e.key === 'ArrowUp') {
        if (index > 0) {
          e.preventDefault();
          const prevRef = itemRefs.current[index - 1];
          if (prevRef) {
            placeCaretAtEnd(prevRef);
          }
        }
        return;
      }

      // ArrowDown: 聚焦到下一项
      if (e.key === 'ArrowDown') {
        if (index < items.length - 1) {
          e.preventDefault();
          const nextRef = itemRefs.current[index + 1];
          if (nextRef) {
            placeCaretAtEnd(nextRef);
          }
        }
        return;
      }
    },
    [block.id, items, commitItemText, onUpdate, removeBlock]
  );

  return (
    <div className="space-y-1 text-[15px] text-foreground/90">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="shrink-0 w-6 text-right text-muted-foreground select-none mt-0.5">
            {i + 1}.
          </span>
          <div
            ref={(el) => { itemRefs.current[i] = el; }}
            data-editor-focus-target={i === 0 ? 'true' : undefined}
            className="flex-1 outline-none min-h-[1.5em]"
            contentEditable
            suppressContentEditableWarning
            onKeyDown={(e) => handleKeyDown(e, i)}
            onBlur={() => commitItemText(i)}
            dangerouslySetInnerHTML={{ __html: item }}
          />
        </div>
      ))}
    </div>
  );
}
