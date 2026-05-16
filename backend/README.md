# AIDoc 后端

AIDoc 项目的后端服务，基于 FastAPI + SQLAlchemy + PostgreSQL。

## 环境要求

- Python 3.11+
- PostgreSQL 14+
- uv（Python 包管理器）

## 安装 PostgreSQL

### macOS (使用 Homebrew)

```bash
# 安装 PostgreSQL
brew install postgresql@16

# 启动 PostgreSQL 服务
brew services start postgresql@16

# 创建数据库用户（可选）
createuser -s postgres
```

### Ubuntu/Debian

```bash
# 安装 PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动 PostgreSQL 服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 切换到 postgres 用户
sudo -i -u postgres

# 创建数据库用户（可选）
createuser -s postgres
```

### Windows

1. 下载并安装 PostgreSQL：https://www.postgresql.org/download/windows/
2. 安装时设置密码（默认用户为 postgres）
3. 确保 PostgreSQL 服务已启动

## 项目配置

### 1. 安装依赖

```bash
# 进入 backend 目录
cd backend

# 使用 uv 安装依赖
uv sync
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的配置
# 主要需要配置：
# - DATABASE_URL: PostgreSQL 连接地址
# - LLM_API_KEY: 智谱 AI API Key
```

### 3. 初始化数据库

```bash
# 运行数据库初始化脚本
uv run python scripts/init_db.py
```

这个脚本会：
1. 创建 `aidoc` 数据库（如果不存在）
2. 创建所有数据表
3. 插入示例种子数据

## 启动服务

```bash
# 开发模式启动（自动重载）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产模式启动
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

启动后，访问：
- API 文档：http://localhost:8000/docs
- ReDoc 文档：http://localhost:8000/redoc
- 健康检查：http://localhost:8000/api/health

## 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 应用主模块
│   ├── config.py            # 配置模块
│   ├── database.py          # 数据库模块
│   ├── dependencies.py      # 依赖注入
│   ├── models/              # SQLAlchemy 模型
│   ├── schemas/             # Pydantic Schema
│   ├── routers/             # API 路由
│   ├── services/            # 业务逻辑
│   ├── utils/               # 工具函数
│   └── prompts/             # AI Prompt 模板
├── scripts/
│   ├── init_db.py           # 数据库初始化脚本
│   └── seed_data.py         # 种子数据脚本
├── tests/                   # 测试文件
├── .env.example             # 环境变量模板
├── .env                     # 环境变量（本地开发）
├── pyproject.toml           # 项目配置和依赖
└── README.md                # 本文档
```

## API 文档

启动服务后，访问 http://localhost:8000/docs 查看完整的 API 文档。

### 主要 API 端点

- `GET /api/health` - 健康检查
- `POST /api/documents` - 创建文档
- `GET /api/documents/tree` - 获取文档树
- `GET /api/documents/{id}` - 获取文档详情
- `PUT /api/documents/{id}/blocks` - 批量保存 blocks
- `POST /api/ai/chat` - AI 对话
- `POST /api/ai/document-qa` - 基于文档问答

## 开发指南

### 添加新的模型

1. 在 `app/models/` 目录下创建新的模型文件
2. 在 `app/models/__init__.py` 中导出模型
3. 在 `app/database.py` 的 `init_db()` 函数中导入模型
4. 运行数据库迁移或重新初始化

### 添加新的 API 路由

1. 在 `app/routers/` 目录下创建新的路由文件
2. 在 `app/main.py` 中注册路由
3. 在 `app/schemas/` 中定义请求和响应 Schema

### 运行测试

```bash
# 运行所有测试
uv run pytest

# 运行特定测试文件
uv run pytest tests/test_documents.py

# 运行带详细输出的测试
uv run pytest -v
```

## 常见问题

### 1. 数据库连接失败

检查 PostgreSQL 服务是否启动，以及 `.env` 文件中的 `DATABASE_URL` 是否正确。

### 2. 权限错误

确保 PostgreSQL 用户有创建数据库的权限，或手动创建 `aidoc` 数据库：

```bash
# 使用 psql 连接
psql -U postgres

# 创建数据库
CREATE DATABASE aidoc;

# 退出
\q
```

## 相关文档

- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [SQLAlchemy 文档](https://docs.sqlalchemy.org/)
- [项目技术文档](../../docs/tech.md)
- [开发计划](../../docs/plan.md)
