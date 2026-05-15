'use client';

import { CSSProperties, useCallback, useLayoutEffect, useRef } from 'react';
import { DocumentBlock } from '@/types/block';
import { focusBaseTextLineAfterBlock, getEditorText } from '@/lib/editor-interactions';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

function textStyle(content: Record<string, unknown>): CSSProperties {
  return {
    fontSize: typeof content.fontSize === 'number' ? `${content.fontSize}px` : undefined,
    fontWeight: typeof content.fontWeight === 'number' ? content.fontWeight : undefined,
    color: typeof content.color === 'string' ? content.color : undefined,
  };
}

export function TextBlock({ block, onUpdate }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  const commitText = useCallback(() => {
    const element = editorRef.current;
    if (!element) return;

    onUpdate({ ...block.content, text: getEditorText(element) });
  }, [block.content, onUpdate]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter') return;
      if (event.nativeEvent.isComposing) return;
      if (event.shiftKey) return;

      event.preventDefault();
      commitText();
      window.requestAnimationFrame(() => focusBaseTextLineAfterBlock(block.id));
    },
    [block.id, commitText]
  );

  useLayoutEffect(() => {
    const element = editorRef.current;
    const text = (block.content.text as string) || '';
    if (!element || document.activeElement === element || getEditorText(element) === text) return;

    element.textContent = text;
  }, [block.content.text]);

  return (
    <div
      ref={editorRef}
      data-editor-focus-target="true"
      className="min-h-6 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90 outline-none"
      contentEditable
      suppressContentEditableWarning
      style={textStyle(block.content)}
      onKeyDown={handleKeyDown}
      onBlur={commitText}
    />
  );
}
