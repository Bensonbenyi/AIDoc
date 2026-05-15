#!/usr/bin/env python3
"""
RAG 测试数据脚本

插入少量文档和 block，然后建立 RAG 索引，用于测试检索功能。
"""

import asyncio
import sys
import os
from datetime import datetime
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from loguru import logger

from app.config import settings
from app.models.document import Document
from app.models.document_block import DocumentBlock


# 测试文档数据
RAG_TEST_DOCS = [
    {
        "title": "Python 数据分析入门",
        "icon": "🐍",
        "blocks": [
            {"type": "heading_1", "content": {"text": "Python 数据分析入门指南"}},
            {"type": "paragraph", "content": {"text": "Python 是数据分析领域最流行的编程语言之一。它拥有丰富的第三方库生态，包括 NumPy、Pandas、Matplotlib 等，能够高效地完成数据清洗、转换、统计和可视化任务。"}},
            {"type": "heading_2", "content": {"text": "核心库介绍"}},
            {"type": "paragraph", "content": {"text": "NumPy 是 Python 科学计算的基础包，提供了高性能的多维数组对象和运算工具。Pandas 基于 NumPy 构建，提供了 DataFrame 数据结构，非常适合处理表格数据。Matplotlib 是最常用的绘图库，支持折线图、柱状图、散点图等多种图表类型。"}},
            {"type": "code", "content": {"language": "python", "code": "import pandas as pd\nimport numpy as np\n\n# 创建 DataFrame\ndf = pd.DataFrame({\n    '姓名': ['张三', '李四', '王五'],\n    '年龄': [25, 30, 28],\n    '城市': ['北京', '上海', '深圳']\n})\nprint(df.describe())"}},
            {"type": "heading_2", "content": {"text": "数据清洗"}},
            {"type": "paragraph", "content": {"text": "数据清洗是数据分析中最耗时的步骤。常见的操作包括：处理缺失值（填充或删除）、去除重复数据、数据类型转换、异常值检测等。Pandas 提供了 dropna()、fillna()、duplicated() 等便捷方法。"}},
            {"type": "table", "content": {"headers": ["函数", "用途", "示例"], "rows": [["dropna()", "删除缺失值", "df.dropna()"], ["fillna()", "填充缺失值", "df.fillna(0)"], ["duplicated()", "检测重复行", "df.duplicated()"], ["astype()", "类型转换", "df['age'].astype(int)"]]}},
        ],
    },
    {
        "title": "机器学习基础概念",
        "icon": "🤖",
        "blocks": [
            {"type": "heading_1", "content": {"text": "机器学习基础概念"}},
            {"type": "paragraph", "content": {"text": "机器学习是人工智能的一个分支，它让计算机能够从数据中自动学习规律，而无需显式编程。机器学习主要分为三类：监督学习、无监督学习和强化学习。"}},
            {"type": "heading_2", "content": {"text": "监督学习"}},
            {"type": "paragraph", "content": {"text": "监督学习是最常见的机器学习类型。它使用带有标签的训练数据来学习输入和输出之间的映射关系。常见的监督学习任务包括分类（如垃圾邮件检测）和回归（如房价预测）。常用算法有线性回归、决策树、随机森林、支持向量机和神经网络。"}},
            {"type": "heading_2", "content": {"text": "无监督学习"}},
            {"type": "paragraph", "content": {"text": "无监督学习处理没有标签的数据，目标是发现数据中的隐藏模式和结构。聚类是最常见的无监督学习任务，K-Means 和 DBSCAN 是常用的聚类算法。降维（如 PCA）也是无监督学习的重要应用。"}},
            {"type": "code", "content": {"language": "python", "code": "from sklearn.cluster import KMeans\nfrom sklearn.datasets import make_blobs\n\n# 生成模拟数据\nX, y = make_blobs(n_samples=300, centers=4, random_state=42)\n\n# 训练 K-Means 模型\nkmeans = KMeans(n_clusters=4, random_state=42)\nkmeans.fit(X)\n\nprint(f'聚类中心: {kmeans.cluster_centers_}')"}},
            {"type": "heading_2", "content": {"text": "模型评估"}},
            {"type": "paragraph", "content": {"text": "评估模型性能是机器学习的关键步骤。分类任务常用准确率、精确率、召回率和 F1 分数。回归任务常用均方误差（MSE）和决定系数（R²）。交叉验证是一种可靠的评估方法，可以避免过拟合。"}},
        ],
    },
    {
        "title": "Web 全栈开发技术",
        "icon": "🌐",
        "blocks": [
            {"type": "heading_1", "content": {"text": "Web 全栈开发技术栈"}},
            {"type": "paragraph", "content": {"text": "全栈开发是指同时掌握前端和后端技术的开发能力。现代全栈开发通常涉及 HTML/CSS/JavaScript 前端技术、Node.js 或 Python 后端框架、数据库管理以及部署运维等。"}},
            {"type": "heading_2", "content": {"text": "前端技术"}},
            {"type": "paragraph", "content": {"text": "React 是目前最流行的前端框架，由 Meta 维护。它采用组件化开发模式，使用虚拟 DOM 提高渲染性能。Next.js 是基于 React 的全栈框架，支持服务端渲染（SSR）和静态生成（SSG），内置路由和 API 路由功能。TypeScript 为 JavaScript 添加了静态类型检查，提高了代码的可维护性。"}},
            {"type": "heading_2", "content": {"text": "后端技术"}},
            {"type": "paragraph", "content": {"text": "FastAPI 是 Python 生态中性能最好的 Web 框架之一，基于 Starlette 和 Pydantic 构建。它支持异步处理、自动 API 文档生成、请求参数校验等功能。SQLAlchemy 是 Python 最流行的 ORM 框架，2.0 版本全面支持异步操作。PostgreSQL 是功能最强大的开源关系型数据库，pgvector 扩展使其支持向量检索。"}},
            {"type": "code", "content": {"language": "python", "code": "from fastapi import FastAPI\nfrom pydantic import BaseModel\n\napp = FastAPI()\n\nclass User(BaseModel):\n    name: str\n    email: str\n\n@app.post('/users')\nasync def create_user(user: User):\n    return {'message': f'用户 {user.name} 创建成功'}"}},
            {"type": "heading_2", "content": {"text": "部署与运维"}},
            {"type": "paragraph", "content": {"text": "Docker 容器化是现代应用部署的标准方式。docker-compose 可以编排多个服务（前端、后端、数据库）。CI/CD 流水线通过 GitHub Actions 等工具实现自动化测试和部署。Nginx 作为反向代理服务器处理请求转发和负载均衡。"}},
        ],
    },
]


async def seed_rag_test():
    """插入 RAG 测试数据并建立索引"""

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # 检查是否已有同名文档
            from sqlalchemy import select
            existing = await session.execute(
                select(Document).where(Document.title == "Python 数据分析入门")
            )
            if existing.scalar_one_or_none():
                logger.info("RAG 测试数据已存在，跳过插入")
                # 直接跳到索引步骤
                await engine.dispose()
                await build_index()
                return

            logger.info("开始插入 RAG 测试数据...")

            doc_ids = []
            for i, doc_data in enumerate(RAG_TEST_DOCS):
                doc_id = uuid4()
                doc = Document(
                    id=doc_id,
                    title=doc_data["title"],
                    icon=doc_data["icon"],
                    sort_order=float(i),
                    path=doc_data["title"],
                    is_deleted=False,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(doc)
                doc_ids.append(doc_id)

                for j, block_data in enumerate(doc_data["blocks"]):
                    block = DocumentBlock(
                        id=uuid4(),
                        document_id=doc_id,
                        block_type=block_data["type"],
                        content=block_data["content"],
                        sort_order=float(j + 1),
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    session.add(block)

                logger.info(f"  创建文档: {doc_data['title']} ({len(doc_data['blocks'])} 个 block)")

            await session.commit()
            logger.info(f"RAG 测试数据插入完成: {len(RAG_TEST_DOCS)} 个文档")

        except Exception as e:
            await session.rollback()
            logger.error(f"插入失败: {e}")
            raise
        finally:
            await engine.dispose()

    # 建立 RAG 索引
    await build_index()


async def build_index():
    """为所有文档建立 RAG 索引"""

    logger.info("开始建立 RAG 索引...")

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        from app.services.rag_service import rag_service

        try:
            count = await rag_service.reindex_all(session)
            await session.commit()
            logger.info(f"RAG 索引建立完成: {count} 个文档")
        except Exception as e:
            await session.rollback()
            logger.error(f"索引建立失败: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_rag_test())
