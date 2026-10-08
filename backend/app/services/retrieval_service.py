import math
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging import logger
from app.models.memory import Memory, MemoryStatus
from app.services.embedding_service import embedding_service


class RetrievalService:
    """
    Retrieves and ranks relevant memories using a multi-factor scoring formula:
    final_score = (semantic_similarity * 0.60) + (importance_score * 0.20) + (confidence_score * 0.10) + (recency_score * 0.10)
    """

    def __init__(self):
        self.w_semantic = settings.WEIGHT_SEMANTIC
        self.w_importance = settings.WEIGHT_IMPORTANCE
        self.w_confidence = settings.WEIGHT_CONFIDENCE
        self.w_recency = settings.WEIGHT_RECENCY
        self.half_life_days = settings.RECENCY_HALF_LIFE_DAYS

    def calculate_recency_score(self, last_accessed_at: datetime) -> float:
        """
        Calculates mathematical exponential decay score between 0.0 and 1.0.
        Formula: score = exp(- ln(2) * delta_days / half_life_days)
        """
        if not last_accessed_at:
            return 0.5

        now = datetime.now(timezone.utc)
        if last_accessed_at.tzinfo is None:
            last_accessed_at = last_accessed_at.replace(tzinfo=timezone.utc)

        delta_seconds = max(0.0, (now - last_accessed_at).total_seconds())
        delta_days = delta_seconds / 86400.0

        decay_rate = math.log(2) / max(1.0, self.half_life_days)
        recency_score = math.exp(-decay_rate * delta_days)
        return round(float(recency_score), 4)

    def search_memories(
        self,
        db: Session,
        user_id: str,
        query: str,
        limit: int = 5,
        min_score_threshold: float = 0.0,
        tenant_id: Optional[str] = None
    ) -> List[Tuple[Memory, Dict[str, float]]]:
        """
        Performs semantic vector search and multi-factor ranking.
        Only returns memories that demonstrate genuine relevance to the query.
        Enforces tenant isolation when tenant_id is provided.
        """
        logger.info(f"Retrieving memories for user={user_id} (tenant={tenant_id}) with query='{query[:50]}...'")

        # Step 1: Generate query embedding
        query_vector = embedding_service.generate_embedding(query)

        # Step 2: Query candidate active memories for the user
        now = datetime.now(timezone.utc)
        candidates_query = db.query(Memory).filter(
            Memory.user_id == user_id,
            Memory.status == MemoryStatus.ACTIVE
        )
        if tenant_id:
            candidates_query = candidates_query.filter(Memory.tenant_id == tenant_id)

        candidates = candidates_query.all()
        valid_candidates = []
        for mem in candidates:
            if mem.expires_at:
                exp = mem.expires_at.replace(tzinfo=timezone.utc) if mem.expires_at.tzinfo is None else mem.expires_at
                if exp < now:
                    mem.status = MemoryStatus.EXPIRED
                    db.add(mem)
                    continue
            valid_candidates.append(mem)

        if not valid_candidates:
            logger.info(f"No active candidate memories found for user={user_id}.")
            return []

        # Step 3: Compute scores and rank candidates
        stop_words = {"the", "and", "for", "with", "this", "that", "you", "are", "what", "how", "can", "tell", "using", "user"}
        q_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', query.lower())) - stop_words

        scored_results = []
        for mem in valid_candidates:
            # Semantic similarity
            mem_vector = mem.embedding
            if isinstance(mem_vector, str):
                import json
                try:
                    mem_vector = json.loads(mem_vector)
                except Exception:
                    mem_vector = []

            similarity = 0.0
            if mem_vector:
                raw_sim = embedding_service.cosine_similarity(query_vector, mem_vector)
                # Real non-negative similarity
                similarity = max(0.0, min(1.0, float(raw_sim)))

            m_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', mem.content.lower())) - stop_words
            has_keyword_overlap = bool(q_words & m_words)

            # Relevance Gate: Ensure the memory actually pertains to the query topic.
            # Avoids pulling unrelated memories (e.g. notifications when discussing football).
            if similarity < 0.18 and not has_keyword_overlap:
                continue

            # Recency score
            recency = self.calculate_recency_score(mem.last_accessed_at or mem.created_at)

            # Importance and Confidence scores (0.0 to 1.0)
            importance = float(mem.importance_score or 0.5)
            confidence = float(mem.confidence_score or 0.9)

            # 4-factor ranking formula
            final_score = (
                (similarity * self.w_semantic) +
                (importance * self.w_importance) +
                (confidence * self.w_confidence) +
                (recency * self.w_recency)
            )
            final_score = round(final_score, 4)

            if final_score >= min_score_threshold:
                score_breakdown = {
                    "semantic_similarity": round(similarity, 4),
                    "importance_score": round(importance, 4),
                    "confidence_score": round(confidence, 4),
                    "recency_score": recency,
                    "final_score": final_score
                }
                scored_results.append((mem, score_breakdown))

        # Step 4: Sort descending by final_score
        scored_results.sort(key=lambda x: x[1]["final_score"], reverse=True)
        top_results = scored_results[:limit]

        # Step 5: Update last_accessed_at timestamp on retrieved memories
        for mem, _ in top_results:
            mem.last_accessed_at = datetime.now(timezone.utc)
            db.add(mem)
        try:
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to update last_accessed_at for retrieved memories: {e}")
            db.rollback()

        logger.info(f"Retrieved {len(top_results)} ranked memories for user={user_id}.")
        return top_results


retrieval_service = RetrievalService()
