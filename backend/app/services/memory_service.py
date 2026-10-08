import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.models.memory import Memory, MemoryType, MemoryStatus
from app.models.conversation import Conversation
from app.schemas.memory import MemoryCreate, MemoryUpdate
from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service


class MemoryService:
    """
    Core memory engine managing memory lifecycle, deduplication,
    conflict detection, updates, and provenance lineage.
    """

    def __init__(self):
        self.duplicate_threshold = settings.DUPLICATE_SIMILARITY_THRESHOLD
        self.conflict_threshold = settings.CONFLICT_SIMILARITY_THRESHOLD

    def create_memory(
        self,
        db: Session,
        memory_in: MemoryCreate,
        auto_resolve_conflicts: bool = True,
        tenant_id: Optional[str] = None
    ) -> Tuple[Memory, Optional[str]]:
        """
        Creates a new memory after executing deduplication and conflict detection.
        Returns (Memory, action_taken_note: Optional[str])
        """
        effective_tenant = tenant_id or getattr(memory_in, "tenant_id", None) or memory_in.user_id
        logger.info(f"Processing memory creation for user={memory_in.user_id} (tenant={effective_tenant}): '{memory_in.content[:40]}...'")

        # Step 1: Generate embedding for incoming memory
        new_embedding = embedding_service.generate_embedding(memory_in.content)

        # Step 2: Fetch existing active memories for this user & tenant to check duplicates and conflicts
        mem_query = db.query(Memory).filter(
            Memory.user_id == memory_in.user_id,
            Memory.status == MemoryStatus.ACTIVE
        )
        if effective_tenant:
            mem_query = mem_query.filter(
                (Memory.tenant_id == effective_tenant) | (Memory.tenant_id.is_(None))
            )
        active_memories = mem_query.all()

        action_notes = []

        if auto_resolve_conflicts and active_memories:
            conflicting_memories = []
            duplicate_to_reinforce = None

            for existing in active_memories:
                existing_vector = existing.embedding
                if isinstance(existing_vector, str):
                    try:
                        existing_vector = json.loads(existing_vector)
                    except Exception:
                        existing_vector = []

                if not existing_vector:
                    continue

                sim = embedding_service.cosine_similarity(new_embedding, existing_vector)

                # Prioritize conflict check: if it contradicts or replaces, it's NOT a duplicate
                if sim >= self.conflict_threshold or existing.memory_type == memory_in.memory_type:
                    conflict_check = llm_service.detect_conflict(existing.content, memory_in.content)
                    if conflict_check.get("is_conflict") and conflict_check.get("should_supersede", True):
                        conflicting_memories.append(existing)
                        continue

                # If no conflict, check for duplicate reinforcement (sim >= 0.88)
                if sim >= self.duplicate_threshold and duplicate_to_reinforce is None:
                    duplicate_to_reinforce = (existing, sim)

            # Resolve conflicts if any detected
            if conflicting_memories:
                new_memory = Memory(
                    tenant_id=effective_tenant,
                    user_id=memory_in.user_id,
                    content=memory_in.content,
                    memory_type=memory_in.memory_type,
                    importance_score=memory_in.importance_score,
                    confidence_score=memory_in.confidence_score,
                    embedding=new_embedding,
                    status=MemoryStatus.ACTIVE,
                    source_message_id=memory_in.source_message_id,
                    expires_at=memory_in.expires_at
                )
                db.add(new_memory)
                db.flush()

                for old_mem in conflicting_memories:
                    old_mem.status = MemoryStatus.SUPERSEDED
                    old_mem.superseded_by_id = new_memory.id
                    db.add(old_mem)
                    action_notes.append(f"Superseded prior memory: '{old_mem.content}'")

                db.commit()
                db.refresh(new_memory)
                logger.info(f"Created active memory id={new_memory.id} superseding {len(conflicting_memories)} older memories.")
                return new_memory, "; ".join(action_notes)

            # If no conflict, but a duplicate was identified, reinforce existing memory
            if duplicate_to_reinforce:
                existing, sim = duplicate_to_reinforce
                logger.info(f"Duplicate memory detected (sim={sim:.3f}). Reinforcing existing memory id={existing.id}")
                existing.importance_score = max(existing.importance_score, memory_in.importance_score)
                existing.confidence_score = min(1.0, existing.confidence_score + 0.05)
                existing.last_accessed_at = datetime.now(timezone.utc)
                db.add(existing)
                db.commit()
                db.refresh(existing)
                return existing, f"Reinforced existing duplicate memory ({sim*100:.1f}% match)."

        # Standard creation
        new_memory = Memory(
            tenant_id=effective_tenant,
            user_id=memory_in.user_id,
            content=memory_in.content,
            memory_type=memory_in.memory_type,
            importance_score=memory_in.importance_score,
            confidence_score=memory_in.confidence_score,
            embedding=new_embedding,
            status=MemoryStatus.ACTIVE,
            source_message_id=memory_in.source_message_id,
            expires_at=memory_in.expires_at
        )
        db.add(new_memory)
        db.commit()
        db.refresh(new_memory)
        logger.info(f"Successfully stored new active memory id={new_memory.id}")
        return new_memory, None

    def get_memory(
        self,
        db: Session,
        memory_id: str,
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None
    ) -> Optional[Memory]:
        """
        Retrieves a memory with strict user and tenant isolation if provided.
        """
        query = db.query(Memory).filter(Memory.id == memory_id)
        if user_id:
            query = query.filter(Memory.user_id == user_id)
        if tenant_id:
            query = query.filter((Memory.tenant_id == tenant_id) | (Memory.tenant_id.is_(None)))
        return query.first()

    def list_memories(
        self,
        db: Session,
        user_id: str,
        memory_type: Optional[MemoryType] = None,
        status: Optional[MemoryStatus] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
        tenant_id: Optional[str] = None
    ) -> Tuple[List[Memory], int]:
        """
        Lists memories with filtering, pagination, and count for a specific user and tenant.
        """
        query = db.query(Memory).filter(Memory.user_id == user_id)
        if tenant_id:
            query = query.filter((Memory.tenant_id == tenant_id) | (Memory.tenant_id.is_(None)))

        if memory_type:
            query = query.filter(Memory.memory_type == memory_type)
        if status:
            query = query.filter(Memory.status == status)
        else:
            query = query.filter(Memory.status != MemoryStatus.DELETED)

        if search:
            query = query.filter(Memory.content.ilike(f"%{search}%"))

        total = query.count()
        memories = query.order_by(Memory.created_at.desc()).offset(skip).limit(limit).all()
        return memories, total

    def update_memory(
        self,
        db: Session,
        memory: Memory,
        update_in: MemoryUpdate
    ) -> Memory:
        """
        Updates memory fields and re-computes vector embedding if content changes.
        """
        update_data = update_in.model_dump(exclude_unset=True)
        if "content" in update_data and update_data["content"] != memory.content:
            new_text = update_data["content"]
            memory.content = new_text
            memory.embedding = embedding_service.generate_embedding(new_text)

        for field, value in update_data.items():
            if field != "content":
                setattr(memory, field, value)

        memory.updated_at = datetime.now(timezone.utc)
        db.add(memory)
        db.commit()
        db.refresh(memory)
        logger.info(f"Updated memory id={memory.id}")
        return memory

    def delete_memory(self, db: Session, memory: Memory, hard_delete: bool = False) -> None:
        """
        Performs soft delete (status=deleted) or physical removal.
        """
        if hard_delete:
            db.delete(memory)
        else:
            memory.status = MemoryStatus.DELETED
            memory.updated_at = datetime.now(timezone.utc)
            db.add(memory)
        db.commit()
        logger.info(f"Deleted memory id={memory.id} (hard_delete={hard_delete})")

    def get_memory_lineage(self, db: Session, memory_id: str, user_id: str) -> List[Dict[str, Any]]:
        """
        Traverses superseded chains to build the historical evolution diagram/list:
        e.g. Memory A (Jan 10) -> Superseded by Memory B (Feb 04) -> Active
        """
        current = self.get_memory(db, memory_id, user_id)
        if not current:
            return []

        # Find the root of the lineage chain
        root = current
        visited = set()
        while root:
            visited.add(root.id)
            predecessor = db.query(Memory).filter(
                Memory.user_id == user_id,
                Memory.superseded_by_id == root.id
            ).first()
            if predecessor and predecessor.id not in visited:
                root = predecessor
            else:
                break

        # Walk forwards from root
        chain = []
        node = root
        chain_visited = set()
        while node and node.id not in chain_visited:
            chain_visited.add(node.id)
            chain.append({
                "id": node.id,
                "content": node.content,
                "memory_type": node.memory_type.value if hasattr(node.memory_type, "value") else node.memory_type,
                "status": node.status.value if hasattr(node.status, "value") else node.status,
                "created_at": node.created_at.isoformat(),
                "importance_score": node.importance_score,
                "confidence_score": node.confidence_score,
                "is_current": node.id == memory_id
            })
            if node.superseded_by_id:
                node = db.query(Memory).filter(Memory.id == node.superseded_by_id).first()
            else:
                node = None

        return chain

    def get_user_stats(self, db: Session, user_id: str) -> Dict[str, int]:
        """
        Calculates aggregate statistics for the user dashboard.
        """
        total = db.query(Memory).filter(
            Memory.user_id == user_id,
            Memory.status != MemoryStatus.DELETED
        ).count()

        active = db.query(Memory).filter(
            Memory.user_id == user_id,
            Memory.status == MemoryStatus.ACTIVE
        ).count()

        superseded = db.query(Memory).filter(
            Memory.user_id == user_id,
            Memory.status == MemoryStatus.SUPERSEDED
        ).count()

        expired = db.query(Memory).filter(
            Memory.user_id == user_id,
            Memory.status == MemoryStatus.EXPIRED
        ).count()

        conversations_count = db.query(Conversation).filter(
            Conversation.user_id == user_id
        ).count()

        return {
            "total": total,
            "active": active,
            "superseded": superseded,
            "expired": expired,
            "conversations_count": conversations_count
        }


memory_service = MemoryService()
