import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.api_key import APIKey
from app.models.memory import Memory, MemoryStatus


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def tenant_fixture(db):
    email = f"dev_{uuid.uuid4().hex[:8]}@example.com"
    user = User(email=email, name="Test Developer")
    db.add(user)
    db.commit()
    db.refresh(user)

    key_inst, raw_key = APIKey.generate_key(tenant_id=user.id, name="PyTest Key")
    db.add(key_inst)
    db.commit()
    db.refresh(key_inst)

    return {"user": user, "api_key": raw_key, "key_inst": key_inst}


def test_api_key_unauthenticated_rejected(client):
    """External requests without an API key or Bearer token must return 401."""
    res = client.post("/api/v1/context", json={"user_id": "test_user", "query": "hello"})
    assert res.status_code == 401


def test_invalid_api_key_rejected(client):
    """Requests with a malformed or non-existent API key must return 401."""
    headers = {"Authorization": "Bearer epi_live_invalidkey12345678901234567890"}
    res = client.post("/api/v1/context", headers=headers, json={"user_id": "test_user", "query": "hello"})
    assert res.status_code == 401


def test_v1_context_and_process_lifecycle(client, tenant_fixture):
    """
    Tests end-to-end Memory-as-a-Service flow:
    1. Process a message to extract memory.
    2. Query context and verify relevance score.
    """
    raw_key = tenant_fixture["api_key"]
    headers = {"Authorization": f"Bearer {raw_key}"}
    user_id = f"cust_{uuid.uuid4().hex[:8]}"

    # Step 1: Process message
    res_proc = client.post(
        "/api/v1/memory/process",
        headers=headers,
        json={
            "user_id": user_id,
            "message": "I prefer dark mode interfaces and I build with FastAPI."
        }
    )
    assert res_proc.status_code == 200
    data_proc = res_proc.json()
    assert data_proc["processed"] is True
    assert len(data_proc["created"]) >= 1

    # Step 2: Fetch context for user
    res_ctx = client.post(
        "/api/v1/context",
        headers=headers,
        json={
            "user_id": user_id,
            "query": "What interface theme do I prefer?",
            "limit": 5
        }
    )
    assert res_ctx.status_code == 200
    data_ctx = res_ctx.json()
    assert "context" in data_ctx
    assert len(data_ctx["context"]) >= 1
    top_mem = data_ctx["context"][0]
    assert "content" in top_mem
    assert "score" in top_mem


def test_v1_conflict_supersession_lineage(client, tenant_fixture):
    """
    Tests that conflicting updates supersede old memories and track lineage:
    Old: "I use email for notifications"
    New: "I now use WhatsApp for notifications"
    """
    raw_key = tenant_fixture["api_key"]
    headers = {"Authorization": f"Bearer {raw_key}"}
    user_id = f"conflict_{uuid.uuid4().hex[:8]}"

    # 1. First statement
    res1 = client.post(
        "/api/v1/memory/process",
        headers=headers,
        json={"user_id": user_id, "message": "I prefer email notifications for updates."}
    )
    assert res1.status_code == 200

    # 2. Conflicting statement
    res2 = client.post(
        "/api/v1/memory/process",
        headers=headers,
        json={"user_id": user_id, "message": "I've switched to WhatsApp notifications instead of email."}
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2["created"]) >= 1
    new_mem_id = data2["created"][0]["id"]

    # 3. Check lineage
    res_lineage = client.get(f"/api/v1/memories/{new_mem_id}/lineage", headers=headers)
    assert res_lineage.status_code == 200
    lineage_data = res_lineage.json()
    assert "lineage" in lineage_data
    assert len(lineage_data["lineage"]) >= 1


def test_cross_tenant_isolation(client, db):
    """
    Critical Security Test:
    Tenant A and Tenant B both have a user named 'user_shared_id'.
    Tenant B must NEVER receive Tenant A's memories.
    """
    email_a = f"tenant_a_{uuid.uuid4().hex[:6]}@example.com"
    email_b = f"tenant_b_{uuid.uuid4().hex[:6]}@example.com"
    user_a = User(email=email_a, name="Tenant A")
    user_b = User(email=email_b, name="Tenant B")
    db.add_all([user_a, user_b])
    db.commit()

    key_inst_a, key_a = APIKey.generate_key(tenant_id=user_a.id, name="Key A")
    key_inst_b, key_b = APIKey.generate_key(tenant_id=user_b.id, name="Key B")
    db.add_all([key_inst_a, key_inst_b])
    db.commit()

    shared_user_id = f"client_shared_{uuid.uuid4().hex[:6]}"

    # Tenant A stores a secret memory
    res_a = client.post(
        "/api/v1/memories",
        headers={"Authorization": f"Bearer {key_a}"},
        json={
            "user_id": shared_user_id,
            "content": "Confidential patient health diagnosis record for Tenant A.",
            "type": "fact"
        }
    )
    assert res_a.status_code == 201

    # Tenant B queries the same user_id
    res_b = client.post(
        "/api/v1/context",
        headers={"Authorization": f"Bearer {key_b}"},
        json={
            "user_id": shared_user_id,
            "query": "diagnosis record"
        }
    )
    assert res_b.status_code == 200
    assert len(res_b.json()["context"]) == 0, "Security Violation: Tenant B accessed Tenant A's memories!"
