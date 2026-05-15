import { create } from 'zustand';
import { AIChatAttachment, AIMessage, AIScope } from '@/types/ai';
import { aiAPI, AIChatResponse, AIReferenceData } from '@/lib/api';

interface AIChatState {
  messages: AIMessage[];
  pendingAttachments: AIChatAttachment[];
  scope: AIScope;
  isStreaming: boolean;
  sessionId: string | null;

  addPendingAttachment: (attachment: AIChatAttachment) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
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

export const useAIChatStore = create<AIChatState>((set, get) => ({
  messages: [INITIAL_MESSAGE],
  pendingAttachments: [],
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

  sendMessage: async (text: string, attachments = [], documentId?: string) => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    const { scope, sessionId } = get();

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
          : '正在检索相关内容…',
      isLoading: true,
    };

    set((s) => ({
      messages: [...s.messages, userMsg, loadingMsg],
      pendingAttachments: [],
      isStreaming: true,
    }));

    try {
      let result: AIChatResponse & { sessionId?: string };

      if (scope === 'doc' && documentId) {
        // 文档问答模式（复用已有会话以保留对话历史）
        result = await aiAPI.documentQA(documentId, trimmed, scope, sessionId);
      } else {
        // 普通对话模式
        result = await aiAPI.chat(sessionId, trimmed);
      }

      // 更新 sessionId
      if (result.sessionId) {
        set({ sessionId: result.sessionId });
      }

      const aiMsg: AIMessage = {
        id: 'ai-' + Date.now(),
        role: 'ai',
        text: result.answer,
        citations: result.references?.length > 0 ? mapReferences(result.references) : undefined,
        retrieval: result.confidence
          ? `置信度: ${result.confidence === 'high' ? '高' : result.confidence === 'medium' ? '中' : '低'}`
          : undefined,
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
