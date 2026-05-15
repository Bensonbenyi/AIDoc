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

    # 文档结构定义
    doc_structure = {
        "项目总览": {
            "icon": "📋",
            "children": {
                "产品设计": {
                    "icon": "🎨",
                    "children": {
                        "用户需求": {"icon": "👥"},
                        "功能模块": {"icon": "🧩"},
                        "Demo 剧本": {"icon": "📝"},
                    }
                },
                "技术实现": {
                    "icon": "⚙️",
                    "children": {
                        "前端架构": {"icon": "🖥️"},
                        "后端架构": {"icon": "🔧"},
                        "AI 逻辑": {"icon": "🤖"},
                    }
                }
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

    # 为"项目总览"文档创建 blocks
    project_doc = documents.get("项目总览")
    if project_doc:
        blocks = [
            DocumentBlock(
                id=str(uuid4()),
                document_id=project_doc.id,
                block_type="heading_1",
                content={"text": "AI 原生交互式文档系统"},
                sort_order=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=project_doc.id,
                block_type="paragraph",
                content={"text": "这是一款创新的文档系统，将写作、代码执行、数据可视化和 AI 问答融为一体。"},
                sort_order=2,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=project_doc.id,
                block_type="heading_2",
                content={"text": "核心功能"},
                sort_order=3,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=project_doc.id,
                block_type="bullet_list",
                content={"items": ["块状文档编辑器", "交互式白板块", "Python 可执行代码块", "3D 图表块", "AI 对话侧边栏"]},
                sort_order=4,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=project_doc.id,
                block_type="heading_2",
                content={"text": "技术栈"},
                sort_order=5,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=project_doc.id,
                block_type="table",
                content={
                    "headers": ["模块", "技术", "说明"],
                    "rows": [
                        ["前端", "Next.js + React", "用户界面框架"],
                        ["后端", "FastAPI + Python", "API 服务"],
                        ["数据库", "PostgreSQL + pgvector", "数据存储和向量检索"],
                        ["AI", "智谱 AI GLM-5.1", "大语言模型"],
                    ]
                },
                sort_order=6,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
        ]

        for block in blocks:
            session.add(block)

    # 为"用户需求"文档创建 blocks
    user_needs_doc = documents.get("用户需求")
    if user_needs_doc:
        blocks = [
            DocumentBlock(
                id=str(uuid4()),
                document_id=user_needs_doc.id,
                block_type="heading_1",
                content={"text": "用户需求分析"},
                sort_order=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=user_needs_doc.id,
                block_type="heading_2",
                content={"text": "目标用户"},
                sort_order=2,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=user_needs_doc.id,
                block_type="paragraph",
                content={"text": "主要面向需要编写技术文档、数据分析报告和产品设计文档的知识工作者。"},
                sort_order=3,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=user_needs_doc.id,
                block_type="todo",
                content={"text": "完成用户调研", "checked": True},
                sort_order=4,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=user_needs_doc.id,
                block_type="todo",
                content={"text": "整理需求文档", "checked": False},
                sort_order=5,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
        ]

        for block in blocks:
            session.add(block)

    # 为"前端架构"文档创建 blocks
    frontend_doc = documents.get("前端架构")
    if frontend_doc:
        blocks = [
            DocumentBlock(
                id=str(uuid4()),
                document_id=frontend_doc.id,
                block_type="heading_1",
                content={"text": "前端架构设计"},
                sort_order=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=frontend_doc.id,
                block_type="paragraph",
                content={"text": "前端采用 Next.js 14 App Router，使用 React Server Components 和 Client Components 混合架构。"},
                sort_order=2,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=frontend_doc.id,
                block_type="code",
                content={
                    "language": "typescript",
                    "code": "// 示例：文档编辑器组件\nexport function DocumentEditor({ docId }: { docId: string }) {\n  const { blocks, loading } = useDocument(docId);\n  \n  if (loading) return <Loading />;\n  \n  return (\n    <div className=\"editor\">\n      {blocks.map(block => (\n        <BlockRenderer key={block.id} block={block} />\n      ))}\n    </div>\n  );\n}"
                },
                sort_order=3,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
        ]

        for block in blocks:
            session.add(block)

    # 为"后端架构"文档创建 blocks
    backend_doc = documents.get("后端架构")
    if backend_doc:
        blocks = [
            DocumentBlock(
                id=str(uuid4()),
                document_id=backend_doc.id,
                block_type="heading_1",
                content={"text": "后端架构设计"},
                sort_order=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=backend_doc.id,
                block_type="paragraph",
                content={"text": "后端采用 FastAPI 框架，使用 SQLAlchemy 2.0 异步 ORM，PostgreSQL 作为主数据库。"},
                sort_order=2,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            DocumentBlock(
                id=str(uuid4()),
                document_id=backend_doc.id,
                block_type="code",
                content={
                    "language": "python",
                    "code": "# 示例：文档 API 路由\nfrom fastapi import APIRouter, Depends\nfrom sqlalchemy.ext.asyncio import AsyncSession\n\nrouter = APIRouter()\n\n@router.post(\"/documents\")\nasync def create_document(\n    data: DocumentCreate,\n    db: AsyncSession = Depends(get_db)\n):\n    doc = await document_service.create_document(db, data)\n    return doc"
                },
                sort_order=3,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
        ]

        for block in blocks:
            session.add(block)

    logger.info(f"创建了 {len(documents)} 个文档")
