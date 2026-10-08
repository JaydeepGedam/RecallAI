from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant_or_user
from app.models.user import User
from app.schemas.v1_memory import V1ContextRequest, V1ContextResponse, V1ContextItem
from app.services.retrieval_service import retrieval_service

router = APIRouter(tags=["Memory-as-a-Service Context"])


@router.post("/context", response_model=V1ContextResponse)
def get_relevant_context(
    req: V1ContextRequest,
    db: Session = Depends(get_db),
    tenant: User = Depends(get_tenant_or_user)
):
    """
    Core Developer Endpoint: Retrieves relevant active memories for a given user and query.
    Customers inject this context into their own LLM prompts (OpenAI, Claude, Gemini, etc.).
    EpisodicAI does NOT call the customer's LLM; it provides persistent, ranked context.
    """
    if not req.user_id or not req.user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'user_id' cannot be empty."
        )

    if not req.query or not req.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'query' cannot be empty."
        )

    scored_results = retrieval_service.search_memories(
        db=db,
        user_id=req.user_id.strip(),
        query=req.query.strip(),
        limit=req.limit or 8,
        tenant_id=tenant.id
    )

    context_items = []
    for mem, scores in scored_results:
        context_items.append(
            V1ContextItem(
                memory_id=mem.id,
                content=mem.content,
                type=mem.memory_type.value if hasattr(mem.memory_type, "value") else str(mem.memory_type),
                score=round(scores.get("final_score", 0.0), 4)
            )
        )

    return V1ContextResponse(context=context_items)
