import { DocumentTreeNode } from '@/types/document';
import { DocumentBlock, SlashMenuSection } from '@/types/block';

export const MOCK_TREE: DocumentTreeNode[] = [
  {
    id: 'overview',
    icon: '📋',
    title: '项目总览',
    children: [],
  },
  {
    id: 'design',
    icon: '🎨',
    title: '产品设计',
    isOpen: true,
    children: [
      { id: 'needs', icon: '📝', title: '用户需求', children: [] },
      { id: 'features', icon: '⚙️', title: '功能模块', children: [] },
      { id: 'demo', icon: '🎬', title: 'Demo 剧本', children: [] },
    ],
  },
  {
    id: 'tech',
    icon: '💻',
    title: '技术实现',
    isOpen: false,
    children: [
      { id: 'frontend', icon: '🖥️', title: '前端架构', children: [] },
      { id: 'code-exec', icon: '⚡', title: '代码执行方案', children: [] },
    ],
  },
];

export const SLASH_ITEMS: SlashMenuSection[] = [
  {
    sec: '基础内容',
    items: [
      { id: 'h1', icon: 'H₁', name: '标题 1', desc: '大标题，用于页面标题' },
      { id: 'h2', icon: 'H₂', name: '标题 2', desc: '中标题，用于章节' },
      { id: 'h3', icon: 'H₃', name: '标题 3', desc: '小标题，用于子章节' },
      { id: 'text', icon: '¶', name: '正文', desc: '普通文本段落' },
      { id: 'bullet', icon: '•', name: '项目符号列表', desc: '无序列表' },
      { id: 'numbered', icon: '1.', name: '编号列表', desc: '有序列表' },
      { id: 'todo', icon: '☐', name: 'Todo List', desc: '待办事项清单' },
      { id: 'table', icon: '▦', name: '表格', desc: '数据表格' },
      { id: 'quote', icon: '❝', name: '引用', desc: '引用文本' },
      { id: 'divider', icon: '—', name: '分割线', desc: '水平分割线' },
    ],
  },
  {
    sec: '高级内容',
    items: [
      { id: 'code', icon: '🐍', name: 'Python 代码块', desc: '可执行的 Python 代码' },
      { id: 'whiteboard', icon: '🎨', name: '交互式白板', desc: '手绘白板画布' },
      { id: 'chart3d', icon: '📊', name: '3D 图表', desc: '三维数据可视化' },
      { id: 'image', icon: '🖼️', name: '图片', desc: '插入图片' },
      { id: 'file', icon: '📎', name: '文件', desc: '附件文件' },
      { id: 'audio', icon: '🎵', name: '音频', desc: '内联音频播放器' },
      { id: 'video', icon: '🎬', name: '视频', desc: '内联视频播放器' },
      { id: 'doclink', icon: '🔗', name: '链接到文档', desc: '内部文档链接' },
      { id: 'ai-answer', icon: '✦', name: 'AI 回答块', desc: 'AI 生成的内容块' },
    ],
  },
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createMockBlocks(docId: string): DocumentBlock[] {
  const blocks: Record<string, DocumentBlock[]> = {
    design: [
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '核心功能定义' }, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '本文档定义了 AI 原生交互式文档系统的核心功能模块。系统采用三栏布局：左侧文档树导航、中间页面式编辑区、右侧 AI 对话侧边栏。' }, sortOrder: 1, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'todo', content: { items: [{ text: '完成产品需求分析', done: true }, { text: '定义核心 Block 类型', done: true }, { text: '设计 AI 侧边栏交互', done: false }, { text: '完成 Demo 剧本', done: false }] }, sortOrder: 2, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '功能模块概览' }, sortOrder: 3, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'table', content: { headers: ['模块', '优先级', '状态', '负责人'], rows: [['文档编辑器', 'P0', '✅ 已完成', '前端组'], ['AI 侧边栏', 'P0', '🔄 进行中', 'AI 组'], ['代码执行', 'P1', '📋 规划中', '后端组'], ['3D 图表', 'P1', '📋 规划中', '可视化组'], ['白板绘制', 'P2', '📋 规划中', '前端组']] }, sortOrder: 4, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '技术架构' }, sortOrder: 5, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'quote', content: { text: '系统围绕 Block 编辑、AI 对话、代码执行和可视化能力构建，优先保证文档编辑链路稳定可靠。' }, sortOrder: 6, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '前端采用 React + TypeScript 构建，编辑器基于 Block 编辑范式，支持多种内容块的插入和编辑。AI 能力通过后端 API 接入，支持流式输出和文档上下文问答。' }, sortOrder: 7, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: 'Python 代码执行' }, sortOrder: 9, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '系统支持在文档中直接运行 Python 代码，类似 Jupyter Notebook 的体验，但完全嵌入在文档编辑流程中。' }, sortOrder: 10, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'code', content: { language: 'python', code: `import pandas as pd\nimport numpy as np\n\n# 创建示例数据\ndata = {\n    '月份': ['1月', '2月', '3月', '4月', '5月', '6月'],\n    '用户数': [1200, 1800, 2400, 3100, 4200, 5600],\n    '收入(万)': [45, 68, 92, 125, 168, 224]\n}\n\ndf = pd.DataFrame(data)\nprint("📊 月度增长数据：")\nprint(df.to_string(index=False))\nprint(f"\\n📈 用户增长率: {((5600-1200)/1200*100):.1f}%")` }, sortOrder: 11, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '3D 数据可视化' }, sortOrder: 12, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '表格数据和代码运行结果可以直接生成 3D 图表，提供更直观的数据展示方式。' }, sortOrder: 13, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'chart3d', content: { title: '📊 季度业务数据', source: '数据来源：代码块 c1', chartType: 'bar', x: ['产品A', '产品B', '产品C', '产品D'], y: ['Q1', 'Q2', 'Q3'], z: [120, 95, 180, 140, 150, 110, 200, 160, 175, 130, 220, 190], xLabel: '产品', yLabel: '季度', zLabel: '销售额(万)' }, sortOrder: 14, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '交互式白板' }, sortOrder: 15, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '白板功能允许用户在文档中直接绘制草图、流程图和手写笔记，支持画笔、橡皮、撤销等基础操作。' }, sortOrder: 16, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'whiteboard', content: { paths: [] }, sortOrder: 17, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: 'AI 文档问答' }, sortOrder: 18, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: 'AI 侧边栏能够基于当前文档内容进行智能问答，支持文档和内容块引用，返回结果包含引用来源，点击引用可以定位到对应的文档块。' }, sortOrder: 19, createdAt: '', updatedAt: '' },
    ],
    needs: [
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '目标用户' }, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '本产品主要面向以下用户群体：' }, sortOrder: 1, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'bullet', content: { items: ['产品经理：需要撰写 PRD、需求文档，并进行数据分析', '技术团队：需要编写技术文档、运行代码验证方案', '数据分析师：需要整理数据报告、生成可视化图表', '学生/研究人员：需要撰写论文、整理研究笔记'] }, sortOrder: 2, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '核心需求场景' }, sortOrder: 3, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'todo', content: { items: [{ text: '场景 1：快速创建结构化文档', done: true }, { text: '场景 2：在文档中运行代码并查看结果', done: true }, { text: '场景 3：基于文档内容进行 AI 问答', done: false }, { text: '场景 4：数据可视化与 3D 图表', done: false }] }, sortOrder: 4, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '竞品分析' }, sortOrder: 5, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'table', content: { headers: ['产品', '优势', '不足', '我们的差异'], rows: [['Notion', '编辑体验好、生态丰富', '无代码执行、AI 能力弱', '原生代码执行 + 深度 AI'], ['AFFiNE', '开源、本地优先', 'AI 集成不够深入', '文档编辑 + AI 协作'], ['Jupyter', '代码执行强大', '非文档工具、协作弱', '文档 + 代码一体化'], ['Obsidian', '知识管理强', '无实时协作、无 AI', 'AI 原生 + 实时协作']] }, sortOrder: 6, createdAt: '', updatedAt: '' },
    ],
    features: [
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: 'Block 编辑器' }, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '编辑器采用 Block 编辑范式，每个内容单元都是一个独立的 Block。支持拖拽排序、类型转换、嵌套结构。' }, sortOrder: 1, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h3', content: { text: 'Block 类型清单' }, sortOrder: 2, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'table', content: { headers: ['Block 类型', '交互方式', '数据格式', '特殊能力'], rows: [['文本块', '直接编辑', '富文本', 'Markdown 快捷键'], ['Todo 块', '勾选切换', '布尔 + 文本', '进度统计'], ['表格块', '单元格编辑', '行列数据', '图表数据源'], ['代码块', '代码编辑器', 'Python 代码', '执行 + 输出'], ['白板块', '画布绘制', '路径数据', '展开/收起'], ['3D 图表块', '拖拽旋转', '3D 渲染', '多数据源']] }, sortOrder: 3, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: 'AI 集成方案' }, sortOrder: 4, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: 'AI 能力是产品的核心差异化特性。当前阶段使用前端引用内容和当前文档内容作为上下文，避免在正常编辑流程中引入额外后台任务。' }, sortOrder: 5, createdAt: '', updatedAt: '' },
    ],
    demo: [
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '演示流程' }, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'todo', content: { items: [{ text: '步骤 1：打开文档，展示三栏布局', done: true }, { text: '步骤 2：使用 / 命令插入代码块', done: true }, { text: '步骤 3：运行 Python 代码', done: false }, { text: '步骤 4：生成 3D 图表', done: false }, { text: '步骤 5：使用 AI 侧边栏问答', done: false }, { text: '步骤 6：点击引用定位到文档块', done: false }] }, sortOrder: 1, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '演示数据' }, sortOrder: 2, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'bullet', content: { items: ['示例文档树（5-8 个文档页面）', 'Python 数据分析代码（pandas + numpy）', '3D 柱状图数据（6 个月度数据点）', 'AI 问答示例问题和回答'] }, sortOrder: 3, createdAt: '', updatedAt: '' },
    ],
    overview: [
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '项目愿景' }, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '打造下一代 AI 原生文档工具，让用户在同一份文档中完成写作、数据分析、代码执行和可视化呈现。' }, sortOrder: 1, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '核心能力' }, sortOrder: 2, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'bullet', content: { items: ['Block 编辑：灵活的内容组织方式', '代码执行：在文档中直接运行 Python', '3D 图表：数据的立体可视化', 'AI 问答：基于文档内容的智能助手', '白板绘制：手绘草图和流程图'] }, sortOrder: 3, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '技术栈' }, sortOrder: 4, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'table', content: { headers: ['层级', '技术选型', '说明'], rows: [['前端框架', 'React + TypeScript', '组件化开发'], ['编辑器', 'Block 编辑范式', '参考 Notion 架构'], ['AI 引擎', 'LLM API', '文档上下文问答'], ['代码执行', 'Pyodide / 沙箱', '浏览器端 Python'], ['3D 渲染', 'Three.js / CSS 3D', '图表可视化']] }, sortOrder: 5, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'doclink', content: { targetDocId: 'design', icon: '🎨', title: '产品设计文档' }, sortOrder: 6, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'doclink', content: { targetDocId: 'tech', icon: '💻', title: '技术实现文档' }, sortOrder: 7, createdAt: '', updatedAt: '' },
    ],
    tech: [
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '系统架构' }, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '系统采用前后端分离架构，前端负责渲染和交互，后端提供 AI 能力和数据持久化。' }, sortOrder: 1, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '核心模块' }, sortOrder: 2, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'bullet', content: { items: ['编辑器引擎：Block CRUD + 序列化', 'AI 代理：文档上下文 + LLM 生成', '代码沙箱：Python 执行环境', '图表引擎：数据绑定 + 3D 渲染'] }, sortOrder: 3, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'doclink', content: { targetDocId: 'frontend', icon: '🖥️', title: '前端架构' }, sortOrder: 4, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'doclink', content: { targetDocId: 'code-exec', icon: '⚡', title: '代码执行方案' }, sortOrder: 6, createdAt: '', updatedAt: '' },
    ],
    frontend: [
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '技术选型' }, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'table', content: { headers: ['类别', '选型', '版本', '说明'], rows: [['框架', 'React', '18.x', '并发模式 + Suspense'], ['语言', 'TypeScript', '5.x', '类型安全'], ['状态', 'Zustand', '4.x', '轻量状态管理'], ['样式', 'Tailwind CSS', '3.x', '原子化 CSS'], ['构建', 'Next.js', '15.x', 'App Router']] }, sortOrder: 1, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '组件架构' }, sortOrder: 2, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '组件采用分层设计：原子组件 → 分子组件 → 有机体 → 模板 → 页面。每个 Block 类型对应一个独立的组件。' }, sortOrder: 3, createdAt: '', updatedAt: '' },
    ],
    'code-exec': [
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '执行环境' }, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '代码执行采用双层方案：浏览器端使用 Pyodide（WebAssembly），服务端使用 Docker 沙箱。' }, sortOrder: 1, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '功能特性' }, sortOrder: 2, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'bullet', content: { items: ['支持 Python 标准库和常用第三方库', '实时输出 stdout/stderr', '执行状态可视化', '运行耗时统计', '输出数据可传递给 3D 图表'] }, sortOrder: 3, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'h2', content: { text: '安全机制' }, sortOrder: 4, createdAt: '', updatedAt: '' },
      { id: uid(), documentId: docId, blockType: 'text', content: { text: '代码在隔离的沙箱环境中执行，限制网络访问、文件系统权限和执行时间。超时自动终止，防止资源滥用。' }, sortOrder: 5, createdAt: '', updatedAt: '' },
    ],
  };

  return blocks[docId] || blocks['design'];
}

export const MOCK_DOC_META: Record<string, { icon: string; title: string; desc: string }> = {
  design: { icon: '🎨', title: '产品设计', desc: 'AI 原生交互式文档系统的产品设计文档，包含核心功能定义、交互流程和视觉规范。' },
  needs: { icon: '📝', title: '用户需求', desc: '目标用户画像、核心需求场景和使用流程分析。' },
  features: { icon: '⚙️', title: '功能模块', desc: '各功能模块的详细设计和技术实现方案。' },
  demo: { icon: '🎬', title: 'Demo 剧本', desc: '产品演示脚本和关键交互流程设计。' },
  overview: { icon: '📋', title: '项目总览', desc: 'AI 原生交互式文档系统的项目概览和整体规划。' },
  tech: { icon: '💻', title: '技术实现', desc: '系统架构设计和技术实现方案。' },
  frontend: { icon: '🖥️', title: '前端架构', desc: '前端技术选型、组件设计和状态管理方案。' },
  'code-exec': { icon: '⚡', title: '代码执行方案', desc: 'Python 代码执行的技术实现和安全方案。' },
};

export const MOCK_AI_RESPONSES = [
  {
    text: '根据当前文档内容，这个产品设计包含以下核心模块：\n\n1. **Block 编辑器** — 支持文本、Todo、表格、代码等多种内容块\n2. **AI 侧边栏** — 基于文档内容的智能问答\n3. **Python 代码执行** — 嵌入式代码运行环境\n4. **3D 数据可视化** — 将表格和代码数据转为 3D 图表\n5. **交互式白板** — 手绘草图和流程图\n\n这些模块共同构成了一个 AI 原生的文档编辑体验。',
    citations: [
      { docId: 'design', blockId: 'features', path: '产品设计 / 功能模块概览' },
      { docId: 'design', blockId: 'arch', path: '产品设计 / 技术架构' },
    ],
    retrieval: '基于 5 个相关内容块生成',
  },
  {
    text: '从技术架构角度看，系统采用前后端分离设计：\n\n- **前端**：React + TypeScript，基于 Block 编辑范式\n- **AI 引擎**：通过文档上下文调用 LLM\n- **代码执行**：浏览器端 Pyodide + 服务端 Docker 沙箱\n\n当前阶段重点是保证文档编辑、删除、保存和引用问答流程稳定。',
    citations: [
      { docId: 'tech', blockId: 'modules', path: '技术实现 / 核心模块' },
      { docId: 'frontend', blockId: 'stack', path: '前端架构 / 技术选型' },
    ],
    retrieval: '已参考：当前文档内容',
  },
  {
    text: '用户需求分析表明，目标用户主要包括产品经理、技术团队和数据分析师。核心需求场景包括：\n\n- 快速创建结构化文档\n- 在文档中运行代码并查看结果\n- 基于文档内容进行 AI 问答\n- 数据可视化与 3D 图表\n\n相比竞品（Notion、AFFiNE、Jupyter），我们的核心差异化在于**原生代码执行 + 深度 AI 集成**。',
    citations: [
      { docId: 'needs', blockId: 'users', path: '用户需求 / 目标用户' },
      { docId: 'needs', blockId: 'scenarios', path: '用户需求 / 核心需求场景' },
    ],
    retrieval: '基于 4 个相关内容块生成',
  },
];

export const DOC_HEADER_META: Record<string, { icon: string; title: string; desc: string }> = MOCK_DOC_META;
