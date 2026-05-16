"""
代码执行 API 路由
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.code_execution import CodeExecuteResponse
from app.services import code_execution_service
from app.services import docker_execution_service

router = APIRouter()


class CodeExecuteRequest(BaseModel):
    """执行代码的请求体"""
    block_id: uuid.UUID = Field(..., description="关联的 block ID")
    document_id: uuid.UUID = Field(..., description="关联的文档 ID")
    language: str = Field("python", description="编程语言")
    source_code: str = Field(..., min_length=1, description="源代码")


class CodeExecutionSaveRequest(BaseModel):
    """保存代码执行记录的请求体"""
    block_id: uuid.UUID = Field(..., description="关联的 block ID")
    document_id: uuid.UUID = Field(..., description="关联的文档 ID")
    language: str = Field("python", description="编程语言")
    source_code: str = Field(..., min_length=1, description="源代码")
    status: str = Field("success", description="执行状态")
    stdout: str = Field("", description="标准输出")
    stderr: str = Field("", description="标准错误")
    execution_time_ms: int | None = Field(None, description="执行耗时(ms)")


@router.post("/execute", response_model=CodeExecuteResponse)
async def execute_code(
    data: CodeExecuteRequest,
    db: AsyncSession = Depends(get_db),
):
    """在 Docker 容器中执行代码并返回结果"""
    result = await docker_execution_service.execute_code(data.source_code)

    try:
        execution = await code_execution_service.save_execution(
            db=db,
            block_id=data.block_id,
            document_id=data.document_id,
            language=data.language,
            source_code=data.source_code,
            status=result["status"],
            stdout=result["stdout"],
            stderr=result["stderr"],
            execution_time_ms=result["execution_time_ms"],
        )
        await db.commit()
        return execution
    except Exception:
        # 保存失败不影响返回执行结果
        await db.rollback()
        from datetime import datetime
        from app.schemas.code_execution import ExecutionStatus
        return CodeExecuteResponse(
            id=uuid.uuid4(),
            status=ExecutionStatus(result["status"]),
            stdout=result["stdout"],
            stderr=result["stderr"],
            execution_time_ms=result["execution_time_ms"],
            created_at=datetime.utcnow(),
        )


@router.post("", response_model=CodeExecuteResponse)
async def save_code_execution(
    data: CodeExecutionSaveRequest,
    db: AsyncSession = Depends(get_db),
):
    """保存代码执行记录"""
    execution = await code_execution_service.save_execution(
        db=db,
        block_id=data.block_id,
        document_id=data.document_id,
        language=data.language,
        source_code=data.source_code,
        status=data.status,
        stdout=data.stdout,
        stderr=data.stderr,
        execution_time_ms=data.execution_time_ms,
    )
    await db.commit()
    return execution


@router.get("/{execution_id}", response_model=CodeExecuteResponse)
async def get_code_execution(
    execution_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """获取单条执行记录"""
    execution = await code_execution_service.get_execution(db, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return execution


@router.get("/by-block/{block_id}", response_model=list[CodeExecuteResponse])
async def get_block_executions(
    block_id: uuid.UUID,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    """获取指定 block 的执行历史"""
    return await code_execution_service.get_execution_history(db, block_id, limit)
