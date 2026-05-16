# AIDoc - AI 原生交互式文档系统

AIDoc 是一个 AI 原生交互式文档系统，类似 Notion/AFFiNE，集成了 AI 对话、Python 代码执行、3D 图表和白板功能。

## 特性

- **块编辑器**：支持多种块类型（文本、标题、列表、表格、代码、白板、3D 图表等）
- **AI 助手**：集成 AI 对话，支持文档问答、代码解释、数据分析
- **代码执行**：支持 Python 代码执行（基于 Docker 沙箱）
- **3D 图表**：支持交互式 3D 图表（基于 Plotly.js）
- **白板**：支持手绘白板功能
- **文件管理**：支持音频、视频、图片等多媒体文件

## 技术栈

### 前端
- **框架**：Next.js 16 + React 19
- **状态管理**：Zustand
- **UI 组件**：shadcn/ui + Tailwind CSS 4
- **图表**：Plotly.js
- **代码编辑器**：Monaco Editor
- **拖拽**：@dnd-kit

### 后端
- **框架**：FastAPI
- **数据库**：PostgreSQL + pgvector
- **ORM**：SQLAlchemy 2.0 (async)
- **包管理**：uv
- **AI 服务**：智谱 AI GLM-5.1

## 本地开发环境搭建

### 前置要求

- Node.js 18+
- Python 3.11+
- PostgreSQL 14+（需支持 pgvector 扩展）
- Docker（用于代码执行功能）

### 1. 克隆项目

```bash
git clone <repository-url>
cd AIDoc
```

### 2. 数据库准备

#### 安装 PostgreSQL

**macOS (Homebrew)**:
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### 创建数据库

```bash
# 进入 PostgreSQL 命令行
psql -U postgres

# 创建数据库
CREATE DATABASE aidoc;

# 退出
\q
```

#### 启用 pgvector 扩展

```bash
# 连接到 aidoc 数据库
psql -U postgres -d aidoc

# 启用向量扩展
CREATE EXTENSION IF NOT EXISTS vector;

# 退出
\q
```

### 3. 后端配置

#### 进入后端目录

```bash
cd backend
```

#### 安装 uv（如果未安装）

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

#### 安装依赖

```bash
uv sync
```

#### 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：

```env
# 数据库配置
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/aidoc

# 前端地址（用于 CORS）
FRONTEND_URL=http://localhost:3000

# AI 服务配置（可选，不配置则 AI 功能不可用）
LLM_API_KEY=your_zhipuai_api_key_here
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
LLM_MODEL=glm-5.1

# 文件存储配置
FILE_STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./storage

# 代码执行配置
CODE_EXECUTION_MODE=docker
CODE_EXECUTION_TIMEOUT=30
```

#### 初始化数据库

```bash
# 运行数据库初始化脚本
uv run python scripts/init_db.py
```

#### 启动后端服务

```bash
# 开发模式启动（自动重载）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端服务将在 http://localhost:8000 启动

- API 文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/api/health

### 4. 前端配置

#### 进入前端目录

```bash
cd frontend
```

#### 安装依赖

```bash
npm install
```

#### 配置环境变量

创建 `.env.local` 文件：

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

#### 启动前端服务

```bash
npm run dev
```

前端服务将在 http://localhost:3000 启动

### 5. 代码执行功能配置（可选）

代码执行功能需要 Docker 支持：

#### 构建 Python 执行环境镜像

```bash
cd backend/docker/python-runner
docker build -t aidoc-python-runner .
```

#### 验证 Docker 镜像

```bash
docker run --rm aidoc-python-runner python -c "print('Hello from Docker!')"
```

## 项目结构

```
AIDoc/
├── frontend/                # 前端项目
│   ├── src/
│   │   ├── app/            # Next.js 页面路由
│   │   ├── components/     # React 组件
│   │   │   ├── editor/    # 编辑器相关组件
│   │   │   ├── sidebar/   # 侧边栏组件
│   │   │   └── ui/        # shadcn/ui 组件
│   │   ├── stores/        # Zustand 状态管理
│   │   ├── lib/           # 工具函数和 API 封装
│   │   └── types/         # TypeScript 类型定义
│   └── package.json
│
├── backend/                 # 后端项目
│   ├── app/
│   │   ├── models/        # SQLAlchemy ORM 模型
│   │   ├── schemas/       # Pydantic 数据模式
│   │   ├── services/      # 业务逻辑层
│   │   ├── routers/       # API 路由
│   │   ├── prompts/       # AI prompt 模板
│   │   └── utils/         # 工具函数
│   ├── scripts/           # 数据库初始化脚本
│   ├── tests/             # 后端测试
│   ├── docker/            # Docker 配置
│   └── pyproject.toml
│
└── docs/                    # 项目文档
    ├── plan.md             # 开发计划
    └── tech.md             # 技术设计文档
```

## 开发命令

### 前端

```bash
cd frontend

npm run dev      # 启动开发服务器
npm run build    # 生产构建
npm start        # 启动生产服务器
npm run lint     # ESLint 检查
```

### 后端

```bash
cd backend

uv sync                                    # 安装依赖
uv run uvicorn app.main:app --reload       # 开发模式启动
uv run pytest tests/ -v                    # 运行测试
uv run python scripts/init_db.py           # 初始化数据库
```

## API 端点

### 文档管理
- `POST /api/documents` - 创建文档
- `GET /api/documents/tree` - 获取文档树
- `GET /api/documents/{id}` - 获取文档详情
- `PATCH /api/documents/{id}` - 更新文档
- `DELETE /api/documents/{id}` - 删除文档

### Block 管理
- `PUT /api/documents/{id}/blocks` - 批量保存 blocks
- `POST /api/documents/{id}/blocks` - 创建 block
- `PATCH /api/blocks/{id}` - 更新 block
- `DELETE /api/blocks/{id}` - 删除 block

### AI 对话
- `POST /api/ai/chat` - 普通对话
- `POST /api/ai/chat/stream` - 流式对话
- `POST /api/ai/document-qa` - 文档问答

### 代码执行
- `POST /api/code-executions/execute` - 执行代码

### 文件管理
- `POST /api/files/upload` - 上传文件
- `GET /api/files/{id}` - 获取文件

### 系统管理
- `GET /api/system/status` - 系统状态
- `GET /api/system/logs` - 系统日志
- `POST /api/system/init` - 初始化系统

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接地址 | `postgresql+asyncpg://postgres:postgres@localhost:5432/aidoc` |
| `FRONTEND_URL` | 前端地址（CORS） | `http://localhost:3000` |
| `LLM_API_KEY` | 智谱 AI API Key | - |
| `LLM_BASE_URL` | LLM 服务地址 | `https://open.bigmodel.cn/api/paas/v4` |
| `LLM_MODEL` | LLM 模型名 | `glm-5.1` |
| `FILE_STORAGE_TYPE` | 文件存储类型 | `local` |
| `LOCAL_STORAGE_PATH` | 本地存储路径 | `./storage` |
| `CODE_EXECUTION_MODE` | 代码执行模式 | `docker` |
| `CODE_EXECUTION_TIMEOUT` | 代码执行超时（秒） | `30` |
| `LOG_LEVEL` | 日志等级 | `INFO` |

## 常见问题

### 1. 数据库连接失败

确保 PostgreSQL 服务已启动，并且 `aidoc` 数据库已创建：

```bash
# 检查 PostgreSQL 状态
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql     # Linux

# 启动 PostgreSQL
brew services start postgresql@14    # macOS
sudo systemctl start postgresql      # Linux
```

### 2. pgvector 扩展未启用

```bash
psql -U postgres -d aidoc -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. AI 功能不可用

确保在 `.env` 中配置了有效的 `LLM_API_KEY`。未配置时，AI 对话会返回错误提示，但其他功能正常。

### 4. 代码执行功能不可用

确保 Docker 已启动，并且已构建 `aidoc-python-runner` 镜像：

```bash
cd backend/docker/python-runner
docker build -t aidoc-python-runner .
```

## 许可证

[待定]
