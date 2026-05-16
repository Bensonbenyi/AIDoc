# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Project Overview

AIDoc is an AI-native interactive document system — a Notion/AFFiNE-like block editor with integrated AI chat, Python code execution, 3D charts, and whiteboard.

**Current status**: 阶段 0-11 已完成。前端和后端均已实现并对接。前端使用真实 API 调用（非 mock 数据）。

## Commands

### Frontend (from `frontend/` directory)

```bash
npm run dev      # Start dev server (Next.js, port 3000)
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint
```

### Backend (from `backend/` directory)

```bash
uv sync                                    # Install dependencies
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000  # Start dev server
uv run pytest tests/ -v                    # Run tests (18 tests)
uv run python scripts/init_db.py           # Init DB + seed data
uv run python scripts/seed_data.py         # Seed data only
```

### Docker (代码执行)

```bash
cd backend/docker/python-runner
docker build -t aidoc-python-runner .       # Build Python execution image
```

No frontend test framework is configured yet.

## Architecture

### 整体架构

```
Frontend (Next.js, port 3000)
    ↓ HTTP API calls
Backend (FastAPI, port 8000)
    ↓ SQLAlchemy async
PostgreSQL + pgvector
```

### Three-Panel Layout (`AppLayout.tsx`)
- **Left**: Document tree sidebar (`DocumentTree.tsx`) — resizable, collapsible
- **Center**: Block editor (`DocumentEditor.tsx`) with breadcrumb path
- **Right**: AI assistant panel (`AIAssistantPanel.tsx`) — resizable, collapsible
- A global `SlashCommandMenu` overlay renders at the app level

### Block System
All document content is stored as typed blocks (`DocumentBlock`). Block types: `h1`, `h2`, `h3`, `text`, `bullet`, `numbered`, `todo`, `table`, `quote`, `divider`, `code`, `whiteboard`, `chart3d`, `image`, `file`, `audio`, `video`, `doclink`, `ai-answer`.

- `BlockRenderer.tsx` dispatches to individual components in `blocks/` via switch statement
- Block content is `Record<string, unknown>` with shape varying by type (e.g., `{text}` for headings, `{items}` for lists, `{headers, rows}` for tables)
- New block types need: component in `blocks/`, entry in `BlockRenderer.tsx` switch, entry in `blocks/index.ts`, default content in `documentStore.ts`, slash menu item in `mock-data.ts`

### Editor Mechanics
- Uses native `contentEditable` divs (NOT a rich text library like Tiptap/BlockNote)
- `BaseTextLine` — contentEditable divs inserted between blocks for inline text entry
- Typing `/` in a BaseTextLine opens `SlashCommandMenu` (filterable, keyboard-navigable)
- Arrow keys navigate between blocks; Enter creates new text block; Backspace moves to previous
- Cmd+Z undoes last block change (max 50 history entries per doc, stored in Zustand)
- Blocks are drag-sortable via @dnd-kit

### State Management (Zustand)
Three stores in `src/stores/`:
- **`appStore`** — UI state: sidebar visibility/width, active doc ID, highlighted block, slash menu state
- **`documentStore`** — Data: document tree, blocks per doc, current doc metadata, undo history. Uses real API calls with auto-save (debounce 2s).
- **`aiChatStore`** — AI chat messages, pending attachments, scope (doc/tree/all). Uses real AI API.

### 前后端数据同步模式
- **乐观更新 + 自动保存**: 编辑 block 时先更新本地状态，2 秒后 debounce 触发 `batch_save_blocks`
- **批量保存**: `saveDocument()` 将当前文档所有 blocks 通过 `PUT /api/documents/{id}/blocks` 一次性发送
- **Block 删除**: `removeBlock` 只做本地状态更新 + 触发自动保存，不单独调用 delete API（batch_save 会自动删除后端多余的 blocks）
- **Block 创建**: `insertBlock`/`addBlockFromSlash` 直接调用后端 API 创建，获取服务端 ID

### Backend Architecture (FastAPI)

```
backend/app/
├── main.py              # FastAPI app, CORS, lifespan, router registration
├── config.py            # pydantic-settings config from .env
├── database.py          # Async SQLAlchemy engine + session factory
├── dependencies.py      # FastAPI dependency injection (get_db)
├── models/              # SQLAlchemy ORM models (UUID primary keys)
├── schemas/             # Pydantic request/response models
├── services/            # Business logic layer
├── routers/             # API route handlers
├── prompts/             # LLM prompt templates (.txt files)
└── utils/               # Logger, text splitter, block text converter
```

**API 路由组**:
- `/api/documents` — 文档 CRUD + 批量保存 blocks
- `/api/blocks` — Block 更新/删除 + 白板数据
- `/api/code-executions` — 代码执行（Docker 容器）
- `/api/charts` — 3D 图表 CRUD
- `/api/ai` — AI 对话（会话管理 + 普通对话 + 文档问答）
- `/api/files` — 文件上传/下载/删除
- `/api/system` — 系统状态/日志/初始化

### Key Type Definitions (`src/types/`)
- `DocumentBlock` — id, documentId, blockType, content, sortOrder, timestamps
- `DocumentTreeNode` — id, icon, title, children[], isOpen
- `AIMessage` — id, role (user|ai), text, attachments, citations
- `AIScope` — 'doc' | 'tree' | 'all'

## Conventions

- **All UI text is Chinese (zh-CN)** — component labels, placeholder text, mock data
- **Path alias**: `@/*` maps to `./src/*`
- **Styling**: Tailwind CSS v4 only (CSS-based config in `globals.css` via `@theme inline`, no `tailwind.config.ts`). Use `cn()` from `@/lib/utils` to merge classes.
- **Components**: All interactive components use `'use client'` directive
- **shadcn/ui**: Style "base-nova", base color neutral, CSS variables enabled. Primitives in `src/components/ui/`. Add new ones with `npx shadcn@latest add <component>`.
- **Icons**: Use `lucide-react`
- **Backend Python**: 使用 `uv` 管理依赖（pyproject.toml），不用 requirements.txt
- **ORM**: SQLAlchemy 2.0 风格（`Mapped` 类型注解），UUID 主键
- **Schema**: Pydantic v2，`ConfigDict(from_attributes=True)` 支持 ORM 转换
- **前后端命名**: 后端 snake_case，前端 camelCase，`api.ts` 自动转换
- **Block 类型映射**: 前端 `h1` ↔ 后端 `heading_1`，`text` ↔ `paragraph` 等，见 `blockTypeMapping.ts`

## Key Decisions

### RAG 系统：当前不启用

项目中已预建 RAG 相关代码（`embedding_service.py`、`rag_service.py`、`bm25_service.py`、`reranker_service.py`、`summary_service.py`、`rag.py` 路由），但**当前阶段不启用**。

**原因**:
1. 前端直接提取上下文方案更简单可靠——用户拖拽 block 到 AI 聊天框时，前端从本地 store 读取 block 内容拼接到消息中
2. 避免了后端 block 查找的时序问题（block 可能尚未保存到数据库）
3. RAG 需要 embedding API 调用，会拖慢保存速度

**当前 AI 问答方案**: 前端 `blockToText()` 提取 block 内容 → 拼接到用户消息 → 统一调用 `aiAPI.chat()` → 后端 prompt 识别"以下是引用的内容"前缀

**未来升级路径**: 需要时取消 `main.py` 中 RAG 路由注册的注释即可启用

### 代码执行：Docker 后端执行

代码执行从前端 Pyodide（WebAssembly）改为后端 Docker 容器执行。

**流程**: 前端 CodeBlock → `POST /api/code-executions/execute` → 后端 → Docker 容器执行 → 返回结果

**Docker 配置**: 镜像 `aidoc-python-runner`（python:3.11-slim），预装 numpy/pandas/matplotlib 等，内存 256MB，CPU 0.5 核，网络禁用

## Key Files

### Frontend
- `frontend/src/lib/api.ts` — API 请求封装（snake_case↔camelCase 自动转换，block_type 映射）
- `frontend/src/lib/blockTypeMapping.ts` — 前后端 block_type 映射
- `frontend/src/lib/editor-interactions.ts` — Caret placement, focus management, selection utilities
- `frontend/src/lib/slash-command.ts` — Slash command definitions and event constants
- `frontend/src/stores/documentStore.ts` — 文档数据 store（自动保存、乐观更新）
- `frontend/src/stores/aiChatStore.ts` — AI 聊天 store（前端上下文提取）

### Backend
- `backend/app/main.py` — FastAPI 应用入口
- `backend/app/config.py` — 配置（pydantic-settings，从 .env 读取）
- `backend/app/database.py` — 异步 SQLAlchemy 引擎
- `backend/app/services/block_service.py` — Block 业务逻辑（含 batch_save_blocks）
- `backend/app/services/ai_service.py` — AI 服务（智谱 GLM-5.1）
- `backend/app/services/docker_execution_service.py` — Docker 代码执行
- `backend/app/routers/` — API 路由（documents, blocks, ai, charts, files, system, code_execution）
- `backend/app/prompts/` — LLM prompt 模板文件

### Docs
- `docs/tech.md` — Full technical design (data models, API specs, environment variables)
- `docs/plan.md` — 13-phase development implementation plan
- `memory-bank/progress.md` — 开发进度记录

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/aidoc
LLM_API_KEY=your_zhipu_api_key
LLM_MODEL=glm-5.1
EMBEDDING_MODEL=text-embedding-v4
FRONTEND_URL=http://localhost:3000
CODE_EXECUTION_MODE=docker
FILE_STORAGE_TYPE=local
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
