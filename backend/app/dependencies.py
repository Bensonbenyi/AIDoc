"""
依赖注入模块

提供 FastAPI 路由的依赖注入函数
"""

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.database import get_db
from app.config import Settings, settings


async def get_config() -> Settings:
    """
    获取配置实例的依赖函数

    用于 FastAPI 的依赖注入系统
    """
    return settings


# 重新导出 get_db，方便其他模块导入
__all__ = ["get_db", "get_config"]
