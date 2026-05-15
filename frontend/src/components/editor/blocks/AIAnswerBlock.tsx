'use client';

import { useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { DocumentBlock } from '@/types/block';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useAppStore } from '@/stores/appStore';
import { useDocumentStore } from '@/stores/documentStore';
import { Copy, Check, MessageSquare, FilePlus2, ChevronDown, ChevronUp } from 'lucide-react';

interface AICitationData {
  docId: string;
  blockId: string;
  path?: string;
  contentPreview?: string;
}

interface Props {
  block: DocumentBlock;
}

export function AIAnswerBlock({ block }: Props) {
  const text = (block.content.text as string) || '';
  const citations = (block.content.citations as AICitationData[]) || [];
  const [copied, setCopied] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  const addBlockFromSlash = useDocumentStore((s) => s.addBlockFromSlash);
  const blocks = useDocumentStore((s) => s.blocks);
  const setHighlightedBlockId = useAppStore((s) => s.setHighlightedBlockId);
  const setActiveDocId = useAppStore((s) => s.setActiveDocId);

  // 复制回答内容
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  // 插入为文本 block（在当前 AI 回答 block 之后插入）
  const handleInsert = useCallback(() => {
    if (!text.trim()) return;
    const idx = blocks.findIndex((b) => b.id === block.id);
    const targetIndex = idx >= 0 ? idx + 1 : blocks.length;
    addBlockFromSlash(block.documentId, 'text', { text }, targetIndex);
  }, [text, block.id, block.documentId, blocks, addBlockFromSlash]);

  // 继续提问：发送到 AI 侧边栏
  const handleContinue = useCallback(() => {
    const askAIWithQuestion = useAIChatStore.getState().askAIWithQuestion;
    const rightSidebarCollapsed = useAppStore.getState().rightSidebarCollapsed;
    const toggleRightSidebar = useAppStore.getState().toggleRightSidebar;

    askAIWithQuestion('请继续', {
      id: `block-${block.id}`,
      kind: 'block',
      title: 'AI 回答',
      icon: '✦',
      preview: text.slice(0, 200),
      docId: block.documentId,
      blockId: block.id,
      blockType: block.blockType,
    });

    if (rightSidebarCollapsed) toggleRightSidebar();
  }, [block.id, block.documentId, block.blockType, text]);

  // 引用跳转
  const handleCiteClick = useCallback(
    (docId: string, blockId: string) => {
      setActiveDocId(docId);
      setHighlightedBlockId(blockId);
      setTimeout(() => setHighlightedBlockId(null), 3000);
    },
    [setActiveDocId, setHighlightedBlockId]
  );

  if (!text) {
    return (
      <div className="rounded-lg border border-indigo-200/60 bg-indigo-50/40 p-3">
        <div className="flex items-center gap-1.5">
          <span className="text-indigo-500 text-sm">✦</span>
          <span className="text-xs font-medium text-indigo-600">AI 回答</span>
          <span className="text-xs text-muted-foreground">生成中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-200/60 bg-indigo-50/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-indigo-500 text-sm">✦</span>
          <span className="text-xs font-medium text-indigo-600">AI 回答</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-indigo-100 hover:text-foreground transition-colors"
            title="复制"
          >
            {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            {copied ? '已复制' : '复制'}
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-indigo-100 hover:text-foreground transition-colors"
            title="插入到文档"
          >
            <FilePlus2 className="h-3 w-3" />
            插入
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-indigo-100 hover:text-foreground transition-colors"
            title="继续提问"
          >
            <MessageSquare className="h-3 w-3" />
            继续
          </button>
        </div>
      </div>

      {/* Markdown 内容 */}
      <div className="px-3 pb-2 text-sm leading-relaxed text-foreground/85 prose prose-sm prose-indigo max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:text-indigo-600 prose-code:bg-indigo-100 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>

      {/* 引用来源 */}
      {citations.length > 0 && (
        <div className="border-t border-indigo-200/40">
          <button
            type="button"
            onClick={() => setShowCitations(!showCitations)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-indigo-100/50 transition-colors"
          >
            {showCitations ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            引用来源 ({citations.length})
          </button>
          {showCitations && (
            <div className="px-3 pb-2 space-y-1">
              {citations.map((cite, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleCiteClick(cite.docId, cite.blockId)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  <span className="text-muted-foreground shrink-0">[{i + 1}]</span>
                  <span className="truncate">{cite.path || cite.contentPreview || '文档内容'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
