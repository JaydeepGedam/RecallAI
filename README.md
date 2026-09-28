# RecallAI — AI Memory Infrastructure

RecallAI is a high-performance, modular memory infrastructure platform for AI applications. It empowers autonomous agents and conversational LLMs to automatically extract structured facts, store vector embeddings, perform multi-factor ranked retrieval, and resolve memory conflicts.

---

## Architecture Overview

```text
                    React Frontend (Vite + Tailwind)
                                   |
                                   | REST API (/api)
                                   ↓
                       FastAPI Backend Service
                                   |
             ┌─────────────────────┼─────────────────────┐
             ↓                     ↓                     ↓
        Memory API             Chat API              User API
             |
             ↓
       Memory Engine
             |
      ┌──────┼──────┐
      ↓      ↓      ↓
 Extraction Retrieval Ranking
      |      |      |
      └──────┼──────┘
             ↓
        PostgreSQL
       (+ pgvector)
             |
             ↓
        OpenAI API
  (Embeddings & Reasoning)
```

---

## Database Design

The database stores relational entities and vector representations with strict tenant isolation:

1. **`users`**: Tenant accounts (`id`, `email`, `name`, `hashed_password`, `created_at`).
2. **`conversations`**: Chat sessions (`id`, `user_id`, `title`, `created_at`, `updated_at`).
3. **`messages`**: Raw conversation logs (`id`, `conversation_id`, `role`, `content`, `created_at`).
4. **`memories`**: Extracted knowledge units:
   - `id`: UUID primary key
   - `user_id`: Foreign key to `users.id` (strictly isolated)
   - `content`: Memory statement
   - `memory_type`: `fact`, `preference`, `skill`, `project`, `goal`, `event`, `temporary`
   - `importance_score`: Float between 0.0 and 1.0
   - `confidence_score`: Float between 0.0 and 1.0
   - `embedding`: Vector (`1536` dimensions via `pgvector` with SQLite JSON fallback)
   - `status`: `active`, `superseded`, `expired`, `deleted`
   - `source_message_id`: Foreign key to `messages.id`
   - `superseded_by_id`: Foreign key to `memories.id` (tracks lineage/evolution)
   - `created_at`, `updated_at`, `last_accessed_at`, `expires_at`

---

## Directory Structure

```text
recallai/
│
├── frontend/                     # React + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── components/           # UI components
│   │   ├── pages/                # Dashboard, Memories, Details, Chat
│   │   ├── services/             # Axios API client
│   │   ├── hooks/                # Custom React hooks
│   │   ├── types/                # TypeScript interface definitions
│   │   ├── App.tsx               # Root App component
│   │   └── main.tsx              # React entry point
│   ├── Dockerfile
│   └── package.json
│
├── backend/                      # FastAPI + SQLAlchemy + pgvector
│   ├── app/
│   │   ├── api/                  # API routers & endpoints
│   │   │   ├── deps.py           # Dependency injection (DB session, auth)
│   │   │   └── routes/           # Endpoint modules (health, memories, chat, users)
│   │   ├── core/                 # Configuration & logging
│   │   ├── db/                   # Database engine, session, & vector type decorator
│   │   ├── models/               # SQLAlchemy models (User, Conversation, Message, Memory)
│   │   ├── schemas/              # Pydantic schemas for validation & serialization
│   │   ├── services/             # Business logic (memory, embedding, retrieval, llm)
│   │   └── main.py               # FastAPI application entry point
│   ├── tests/                    # Pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml            # Multi-container orchestration (Postgres+pgvector, backend, frontend)
├── .env.example                  # Environment configuration template
├── README.md
└── .gitignore
```

---

## Quickstart & Verification

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- (Optional for containers) Docker & Docker Compose

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Verify Database & Models
```bash
python test_phase1_db.py
```

### 4. Run Pytest Suite
```bash
pytest tests/test_phase1.py
```

### 5. Start Backend Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation will be available at: `http://localhost:8000/docs`

### 6. Start Frontend Server
```bash
cd frontend
npm install
npm run dev
```
Frontend interface will be available at: `http://localhost:5173`
