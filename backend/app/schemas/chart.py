import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ChartSourceType(str, Enum):
    MANUAL = "manual"
    TABLE = "table"
    CODE_OUTPUT = "code_output"
    CSV = "csv"


class Chart3DCreateRequest(BaseModel):
    document_id: uuid.UUID = Field(..., description="文档 ID")
    source_type: ChartSourceType = Field(ChartSourceType.MANUAL, description="数据来源类型")
    source_block_id: uuid.UUID | None = Field(None, description="数据来源 Block ID")
    data_json: dict = Field(..., description="图表数据 JSON")


class Chart3DResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    chart_id: uuid.UUID
    chart_config: dict
    created_at: datetime
    updated_at: datetime
