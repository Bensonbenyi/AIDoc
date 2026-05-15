'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useDocumentStore } from '@/stores/documentStore';
import { SLASH_ITEMS } from '@/lib/mock-data';
import { BlockType } from '@/types/block';
import { SLASH_INSERTED_EVENT } from '@/lib/slash-command';
import { focusEditorTarget } from '@/lib/editor-interactions';

function parseSlashText(text?: string) {
  const value = text || '';
  const slashIndex = value.lastIndexOf('/');

  if (slashIndex === -1) {
    return { query: '' };
  }

  return {
    query: value.slice(slashIndex + 1).trim(),
  };
}

function emptyContentForType(type: BlockType): Record<string, unknown> | undefined {
  switch (type) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'text':
    case 'quote':
      return { text: '' };
    case 'bullet':
    case 'numbered':
      return { items: [''] };
    case 'todo':
      return { items: [{ text: '', done: false }] };
    case 'code':
      return { language: 'python', code: '', status: 'idle' };
    default:
      return undefined;
  }
}

export function SlashCommandMenu() {
  const { slashMenuOpen, slashMenuPosition, slashMenuContext, closeSlashMenu } = useAppStore();
  const addBlockFromSlash = useDocumentStore((s) => s.addBlockFromSlash);
  const activeDocId = useAppStore((s) => s.activeDocId);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const filter = parseSlashText(slashMenuContext?.initialText).query;

  const flatItems = useMemo(() => {
    const query = filter.toLowerCase();
    return SLASH_ITEMS.flatMap((s) =>
      s.items.filter((it) => it.name.toLowerCase().includes(query) || it.desc.toLowerCase().includes(query))
    );
  }, [filter]);
  const activeHighlightIdx = Math.max(0, Math.min(highlightIdx, flatItems.length - 1));

  const insertBlock = useCallback(
    async (type: BlockType) => {
      const content = emptyContentForType(type);
      const nextBlockId = await addBlockFromSlash(
        slashMenuContext?.docId || activeDocId,
        type,
        content,
        slashMenuContext?.insertIndex
      );
      if (slashMenuContext?.sourceLineId) {
        window.dispatchEvent(
          new CustomEvent(SLASH_INSERTED_EVENT, { detail: { sourceLineId: slashMenuContext.sourceLineId } })
        );
      }
      closeSlashMenu();
      window.requestAnimationFrame(() => focusEditorTarget(nextBlockId));
    },
    [activeDocId, addBlockFromSlash, closeSlashMenu, slashMenuContext]
  );

  const cancelSlashMenu = useCallback(() => {
    closeSlashMenu();
  }, [closeSlashMenu]);

  useEffect(() => {
    if (!slashMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelSlashMenu();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIdx((i) => Math.max(0, Math.min(i + 1, flatItems.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && flatItems[activeHighlightIdx] && !e.isComposing) {
        e.preventDefault();
        insertBlock(flatItems[activeHighlightIdx].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeHighlightIdx, cancelSlashMenu, flatItems, insertBlock, slashMenuOpen]);

  if (!slashMenuOpen || !slashMenuPosition) return null;

  let itemIdx = 0;

  return (
    <div
      className="fixed z-50 w-[280px] overflow-hidden rounded-lg border border-border bg-white shadow-lg"
      style={{ left: slashMenuPosition.x, top: slashMenuPosition.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="max-h-[360px] overflow-y-auto py-1">
        {SLASH_ITEMS.map((section) => {
          const filtered = section.items.filter(
            (it) =>
              it.name.toLowerCase().includes(filter.toLowerCase()) ||
              it.desc.toLowerCase().includes(filter.toLowerCase())
          );
          if (filtered.length === 0) return null;
          return (
            <div key={section.sec}>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{section.sec}</div>
              {filtered.map((item) => {
                const idx = itemIdx++;
                return (
                  <div
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${
                      idx === activeHighlightIdx ? 'bg-indigo-50' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => insertBlock(item.id)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                  >
                    <span className="w-6 text-center text-base">{item.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        {flatItems.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">没有找到匹配的内容块</div>
        )}
      </div>
    </div>
  );
}
