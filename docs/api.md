# REST API Documentation

Base URL: `http://localhost:8000/api` (Interactive Swagger Docs: `http://localhost:8000/docs`)

---

## 1. Memory Endpoints

### Create Memory
`POST /api/memories`

Creates a memory while checking for semantic duplicates and contradictory conflicts.

**Request:**
```json
{
  "user_id": "56f3c1ec-1d26-4413-91f3-b0d1f549c470",
  "content": "User prefers WhatsApp notifications for critical alerts.",
  "memory_type": "preference",
  "importance_score": 0.90,
  "confidence_score": 0.98
}
```

**Response (201 Created):**
```json
{
  "id": "7f8b9c1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "user_id": "56f3c1ec-1d26-4413-91f3-b0d1f549c470",
  "content": "User prefers WhatsApp notifications for critical alerts.",
  "memory_type": "preference",
  "importance_score": 0.9,
  "confidence_score": 0.98,
  "status": "active",
  "created_at": "2026-09-28T16:00:00Z",
  "updated_at": "2026-09-28T16:00:00Z",
  "last_accessed_at": "2026-09-28T16:00:00Z"
}
```

---

### Retrieve & Rank Memories (Semantic Search)
`POST /api/memories/search`

**Request:**
```json
{
  "user_id": "56f3c1ec-1d26-4413-91f3-b0d1f549c470",
  "query": "How should I contact this user?",
  "limit": 3
}
```

**Response (200 OK):**
```json
[
  {
    "id": "7f8b9c1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "content": "User prefers WhatsApp notifications for critical alerts.",
    "memory_type": "preference",
    "status": "active",
    "semantic_similarity": 0.884,
    "importance_score": 0.90,
    "confidence_score": 0.98,
    "recency_score": 0.952,
    "final_score": 0.903
  }
]
```

---

### List Memories
`GET /api/memories?user_id={id}&status=active&memory_type=skill&search=fastapi`

---

### Get Memory Lineage / History
`GET /api/memories/{id}/lineage`

Returns the full chain of superseded memory relationships for visual evolution graphs.

---

## 2. Interactive Chat Endpoint
`POST /api/chat`

Executes the full end-to-end memory pipeline:
1. Retains dialogue history.
2. Retrieves relevant active memories matching the user query.
3. Feeds supporting context into LLM system prompt.
4. Generates contextual answer.
5. Extracts new structured facts from the user's message.
6. Runs deduplication and conflict detection, storing new memories.

**Request:**
```json
{
  "user_id": "56f3c1ec-1d26-4413-91f3-b0d1f549c470",
  "message": "What backend technology am I using?",
  "conversation_id": "optional-uuid"
}
```

**Response (200 OK):**
```json
{
  "conversation_id": "c1a2b3c4-...",
  "message": "You are currently building your backend using FastAPI and PostgreSQL.",
  "retrieved_memories": [
    {
      "content": "User is building backend using FastAPI and PostgreSQL.",
      "final_score": 0.925
    }
  ],
  "extracted_memories": [],
  "action_notes": []
}
```

---

## 3. User Statistics
`GET /api/users/{user_id}/memory-stats`

Returns counts of total, active, superseded, expired memories, and total conversation sessions.
