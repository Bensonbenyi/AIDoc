import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DocumentBlock(Base):
    __tablename__ = "document_blocks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False
    )
    block_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="paragraph, heading_1, heading_2, heading_3, bullet_list, numbered_list, todo, table, quote, divider, code, whiteboard, chart_3d, image, file, audio, video, link_to_document, ai_answer",
    )
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    properties: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    document: Mapped["Document"] = relationship(
        "Document", back_populates="blocks"
    )
