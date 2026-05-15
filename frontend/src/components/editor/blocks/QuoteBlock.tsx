'use client';

import { CSSProperties, useCallback, useLayoutEffect, useRef } from 'react';
import { DocumentBlock } from '@/types/block';
import { focusBaseTextLineAfterBlock, getEditorText } from '@/lib/editor-interactions';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function QuoteBlock({ block, onUpdate }: Props) {
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const style: CSSProperties = {
    fontSize: typeof block.content.fontSize === 'number' ? `${block.content.fontSize}px` : undefined,
    fontWeight: typeof block.content.fontWeight === 'number' ? block.content.fontWeight : undefined,
    color: typeof block.content.color === 'string' ? block.content.color : undefined,
  };

  const commitText = useCallback(() => {
    const element = quoteRef.current;
    if (!element) return;

    onUpdate({ ...block.content, text: getEditorText(element) });
  }, [block.content, onUpdate]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLQuoteElement>) => {
      if (event.key !== 'Enter') return;

      event.preventDefault();
      commitText();
      window.requestAnimationFrame(() => focusBaseTextLineAfterBlock(block.id));
    },
    [block.id, commitText]
  );

  useLayoutEffect(() => {
    const element = quoteRef.current;
    const text = (block.content.text as string) || '';
    if (!element || document.activeElement === element || getEditorText(element) === text) return;

    element.textContent = text;
  }, [block.content.text]);

  return (
    <blockquote
      ref={quoteRef}
      data-editor-focus-target="true"
      className="rounded-r-md border-l-4 border-indigo-400 bg-indigo-50/50 py-1 pl-4 text-[15px] italic text-foreground/80 outline-none"
      contentEditable
      suppressContentEditableWarning
      style={style}
      onKeyDown={handleKeyDown}
      onBlur={commitText}
    />
  );
}
