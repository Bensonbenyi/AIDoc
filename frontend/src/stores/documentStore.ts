import { create } from 'zustand';
import { DocumentTreeNode } from '@/types/document';
import { DocumentBlock } from '@/types/block';
import {
  documentsAPI,
  blocksAPI,
  type BlockCreate,
  type DocumentDetail,
  type BlockResponse,
} from '@/lib/api';
import { toBackendBlockType } from '@/lib/blockTypeMapping';

interface DocumentState {
  tree: DocumentTreeNode[];
  documentsById: Record<string, DocumentBlock[]>;
  historyByDocId: Record<string, DocumentBlock[][]>;
  blocks: DocumentBlock[];
  currentDocId: string | null;
  currentDocMeta: { icon: string; title: string; desc: string } | null;

  // 保存状态
  isSaving: boolean;
  lastSavedAt: string | null;
  isLoading: boolean;
  isTreeLoading: boolean;

  loadDocument: (docId: string) => Promise<void>;
  loadTree: () => Promise<void>;
  toggleTreeNode: (nodeId: string) => void;
  addChildNode: (parentId: string) => Promise<string | null>;
  updateBlock: (blockId: string, content: Record<string, unknown>) => void;
  toggleTodoItem: (blockId: string, itemIndex: number) => void;
  insertBlock: (afterBlockId: string, blockType: string) => Promise<void>;
  removeBlock: (blockId: string) => Promise<void>;
  undoLastChange: (docId?: string | null) => void;
  duplicateBlock: (blockId: string) => Promise<void>;
  moveBlock: (blockId: string, targetIndex: number) => void;
  addNewRootDoc: () => Promise<string | null>;
  addBlockFromSlash: (
    docId: string,
    blockType: string,
    content?: Record<string, unknown>,
    targetIndex?: number
  ) => Promise<string>;
  replaceBlockFromSlash: (blockId: string, blockType: string, content?: Record<string, unknown>) => Promise<string>;
  addDocLinkBlock: (targetNode: DocumentTreeNode, docId: string, targetIndex?: number) => Promise<void>;
  saveDocument: () => Promise<void>;
}

function now(): string {
  return new Date().toISOString();
}

function cloneBlocks(blocks: DocumentBlock[]) {
  return structuredClone(blocks) as DocumentBlock[];
}

function defaultBlockContent(blockType: string): Record<string, unknown> {
  switch (blockType) {
    case 'h1':
    case 'h2':
    case 'h3':
      return { text: '新标题' };
    case 'text':
      return { text: '' };
    case 'bullet':
    case 'numbered':
      return { items: ['新的列表项'] };
    case 'todo':
      return { items: [{ text: '新的待办事项', done: false }] };
    case 'table':
      return { headers: ['列 1', '列 2'], rows: [['', '']] };
    case 'quote':
      return { text: '新的引用' };
    case 'code':
      return { language: 'python', code: 'print("Hello AIDoc")', status: 'idle' };
    case 'whiteboard':
      return { paths: [] };
    case 'chart3d':
      return {
        title: '3D 数据图表',
        bars: [
          { label: 'A', height: 80 },
          { label: 'B', height: 130 },
          { label: 'C', height: 100 },
        ],
      };
    case 'ai-answer':
      return { text: 'AI 生成内容会显示在这里。' };
    case 'doclink':
      return { targetDocId: 'overview', icon: '📋', title: '项目总览' };
    case 'image':
      return { text: '图片占位块' };
    case 'file':
      return { text: '文件附件占位块' };
    default:
      return {};
  }
}

/** 将 API 返回的 BlockResponse 转为前端 DocumentBlock */
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

/** 将 API 文档树节点转为前端 DocumentTreeNode（添加 isOpen） */
function toTreeNodes(nodes: { id: string; icon: string; title: string; children: unknown[] }[]): DocumentTreeNode[] {
  return nodes.map((n) => ({
    id: String(n.id),
    icon: n.icon,
    title: n.title,
    children: toTreeNodes(n.children as { id: string; icon: string; title: string; children: unknown[] }[] || []),
    isOpen: false,
  }));
}

function toggleNodeInTree(nodes: DocumentTreeNode[], nodeId: string): DocumentTreeNode[] {
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, isOpen: !n.isOpen };
    if (n.children.length > 0) return { ...n, children: toggleNodeInTree(n.children, nodeId) };
    return n;
  });
}

export function findDocPath(nodes: DocumentTreeNode[], docId: string, path: string[] = []): string[] | null {
  for (const n of nodes) {
    const currentPath = [...path, n.title];
    if (n.id === docId) return currentPath;
    if (n.children.length > 0) {
      const found = findDocPath(n.children, docId, currentPath);
      if (found) return found;
    }
  }
  return null;
}

// 自动保存 debounce 定时器
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_SAVE_DELAY = 2000;

export const useDocumentStore = create<DocumentState>((set, get) => ({
  tree: [],
  documentsById: {},
  historyByDocId: {},
  blocks: [],
  currentDocId: null,
  currentDocMeta: null,
  isSaving: false,
  lastSavedAt: null,
  isLoading: false,
  isTreeLoading: false,

  loadTree: async () => {
    set({ isTreeLoading: true });
    try {
      const treeData = await documentsAPI.getTree();
      const tree = toTreeNodes(treeData);
      // 保留已展开状态
      const prevTree = get().tree;
      const preserveOpenState = (nodes: DocumentTreeNode[], prev: DocumentTreeNode[]): DocumentTreeNode[] => {
        return nodes.map((n) => {
          const prevNode = prev.find((p) => p.id === n.id);
          return {
            ...n,
            isOpen: prevNode?.isOpen ?? n.isOpen,
            children: preserveOpenState(n.children, prevNode?.children || []),
          };
        });
      };
      set({ tree: preserveOpenState(tree, prevTree), isTreeLoading: false });
    } catch (error) {
      console.error('加载文档树失败:', error);
      set({ isTreeLoading: false });
    }
  },

  loadDocument: async (docId: string) => {
    set({ isLoading: true });
    try {
      const detail: DocumentDetail = await documentsAPI.getDetail(docId);
      const blocks = detail.blocks.map(toDocumentBlock);
      set({
        blocks,
        currentDocId: docId,
        currentDocMeta: { icon: detail.icon, title: detail.title, desc: detail.path },
        documentsById: { ...get().documentsById, [docId]: blocks },
        isLoading: false,
      });
    } catch (error) {
      console.error('加载文档失败:', error);
      set({ isLoading: false });
    }
  },

  toggleTreeNode: (nodeId: string) => {
    set((s) => ({ tree: toggleNodeInTree(s.tree, nodeId) }));
  },

  addChildNode: async (parentId: string) => {
    try {
      const doc = await documentsAPI.create({ title: '新建文档', parentId });
      const newDocId = String(doc.id);
      await get().loadTree();
      // 展开父节点
      set((s) => ({ tree: toggleNodeInTree(s.tree, parentId) }));
      return newDocId;
    } catch (error) {
      console.error('创建子文档失败:', error);
      return null;
    }
  },

  updateBlock: (blockId, content) => {
    // 乐观更新本地状态
    set((s) => ({
      blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, content, updatedAt: now() } : b)),
      documentsById: s.currentDocId
        ? {
            ...s.documentsById,
            [s.currentDocId]: s.blocks.map((b) =>
              b.id === blockId ? { ...b, content, updatedAt: now() } : b
            ),
          }
        : s.documentsById,
    }));
    // 触发自动保存
    scheduleAutoSave(get);
  },

  toggleTodoItem: (blockId, itemIndex) => {
    set((s) => {
      const blocks = s.blocks.map((b) => {
        if (b.id !== blockId) return b;
        const items = [...(b.content.items as { text: string; done: boolean }[])];
        items[itemIndex] = { ...items[itemIndex], done: !items[itemIndex].done };
        return { ...b, content: { ...b.content, items }, updatedAt: now() };
      });
      return {
        blocks,
        documentsById: s.currentDocId ? { ...s.documentsById, [s.currentDocId]: blocks } : s.documentsById,
      };
    });
    scheduleAutoSave(get);
  },

  insertBlock: async (afterBlockId, blockType) => {
    const { blocks, currentDocId } = get();
    if (!currentDocId) return;
    const idx = blocks.findIndex((b) => b.id === afterBlockId);
    if (idx === -1) return;

    const sortOrder = idx + 1;
    try {
      const created = await documentsAPI.createBlock(currentDocId, {
        blockType: toBackendBlockType(blockType),
        content: defaultBlockContent(blockType),
        sortOrder,
      });
      const newBlock = toDocumentBlock(created);
      const newBlocks = [...blocks];
      newBlocks.splice(idx + 1, 0, newBlock);
      set((s) => ({
        blocks: newBlocks,
        documentsById: { ...s.documentsById, [currentDocId]: newBlocks },
        historyByDocId: {
          ...s.historyByDocId,
          [currentDocId]: [...(s.historyByDocId[currentDocId] || []), cloneBlocks(blocks)].slice(-50),
        },
      }));
    } catch (error) {
      console.error('创建 block 失败:', error);
    }
  },

  removeBlock: async (blockId) => {
    const { blocks, currentDocId } = get();
    // 乐观更新
    const newBlocks = blocks.filter((b) => b.id !== blockId);
    set((s) => ({
      blocks: newBlocks,
      documentsById: currentDocId ? { ...s.documentsById, [currentDocId]: newBlocks } : s.documentsById,
      historyByDocId: currentDocId
        ? {
            ...s.historyByDocId,
            [currentDocId]: [...(s.historyByDocId[currentDocId] || []), cloneBlocks(blocks)].slice(-50),
          }
        : s.historyByDocId,
    }));
    try {
      await blocksAPI.delete(blockId);
    } catch (error) {
      console.error('删除 block 失败:', error);
      // 回滚
      set((s) => ({
        blocks,
        documentsById: currentDocId ? { ...s.documentsById, [currentDocId]: blocks } : s.documentsById,
      }));
    }
  },

  undoLastChange: (docId) => {
    set((s) => {
      const targetDocId = docId || s.currentDocId;
      if (!targetDocId) return s;

      const history = s.historyByDocId[targetDocId] || [];
      const previousBlocks = history[history.length - 1];
      if (!previousBlocks) return s;

      const nextHistory = history.slice(0, -1);
      const restoredBlocks = cloneBlocks(previousBlocks);

      return {
        blocks: targetDocId === s.currentDocId ? restoredBlocks : s.blocks,
        documentsById: { ...s.documentsById, [targetDocId]: restoredBlocks },
        historyByDocId: { ...s.historyByDocId, [targetDocId]: nextHistory },
      };
    });
    // undo 后也需要保存到后端
    scheduleAutoSave(get);
  },

  duplicateBlock: async (blockId) => {
    const { blocks, currentDocId } = get();
    if (!currentDocId) return;
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;

    const source = blocks[idx];
    try {
      const created = await documentsAPI.createBlock(currentDocId, {
        blockType: toBackendBlockType(source.blockType),
        content: structuredClone(source.content),
        properties: source.properties,
        sortOrder: idx + 1,
      });
      const duplicated = toDocumentBlock(created);
      const newBlocks = [...blocks];
      newBlocks.splice(idx + 1, 0, duplicated);
      const orderedBlocks = newBlocks.map((b, i) => ({ ...b, sortOrder: i }));

      set((s) => ({
        blocks: orderedBlocks,
        documentsById: { ...s.documentsById, [currentDocId]: orderedBlocks },
        historyByDocId: {
          ...s.historyByDocId,
          [currentDocId]: [...(s.historyByDocId[currentDocId] || []), cloneBlocks(blocks)].slice(-50),
        },
      }));
      // 批量保存排序
      await get().saveDocument();
    } catch (error) {
      console.error('复制 block 失败:', error);
    }
  },

  moveBlock: (blockId, targetIndex) => {
    set((s) => {
      const idx = s.blocks.findIndex((b) => b.id === blockId);
      if (idx === -1 || idx === targetIndex) return s;
      const newBlocks = [...s.blocks];
      const [moved] = newBlocks.splice(idx, 1);
      newBlocks.splice(targetIndex, 0, moved);
      const orderedBlocks = newBlocks.map((b, i) => ({ ...b, sortOrder: i }));
      return {
        blocks: orderedBlocks,
        documentsById: s.currentDocId
          ? { ...s.documentsById, [s.currentDocId]: orderedBlocks }
          : s.documentsById,
        historyByDocId: s.currentDocId
          ? {
              ...s.historyByDocId,
              [s.currentDocId]: [...(s.historyByDocId[s.currentDocId] || []), cloneBlocks(s.blocks)].slice(-50),
            }
          : s.historyByDocId,
      };
    });
    scheduleAutoSave(get);
  },

  addNewRootDoc: async () => {
    try {
      const doc = await documentsAPI.create({ title: '新建文档' });
      const newDocId = String(doc.id);
      await get().loadTree();
      return newDocId;
    } catch (error) {
      console.error('创建文档失败:', error);
      return null;
    }
  },

  addBlockFromSlash: async (docId, blockType, content, targetIndex) => {
    const { blocks } = get();
    const insertAt =
      typeof targetIndex === 'number' && targetIndex >= 0 ? Math.min(targetIndex, blocks.length) : blocks.length;

    try {
      const created = await documentsAPI.createBlock(docId, {
        blockType: toBackendBlockType(blockType),
        content: content || defaultBlockContent(blockType),
        sortOrder: insertAt,
      });
      const newBlock = toDocumentBlock(created);
      const nextBlocks = [...blocks];
      nextBlocks.splice(insertAt, 0, newBlock);
      const orderedBlocks = nextBlocks.map((b, i) => ({ ...b, sortOrder: i }));

      set((s) => ({
        blocks: orderedBlocks,
        currentDocId: docId,
        documentsById: { ...s.documentsById, [docId]: orderedBlocks },
        historyByDocId: {
          ...s.historyByDocId,
          [docId]: [...(s.historyByDocId[docId] || []), cloneBlocks(blocks)].slice(-50),
        },
      }));
      return newBlock.id;
    } catch (error) {
      console.error('创建 block 失败:', error);
      return '';
    }
  },

  replaceBlockFromSlash: async (blockId, blockType, content) => {
    const { blocks, currentDocId } = get();
    const target = blocks.find((b) => b.id === blockId);
    if (!target || !currentDocId) return blockId;

    // 乐观更新
    const newContent = content || defaultBlockContent(blockType);
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === blockId
          ? { ...b, blockType: blockType as DocumentBlock['blockType'], content: newContent, updatedAt: now() }
          : b
      ),
    }));

    try {
      await blocksAPI.update(blockId, { content: newContent });
    } catch (error) {
      console.error('更新 block 失败:', error);
    }
    return blockId;
  },

  addDocLinkBlock: async (targetNode, docId, targetIndex) => {
    const { blocks } = get();
    const insertAt =
      typeof targetIndex === 'number' && targetIndex >= 0 ? Math.min(targetIndex, blocks.length) : blocks.length;

    try {
      const created = await documentsAPI.createBlock(docId, {
        blockType: toBackendBlockType('doclink'),
        content: {
          targetDocId: targetNode.id,
          icon: targetNode.icon,
          title: targetNode.title,
        },
        sortOrder: insertAt,
      });
      const newBlock = toDocumentBlock(created);
      const nextBlocks = [...blocks];
      nextBlocks.splice(insertAt, 0, newBlock);
      const orderedBlocks = nextBlocks.map((b, i) => ({ ...b, sortOrder: i }));

      set((s) => ({
        blocks: orderedBlocks,
        documentsById: { ...s.documentsById, [docId]: orderedBlocks },
        historyByDocId: {
          ...s.historyByDocId,
          [docId]: [...(s.historyByDocId[docId] || []), cloneBlocks(blocks)].slice(-50),
        },
      }));
    } catch (error) {
      console.error('创建文档链接 block 失败:', error);
    }
  },

  saveDocument: async () => {
    const { currentDocId, blocks } = get();
    if (!currentDocId) return;

    set({ isSaving: true });
    try {
      const blockCreates: BlockCreate[] = blocks.map((b, i) => ({
        id: b.id,
        blockType: toBackendBlockType(b.blockType),
        content: b.content,
        properties: b.properties,
        sortOrder: i,
      }));
      await documentsAPI.batchSaveBlocks(currentDocId, { blocks: blockCreates });
      set({ isSaving: false, lastSavedAt: now() });
    } catch (error) {
      console.error('保存文档失败:', error);
      set({ isSaving: false });
    }
  },
}));

/** 防抖自动保存 */
function scheduleAutoSave(get: () => DocumentState) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    get().saveDocument();
  }, AUTO_SAVE_DELAY);
}
