import { create } from 'zustand';
import { AIChatAttachment, AIMessage, AIScope } from '@/types/ai';
import { MOCK_AI_RESPONSES } from '@/lib/mock-data';

interface AIChatState {
  messages: AIMessage[];
  pendingAttachments: AIChatAttachment[];
  scope: AIScope;
  isStreaming: boolean;

  addPendingAttachment: (attachment: AIChatAttachment) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
  sendMessage: (text: string, attachments?: AIChatAttachment[]) => void;
  setScope: (scope: AIScope) => void;
  clearMessages: () => void;
}

const INITIAL_MESSAGE: AIMessage = {
  id: 'init',
  role: 'ai',
  text: '你好！我是你的文档 AI 助手。我可以帮你理解和分析当前文档的内容。\n\n你可以问我关于文档的任何问题，或者让我帮你总结、解释文档中的内容。',
};

export const useAIChatStore = create<AIChatState>((set) => ({
  messages: [INITIAL_MESSAGE],
  pendingAttachments: [],
  scope: 'doc',
  isStreaming: false,

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

  sendMessage: (text: string, attachments = []) => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

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

    setTimeout(() => {
      const resp = MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)];
      const aiMsg: AIMessage = {
        id: 'ai-' + Date.now(),
        role: 'ai',
        text: resp.text,
        citations: resp.citations,
        retrieval: resp.retrieval,
      };

      set((s) => ({
        messages: s.messages.filter((m) => !m.isLoading).concat(aiMsg),
        isStreaming: false,
      }));
    }, 1500 + Math.random() * 1000);
  },

  setScope: (scope) => set({ scope }),

  clearMessages: () => set({ messages: [INITIAL_MESSAGE] }),
}));
