/**
 * API 请求封装模块
 *
 * 统一处理前端与后端的 HTTP 请求
 */

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

/**
 * 基础请求函数
 */
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
      return {} as T;
    }

    // 解析 JSON 响应
    const data = await response.json();
    return data as T;
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
 * POST 请求
 */
export async function post<T>(endpoint: string, data?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT 请求
 */
export async function put<T>(endpoint: string, data?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH 请求
 */
export async function patch<T>(endpoint: string, data?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE 请求
 */
export async function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: "DELETE" });
}

// ==============================
// 文档相关 API
// ==============================

export interface DocumentCreate {
  title: string;
  parent_id?: string | null;
  icon?: string;
}

export interface DocumentUpdate {
  title?: string;
  icon?: string;
  cover_url?: string;
}

export interface DocumentResponse {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string;
  cover_url: string | null;
  sort_order: number;
  path: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentTreeNode {
  id: string;
  icon: string;
  title: string;
  children: DocumentTreeNode[];
}

export interface DocumentDetail extends DocumentResponse {
  blocks: BlockResponse[];
}

export interface BlockCreate {
  block_type: string;
  content: Record<string, unknown>;
  properties?: Record<string, unknown>;
  sort_order: number;
}

export interface BlockUpdate {
  content?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

export interface BlockResponse {
  id: string;
  document_id: string;
  parent_block_id: string | null;
  block_type: string;
  content: Record<string, unknown>;
  properties: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BlocksBatchSave {
  blocks: BlockCreate[];
}

export interface BlocksBatchResponse {
  success: boolean;
  updated_count: number;
}

/**
 * 文档 API
 */
export const documentsAPI = {
  /**
   * 创建文档
   */
  create: (data: DocumentCreate): Promise<DocumentResponse> =>
    post("/api/documents", data),

  /**
   * 获取文档树
   */
  getTree: (): Promise<DocumentTreeNode[]> => get("/api/documents/tree"),

  /**
   * 获取文档详情
   */
  getDetail: (docId: string): Promise<DocumentDetail> =>
    get(`/api/documents/${docId}`),

  /**
   * 更新文档
   */
  update: (docId: string, data: DocumentUpdate): Promise<DocumentResponse> =>
    patch(`/api/documents/${docId}`, data),

  /**
   * 删除文档
   */
  delete: (docId: string): Promise<void> => del(`/api/documents/${docId}`),

  /**
   * 批量保存 blocks
   */
  batchSaveBlocks: (
    docId: string,
    data: BlocksBatchSave
  ): Promise<BlocksBatchResponse> =>
    put(`/api/documents/${docId}/blocks`, data),

  /**
   * 创建单个 block
   */
  createBlock: (docId: string, data: BlockCreate): Promise<BlockResponse> =>
    post(`/api/documents/${docId}/blocks`, data),
};

/**
 * Block API
 */
export const blocksAPI = {
  /**
   * 更新 block
   */
  update: (blockId: string, data: BlockUpdate): Promise<BlockResponse> =>
    patch(`/api/blocks/${blockId}`, data),

  /**
   * 删除 block
   */
  delete: (blockId: string): Promise<void> => del(`/api/blocks/${blockId}`),
};
