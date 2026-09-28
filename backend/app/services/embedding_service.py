import math
import hashlib
from typing import List, Optional
import numpy as np
from openai import OpenAI
from app.core.config import settings
from app.core.logging import logger


class EmbeddingService:
    """
    Handles generation of semantic vector embeddings using OpenAI's embedding models.
    Supports deterministic fallback generation for testing environments when OpenAI API
    key is not configured.
    """

    def __init__(self):
        self.dimensions = settings.EMBEDDING_DIMENSIONS
        self.model = settings.EMBEDDING_MODEL
        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> Optional[OpenAI]:
        if not self._client and settings.OPENAI_API_KEY:
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generates a 1536-dimensional embedding vector for the provided text.
        """
        text = text.strip().replace("\n", " ")
        if not text:
            return [0.0] * self.dimensions

        if self.client:
            try:
                response = self.client.embeddings.create(
                    input=text,
                    model=self.model,
                    dimensions=self.dimensions
                )
                embedding = response.data[0].embedding
                logger.debug(f"Generated OpenAI embedding for text snippet: '{text[:40]}...'")
                return embedding
            except Exception as e:
                logger.warning(f"OpenAI embedding generation failed ({e}). Falling back to semantic mock embedding.")

        # Deterministic semantic hash pseudo-embedding fallback for testing without API keys
        return self._generate_deterministic_fallback(text)

    def _generate_deterministic_fallback(self, text: str) -> List[float]:
        """
        Generates a normalized 1536-dimension float vector deterministically based
        on text token hashing. Enables full local testing when offline or without API key.
        """
        vector = np.zeros(self.dimensions, dtype=float)
        words = text.lower().split()
        if not words:
            return vector.tolist()

        for word in words:
            # Hash each token into 8 distinct dimensions
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            for i in range(8):
                idx = (h >> (i * 12)) % self.dimensions
                weight = ((h >> (i * 4)) % 100) / 100.0
                vector[idx] += weight

        # Normalize vector to unit length (L2 norm)
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm

        return vector.tolist()

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """
        Computes cosine similarity between two float vectors. Range: [-1.0, 1.0].
        """
        if not v1 or not v2:
            return 0.0
        a = np.array(v1, dtype=float)
        b = np.array(v2, dtype=float)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))


embedding_service = EmbeddingService()
