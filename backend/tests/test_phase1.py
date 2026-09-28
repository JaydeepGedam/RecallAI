import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.db.session import SessionLocal, init_db
from app.models.user import User
from app.models.memory import Memory, MemoryType, MemoryStatus


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "RecallAI"
    assert data["status"] == "online"


def test_health_check_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "healthy"


def test_database_models():
    init_db()
    db = SessionLocal()
    try:
        # Verify Rahul exists or can be queried
        user = db.query(User).filter(User.email == "rahul@example.com").first()
        assert user is not None
        assert user.name == "Rahul"

        # Verify active memories can be filtered
        memories = db.query(Memory).filter(
            Memory.user_id == user.id,
            Memory.status == MemoryStatus.ACTIVE
        ).all()
        assert len(memories) >= 1
        assert memories[0].memory_type == MemoryType.SKILL
    finally:
        db.close()
