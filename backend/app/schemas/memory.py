from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.memory import MemoryType, MemoryStatus


class MemoryBase(BaseModel):
    content: str = Field(..., description="The factual or contextual memory statement")
    memory_type: MemoryType = Field(default=MemoryType.FACT, description="Category of memory")
    importance_score: float = Field(default=0.5, ge=0.0, le=1.0, description="Importance score 0 to 1")
    confidence_score: float = Field(default=0.9, ge=0.0, le=1.0, description="Confidence score 0 to 1")


class MemoryCreate(MemoryBase):
    user_id: Optional[str] = None
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


class MemoryListResponse(BaseModel):
    total: int
    memories: List[MemoryResponse]


class MemorySearchRequest(BaseModel):
    user_id: Optional[str] = None
    query: str
    limit: int = Field(default=5, ge=1, le=50)


class ScoredMemoryResponse(MemoryResponse):
    semantic_similarity: float = Field(default=0.0)
    recency_score: float = Field(default=0.0)
    final_score: float = Field(default=0.0)


class MemoryExtractRequest(BaseModel):
    user_id: Optional[str] = None
    text: str
    conversation_id: Optional[str] = None
    auto_store: bool = Field(default=True, description="Whether to immediately store the extracted memories")


class MemoryExtractResponse(BaseModel):
    memories: List[MemoryResponse]
    notes: List[str] = Field(default_factory=list)


class LineageItem(BaseModel):
    id: str
    content: str
    memory_type: str
    status: str
    created_at: str
    importance_score: float
    confidence_score: float
    is_current: bool


class MemoryLineageResponse(BaseModel):
    memory_id: str
    chain: List[LineageItem]


class UserStatsResponse(BaseModel):
    user_id: str
    total: int
    active: int
    superseded: int
    expired: int
    conversations_count: int


class ChatRequest(BaseModel):
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None
    message: str
    auto_extract: bool = Field(default=True, description="Automatically extract and save new memories from this interaction")



class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    retrieved_memories: List[ScoredMemoryResponse] = Field(default_factory=list)
    extracted_memories: List[MemoryResponse] = Field(default_factory=list)
    action_notes: List[str] = Field(default_factory=list)
