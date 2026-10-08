from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant_or_user
from app.models.user import User
from app.models.memory import Memory, MemoryType, MemoryStatus
from app.schemas.memory import MemoryCreate
from app.schemas.v1_memory import (
    V1MemoryCreateRequest,
    V1MemoryCreateResponse,
    V1MemoryCreatedItem,
    V1MemorySearchRequest,
    V1MemorySearchResponse,
    V1MemorySearchItem,
    V1LineageResponse,
    V1LineageItem
)
from app.services.memory_service import memory_service
from app.services.retrieval_service import retrieval_service

router = APIRouter(prefix="/memories", tags=["Memory-as-a-Service Memories"])


@router.post("", response_model=V1MemoryCreateResponse, status_code=status.HTTP_201_CREATED)
def create_memory_v1(
    req: V1MemoryCreateRequest,
    db: Session = Depends(get_db),
    tenant: User = Depends(get_tenant_or_user)
):
    """
    Directly adds a memory unit bound to the authenticated tenant and user.
    Executes duplicate detection and conflict resolution automatically.
    """
    if not req.user_id or not req.user_id.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Field 'user_id' cannot be empty.")
    if not req.content or not req.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Field 'content' cannot be empty.")

    try:
        mem_type = MemoryType(req.type) if req.type else MemoryType.FACT
    except ValueError:
        mem_type = MemoryType.FACT

    mem_in = MemoryCreate(
        user_id=req.user_id.strip(),
        content=req.content.strip(),
        memory_type=mem_type,
        importance_score=0.8,
        confidence_score=0.95
    )

    saved_mem, _ = memory_service.create_memory(
        db=db,
        memory_in=mem_in,
        auto_resolve_conflicts=True,
        tenant_id=tenant.id
    )

    return V1MemoryCreateResponse(
        id=saved_mem.id,
        status="created",
        memory=V1MemoryCreatedItem(
            content=saved_mem.content,
            type=saved_mem.memory_type.value if hasattr(saved_mem.memory_type, "value") else str(saved_mem.memory_type),
            confidence=round(saved_mem.confidence_score, 4)
        )
    )


@router.post("/search", response_model=V1MemorySearchResponse)
def search_memories_v1(
    req: V1MemorySearchRequest,
    db: Session = Depends(get_db),
    tenant: User = Depends(get_tenant_or_user)
):
    """
    Performs semantic vector search and multi-factor ranking.
    Returns memories with full score breakdown:
    Final Score = (Semantic * 0.60) + (Importance * 0.20) + (Confidence * 0.10) + (Recency * 0.10)
    """
    if not req.user_id or not req.user_id.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Field 'user_id' cannot be empty.")
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Field 'query' cannot be empty.")

    scored_results = retrieval_service.search_memories(
        db=db,
        user_id=req.user_id.strip(),
        query=req.query.strip(),
        limit=req.limit or 10,
        tenant_id=tenant.id
    )

    search_items = []
    for mem, scores in scored_results:
        search_items.append(
            V1MemorySearchItem(
                id=mem.id,
                content=mem.content,
                type=mem.memory_type.value if hasattr(mem.memory_type, "value") else str(mem.memory_type),
                similarity=round(scores.get("semantic_similarity", 0.0), 4),
                importance=round(scores.get("importance_score", 0.0), 4),
                confidence=round(scores.get("confidence_score", 0.0), 4),
                recency_score=round(scores.get("recency_score", 0.0), 4),
                final_score=round(scores.get("final_score", 0.0), 4),
                status=mem.status.value if hasattr(mem.status, "value") else str(mem.status)
            )
        )

    return V1MemorySearchResponse(memories=search_items)


@router.delete("/{memory_id}")
def delete_memory_v1(
    memory_id: str,
    db: Session = Depends(get_db),
    tenant: User = Depends(get_tenant_or_user)
):
    """
    Deletes or tombstones a memory unit.
    Strictly verifies tenant ownership before deletion.
    """
    mem = memory_service.get_memory(db=db, memory_id=memory_id, tenant_id=tenant.id)
    if not mem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found or not owned by your tenant."
        )

    memory_service.delete_memory(db=db, memory=mem, hard_delete=False)
    return {
        "success": True,
        "message": f"Memory '{memory_id}' deleted successfully.",
        "memory_id": memory_id
    }


@router.get("/{memory_id}/lineage", response_model=V1LineageResponse)
def get_memory_lineage_v1(
    memory_id: str,
    db: Session = Depends(get_db),
    tenant: User = Depends(get_tenant_or_user)
):
    """
    Traces the evolution and conflict audit trail of a memory:
    Old Memory -> Superseded -> New Active Memory.
    """
    mem = memory_service.get_memory(db=db, memory_id=memory_id, tenant_id=tenant.id)
    if not mem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found or not owned by your tenant."
        )

    # Trace backward (ancestors)
    lineage_records: List[Memory] = []
    current: Optional[Memory] = mem

    # Find roots
    visited = set()
    while current and current.id not in visited:
        visited.add(current.id)
        lineage_records.append(current)
        # Check if another memory was superseded by current
        parent = db.query(Memory).filter(
            Memory.superseded_by_id == current.id
        ).first()
        current = parent

    # Reverse so oldest is first
    lineage_records.reverse()

    # Trace forward (descendants)
    current = mem
    while current and current.superseded_by_id and current.superseded_by_id not in visited:
        visited.add(current.superseded_by_id)
        descendant = db.query(Memory).filter(
            Memory.id == current.superseded_by_id
        ).first()
        if descendant:
            lineage_records.append(descendant)
            current = descendant
        else:
            break

    # Format items
    items = [
        V1LineageItem(
            id=m.id,
            content=m.content,
            status=m.status.value if hasattr(m.status, "value") else str(m.status),
            created_at=m.created_at.isoformat() if m.created_at else None,
            superseded_by_id=m.superseded_by_id
        )
        for m in lineage_records
    ]

    return V1LineageResponse(memory_id=memory_id, lineage=items)
