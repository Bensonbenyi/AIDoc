import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class AIScope(str, Enum):
    CURRENT_DOCUMENT = "current_document"
    DOCUMENT_TREE = "document_tree"
    ALL_WORKSPACE = "all_workspace"


class AIChatRequest(BaseModel):
    session_id: uuid.UUID | None = Field(None, description="会话 ID，为空则创建新会话")
    message: str = Field(..., min_length=1, description="用户消息")


class AIDocumentQARequest(BaseModel):
    document_id: uuid.UUID = Field(..., description="文档 ID")
    question: str = Field(..., min_length=1, description="用户问题")
    scope: AIScope = Field(AIScope.CURRENT_DOCUMENT, description="检索范围")


class AIReference(BaseModel):
    doc_id: uuid.UUID
    block_id: uuid.UUID
    block_type: str
    content_preview: str
    document_path: str = ""


class AIResponse(BaseModel):
    message_id: uuid.UUID
    answer: str
    references: list[AIReference] = []
    confidence: str | None = None
