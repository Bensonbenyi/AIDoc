"""
日志工具模块

使用 loguru 配置日志，提供数据库日志记录
"""

import uuid
from datetime import datetime
from typing import Any

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
