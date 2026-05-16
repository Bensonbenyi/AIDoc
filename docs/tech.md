# AIDoc 技术说明

## 当前范围

AIDoc 当前阶段是一个 AI 原生交互式文档系统，核心能力包括：

- Block 文档编辑
- 文档树管理
- AI 对话和基于文档上下文的问答
- Python 代码执行
- 3D 图表
- 白板
- 文件上传和预览

当前阶段不包含额外的派生内容构建流程。文档编辑、删除和保存只处理文档自身数据。

## 架构

```text
Frontend (Next.js)
  -> Backend API (FastAPI)
  -> PostgreSQL
```

## 前端

- Next.js + React
- Zustand 管理文档、应用 UI 和 AI 对话状态
- `documentStore` 负责文档树、当前文档 block、自动保存和删除持久化
- `aiChatStore` 负责对话消息和引用内容
- 文档内容以 block 形式渲染和编辑

## 后端

- FastAPI 提供 REST API
- SQLAlchemy async 访问 PostgreSQL
- `documents` 路由负责文档 CRUD 和 block 批量保存
- `blocks` 路由负责单个 block 更新、删除和白板数据
- `ai` 路由负责会话、普通对话、文档上下文问答
- `code-executions` 路由负责代码执行记录和执行入口
- `charts`、`files`、`system` 提供对应业务能力

## AI 文档问答

当前方案直接使用文档上下文：

1. 用户拖拽文档或 block 到 AI 区域，前端提取引用内容
2. 用户发送问题
3. 后端把引用内容或当前文档内容拼接为 prompt 上下文
4. LLM 返回回答和引用信息

这个流程不写入额外派生表，也不在正常编辑时做后台处理。

## 数据模型

主要表：

- `documents`
- `document_blocks`
- `whiteboard_data`
- `chart_3d`
- `ai_chat_sessions`
- `ai_messages`
- `code_executions`
- `file_assets`
- `system_logs`

## 环境变量

后端主要配置：

- `DATABASE_URL`
- `FRONTEND_URL`
- `BACKEND_URL`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `FILE_STORAGE_TYPE`
- `LOCAL_STORAGE_PATH`
- `CODE_EXECUTION_MODE`
- `CODE_EXECUTION_TIMEOUT`
- `LOG_LEVEL`
