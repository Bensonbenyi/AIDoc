'use client';

import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDocumentStore } from '@/stores/documentStore';
import { useAppStore } from '@/stores/appStore';
import { DOC_HEADER_META } from '@/lib/mock-data';
import { SortableBlock } from '@/components/dnd/SortableBlock';
import { SLASH_INSERTED_EVENT } from '@/lib/slash-command';
import {
  focusBaseTextLine,
  focusBlockEditorTarget,
  focusEditorTarget,
  getEditorText,
  isEditableSelectionAtStart,
  slashMenuPositionFromSelection,
} from '@/lib/editor-interactions';

interface BaseTextLineProps {
  insertIndex: number;
}

function BaseTextLine({ insertIndex }: BaseTextLineProps) {
  const activeDocId = useAppStore((s) => s.activeDocId);
  const slashMenuOpen = useAppStore((s) => s.slashMenuOpen);
  const slashMenuContext = useAppStore((s) => s.slashMenuContext);
  const openSlashMenu = useAppStore((s) => s.openSlashMenu);
  const updateSlashMenu = useAppStore((s) => s.updateSlashMenu);
  const closeSlashMenu = useAppStore((s) => s.closeSlashMenu);
  const addBlockFromSlash = useDocumentStore((s) => s.addBlockFromSlash);
  const blocks = useDocumentStore((s) => s.blocks);
  const lineRef = useRef<HTMLDivElement>(null);
  const pendingSlashRef = useRef(false);
  const [isActive, setIsActive] = useState(false);
  const [hasText, setHasText] = useState(false);
  const reactId = useId();
  const lineId = `base-line-${activeDocId}-${insertIndex}-${reactId}`;

  const openMenuForLine = useCallback(() => {
    const element = lineRef.current;
    if (!element) return;

    const text = getEditorText(element);
    if (!text.includes('/')) return;

    const position = slashMenuPositionFromSelection(element);
    pendingSlashRef.current = true;
    openSlashMenu(position.x, position.y, {
      docId: activeDocId,
      insertIndex,
      initialText: text,
      sourceLineId: lineId,
    });
  }, [activeDocId, insertIndex, lineId, openSlashMenu]);

  const commitText = useCallback(() => {
    const element = lineRef.current;
    const text = element ? getEditorText(element) : '';
    if (!element || !text.trim()) return;

    const nextBlockId = addBlockFromSlash(activeDocId, 'text', { text }, insertIndex);
    element.textContent = '';
    setHasText(false);
    return nextBlockId;
  }, [activeDocId, addBlockFromSlash, insertIndex]);

  const focusPreviousTarget = useCallback(() => {
    if (insertIndex > 0) {
      focusBlockEditorTarget(blocks[insertIndex - 1].id, 'end');
    }
  }, [blocks, insertIndex]);

  const focusNextTarget = useCallback(() => {
    if (insertIndex < blocks.length) {
      focusBlockEditorTarget(blocks[insertIndex].id, 'start');
    }
  }, [blocks, insertIndex]);

  useEffect(() => {
    if (!slashMenuOpen) pendingSlashRef.current = false;
  }, [slashMenuOpen]);

  useEffect(() => {
    const clearAfterInsert = (event: Event) => {
      const detail = (event as CustomEvent<{ sourceLineId?: string }>).detail;
      if (detail?.sourceLineId !== lineId || !lineRef.current) return;

      lineRef.current.textContent = '';
      pendingSlashRef.current = false;
      setHasText(false);
    };

    window.addEventListener(SLASH_INSERTED_EVENT, clearAfterInsert);
    return () => window.removeEventListener(SLASH_INSERTED_EVENT, clearAfterInsert);
  }, [lineId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (slashMenuOpen && slashMenuContext?.sourceLineId === lineId) return;

        const nextBlockId = commitText();
        if (nextBlockId) {
          window.requestAnimationFrame(() => focusBaseTextLine(insertIndex + 1));
        }
        return;
      }

      if (e.key === 'Backspace') {
        const element = lineRef.current;
        if (!element) return;

        const isEmpty = !getEditorText(element).trim();
        if (isEmpty || isEditableSelectionAtStart(element)) {
          e.preventDefault();
          focusPreviousTarget();
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusPreviousTarget();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusNextTarget();
        return;
      }

      if (e.key !== '/' || e.shiftKey) return;

      window.requestAnimationFrame(openMenuForLine);
    },
    [
      commitText,
      focusNextTarget,
      focusPreviousTarget,
      insertIndex,
      lineId,
      openMenuForLine,
      slashMenuContext?.sourceLineId,
      slashMenuOpen,
    ]
  );

  const handleInput = useCallback(() => {
    const element = lineRef.current;
    if (!element) return;

    const text = getEditorText(element);
    setHasText(text.length > 0);
    if (slashMenuContext?.sourceLineId !== lineId) {
      if (text.includes('/')) openMenuForLine();
      return;
    }

    if (!text.includes('/')) {
      closeSlashMenu();
      return;
    }

    const position = slashMenuPositionFromSelection(element);
    updateSlashMenu(position.x, position.y, { initialText: text });
  }, [closeSlashMenu, lineId, openMenuForLine, slashMenuContext?.sourceLineId, updateSlashMenu]);

  const expanded = isActive || hasText;

  return (
    <div
      ref={lineRef}
      data-base-line-index={insertIndex}
      data-editor-focus-target="true"
      contentEditable
      suppressContentEditableWarning
      className={`base-text-line rounded-md px-7 text-[15px] leading-relaxed outline-none whitespace-pre-wrap transition-[min-height,padding] ${
        expanded ? 'min-h-6 py-1' : 'min-h-[2px] py-0'
      }`}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      onFocus={() => setIsActive(true)}
      onBlur={() => {
        setIsActive(false);
        if (slashMenuOpen && slashMenuContext?.sourceLineId === lineId) closeSlashMenu();
        commitText();
      }}
    />
  );
}

export function DocumentEditor() {
  const activeDocId = useAppStore((s) => s.activeDocId);
  const { blocks, loadDocument, currentDocMeta } = useDocumentStore();
  const undoLastChange = useDocumentStore((s) => s.undoLastChange);
  const canUndo = useDocumentStore((s) => (s.historyByDocId[activeDocId]?.length || 0) > 0);

  useEffect(() => {
    loadDocument(activeDocId);
  }, [activeDocId, loadDocument]);

  useEffect(() => {
    const handleUndo = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.key.toLowerCase() !== 'z') return;
      if (!canUndo) return;

      event.preventDefault();
      event.stopPropagation();
      undoLastChange(activeDocId);
      window.requestAnimationFrame(() => focusEditorTarget());
    };

    window.addEventListener('keydown', handleUndo, { capture: true });
    return () => window.removeEventListener('keydown', handleUndo, { capture: true });
  }, [activeDocId, canUndo, undoLastChange]);

  const meta = currentDocMeta || DOC_HEADER_META['design'];

  return (
    <div className="max-w-[720px] mx-auto px-4 pt-8 pb-40">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <span className="text-4xl">{meta.icon}</span>
          <h1 className="text-3xl font-bold outline-none" contentEditable suppressContentEditableWarning>
            {meta.title}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{meta.desc}</p>
      </div>

      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div>
          <BaseTextLine insertIndex={0} />
          {blocks.map((block, index) => (
            <Fragment key={block.id}>
              <SortableBlock block={block} />
              <BaseTextLine insertIndex={index + 1} />
            </Fragment>
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
