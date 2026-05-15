import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class BlockType(str, Enum):
    PARAGRAPH = "paragraph"
    HEADING_1 = "heading_1"
    HEADING_2 = "heading_2"
    HEADING_3 = "heading_3"
    BULLET_LIST = "bullet_list"
    NUMBERED_LIST = "numbered_list"
    TODO = "todo"
    TABLE = "table"
    QUOTE = "quote"
    DIVIDER = "divider"
    CODE = "code"
    WHITEBOARD = "whiteboard"
    CHART_3D = "chart_3d"
    IMAGE = "image"
    FILE = "file"
    AUDIO = "audio"
    VIDEO = "video"
    LINK_TO_DOCUMENT = "link_to_document"
    AI_ANSWER = "ai_answer"


class BlockCreate(BaseModel):
    block_type: BlockType = Field(..., description="Block 类型")
    content: dict = Field(default_factory=dict, description="Block 内容")
    properties: dict | None = Field(None, description="Block 属性")
    sort_order: float = Field(0.0, description="排序权重")


class BlockUpdate(BaseModel):
    content: dict | None = Field(None, description="Block 内容")
    properties: dict | None = Field(None, description="Block 属性")


class BlockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    parent_block_id: uuid.UUID | None
    block_type: str
    content: dict
    properties: dict | None
    sort_order: float
    created_at: datetime
    updated_at: datetime


class BlocksBatchSave(BaseModel):
    blocks: list[BlockCreate] = Field(..., description="Block 列表")


class BlocksBatchResponse(BaseModel):
    success: bool
    updated_count: int
