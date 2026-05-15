import { create } from 'zustand';
import { DocumentTreeNode } from '@/types/document';
import { DocumentBlock } from '@/types/block';
import { MOCK_TREE, createMockBlocks, MOCK_DOC_META } from '@/lib/mock-data';

interface DocumentState {
  tree: DocumentTreeNode[];
  documentsById: Record<string, DocumentBlock[]>;
  historyByDocId: Record<string, DocumentBlock[][]>;
  blocks: DocumentBlock[];
  currentDocId: string | null;
  currentDocMeta: { icon: string; title: string; desc: string } | null;

  loadDocument: (docId: string) => void;
  toggleTreeNode: (nodeId: string) => void;
  addChildNode: (parentId: string) => void;
  updateBlock: (blockId: string, content: Record<string, unknown>) => void;
  toggleTodoItem: (blockId: string, itemIndex: number) => void;
  insertBlock: (afterBlockId: string, blockType: string) => void;
  removeBlock: (blockId: string) => void;
  undoLastChange: (docId?: string | null) => void;
  duplicateBlock: (blockId: string) => void;
  moveBlock: (blockId: string, targetIndex: number) => void;
  addNewRootDoc: () => void;
  addBlockFromSlash: (
    docId: string,
    blockType: string,
    content?: Record<string, unknown>,
    targetIndex?: number
  ) => string;
  replaceBlockFromSlash: (blockId: string, blockType: string, content?: Record<string, unknown>) => string;
  addDocLinkBlock: (targetNode: DocumentTreeNode, docId: string, targetIndex?: number) => void;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
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

function toggleNodeInTree(nodes: DocumentTreeNode[], nodeId: string): DocumentTreeNode[] {
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, isOpen: !n.isOpen };
    if (n.children.length > 0) return { ...n, children: toggleNodeInTree(n.children, nodeId) };
    return n;
  });
}

function addChildToTree(nodes: DocumentTreeNode[], parentId: string): DocumentTreeNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      const newChild: DocumentTreeNode = {
        id: 'new-' + Date.now(),
        icon: '📄',
        title: '新建文档',
        children: [],
      };
      return { ...n, children: [...n.children, newChild], isOpen: true };
    }
    if (n.children.length > 0) return { ...n, children: addChildToTree(n.children, parentId) };
    return n;
  });
}

function findDocPath(nodes: DocumentTreeNode[], docId: string, path: string[] = []): string[] | null {
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

export { findDocPath };

export const useDocumentStore = create<DocumentState>((set, get) => ({
  tree: MOCK_TREE,
  documentsById: {},
  historyByDocId: {},
  blocks: [],
  currentDocId: null,
  currentDocMeta: null,

  loadDocument: (docId: string) => {
    const existing = get().documentsById[docId];
    const blocks = existing || createMockBlocks(docId);
    const meta = MOCK_DOC_META[docId] || MOCK_DOC_META['design'];
    set((s) => ({
      blocks,
      currentDocId: docId,
      currentDocMeta: meta,
      documentsById: existing ? s.documentsById : { ...s.documentsById, [docId]: blocks },
    }));
  },

  toggleTreeNode: (nodeId: string) => {
    set((s) => ({ tree: toggleNodeInTree(s.tree, nodeId) }));
  },

  addChildNode: (parentId: string) => {
    set((s) => ({ tree: addChildToTree(s.tree, parentId) }));
  },

  updateBlock: (blockId, content) => {
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
  },

  insertBlock: (afterBlockId, blockType) => {
    const { blocks } = get();
    const idx = blocks.findIndex((b) => b.id === afterBlockId);
    if (idx === -1) return;
    const newBlock: DocumentBlock = {
      id: uid(),
      documentId: blocks[0]?.documentId || '',
      blockType: blockType as DocumentBlock['blockType'],
      content: defaultBlockContent(blockType),
      sortOrder: idx + 1,
      createdAt: now(),
      updatedAt: now(),
    };
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, newBlock);
    set((s) => ({
      blocks: newBlocks,
      documentsById: s.currentDocId ? { ...s.documentsById, [s.currentDocId]: newBlocks } : s.documentsById,
      historyByDocId: s.currentDocId
        ? {
            ...s.historyByDocId,
            [s.currentDocId]: [...(s.historyByDocId[s.currentDocId] || []), cloneBlocks(blocks)].slice(-50),
          }
        : s.historyByDocId,
    }));
  },

  removeBlock: (blockId) => {
    set((s) => {
      const blocks = s.blocks.filter((b) => b.id !== blockId);
      return {
        blocks,
        documentsById: s.currentDocId ? { ...s.documentsById, [s.currentDocId]: blocks } : s.documentsById,
        historyByDocId: s.currentDocId
          ? {
              ...s.historyByDocId,
              [s.currentDocId]: [...(s.historyByDocId[s.currentDocId] || []), cloneBlocks(s.blocks)].slice(-50),
            }
          : s.historyByDocId,
      };
    });
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
  },

  duplicateBlock: (blockId) => {
    set((s) => {
      const idx = s.blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return s;

      const source = s.blocks[idx];
      const duplicated: DocumentBlock = {
        ...source,
        id: uid(),
        content: structuredClone(source.content),
        sortOrder: idx + 1,
        createdAt: now(),
        updatedAt: now(),
      };

      const blocks = [...s.blocks];
      blocks.splice(idx + 1, 0, duplicated);
      const orderedBlocks = blocks.map((b, i) => ({ ...b, sortOrder: i }));

      return {
        blocks: orderedBlocks,
        documentsById: s.currentDocId ? { ...s.documentsById, [s.currentDocId]: orderedBlocks } : s.documentsById,
        historyByDocId: s.currentDocId
          ? {
              ...s.historyByDocId,
              [s.currentDocId]: [...(s.historyByDocId[s.currentDocId] || []), cloneBlocks(s.blocks)].slice(-50),
            }
          : s.historyByDocId,
      };
    });
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
  },

  addNewRootDoc: () => {
    const newNode: DocumentTreeNode = {
      id: 'new-' + Date.now(),
      icon: '📄',
      title: '新建文档',
      children: [],
    };
    set((s) => ({ tree: [...s.tree, newNode] }));
  },

  addBlockFromSlash: (docId, blockType, content, targetIndex) => {
    const { blocks } = get();
    const newBlock: DocumentBlock = {
      id: uid(),
      documentId: docId,
      blockType: blockType as DocumentBlock['blockType'],
      content: content || defaultBlockContent(blockType),
      sortOrder: blocks.length,
      createdAt: now(),
      updatedAt: now(),
    };
    const insertAt =
      typeof targetIndex === 'number' && targetIndex >= 0 ? Math.min(targetIndex, blocks.length) : blocks.length;
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
  },

  replaceBlockFromSlash: (blockId, blockType, content) => {
    set((s) => {
      const blocks = s.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              blockType: blockType as DocumentBlock['blockType'],
              content: content || defaultBlockContent(blockType),
              updatedAt: now(),
            }
          : b
      );

      return {
        blocks,
        documentsById: s.currentDocId ? { ...s.documentsById, [s.currentDocId]: blocks } : s.documentsById,
        historyByDocId: s.currentDocId
          ? {
              ...s.historyByDocId,
              [s.currentDocId]: [...(s.historyByDocId[s.currentDocId] || []), cloneBlocks(s.blocks)].slice(-50),
            }
          : s.historyByDocId,
      };
    });
    return blockId;
  },

  addDocLinkBlock: (targetNode, docId, targetIndex) => {
    const { blocks } = get();
    const newBlock: DocumentBlock = {
      id: uid(),
      documentId: docId,
      blockType: 'doclink',
      content: {
        targetDocId: targetNode.id,
        icon: targetNode.icon,
        title: targetNode.title,
      },
      sortOrder: blocks.length,
      createdAt: now(),
      updatedAt: now(),
    };
    const nextBlocks = [...blocks];
    const insertAt =
      typeof targetIndex === 'number' && targetIndex >= 0 ? Math.min(targetIndex, nextBlocks.length) : nextBlocks.length;
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
  },
}));
