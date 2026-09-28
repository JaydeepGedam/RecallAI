import uuid
from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.db.vector_type import PGVectorCompatible
from app.core.config import settings


class MemoryType(str, Enum):
    FACT = "fact"
    PREFERENCE = "preference"
    SKILL = "skill"
    PROJECT = "project"
    GOAL = "goal"
    EVENT = "event"
    TEMPORARY = "temporary"


class MemoryStatus(str, Enum):
    ACTIVE = "active"
    SUPERSEDED = "superseded"
    EXPIRED = "expired"
    DELETED = "deleted"


class Memory(Base):
    """
    Memory model representing atomic knowledge units extracted from user interactions.
    Contains semantic vector embeddings for fast nearest-neighbor retrieval,
    along with heuristic scoring metadata (importance, confidence, recency).
    """
    __tablename__ = "memories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    
    # Metadata classifications
    memory_type = Column(
        SQLEnum(MemoryType, native_enum=False),
        default=MemoryType.FACT,
        nullable=False,
        index=True
    )
    importance_score = Column(Float, default=0.5, nullable=False)
    confidence_score = Column(Float, default=0.9, nullable=False)
    
    # Semantic vector embedding (pgvector dimension 1536)
    embedding = Column(PGVectorCompatible(dim=settings.EMBEDDING_DIMENSIONS), nullable=True)
    
    # Lifecycle status
    status = Column(
        SQLEnum(MemoryStatus, native_enum=False),
        default=MemoryStatus.ACTIVE,
        nullable=False,
        index=True
    )
    
    # Provenance and Lineage
    source_message_id = Column(String(36), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    superseded_by_id = Column(String(36), ForeignKey("memories.id", ondelete="SET NULL"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    last_accessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=True, index=True)

    # Relationships
    user = relationship("User", back_populates="memories")
    source_message = relationship("Message", back_populates="extracted_memories")
    superseded_by = relationship("Memory", remote_side=[id], foreign_keys=[superseded_by_id], post_update=True)

    def __repr__(self) -> str:
        return f"<Memory id={self.id} type={self.memory_type} status={self.status} content={self.content[:30]}...>"
