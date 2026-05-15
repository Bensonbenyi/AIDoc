
# AI 原生交互式文档技术文档

## 1. 技术目标

本项目目标是实现一款 **AI 原生交互式文档系统**。

它不是传统 Word 文档，也不是单纯在线笔记，而是一种由多个可交互内容块组成的新型动态文档。文档整体形态参考 Notion / AFFiNE 的页面式文档结构，但在基础文档能力之上增加：

1. 交互式白板块；
2. Python 可执行代码块；
3. 3D 图表块；
4. AI 对话侧边栏；
5. 基于文档内容的 Block-aware Hierarchical RAG 问答能力。

本项目的技术实现目标：

1. 实现一个类似 Notion / AFFiNE 的页面式块状文档编辑器，支持文档树、文档嵌套、页面跳转、`/` 命令插入不同类型内容块。
2. 实现五类核心文档能力：块状编辑器、交互式白板块、Python 可执行代码块、3D 图表块、文档 RAG 问答。
3. 实现 AI 对话侧边栏，用户可以直接与 AI 对话，也可以基于当前文档、当前文档树或全部文档内容进行问答、总结、解释和改写。
4. 实现文档内容结构化存储，使每个标题、段落、表格、代码块、白板块、图表块都作为独立 block 保存。
5. 实现 Block-aware Hierarchical RAG，使 AI 能够基于 block、相邻 block、父级标题、文档路径和文档摘要进行上下文增强回答。
6. 实现 Python 代码块运行能力，代码执行结果可以直接显示在文档内部。
7. 实现基于表格数据、代码输出或用户输入数据生成 3D 图表，并嵌入文档页面。
8. 实现基础文档管理、文档树管理、文件保存、AI 调用日志、代码执行记录和 RAG 索引管理。
9. Demo 阶段不做登录注册、不做多用户、不做多 Workspace，用户打开项目后直接进入默认文档空间。

---

## 2. 产品范围说明

### 2.1 本阶段必须实现

1. 块状文档编辑器；
2. 文档树与文档嵌套；
3. 文档页面跳转与内部链接；
4. `/` 命令插入内容块；
5. 标题、正文、列表、表格、Todo List 等基础块；
6. 交互式白板块；
7. Python 可执行代码块；
8. 3D 图表块；
9. AI 对话侧边栏；
10. 基于当前文档内容的 AI 问答；
11. 基于当前文档树的 AI 问答；
12. 基于全部文档的 AI 问答；
13. Block-aware Hierarchical RAG；
14. 文档保存、读取、更新、删除；
15. 文档 block 的索引、检索和引用回跳。



## 3. 技术栈

### 3.1 前端

* 框架：Next.js / React
* 语言：TypeScript
* UI 组件库：shadcn/ui
* 样式方案：Tailwind CSS
* 状态管理：Zustand
* 请求方式：Axios / Fetch API
* 路由方案：Next.js App Router
* 富文本 / 块编辑器：BlockNote 或 Tiptap
* 代码编辑器：Monaco Editor 或 CodeMirror
* 白板组件：原生 Canvas API（简单画笔白板，与 UI 原型一致）
* 3D 图表：Plotly.js / ECharts GL / Three.js
* Markdown 渲染：react-markdown
* 图标库：lucide-react

### 3.2 后端

* 框架：FastAPI
* 语言：Python
* 包管理：uv（使用 `pyproject.toml` 管理依赖）
* API 风格：REST API
* 参数校验：Pydantic
* 认证方式：Demo 阶段不做认证，所有接口默认单用户可访问
* 日志方案：Python logging / loguru
* 后台任务：FastAPI BackgroundTasks / Celery 可选
* 代码执行：Pyodide 前端执行 或 后端 Python 沙箱执行
* AI 服务调用：Demo 阶段优先接入 Zhipu AI GLM-5.1
* Embedding 服务调用：阿里 Qwen text-embedding-v4

### 3.3 数据库与存储

* 主数据库：PostgreSQL
* ORM：SQLAlchemy / SQLModel
* 向量数据库：pgvector
* 关键词检索：PostgreSQL full-text search / BM25 检索组件
* 缓存：Redis，可选
* 文件存储：本地文件系统 / S3 兼容对象存储 / 阿里云 OSS
* 其他存储：

  * 白板 JSON 数据；
  * 代码执行结果；
  * 图表配置 JSON；
  * 文档 block 快照；
  * AI 对话记录；
  * RAG chunk 索引；
  * 文档摘要；
  * 文档路径；
  * block 元数据。

### 3.4 AI 相关

* LLM 服务：Zhipu AI GLM-5.1
* Embedding 模型：阿里 Qwen text-embedding-v4
* RAG 方案：Block-aware Hierarchical RAG
* 检索范围：

  * 当前文档；
  * 当前文档树；
  * 全工作区。
* 检索方式：

  * 向量检索；
  * 关键词检索 BM25；
  * 元数据过滤；
  * reranker 重排。
* 上下文扩展：

  * 命中 block；
  * 相邻 block；
  * 父级 heading；
  * 当前文档摘要；
  * 文档路径。
* Prompt 管理：后端集中管理 prompt 模板
* 输出格式要求：JSON 格式输出，便于前端解析和展示
* 引用方式：回答中返回 `doc_id`、`block_id`、`block_type`、`content_preview`

### 3.5 部署

* 前端部署：Vercel / Nginx 静态部署 / Docker
* 后端部署：Docker + 云服务器 / Railway / Render / 阿里云 ECS / 华为云 ECS
* 数据库部署：云数据库 PostgreSQL / Docker PostgreSQL
* 环境变量管理：`.env` 文件 + `.env.example`
* 对象存储：本地开发使用 local storage，生产环境使用 OSS/S3
* 日志管理：本地日志文件，后续可接入 Loki / ELK

---

## 4. 系统架构

系统主要由以下模块组成：

1. 前端页面模块
   负责文档编辑器、文档树、AI 侧边栏、代码块、白板块、3D 图表块等界面。

2. 后端 API 模块
   负责文档管理、block 管理、AI 调用、代码执行、RAG 检索、文件存储等 REST API。

3. 文档管理模块
   负责文档树、文档嵌套、文档增删改查、文档跳转。

4. Block 编辑模块
   负责标题、正文、表格、Todo、代码块、白板块、图表块等内容块的保存和更新。

5. AI 对话模块
   负责 AI 侧边栏对话、当前文档问答、文档树问答、全工作区问答、文档总结、内容改写等能力。

6. RAG 检索模块
   负责将文档 block 转换为可检索文本，生成 embedding，建立关键词索引，执行混合检索、rerank 和上下文扩展。

7. 代码执行模块
   负责 Python 代码块运行、输出捕获、错误处理、结果保存。

8. 3D 图表模块
   负责根据表格数据、代码输出数据或用户输入数据生成 3D 图表配置。

9. 白板模块
   负责保存白板绘图路径 JSON（画笔/橡皮路径数组）、撤销重做状态。

10. 文件与资源模块
    负责图片、附件、白板快照、图表快照、代码输出文件等资源存储。

11. 系统日志模块
    负责 AI 调用日志、代码执行记录、错误日志和接口调用记录。

---

## 5. 推荐目录结构

```text
project/
  frontend/
    package.json
    next.config.ts
    tailwind.config.ts
    tsconfig.json

    src/
      app/
        layout.tsx
        page.tsx
        documents/
          [docId]/
            page.tsx

      components/
        editor/
          DocumentEditor.tsx
          BlockRenderer.tsx
          SlashCommandMenu.tsx
          blocks/
            TextBlock.tsx
            HeadingBlock.tsx
            TableBlock.tsx
            TodoBlock.tsx
            CodeBlock.tsx
            WhiteboardBlock.tsx
            Chart3DBlock.tsx
            AudioBlock.tsx
            VideoBlock.tsx
            AIAnswerBlock.tsx
            DocumentLinkBlock.tsx

        sidebar/
          DocumentTree.tsx
          AIAssistantPanel.tsx
          AppSidebar.tsx

        whiteboard/
          WhiteboardCanvas.tsx

        code/
          CodeEditor.tsx
          CodeOutput.tsx

        chart/
          Chart3DViewer.tsx
          ChartDataEditor.tsx

        ui/
          Button.tsx
          Dialog.tsx
          Input.tsx
          Card.tsx

      lib/
        api.ts
        editor.ts
        rag.ts
        codeRunner.ts
        chart.ts
        document.ts
        blockTypeMapping.ts  # 前后端 block_type 映射

      stores/
        documentStore.ts
        aiChatStore.ts
        appStore.ts

      types/
        document.ts
        block.ts
        ai.ts
        code.ts
        chart.ts
        whiteboard.ts

      styles/
        globals.css

  backend/
    pyproject.toml
    Dockerfile
    .env.example

    app/
      main.py
      config.py
      database.py
      dependencies.py

      routers/
        documents.py
        blocks.py
        ai.py
        rag.py
        code_execution.py
        charts.py
        files.py
        system.py

      services/
        document_service.py
        block_service.py
        ai_service.py
        rag_service.py
        embedding_service.py
        bm25_service.py
        reranker_service.py
        code_execution_service.py
        chart_service.py
        whiteboard_service.py
        file_service.py
        summary_service.py

      models/
        document.py
        document_block.py
        whiteboard_data.py
        chart_3d.py
        ai_chat.py
        ai_message.py
        knowledge_chunk.py
        document_summary.py
        code_execution.py
        file_asset.py
        system_log.py

      schemas/
        document.py
        block.py
        whiteboard.py
        ai.py
        rag.py
        code_execution.py
        chart.py
        file.py
        system.py

      utils/
        logger.py
        prompt_builder.py
        block_text_converter.py
        text_splitter.py
        response_parser.py
        id_generator.py

      prompts/
        document_qa_system.txt
        document_summary_system.txt
        rewrite_system.txt
        chart_generation_system.txt
        code_explain_system.txt

      tests/
        test_documents.py
        test_blocks.py
        test_ai.py
        test_rag.py
        test_code_execution.py
        test_charts.py

  docs/
    product.md
    tech.md
    api.md
    database.md
    demo-script.md

  docker-compose.yml
  README.md
```

---

## 6. 前端模块说明

### 6.0 前后端 block_type 映射

前端 UI 使用简写命名，后端 API 使用完整命名。前端在与后端通信时需要做映射。

映射关系（前端 → 后端）：

```text
h1         → heading_1
h2         → heading_2
h3         → heading_3
text       → paragraph
bullet     → bullet_list
numbered   → numbered_list
doclink    → link_to_document
chart3d    → chart_3d
ai-answer  → ai_answer
```

以下类型前后端命名一致，无需映射：

```text
todo, table, quote, divider, code, whiteboard,
image, file, audio, video
```

前端需在 `lib/blockTypeMapping.ts` 中维护 `toBackendBlockType()` 和 `toFrontendBlockType()` 两个映射函数。API 封装层（`lib/api.ts`）在发送请求和接收响应时自动调用映射。

### app/

负责页面路由和整体布局。

主要页面：

* `/`：项目首页，默认跳转到最近打开的文档或默认文档；
* `/documents/[docId]`：具体文档页面。

文档页面主要布局：

```text
左侧：文档树
中间：文档编辑器
右侧：AI 对话侧边栏
```

### components/

负责所有 UI 组件。

核心组件包括：

1. `DocumentEditor.tsx`
   文档主编辑器，负责渲染和编辑所有 block。

2. `DocumentTree.tsx`
   左侧文档树，展示文档嵌套结构，支持点击跳转。

3. `SlashCommandMenu.tsx`
   输入 `/` 后出现的命令菜单。

4. `AIAssistantPanel.tsx`
   AI 侧边栏，支持普通对话和基于文档内容提问。

5. `CodeBlock.tsx`
   Python 可执行代码块。前端 UI 原型已有基础结构，需要集成 Monaco Editor 或 CodeMirror 作为代码编辑器，并集成 Pyodide 实现代码执行。

6. `WhiteboardBlock.tsx`
   白板块。使用原生 Canvas API 实现简单画笔白板，支持画笔、橡皮、撤销、重做，数据格式为路径数组 JSON。与 UI 原型中白板交互一致。

7. `Chart3DBlock.tsx`
   3D 图表块。前端 UI 原型已有基础结构，需要集成 Plotly.js 或 ECharts GL 实现真实 3D 图表渲染。

8. `TableBlock.tsx`
   表格块。

9. `TodoBlock.tsx`
   待办事项块。

10. `DocumentLinkBlock.tsx`
    文档链接块，用于在一个文档中跳转到另一个文档页面。

11. `AudioBlock.tsx`
    音频块，嵌入 HTML5 音频播放器，支持 MP3 等格式的内联播放、暂停、进度拖拽和音量控制。

12. `VideoBlock.tsx`
    视频块，嵌入 HTML5 视频播放器，支持 MP4 等格式的内联播放、暂停、进度拖拽、音量控制和全屏。

### lib/

负责封装通用逻辑。

* `api.ts`：统一封装请求方法；
* `editor.ts`：编辑器相关工具函数；
* `rag.ts`：AI / RAG 请求封装；
* `codeRunner.ts`：代码执行请求封装；
* `chart.ts`：图表数据转换工具；
* `document.ts`：文档树、文档路径、页面跳转相关工具函数。

### hooks/

负责封装前端状态逻辑。

* `useDocument()`：获取、保存、更新文档；
* `useDocumentTree()`：加载文档树；
* `useAIChat()`：AI 对话逻辑；
* `useCodeExecution()`：代码运行逻辑；
* `useWhiteboard()`：白板保存与加载逻辑；
* `useChart3D()`：3D 图表创建与更新逻辑。

### stores/

负责全局状态管理。

* `documentStore.ts`：当前文档内容、当前文档 ID、block 状态；
* `aiChatStore.ts`：AI 对话状态；
* `appStore.ts`：应用级状态，例如当前选中 block、侧边栏开关、当前文档路径等。

### types/

负责 TypeScript 类型定义。

核心类型包括：

* `Document`
* `DocumentBlock`
* `WhiteboardData`
* `AIMessage`
* `CodeExecution`
* `Chart3DConfig`
* `KnowledgeChunk`
* `DocumentSummary`

### styles/

负责全局样式。

主要包括：

* Tailwind 全局配置；
* 编辑器样式；
* 代码块样式；
* 白板容器样式；
* 3D 图表容器样式；
* AI 侧边栏样式。

---

## 7. 后端模块说明

### routers/

负责 API 路由定义。

* `documents.py`：文档管理；
* `blocks.py`：block 管理；
* `ai.py`：AI 对话接口；
* `rag.py`：文档索引和检索接口；
* `code_execution.py`：代码执行接口；
* `charts.py`：3D 图表生成接口；
* `files.py`：文件上传与访问；
* `system.py`：系统状态和 Demo 初始化接口。

### services/

负责核心业务逻辑。

* `document_service.py`：文档创建、更新、删除、树结构处理；
* `block_service.py`：block 保存、排序、更新、删除；
* `rag_service.py`：Block-aware Hierarchical RAG 主流程；
* `embedding_service.py`：embedding 生成和写入；
* `bm25_service.py`：关键词检索；
* `reranker_service.py`：候选 block 重排；
* `ai_service.py`：LLM 调用、prompt 构造、输出解析；
* `code_execution_service.py`：Python 代码执行、超时控制、结果记录；
* `chart_service.py`：图表配置生成；
* `whiteboard_service.py`：白板 JSON 保存和读取；
* `file_service.py`：文件上传、读取、删除；
* `summary_service.py`：文档摘要生成与更新。

### models/

负责数据库表结构定义。

主要模型：

* `Document`
* `DocumentBlock`
* `WhiteboardData`
* `Chart3D`
* `AIChatSession`
* `AIMessage`
* `KnowledgeChunk`
* `DocumentSummary`
* `CodeExecution`
* `FileAsset`
* `SystemLog`

### schemas/

负责 Pydantic 请求和响应模型。

用途：

* 校验前端请求参数；
* 规范 API 响应格式；
* 约束 AI 输出结构；
* 避免直接暴露数据库模型。

### utils/

负责通用工具函数。

* `logger.py`：日志封装；
* `prompt_builder.py`：Prompt 拼接；
* `block_text_converter.py`：不同 block 转换为可索引文本；
* `text_splitter.py`：长文本切片；
* `response_parser.py`：AI JSON 输出解析；
* `id_generator.py`：生成文档、block、会话等 ID。

### tests/

负责单元测试和接口测试。

重点测试：

* 文档创建和读取；
* 文档树生成；
* block 更新；
* RAG 检索；
* AI 问答；
* 代码执行；
* 白板保存；
* 图表生成。

---

## 8. 核心数据对象

## 8.1 Document

### 字段

```text
id
parent_id
title
icon
cover_url
sort_order
path
is_deleted
created_at
updated_at
```

### 用途

表示一个文档页面。

本项目不做多 Workspace，所有文档都属于默认文档空间。

`parent_id` 用于实现文档树和文档嵌套。

示例：

```text
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

### 说明

文档在产品形态上表现为一个个页面，类似 Notion / AFFiNE。

每个页面都有自己的标题、图标、封面和正文 block。

---

## 8.2 DocumentBlock

### 字段

```text
id
document_id
parent_block_id
block_type
content
properties
sort_order
created_at
updated_at
```

### block_type 可选值

```text
paragraph
heading_1
heading_2
heading_3
bullet_list
numbered_list
todo
table
quote
divider
code
whiteboard
chart_3d
image
file
audio
video
link_to_document
ai_answer
```

### content 示例

普通文本块：

```json
{
  "text": "这是一个普通段落。"
}
```

代码块：

```json
{
  "language": "python",
  "code": "print('hello world')"
}
```

白板块：

```json
{
  "whiteboardSnapshot": [
    {"tool": "pen", "pts": [{"x": 10, "y": 20}, {"x": 15, "y": 25}]}
  ]
}
```

3D 图表块：

```json
{
  "chart_id": "chart_001"
}
```

文档链接块：

```json
{
  "target_document_id": "doc_002",
  "title": "技术架构文档"
}
```

音频块：

```json
{
  "file_id": "file_audio_001",
  "file_name": "会议录音.mp3",
  "file_url": "/api/files/file_audio_001",
  "duration": 180
}
```

视频块：

```json
{
  "file_id": "file_video_001",
  "file_name": "产品演示.mp4",
  "file_url": "/api/files/file_video_001",
  "duration": 300,
  "poster_url": "/api/files/file_poster_001"
}
```

### 用途

这是整个系统最核心的数据对象。

所有文档内容都应该被拆成 block 保存，而不是保存成一整段 HTML。

---

## 8.3 WhiteboardData

### 字段

```text
id
block_id
document_id
data_json
preview_image_url
created_at
updated_at
```

### 用途

保存白板块的绘图内容。

`data_json` 保存路径数组，格式为 `[{ tool: 'pen'|'eraser', pts: [{x,y}, ...] }, ...]`。

本阶段白板内容不需要 AI 理解。

MVP 支持：

* 电脑端鼠标绘制；
* 移动端手指简单涂画；
* 橡皮；
* 撤销；
* 重做；
* 保存和重新加载。

实现方式：使用原生 Canvas API，不依赖第三方白板库。与 UI 原型 `proto-index.html` 中白板交互一致。

本阶段不要求：

* 电容笔压感；
* 高精度笔迹优化；
* 手写识别；
* 白板内容 AI 理解；
* Notability 级别书写体验；
* 简单图形和文本标注（后续可扩展）。

---

## 8.4 CodeExecution

### 字段

```text
id
block_id
document_id
language
source_code
status
stdout
stderr
result_json
execution_time_ms
created_at
```

### status 可选值

```text
pending
running
success
failed
timeout
```

### 用途

记录代码块每次运行的结果。

执行成功后，结果可以回写到代码块下方，也可以作为 3D 图表块的数据来源。

---

## 8.5 Chart3D

### 字段

```text
id
block_id
document_id
source_type
source_block_id
data_json
chart_config
created_at
updated_at
```

### source_type 可选值

```text
manual
table
code_output
csv
```

### 用途

保存 3D 图表数据和渲染配置。

示例：

```json
{
  "x": ["Q1", "Q2", "Q3", "Q4"],
  "y": ["产品A", "产品B", "产品C"],
  "z": [
    [120, 150, 180, 210],
    [90, 110, 140, 170],
    [60, 80, 130, 160]
  ]
}
```

---

## 8.6 AIChatSession

### 字段

```text
id
document_id
title
created_at
updated_at
```

### 用途

表示一次 AI 对话会话。

如果 `document_id` 不为空，表示这是基于某篇文档的 AI 对话。

如果 `document_id` 为空，表示这是普通 AI 对话。

---

## 8.7 AIMessage

### 字段

```text
id
session_id
role
content
references
created_at
```

### role 可选值

```text
user
assistant
system
```

### references 示例

```json
[
  {
    "doc_id": "doc_001",
    "block_id": "block_009",
    "block_type": "code",
    "content_preview": "代码块生成了季度收入数据"
  }
]
```

### 用途

保存 AI 对话历史和引用来源。

---

## 8.8 KnowledgeChunk

### 字段

```text
id
document_id
block_id
chunk_text
embedding
bm25_text
block_type
heading_path
document_path
metadata
created_at
updated_at
```

### 用途

用于 RAG 检索。

每个 chunk 的基础单位是 block。

对于较长 block，可以在 block 内部再切分为多个 chunk，但必须保留同一个 `block_id`。

---

## 8.9 DocumentSummary

### 字段

```text
id
document_id
summary_text
key_points
updated_at
```

### 用途

保存当前文档摘要。

在 RAG 上下文扩展阶段，当前文档摘要会作为全局背景信息传给 LLM。

---

## 8.10 FileAsset

### 字段

```text
id
document_id
block_id
file_name
file_type
file_url
file_size
created_at
```

### 用途

保存图片、附件、音频、视频、白板预览图、代码输出文件、图表截图等资源。

---

## 8.11 SystemLog

### 字段

```text
id
log_type
message
metadata
created_at
```

### log_type 可选值

```text
ai_call
rag_search
code_execution
document_update
error
```

### 用途

记录系统运行日志，方便 Demo 调试和问题排查。

---

## 9. 核心 API

## 9.1 创建文档

### 方法

```text
POST
```

### 路径

```text
/api/documents
```

### 功能

创建一个新的文档页面。

### 权限

Demo 阶段无需登录，默认可访问。

### 请求参数

```json
{
  "parent_id": null,
  "title": "AI 原生文档设计"
}
```

### 响应结果

```json
{
  "id": "doc_001",
  "parent_id": null,
  "title": "AI 原生文档设计",
  "created_at": "2026-05-14T10:00:00"
}
```

### 错误情况

```text
参数缺失
父级文档不存在
数据库写入失败
```

---

## 9.2 获取文档树

### 方法

```text
GET
```

### 路径

```text
/api/documents/tree
```

### 功能

获取默认文档空间下的文档树结构。

### 权限

Demo 阶段无需登录。

### 响应结果

```json
[
  {
    "id": "doc_001",
    "title": "产品设计",
    "children": [
      {
        "id": "doc_002",
        "title": "用户需求",
        "children": []
      }
    ]
  }
]
```

### 错误情况

```text
数据库读取失败
```

---

## 9.3 获取文档详情

### 方法

```text
GET
```

### 路径

```text
/api/documents/{document_id}
```

### 功能

获取文档基本信息和所有 block。

### 权限

Demo 阶段无需登录。

### 响应结果

```json
{
  "id": "doc_001",
  "title": "AI 原生文档设计",
  "path": "项目总览 / 产品设计",
  "blocks": [
    {
      "id": "block_001",
      "block_type": "heading_1",
      "content": {
        "text": "项目背景"
      },
      "sort_order": 1
    },
    {
      "id": "block_002",
      "block_type": "paragraph",
      "content": {
        "text": "这是一种新型动态文档。"
      },
      "sort_order": 2
    }
  ]
}
```

### 错误情况

```text
文档不存在
数据库读取失败
```

---

## 9.4 更新文档标题

### 方法

```text
PATCH
```

### 路径

```text
/api/documents/{document_id}
```

### 功能

更新文档标题、图标、封面等元数据。

### 权限

Demo 阶段无需登录。

### 请求参数

```json
{
  "title": "新的文档标题",
  "icon": "📄"
}
```

### 响应结果

```json
{
  "success": true
}
```

---

## 9.5 删除文档

### 方法

```text
DELETE
```

### 路径

```text
/api/documents/{document_id}
```

### 功能

删除指定文档。

### 权限

Demo 阶段无需登录。

### 响应结果

```json
{
  "success": true
}
```

### 错误情况

```text
文档不存在
数据库删除失败
```

---

## 9.6 批量保存文档 Blocks

### 方法

```text
PUT
```

### 路径

```text
/api/documents/{document_id}/blocks
```

### 功能

保存当前文档的所有 block。

### 权限

Demo 阶段无需登录。

### 请求参数

```json
{
  "blocks": [
    {
      "id": "block_001",
      "block_type": "heading_1",
      "content": {
        "text": "项目背景"
      },
      "properties": {},
      "sort_order": 1
    },
    {
      "id": "block_002",
      "block_type": "paragraph",
      "content": {
        "text": "这是正文内容。"
      },
      "properties": {},
      "sort_order": 2
    }
  ]
}
```

### 响应结果

```json
{
  "success": true,
  "updated_count": 2
}
```

### 错误情况

```text
文档不存在
block_type 不合法
数据库写入失败
```

---

## 9.7 创建单个 Block

### 方法

```text
POST
```

### 路径

```text
/api/documents/{document_id}/blocks
```

### 功能

在文档中新增一个 block。

### 权限

Demo 阶段无需登录。

### 请求参数

```json
{
  "block_type": "todo",
  "content": {
    "text": "完成 Demo 剧本",
    "checked": false
  },
  "sort_order": 10
}
```

### 响应结果

```json
{
  "id": "block_010",
  "block_type": "todo",
  "content": {
    "text": "完成 Demo 剧本",
    "checked": false
  }
}
```

---

## 9.8 更新单个 Block

### 方法

```text
PATCH
```

### 路径

```text
/api/blocks/{block_id}
```

### 功能

更新某个 block 内容。

### 权限

Demo 阶段无需登录。

### 请求参数

```json
{
  "content": {
    "text": "更新后的内容"
  },
  "properties": {}
}
```

### 响应结果

```json
{
  "success": true
}
```

---

## 9.9 删除 Block

### 方法

```text
DELETE
```

### 路径

```text
/api/blocks/{block_id}
```

### 功能

删除某个 block。

### 权限

Demo 阶段无需登录。

### 响应结果

```json
{
  "success": true
}
```

---

## 9.10 保存白板数据

### 方法

```text
PUT
```

### 路径

```text
/api/blocks/{block_id}/whiteboard
```

### 功能

保存白板块的绘图数据。

### 权限

Demo 阶段无需登录。

### 请求参数

```json
{
  "data_json": [
    {
      "tool": "pen",
      "pts": [{"x": 10, "y": 20}, {"x": 15, "y": 25}]
    }
  ],
  "preview_image_url": null
}
```

### 响应结果

```json
{
  "success": true
}
```

### 错误情况

```text
block 不存在
block 类型不是 whiteboard
数据库写入失败
```

---

## 9.11 获取白板数据

### 方法

```text
GET
```

### 路径

```text
/api/blocks/{block_id}/whiteboard
```

### 功能

获取白板块的绘图数据。

### 权限

Demo 阶段无需登录。

### 响应结果

```json
{
  "block_id": "block_005",
  "data_json": [
    {
      "tool": "pen",
      "pts": [{"x": 10, "y": 20}, {"x": 15, "y": 25}]
    }
  ],
  "preview_image_url": null
}
```

---

## 9.12 执行 Python 代码块

### 方法

```text
POST
```

### 路径

```text
/api/blocks/{block_id}/execute
```

### 功能

执行代码块中的 Python 代码。

### 权限

Demo 阶段无需登录。

### 请求参数

```json
{
  "language": "python",
  "source_code": "print('hello world')"
}
```

### 响应结果

```json
{
  "execution_id": "exec_001",
  "status": "success",
  "stdout": "hello world\n",
  "stderr": "",
  "result_json": null,
  "execution_time_ms": 120
}
```

### 错误情况

```text
代码执行超时
代码语法错误
不支持的语言
执行环境异常
```

---

## 9.13 创建 3D 图表

### 方法

```text
POST
```

### 路径

```text
/api/charts/3d
```

### 功能

根据输入数据创建 3D 图表配置。

### 权限

Demo 阶段无需登录。

### 请求参数

```json
{
  "document_id": "doc_001",
  "source_type": "manual",
  "source_block_id": null,
  "data_json": {
    "x": ["Q1", "Q2", "Q3"],
    "y": ["产品A", "产品B"],
    "z": [
      [120, 180, 210],
      [90, 130, 160]
    ]
  }
}
```

### 响应结果

```json
{
  "chart_id": "chart_001",
  "chart_config": {
    "type": "3d_bar",
    "data": {
      "x": ["Q1", "Q2", "Q3"],
      "y": ["产品A", "产品B"],
      "z": [
        [120, 180, 210],
        [90, 130, 160]
      ]
    }
  }
}
```

### 错误情况

```text
数据格式错误
无法生成图表
```

---

## 9.14 AI 普通对话

### 方法

```text
POST
```

### 路径

```text
/api/ai/chat
```

### 功能

用户直接与 AI 对话，不一定绑定某篇文档。

### 权限

Demo 阶段无需登录。

### 请求参数

```json
{
  "session_id": "session_001",
  "message": "请解释一下什么是可执行文档。"
}
```

### 响应结果

```json
{
  "message_id": "msg_002",
  "answer": "可执行文档是指文档中不仅包含文字说明，还包含可以运行的代码、数据和结果。",
  "references": []
}
```

---

## 9.15 基于文档内容问答

### 方法

```text
POST
```

### 路径

```text
/api/ai/document-qa
```

### 功能

AI 基于文档内容回答用户问题。

### 权限

Demo 阶段无需登录。

### 请求参数

```json
{
  "document_id": "doc_001",
  "question": "这篇文档的核心结论是什么？",
  "scope": "current_document"
}
```

### scope 可选值

```text
current_document
document_tree
all_workspace
```

### 响应结果

```json
{
  "answer": "这篇文档的核心结论是：新型文档应该把写作、手写、代码执行、数据可视化和 AI 问答融合在一起。",
  "confidence": "high",
  "references": [
    {
      "doc_id": "doc_001",
      "block_id": "block_003",
      "block_type": "paragraph",
      "content_preview": "本文档提出一种 AI 原生交互式文档..."
    }
  ]
}
```

### 错误情况

```text
文档不存在
索引未生成
AI 服务调用失败
```

---

## 9.16 重建文档索引

### 方法

```text
POST
```

### 路径

```text
/api/rag/reindex
```

### 功能

将指定文档的 block 内容重新生成 embedding，并写入向量索引和关键词索引。

### 权限

Demo 阶段无需登录。

### 请求参数

```json
{
  "document_id": "doc_001"
}
```

### 响应结果

```json
{
  "success": true,
  "indexed_blocks": 12
}
```

---

## 9.17 搜索相关 Block

### 方法

```text
POST
```

### 路径

```text
/api/rag/search
```

### 功能

根据用户问题搜索相关文档 block。

### 权限

Demo 阶段无需登录。

### 请求参数

```json
{
  "document_id": "doc_001",
  "query": "代码块生成的图表说明了什么？",
  "scope": "document_tree",
  "top_k": 5
}
```

### 响应结果

```json
{
  "chunks": [
    {
      "doc_id": "doc_001",
      "block_id": "block_008",
      "block_type": "code",
      "score": 0.87,
      "content_preview": "Python 代码生成了季度营收数据..."
    }
  ]
}
```

---

## 10. AI 逻辑设计

## 10.1 AI 使用场景

### 场景 1：普通 AI 对话

用户在右侧 AI 侧边栏中直接提问。

示例：

```text
什么是 AI 原生文档？
```

AI 不一定检索当前文档，可以直接根据通用知识回答。

---

### 场景 2：基于当前文档提问

用户询问当前文档内容。

示例：

```text
总结一下这篇文档的核心观点。
```

AI 需要检索当前文档中的 block，并给出回答。

---

### 场景 3：基于当前文档树提问

用户在一个父文档下有多个子文档，希望 AI 综合回答。

示例：

```text
根据这个项目文件夹下的所有文档，总结我们的产品功能。
```

AI 检索当前文档及其子文档。

---

### 场景 4：基于全工作区提问

用户希望 AI 在全部文档中检索信息。

示例：

```text
我们整个项目目前有哪些核心功能？
```

AI 检索默认文档空间下的所有文档。

---

### 场景 5：解释代码块

用户选中某个代码块后，让 AI 解释代码。

示例：

```text
解释这个 Python 代码块在做什么。
```

AI 读取代码块内容和代码执行结果，生成解释。

---

### 场景 6：解释 3D 图表

用户向 AI 提问图表含义。

示例：

```text
这个 3D 图表说明了什么趋势？
```

AI 读取图表数据 JSON，而不是直接理解图像。

---

### 场景 7：内容改写

用户选中文档中的一段文字，让 AI 改写。

示例：

```text
把这段话改得更正式。
```

AI 返回改写建议，用户可以选择替换原文。

---

## 10.2 AI 处理流程

```text
接收用户输入
      ↓
判断 AI 任务类型
      ↓
判断是否需要检索文档
      ↓
如果需要，读取 document_id / block_id / scope
      ↓
执行 Block-aware Hierarchical RAG
      ↓
构造 Prompt
      ↓
调用 GLM-5.1
      ↓
解析模型输出
      ↓
返回 answer + references
      ↓
保存 AIMessage 和调用日志
```

---

## 10.3 Block-aware Hierarchical RAG 设计

本项目采用：

```text
Block-aware Hierarchical RAG
```

也就是：

> 以 block 作为基础索引单元，同时结合文档树、父级标题、相邻 block、文档摘要和文档路径，构造更完整的上下文，再交给 LLM 回答。

---

## 10.4 RAG 基础索引单元

基础索引单元是：

```text
block
```

每一个可被 AI 检索的内容块都需要转换为可索引文本。

包括：

```text
paragraph
heading
table
todo
code
chart_3d
whiteboard_caption
document_link
quote
audio
video
```

注意：

白板内容本阶段不做 AI 图像理解，只索引白板标题、说明或用户手动填写的 caption。

---

## 10.5 RAG 检索范围控制

用户提问时，可以选择或默认使用以下范围：

### current_document

只检索当前打开的文档。

适合：

```text
总结这篇文档
解释当前文档中的代码
分析当前文档中的图表
```

### document_tree

检索当前文档及其所有子文档。

适合：

```text
总结这个项目文件夹
分析这个产品设计目录下的所有内容
```

### all_workspace

检索默认文档空间下的所有文档。

虽然本项目不做多个 Workspace，但仍保留 `all_workspace` 这个范围名称，用来表示“全部文档”。

适合：

```text
整个项目有哪些模块？
我们之前在哪篇文档里写过代码执行方案？
```

---

## 10.6 RAG 检索方式

本项目采用混合检索：

### 1. 向量检索

用于语义相似度召回。

示例：

```text
用户问：这个产品的核心创新点是什么？
```

即使原文没有出现“创新点”这个词，也可以召回相关 block。

### 2. 关键词检索 BM25

用于精确关键词匹配。

示例：

```text
用户问：Pyodide 是在哪里提到的？
```

BM25 可以更好地召回包含 `Pyodide` 的 block。

### 3. 元数据过滤

根据文档范围和 block 类型过滤候选内容。

元数据包括：

```text
document_id
block_id
block_type
heading_path
document_path
created_at
updated_at
```

示例：

```text
只检索当前文档
只检索 code 类型 block
只检索 chart_3d 类型 block
只检索当前文档树
```

### 4. reranker 重排

将向量检索和 BM25 检索得到的候选 block 合并后，使用 reranker 对结果重新排序，选出最相关的 top_k block。

---

## 10.7 RAG 上下文扩展

RAG 不只把命中的 block 交给 LLM，而是要扩展上下文。

上下文包括：

### 1. 命中 block

检索系统直接命中的 block。

### 2. 相邻 block

包括命中 block 的前一个和后一个 block。

目的：

```text
避免单个 block 信息过短，导致上下文断裂。
```

### 3. 父级 heading

获取命中 block 所属的标题层级。

示例：

```text
项目设计 / 核心功能 / Python 可执行代码块
```

### 4. 当前文档摘要

给 LLM 提供当前文档的整体背景。

### 5. 文档路径

告诉 LLM 当前内容来自哪篇文档、哪个文档层级。

示例：

```text
项目总览 / 技术实现 / RAG 设计
```

---

## 10.8 RAG 完整流程

```text
用户在 AI 侧边栏输入问题
      ↓
前端发送 question + document_id + scope
      ↓
后端判断检索范围
      ↓
读取当前文档 / 当前文档树 / 全部文档
      ↓
对用户问题生成 query embedding
      ↓
执行向量检索
      ↓
执行 BM25 关键词检索
      ↓
执行元数据过滤
      ↓
合并候选 block
      ↓
reranker 重排
      ↓
取 top_k 命中 block
      ↓
扩展相邻 block
      ↓
补充父级 heading
      ↓
补充当前文档摘要
      ↓
补充文档路径
      ↓
构造 Knowledge Context
      ↓
调用 GLM-5.1
      ↓
解析 JSON 输出
      ↓
返回 answer + references
      ↓
前端展示答案和引用来源
```

---

## 10.9 不同 Block 的索引策略

### paragraph / heading

直接使用正文内容。

```text
这是一个普通段落。
```

### table

转换成 Markdown 表格或文本摘要。

```text
表格：季度收入
Q1 产品A 120
Q2 产品A 180
Q3 产品A 210
```

### todo

转换成任务文本。

```text
待办事项：完成 Demo 剧本，状态：未完成
```

### code

索引代码和执行结果摘要。

```text
Python 代码块：
代码功能：生成季度收入数据。
运行结果：输出 Q1-Q4 的产品收入。
```

### chart_3d

索引图表数据摘要。

```text
3D 图表：
展示产品A、产品B在不同季度的收入变化。
```

### whiteboard

本阶段不做 AI 理解，只索引用户手动填写的标题或说明。

```text
白板块：商业模式推导图。
说明：用户手写了从用户需求到产品功能的推导过程。
```

### document_link

索引目标文档标题和路径。

```text
文档链接：
目标文档：技术架构文档
路径：项目总览 / 技术实现 / 技术架构文档
```

### audio

索引音频文件名和用户填写的描述文字。本阶段不做音频内容识别（ASR）。

```text
音频块：会议录音.mp3
描述：产品需求讨论会议的录音
```

### video

索引视频文件名和用户填写的描述文字。本阶段不做视频内容理解。

```text
视频块：产品演示.mp4
描述：产品功能演示视频
```

---

## 10.10 Prompt 结构

### System Prompt

```text
你是一个 AI 原生文档助手。
你需要根据用户问题和文档内容进行回答。

如果提供了文档上下文，你必须优先基于文档内容回答。
如果文档内容不足，请明确说明无法从当前文档中确定。
回答要清晰、准确、简洁。
如果使用了文档内容，必须返回引用来源。

你不能编造文档中不存在的信息。
```

### Knowledge Context

```text
以下是从文档中检索到的相关内容：

[1]
doc_id: doc_001
document_path: 项目总览 / 产品设计
heading_path: 核心功能 / 可执行代码块
block_id: block_003
block_type: paragraph
content: 本项目是一种 AI 原生交互式文档...

[2]
doc_id: doc_001
document_path: 项目总览 / 技术实现
heading_path: 代码执行 / Pyodide
block_id: block_008
block_type: code
content: Python 代码生成了季度收入数据...
```

### User Input

```text
用户问题：
这篇文档的核心结论是什么？
```

### Output Format

```json
{
  "type": "document_qa",
  "answer": "",
  "confidence": "high | medium | low",
  "reason": "",
  "references": [
    {
      "doc_id": "",
      "document_path": "",
      "block_id": "",
      "block_type": "",
      "content_preview": ""
    }
  ]
}
```

---

## 11. 代码执行设计

## 11.1 MVP 执行方式

本阶段建议优先使用：

```text
前端 Pyodide 执行 Python
```

优点：

1. 不需要后端沙箱；
2. 安全风险较低；
3. 适合比赛 Demo；
4. 可以快速展示“文档中运行代码”的效果。

---

## 11.2 增强版执行方式

后续可以升级为：

```text
后端 Python Worker / Docker Sandbox
```

执行流程：

```text
用户点击运行
      ↓
前端发送代码到后端
      ↓
后端创建隔离执行环境
      ↓
限制 CPU / 内存 / 时间 / 网络
      ↓
执行代码
      ↓
捕获 stdout / stderr / result
      ↓
保存执行记录
      ↓
返回前端展示
```

---

## 11.3 安全限制

代码执行必须限制：

1. 最大运行时间，例如 5 秒；
2. 最大内存占用；
3. 禁止访问系统敏感路径；
4. 默认禁止联网；
5. 禁止执行 shell 命令；
6. 保存执行日志；
7. 执行失败时返回清晰错误信息。

---

## 12. 3D 图表设计

## 12.1 数据来源

3D 图表块支持以下数据来源：

1. 用户手动输入数据；
2. 从表格块导入数据；
3. 从 Python 代码块输出结果导入数据；
4. 从 CSV 文件导入数据，后续增强。

---

## 12.2 图表生成流程

```text
用户选择“插入 3D 图表”
      ↓
选择数据来源
      ↓
系统解析数据
      ↓
生成 chart_config
      ↓
前端使用 Plotly / ECharts GL 渲染
      ↓
保存 chart_config 到数据库
```

---

## 12.3 图表配置示例

```json
{
  "type": "3d_bar",
  "title": "产品季度收入对比",
  "x_axis": "季度",
  "y_axis": "产品",
  "z_axis": "收入",
  "data": {
    "x": ["Q1", "Q2", "Q3", "Q4"],
    "y": ["产品A", "产品B"],
    "z": [
      [120, 180, 210, 260],
      [90, 130, 170, 200]
    ]
  }
}
```

---

## 13. 白板块设计

## 13.1 核心能力

白板块用于在文档中嵌入一个可交互画布。

MVP 支持：

1. 电脑端鼠标绘制；
2. 移动端手指简单涂画；
3. 橡皮擦；
4. 撤销和重做；
5. 简单图形；
6. 文本标注；
7. 保存和重新加载；
8. 导出预览图。

---

## 13.2 暂不实现能力

本阶段不实现：

1. 电容笔压感；
2. 专业手写笔迹优化；
3. 手写识别；
4. 白板内容 AI 理解；
5. 类 Notability 的完整批注体验；
6. 多人协作白板。

---

## 13.3 数据保存方式

白板不保存成图片，而是保存成路径数组 JSON。

```json
[
  {
    "tool": "pen",
    "pts": [
      {"x": 10, "y": 20},
      {"x": 15, "y": 25},
      {"x": 20, "y": 30}
    ]
  },
  {
    "tool": "eraser",
    "pts": [
      {"x": 50, "y": 60},
      {"x": 55, "y": 65}
    ]
  }
]
```

每条路径包含：
- `tool`：工具类型，`pen`（画笔，黑色线宽 2）或 `eraser`（橡皮，白色线宽 20）
- `pts`：坐标点数组，每个点包含 `x` 和 `y`

图片只作为预览，不作为主数据。

---

## 14. 文档编辑器设计

## 14.1 文档页面模型

本项目中的文档都是页面。

每个页面包含：

```text
标题
图标
封面，可选
正文 blocks
父级文档
子级文档
文档路径
```

示例：

```text
/documents/doc_001
/documents/doc_002
/documents/doc_003
```

---

## 14.2 Block 模型

整个文档由多个 block 组成。

```text
Document
  ├── Block 1: heading_1
  ├── Block 2: paragraph
  ├── Block 3: table
  ├── Block 4: whiteboard
  ├── Block 5: code
  └── Block 6: chart_3d
```

---

## 14.3 `/` 命令菜单

用户输入 `/` 后出现插入菜单。

支持选项：

```text
标题 1
标题 2
标题 3
正文
项目符号列表
编号列表
Todo List
表格
引用
分割线
代码块
白板
3D 图表
图片
文件
音频
视频
链接到文档
AI 回答块
```

---

## 14.4 文档链接

支持在一个文档中插入另一个文档的链接。

```text
@产品需求文档
@技术架构文档
@Demo 剧本
```

点击后跳转到对应文档页面。

---

## 14.5 文档树

文档以树状结构存在。

```text
默认文档空间
  ├── 项目总览
  ├── 产品设计
  │   ├── 用户需求
  │   ├── 功能模块
  │   └── Demo 剧本
  └── 技术实现
      ├── 前端架构
      ├── 后端架构
      └── AI 逻辑
```

注意：

本项目不做多个 Workspace，但为了表达“所有文档的整体空间”，可以在界面或代码中称为：

```text
默认文档空间
```

或者：

```text
Default Workspace
```

但数据库中不需要单独设计 Workspace 表。

---

## 15. 环境变量

| 变量名                      | 用途                                  | 是否必填 |
| ------------------------ | ----------------------------------- | ---- |
| `DATABASE_URL`           | PostgreSQL 数据库连接地址                  | 是    |
| `FRONTEND_URL`           | 前端地址                                | 是    |
| `BACKEND_URL`            | 后端地址                                | 是    |
| `LLM_API_KEY`            | GLM-5.1 API Key                     | 是    |
| `LLM_BASE_URL`           | LLM 服务地址                            | 是    |
| `LLM_MODEL`              | 使用的 LLM 模型名，例如 GLM-5.1              | 是    |
| `EMBEDDING_API_KEY`      | Qwen Embedding API Key              | 是    |
| `EMBEDDING_MODEL`        | Embedding 模型名称，例如 text-embedding-v4 | 是    |
| `RERANKER_API_KEY`       | Reranker 服务 API Key                 | 否    |
| `RERANKER_MODEL`         | Reranker 模型名称                       | 否    |
| `REDIS_URL`              | Redis 地址                            | 否    |
| `FILE_STORAGE_TYPE`      | 文件存储类型，local / s3 / oss             | 是    |
| `LOCAL_STORAGE_PATH`     | 本地文件存储路径                            | 否    |
| `S3_BUCKET`              | S3 bucket 名称                        | 否    |
| `S3_ACCESS_KEY`          | S3 Access Key                       | 否    |
| `S3_SECRET_KEY`          | S3 Secret Key                       | 否    |
| `CODE_EXECUTION_MODE`    | 代码执行模式，pyodide / backend            | 是    |
| `CODE_EXECUTION_TIMEOUT` | 代码执行超时时间                            | 是    |
| `LOG_LEVEL`              | 日志等级                                | 否    |

