import { create } from 'zustand';
import { AIChatAttachment, AIMessage, AIScope } from '@/types/ai';
import { aiAPI, AIChatResponse, AIReferenceData } from '@/lib/api';
import { useDocumentStore } from './documentStore';
import { DocumentBlock } from '@/types/block';

interface AIChatState {
  messages: AIMessage[];
  pendingAttachments: AIChatAttachment[];
  pendingQuestion: string | null;
  scope: AIScope;
  isStreaming: boolean;
  sessionId: string | null;

  addPendingAttachment: (attachment: AIChatAttachment) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
  askAIWithQuestion: (question: string, attachment: AIChatAttachment) => void;
  consumePendingQuestion: () => string | null;
  sendMessage: (text: string, attachments?: AIChatAttachment[], documentId?: string) => Promise<void>;
  setScope: (scope: AIScope) => void;
  clearMessages: () => void;
  loadHistory: (sessionId: string) => Promise<void>;
}

const INITIAL_MESSAGE: AIMessage = {
  id: 'init',
  role: 'ai',
  text: '你好！我是你的文档 AI 助手。我可以帮你理解和分析当前文档的内容。\n\n你可以问我关于文档的任何问题，或者让我帮你总结、解释文档中的内容。',
};

/** 将后端引用转换为前端 citation 格式 */
function mapReferences(refs: AIReferenceData[]): { docId: string; blockId: string; path: string }[] {
  return refs.map((ref) => ({
    docId: ref.docId,
    blockId: ref.blockId,
    path: ref.documentPath || ref.contentPreview?.slice(0, 50) || '文档内容',
  }));
}

/** 将 block 内容转为可读文本 */
function blockToText(block: DocumentBlock): string {
  const c = block.content;
  switch (block.blockType) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'text':
    case 'quote':
      return (c.text as string) || '';
    case 'bullet':
    case 'numbered':
      return (c.items as string[] || []).map((item) => `- ${item}`).join('\n');
    case 'todo':
      return (c.items as { text: string; done: boolean }[] || [])
        .map((item) => `${item.done ? '[x]' : '[ ]'} ${item.text}`)
        .join('\n');
    case 'table': {
      const headers = c.headers as string[] || [];
      const rows = c.rows as string[][] || [];
      const lines = [headers.join(' | ')];
      for (const row of rows) lines.push(row.join(' | '));
      return lines.join('\n');
    }
    case 'code':
      return (c.code as string) || '';
    case 'ai-answer':
      return (c.text as string) || '';
    default:
      return (c.text as string) || JSON.stringify(c);
  }
}

/** 从 attachments 中提取文本内容，拼成上下文前缀 */
function buildAttachmentContext(attachments: AIChatAttachment[]): string {
  const parts: string[] = [];
  for (const att of attachments) {
    if (att.kind === 'block' && att.blockId) {
      // 从本地 store 取 block 内容
      const blocks = useDocumentStore.getState().blocks;
      const block = blocks.find((b) => b.id === att.blockId);
      if (block) {
        const text = blockToText(block);
        if (text.trim()) parts.push(text);
      }
    }
    // document 类型：att.preview 已经包含标题，不额外处理
  }
  return parts.join('\n---\n');
}

export const useAIChatStore = create<AIChatState>((set, get) => ({
  messages: [INITIAL_MESSAGE],
  pendingAttachments: [],
  pendingQuestion: null,
  scope: 'doc',
  isStreaming: false,
  sessionId: null,

  addPendingAttachment: (attachment) => {
    set((s) => {
      if (s.pendingAttachments.some((item) => item.id === attachment.id)) {
        return s;
      }
      return { pendingAttachments: [...s.pendingAttachments, attachment] };
    });
  },

  removePendingAttachment: (id) => {
    set((s) => ({ pendingAttachments: s.pendingAttachments.filter((item) => item.id !== id) }));
  },

  clearPendingAttachments: () => set({ pendingAttachments: [] }),

  askAIWithQuestion: (question, attachment) => {
    set((s) => {
      const exists = s.pendingAttachments.some((item) => item.id === attachment.id);
      return {
        pendingAttachments: exists ? s.pendingAttachments : [...s.pendingAttachments, attachment],
        pendingQuestion: question,
      };
    });
  },

  consumePendingQuestion: () => {
    const { pendingQuestion } = get();
    if (pendingQuestion) {
      set({ pendingQuestion: null });
    }
    return pendingQuestion;
  },

  sendMessage: async (text: string, attachments = [], documentId?: string) => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    const { sessionId } = get();

    const userMsg: AIMessage = {
      id: 'u-' + Date.now(),
      role: 'user',
      text: trimmed,
      attachments,
    };

    const loadingMsg: AIMessage = {
      id: 'loading-' + Date.now(),
      role: 'ai',
      text: '',
      retrieval:
        attachments.length > 0
          ? `正在读取 ${attachments.length} 个拖入的上下文…`
          : '正在思考…',
      isLoading: true,
    };

    set((s) => ({
      messages: [...s.messages, userMsg, loadingMsg],
      pendingAttachments: [],
      isStreaming: true,
    }));

    try {
      // 从 attachments 提取文本内容，拼到消息前面
      const attachmentContext = buildAttachmentContext(attachments);
      const finalMessage = attachmentContext
        ? `以下是引用的内容：\n---\n${attachmentContext}\n---\n\n用户问题：${trimmed}`
        : trimmed;

      // 统一调用普通对话接口
      const result = await aiAPI.chat(sessionId, finalMessage);

      // 更新 sessionId
      if (result.sessionId) {
        set({ sessionId: result.sessionId });
      }

      const aiMsg: AIMessage = {
        id: 'ai-' + Date.now(),
        role: 'ai',
        text: result.answer,
        citations: result.references?.length > 0 ? mapReferences(result.references) : undefined,
      };

      set((s) => ({
        messages: s.messages.filter((m) => !m.isLoading).concat(aiMsg),
        isStreaming: false,
      }));
    } catch (error) {
      const errorMsg: AIMessage = {
        id: 'error-' + Date.now(),
        role: 'ai',
        text: `抱歉，发生了错误：${error instanceof Error ? error.message : '未知错误'}。请稍后重试。`,
      };

      set((s) => ({
        messages: s.messages.filter((m) => !m.isLoading).concat(errorMsg),
        isStreaming: false,
      }));
    }
  },

  setScope: (scope) => set({ scope }),

  clearMessages: () => set({ messages: [INITIAL_MESSAGE], sessionId: null }),

  loadHistory: async (sessionId: string) => {
    try {
      const messages = await aiAPI.getMessages(sessionId);
      const mappedMessages: AIMessage[] = messages.map((msg) => ({
        id: msg.id,
        role: msg.role === 'user' ? 'user' : 'ai',
        text: msg.content,
        citations: msg.references
          ? msg.references.map((ref: Record<string, unknown>) => ({
              docId: ref.doc_id as string || '',
              blockId: ref.block_id as string || '',
              path: ref.content_preview as string || '文档内容',
            }))
          : undefined,
      }));

      set({
        messages: [INITIAL_MESSAGE, ...mappedMessages],
        sessionId,
      });
    } catch (error) {
      console.error('加载对话历史失败:', error);
    }
  },
}));
