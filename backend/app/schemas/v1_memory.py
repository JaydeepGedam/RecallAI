from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# 1. Create/Add Memory
class V1MemoryCreateRequest(BaseModel):
    user_id: str = Field(..., description="External end-user identifier within the tenant")
    content: str = Field(..., description="The atomic knowledge or preference statement to store")
    type: Optional[str] = Field("fact", description="Memory type: fact, preference, skill, project, goal, event, temporary")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Arbitrary customer metadata")


class V1MemoryCreatedItem(BaseModel):
    content: str
    type: str
    confidence: float


class V1MemoryCreateResponse(BaseModel):
    id: str
    status: str = "created"
    memory: V1MemoryCreatedItem


# 2. Search Memories
class V1MemorySearchRequest(BaseModel):
    user_id: str = Field(..., description="External end-user identifier within the tenant")
    query: str = Field(..., description="Natural language search query")
    limit: Optional[int] = Field(10, ge=1, le=50)


class V1MemorySearchItem(BaseModel):
    id: str
    content: str
    type: str
    similarity: float
    importance: float
    confidence: float
    recency_score: float
    final_score: float
    status: str


class V1MemorySearchResponse(BaseModel):
    memories: List[V1MemorySearchItem]


# 3. Process Conversation Message
class V1ProcessRequest(BaseModel):
    user_id: str = Field(..., description="External end-user identifier within the tenant")
    message: str = Field(..., description="Raw conversational statement to analyze and extract memories from")


class V1CreatedItem(BaseModel):
    id: str
    content: str
    type: Optional[str] = "fact"


class V1SupersededItem(BaseModel):
    old_memory_id: str
    new_memory_id: str


class V1ReinforcedItem(BaseModel):
    id: str
    content: str
    confidence: float


class V1DuplicateItem(BaseModel):
    id: str
    content: str


class V1ProcessResponse(BaseModel):
    processed: bool = True
    created: List[V1CreatedItem] = Field(default_factory=list)
    superseded: List[V1SupersededItem] = Field(default_factory=list)
    reinforced: List[V1ReinforcedItem] = Field(default_factory=list)
    duplicates: List[V1DuplicateItem] = Field(default_factory=list)


# 4. Get Relevant Context
class V1ContextRequest(BaseModel):
    user_id: str = Field(..., description="External end-user identifier within the tenant")
    query: str = Field(..., description="Natural language query to retrieve context for")
    limit: Optional[int] = Field(8, ge=1, le=20)


class V1ContextItem(BaseModel):
    memory_id: str
    content: str
    type: str
    score: float


class V1ContextResponse(BaseModel):
    context: List[V1ContextItem]


# 5. Lineage
class V1LineageItem(BaseModel):
    id: str
    content: str
    status: str
    created_at: Optional[str] = None
    superseded_by_id: Optional[str] = None


class V1LineageResponse(BaseModel):
    memory_id: str
    lineage: List[V1LineageItem]
