"""
数据库模块

创建异步 SQLAlchemy 引擎和会话工厂
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator

from fastapi import HTTPException

from app.config import settings


# 创建异步 SQLAlchemy 引擎
# Supabase Transaction mode (端口 6543) 不支持 prepared statements，
# 需要设置 prepared_statement_cache_size=0
# Supabase Session mode (端口 5432) 则无需此设置
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=5,  # Render/Supabase 免费版连接数有限，适当缩小
    max_overflow=5,
    pool_pre_ping=True,
    connect_args={"prepared_statement_cache_size": 0},
)

# 创建异步会话工厂
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # 提交后不过期对象，避免延迟加载问题
)


# 声明模型基类
class Base(DeclarativeBase):
    """SQLAlchemy 模型基类"""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    获取数据库会话的依赖函数

    用于 FastAPI 的依赖注入系统
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except HTTPException:
            await session.rollback()
            raise
        except Exception as e:
            import logging
            logging.error(f"数据库会话提交失败，正在回滚: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    初始化数据库

    创建所有表（如果不存在）
    """
    async with engine.begin() as conn:
        # 清理旧阶段遗留的派生表，避免继续通过外键影响文档编辑和删除事务。
        await conn.execute(text("DROP TABLE IF EXISTS knowledge_chunks"))
        await conn.execute(text("DROP TABLE IF EXISTS document_summaries"))

        # 导入所有模型，确保它们被注册到 Base.metadata
        from app.models import (  # noqa: F401
            document,
            document_block,
            whiteboard_data,
            chart_3d,
            ai_chat,
            ai_message,
            code_execution,
            file_asset,
            system_log,
        )

        # 创建所有表
        await conn.run_sync(Base.metadata.create_all)
