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

## 阶段 3：前端与后端对接（替换 Mock 数据） ✅

**完成时间**: 2026-05-15

### 步骤 3.1：创建前端 API 封装层与 block_type 映射 ✅

**修改的文件**:
- `frontend/src/lib/blockTypeMapping.ts` - 前后端 block_type 映射（新建）
- `frontend/src/lib/api.ts` - API 请求封装（重写）

**完成内容**:
- 创建了 block_type 映射文件：h1↔heading_1, text↔paragraph, bullet↔bullet_list 等
- api.ts 添加了 snake_case ↔ camelCase 自动转换
- api.ts 添加了 block_type 自动转换（发送时前端→后端，接收时后端→前端）
- API 类型接口改为 camelCase（与前端类型一致）

### 步骤 3.2：替换 documentStore 中的 Mock 数据 ✅

**修改的文件**:
- `frontend/src/stores/documentStore.ts` - 文档数据 store（重写）
- `frontend/src/components/editor/DocumentEditor.tsx` - 编辑器组件（更新）
- `frontend/src/components/editor/SlashCommandMenu.tsx` - 斜杠命令菜单（更新）

**完成内容**:
- `loadDocument` 改为异步，调用 `documentsAPI.getDetail()`
- 新增 `loadTree` 函数，调用 `documentsAPI.getTree()`
- `updateBlock` 改为乐观更新 + 自动保存
- `insertBlock` / `addBlockFromSlash` 改为异步，调用 `documentsAPI.createBlock()`
- `removeBlock` 改为乐观更新 + 异步删除
- `moveBlock` / `duplicateBlock` 改为异步 + 批量保存
- `addNewRootDoc` / `addChildNode` 改为异步，调用 `documentsAPI.create()`
- 新增 `saveDocument` 函数（批量保存 blocks）
- 新增自动保存机制（debounce 2 秒）
- 新增 `isSaving`, `lastSavedAt`, `isLoading`, `isTreeLoading` 状态
- DocumentEditor 添加加载状态和保存状态指示器
- SlashCommandMenu 和 DocumentEditor 适配 async addBlockFromSlash

### 步骤 3.3：修改文档树组件对接后端 ✅

**修改的文件**:
- `frontend/src/components/sidebar/DocumentTree.tsx` - 文档树组件（重写）

**完成内容**:
- 组件挂载时调用 `loadTree` 加载文档树
- 点击文档节点使用 `router.push` 跳转到 `/documents/[docId]`
- 新建文档时调用后端 API 创建后路由跳转
- 添加加载状态（Loader2 动画）和空状态展示

### 步骤 3.4：创建文档页面路由 ✅

**修改的文件**:
- `frontend/src/app/documents/[docId]/page.tsx` - 动态路由页面（新建）
- `frontend/src/app/page.tsx` - 首页（重写）

**完成内容**:
- 创建 `/documents/[docId]` 动态路由页面
- 使用 Next.js 15+ 的 `use(params)` 访问路由参数
- 页面加载时同步 URL docId 到 store
- 首页加载文档树后自动跳转到第一个文档
- 首页显示连接错误状态和重试按钮

### 步骤 3.5：实现前端路由与 store 同步 ✅

**完成内容**:
- URL → Store：DocumentPage 通过 useEffect 同步 URL docId 到 activeDocId
- Store → URL：DocumentTree 在创建文档后通过 router.push 更新 URL
- 浏览器前进/后退：URL 变化时 DocumentPage 自动同步 store
- 文档不存在时显示加载失败状态

## 如何测试阶段 3

### 1. 启动后端服务

```bash
cd backend
uv sync
uv run python scripts/init_db.py  # 初始化数据库和种子数据
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 启动前端服务

```bash
cd frontend
npm run dev
```

### 3. 验证功能

在浏览器中打开 http://localhost:3000：

1. **首页自动跳转**: 应自动跳转到第一个文档 `/documents/{id}`
2. **文档树加载**: 左侧文档树从后端加载，显示种子数据中的文档
3. **文档内容加载**: 编辑器从后端加载文档 blocks
4. **新建文档**: 点击"新建文档"按钮，创建后自动跳转到新文档
5. **新建子文档**: hover 文档节点，点击"+"按钮创建子文档
6. **编辑 blocks**: 编辑 block 内容，2 秒后自动保存到后端
7. **斜杠命令**: 输入 `/` 插入新 block，保存到后端
8. **拖拽排序**: 拖拽 block 重新排序，自动保存
9. **删除 block**: 删除 block，同步到后端
10. **浏览器前进后退**: 前进/后退按钮正确切换文档
11. **URL 直接访问**: 直接访问 `/documents/{id}` 能正确加载文档
12. **保存状态**: 右下角显示"保存中..."和"已保存"状态

### 4. 检查后端数据

通过 Swagger UI (http://localhost:8000/docs) 验证：
- GET /api/documents/tree — 文档树正确
- GET /api/documents/{id} — 文档详情包含 blocks
- blocks 的 block_type 使用后端格式（heading_1, paragraph 等）

## 阶段 4：白板功能对接 ✅

**完成时间**: 2026-05-15

### 步骤 4.1：实现白板后端 API ✅

**修改的文件**:
- `backend/app/services/whiteboard_service.py` - 白板数据 Service 层（新建）
- `backend/app/routers/blocks.py` - 添加白板相关 API 路由

**完成内容**:
- 创建了 `whiteboard_service.py`，实现白板数据的存储和获取逻辑：
  - `save_whiteboard` — 保存或更新白板数据，支持 upsert 操作
  - `get_whiteboard` — 获取指定 block 的白板数据
- 在 `blocks.py` 中添加了白板相关路由：
  - `PUT /api/blocks/{block_id}/whiteboard` — 保存白板数据
  - `GET /api/blocks/{block_id}/whiteboard` — 获取白板数据

### 步骤 4.2：前端白板集成与后端对接 ✅

**修改的文件**:
- `frontend/src/components/editor/blocks/WhiteboardBlock.tsx` - 重写白板组件
- `frontend/src/components/editor/BlockRenderer.tsx` - 更新以传递 blockId

**完成内容**:
- 使用原生 Canvas API 实现简单白板（与 UI 原型一致），不依赖第三方白板库
- 实现了画笔、橡皮、撤销、重做工具
- 白板数据格式为路径数组：`{ tool: 'pen'|'eraser', pts: {x,y}[] }[]`
- 使用点阵背景（radial-gradient）模拟原型白板效果
- 实现了从后端加载白板数据（通过 `GET /api/blocks/{block_id}/whiteboard`）
- 实现了自动保存机制（debounce 3 秒）
- 保存时调用 `PUT /api/blocks/{block_id}/whiteboard`
- 添加了保存状态指示器（保存中/已保存/保存失败）
- 支持展开/收起模式
- 支持拖拽调整白板高度（200-800px）
- 更新了 `BlockRenderer.tsx`，传递 `blockId` 给 `WhiteboardBlock`

### 步骤 4.3：后端白板 Schema 修复 ✅

**修改的文件**:
- `backend/app/schemas/whiteboard.py` - schema 类型修复
- `backend/app/services/whiteboard_service.py` - `data_json` 参数类型修复

**完成内容**:
- 将后端 schema 的 `data_json` 字段类型从 `dict` 改为 `Any`，接受任意 JSON 数据（包括数组）
- `whiteboard_service.py` 的 `save_whiteboard` 函数 `data_json` 参数类型从 `dict` 改为 `Any`
- 使用 `api.ts` 中的 `put` 和 `get` 函数进行请求，自动进行 snake_case ↔ camelCase 转换

## 如何测试阶段 4

### 1. 启动后端服务

```bash
cd backend
uv sync
uv run python scripts/init_db.py  # 初始化数据库和种子数据
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 启动前端服务

```bash
cd frontend
npm run dev
```

### 3. 验证白板功能

在浏览器中打开 http://localhost:3000：

1. **创建白板块**: 使用斜杠命令 `/` 选择"白板"，创建白板块
2. **画笔绘制**: 默认使用画笔工具，在白板上绘制线条
3. **橡皮擦**: 切换到橡皮工具，擦除已绘制的内容
4. **撤销/重做**: 点击撤销/重做按钮，或使用快捷操作
5. **自动保存**: 绘制停止 3 秒后，应自动保存到后端
6. **保存状态**: 白板块顶部显示保存状态图标（✓ 表示已保存）
7. **重新加载**: 刷新页面后，白板内容应从后端加载并恢复
8. **拖拽调整大小**: 鼠标悬停在白板底部，拖拽手柄出现，上下拖拽可调整高度
9. **展开模式**: 点击最大化按钮，白板应以更大的全屏模式显示
10. **收起模式**: 在展开模式下点击收起按钮，恢复内联显示

### 4. 检查后端数据

通过 Swagger UI (http://localhost:8000/docs) 验证：
- `PUT /api/blocks/{block_id}/whiteboard` — 保存白板数据
- `GET /api/blocks/{block_id}/whiteboard` — 获取白板数据
- 数据库 `whiteboard_data` 表中应有对应的记录

## 阶段 5：代码执行功能 ✅

**完成时间**: 2026-05-15

### 步骤 5.1：实现前端 Pyodide 代码执行 ✅

**修改的文件**:
- `frontend/src/lib/codeRunner.ts` - Pyodide 代码执行器（新建）
- `frontend/package.json` - 添加 pyodide 依赖

**完成内容**:
- 安装 pyodide npm 包
- 创建 `codeRunner.ts`，封装 Pyodide 的懒加载和 Python 代码执行
- 提供 `runPythonCode(code, timeoutMs)` 函数，返回 `CodeExecutionResult`（status, stdout, stderr, executionTimeMs）
- 支持 stdout/stderr 捕获
- 默认超时 5 秒，使用 Promise.race 实现
- 全局单例缓存 Pyodide 实例，避免重复加载
- 提供 `preloadPyodide()` 函数可选预加载
- 错误处理：Pyodide 加载失败、执行超时、Python 运行时错误

### 步骤 5.2：集成代码编辑器并对接执行功能 ✅

**修改的文件**:
- `frontend/src/components/editor/blocks/CodeBlock.tsx` - 重写代码块组件
- `frontend/src/types/block.ts` - CodeContent 类型添加 stderr 字段
- `frontend/package.json` - 添加 @monaco-editor/react 依赖

**完成内容**:
- 使用 Monaco Editor 替换原有 textarea，支持 Python 语法高亮
- Monaco Editor 使用 dynamic import 避免 SSR 问题
- 配置 Python 语法高亮、代码补全、行号显示
- 自动调整编辑器高度适应代码内容
- "运行"按钮调用真实 Pyodide 执行 Python 代码
- stdout 输出以绿色文本展示，stderr 以红色文本展示
- 执行时间显示
- 代码变更时自动重置执行状态
- 保留原有暗色主题（Catppuccin Mocha 风格）
- 支持 Tab 键插入 4 个空格
- 执行成功后自动保存执行记录到后端

### 步骤 5.3：实现代码执行结果保存 ✅

**修改的文件**:
- `backend/app/services/code_execution_service.py` - 代码执行 Service 层（新建）
- `backend/app/routers/code_execution.py` - 代码执行 API 路由（新建）
- `backend/app/main.py` - 注册代码执行路由
- `frontend/src/lib/api.ts` - 添加 codeExecutionAPI 函数

**完成内容**:
- 创建 `code_execution_service.py`，实现：
  - `save_execution` — 保存代码执行记录
  - `get_execution` — 获取单条执行记录
  - `get_execution_history` — 获取指定 block 的执行历史
- 创建 `code_execution.py` 路由：
  - `POST /api/code-executions` — 保存代码执行记录
  - `GET /api/code-executions/{execution_id}` — 获取执行记录
  - `GET /api/code-executions/by-block/{block_id}` — 获取 block 的执行历史
- 在 `main.py` 中注册代码执行路由
- 前端 `api.ts` 添加 `codeExecutionAPI`（save, get, getByBlock）
- CodeBlock 执行成功后异步保存记录到后端（不阻塞 UI）

## 如何测试阶段 5

### 1. 启动后端服务

```bash
cd backend
uv sync
uv run python scripts/init_db.py  # 初始化数据库和种子数据
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 启动前端服务

```bash
cd frontend
npm run dev
```

### 3. 验证代码执行功能

在浏览器中打开 http://localhost:3000：

1. **创建代码块**: 使用斜杠命令 `/` 选择"Python 代码块"
2. **Monaco Editor**: 代码块应显示 Monaco 编辑器，支持 Python 语法高亮
3. **运行代码**: 点击"运行"按钮，首次运行会加载 Pyodide（约 10MB，需等待几秒）
4. **查看输出**: stdout 以绿色显示，stderr 以红色显示
5. **执行时间**: 输出面板右上角显示执行耗时
6. **超时处理**: 运行 `import time; time.sleep(10)` 应在 5 秒后超时
7. **代码变更**: 修改代码后，执行状态自动重置为"就绪"
8. **自动保存**: 执行结果自动保存到后端数据库
9. **刷新恢复**: 刷新页面后，代码内容从后端加载恢复

### 4. 检查后端数据

通过 Swagger UI (http://localhost:8000/docs) 验证：
- `POST /api/code-executions` — 保存执行记录
- `GET /api/code-executions/{execution_id}` — 获取执行记录
- `GET /api/code-executions/by-block/{block_id}` — 获取执行历史
- 数据库 `code_executions` 表中应有对应的记录

## 代码执行方案变更：Pyodide → Docker 后端执行

**完成时间**: 2026-05-15

### 变更内容

将代码执行从前端 Pyodide（WebAssembly）改为后端 Docker 容器执行。

### 修改的文件

**后端新增/修改**:
- `backend/docker/python-runner/Dockerfile` — Python 执行环境镜像（新建）
- `backend/app/services/docker_execution_service.py` — Docker 执行服务（新建）
- `backend/app/routers/code_execution.py` — 添加 `POST /api/code-executions/execute` 执行端点
- `backend/app/config.py` — 添加 Docker 配置项（DOCKER_IMAGE, DOCKER_MEMORY_LIMIT, DOCKER_CPU_LIMIT）
- `backend/pyproject.toml` — 添加 docker SDK 依赖

**前端修改**:
- `frontend/src/components/editor/blocks/CodeBlock.tsx` — 改用后端 API 执行代码
- `frontend/src/lib/api.ts` — 添加 `codeExecutionAPI.execute()` 方法
- `frontend/package.json` — 移除 pyodide 依赖

**前端删除**:
- `frontend/src/lib/codeRunner.ts` — Pyodide 执行器（已删除）
- `frontend/public/pyodide/` — Pyodide 静态资源（已删除）

### 执行流程

```
前端 CodeBlock → POST /api/code-executions/execute → 后端 → Docker 容器执行 → 返回结果
```

### Docker 容器配置

- 镜像: `aidoc-python-runner`（基于 python:3.11-slim）
- 预装库: numpy, pandas, matplotlib, requests, scipy, scikit-learn, sympy, pillow, seaborn, plotly
- 内存限制: 256MB
- CPU 限制: 0.5 核
- 网络: 禁用
- 用户: 非 root

## 如何测试代码执行功能

### 1. 构建 Docker 镜像

```bash
cd backend/docker/python-runner
docker build -t aidoc-python-runner .
```

### 2. 启动后端服务

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 启动前端服务

```bash
cd frontend
npm run dev
```

### 4. 验证功能

在浏览器中打开 http://localhost:3000：

1. **创建代码块**: 使用斜杠命令 `/` 选择"Python 代码块"
2. **运行代码**: 点击"运行"按钮，代码在后端 Docker 容器中执行
3. **查看输出**: stdout 以绿色显示，stderr 以红色显示
4. **执行时间**: 输出面板右上角显示执行耗时
5. **预装库**: 可以 `import numpy`、`import pandas` 等，无需安装
6. **网络隔离**: 容器内无法访问网络
7. **超时处理**: 超过 30 秒的代码会被强制终止

## 下一步

阶段 5 已完成（代码执行已改为 Docker 后端执行），可以开始阶段 6（3D 图表功能）或阶段 7（AI 对话功能）。

## 阶段 6：3D 图表功能 ✅

**完成时间**: 2026-05-15

### 步骤 6.1：实现 3D 图表后端 API ✅

**修改的文件**:
- `backend/app/services/chart_service.py` - 3D 图表 Service 层（新建）
- `backend/app/routers/charts.py` - 3D 图表 API 路由（新建）
- `backend/app/main.py` - 注册图表路由
- `frontend/src/lib/api.ts` - 添加图表 API 函数

**完成内容**:
- 创建了 `chart_service.py`，实现图表数据的存储和获取逻辑：
  - `create_chart` — 创建图表记录
  - `get_chart` — 获取图表数据
  - `get_chart_by_block` — 根据 block_id 获取图表
  - `update_chart` — 更新图表数据
  - `save_chart_by_block` — 根据 block_id 保存或更新（upsert）
  - `generate_chart_from_table` — 从表格数据生成图表配置
  - `generate_chart_from_code_output` — 从代码输出生成图表配置
- 创建了 `charts.py` 路由：
  - `POST /api/charts/3d` — 创建 3D 图表
  - `GET /api/charts/{chart_id}` — 获取图表
  - `PATCH /api/charts/{chart_id}` — 更新图表
  - `GET /api/charts/by-block/{block_id}` — 根据 block_id 获取图表
  - `PUT /api/charts/by-block/{block_id}` — 根据 block_id 保存图表
- 前端 `api.ts` 添加了 `chartsAPI` 和 `whiteboardAPI`

### 步骤 6.2：集成 3D 图表库并实现完整功能 ✅

**修改的文件**:
- `frontend/src/components/editor/blocks/Chart3DBlock.tsx` - 重写 3D 图表组件
- `frontend/src/components/editor/BlockRenderer.tsx` - 更新以传递 onUpdate
- `frontend/src/types/block.ts` - 更新 Chart3DData 类型定义
- `frontend/package.json` - 添加 plotly.js 和 react-plotly.js 依赖

**完成内容**:
- 安装了 `plotly.js-dist-min` 和 `react-plotly.js` 及其类型声明
- 使用 Plotly.js 实现真正的 3D 图表渲染，支持：
  - 3D 柱状图（默认）
  - 3D 散点图（当有 Z 轴数据时）
  - 3D 曲面图（当 chartType 为 surface 时）
- 支持鼠标旋转、缩放、平移交互
- 实现了数据编辑面板：
  - 手动输入 X/Y/Z 轴数据（逗号分隔）
  - 设置轴标签
  - 设置图表标题
- 图表数据自动保存到后端（debounce 1 秒）
- 添加了保存状态指示器（保存中/已保存/保存失败）
- 支持展开/收起模式（全屏显示更大的图表）
- 更新了 Chart3DData 类型以支持新格式

### 步骤 6.3：实现从表格/代码导入数据到图表 ✅

**修改的文件**:
- `frontend/src/components/editor/blocks/Chart3DBlock.tsx` - 添加导入功能

**完成内容**:
- 在数据编辑面板中添加了"导入数据"按钮
- 支持从表格 block 导入：
  - 弹出文档内所有表格 block 的列表
  - 用户选择一个表格后，自动解析表头和数据行
  - 第一列作为 X 轴，第二列作为 Y 轴，第三列作为 Z 轴（如果有）
- 支持从代码输出导入：
  - 弹出文档内所有已执行成功的代码 block 的列表
  - 解析代码输出中的 JSON 数据
  - 支持对象数组和标准图表数据格式
- 导入后自动更新图表并保存到后端

## 如何测试阶段 6

### 1. 启动后端服务

```bash
cd backend
uv sync
uv run python scripts/init_db.py  # 初始化数据库和种子数据
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 启动前端服务

```bash
cd frontend
npm run dev
```

### 3. 验证 3D 图表功能

在浏览器中打开 http://localhost:3000：

1. **创建图表块**: 使用斜杠命令 `/` 选择"3D 图表"
2. **图表渲染**: 图表应显示为交互式 3D 柱状图
3. **交互操作**: 鼠标可以旋转、缩放、平移图表
4. **编辑数据**: 点击设置按钮打开数据编辑面板
5. **手动输入**: 输入 X/Y/Z 轴数据，点击"应用"更新图表
6. **展开模式**: 点击最大化按钮，图表以全屏模式显示
7. **自动保存**: 修改数据后 1 秒自动保存到后端
8. **保存状态**: 工具栏显示保存状态图标

### 4. 验证导入功能

1. **创建表格**: 先创建一个表格 block，填入数据
2. **创建图表**: 创建一个图表 block
3. **导入表格数据**: 点击设置 → 导入数据 → 选择表格
4. **验证导入**: 图表应更新为表格数据
5. **代码导入**: 创建代码块，运行生成 JSON 数据，然后在图表中导入

### 5. 检查后端数据

通过 Swagger UI (http://localhost:8000/docs) 验证：
- `POST /api/charts/3d` — 创建图表
- `GET /api/charts/{chart_id}` — 获取图表
- `PUT /api/charts/by-block/{block_id}` — 保存图表
- 数据库 `chart_3d` 表中应有对应的记录

## 下一步

阶段 6 已完成，可以开始阶段 7（AI 对话功能）。
