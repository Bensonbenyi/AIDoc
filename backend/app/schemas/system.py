from pydantic import BaseModel


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
