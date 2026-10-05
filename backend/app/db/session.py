from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.core.logging import logger
from app.db.base import Base

# Database connection configuration
connect_args = {}
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    # Ensure relative SQLite path always resolves to the project root recallai.db
    if db_url.startswith("sqlite:///./"):
        root_dir = Path(__file__).resolve().parents[3]
        canonical_db = root_dir / "recallai.db"
        db_url = f"sqlite:///{canonical_db.as_posix()}"

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """
    Initializes the database:
    - If running on PostgreSQL, ensures the pgvector extension is installed.
    - Creates all defined tables in the schema.
    """
    try:
        # Import models so Base has metadata populated
        import app.models  # noqa: F401

        if engine.dialect.name == "postgresql":
            with engine.connect() as conn:
                logger.info("Ensuring PostgreSQL vector extension is enabled...")
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
                logger.info("PostgreSQL vector extension verified.")

        logger.info("Creating database tables if not present...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)
        raise e


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a SQLAlchemy database session
    and guarantees it is closed after request handling.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
