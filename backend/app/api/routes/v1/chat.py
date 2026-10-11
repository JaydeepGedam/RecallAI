from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant_or_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.models.memory import MemoryType
from app.schemas.memory import MemoryCreate
from app.schemas.v1_memory import (
    V1ChatRequest,
    V1ChatResponse,
    V1ChatRetrievedItem,
    V1ChatExtractedItem
)
from app.services.memory_service import memory_service
from app.services.retrieval_service import retrieval_service
from app.services.llm_service import llm_service

router = APIRouter(tags=["Memory-as-a-Service Chat"])


@router.post("/chat", response_model=V1ChatResponse)
def chat_v1(
    req: V1ChatRequest,
    db: Session = Depends(get_db),
    tenant: User = Depends(get_tenant_or_user)
):
    """
    Mode A (Unified All-in-One Chat):
    One single API call for external applications:
    1. Retrieves relevant ranked memories for the external user_id under the tenant partition.
    2. Enriches LLM context with these active memories.
    3. Generates assistant response.
    4. Automatically extracts and stores newly learned facts, handling duplicate reinforcement and conflicts.
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
    user_message = req.message.strip()

    # Step 1: Manage Conversation Session (bound to tenant account)
    conversation = None
    if req.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == req.conversation_id,
            Conversation.user_id == tenant.id
        ).first()

    if not conversation:
        conversation = Conversation(
            user_id=tenant.id,
            title=f"Chat ({user_id}): {user_message[:24]}..."
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Step 2: Record User Message
    user_msg_record = Message(
        conversation_id=conversation.id,
        role=MessageRole.USER,
        content=user_message
    )
    db.add(user_msg_record)
    db.commit()
    db.refresh(user_msg_record)

    # Step 3: Retrieve relevant memories for the user_id & tenant
    scored_memories = retrieval_service.search_memories(
        db=db,
        user_id=user_id,
        query=user_message,
        limit=5,
        tenant_id=tenant.id
    )

    retrieved_items: List[V1ChatRetrievedItem] = []
    memories_for_llm = []
    for mem, scores in scored_memories:
        retrieved_items.append(
            V1ChatRetrievedItem(
                id=mem.id,
                content=mem.content,
                type=mem.memory_type.value if hasattr(mem.memory_type, "value") else str(mem.memory_type),
                score=round(scores.get("final_score", 0.0), 4)
            )
        )
        memories_for_llm.append({
            "content": mem.content,
            "memory_type": mem.memory_type.value if hasattr(mem.memory_type, "value") else str(mem.memory_type)
        })

    # Step 4: Fetch recent dialogue history
    past_messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at.asc()).all()

    chat_history = [
        {"role": m.role.value if hasattr(m.role, "value") else m.role, "content": m.content}
        for m in past_messages
    ]

    # Step 5: Generate assistant response with retrieved memory context
    assistant_reply = llm_service.generate_chat_response(
        messages=chat_history,
        retrieved_memories=memories_for_llm
    )

    # Record Assistant Message
    assistant_msg_record = Message(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=assistant_reply
    )
    db.add(assistant_msg_record)
    conversation.updated_at = datetime.now(timezone.utc)
    db.commit()

    # Step 6: Autonomous Memory Extraction & Conflict Resolution
    extracted_items: List[V1ChatExtractedItem] = []
    action_notes: List[str] = []

    if req.auto_extract:
        raw_candidates = llm_service.extract_memories(
            user_message=user_message,
            conversation_history=chat_history
        )
        for cand in raw_candidates:
            content = cand.get("content", "").strip()
            if not content:
                continue

            raw_type = cand.get("memory_type", "fact")
            try:
                mem_type = MemoryType(raw_type)
            except ValueError:
                mem_type = MemoryType.FACT

            mem_create = MemoryCreate(
                user_id=user_id,
                content=content,
                memory_type=mem_type,
                importance_score=float(cand.get("importance_score", 0.6)),
                confidence_score=float(cand.get("confidence_score", 0.9)),
                source_message_id=user_msg_record.id
            )
            saved_mem, note = memory_service.create_memory(
                db=db,
                memory_in=mem_create,
                auto_resolve_conflicts=True,
                tenant_id=tenant.id
            )
            extracted_items.append(
                V1ChatExtractedItem(
                    id=saved_mem.id,
                    content=saved_mem.content,
                    type=saved_mem.memory_type.value if hasattr(saved_mem.memory_type, "value") else str(saved_mem.memory_type)
                )
            )
            if note:
                action_notes.append(note)

    return V1ChatResponse(
        message=assistant_reply,
        conversation_id=conversation.id,
        retrieved_memories=retrieved_items,
        extracted_memories=extracted_items,
        action_notes=action_notes
    )
