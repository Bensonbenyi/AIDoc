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

## 下一步

阶段 1 已完成，可以开始阶段 2：文档管理 API。
