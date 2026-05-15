# AI 原生交互式文档系统 - 开发实施计划

> 本计划是一系列给 AI 开发工具的详细指令。
> 每个步骤都应作为独立的 prompt 喂给 AI 工具执行。
> 前端 UI 交互验证已全部完成，本计划从后端零基础开始。

---

## 阶段 0：项目基础设施搭建

### 步骤 0.1：初始化后端项目结构

**指令：**

在项目根目录下创建 `backend/` 目录，使用 `uv` 初始化 Python 项目。要求：

1. 创建 `backend/` 目录，进入该目录；
2. 执行 `uv init` 初始化项目，生成 `pyproject.toml`；
3. 使用 `uv` 添加以下依赖（会自动写入 `pyproject.toml`）：
   - `uv add fastapi` — Web 框架
   - `uv add "uvicorn[standard]"` — ASGI 服务器
   - `uv add "sqlalchemy[asyncio]"` — ORM
   - `uv add asyncpg` — PostgreSQL 异步驱动
   - `uv add pydantic` — 参数校验
   - `uv add pydantic-settings` — 环境变量管理
   - `uv add python-dotenv` — .env 文件加载
   - `uv add loguru` — 日志
   - `uv add httpx` — 异步 HTTP 客户端（调用 AI API 用）
   - `uv add pgvector` — PostgreSQL 向量扩展支持
   - `uv add python-multipart` — 文件上传支持
   - `uv add pytest pytest-asyncio httpx` — 测试依赖（dev）
4. 确认 `pyproject.toml` 中依赖列表正确，项目结构使用 `app/` 作为源码目录；
5. 创建 `.env.example` 文件，列出所有需要的环境变量（参照 tech.md 第 15 节的环境变量表），每个变量附带注释说明用途和示例值；
6. 创建 `.env` 文件，复制 `.env.example` 内容，填入本地开发默认值。

**uv 使用说明：**
- `uv` 是新一代 Python 包管理器，替代 pip + venv + requirements.txt
- `uv init` 创建项目并生成 `pyproject.toml`
- `uv add <package>` 添加依赖并自动安装
- `uv run <command>` 在项目虚拟环境中运行命令（无需手动激活 venv）
- `uv sync` 同步安装所有依赖
- 项目根目录的 `pyproject.toml` 是唯一的依赖声明文件，不再需要 `requirements.txt`

### 步骤 0.2：搭建后端基础框架

**指令：**

创建后端 FastAPI 应用的基础骨架文件。要求创建以下文件并写入初始代码：

1. `backend/app/__init__.py` — 空文件；
   - 注意：使用 `uv run` 命令运行项目（如 `uv run uvicorn app.main:app --reload`），无需手动激活虚拟环境
2. `backend/app/config.py` — 使用 `pydantic-settings` 的 `BaseSettings` 类，从 `.env` 文件读取所有环境变量，提供类型标注和默认值。必须包含的配置项：
   - `DATABASE_URL`：数据库连接地址，默认 `postgresql+asyncpg://postgres:postgres@localhost:5432/aidoc`
   - `FRONTEND_URL`：前端地址，默认 `http://localhost:3000`
   - `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`：LLM 服务配置 （zhipuai GLM5.1）
   - `EMBEDDING_API_KEY`、`EMBEDDING_BASE_URL`、`EMBEDDING_MODEL`：Embedding 服务配置 （阿里 text-embedding-v4）
   - `RERANKER_API_KEY`、`RERANKER_BASE_URL`、`RERANKER_MODEL`：Reranker 服务配置 （阿里qwen3-rerank）
   - `FILE_STORAGE_TYPE`：文件存储类型，默认 `local`
   - `LOCAL_STORAGE_PATH`：本地存储路径，默认 `./storage`
   - `CODE_EXECUTION_MODE`：代码执行模式，默认 `pyodide`
   - `CODE_EXECUTION_TIMEOUT`：超时时间，默认 `30`
   - `LOG_LEVEL`：日志等级，默认 `INFO`
3. `backend/app/database.py` — 创建异步 SQLAlchemy 引擎和会话工厂。使用 `create_async_engine` 连接 PostgreSQL，创建 `async_sessionmaker`，提供 `get_db` 依赖函数供 FastAPI 路由使用；
4. `backend/app/dependencies.py` — 创建 FastAPI 依赖注入函数，至少包含 `get_db`（数据库会话）、`get_config`（配置实例）；
5. `backend/app/main.py` — 创建 FastAPI 应用实例，配置 CORS（允许前端地址跨域），挂载所有路由，添加启动事件（打印配置信息），添加健康检查接口 `GET /api/health`。

### 步骤 0.3：配置 PostgreSQL 数据库

**指令：**

编写数据库初始化指引和脚本。要求：

1. 创建 `backend/scripts/init_db.py` 脚本，功能：
   - 连接 PostgreSQL 数据库；
   - 创建 `aidoc` 数据库（如不存在）；
   - 启用 `vector` 扩展（`CREATE EXTENSION IF NOT EXISTS vector`）；
   - 创建所有数据表（基于后续步骤中定义的 ORM 模型）；
   - 插入初始种子数据（默认文档空间下的示例文档树）；
2. 创建 `backend/scripts/seed_data.py` 脚本，用于插入 Demo 用的初始文档和 block 数据；
3. 在 `backend/` 下创建 `README.md`，说明如何安装 PostgreSQL、创建数据库、运行初始化脚本。

### 步骤 0.4：前端环境补充配置

**指令：**

检查并补充前端项目中缺失的配置。要求：

1. 在 `frontend/` 目录下创建 `.env.local` 文件，添加：
   - `NEXT_PUBLIC_API_URL=http://localhost:8000` — 后端 API 地址
2. 在 `frontend/src/lib/` 下规划 API 请求封装文件 `api.ts` 的结构（暂不实现，后续步骤完成）；
3. 确认 `frontend/package.json` 中是否需要补充依赖，后续步骤如需新的 npm 包会在对应步骤中说明。

---

## 阶段 1：数据库模型与 ORM 定义

### 步骤 1.1：定义核心 ORM 模型

**指令：**

在 `backend/app/models/` 目录下创建所有数据库 ORM 模型文件。使用 SQLAlchemy 2.0 风格的 `Mapped` 类型注解。要求：

1. 创建 `backend/app/models/__init__.py`，导出所有模型；
2. 创建 `backend/app/models/document.py`，定义 `Document` 模型：
   - 字段：`id`（UUID 主键）、`parent_id`（外键自引用，可为空）、`title`（字符串）、`icon`（字符串，默认 📄）、`cover_url`（字符串，可空）、`sort_order`（浮点数）、`path`（字符串，存储文档路径如 "项目总览/产品设计"）、`is_deleted`（布尔值，默认 False）、`created_at`（时间戳）、`updated_at`（时间戳）
   - 关系：`children`（一对多自引用）、`blocks`（一对多到 DocumentBlock）、`parent`（多对一自引用）
3. 创建 `backend/app/models/document_block.py`，定义 `DocumentBlock` 模型：
   - 字段：`id`（UUID 主键）、`document_id`（外键到 Document）、`parent_block_id`（外键自引用，可空）、`block_type`（枚举字符串，值包括：paragraph, heading_1, heading_2, heading_3, bullet_list, numbered_list, todo, table, quote, divider, code, whiteboard, chart_3d, image, file, audio, video, link_to_document, ai_answer）、`content`（JSON 类型）、`properties`（JSON 类型，可空）、`sort_order`（浮点数）、`created_at`、`updated_at`
   - 关系：`document`（多对一到 Document）
4. 创建 `backend/app/models/whiteboard_data.py`，定义 `WhiteboardData` 模型：
   - 字段：`id`、`block_id`（外键）、`document_id`（外键）、`data_json`（JSON）、`preview_image_url`（可空）、`created_at`、`updated_at`
5. 创建 `backend/app/models/chart_3d.py`，定义 `Chart3D` 模型：
   - 字段：`id`、`block_id`、`document_id`、`source_type`（枚举：manual/table/code_output/csv）、`source_block_id`（可空）、`data_json`（JSON）、`chart_config`（JSON）、`created_at`、`updated_at`
6. 创建 `backend/app/models/ai_chat.py`，定义 `AIChatSession` 模型：
   - 字段：`id`、`document_id`（可空）、`title`、`created_at`、`updated_at`
7. 创建 `backend/app/models/ai_message.py`，定义 `AIMessage` 模型：
   - 字段：`id`、`session_id`（外键）、`role`（枚举：user/assistant/system）、`content`（文本）、`references`（JSON，可空）、`created_at`
8. 创建 `backend/app/models/knowledge_chunk.py`，定义 `KnowledgeChunk` 模型：
   - 字段：`id`、`document_id`、`block_id`、`chunk_text`（文本）、`embedding`（使用 pgvector 的 `Vector` 类型，维度 1024）、`bm25_text`（文本，用于关键词检索）、`block_type`、`heading_path`、`document_path`、`metadata_`（JSON）、`created_at`、`updated_at`
   - 注意：`embedding` 字段类型为 `Vector(1024)`，需要从 `pgvector.sqlalchemy import Vector` 导入
9. 创建 `backend/app/models/document_summary.py`，定义 `DocumentSummary` 模型：
   - 字段：`id`、`document_id`（外键，唯一约束）、`summary_text`（文本）、`key_points`（JSON）、`updated_at`
10. 创建 `backend/app/models/code_execution.py`，定义 `CodeExecution` 模型：
    - 字段：`id`、`block_id`、`document_id`、`language`、`source_code`（文本）、`status`（枚举：pending/running/success/failed/timeout）、`stdout`（文本）、`stderr`（文本）、`result_json`（JSON，可空）、`execution_time_ms`（整数，可空）、`created_at`
11. 创建 `backend/app/models/file_asset.py`，定义 `FileAsset` 模型：
    - 字段：`id`、`document_id`、`block_id`（可空）、`file_name`、`file_type`、`file_url`、`file_size`（整数）、`created_at`
12. 创建 `backend/app/models/system_log.py`，定义 `SystemLog` 模型：
    - 字段：`id`、`log_type`（枚举：ai_call/rag_search/code_execution/document_update/error）、`message`（文本）、`metadata_`（JSON，可空）、`created_at`

**注意事项：**
- 所有 `id` 字段使用 UUID 类型，Python 端生成默认值；
- 所有 JSON 字段使用 SQLAlchemy 的 `JSON` 类型；
- 时间字段使用 `datetime.utcnow` 作为默认值；
- 模型表名使用小写下划线风格（如 `documents`、`document_blocks`）。

### 步骤 1.2：定义 Pydantic Schema

**指令：**

在 `backend/app/schemas/` 目录下创建所有请求和响应的 Pydantic 模型。要求：

1. 创建 `backend/app/schemas/__init__.py`；
2. 创建 `backend/app/schemas/document.py`：
   - `DocumentCreate`：创建文档请求（title, parent_id, icon）
   - `DocumentUpdate`：更新文档请求（title, icon, cover_url）
   - `DocumentResponse`：文档响应（所有字段）
   - `DocumentTreeNode`：文档树节点（id, icon, title, children）
   - `DocumentDetail`：文档详情（包含 blocks 列表）
3. 创建 `backend/app/schemas/block.py`：
   - `BlockCreate`：创建 block 请求（block_type, content, properties, sort_order）
   - `BlockUpdate`：更新 block 请求（content, properties）
   - `BlockResponse`：block 响应
   - `BlocksBatchSave`：批量保存 blocks 请求（blocks 列表）
   - `BlocksBatchResponse`：批量保存响应（success, updated_count）
4. 创建 `backend/app/schemas/whiteboard.py`：
   - `WhiteboardSaveRequest`：保存白板请求（data_json, preview_image_url）
   - `WhiteboardResponse`：白板数据响应
5. 创建 `backend/app/schemas/ai.py`：
   - `AIChatRequest`：AI 对话请求（session_id, message）
   - `AIDocumentQARequest`：文档问答请求（document_id, question, scope）
   - `AIResponse`：AI 响应（message_id, answer, references）
   - `AIReference`：引用来源（doc_id, block_id, block_type, content_preview, document_path）
6. 创建 `backend/app/schemas/rag.py`：
   - `RAGReindexRequest`：重建索引请求（document_id）
   - `RAGSearchRequest`：检索请求（document_id, query, scope, top_k）
   - `RAGSearchResult`：单个检索结果（doc_id, block_id, block_type, score, content_preview）
   - `RAGSearchResponse`：检索响应（chunks 列表）
7. 创建 `backend/app/schemas/code_execution.py`：
   - `CodeExecuteRequest`：代码执行请求（language, source_code）
   - `CodeExecuteResponse`：执行结果响应（execution_id, status, stdout, stderr, result_json, execution_time_ms）
8. 创建 `backend/app/schemas/chart.py`：
   - `Chart3DCreateRequest`：创建图表请求（document_id, source_type, source_block_id, data_json）
   - `Chart3DResponse`：图表响应（chart_id, chart_config）
9. 创建 `backend/app/schemas/file.py`：
   - `FileUploadResponse`：文件上传响应
10. 创建 `backend/app/schemas/system.py`：
    - `HealthResponse`：健康检查响应
    - `SystemStatusResponse`：系统状态响应

**注意事项：**
- 所有 Schema 使用 `model_config = ConfigDict(from_attributes=True)` 支持 ORM 模型转换；
- 使用 `Field` 添加字段描述和默认值；
- 枚举字段使用 Python `Enum` 定义。

---

## 阶段 2：文档管理 API

### 步骤 2.1：实现文档 Service 层

**指令：**

创建 `backend/app/services/document_service.py`，实现文档管理的核心业务逻辑。要求：

1. `create_document(db, data: DocumentCreate) -> Document`：
   - 生成 UUID 作为文档 id
   - 如果提供了 `parent_id`，验证父文档存在
   - 自动计算 `path`：如果无父文档则为 title，否则为 "父文档path / title"
   - 计算 `sort_order`：取同级文档最大 sort_order + 1
   - 写入数据库并返回
2. `get_document_tree(db) -> list`：
   - 查询所有未删除的文档
   - 构建树状结构返回（递归组装 children）
   - 按 sort_order 排序
3. `get_document_detail(db, document_id) -> dict`：
   - 获取文档基本信息
   - 获取该文档下所有 block，按 sort_order 排序
   - 返回包含 blocks 的完整文档详情
4. `update_document(db, document_id, data: DocumentUpdate) -> Document`：
   - 验证文档存在且未删除
   - 更新提供的字段
   - 如果 title 改变，同步更新所有子文档的 path
5. `delete_document(db, document_id) -> bool`：
   - 软删除（设置 `is_deleted = True`）
   - 同时软删除所有子文档
   - 不删除 block 数据（保留以便恢复）
6. `get_document_path(db, document_id) -> str`：
   - 获取文档的完整路径字符串

### 步骤 2.2：实现 Block Service 层

**指令：**

创建 `backend/app/services/block_service.py`，实现 block 管理的核心业务逻辑。要求：

1. `create_block(db, document_id, data: BlockCreate) -> DocumentBlock`：
   - 验证文档存在
   - 生成 UUID
   - 验证 block_type 合法
   - 写入数据库
2. `batch_save_blocks(db, document_id, blocks: list[BlockCreate]) -> int`：
   - 删除该文档下所有现有 block
   - 批量插入新的 block 列表
   - 返回更新数量
   - 使用事务确保原子性
3. `update_block(db, block_id, data: BlockUpdate) -> DocumentBlock`：
   - 验证 block 存在
   - 更新 content 和/或 properties
4. `delete_block(db, block_id) -> bool`：
   - 验证 block 存在
   - 删除 block
   - 同时删除关联的白板数据、图表数据等
5. `get_blocks_by_document(db, document_id) -> list`：
   - 获取指定文档的所有 block，按 sort_order 排序

### 步骤 2.3：实现文档 API 路由

**指令：**

创建 `backend/app/routers/documents.py`，实现文档管理的 REST API。要求：

1. `POST /api/documents` — 创建文档
   - 接收 `DocumentCreate` 请求体
   - 调用 `document_service.create_document`
   - 返回 `DocumentResponse`
2. `GET /api/documents/tree` — 获取文档树
   - 调用 `document_service.get_document_tree`
   - 返回 `list[DocumentTreeNode]`
3. `GET /api/documents/{document_id}` — 获取文档详情
   - 调用 `document_service.get_document_detail`
   - 返回 `DocumentDetail`（包含 blocks）
4. `PATCH /api/documents/{document_id}` — 更新文档
   - 接收 `DocumentUpdate` 请求体
   - 调用 `document_service.update_document`
5. `DELETE /api/documents/{document_id}` — 删除文档
   - 调用 `document_service.delete_document`
6. `PUT /api/documents/{document_id}/blocks` — 批量保存 blocks
   - 接收 `BlocksBatchSave` 请求体
   - 调用 `block_service.batch_save_blocks`
   - 返回 `BlocksBatchResponse`
7. `POST /api/documents/{document_id}/blocks` — 创建单个 block
   - 接收 `BlockCreate` 请求体
   - 调用 `block_service.create_block`
   - 返回 `BlockResponse`

### 步骤 2.4：实现 Block API 路由

**指令：**

创建 `backend/app/routers/blocks.py`，实现 block 管理的 REST API。要求：

1. `PATCH /api/blocks/{block_id}` — 更新 block
   - 接收 `BlockUpdate` 请求体
   - 调用 `block_service.update_block`
2. `DELETE /api/blocks/{block_id}` — 删除 block
   - 调用 `block_service.delete_block`

### 步骤 2.5：编写文档 API 测试

**指令：**

创建 `backend/tests/test_documents.py` 和 `backend/tests/test_blocks.py`，使用 `pytest` + `httpx` 编写接口测试。要求：

1. 测试文档的 CRUD 完整流程
2. 测试文档树的正确构建
3. 测试 block 的创建、更新、删除
4. 测试批量保存 blocks
5. 测试文档嵌套和路径计算
6. 测试软删除行为

---

## 阶段 3：前端与后端对接（替换 Mock 数据）

### 步骤 3.1：创建前端 API 封装层与 block_type 映射

**指令：**

在 `frontend/src/lib/` 下创建 API 请求封装和 block_type 映射。要求：

1. 创建 `frontend/src/lib/blockTypeMapping.ts`，维护前后端 block_type 映射：
   - `toBackendBlockType(frontendType)` — 前端转后端（如 `h1` → `heading_1`）
   - `toFrontendBlockType(backendType)` — 后端转前端（如 `heading_1` → `h1`）
   - 映射关系：`h1↔heading_1`, `h2↔heading_2`, `h3↔heading_3`, `text↔paragraph`, `bullet↔bullet_list`, `numbered↔numbered_list`, `doclink↔link_to_document`, `chart3d↔chart_3d`, `ai-answer↔ai_answer`
   - 其余类型前后端一致（`todo`, `table`, `quote`, `divider`, `code`, `whiteboard`, `image`, `file`, `audio`, `video`）
2. 创建 `frontend/src/lib/api.ts`，封装 `fetch` 请求：
   - 基础 URL 从环境变量 `NEXT_PUBLIC_API_URL` 读取
   - 统一处理 JSON 请求/响应
   - 统一错误处理（网络错误、HTTP 错误、业务错误）
   - 支持 GET、POST、PATCH、PUT、DELETE 方法
   - **发送请求时自动调用 `toBackendBlockType()` 转换 block_type**
   - **接收响应时自动调用 `toFrontendBlockType()` 转换 block_type**
3. 创建以下 API 函数：
   - `documentsAPI.create(data)` — 创建文档
   - `documentsAPI.getTree()` — 获取文档树
   - `documentsAPI.getDetail(docId)` — 获取文档详情
   - `documentsAPI.update(docId, data)` — 更新文档
   - `documentsAPI.delete(docId)` — 删除文档
   - `documentsAPI.batchSaveBlocks(docId, blocks)` — 批量保存 blocks
   - `documentsAPI.createBlock(docId, data)` — 创建 block
   - `blocksAPI.update(blockId, data)` — 更新 block
   - `blocksAPI.delete(blockId)` — 删除 block
4. 所有 API 函数返回 `Promise`，错误时抛出统一的错误对象。

### 步骤 3.2：替换 documentStore 中的 Mock 数据

**指令：**

修改 `frontend/src/stores/documentStore.ts`，将所有使用 mock 数据的操作替换为真实的 API 调用。要求：

1. `loadDocument` 改为异步函数：
   - 调用 `documentsAPI.getDetail(docId)` 获取文档详情
   - 将返回的 blocks 数据设置到 store
   - 处理加载状态和错误状态
2. 新增 `loadTree` 函数：
   - 调用 `documentsAPI.getTree()` 获取文档树
   - 更新 store 中的 `tree` 数据
3. `updateBlock` 改为异步函数：
   - 先更新本地 store（乐观更新）
   - 然后调用 `blocksAPI.update(blockId, data)` 同步到后端
   - 如果后端失败，回滚本地状态
4. `insertBlock` / `addBlockFromSlash` 改为异步：
   - 调用 `documentsAPI.createBlock(docId, data)` 创建 block
   - 使用后端返回的 block id 替换本地临时 id
5. `removeBlock` 改为异步：
   - 先更新本地 store（乐观更新）
   - 调用 `blocksAPI.delete(blockId)` 同步到后端
6. `moveBlock` / `duplicateBlock` 改为异步：
   - 操作完成后调用 `documentsAPI.batchSaveBlocks` 同步排序
7. `addNewRootDoc` / `addChildNode` 改为异步：
   - 调用 `documentsAPI.create` 创建文档
   - 使用后端返回的数据更新树
8. 新增 `saveDocument` 函数：
   - 将当前文档的所有 blocks 批量保存到后端
   - 用于自动保存或手动保存触发
9. 新增自动保存机制：
   - 使用 debounce，在用户停止编辑 2 秒后自动触发保存
   - 在 store 中维护 `isSaving` 和 `lastSavedAt` 状态

### 步骤 3.3：修改文档树组件对接后端

**指令：**

修改 `frontend/src/components/sidebar/DocumentTree.tsx`，使其从后端加载文档树。要求：

1. 组件挂载时调用 `loadTree` 加载文档树
2. 点击文档节点时，使用 Next.js 路由跳转到 `/documents/[docId]`
3. 新建文档时，调用后端 API 创建后刷新树
4. 删除文档时，调用后端 API 删除后刷新树
5. 添加加载状态和空状态展示

### 步骤 3.4：创建文档页面路由

**指令：**

在前端创建动态路由页面，使每个文档有独立的 URL。要求：

1. 创建 `frontend/src/app/documents/[docId]/page.tsx`：
   - 从 URL 参数获取 `docId`
   - 调用 `loadDocument(docId)` 加载文档
   - 渲染 `DocumentEditor` 组件
2. 修改 `frontend/src/app/page.tsx`：
   - 首页加载文档树
   - 自动跳转到第一个文档，或显示"创建第一个文档"引导
3. 修改 `frontend/src/components/AppLayout.tsx`：
   - 使用 Next.js 的 `useRouter` 和 `usePathname` 管理当前文档
   - 文档树点击时使用路由跳转而非仅更新 store
4. 确保浏览器前进/后退按钮能正确导航

### 步骤 3.5：实现前端路由与 store 同步

**指令：**

确保前端路由状态和 Zustand store 状态保持同步。要求：

1. 当 URL 变化时（用户直接访问 URL、浏览器前进后退），自动加载对应文档
2. 当用户在文档树中切换文档时，更新 URL
3. 在 `appStore` 中维护 `activeDocId`，使其与 URL 中的 `docId` 同步
4. 处理文档不存在的情况（显示 404 或引导创建）

---

## 阶段 4：白板功能对接

### 步骤 4.1：实现白板后端 API

**指令：**

创建白板数据的后端存储和 API。要求：

1. 创建 `backend/app/services/whiteboard_service.py`：
   - `save_whiteboard(db, block_id, data_json, preview_image_url)` — 保存或更新白板数据
   - `get_whiteboard(db, block_id)` — 获取白板数据
   - 如果 block_id 对应的白板数据不存在则创建，已存在则更新
2. 在 `backend/app/routers/blocks.py` 中添加白板相关路由：
   - `PUT /api/blocks/{block_id}/whiteboard` — 保存白板数据
   - `GET /api/blocks/{block_id}/whiteboard` — 获取白板数据

### 步骤 4.2：前端白板实现与后端对接

**指令：**

前端白板块（`WhiteboardBlock.tsx`）目前只有基础 UI 结构，需要实现完整的白板功能并对接后端。要求：

1. 使用原生 Canvas API 实现简单白板（与 UI 原型 `proto-index.html` 一致），**不使用第三方白板库**：
   - 画笔工具（pen）：鼠标按下并拖动时绘制黑色线条（线宽 2）
   - 橡皮工具（eraser）：鼠标按下并拖动时以白色覆盖（线宽 20）
   - 撤销：弹出最后一个路径到 redo 栈
   - 重做：从 redo 栈恢复路径
   - 点阵背景：使用 `radial-gradient(circle, #e5e5e5 1px, transparent 1px)`，size 20px
2. 白板数据格式为路径数组：
   ```json
   [
     { "tool": "pen", "pts": [{"x": 10, "y": 20}, {"x": 15, "y": 25}] },
     { "tool": "eraser", "pts": [{"x": 50, "y": 60}] }
   ]
   ```
3. 修改 `frontend/src/components/editor/blocks/WhiteboardBlock.tsx`：
   - 实现 Canvas 绘图逻辑
   - 组件挂载时从后端加载白板数据（如果 block 有关联的白板数据）
   - 用户绘制停止后（debounce 3 秒），自动保存路径数组 JSON 到后端
   - 保存时调用 `PUT /api/blocks/{block_id}/whiteboard`
4. 添加保存状态指示（保存中/已保存/保存失败）
5. 支持展开/收起模式（展开时以全屏 overlay 显示更大的白板）
6. 支持拖拽调整白板高度（200-800px，底部拖拽手柄）

---

## 阶段 5：代码执行功能

### 步骤 5.1：实现前端 Pyodide 代码执行

**指令：**

在前端集成 Pyodide 实现 Python 代码执行。要求：

1. 安装 Pyodide：在 `frontend/` 下执行 `npm install pyodide`
2. 创建 `frontend/src/lib/codeRunner.ts`：
   - 封装 Pyodide 的加载和初始化
   - 提供 `runPythonCode(code: string): Promise<CodeExecutionResult>` 函数
   - 捕获 stdout、stderr
   - 设置超时限制（默认 5 秒）
   - 返回执行结果（status, stdout, stderr, executionTimeMs）
   - 处理 Pyodide 加载失败的情况
3. 在 `frontend/src/stores/documentStore.ts` 或独立的 store 中管理代码执行状态：
   - 封装代码执行的状态管理
   - 提供 `execute(code)` 函数
   - 管理执行状态（idle/running/success/error）
   - 管理输出结果

### 步骤 5.2：集成代码编辑器并对接执行功能

**指令：**

`CodeBlock.tsx` 目前只有基础 UI 结构，需要集成真实的代码编辑器库并对接执行功能。要求：

1. 安装并集成 Monaco Editor 或 CodeMirror 作为代码编辑器：
   - 如果使用 Monaco Editor：`npm install @monaco-editor/react`
   - 如果使用 CodeMirror：`npm install @codemirror/lang-python @codemirror/theme-one-dark codemirror @codemirror/view`
   - 配置 Python 语法高亮
   - 配置基础的代码补全
2. 添加"运行"按钮，点击后调用 `useCodeExecution` 执行代码
3. 在代码块下方展示执行结果：
   - stdout 输出（绿色文本）
   - stderr 错误信息（红色文本）
   - 执行时间
4. 执行中显示 loading 状态
5. 代码变更时重置执行状态

### 步骤 5.3：实现代码执行结果保存

**指令：**

将代码执行结果持久化。要求：

1. 创建后端代码执行记录 API：
   - 创建 `backend/app/routers/code_execution.py`
   - `POST /api/code-executions` — 保存代码执行记录
   - `GET /api/code-executions/{execution_id}` — 获取执行记录
   - `GET /api/blocks/{block_id}/code-executions` — 获取 block 的执行历史
2. 创建 `backend/app/services/code_execution_service.py`：
   - `save_execution(db, block_id, document_id, data)` — 保存执行记录
   - `get_execution_history(db, block_id)` — 获取执行历史
3. 前端代码执行成功后，将结果同步保存到后端
4. CodeBlock 组件加载时，从后端获取最近一次执行结果展示

---

## 阶段 6：3D 图表功能

### 步骤 6.1：实现 3D 图表后端 API

**指令：**

创建 3D 图表的后端存储和 API。要求：

1. 创建 `backend/app/services/chart_service.py`：
   - `create_chart(db, document_id, data)` — 创建图表记录
   - `get_chart(db, chart_id)` — 获取图表数据
   - `update_chart(db, chart_id, data)` — 更新图表
   - `generate_chart_from_table(table_data)` — 从表格数据生成图表配置
   - `generate_chart_from_code_output(output_data)` — 从代码输出生成图表配置
2. 创建 `backend/app/routers/charts.py`：
   - `POST /api/charts/3d` — 创建 3D 图表
   - `GET /api/charts/{chart_id}` — 获取图表
   - `PATCH /api/charts/{chart_id}` — 更新图表

### 步骤 6.2：集成 3D 图表库并实现完整功能

**指令：**

`Chart3DBlock.tsx` 目前只有基础 UI 结构，需要集成真实的 3D 图表库并实现完整功能。要求：

1. 安装图表库（选择其一）：
   - `npm install plotly.js-dist-min react-plotly.js`（推荐，3D 支持好）
   - 或 `npm install echarts echarts-gl`
2. 实现 3D 图表渲染：
   - 支持 3D 柱状图
   - 支持鼠标旋转、缩放、平移
   - 支持 tooltip 显示数据详情
3. 实现数据编辑面板：
   - 创建 `frontend/src/components/chart/ChartDataEditor.tsx`
   - 支持手动输入 X/Y/Z 轴数据
   - 支持从当前文档的表格 block 导入数据
   - 支持从代码块输出导入数据
4. 图表数据变更后自动保存到后端
5. 图表配置 JSON 保存到 block 的 content 中

### 步骤 6.3：实现从表格/代码导入数据到图表

**指令：**

实现数据从其他 block 流转到 3D 图表的功能。要求：

1. 在 Chart3DBlock 的数据编辑面板中添加"导入数据"按钮
2. 支持从表格 block 导入：
   - 弹出文档内所有表格 block 的列表
   - 用户选择一个表格后，自动解析表头和数据行
   - 映射到图表的 X/Y/Z 轴
3. 支持从代码输出导入：
   - 弹出文档内所有已执行的代码 block 的列表
   - 解析代码输出中的 JSON/CSV 数据
   - 映射到图表
4. 导入后允许用户微调数据映射

---

## 阶段 7：AI 对话功能

### 步骤 7.1：实现 AI Service 层

**指令：**

创建 `backend/app/services/ai_service.py`，封装 LLM 调用逻辑。要求：

1. 创建 `AIService` 类：
   - 初始化时加载 LLM 配置（API Key、Base URL、Model）
   - 使用 `httpx.AsyncClient` 发送请求
2. `chat(session_id, message, context=None) -> dict`：
   - 构造 prompt（system prompt + knowledge context + user message）
   - 调用 GLM-5.1 API
   - 解析返回的 JSON 格式响应
   - 返回 `{ answer, references, confidence }`
3. `stream_chat(session_id, message, context=None)`：
   - 支持流式输出（SSE）
   - 使用 `StreamingResponse` 返回
4. prompt 构造逻辑：
   - 普通对话：仅使用 system prompt + user message
   - 文档问答：system prompt + knowledge context + user message
   - system prompt 从 `backend/app/prompts/` 目录加载模板文件
5. 错误处理：
   - API 调用超时
   - API 返回错误
   - 响应解析失败
   - 所有错误记录到 SystemLog

### 步骤 7.2：创建 Prompt 模板文件

**指令：**

在 `backend/app/prompts/` 目录下创建 prompt 模板文件。要求：

1. `document_qa_system.txt` — 文档问答的 system prompt：
   - 角色定义：AI 原生文档助手
   - 行为规则：优先基于文档内容回答，不足时明确说明，不编造信息
   - 输出格式要求：JSON 格式，包含 answer、confidence、reason、references
   - 引用格式说明
2. `document_summary_system.txt` — 文档摘要的 system prompt
3. `rewrite_system.txt` — 内容改写的 system prompt
4. `chart_generation_system.txt` — 图表生成建议的 system prompt
5. `code_explain_system.txt` — 代码解释的 system prompt
6. `general_chat_system.txt` — 普通对话的 system prompt

### 步骤 7.3：实现 AI 路由

**指令：**

创建 `backend/app/routers/ai.py`，实现 AI 对话的 API。要求：

1. `POST /api/ai/chat` — 普通 AI 对话：
   - 接收 `AIChatRequest`
   - 调用 `ai_service.chat`
   - 保存 `AIMessage` 到数据库
   - 返回 `AIResponse`
2. `POST /api/ai/document-qa` — 基于文档问答：
   - 接收 `AIDocumentQARequest`
   - 调用 RAG 检索获取相关 block（先创建占位函数，后续步骤实现 RAG）
   - 构造 knowledge context
   - 调用 `ai_service.chat` 带 context
   - 保存消息和引用
   - 返回 `AIResponse`
3. `GET /api/ai/sessions/{session_id}/messages` — 获取对话历史
4. `POST /api/ai/sessions` — 创建对话会话
5. 支持 SSE 流式响应（可选，优先级较低）

### 步骤 7.4：前端 AI 侧边栏对接后端

**指令：**

修改 `frontend/src/components/sidebar/AIAssistantPanel.tsx`，对接后端 AI API。要求：

1. 修改 `frontend/src/stores/aiChatStore.ts`：
   - 发送消息时调用后端 `POST /api/ai/chat` 或 `POST /api/ai/document-qa`
   - 根据用户选择的 scope 决定调用哪个接口
   - 保存对话历史到后端
   - 管理 session_id
2. 修改 AIAssistantPanel 组件：
   - 添加 scope 选择器（当前文档 / 文档树 / 全工作区）
   - 发送消息时附带当前 document_id 和 scope
   - 展示 AI 回答中的引用来源
   - 点击引用来源可以跳转到对应的 block
   - 添加 loading 状态（AI 思考中）
   - 支持多轮对话
3. 实现"基于选中 block 提问"功能：
   - 用户在编辑器中选中某个 block
   - 在 AI 侧边栏中自动附加上下文
   - AI 可以解释代码、分析图表、改写文本

---

## 阶段 8：AI 文档问答（前端直接提取上下文）

> **方案说明**：采用**前端直接提取上下文**方案。用户拖拽 block 或文档到 AI 聊天框时，
> 前端直接从本地 Zustand store 中读取 block 内容，转换为文本后拼接到用户消息中发送给后端。
> 后端无需查找 block，统一走普通对话接口即可。
>
> **核心优势**：简单可靠，避免了后端 block 查找的时序问题（block 可能尚未保存到数据库）。
>
> RAG（向量检索 + BM25）作为未来备选方案，相关后端服务代码已预建但当前不启用。

### 步骤 8.1：前端 Block 文本提取与上下文构建

**指令：**

修改 `frontend/src/stores/aiChatStore.ts`，实现前端直接从本地 store 提取 block 内容。要求：

1. 创建 `blockToText(block)` 函数，将 block 内容转为可读文本：
   - `h1` / `h2` / `h3` / `text` / `quote`：返回 `content.text`
   - `bullet` / `numbered`：返回 `- item` 格式列表
   - `todo`：返回 `[x]` / `[ ]` 格式列表
   - `table`：返回管道分隔格式（headers | rows）
   - `code`：返回 `content.code`
   - 其他类型返回 `content.text` 或 JSON.stringify
2. 创建 `buildAttachmentContext(attachments)` 函数：
   - 从 `useDocumentStore.getState().blocks` 直接读取 block 数据
   - 遍历 attachments，对 `kind === 'block'` 的附件调用 `blockToText`
   - 用 `\n---\n` 分隔多个 block 的文本
3. 修改 `sendMessage` 函数：
   - 调用 `buildAttachmentContext` 提取附件内容
   - 如果有附件内容，拼接为 `以下是引用的内容：\n---\n{内容}\n---\n\n用户问题：{问题}`
   - 统一调用 `aiAPI.chat()` 发送（不再调用 `documentQA`）
   - 移除之前的 scope 判断逻辑

### 步骤 8.2：更新后端 Prompt 以识别内联引用

**指令：**

修改 `backend/app/prompts/general_chat_system.txt`，使 AI 能识别消息中的内联引用内容。要求：

1. 在"信息来源"部分添加：
   - 如果用户消息中包含"以下是引用的内容"，说明用户拖拽了文档内容到聊天框
   - AI 应基于这些内容来回答问题
2. 在"行为规则"部分添加：
   - 如果用户消息中包含引用内容，直接基于引用内容回答，不要说"我无法找到"

### 步骤 8.3：后端辅助优化

**指令：**

对后端 AI 模块进行辅助优化。要求：

1. `backend/app/schemas/ai.py`：`AIDocumentQARequest.document_id` 改为可选字段
2. `backend/app/routers/ai.py`：为上下文构建添加调试日志（logger.info/warning）
3. `frontend/src/lib/api.ts`：`documentQA` 的 `documentId` 参数改为可选

### 步骤 8.4：后端 Block 文本转换工具（辅助）

**指令：**

创建 `backend/app/utils/block_text_converter.py`，为后端其他模块提供 block 文本转换。当前阶段主要用于 `document-qa` 接口的默认上下文构建。

---

## 阶段 9：文件存储与多媒体模块

### 步骤 9.0：实现音频/视频 Block 前端组件

**指令：**

由于音频（mp3）和视频（mp4）是新增的 block 类型，需要在前端实现对应的组件。要求：

1. 创建 `frontend/src/components/editor/blocks/AudioBlock.tsx`：
   - 使用 HTML5 `<audio>` 标签实现内联音频播放器
   - 支持播放/暂停、进度拖拽、音量控制
   - 显示音频文件名和时长
   - 如果 block 中没有关联文件，显示文件上传入口
   - 上传文件时调用 `POST /api/files/upload`，然后更新 block 的 content
   - content 结构：`{ file_id, file_name, file_url, duration }`
2. 创建 `frontend/src/components/editor/blocks/VideoBlock.tsx`：
   - 使用 HTML5 `<video>` 标签实现内联视频播放器
   - 支持播放/暂停、进度拖拽、音量控制、全屏切换
   - 显示视频封面图（poster）
   - 如果 block 中没有关联文件，显示文件上传入口
   - 上传文件时调用 `POST /api/files/upload`，然后更新 block 的 content
   - content 结构：`{ file_id, file_name, file_url, duration, poster_url }`
3. 在 `frontend/src/components/editor/blocks/index.ts` 中导出 AudioBlock 和 VideoBlock
4. 在 `frontend/src/components/editor/BlockRenderer.tsx` 中添加 `audio` 和 `video` 类型的渲染分支
5. 在 `frontend/src/lib/slash-command.ts` 的菜单项中添加"音频"和"视频"选项
6. 在 `frontend/src/stores/documentStore.ts` 的 `defaultBlockContent` 函数中添加 `audio` 和 `video` 的默认 content

**注意事项：**
- 音频和视频文件上传走统一的文件上传 API
- 文件大小限制：音频 50MB，视频 200MB（前端和后端都需要校验）
- 前端上传时显示进度条

### 步骤 9.1：实现文件存储 Service

**指令：**

创建 `backend/app/services/file_service.py`。要求：

1. 根据 `FILE_STORAGE_TYPE` 配置选择存储方式：
   - `local`：存储到 `LOCAL_STORAGE_PATH` 目录
   - `s3`：上传到 S3 兼容存储
   - `oss`：上传到阿里云 OSS
2. `upload_file(file, document_id, block_id=None) -> FileAsset`：
   - 生成唯一文件名
   - 保存文件到存储
   - 创建 FileAsset 数据库记录
   - 返回 FileAsset
3. `get_file_url(file_id) -> str`：
   - 获取文件访问 URL
   - 本地存储返回 API URL
   - S3/OSS 返回签名 URL
4. `delete_file(file_id)`：
   - 删除文件和数据库记录

### 步骤 9.2：实现文件 API 路由

**指令：**

创建 `backend/app/routers/files.py`。要求：

1. `POST /api/files/upload` — 上传文件
   - 接收 multipart/form-data
   - 调用 `file_service.upload_file`
   - 文件大小限制：图片 10MB，音频 50MB，视频 200MB，其他文件 50MB
2. `GET /api/files/{file_id}` — 获取文件
   - 返回文件内容或重定向到文件 URL
3. `DELETE /api/files/{file_id}` — 删除文件

---

## 阶段 10：系统日志与管理

### 步骤 10.1：实现日志工具

**指令：**

创建 `backend/app/utils/logger.py`。要求：

1. 使用 `loguru` 配置日志：
   - 控制台输出（带颜色）
   - 文件输出（按日期轮转）
   - 日志等级从环境变量读取
2. 创建 `log_to_db(db, log_type, message, metadata=None)` 函数：
   - 将关键操作记录到 `system_logs` 表
   - 记录 AI 调用、RAG 检索、代码执行、文档更新、错误等
3. 创建装饰器 `@log_operation(log_type)` 用于自动记录函数调用

### 步骤 10.2：实现系统管理 API

**指令：**

创建 `backend/app/routers/system.py`。要求：

1. `GET /api/system/status` — 系统状态：
   - 数据库连接状态
   - AI 服务可用性
   - 存储服务可用性
   - 文档/block 数量统计
2. `GET /api/system/logs` — 查看系统日志：
   - 支持按类型筛选
   - 支持分页
3. `POST /api/system/init` — 初始化系统：
   - 创建默认文档空间的初始文档
   - 建立初始 RAG 索引

---

## 阶段 11：前端 AI 能力增强

### 步骤 11.1：实现 Block 级别 AI 交互

**指令：**

在前端 block 组件中集成 AI 能力。要求：

1. 修改各 block 组件，添加右键菜单或工具栏 AI 按钮：
   - 代码块：添加"AI 解释代码"按钮
   - 表格块：添加"AI 分析数据"按钮
   - 3D 图表块：添加"AI 解读图表"按钮
   - 文本块：选中文本后添加"AI 改写"按钮
2. 点击 AI 按钮后：
   - 将 block 内容作为上下文发送到 AI 侧边栏
   - 自动构造问题（如"解释这段代码"、"分析这个表格"）
   - AI 回答以 `ai-answer` block 形式插入到原 block 下方
3. 创建 `frontend/src/lib/rag.ts`：
   - 封装 RAG 相关的 API 调用
   - `searchRelevantBlocks(query, scope, docId)` — 检索相关 block
   - `triggerReindex(docId)` — 触发重建索引

### 步骤 11.2：实现引用跳转功能

**指令：**

在 AI 回答中实现引用来源的跳转。要求：

1. AI 回答中的引用来源显示为可点击的链接
2. 点击引用后：
   - 如果引用的 block 在当前文档，滚动到该 block 并高亮
   - 如果引用的 block 在其他文档，跳转到该文档并定位到 block
3. 在 `DocumentEditor` 中实现 `scrollToBlock(blockId)` 函数
4. 引用高亮效果持续 3 秒后消失

### 步骤 11.3：实现 AI 回答 Block

**指令：**

完善 `frontend/src/components/editor/blocks/AIAnswerBlock.tsx`。要求：

1. 展示 AI 回答的格式化文本（支持 Markdown 渲染）
2. 展示引用来源列表
3. 添加"插入到文档"按钮，将 AI 回答转为普通文本 block
4. 添加"继续提问"按钮，在 AI 侧边栏中继续对话

---

## 阶段 12：Docker 部署配置

### 步骤 12.1：创建后端 Dockerfile

**指令：**

创建 `backend/Dockerfile`。要求：

1. 基于 `ghcr.io/astral-sh/uv:python3.11-slim` 或 `python:3.11-slim` + 手动安装 uv
2. 安装系统依赖（如 libpq 用于 PostgreSQL 连接）
3. 复制 `pyproject.toml` 和 `uv.lock`（如存在）
4. 执行 `uv sync --no-dev` 安装生产依赖
5. 复制应用代码
6. 暴露 8000 端口
7. 启动命令：`uv run uvicorn app.main:app --host 0.0.0.0 --port 8000`

### 步骤 12.2：创建 docker-compose.yml

**指令：**

在项目根目录创建 `docker-compose.yml`。要求：

1. 服务定义：
   - `frontend`：基于 frontend/Dockerfile 或直接使用 Node 镜像
   - `backend`：基于 backend/Dockerfile
   - `postgres`：使用 `pgvector/pgvector:pg16` 镜像（内置 pgvector 扩展）
   - `redis`（可选）：使用 `redis:7-alpine`
2. 网络配置：所有服务在同一网络中
3. 数据卷：PostgreSQL 数据持久化
4. 环境变量：从 `.env` 文件读取
5. 端口映射：前端 3000，后端 8000，PostgreSQL 5432

### 步骤 12.3：创建前端 Dockerfile（可选）

**指令：**

创建 `frontend/Dockerfile`。要求：

1. 多阶段构建：
   - Stage 1：安装依赖并构建
   - Stage 2：使用 `node:20-alpine` 运行
2. 暴露 3000 端口
3. 启动命令：`npm start`

---

## 阶段 13：集成测试与 Demo 准备

### 步骤 13.1：编写端到端测试场景

**指令：**

编写完整的端到端测试脚本（可以是 Python 脚本或文档形式的测试用例）。要求覆盖以下场景：

1. **文档管理**：
   - 创建文档 → 验证文档树更新
   - 创建子文档 → 验证嵌套关系和路径
   - 编辑文档标题 → 验证标题和路径更新
   - 删除文档 → 验证软删除和子文档级联
2. **Block 编辑**：
   - 创建各类 block → 验证保存
   - 编辑 block 内容 → 验证更新
   - 拖拽排序 block → 验证顺序
   - 删除 block → 验证删除
3. **代码执行**：
   - 创建 Python 代码块 → 写入代码 → 运行 → 验证输出
4. **3D 图表**：
   - 手动输入数据 → 创建图表 → 验证渲染
   - 从表格导入数据 → 创建图表
5. **白板**：
   - 创建白板块 → 绘制内容 → 保存 → 重新加载验证
6. **音频/视频**：
   - 创建音频块 → 上传 mp3 文件 → 验证内联播放
   - 创建视频块 → 上传 mp4 文件 → 验证内联播放和全屏
   - 验证文件大小限制和错误处理
7. **AI 对话**：
   - 普通对话 → 验证 AI 回答
   - 基于当前文档提问 → 验证引用来源
   - 基于文档树提问 → 验证跨文档检索
7. **RAG 检索**：
   - 索引文档 → 搜索关键词 → 验证召回
   - 语义搜索 → 验证语义匹配

### 步骤 13.2：准备 Demo 种子数据

**指令：**

创建 `backend/scripts/seed_data.py`，准备演示用的初始数据。要求：

1. 创建示例文档树：
   ```
   项目总览
   ├── 产品设计
   │   ├── 用户需求
   │   ├── 功能模块
   │   └── Demo 剧本
   └── 技术实现
       ├── 前端架构
       ├── 后端架构
       └── AI 逻辑
   ```
2. 每个文档中填充示例 block：
   - 标题、段落、列表等基础内容
   - 至少一个代码块（带示例 Python 代码）
   - 至少一个表格块（带示例数据）
   - 至少一个 3D 图表块（带示例数据）
   - 至少一个音频块和一个视频块（可使用示例文件或占位数据）
   - 文档间的交叉引用链接
3. 为所有文档建立 RAG 索引
4. 准备一个 Demo 剧本文档，引导用户逐步体验各功能

### 步骤 13.3：创建项目 README

**指令：**

在项目根目录创建 `README.md`。要求：

1. 项目简介
2. 技术栈说明
3. 快速开始：
   - 环境要求
   - 安装步骤
   - 启动命令（Docker 方式和手动方式）
4. 功能说明
5. 项目结构说明
6. API 文档链接（指向 FastAPI 自动生成的 /docs）
7. 开发指南

---

## 执行顺序建议

```
阶段 0  ─→  阶段 1  ─→  阶段 2  ─→  阶段 3
  │                                    │
  │                                    ▼
  │                              阶段 4（白板）
  │                                    │
  │                                    ▼
  │                              阶段 5（代码执行）
  │                                    │
  │                                    ▼
  │                              阶段 6（3D 图表）
  │                                    │
  ▼                                    ▼
阶段 9（文件存储）  ←──  阶段 7（AI 对话）
                           │
                           ▼
                     阶段 8（RAG 系统）
                           │
                           ▼
                     阶段 10（日志管理）
                           │
                           ▼
                     阶段 11（AI 增强）
                           │
                           ▼
                     阶段 12（Docker 部署）
                           │
                           ▼
                     阶段 13（测试与 Demo）
```

**关键路径：** 阶段 0 → 1 → 2 → 3 → 7 → 8 → 13

**可并行的阶段：**
- 阶段 4（白板）、阶段 5（代码执行）、阶段 6（3D 图表）可以在阶段 3 完成后并行开发
- 阶段 9（文件存储）可以在任意时间点开发
- 阶段 12（Docker）可以在阶段 2 完成后就开始准备

