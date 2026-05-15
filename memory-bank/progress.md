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

## 下一步

阶段 0 已完成，可以开始阶段 1：数据库模型与 ORM 定义。
