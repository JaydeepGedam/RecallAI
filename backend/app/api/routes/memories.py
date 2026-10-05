from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.memory import MemoryType, MemoryStatus
from app.schemas.memory import (
    MemoryCreate,
    MemoryUpdate,
    MemoryResponse,
    MemoryListResponse,
    MemorySearchRequest,
    ScoredMemoryResponse,
    MemoryExtractRequest,
    MemoryExtractResponse,
    MemoryLineageResponse,
    LineageItem
)
from app.services.memory_service import memory_service
from app.services.retrieval_service import retrieval_service
from app.services.llm_service import llm_service

router = APIRouter(prefix="/memories", tags=["Memories"])


@router.post("", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
def create_memory(
    memory_in: MemoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new memory unit strictly bound to the authenticated user.
    Automatically executes duplicate detection and conflict resolution.
    """
    memory_in.user_id = current_user.id
    memory, _ = memory_service.create_memory(db, memory_in)
    return MemoryResponse.model_validate(memory)


@router.get("", response_model=MemoryListResponse)
def list_memories(
    user_id: Optional[str] = Query(None, description="Optional user ID; defaults to current user"),
    memory_type: Optional[MemoryType] = Query(None, description="Filter by memory type"),
    status_filter: Optional[MemoryStatus] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search memory content"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists memories for the logged-in user with flexible filters and pagination.
    """
    target_user_id = current_user.id
    if user_id and user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to other user memories is denied.")

    memories, total = memory_service.list_memories(
        db=db,
        user_id=target_user_id,
        memory_type=memory_type,
        status=status_filter,
        search=search,
        skip=skip,
        limit=limit
    )

    return MemoryListResponse(
        total=total,
        memories=[MemoryResponse.model_validate(m) for m in memories]
    )


@router.get("/{memory_id}", response_model=MemoryResponse)
def get_memory_details(
    memory_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves a single memory by ID with strict user isolation verification.
    """
    memory = memory_service.get_memory(db, memory_id)
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")

    if memory.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return MemoryResponse.model_validate(memory)


@router.patch("/{memory_id}", response_model=MemoryResponse)
def update_memory(
    memory_id: str,
    update_in: MemoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates memory fields.
    """
    memory = memory_service.get_memory(db, memory_id)
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")

    if memory.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    updated = memory_service.update_memory(db, memory, update_in)
    return MemoryResponse.model_validate(updated)


@router.delete("/{memory_id}", status_code=status.HTTP_200_OK)
def delete_memory(
    memory_id: str,
    hard_delete: bool = Query(False, description="Physical delete instead of soft status change"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Soft-deletes a memory (status becomes 'deleted'), preventing future retrieval.
    """
    memory = memory_service.get_memory(db, memory_id)
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")

    if memory.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    memory_service.delete_memory(db, memory, hard_delete=hard_delete)
    return {"success": True, "message": f"Memory {memory_id} deleted successfully."}


@router.get("/{memory_id}/lineage", response_model=MemoryLineageResponse)
def get_memory_lineage(
    memory_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the evolution history chain for a memory showing superseded relationships.
    """
    memory = memory_service.get_memory(db, memory_id)
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")

    if memory.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    chain = memory_service.get_memory_lineage(db, memory_id, user_id=memory.user_id)
    return MemoryLineageResponse(
        memory_id=memory_id,
        chain=[LineageItem(**item) for item in chain]
    )


@router.post("/search", response_model=List[ScoredMemoryResponse])
def search_memories(
    search_req: MemorySearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves and ranks relevant memories for the authenticated user using vector search.
    """
    target_user_id = current_user.id

    scored_tuples = retrieval_service.search_memories(
        db=db,
        user_id=target_user_id,
        query=search_req.query,
        limit=search_req.limit
    )

    results = []
    for mem, scores in scored_tuples:
        resp = ScoredMemoryResponse(
            id=mem.id,
            user_id=mem.user_id,
            content=mem.content,
            memory_type=mem.memory_type,
            importance_score=mem.importance_score,
            confidence_score=mem.confidence_score,
            status=mem.status,
            source_message_id=mem.source_message_id,
            superseded_by_id=mem.superseded_by_id,
            created_at=mem.created_at,
            updated_at=mem.updated_at,
            last_accessed_at=mem.last_accessed_at,
            expires_at=mem.expires_at,
            semantic_similarity=scores["semantic_similarity"],
            recency_score=scores["recency_score"],
            final_score=scores["final_score"]
        )
        results.append(resp)

    return results


@router.post("/extract", response_model=MemoryExtractResponse)
def extract_memories(
    extract_req: MemoryExtractRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Extracts structured memory candidates from conversation text using LLM.
    """
    target_user_id = current_user.id
    raw_candidates = llm_service.extract_memories(extract_req.text)

    saved_memories = []
    action_notes = []

    if extract_req.auto_store and raw_candidates:
        for item in raw_candidates:
            mem_create = MemoryCreate(
                user_id=target_user_id,
                content=item["content"],
                memory_type=MemoryType(item.get("memory_type", "fact")),
                importance_score=float(item.get("importance_score", 0.5)),
                confidence_score=float(item.get("confidence_score", 0.9)),
                source_message_id=extract_req.conversation_id
            )
            saved, note = memory_service.create_memory(db, mem_create)
            saved_memories.append(MemoryResponse.model_validate(saved))
            if note:
                action_notes.append(note)

    return MemoryExtractResponse(
        memories=saved_memories,
        notes=action_notes
    )
