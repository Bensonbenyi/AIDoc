import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    icon: Mapped[str] = mapped_column(String(50), default="📄")
    cover_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0)
    path: Mapped[str] = mapped_column(Text, default="")
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    children: Mapped[list["Document"]] = relationship(
        "Document", back_populates="parent", cascade="all, delete-orphan"
    )
    parent: Mapped["Document | None"] = relationship(
        "Document", back_populates="children", remote_side=[id]
    )
    blocks: Mapped[list["DocumentBlock"]] = relationship(
        "DocumentBlock", back_populates="document", cascade="all, delete-orphan"
    )
