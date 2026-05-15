'use client';

import { DocumentBlock } from '@/types/block';

interface Props {
  block: DocumentBlock;
}

export function AIAnswerBlock({ block }: Props) {
  const text = (block.content.text as string) || 'AI 生成的内容将在此显示。';

  return (
    <div className="rounded-lg border border-indigo-200/60 bg-indigo-50/40 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-indigo-500 text-sm">✦</span>
        <span className="text-xs font-medium text-indigo-600">AI 回答</span>
      </div>
      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{text}</p>
    </div>
  );
}
