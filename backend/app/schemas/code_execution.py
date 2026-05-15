import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"


class CodeExecuteRequest(BaseModel):
    language: str = Field("python", description="编程语言")
    source_code: str = Field(..., min_length=1, description="源代码")


class CodeExecuteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: ExecutionStatus
    stdout: str = ""
    stderr: str = ""
    result_json: dict | None = None
    execution_time_ms: int | None = None
    created_at: datetime
