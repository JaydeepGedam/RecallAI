import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal, init_db
from app.models.user import User
from app.models.memory import Memory, MemoryStatus, MemoryType


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def auth_headers(client):
    """Creates/logs in demo user and returns JWT authorization headers."""
    from app.core.security import get_password_hash
    db = SessionLocal()
    user = db.query(User).filter(User.email == "rahul@example.com").first()
    if user:
        user.hashed_password = get_password_hash("password123")
        db.add(user)
        db.commit()
    db.close()

    resp = client.post("/api/auth/login", json={"email": "rahul@example.com", "password": "password123"})
    if resp.status_code == 200:
        token = resp.json()["access_token"]
        user_id = resp.json()["user"]["id"]
    else:
        # Register if not exists
        reg = client.post("/api/auth/register", json={
            "email": "rahul@example.com",
            "name": "Rahul",
            "password": "password123"
        })
        token = reg.json()["access_token"]
        user_id = reg.json()["user"]["id"]

    return {"Authorization": f"Bearer {token}", "user_id": user_id}



def test_seed_demo_data(client, auth_headers):
    resp = client.post("/api/demo/seed")
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_memory_crud_lifecycle(client, auth_headers):
    user_id = auth_headers["user_id"]
    headers = {"Authorization": auth_headers["Authorization"]}

    # 1. Create Memory
    create_payload = {
        "user_id": user_id,
        "content": "User is learning Rust programming language for system tools.",
        "memory_type": "preference",
        "importance_score": 0.90,
        "confidence_score": 0.95
    }
    create_res = client.post("/api/memories", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    memory_data = create_res.json()
    assert memory_data["content"] == create_payload["content"]
    assert memory_data["status"] == "active"
    mem_id = memory_data["id"]

    # 2. Get Memory Details
    get_res = client.get(f"/api/memories/{mem_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == mem_id

    # 3. Update Memory
    update_payload = {"importance_score": 0.95}
    patch_res = client.patch(f"/api/memories/{mem_id}", json=update_payload, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["importance_score"] == 0.95

    # 4. List Memories
    list_res = client.get(f"/api/memories?user_id={user_id}&status=active", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1

    # 5. Delete Memory (soft delete)
    del_res = client.delete(f"/api/memories/{mem_id}", headers=headers)
    assert del_res.status_code == 200
    # Confirm it's marked as deleted
    db = SessionLocal()
    mem = db.query(Memory).filter(Memory.id == mem_id).first()
    assert mem.status == MemoryStatus.DELETED
    db.close()


def test_vector_search_and_ranking(client, auth_headers):
    user_id = auth_headers["user_id"]
    headers = {"Authorization": auth_headers["Authorization"]}

    # Search for backend tech
    search_payload = {
        "user_id": user_id,
        "query": "What backend framework does this user prefer?",
        "limit": 3
    }
    res = client.post("/api/memories/search", json=search_payload, headers=headers)
    assert res.status_code == 200
    results = res.json()
    assert isinstance(results, list)
    if results:
        top = results[0]
        # Verify 4-factor scoring breakdown exists
        assert "semantic_similarity" in top
        assert "importance_score" in top
        assert "confidence_score" in top
        assert "recency_score" in top
        assert "final_score" in top
        assert top["final_score"] > 0.0


def test_duplicate_detection(client, auth_headers):
    user_id = auth_headers["user_id"]
    headers = {"Authorization": auth_headers["Authorization"]}

    # Create original
    mem1 = client.post("/api/memories", json={
        "user_id": user_id,
        "content": "User uses Docker containers for deployment.",
        "memory_type": "skill",
        "importance_score": 0.8,
        "confidence_score": 0.9
    }, headers=headers).json()

    # Create semantically duplicate
    mem2 = client.post("/api/memories", json={
        "user_id": user_id,
        "content": "User uses Docker containers for deployment.",
        "memory_type": "skill",
        "importance_score": 0.85,
        "confidence_score": 0.9
    }, headers=headers).json()

    # Should reinforce rather than duplicate
    assert mem1["id"] == mem2["id"]


def test_conflict_detection_and_lineage(client, auth_headers):
    user_id = auth_headers["user_id"]
    headers = {"Authorization": auth_headers["Authorization"]}

    # Create initial preference
    initial = client.post("/api/memories", json={
        "user_id": user_id,
        "content": "User prefers Discord for community alerts.",
        "memory_type": "preference",
        "importance_score": 0.85,
        "confidence_score": 0.95
    }, headers=headers).json()

    # Conflicting preference
    newer = client.post("/api/memories", json={
        "user_id": user_id,
        "content": "User prefers Slack for community alerts.",
        "memory_type": "preference",
        "importance_score": 0.90,
        "confidence_score": 0.98
    }, headers=headers).json()

    # Verify old memory is now superseded
    old_check = client.get(f"/api/memories/{initial['id']}", headers=headers).json()
    assert old_check["status"] == "superseded"
    assert old_check["superseded_by_id"] == newer["id"]

    # Verify lineage chain
    lineage_res = client.get(f"/api/memories/{newer['id']}/lineage", headers=headers)
    assert lineage_res.status_code == 200
    chain = lineage_res.json()["chain"]
    assert len(chain) >= 2


def test_end_to_end_scenario_section_33(client, auth_headers):
    """
    Verifies Section 33 acceptance scenario:
    1. User: "I'm building my backend using FastAPI and PostgreSQL."
       -> Extracted & saved as active.
    2. User: "What backend technology am I using?"
       -> Chatbot retrieves FastAPI context.
    3. User: "I've moved my backend to Node.js."
       -> Conflict detected: FastAPI superseded, Node.js active.
    4. User: "What backend am I using now?"
       -> Retrieves Node.js rather than FastAPI!
    """
    user_id = auth_headers["user_id"]
    headers = {"Authorization": auth_headers["Authorization"]}

    # Reset any conflicting backend memories for user to ensure pristine scenario
    client.post("/api/demo/reset")

    # Step 1: User says tech stack
    chat1 = client.post("/api/chat", json={
        "user_id": user_id,
        "message": "I'm building my backend using FastAPI and PostgreSQL."
    }, headers=headers).json()
    conv_id = chat1["conversation_id"]
    assert len(chat1["extracted_memories"]) >= 1

    # Step 2: User asks what backend
    chat2 = client.post("/api/chat", json={
        "user_id": user_id,
        "conversation_id": conv_id,
        "message": "What backend technology am I using?"
    }, headers=headers).json()
    assert "fastapi" in chat2["message"].lower()

    # Step 3: User says migrated to Node.js
    chat3 = client.post("/api/chat", json={
        "user_id": user_id,
        "conversation_id": conv_id,
        "message": "I've moved my backend to Node.js."
    }, headers=headers).json()
    assert len(chat3["extracted_memories"]) >= 1

    # Step 4: User asks what backend now
    chat4 = client.post("/api/chat", json={
        "user_id": user_id,
        "conversation_id": conv_id,
        "message": "What backend am I using now?"
    }, headers=headers).json()
    assert "node" in chat4["message"].lower()


def test_user_tenant_isolation(client):
    import uuid
    suffix = uuid.uuid4().hex[:6]
    # Register User A
    user_a = client.post("/api/auth/register", json={
        "email": f"alice_{suffix}@example.com",
        "name": "Alice",
        "password": "password123"
    }).json()

    # Register User B
    user_b = client.post("/api/auth/register", json={
        "email": f"bob_{suffix}@example.com",
        "name": "Bob",
        "password": "password123"
    }).json()

    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

    # Alice creates a private memory
    mem_alice = client.post("/api/memories", json={
        "user_id": user_a["user"]["id"],
        "content": "Alice secret api key is 12345",
        "memory_type": "fact",
        "importance_score": 1.0,
        "confidence_score": 1.0
    }, headers=headers_a).json()

    # Bob attempts to read Alice's memory -> Must be Forbidden 403
    forbidden_get = client.get(f"/api/memories/{mem_alice['id']}", headers=headers_b)
    assert forbidden_get.status_code == 403

    # Bob attempts to delete Alice's memory -> Must be Forbidden 403
    forbidden_delete = client.delete(f"/api/memories/{mem_alice['id']}", headers=headers_b)
    assert forbidden_delete.status_code == 403

    # Bob searches memories -> Alice's memory must not appear
    bob_search = client.post("/api/memories/search", json={
        "user_id": user_b["user"]["id"],
        "query": "secret api key"
    }, headers=headers_b).json()
    assert len(bob_search) == 0

