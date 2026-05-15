'use client';

import { DocumentBlock } from '@/types/block';
import { useAppStore } from '@/stores/appStore';
import { useDocumentStore } from '@/stores/documentStore';
import { ChevronRight } from 'lucide-react';

interface Props {
  block: DocumentBlock;
}

export function DocLinkBlock({ block }: Props) {
  const setActiveDocId = useAppStore((s) => s.setActiveDocId);
  const removeBlock = useDocumentStore((s) => s.removeBlock);
  const targetId = block.content.targetDocId as string;
  const icon = block.content.icon as string;
  const title = block.content.title as string;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeBlock(block.id);
    }
  };

  return (
    <button
      type="button"
      data-editor-focus-target="true"
      onClick={() => setActiveDocId(targetId)}
      onKeyDown={handleKeyDown}
      className="inline-flex max-w-[280px] items-center gap-2 rounded-md border border-indigo-200/60 bg-indigo-50/60 px-2.5 py-1.5 text-left transition-all hover:bg-indigo-100/80 focus:outline-none focus:ring-2 focus:ring-indigo-300 group"
      title="按 Delete 删除这个文档引用"
    >
      <span className="shrink-0 text-base">{icon}</span>
      <span className="min-w-0 truncate text-sm font-medium text-indigo-700">{title}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-indigo-400 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
