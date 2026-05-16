"""
依赖注入模块

提供 FastAPI 路由的依赖注入函数
"""

from app.database import get_db


# 重新导出 get_db，方便其他模块导入
__all__ = ["get_db"]
