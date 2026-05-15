#!/usr/bin/env python3
"""
数据库初始化脚本

功能：
1. 连接 PostgreSQL 数据库
2. 创建 aidoc 数据库（如不存在）
3. 启用 vector 扩展
4. 创建所有数据表
5. 插入初始种子数据
"""

import asyncio
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine
from loguru import logger

from app.config import settings
from app.database import Base


async def create_database_if_not_exists():
    """创建数据库（如果不存在）"""
    # 从 DATABASE_URL 中提取数据库名
    db_url = settings.DATABASE_URL
    # 格式: postgresql+asyncpg://user:password@host:port/dbname
    # 提取 dbname
    db_name = db_url.split("/")[-1]
    # 构建连接到默认 postgres 数据库的 URL
    base_url = db_url.rsplit("/", 1)[0] + "/postgres"

    logger.info(f"检查数据库 '{db_name}' 是否存在...")

    try:
        # 连接到 postgres 数据库
        conn = await asyncpg.connect(base_url.replace("postgresql+asyncpg", "postgresql"))

        # 检查数据库是否存在
        result = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", db_name
        )

        if not result:
            # 创建数据库
            await conn.execute(f'CREATE DATABASE "{db_name}"')
            logger.info(f"数据库 '{db_name}' 创建成功")
        else:
            logger.info(f"数据库 '{db_name}' 已存在")

        await conn.close()
    except Exception as e:
        logger.error(f"创建数据库失败: {e}")
        raise


async def enable_vector_extension():
    """启用 pgvector 扩展"""
    logger.info("正在启用 pgvector 扩展...")

    try:
        # 连接到 aidoc 数据库
        conn = await asyncpg.connect(settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql"))

        # 启用 vector 扩展
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        logger.info("pgvector 扩展启用成功")

        await conn.close()
    except Exception as e:
        logger.error(f"启用 pgvector 扩展失败: {e}")
        raise


async def create_tables():
    """创建所有数据表"""
    logger.info("正在创建数据表...")

    try:
        # 导入所有模型
        from app.models import document, document_block, whiteboard_data, chart_3d
        from app.models import ai_chat, ai_message, knowledge_chunk, document_summary
        from app.models import code_execution, file_asset, system_log

        # 创建异步引擎
        engine = create_async_engine(settings.DATABASE_URL)

        # 创建所有表
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        logger.info("数据表创建成功")

        await engine.dispose()
    except Exception as e:
        logger.error(f"创建数据表失败: {e}")
        raise


async def insert_seed_data():
    """插入初始种子数据"""
    logger.info("正在插入种子数据...")

    try:
        # 调用 seed_data 脚本
        from scripts.seed_data import seed_all
        await seed_all()
        logger.info("种子数据插入成功")
    except Exception as e:
        logger.error(f"插入种子数据失败: {e}")
        raise


async def main():
    """主函数"""
    logger.info("=" * 50)
    logger.info("AIDoc 数据库初始化")
    logger.info("=" * 50)

    try:
        # 1. 创建数据库
        await create_database_if_not_exists()

        # 2. 启用 vector 扩展
        await enable_vector_extension()

        # 3. 创建数据表
        await create_tables()

        # 4. 插入种子数据
        await insert_seed_data()

        logger.info("=" * 50)
        logger.info("数据库初始化完成！")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
