import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WhiteboardSaveRequest(BaseModel):
    data_json: dict = Field(..., description="白板绘图数据 JSON")
    preview_image_url: str | None = Field(None, description="预览图 URL")


class WhiteboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    block_id: uuid.UUID
    document_id: uuid.UUID
    data_json: dict
    preview_image_url: str | None
    created_at: datetime
    updated_at: datetime
