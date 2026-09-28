from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.memory import MemoryType, MemoryStatus


class MemoryBase(BaseModel):
    content: str = Field(..., description="The factual or contextual memory statement")
    memory_type: MemoryType = Field(default=MemoryType.FACT, description="Category of memory")
    importance_score: float = Field(default=0.5, ge=0.0, le=1.0, description="Importance score 0 to 1")
    confidence_score: float = Field(default=0.9, ge=0.0, le=1.0, description="Confidence score 0 to 1")


class MemoryCreate(MemoryBase):
    user_id: str
    source_message_id: Optional[str] = None
    expires_at: Optional[datetime] = None


class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    memory_type: Optional[MemoryType] = None
    importance_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    status: Optional[MemoryStatus] = None
    expires_at: Optional[datetime] = None


class MemoryResponse(MemoryBase):
    id: str
    user_id: str
    status: MemoryStatus
    source_message_id: Optional[str] = None
    superseded_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_accessed_at: datetime
    expires_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MemorySearchRequest(BaseModel):
    user_id: str
    query: str
    limit: int = Field(default=5, ge=1, le=50)


class ScoredMemoryResponse(MemoryResponse):
    semantic_similarity: float = Field(default=0.0)
    recency_score: float = Field(default=0.0)
    final_score: float = Field(default=0.0)
