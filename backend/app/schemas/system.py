import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str
    version: str
    database: str


class SystemStatusResponse(BaseModel):
    database_connected: bool
    ai_service_available: bool
    storage_service_available: bool
    document_count: int
    block_count: int


class SystemLogResponse(BaseModel):
    """系统日志响应"""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    log_type: str = Field(description="日志类型: ai_call, code_execution, document_update, error")
    message: str
    metadata_: dict | None = Field(None, alias="metadata_")
    created_at: datetime


class SystemLogListResponse(BaseModel):
    """系统日志列表响应"""

    logs: list[SystemLogResponse]
    total: int
    page: int
    page_size: int


class SystemInitResponse(BaseModel):
    """系统初始化响应"""

    success: bool
    message: str
    documents_created: int = 0
