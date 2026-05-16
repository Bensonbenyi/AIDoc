/**
 * API 请求封装模块
 *
 * 统一处理前端与后端的 HTTP 请求
 * 自动处理 snake_case ↔ camelCase 转换和 block_type 映射
 */

import { toBackendBlockType, toFrontendBlockType } from './blockTypeMapping';

// 基础 URL 从环境变量读取
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ==============================
// snake_case ↔ camelCase 转换
// ==============================

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function convertKeys(obj: unknown, converter: (key: string) => string): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertKeys(item, converter));
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[converter(key)] = convertKeys(value, converter);
    }
    return result;
  }
  return obj;
}

/** 将后端响应的 snake_case keys 转为 camelCase */
function toCamelCase(obj: unknown): unknown {
  return convertKeys(obj, snakeToCamel);
}

/** 将前端请求的 camelCase keys 转为 snake_case */
function toSnakeCase(obj: unknown): unknown {
  return convertKeys(obj, camelToSnake);
}

// ==============================
// block_type 转换（在 key 转换之后执行）
// ==============================

function convertBlockTypeInResponse(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(convertBlockTypeInResponse);
  }
  if (data !== null && typeof data === 'object') {
    const obj = { ...(data as Record<string, unknown>) };
    if (typeof obj.blockType === 'string') {
      obj.blockType = toFrontendBlockType(obj.blockType);
    }
    if (Array.isArray(obj.blocks)) {
      obj.blocks = obj.blocks.map(convertBlockTypeInResponse);
    }
    if (Array.isArray(obj.children)) {
      obj.children = obj.children.map(convertBlockTypeInResponse);
    }
    return obj;
  }
  return data;
}

function convertBlockTypeInRequest(data: unknown): unknown {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const obj = { ...(data as Record<string, unknown>) };
    if (typeof obj.block_type === 'string') {
      obj.block_type = toBackendBlockType(obj.block_type);
    }
    if (Array.isArray(obj.blocks)) {
      obj.blocks = obj.blocks.map(convertBlockTypeInRequest);
    }
    return obj;
  }
  return data;
}

// ==============================
// 基础请求函数
// ==============================

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // 处理 HTTP 错误
    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      throw new ApiError(
        `HTTP error ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    // 处理 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    // 解析 JSON 响应，自动转换 snake_case → camelCase 和 block_type
    const rawData = await response.json();
    const camelData = toCamelCase(rawData);
    const finalData = convertBlockTypeInResponse(camelData);
    return finalData as T;
  } catch (error) {
    // 如果是 ApiError，直接抛出
    if (error instanceof ApiError) {
      throw error;
    }

    // 网络错误或其他错误
    throw new ApiError(
      error instanceof Error ? error.message : "网络请求失败",
      0
    );
  }
}

/**
 * GET 请求
 */
export async function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: "GET" });
}

/**
 * POST 请求（自动转换请求体 camelCase → snake_case 和 block_type）
 */
export async function post<T>(endpoint: string, data?: unknown): Promise<T> {
  const converted = data ? convertBlockTypeInRequest(toSnakeCase(data)) : undefined;
  return request<T>(endpoint, {
    method: "POST",
    body: converted ? JSON.stringify(converted) : undefined,
  });
}

/**
 * PUT 请求（自动转换请求体）
 */
export async function put<T>(endpoint: string, data?: unknown): Promise<T> {
  const converted = data ? convertBlockTypeInRequest(toSnakeCase(data)) : undefined;
  return request<T>(endpoint, {
    method: "PUT",
    body: converted ? JSON.stringify(converted) : undefined,
  });
}

/**
 * PATCH 请求（自动转换请求体）
 */
export async function patch<T>(endpoint: string, data?: unknown): Promise<T> {
  const converted = data ? convertBlockTypeInRequest(toSnakeCase(data)) : undefined;
  return request<T>(endpoint, {
    method: "PATCH",
    body: converted ? JSON.stringify(converted) : undefined,
  });
}

/**
 * DELETE 请求
 */
export async function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: "DELETE" });
}

// ==============================
// API 响应类型（camelCase，与前端类型一致）
// ==============================

export interface DocumentCreate {
  title: string;
  parentId?: string | null;
  icon?: string;
}

export interface DocumentUpdate {
  title?: string;
  icon?: string;
  coverUrl?: string;
}

export interface DocumentResponse {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  coverUrl: string | null;
  sortOrder: number;
  path: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTreeNode {
  id: string;
  icon: string;
  title: string;
  children: DocumentTreeNode[];
}

export interface DocumentDetail {
  id: string;
  title: string;
  icon: string;
  coverUrl: string | null;
  path: string;
  blocks: BlockResponse[];
}

export interface BlockCreate {
  id?: string;
  blockType: string;
  content: Record<string, unknown>;
  properties?: Record<string, unknown>;
  sortOrder: number;
}

export interface BlockUpdate {
  content?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

export interface BlockResponse {
  id: string;
  documentId: string;
  blockType: string;
  content: Record<string, unknown>;
  properties: Record<string, unknown> | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlocksBatchSave {
  blocks: BlockCreate[];
}

export interface BlocksBatchResponse {
  success: boolean;
  updatedCount: number;
}

/**
 * 文档 API
 */
export const documentsAPI = {
  create: (data: DocumentCreate): Promise<DocumentResponse> =>
    post("/api/documents", data),

  getTree: (): Promise<DocumentTreeNode[]> => get("/api/documents/tree"),

  getDetail: (docId: string): Promise<DocumentDetail> =>
    get(`/api/documents/${docId}`),

  update: (docId: string, data: DocumentUpdate): Promise<DocumentResponse> =>
    patch(`/api/documents/${docId}`, data),

  delete: (docId: string): Promise<void> => del(`/api/documents/${docId}`),

  batchSaveBlocks: (
    docId: string,
    data: BlocksBatchSave
  ): Promise<BlocksBatchResponse> =>
    put(`/api/documents/${docId}/blocks`, data),

  createBlock: (docId: string, data: BlockCreate): Promise<BlockResponse> =>
    post(`/api/documents/${docId}/blocks`, data),
};

/**
 * Block API
 */
export const blocksAPI = {
  update: (blockId: string, data: BlockUpdate): Promise<BlockResponse> =>
    patch(`/api/blocks/${blockId}`, data),

  delete: (blockId: string): Promise<void> => del(`/api/blocks/${blockId}`),
};

// ==============================
// 代码执行 API
// ==============================

export interface CodeExecutionSaveData {
  blockId: string;
  documentId: string;
  language?: string;
  sourceCode: string;
  status: string;
  stdout?: string;
  stderr?: string;
  executionTimeMs?: number;
}

export interface CodeExecutionResponse {
  id: string;
  status: string;
  stdout: string;
  stderr: string;
  resultJson: Record<string, unknown> | null;
  executionTimeMs: number | null;
  createdAt: string;
}

/**
 * 代码执行 API
 */
export const codeExecutionAPI = {
  /** 在后端 Docker 容器中执行代码 */
  execute: (data: { blockId: string; documentId: string; language?: string; sourceCode: string }): Promise<CodeExecutionResponse> =>
    post("/api/code-executions/execute", data),

  /** 保存代码执行记录 */
  save: (data: CodeExecutionSaveData): Promise<CodeExecutionResponse> =>
    post("/api/code-executions", data),

  /** 获取单条执行记录 */
  get: (id: string): Promise<CodeExecutionResponse> =>
    get(`/api/code-executions/${id}`),

  /** 获取 block 的执行历史 */
  getByBlock: (blockId: string, limit: number = 10): Promise<CodeExecutionResponse[]> =>
    get(`/api/code-executions/by-block/${blockId}?limit=${limit}`),
};

// ==============================
// 3D 图表 API
// ==============================

export interface Chart3DCreateData {
  documentId: string;
  sourceType?: "manual" | "table" | "code_output" | "csv";
  sourceBlockId?: string | null;
  dataJson: Record<string, unknown>;
}

export interface Chart3DResponse {
  chartId: string;
  chartConfig: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * 3D 图表 API
 */
export const chartsAPI = {
  /** 创建 3D 图表 */
  create: (blockId: string, data: Chart3DCreateData): Promise<Chart3DResponse> =>
    post(`/api/charts/3d?block_id=${blockId}`, data),

  /** 获取图表数据 */
  get: (chartId: string): Promise<Chart3DResponse> =>
    get(`/api/charts/${chartId}`),

  /** 更新图表数据 */
  update: (chartId: string, data: Chart3DCreateData): Promise<Chart3DResponse> =>
    patch(`/api/charts/${chartId}`, data),

  /** 根据 block_id 获取图表数据 */
  getByBlock: (blockId: string): Promise<Chart3DResponse | null> =>
    get(`/api/charts/by-block/${blockId}`),

  /** 根据 block_id 保存或更新图表数据 */
  saveByBlock: (blockId: string, data: Chart3DCreateData): Promise<Chart3DResponse> =>
    put(`/api/charts/by-block/${blockId}`, data),
};

// ==============================
// 白板 API
// ==============================

export interface WhiteboardSaveData {
  dataJson: unknown;
  previewImageUrl?: string | null;
}

export interface WhiteboardResponse {
  id: string;
  blockId: string;
  documentId: string;
  dataJson: unknown;
  previewImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 白板 API（通过 blocks 路由）
 */
export const whiteboardAPI = {
  /** 保存白板数据 */
  save: (blockId: string, data: WhiteboardSaveData): Promise<WhiteboardResponse> =>
    put(`/api/blocks/${blockId}/whiteboard`, data),

  /** 获取白板数据 */
  get: (blockId: string): Promise<WhiteboardResponse> =>
    get(`/api/blocks/${blockId}/whiteboard`),
};

// ==============================
// 文件上传 API
// ==============================

export interface FileUploadResponse {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * 上传文件（支持进度回调）
 */
export function uploadFile(
  file: File,
  documentId: string,
  blockId?: string,
  onProgress?: (progress: FileUploadProgress) => void
): Promise<FileUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_id', documentId);
    if (blockId) formData.append('block_id', blockId);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const raw = JSON.parse(xhr.responseText);
          const camel = toCamelCase(raw) as FileUploadResponse;
          resolve(camel);
        } catch {
          reject(new ApiError('响应解析失败', xhr.status));
        }
      } else {
        let errorData: unknown;
        try {
          errorData = JSON.parse(xhr.responseText);
        } catch {
          errorData = null;
        }
        reject(new ApiError(`上传失败: ${xhr.statusText}`, xhr.status, errorData));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new ApiError('网络错误', 0));
    });

    xhr.addEventListener('abort', () => {
      reject(new ApiError('上传已取消', 0));
    });

    xhr.open('POST', `${API_BASE_URL}/api/files/upload`);
    xhr.send(formData);
  });
}

export const filesAPI = {
  upload: uploadFile,

  /** 获取文件 URL */
  getUrl: (fileId: string): string => `${API_BASE_URL}/api/files/${fileId}`,

  /** 删除文件 */
  delete: (fileId: string): Promise<void> => del(`/api/files/${fileId}`),
};

// ==============================
// AI 对话 API
// ==============================

/** AI scope 映射：前端 → 后端 */
const scopeToBackend: Record<string, string> = {
  doc: 'current_document',
  tree: 'document_tree',
  all: 'all_workspace',
};

export interface AIChatResponse {
  messageId: string;
  answer: string;
  references: AIReferenceData[];
  confidence: string | null;
  sessionId?: string;
}

export interface AIReferenceData {
  docId: string;
  blockId: string;
  blockType: string;
  contentPreview: string;
  documentPath?: string;
}

export interface AISessionResponse {
  id: string;
  documentId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessageResponse {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  references: Record<string, unknown>[] | null;
  createdAt: string;
}

export interface AIContextResponse {
  context: string;
  sourceType: string;
  sourceTitle: string;
}

/**
 * AI 对话 API
 */
export const aiAPI = {
  /** 创建对话会话 */
  createSession: (documentId?: string, title?: string): Promise<AISessionResponse> => {
    const params = new URLSearchParams();
    if (documentId) params.set('document_id', documentId);
    if (title) params.set('title', title);
    const qs = params.toString();
    return post(`/api/ai/sessions${qs ? '?' + qs : ''}`, undefined);
  },

  /** 获取会话详情 */
  getSession: (sessionId: string): Promise<AISessionResponse> =>
    get(`/api/ai/sessions/${sessionId}`),

  /** 获取对话历史消息 */
  getMessages: (sessionId: string, limit: number = 50): Promise<AIMessageResponse[]> =>
    get(`/api/ai/sessions/${sessionId}/messages?limit=${limit}`),

  /** 获取文档的对话会话列表 */
  getDocumentSessions: (documentId: string): Promise<AISessionResponse[]> =>
    get(`/api/ai/documents/${documentId}/sessions`),

  /** 普通 AI 对话 */
  chat: (sessionId: string | null, message: string, context?: string): Promise<AIChatResponse> =>
    post('/api/ai/chat', { sessionId, message, context }),

  /** 基于文档问答（支持拖拽上下文） */
  documentQA: (
    documentId: string | undefined,
    question: string,
    scope: string,
    sessionId?: string | null,
    contextDocumentId?: string | null,
    contextBlockIds?: string[] | null,
  ): Promise<AIChatResponse> =>
    post('/api/ai/document-qa', {
      documentId: documentId || undefined,
      question,
      scope: scopeToBackend[scope] || 'current_document',
      sessionId: sessionId || undefined,
      contextDocumentId: contextDocumentId || undefined,
      contextBlockIds: contextBlockIds || undefined,
    }),

  /** 获取文档内容作为上下文（拖拽文档时调用） */
  getDocumentContext: (documentId: string): Promise<AIContextResponse> =>
    post('/api/ai/context/document', { documentId }),

  /** 获取 Block 内容作为上下文（拖拽 block 时调用） */
  getBlockContext: (blockId: string): Promise<AIContextResponse> =>
    post('/api/ai/context/block', { blockId }),
};
