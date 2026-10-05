from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.security import get_password_hash
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.models.memory import Memory, MemoryType, MemoryStatus
from app.services.embedding_service import embedding_service
from app.schemas.common import StandardResponse

router = APIRouter(prefix="/demo", tags=["Demo & Seeding"])


@router.post("/seed", response_model=StandardResponse)
def seed_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Seeds the authenticated user with realistic memories across all types and statuses,
    including an example superseded memory to demonstrate conflict lineage.
    """
    # 1. Use currently authenticated user
    user = current_user

    # 2. Get or create a sample conversation
    conv = db.query(Conversation).filter(Conversation.user_id == user.id).first()
    if not conv:
        conv = Conversation(
            user_id=user.id,
            title="Initial Onboarding & Preferences"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

        m1 = Message(
            conversation_id=conv.id,
            role=MessageRole.USER,
            content="Hi! I prefer dark mode, I build backends with FastAPI and React on frontend, and notify me via WhatsApp."
        )
        m2 = Message(
            conversation_id=conv.id,
            role=MessageRole.ASSISTANT,
            content="Understood, Rahul! I've noted that you work with FastAPI and React, prefer dark mode, and want notifications on WhatsApp."
        )
        db.add_all([m1, m2])
        db.commit()

    # 3. Check existing memories count
    existing_count = db.query(Memory).filter(Memory.user_id == user.id).count()
    if existing_count > 3:
        return StandardResponse(
            success=True,
            message="Demo data already populated for user Rahul.",
            data={"user_id": user.id, "email": user.email, "memories_count": existing_count}
        )

    # 4. Seed structured memories
    demo_memories = [
        {
            "content": "User works with React for frontend development.",
            "type": MemoryType.SKILL,
            "importance": 0.85,
            "confidence": 0.98,
            "status": MemoryStatus.ACTIVE,
            "days_ago": 10
        },
        {
            "content": "User uses FastAPI for backend development.",
            "type": MemoryType.SKILL,
            "importance": 0.85,
            "confidence": 0.98,
            "status": MemoryStatus.ACTIVE,
            "days_ago": 8
        },
        {
            "content": "User prefers concise explanations.",
            "type": MemoryType.PREFERENCE,
            "importance": 0.90,
            "confidence": 0.95,
            "status": MemoryStatus.ACTIVE,
            "days_ago": 5
        },
        {
            "content": "User is building an AI memory infrastructure project called RecallAI.",
            "type": MemoryType.PROJECT,
            "importance": 0.95,
            "confidence": 0.99,
            "status": MemoryStatus.ACTIVE,
            "days_ago": 3
        },
        {
            "content": "User prefers dark mode interfaces.",
            "type": MemoryType.PREFERENCE,
            "importance": 0.70,
            "confidence": 0.95,
            "status": MemoryStatus.ACTIVE,
            "days_ago": 12
        },
        {
            "content": "User is preparing for product launch next month.",
            "type": MemoryType.GOAL,
            "importance": 0.80,
            "confidence": 0.90,
            "status": MemoryStatus.ACTIVE,
            "days_ago": 2
        }
    ]

    # Create superseded conflict example:
    # Old memory: "User prefers email notifications."
    # Superseded by: "User prefers WhatsApp notifications."
    old_time = datetime.now(timezone.utc) - timedelta(days=20)
    old_email_mem = Memory(
        user_id=user.id,
        content="User prefers email notifications for updates.",
        memory_type=MemoryType.PREFERENCE,
        importance_score=0.80,
        confidence_score=0.95,
        embedding=embedding_service.generate_embedding("User prefers email notifications for updates."),
        status=MemoryStatus.SUPERSEDED,
        created_at=old_time,
        updated_at=datetime.now(timezone.utc) - timedelta(days=4),
        last_accessed_at=old_time
    )
    db.add(old_email_mem)
    db.flush()

    new_time = datetime.now(timezone.utc) - timedelta(days=4)
    new_whatsapp_mem = Memory(
        user_id=user.id,
        content="User prefers WhatsApp notifications.",
        memory_type=MemoryType.PREFERENCE,
        importance_score=0.90,
        confidence_score=0.98,
        embedding=embedding_service.generate_embedding("User prefers WhatsApp notifications."),
        status=MemoryStatus.ACTIVE,
        created_at=new_time,
        updated_at=new_time,
        last_accessed_at=datetime.now(timezone.utc)
    )
    db.add(new_whatsapp_mem)
    db.flush()

    # Link lineage
    old_email_mem.superseded_by_id = new_whatsapp_mem.id
    db.add(old_email_mem)

    # Seed the rest of the memories
    for item in demo_memories:
        created_time = datetime.now(timezone.utc) - timedelta(days=item["days_ago"])
        m = Memory(
            user_id=user.id,
            content=item["content"],
            memory_type=item["type"],
            importance_score=item["importance"],
            confidence_score=item["confidence"],
            embedding=embedding_service.generate_embedding(item["content"]),
            status=item["status"],
            created_at=created_time,
            updated_at=created_time,
            last_accessed_at=created_time
        )
        db.add(m)

    db.commit()

    total_count = db.query(Memory).filter(Memory.user_id == user.id).count()
    return StandardResponse(
        success=True,
        message=f"Seeded demo user Rahul with {total_count} memories.",
        data={"user_id": user.id, "email": user.email, "memories_count": total_count}
    )


@router.post("/reset", response_model=StandardResponse)
def reset_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resets memories and conversations for the current user for a clean test run."""
    user = current_user
    if user:
        db.query(Memory).filter(Memory.user_id == user.id).delete()
        db.query(Message).filter(Message.conversation.has(user_id=user.id)).delete()
        db.query(Conversation).filter(Conversation.user_id == user.id).delete()
        db.commit()
    return StandardResponse(success=True, message=f"Reset demo data completed for {user.name or user.email}.")
