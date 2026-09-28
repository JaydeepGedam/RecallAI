from typing import Generator
from sqlalchemy.orm import Session
from app.db.session import get_db

# Re-export get_db for clean modular imports in router endpoints
__all__ = ["get_db"]
