import uuid
import secrets
import hashlib
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class APIKey(Base):
    """
    API Key model for developer multi-tenant authentication.
    Stores cryptographically hashed API keys (never raw secrets).
    Each API key is strictly scoped to a tenant (user account).
    """
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    tenant_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, default="Default API Key")
    key_prefix = Column(String(16), nullable=False, index=True)  # e.g., "rai_live_a1b2"
    key_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA-256 hash
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    tenant = relationship("User", backref="api_keys")

    @classmethod
    def generate_key(cls, tenant_id: str, name: str = "Default API Key") -> tuple["APIKey", str]:
        """
        Generates a secure random API key in format epi_live_<40 hex chars>.
        Returns (APIKey model instance, raw_key_string).
        The raw_key_string is returned only once to the client upon creation.
        """
        raw_token = secrets.token_hex(20)  # 40 hex chars
        raw_key = f"epi_live_{raw_token}"
        key_prefix = raw_key[:14]  # "epi_live_xxxx"
        hashed = hashlib.sha256(raw_key.strip().encode("utf-8")).hexdigest()

        instance = cls(
            tenant_id=tenant_id,
            name=name,
            key_prefix=key_prefix,
            key_hash=hashed,
            is_active=True
        )
        return instance, raw_key

    @staticmethod
    def hash_key(raw_key: str) -> str:
        """Computes SHA-256 hash of an API key for lookup."""
        return hashlib.sha256(raw_key.strip().encode("utf-8")).hexdigest()

    def __repr__(self) -> str:
        return f"<APIKey id={self.id} prefix={self.key_prefix} tenant_id={self.tenant_id}>"
