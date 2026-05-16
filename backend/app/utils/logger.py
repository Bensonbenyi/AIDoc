"""
日志工具模块

使用 loguru 配置日志，提供数据库日志记录和操作装饰器
"""

import uuid
import functools
from datetime import datetime
from typing import Any, Callable

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_log import SystemLog


async def log_to_db(
    db: AsyncSession,
    log_type: str,
    message: str,
    metadata: dict[str, Any] | None = None,
) -> SystemLog:
    """
    将关键操作记录到 system_logs 表

    Args:
        db: 数据库会话
        log_type: 日志类型 (ai_call, code_execution, document_update, error)
        message: 日志消息
        metadata: 附加元数据

    Returns:
        创建的 SystemLog 记录
    """
    log_entry = SystemLog(
        id=uuid.uuid4(),
        log_type=log_type,
        message=message,
        metadata_=metadata,
        created_at=datetime.utcnow(),
    )
    db.add(log_entry)
    await db.flush()
    logger.debug(f"日志已记录到数据库: [{log_type}] {message}")
    return log_entry


def log_operation(log_type: str) -> Callable:
    """
    装饰器：自动记录函数调用到数据库和 loguru

    用法:
        @log_operation("ai_call")
        async def my_function(db, ...):
            ...

    要求被装饰函数的第一个参数为 db (AsyncSession)
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            func_name = func.__name__
            logger.info(f"[{log_type}] 开始执行: {func_name}")

            try:
                result = await func(*args, **kwargs)
                logger.info(f"[{log_type}] 执行成功: {func_name}")

                # 尝试从参数中获取 db 会话记录到数据库
                db = _extract_db(args, kwargs)
                if db is not None:
                    await log_to_db(
                        db,
                        log_type=log_type,
                        message=f"操作成功: {func_name}",
                        metadata={"function": func_name, "status": "success"},
                    )

                return result

            except Exception as e:
                logger.error(f"[{log_type}] 执行失败: {func_name}, 错误: {e}")

                db = _extract_db(args, kwargs)
                if db is not None:
                    await log_to_db(
                        db,
                        log_type="error",
                        message=f"操作失败: {func_name}, 错误: {str(e)}",
                        metadata={
                            "function": func_name,
                            "status": "error",
                            "error": str(e),
                        },
                    )

                raise

        return wrapper

    return decorator


def _extract_db(args: tuple, kwargs: dict) -> AsyncSession | None:
    """从函数参数中提取 db 会话"""
    # 检查 kwargs
    if "db" in kwargs and isinstance(kwargs["db"], AsyncSession):
        return kwargs["db"]
    # 检查 args（跳过 self）
    for arg in args:
        if isinstance(arg, AsyncSession):
            return arg
    return None
