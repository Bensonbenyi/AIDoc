'use client';

import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useAppStore } from '@/stores/appStore';
import { AIChatAttachment, AIMessage } from '@/types/ai';
import { PanelRightClose, Send, X } from 'lucide-react';

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: AIChatAttachment;
  onRemove?: (id: string) => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1 text-xs text-foreground/80 shadow-sm">
      <span className="shrink-0 text-sm">{attachment.icon || (attachment.kind === 'document' ? '📄' : '▦')}</span>
      <span className="truncate">{attachment.title}</span>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          className="ml-0.5 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="移除引用"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function AIMessageView({ msg }: { msg: AIMessage }) {
  const setHighlightedBlockId = useAppStore((s) => s.setHighlightedBlockId);
  const setActiveDocId = useAppStore((s) => s.setActiveDocId);

  const handleCiteClick = (docId: string, blockId: string) => {
    setActiveDocId(docId);
    setHighlightedBlockId(blockId);
    setTimeout(() => setHighlightedBlockId(null), 3000);
  };

  return (
    <div className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
          msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
        }`}
      >
        {msg.role === 'user' ? '👤' : '✦'}
      </div>
      <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'text-right' : ''}`}>
        <div className={`text-xs text-muted-foreground mb-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
          {msg.role === 'user' ? '你' : 'AI 助手'}
        </div>
        <div
          className={`text-sm leading-relaxed inline-block text-left ${
            msg.role === 'user'
              ? 'bg-indigo-500 text-white rounded-2xl rounded-tr-sm px-3.5 py-2'
              : 'text-foreground/90'
          }`}
        >
          {msg.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{msg.text || '已发送引用内容'}</div>
          )}
        </div>

        {msg.attachments && msg.attachments.length > 0 && (
          <div className={`mt-2 flex flex-wrap gap-1.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.attachments.map((attachment) => (
              <AttachmentChip key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Citations */}
        {msg.citations && msg.citations.length > 0 && (
          <div className="mt-2 p-2 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1.5">引用来源</div>
            {msg.citations.map((cite, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer py-0.5"
                onClick={() => handleCiteClick(cite.docId, cite.blockId)}
              >
                <span className="text-muted-foreground">[{i + 1}]</span>
                {cite.path}
              </div>
            ))}
          </div>
        )}

        {/* Retrieval info */}
        {msg.retrieval && !msg.isLoading && (
          <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
            🔍 {msg.retrieval}
          </div>
        )}
      </div>
    </div>
  );
}

export function AIAssistantPanel() {
  const {
    messages,
    pendingAttachments,
    removePendingAttachment,
    sendMessage,
    isStreaming,
    consumePendingQuestion,
  } = useAIChatStore();
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar);
  const activeDocId = useAppStore((s) => s.activeDocId);
  const [input, setInput] = useState('');
  const msgsRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Drop zone for block references
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: 'ai-chat-drop',
    data: { type: 'ai-chat' },
  });

  // 处理 pendingQuestion：当 block 级别 AI 按钮设置问题时自动发送
  useEffect(() => {
    const pending = consumePendingQuestion();
    if (pending && !isStreaming) {
      // 使用 setTimeout 确保 pendingAttachments 已更新
      setTimeout(() => {
        const attachments = useAIChatStore.getState().pendingAttachments;
        sendMessage(pending, attachments, activeDocId);
      }, 50);
    }
  }, [consumePendingQuestion, isStreaming, sendMessage, activeDocId]);

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if ((!text && pendingAttachments.length === 0) || isStreaming) return;
    sendMessage(text, pendingAttachments, activeDocId);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    }
  };

  return (
    <div
      ref={setDropRef}
      data-dropzone="ai-chat"
      className={`flex flex-col h-full transition-all ${
        isOver ? 'bg-indigo-50/50 ring-2 ring-indigo-300 ring-inset' : ''
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">AI Chat</span>
          <button
            type="button"
            onClick={toggleRightSidebar}
            className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="收起 AI 聊天"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={msgsRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.map((msg) => (
          <AIMessageView key={msg.id} msg={msg} />
        ))}
        {isOver && (
          <div className="text-center text-xs text-indigo-500 py-2 border-2 border-dashed border-indigo-300 rounded-lg">
            释放以添加块引用
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        {pendingAttachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {pendingAttachments.map((attachment) => (
              <AttachmentChip
                key={attachment.id}
                attachment={attachment}
                onRemove={removePendingAttachment}
              />
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 bg-muted/50 rounded-xl px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入问题，Enter 发送"
            rows={1}
            className="flex-1 bg-transparent text-sm outline-none resize-none min-h-[20px] max-h-[100px] placeholder:text-muted-foreground/60"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && pendingAttachments.length === 0) || isStreaming}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              (input.trim() || pendingAttachments.length > 0) && !isStreaming
                ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
