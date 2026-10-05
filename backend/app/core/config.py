import json
from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT_DIR = Path(__file__).resolve().parents[3]
_BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """
    Central application configuration loaded from environment variables and .env file.
    Follows 12-factor app principles and avoids hardcoded secrets.
    """
    PROJECT_NAME: str = "RecallAI"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server settings
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8005

    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000"
    ]

    # Database settings (PostgreSQL + pgvector by default)
    # Can fall back to sqlite:///./recallai.db for lightweight local testing
    DATABASE_URL: str = "sqlite:///./recallai.db"

    # OpenAI API Configuration
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    # Security & Authentication
    JWT_SECRET: str = "recallai_insecure_default_secret_key_change_me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Memory Ranking Weights (Formula: semantic * 0.60 + importance * 0.20 + confidence * 0.10 + recency * 0.10)
    WEIGHT_SEMANTIC: float = 0.60
    WEIGHT_IMPORTANCE: float = 0.20
    WEIGHT_CONFIDENCE: float = 0.10
    WEIGHT_RECENCY: float = 0.10

    # Recency decay settings (Mathematical exponential decay: half-life in days)
    RECENCY_HALF_LIFE_DAYS: float = 30.0

    # Similarity Thresholds for Deduplication and Conflict Detection
    DUPLICATE_SIMILARITY_THRESHOLD: float = 0.88
    CONFLICT_SIMILARITY_THRESHOLD: float = 0.65

    model_config = SettingsConfigDict(
        env_file=[str(_ROOT_DIR / ".env"), str(_BACKEND_DIR / ".env"), ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [i.strip() for i in v.split(",") if i.strip()]
        return v


settings = Settings()
