# AIDoc 开发进度

## 阶段 0：项目基础设施搭建 ✅

**完成时间**: 2026-05-15

### 步骤 0.1：初始化后端项目结构 ✅

**修改的文件**:
- `backend/pyproject.toml` - 项目配置和依赖列表
- `backend/.env.example` - 环境变量模板
- `backend/.env` - 本地开发环境变量

**完成内容**:
- 使用 `uv init` 初始化 Python 项目
- 添加了所有必需依赖：fastapi, uvicorn, sqlalchemy, asyncpg, pydantic, pydantic-settings, python-dotenv, loguru, httpx, pgvector, python-multipart
- 添加了测试依赖：pytest, pytest-asyncio, httpx
- 创建了完整的环境变量配置文件

### 步骤 0.2：搭建后端基础框架 ✅

**修改的文件**:
- `backend/app/__init__.py` - 包初始化文件
- `backend/app/config.py` - 使用 pydantic-settings 的配置模块
- `backend/app/database.py` - 异步 SQLAlchemy 引擎和会话工厂
- `backend/app/dependencies.py` - FastAPI 依赖注入函数
- `backend/app/main.py` - FastAPI 应用主模块

**完成内容**:
- 创建了完整的 FastAPI 应用骨架
- 配置了 CORS 中间件（允许前端跨域）
- 实现了健康检查接口 `GET /api/health`
- 配置了 loguru 日志系统
- 实现了数据库初始化逻辑

### 步骤 0.3：配置 PostgreSQL 数据库 ✅

**修改的文件**:
- `backend/scripts/init_db.py` - 数据库初始化脚本
- `backend/scripts/seed_data.py` - 种子数据脚本
- `backend/README.md` - 安装和使用说明

**完成内容**:
- 创建了数据库初始化脚本（自动创建数据库、启用 pgvector、创建表）
- 创建了种子数据脚本（插入示例文档树和 block 数据）
- 编写了详细的安装和使用文档

### 步骤 0.4：前端环境补充配置 ✅

**修改的文件**:
- `frontend/.env.local` - 前端环境变量
- `frontend/src/lib/api.ts` - API 请求封装模块

**完成内容**:
- 创建了前端环境变量文件（配置后端 API 地址）
- 创建了完整的 API 封装模块，包括：
  - 统一的错误处理
  - HTTP 方法封装（GET, POST, PUT, PATCH, DELETE）
  - 文档 API 函数（create, getTree, getDetail, update, delete, batchSaveBlocks, createBlock）
  - Block API 函数（update, delete）
  - TypeScript 类型定义

## 如何测试阶段 0

### 1. 测试后端服务

```bash
# 进入 backend 目录
cd backend

# 安装依赖
uv sync

# 启动服务
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问以下地址验证：
- http://localhost:8000 - 根路径，返回欢迎信息
- http://localhost:8000/docs - Swagger API 文档
- http://localhost:8000/api/health - 健康检查接口

### 2. 测试数据库初始化

```bash
# 确保 PostgreSQL 已安装并启动

# 运行数据库初始化脚本
uv run python scripts/init_db.py
```

验证：
- 数据库 `aidoc` 已创建
- pgvector 扩展已启用
- 数据表已创建
- 种子数据已插入

### 3. 测试前端 API 封装

```bash
# 进入 frontend 目录
cd frontend

# 启动开发服务器
npm run dev
```

在浏览器中打开 http://localhost:3000，打开开发者工具 Network 面板，验证前端能否正确调用后端 API。

## 阶段 1：数据库模型与 ORM 定义 ✅

**完成时间**: 2026-05-15

### 步骤 1.1：定义核心 ORM 模型 ✅

**修改的文件**:
- `backend/app/models/__init__.py` - 模型导出文件
- `backend/app/models/document.py` - Document 模型
- `backend/app/models/document_block.py` - DocumentBlock 模型
- `backend/app/models/whiteboard_data.py` - WhiteboardData 模型
- `backend/app/models/chart_3d.py` - Chart3D 模型
- `backend/app/models/ai_chat.py` - AIChatSession 模型
- `backend/app/models/ai_message.py` - AIMessage 模型
- `backend/app/models/knowledge_chunk.py` - KnowledgeChunk 模型
- `backend/app/models/document_summary.py` - DocumentSummary 模型
- `backend/app/models/code_execution.py` - CodeExecution 模型
- `backend/app/models/file_asset.py` - FileAsset 模型
- `backend/app/models/system_log.py` - SystemLog 模型
- `backend/app/database.py` - 更新以启用模型导入和表创建

**完成内容**:
- 创建了 11 个 ORM 模型，使用 SQLAlchemy 2.0 风格的 `Mapped` 类型注解
- 所有模型使用 UUID 作为主键
- 定义了模型之间的关系（外键、一对多、自引用等）
- KnowledgeChunk 模型包含 pgvector 的 Vector(1024) 类型用于 embedding 存储
- 更新了 database.py 以启用模型导入和自动建表

### 步骤 1.2：定义 Pydantic Schema ✅

**修改的文件**:
- `backend/app/schemas/__init__.py` - Schema 导出文件
- `backend/app/schemas/document.py` - 文档相关 Schema
- `backend/app/schemas/block.py` - Block 相关 Schema
- `backend/app/schemas/whiteboard.py` - 白板相关 Schema
- `backend/app/schemas/ai.py` - AI 对话相关 Schema
- `backend/app/schemas/rag.py` - RAG 检索相关 Schema
- `backend/app/schemas/code_execution.py` - 代码执行相关 Schema
- `backend/app/schemas/chart.py` - 3D 图表相关 Schema
- `backend/app/schemas/file.py` - 文件上传相关 Schema
- `backend/app/schemas/system.py` - 系统状态相关 Schema

**完成内容**:
- 创建了完整的请求和响应 Pydantic 模型
- 所有 Schema 使用 `model_config = ConfigDict(from_attributes=True)` 支持 ORM 模型转换
- 定义了枚举类型（BlockType, ExecutionStatus, ChartSourceType, AIScope）
- 使用 `Field` 添加字段描述和默认值

## 如何测试阶段 1

### 1. 验证模型导入

```bash
cd backend
uv run python -c "from app.models import Document, DocumentBlock, WhiteboardData, Chart3D, AIChatSession, AIMessage, KnowledgeChunk, DocumentSummary, CodeExecution, FileAsset, SystemLog; print('Models imported successfully')"
```

### 2. 验证 Schema 导入

```bash
uv run python -c "from app.schemas import DocumentCreate, DocumentUpdate, DocumentResponse, BlockCreate, BlockUpdate, BlockResponse; print('Schemas imported successfully')"
```

### 3. 测试数据库建表

```bash
# 确保 PostgreSQL 已安装并启动
# 运行数据库初始化脚本（会自动创建表）
uv run python scripts/init_db.py
```

验证：
- 所有数据表已创建（documents, document_blocks, whiteboard_data, chart_3d, ai_chat_sessions, ai_messages, knowledge_chunks, document_summaries, code_executions, file_assets, system_logs）
- 表结构包含正确的字段和约束

## 阶段 2：文档管理 API ✅

**完成时间**: 2026-05-15

### 步骤 2.1：实现文档 Service 层 ✅

**修改的文件**:
- `backend/app/services/__init__.py` - 包初始化文件
- `backend/app/services/document_service.py` - 文档管理核心业务逻辑

**完成内容**:
- `create_document` — 创建文档，自动计算 path 和 sort_order，验证父文档存在
- `get_document_tree` — 查询所有未删除文档，递归组装树状结构
- `get_document_detail` — 获取文档详情（包含 blocks 列表）
- `update_document` — 更新文档，title 变更时同步更新所有子文档 path
- `delete_document` — 软删除文档，级联软删除所有子文档
- `get_document_path` — 获取文档完整路径

### 步骤 2.2：实现 Block Service 层 ✅

**修改的文件**:
- `backend/app/services/block_service.py` - Block 管理核心业务逻辑

**完成内容**:
- `create_block` — 创建 block，验证文档存在和 block_type 合法
- `batch_save_blocks` — 批量保存 blocks（删除旧的，插入新的），使用事务确保原子性
- `update_block` — 更新 block 的 content 和/或 properties
- `delete_block` — 删除 block 及其关联的白板数据、图表数据
- `get_blocks_by_document` — 获取指定文档的所有 block

### 步骤 2.3：实现文档 API 路由 ✅

**修改的文件**:
- `backend/app/routers/__init__.py` - 包初始化文件
- `backend/app/routers/documents.py` - 文档管理 REST API

**完成内容**:
- `POST /api/documents` — 创建文档
- `GET /api/documents/tree` — 获取文档树
- `GET /api/documents/{document_id}` — 获取文档详情
- `PATCH /api/documents/{document_id}` — 更新文档
- `DELETE /api/documents/{document_id}` — 删除文档
- `PUT /api/documents/{document_id}/blocks` — 批量保存 blocks
- `POST /api/documents/{document_id}/blocks` — 创建单个 block

### 步骤 2.4：实现 Block API 路由 ✅

**修改的文件**:
- `backend/app/routers/blocks.py` - Block 管理 REST API

**完成内容**:
- `PATCH /api/blocks/{block_id}` — 更新 block
- `DELETE /api/blocks/{block_id}` — 删除 block

### 步骤 2.5：编写文档 API 测试 ✅

**修改的文件**:
- `backend/tests/__init__.py` - 包初始化文件
- `backend/tests/conftest.py` - 测试配置（SQLite 内存数据库、测试客户端）
- `backend/tests/test_documents.py` — 文档 API 测试（11 个用例）
- `backend/tests/test_blocks.py` — Block API 测试（7 个用例）

**完成内容**:
- 文档 CRUD 完整流程测试
- 文档树正确构建测试
- Block 创建、更新、删除测试
- 批量保存 blocks 测试
- 文档嵌套和路径计算测试
- 软删除行为测试（包括级联删除）
- Block 排序测试

**其他修改**:
- `backend/app/main.py` — 注册文档和 Block 路由
- `backend/pyproject.toml` — 添加 aiosqlite 测试依赖

## 如何测试阶段 2

### 1. 运行自动化测试

```bash
cd backend
uv run pytest tests/ -v
```

验证：18 个测试全部通过

### 2. 手动测试 API（需要 PostgreSQL）

```bash
# 确保 PostgreSQL 已启动并初始化数据库
uv run python scripts/init_db.py

# 启动服务
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问 http://localhost:8000/docs 使用 Swagger UI 测试以下接口：

1. **创建文档**: POST /api/documents — 发送 `{"title": "测试文档"}`
2. **获取文档树**: GET /api/documents/tree
3. **获取文档详情**: GET /api/documents/{id}
4. **更新文档**: PATCH /api/documents/{id} — 发送 `{"title": "新标题"}`
5. **删除文档**: DELETE /api/documents/{id}
6. **批量保存 blocks**: PUT /api/documents/{id}/blocks
7. **创建 block**: POST /api/documents/{id}/blocks
8. **更新 block**: PATCH /api/blocks/{id}
9. **删除 block**: DELETE /api/blocks/{id}

## 下一步

阶段 2 已完成，可以开始阶段 3：前端与后端对接（替换 Mock 数据）。
