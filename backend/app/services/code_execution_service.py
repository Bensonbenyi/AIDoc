"""
代码执行 Service 层

实现代码执行记录的存储和查询
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.code_execution import CodeExecution


async def save_execution(
    db: AsyncSession,
    block_id: uuid.UUID,
    document_id: uuid.UUID,
    language: str,
    source_code: str,
    status: str,
    stdout: str = "",
    stderr: str = "",
    result_json: dict | None = None,
    execution_time_ms: int | None = None,
) -> CodeExecution:
    """保存代码执行记录"""
    execution = CodeExecution(
        id=uuid.uuid4(),
        block_id=block_id,
        document_id=document_id,
        language=language,
        source_code=source_code,
        status=status,
        stdout=stdout,
        stderr=stderr,
        result_json=result_json,
        execution_time_ms=execution_time_ms,
    )
    db.add(execution)
    await db.flush()
    await db.refresh(execution)
    return execution


async def get_execution(
    db: AsyncSession, execution_id: uuid.UUID
) -> CodeExecution | None:
    """获取单条执行记录"""
    return await db.get(CodeExecution, execution_id)


async def get_execution_history(
    db: AsyncSession, block_id: uuid.UUID, limit: int = 10
) -> list[CodeExecution]:
    """获取指定 block 的执行历史"""
    stmt = (
        select(CodeExecution)
        .where(CodeExecution.block_id == block_id)
        .order_by(CodeExecution.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
