"""
数据库模块

创建异步 SQLAlchemy 引擎和会话工厂
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator

from app.config import settings


# 创建异步 SQLAlchemy 引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # 设置为 True 可以打印 SQL 语句
    pool_size=20,  # 连接池大小
    max_overflow=10,  # 超出连接池大小外最多创建的连接数
    pool_pre_ping=True,  # 每次从连接池中取连接时，自动检测连接是否有效
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
        except Exception:
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
        # 导入所有模型，确保它们被注册到 Base.metadata
        from app.models import (  # noqa: F401
            document,
            document_block,
            whiteboard_data,
            chart_3d,
            ai_chat,
            ai_message,
            knowledge_chunk,
            document_summary,
            code_execution,
            file_asset,
            system_log,
        )

        # 创建所有表
        await conn.run_sync(Base.metadata.create_all)
