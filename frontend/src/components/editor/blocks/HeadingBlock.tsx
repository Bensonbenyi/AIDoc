'use client';

import { CSSProperties, useCallback, useLayoutEffect, useRef } from 'react';
import { DocumentBlock } from '@/types/block';
import { focusBaseTextLineAfterBlock, getEditorText } from '@/lib/editor-interactions';

interface Props {
  block: DocumentBlock;
  level: 1 | 2 | 3;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function HeadingBlock({ block, level, onUpdate }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';
  const sizeClasses = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-semibold',
    3: 'text-xl font-semibold',
  };
  const style: CSSProperties = {
    fontSize: typeof block.content.fontSize === 'number' ? `${block.content.fontSize}px` : undefined,
    fontWeight: typeof block.content.fontWeight === 'number' ? block.content.fontWeight : undefined,
    color: typeof block.content.color === 'string' ? block.content.color : undefined,
  };

  const commitText = useCallback(() => {
    const element = headingRef.current;
    if (!element) return;

    onUpdate({ ...block.content, text: getEditorText(element) });
  }, [block.content, onUpdate]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLHeadingElement>) => {
      if (event.key !== 'Enter') return;
      if (event.nativeEvent.isComposing) return;

      event.preventDefault();
      commitText();
      window.requestAnimationFrame(() => focusBaseTextLineAfterBlock(block.id));
    },
    [block.id, commitText]
  );

  useLayoutEffect(() => {
    const element = headingRef.current;
    const text = (block.content.text as string) || '';
    if (!element || document.activeElement === element || getEditorText(element) === text) return;

    element.textContent = text;
  }, [block.content.text]);

  return (
    <div className="relative pb-3">
      <Tag
        ref={headingRef}
        data-editor-focus-target="true"
        className={`${sizeClasses[level]} min-h-8 outline-none`}
        contentEditable
        suppressContentEditableWarning
        style={style}
        onKeyDown={handleKeyDown}
        onBlur={commitText}
      />
    </div>
  );
}
