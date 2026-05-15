import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500, description="文档标题")
    parent_id: uuid.UUID | None = Field(None, description="父文档 ID")
    icon: str = Field("📄", max_length=50, description="文档图标")


class DocumentUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500, description="文档标题")
    icon: str | None = Field(None, max_length=50, description="文档图标")
    cover_url: str | None = Field(None, max_length=1000, description="封面 URL")


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    parent_id: uuid.UUID | None
    title: str
    icon: str
    cover_url: str | None
    sort_order: float
    path: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class DocumentTreeNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    icon: str
    title: str
    children: list["DocumentTreeNode"] = []


class DocumentDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    icon: str
    cover_url: str | None
    path: str
    blocks: list["BlockResponse"] = []


# Forward reference
from app.schemas.block import BlockResponse

DocumentDetail.model_rebuild()
DocumentTreeNode.model_rebuild()
