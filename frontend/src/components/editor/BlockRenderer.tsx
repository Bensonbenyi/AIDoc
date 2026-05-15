'use client';

import { DocumentBlock } from '@/types/block';
import { useDocumentStore } from '@/stores/documentStore';
import {
  HeadingBlock,
  TextBlock,
  QuoteBlock,
  BulletBlock,
  TodoBlock,
  TableBlock,
  DividerBlock,
  CodeBlock,
  DocLinkBlock,
  WhiteboardBlock,
  Chart3DBlock,
  AIAnswerBlock,
} from './blocks';

interface Props {
  block: DocumentBlock;
}

export function BlockRenderer({ block }: Props) {
  const updateBlock = useDocumentStore((s) => s.updateBlock);

  const handleUpdate = (content: Record<string, unknown>) => {
    updateBlock(block.id, content);
  };

  switch (block.blockType) {
    case 'h1':
      return <HeadingBlock block={block} level={1} onUpdate={handleUpdate} />;
    case 'h2':
      return <HeadingBlock block={block} level={2} onUpdate={handleUpdate} />;
    case 'h3':
      return <HeadingBlock block={block} level={3} onUpdate={handleUpdate} />;
    case 'text':
      return <TextBlock block={block} onUpdate={handleUpdate} />;
    case 'quote':
      return <QuoteBlock block={block} onUpdate={handleUpdate} />;
    case 'bullet':
    case 'numbered':
      return <BulletBlock block={block} onUpdate={handleUpdate} />;
    case 'todo':
      return <TodoBlock block={block} onUpdate={handleUpdate} />;
    case 'table':
      return <TableBlock block={block} onUpdate={handleUpdate} />;
    case 'divider':
      return <DividerBlock />;
    case 'code':
      return <CodeBlock block={block} onUpdate={handleUpdate} />;
    case 'doclink':
      return <DocLinkBlock block={block} />;
    case 'whiteboard':
      return <WhiteboardBlock block={block} onUpdate={handleUpdate} />;
    case 'chart3d':
      return <Chart3DBlock block={block} />;
    case 'ai-answer':
      return <AIAnswerBlock block={block} />;
    default:
      return <TextBlock block={block} onUpdate={handleUpdate} />;
  }
}
