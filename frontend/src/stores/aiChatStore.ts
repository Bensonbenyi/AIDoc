import { create } from 'zustand';
import { AIChatAttachment, AIMessage } from '@/types/ai';
import { aiAPI, documentsAPI, AIReferenceData, type BlockResponse } from '@/lib/api';
import { findDocPath, useDocumentStore } from './documentStore';
import { DocumentBlock } from '@/types/block';
import { DocumentTreeNode } from '@/types/document';

interface AIChatState {
  messages: AIMessage[];
  pendingAttachments: AIChatAttachment[];
  pendingQuestion: string | null;
  isStreaming: boolean;
  sessionId: string | null;

  addPendingAttachment: (attachment: AIChatAttachment) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
  askAIWithQuestion: (question: string, attachment: AIChatAttachment) => void;
  consumePendingQuestion: () => string | null;
  sendMessage: (text: string, attachments?: AIChatAttachment[], documentId?: string) => Promise<void>;
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
    case 'todo': {
      const items = c.items as { text?: string; done?: boolean }[] | undefined;
      if (Array.isArray(items)) {
        return items
          .map((item) => `${item.done ? '[x]' : '[ ]'} ${item.text || ''}`.trim())
          .filter(Boolean)
          .join('\n');
      }
      const text = (c.text as string) || '';
      return text ? `${c.checked ? '[x]' : '[ ]'} ${text}` : '';
    }
    case 'table': {
      const headers = c.headers as string[] || [];
      const rows = c.rows as string[][] || [];
      const lines = headers.length > 0 ? [headers.join(' | ')] : [];
      for (const row of rows) lines.push(row.join(' | '));
      return lines.join('\n');
    }
    case 'code':
      return [
        c.language ? `语言：${c.language}` : '',
        (c.code as string) || '',
        c.output ? `运行结果：${c.output}` : '',
        c.stderr ? `错误输出：${c.stderr}` : '',
      ].filter(Boolean).join('\n');
    case 'chart3d':
      return [
        `3D 图表：${(c.title as string) || '未命名图表'}`,
        c.chartType ? `类型：${c.chartType}` : '',
        Array.isArray(c.x) ? `X 轴：${c.x.slice(0, 20).join(', ')}` : '',
        Array.isArray(c.y) ? `Y 轴：${c.y.slice(0, 20).join(', ')}` : '',
        Array.isArray(c.z) ? `Z 值：${c.z.slice(0, 30).join(', ')}` : '',
      ].filter(Boolean).join('\n');
    case 'whiteboard':
      return (c.title as string) ? `白板：${c.title}` : '';
    case 'doclink':
      return `文档链接：${(c.title as string) || ''}`.trim();
    case 'image':
      return [
        `图片：${(c.fileName as string) || ''}`.trim(),
        c.alt ? `描述：${c.alt}` : '',
      ].filter(Boolean).join('\n');
    case 'file':
      return `文件：${(c.fileName as string) || ''}`.trim();
    case 'audio':
      return `音频：${(c.fileName as string) || ''}`.trim();
    case 'video':
      return `视频：${(c.fileName as string) || ''}`.trim();
    case 'ai-answer':
      return (c.text as string) || '';
    case 'divider':
      return '';
    default:
      return (c.text as string) || JSON.stringify(c);
  }
}

function toDocumentBlock(b: BlockResponse): DocumentBlock {
  return {
    id: b.id,
    documentId: b.documentId,
    parentBlockId: b.parentBlockId || undefined,
    blockType: b.blockType as DocumentBlock['blockType'],
    content: b.content,
    properties: b.properties || undefined,
    sortOrder: b.sortOrder,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

function findTreeNode(nodes: DocumentTreeNode[], docId: string): DocumentTreeNode | null {
  for (const node of nodes) {
    if (node.id === docId) return node;
    const found = findTreeNode(node.children, docId);
    if (found) return found;
  }
  return null;
}

async function getDocumentBlocks(docId: string): Promise<{
  title: string;
  path: string;
  blocks: DocumentBlock[];
}> {
  const state = useDocumentStore.getState();

  if (state.currentDocId === docId) {
    return {
      title: state.currentDocMeta?.title || findTreeNode(state.tree, docId)?.title || '未命名文档',
      path: state.currentDocMeta?.desc || findDocPath(state.tree, docId)?.join(' / ') || '',
      blocks: state.blocks,
    };
  }

  const cachedBlocks = state.documentsById[docId];
  if (cachedBlocks) {
    return {
      title: findTreeNode(state.tree, docId)?.title || '未命名文档',
      path: findDocPath(state.tree, docId)?.join(' / ') || '',
      blocks: cachedBlocks,
    };
  }

  const detail = await documentsAPI.getDetail(docId);
  return {
    title: detail.title,
    path: detail.path,
    blocks: detail.blocks.map(toDocumentBlock),
  };
}

async function documentAttachmentToContext(att: AIChatAttachment): Promise<string> {
  if (!att.docId) return '';

  const { title, path, blocks } = await getDocumentBlocks(att.docId);
  const parts = [`## 文档：${title || att.title}`];
  if (path) parts.push(`路径：${path}`);

  blocks
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((block, index) => {
      const text = blockToText(block).trim();
      if (text) {
        parts.push(`[来源 ${index + 1}] (${block.blockType})\n${text}`);
      }
    });

  return parts.join('\n\n');
}

/** 从 attachments 中提取文本内容，拼成上下文前缀 */
async function buildAttachmentContext(attachments: AIChatAttachment[]): Promise<string> {
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
    } else if (att.kind === 'document') {
      try {
        const text = await documentAttachmentToContext(att);
        if (text.trim()) parts.push(text);
      } catch (error) {
        console.error('读取拖入文档上下文失败:', error);
      }
    }
  }
  return parts.join('\n---\n');
}

export const useAIChatStore = create<AIChatState>((set, get) => ({
  messages: [INITIAL_MESSAGE],
  pendingAttachments: [],
  pendingQuestion: null,
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
      // 从 attachments 提取文本内容，作为后端 system prompt 上下文发送。
      const attachmentContext = await buildAttachmentContext(attachments);
      const currentDocumentContext =
        !attachmentContext && documentId
          ? await documentAttachmentToContext({
              id: `doc-${documentId}`,
              kind: 'document',
              title: '当前文档',
              docId: documentId,
            }).catch((error) => {
              console.error('读取当前文档上下文失败:', error);
              return '';
            })
          : '';
      const context = attachmentContext || currentDocumentContext;
      const finalMessage = trimmed || '请基于引用内容进行总结。';

      // 统一调用普通对话接口
      const result = await aiAPI.chat(sessionId, finalMessage, context || undefined);

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
