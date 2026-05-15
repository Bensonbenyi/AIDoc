'use client';

import { DocumentBlock } from '@/types/block';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function BulletBlock({ block, onUpdate }: Props) {
  const items = (block.content.items as string[]) || [];

  return (
    <ul className="list-disc list-inside space-y-1 text-[15px] text-foreground/90">
      {items.map((item, i) => (
        <li
          key={i}
          data-editor-focus-target={i === 0 ? 'true' : undefined}
          className="outline-none"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            const newItems = [...items];
            newItems[i] = e.currentTarget.textContent || '';
            onUpdate({ items: newItems });
          }}
          dangerouslySetInnerHTML={{ __html: item }}
        />
      ))}
    </ul>
  );
}
