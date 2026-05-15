import uuid

from pydantic import BaseModel, Field

from app.schemas.ai import AIScope


class RAGReindexRequest(BaseModel):
    document_id: uuid.UUID = Field(..., description="文档 ID")


class RAGSearchRequest(BaseModel):
    document_id: uuid.UUID | None = Field(None, description="文档 ID")
    query: str = Field(..., min_length=1, description="搜索查询")
    scope: AIScope = Field(AIScope.CURRENT_DOCUMENT, description="检索范围")
    top_k: int = Field(5, ge=1, le=20, description="返回结果数量")


class RAGSearchResult(BaseModel):
    doc_id: uuid.UUID
    block_id: uuid.UUID
    block_type: str
    score: float
    content_preview: str


class RAGSearchResponse(BaseModel):
    chunks: list[RAGSearchResult]
