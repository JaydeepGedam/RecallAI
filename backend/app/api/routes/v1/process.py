from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant_or_user
from app.models.user import User
from app.models.memory import Memory, MemoryType, MemoryStatus
from app.schemas.memory import MemoryCreate
from app.schemas.v1_memory import (
    V1ProcessRequest,
    V1ProcessResponse,
    V1CreatedItem,
    V1SupersededItem,
    V1ReinforcedItem,
    V1DuplicateItem
)
from app.services.llm_service import llm_service
from app.services.memory_service import memory_service

router = APIRouter(prefix="/memory", tags=["Memory-as-a-Service Processing"])


@router.post("/process", response_model=V1ProcessResponse)
def process_conversation_message(
    req: V1ProcessRequest,
    db: Session = Depends(get_db),
    tenant: User = Depends(get_tenant_or_user)
):
    """
    Core Developer Endpoint: Automatically processes a conversation statement.
    1. Extracts candidate memories using autonomous extraction.
    2. Classifies memory types (fact, preference, skill, project, goal).
    3. Generates 1536-dim vector embeddings.
    4. Detects duplicates (similarity >= 0.88) and reinforces confidence.
    5. Detects conflicts and contradictions, superseding old memories.
    6. Updates memory lineage and saves active memories under the tenant scope.
    """
    if not req.user_id or not req.user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'user_id' cannot be empty."
        )

    if not req.message or not req.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'message' cannot be empty."
        )

    user_id = req.user_id.strip()
    raw_message = req.message.strip()

    # Step 1: Extract candidate memories using LLM / heuristic extractor
    candidates = llm_service.extract_memories(user_message=raw_message)

    created_items: List[V1CreatedItem] = []
    superseded_items: List[V1SupersededItem] = []
    reinforced_items: List[V1ReinforcedItem] = []
    duplicate_items: List[V1DuplicateItem] = []

    for cand in candidates:
        content = cand.get("content", "").strip()
        if not content:
            continue

        raw_type = cand.get("memory_type", "fact")
        try:
            mem_type = MemoryType(raw_type)
        except ValueError:
            mem_type = MemoryType.FACT

        importance = float(cand.get("importance_score", 0.5))
        confidence = float(cand.get("confidence_score", 0.9))

        mem_in = MemoryCreate(
            user_id=user_id,
            content=content,
            memory_type=mem_type,
            importance_score=importance,
            confidence_score=confidence
        )

        # Create or update memory with conflict resolution
        saved_mem, note = memory_service.create_memory(
            db=db,
            memory_in=mem_in,
            auto_resolve_conflicts=True,
            tenant_id=tenant.id
        )

        if note and "Reinforced" in note:
            reinforced_items.append(
                V1ReinforcedItem(
                    id=saved_mem.id,
                    content=saved_mem.content,
                    confidence=round(saved_mem.confidence_score, 4)
                )
            )
            duplicate_items.append(
                V1DuplicateItem(
                    id=saved_mem.id,
                    content=saved_mem.content
                )
            )
        else:
            created_items.append(
                V1CreatedItem(
                    id=saved_mem.id,
                    content=saved_mem.content,
                    type=saved_mem.memory_type.value if hasattr(saved_mem.memory_type, "value") else str(saved_mem.memory_type)
                )
            )

            # Check if any memories were superseded by this new memory
            superseded_records = db.query(Memory).filter(
                Memory.superseded_by_id == saved_mem.id
            ).all()

            for old_mem in superseded_records:
                superseded_items.append(
                    V1SupersededItem(
                        old_memory_id=old_mem.id,
                        new_memory_id=saved_mem.id
                    )
                )

    return V1ProcessResponse(
        processed=True,
        created=created_items,
        superseded=superseded_items,
        reinforced=reinforced_items,
        duplicates=duplicate_items
    )
