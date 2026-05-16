import uuid
from enum import Enum

from pydantic import BaseModel, Field


class AIScope(str, Enum):
    CURRENT_DOCUMENT = "current_document"
    DOCUMENT_TREE = "document_tree"
    ALL_WORKSPACE = "all_workspace"


class AIChatRequest(BaseModel):
    session_id: uuid.UUID | None = Field(None, description="会话 ID，为空则创建新会话")
    message: str = Field(..., min_length=1, description="用户消息")
    context: str | None = Field(None, description="可选引用上下文，会作为 system prompt 的文档上下文发送给 AI")


class AIDocumentQARequest(BaseModel):
    document_id: uuid.UUID | None = Field(None, description="文档 ID（可选，有引用上下文时可不传）")
    question: str = Field(..., min_length=1, description="用户问题")
    scope: AIScope = Field(AIScope.CURRENT_DOCUMENT, description="上下文范围")
    session_id: uuid.UUID | None = Field(None, description="会话 ID，为空则创建新会话")
    context_document_id: uuid.UUID | None = Field(None, description="拖拽的文档 ID，直接读取其内容作为上下文")
    context_block_ids: list[uuid.UUID] | None = Field(None, description="拖拽的 block ID 列表，读取这些 block 内容作为上下文")


class AIContextRequest(BaseModel):
    document_id: uuid.UUID | None = Field(None, description="文档 ID")
    block_id: uuid.UUID | None = Field(None, description="Block ID")


class AIContextResponse(BaseModel):
    context: str = Field(..., description="格式化的上下文文本")
    source_type: str = Field(..., description="来源类型：document 或 block")
    source_title: str = Field(default="", description="来源标题")


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
    session_id: uuid.UUID | None = None
