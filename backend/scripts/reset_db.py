#!/usr/bin/env python3
"""
数据库重置脚本

功能：
1. 清空所有数据表
2. 重新插入种子数据
"""

import asyncio
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from loguru import logger

from app.config import settings


async def reset_database():
    """清空所有数据表"""
    logger.info("正在清空数据库...")

    try:
        # 创建异步引擎
        engine = create_async_engine(settings.DATABASE_URL)

        async with engine.begin() as conn:
            # 按照外键依赖顺序删除数据
            tables_to_clear = [
                "ai_messages",
                "ai_chat_sessions",
                "code_executions",
                "chart_3d",
                "whiteboard_data",
                "file_assets",
                "document_blocks",
                "documents",
                "system_logs",
            ]

            for table in tables_to_clear:
                await conn.execute(text(f"DELETE FROM {table}"))
                logger.info(f"已清空表: {table}")

        await engine.dispose()
        logger.info("数据库清空完成")

    except Exception as e:
        logger.error(f"清空数据库失败: {e}")
        raise


async def insert_seed_data():
    """插入初始种子数据"""
    logger.info("正在插入种子数据...")

    try:
        from scripts.seed_data import seed_all
        await seed_all()
    except Exception as e:
        logger.error(f"插入种子数据失败: {e}")
        raise


async def main():
    """主函数"""
    logger.info("=" * 50)
    logger.info("AIDoc 数据库重置")
    logger.info("=" * 50)

    try:
        # 1. 清空数据库
        await reset_database()

        # 2. 插入种子数据
        await insert_seed_data()

        logger.info("=" * 50)
        logger.info("数据库重置完成！")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f"数据库重置失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
