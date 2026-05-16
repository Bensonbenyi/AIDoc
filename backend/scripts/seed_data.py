#!/usr/bin/env python3
"""
种子数据脚本

插入 Demo 用的初始文档和 block 数据
"""

import asyncio
import sys
import os
from datetime import datetime
from uuid import uuid4

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from loguru import logger

from app.config import settings
from app.models.document import Document
from app.models.document_block import DocumentBlock


async def seed_all():
    """插入所有种子数据"""

    # 创建异步引擎和会话工厂
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # 检查是否已有数据
            from sqlalchemy import select, func
            result = await session.execute(select(func.count()).select_from(Document))
            count = result.scalar()

            if count > 0:
                logger.info("数据库中已有数据，跳过种子数据插入")
                return

            logger.info("开始插入种子数据...")

            # 创建文档树
            documents = await create_document_tree(session)

            # 创建 block 数据
            await create_blocks(session, documents)

            await session.commit()
            logger.info("种子数据插入完成")

        except Exception as e:
            await session.rollback()
            logger.error(f"插入种子数据失败: {e}")
            raise
        finally:
            await engine.dispose()


async def create_document_tree(session: AsyncSession) -> dict:
    """创建文档树结构"""

    # 文档结构定义（精简版，3 个文档）
    doc_structure = {
        "AIDoc 使用指南": {
            "icon": "📋",
            "children": {
                "功能演示": {"icon": "🎯"},
                "数据分析示例": {"icon": "📊"},
            }
        }
    }

    documents = {}

    async def create_doc(title: str, icon: str, parent_id: str = None, path: str = "") -> Document:
        """递归创建文档"""
        doc_id = str(uuid4())
        current_path = f"{path} / {title}" if path else title

        doc = Document(
            id=doc_id,
            parent_id=parent_id,
            title=title,
            icon=icon,
            sort_order=0,
            path=current_path,
            is_deleted=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(doc)
        documents[title] = doc

        return doc

    async def process_structure(structure: dict, parent_id: str = None, path: str = ""):
        """递归处理文档结构"""
        for title, config in structure.items():
            doc = await create_doc(title, config["icon"], parent_id, path)

            if "children" in config:
                await process_structure(config["children"], doc.id, doc.path)

    await process_structure(doc_structure)

    return documents


async def create_blocks(session: AsyncSession, documents: dict):
    """创建 block 数据"""

    # 为"AIDoc 使用指南"文档创建 blocks（展示所有 Block 类型）
    guide_doc = documents.get("AIDoc 使用指南")
    if guide_doc:
        blocks = [
            # [h1] AIDoc 使用指南
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="heading_1",
                content={"text": "AIDoc 使用指南"},
                sort_order=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [text] 欢迎文字
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="paragraph",
                content={"text": "欢迎使用 AIDoc，一款 AI 原生交互式文档系统。在这里，你可以在同一份文档中完成写作、代码执行、数据可视化和 AI 对话。本文档将展示系统支持的所有内容类型。"},
                sort_order=2,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [divider]
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="divider",
                content={},
                sort_order=3,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [h2] 基础内容
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="heading_2",
                content={"text": "基础内容"},
                sort_order=4,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [text] 基础内容介绍
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="paragraph",
                content={"text": "AIDoc 支持丰富的基础文本格式，包括多级标题、段落、列表、引用等。"},
                sort_order=5,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [h3] 待办事项
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="heading_3",
                content={"text": "待办事项"},
                sort_order=6,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [todo] 待办清单
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="todo",
                content={
                    "items": [
                        {"text": "了解 AIDoc 的基本功能", "done": True},
                        {"text": "尝试使用斜杠命令插入新 Block", "done": False},
                        {"text": "运行一段 Python 代码", "done": False},
                        {"text": "在白板上画一幅画", "done": False},
                        {"text": "向 AI 助手提一个问题", "done": False},
                    ]
                },
                sort_order=7,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [h3] 表格
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="heading_3",
                content={"text": "表格"},
                sort_order=8,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [table] Block 类型一览
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="table",
                content={
                    "headers": ["类型", "图标", "说明", "交互方式"],
                    "rows": [
                        ["文本", "¶", "普通段落", "直接编辑"],
                        ["标题", "H", "三级标题", "直接编辑"],
                        ["待办", "☐", "待办清单", "勾选切换"],
                        ["表格", "▦", "数据表格", "单元格编辑"],
                        ["代码", "🐍", "Python 代码", "代码编辑器 + 运行"],
                        ["白板", "🎨", "手绘画布", "鼠标绘制"],
                        ["3D 图表", "📊", "数据可视化", "拖拽旋转"],
                        ["音频", "🎵", "音频播放", "播放控制"],
                        ["视频", "🎬", "视频播放", "播放控制"],
                    ]
                },
                sort_order=9,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [h3] 引用
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="heading_3",
                content={"text": "引用"},
                sort_order=10,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [quote] 设计理念引用
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="quote",
                content={"text": "\"最好的文档工具，是让你忘记工具本身的存在，专注于内容创作。\" — AIDoc 设计理念"},
                sort_order=11,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [divider]
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="divider",
                content={},
                sort_order=12,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [h2] 代码执行
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="heading_2",
                content={"text": "代码执行"},
                sort_order=13,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [text] 代码执行介绍
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="paragraph",
                content={"text": "AIDoc 内置 Python 代码执行环境。点击运行按钮，代码将在 Docker 沙箱中执行，结果直接显示在文档中。"},
                sort_order=14,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [code] Python 代码示例
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="code",
                content={
                    "language": "python",
                    "code": "import numpy as np\n\n# 生成一组随机数据\nnp.random.seed(42)\ntemperatures = np.random.normal(loc=25, scale=5, size=7)\ndays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']\n\nprint(\"🌡️ 本周每日气温（℃）\")\nprint(\"-\" * 30)\nfor day, temp in zip(days, temperatures):\n    bar = \"█\" * int(temp)\n    print(f\"{day}: {temp:.1f}℃ {bar}\")\n\nprint(f\"\\n平均气温: {temperatures.mean():.1f}℃\")\nprint(f\"最高气温: {temperatures.max():.1f}℃\")\nprint(f\"最低气温: {temperatures.min():.1f}℃\")"
                },
                sort_order=15,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [divider]
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="divider",
                content={},
                sort_order=16,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [h2] 3D 图表
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="heading_2",
                content={"text": "3D 图表"},
                sort_order=17,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [text] 3D 图表介绍
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="paragraph",
                content={"text": "表格数据和代码输出可以直接生成交互式 3D 图表。鼠标拖拽可以旋转视角，滚轮可以缩放。"},
                sort_order=18,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [chart3d] 示例图表
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="chart_3d",
                content={
                    "title": "季度销售数据 3D 柱状图",
                    "chartType": "bar",
                    "x": ["产品A", "产品B", "产品C"],
                    "y": ["Q1", "Q2", "Q3", "Q4"],
                    "z": [120, 95, 180, 150, 110, 200, 160, 175, 130, 220, 190, 145],
                    "xLabel": "产品",
                    "yLabel": "季度",
                    "zLabel": "销售额（万元）"
                },
                sort_order=19,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [divider]
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="divider",
                content={},
                sort_order=20,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [h2] 交互式白板
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="heading_2",
                content={"text": "交互式白板"},
                sort_order=21,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [text] 白板功能介绍
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="paragraph",
                content={"text": "白板功能允许你在文档中直接绘制草图、流程图和手写笔记。支持画笔、橡皮、撤销/重做等操作。拖动底部手柄可以调整高度。"},
                sort_order=22,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [whiteboard] 空白画布
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="whiteboard",
                content={"paths": []},
                sort_order=23,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [divider]
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="divider",
                content={},
                sort_order=24,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [h2] 多媒体支持
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="heading_2",
                content={"text": "多媒体支持"},
                sort_order=25,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [text] 多媒体介绍
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="paragraph",
                content={"text": "AIDoc 支持在文档中嵌入音频和视频文件，提供内联播放器，支持播放/暂停、进度拖拽、音量控制等功能。"},
                sort_order=26,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [audio] 示例音频（待上传）
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="audio",
                content={},
                sort_order=27,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [video] 示例视频（待上传）
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="video",
                content={},
                sort_order=28,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [divider]
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="divider",
                content={},
                sort_order=29,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [h2] AI 助手
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="heading_2",
                content={"text": "AI 助手"},
                sort_order=30,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [text] AI 助手介绍
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="paragraph",
                content={"text": "右侧 AI 助手面板是 AIDoc 的核心功能之一。你可以：\n1. 直接输入问题进行对话\n2. 将 Block 拖拽到聊天框作为上下文\n3. 点击 Block 工具栏的\"问 AI\"按钮，自动构造问题\n4. AI 回答中包含引用来源，点击可跳转到对应 Block"},
                sort_order=31,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # [ai-answer] 示例 AI 回答
            DocumentBlock(
                id=str(uuid4()),
                document_id=guide_doc.id,
                block_type="ai_answer",
                content={"text": "根据文档内容，AIDoc 支持 9 种 Block 类型，涵盖基础文本、代码执行、数据可视化和多媒体。核心差异化在于原生代码执行和深度 AI 集成。"},
                sort_order=32,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
        ]

        # 获取功能演示和数据分析示例文档的 ID，用于创建 doclink
        demo_doc = documents.get("功能演示")
        data_doc = documents.get("数据分析示例")

        if demo_doc:
            blocks.append(
                DocumentBlock(
                    id=str(uuid4()),
                    document_id=guide_doc.id,
                    block_type="link_to_document",
                    content={"targetDocId": str(demo_doc.id), "icon": "🎯", "title": "功能演示"},
                    sort_order=33,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
            )

        if data_doc:
            blocks.append(
                DocumentBlock(
                    id=str(uuid4()),
                    document_id=guide_doc.id,
                    block_type="link_to_document",
                    content={"targetDocId": str(data_doc.id), "icon": "📊", "title": "数据分析示例"},
                    sort_order=34,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
            )

        for block in blocks:
            session.add(block)

    # 为"功能演示"文档创建空 blocks
    demo_doc = documents.get("功能演示")
    if demo_doc:
        block = DocumentBlock(
            id=str(uuid4()),
            document_id=demo_doc.id,
            block_type="paragraph",
            content={"text": ""},
            sort_order=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(block)

    # 为"数据分析示例"文档创建空 blocks
    data_doc = documents.get("数据分析示例")
    if data_doc:
        block = DocumentBlock(
            id=str(uuid4()),
            document_id=data_doc.id,
            block_type="paragraph",
            content={"text": ""},
            sort_order=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(block)

    logger.info(f"创建了 {len(documents)} 个文档")
