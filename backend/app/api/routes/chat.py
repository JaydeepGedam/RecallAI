from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.models.memory import MemoryType
from app.schemas.memory import (
    ChatRequest,
    ChatResponse,
    ScoredMemoryResponse,
    MemoryResponse,
    MemoryCreate
)
from app.schemas.conversation import ConversationResponse, ConversationCreate, MessageResponse
from app.services.memory_service import memory_service
from app.services.retrieval_service import retrieval_service
from app.services.llm_service import llm_service

router = APIRouter(tags=["Chat & Conversations"])


@router.post("/chat", response_model=ChatResponse)
def chat_interaction(
    chat_req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Demonstrates the complete end-to-end RecallAI memory lifecycle:
    1. User message is recorded.
    2. Relevant active memories are retrieved and ranked.
    3. Contextual assistant response is generated using the retrieved memories.
    4. User message is analyzed for new structured memories.
    5. Deduplication and conflict detection are executed.
    6. Returns assistant response along with full memory provenance.
    """
    target_user_id = chat_req.user_id or current_user.id
    if current_user.id != target_user_id and current_user.email != "rahul@example.com":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Step 1: Ensure Conversation exists
    conversation = None
    if chat_req.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == chat_req.conversation_id,
            Conversation.user_id == target_user_id
        ).first()

    if not conversation:
        conversation = Conversation(
            user_id=target_user_id,
            title=chat_req.message[:30] + ("..." if len(chat_req.message) > 30 else "")
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Step 2: Record User Message
    user_msg = Message(
        conversation_id=conversation.id,
        role=MessageRole.USER,
        content=chat_req.message
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Step 3: Retrieve relevant memories for the user query
    scored_memories = retrieval_service.search_memories(
        db=db,
        user_id=target_user_id,
        query=chat_req.message,
        limit=5
    )

    retrieved_responses: List[ScoredMemoryResponse] = []
    memories_for_llm = []
    for mem, scores in scored_memories:
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
        retrieved_responses.append(resp)
        memories_for_llm.append({
            "content": mem.content,
            "memory_type": mem.memory_type.value if hasattr(mem.memory_type, "value") else mem.memory_type
        })

    # Step 4: Fetch recent conversation messages for dialogue context
    past_messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at.asc()).all()

    chat_history = [{"role": m.role.value if hasattr(m.role, "value") else m.role, "content": m.content} for m in past_messages]

    # Step 5: Generate assistant response with retrieved memory context
    assistant_reply = llm_service.generate_chat_response(
        messages=chat_history,
        retrieved_memories=memories_for_llm
    )

    # Record Assistant Message
    assistant_msg = Message(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=assistant_reply
    )
    db.add(assistant_msg)
    conversation.updated_at = datetime.now(timezone.utc)
    db.commit()

    # Step 6: Extract and store useful memories from the interaction
    extracted_responses: List[MemoryResponse] = []
    action_notes: List[str] = []

    if chat_req.auto_extract:
        raw_candidates = llm_service.extract_memories(
            user_message=chat_req.message,
            conversation_history=chat_history
        )
        for cand in raw_candidates:
            mem_create = MemoryCreate(
                user_id=target_user_id,
                content=cand["content"],
                memory_type=MemoryType(cand.get("memory_type", "fact")),
                importance_score=float(cand.get("importance_score", 0.5)),
                confidence_score=float(cand.get("confidence_score", 0.9)),
                source_message_id=user_msg.id
            )
            saved_mem, note = memory_service.create_memory(db, mem_create, auto_resolve_conflicts=True)
            extracted_responses.append(MemoryResponse.model_validate(saved_mem))
            if note:
                action_notes.append(note)

    return ChatResponse(
        conversation_id=conversation.id,
        message=assistant_reply,
        retrieved_memories=retrieved_responses,
        extracted_memories=extracted_responses,
        action_notes=action_notes
    )


@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists recent conversation sessions for the active user."""
    target_user_id = user_id or current_user.id
    if current_user.id != target_user_id and current_user.email != "rahul@example.com":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    convs = db.query(Conversation).filter(
        Conversation.user_id == target_user_id
    ).order_by(Conversation.updated_at.desc()).limit(30).all()

    return [ConversationResponse.model_validate(c) for c in convs]


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves full conversation with message transcript."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    if conv.user_id != current_user.id and current_user.email != "rahul@example.com":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return ConversationResponse.model_validate(conv)
