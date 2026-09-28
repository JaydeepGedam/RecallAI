import json
from sqlalchemy.types import TypeDecorator, TEXT
try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None


class PGVectorCompatible(TypeDecorator):
    """
    TypeDecorator that uses native pgvector.sqlalchemy.Vector(dim) when connected
    to PostgreSQL, and gracefully stores vectors as JSON serialized strings when
    running unit tests or local development against SQLite.
    """
    impl = TEXT
    cache_ok = True

    def __init__(self, dim: int = 1536, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and Vector is not None:
            return dialect.type_descriptor(Vector(self.dim))
        return dialect.type_descriptor(TEXT())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql" and Vector is not None:
            return value
        if isinstance(value, (list, tuple)):
            return json.dumps(list(value))
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql" and Vector is not None:
            return list(value) if hasattr(value, "__iter__") else value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return value
        return value
