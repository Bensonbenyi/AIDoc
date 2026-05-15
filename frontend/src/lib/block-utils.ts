import { DocumentBlock } from '@/types/block';

export function blockTitle(block: DocumentBlock): string {
  const content = block.content || {};
  const text =
    content.text ||
    content.title ||
    content.code ||
    (Array.isArray(content.items) ? content.items[0]?.text || content.items[0] : undefined);

  if (typeof text === 'string' && text.trim()) {
    return text.trim().slice(0, 40);
  }

  return `${block.blockType} 内容块`;
}

export function blockIcon(blockType: string): string {
  const icons: Record<string, string> = {
    h1: 'H1',
    h2: 'H2',
    h3: 'H3',
    text: '¶',
    bullet: '•',
    numbered: '1.',
    todo: '☐',
    table: '▦',
    quote: '❝',
    divider: '-',
    code: '⌘',
    whiteboard: '✎',
    chart3d: '▥',
    doclink: '↗',
    'ai-answer': '✦',
  };

  return icons[blockType] || '▦';
}
