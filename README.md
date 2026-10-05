# RecallAI — AI Memory Infrastructure

RecallAI is a high-performance, modular memory infrastructure platform for AI applications. It empowers autonomous agents and conversational LLMs to automatically extract structured facts, store vector embeddings, perform multi-factor ranked retrieval, and resolve memory conflicts with strict per-user tenant isolation.

---

## Key Highlights & Features

1. **Strict User Isolation & Authentication:**
   - Dedicated User Login and Signup with JWT bearer authentication (`/api/auth/login`, `/api/auth/register`, `/api/auth/me`).
   - Every memory, chat session, and retrieval vector query is strictly bounded to the authenticated user partition.
   - 1-Click "Demo Login as Rahul" button for instant evaluation with 8 pre-seeded memories and evolutionary history.
2. **Autonomous Memory Extraction:**
   - Automatically detects facts, preferences, skills, and goals from user dialogue.
3. **4-Factor Ranked Retrieval Matrix:**
   - Formula: `Final Score = (Semantic × 0.60) + (Importance × 0.20) + (Confidence × 0.10) + (Recency Decay × 0.10)`.
   - Continuous half-life mathematical decay (`30.0 days`).
4. **Intelligent Conflict Detection & Lineage Tracking:**
   - Detects semantic contradictions (e.g., migrating backend from FastAPI to Node.js).
   - Marks older records as `superseded` and creates direct pointers to successor memories.
5. **Interactive Section 33 Acceptance Suite:**
   - Integrated live pipeline runner to execute and verify the full MVP lifecycle in 1 click.

---

## Architecture Overview

```text
                    React Frontend (Vite + TypeScript + Tailwind)
                                   |
                                   | REST API (/api) [JWT Bearer]
                                   ↓
                      FastAPI Backend Service (:8005)
                                   |
              ┌────────────────────┼────────────────────┐
              ↓                    ↓                    ↓
          Auth API             Memory API            Chat API
              |                    |                    |
              └────────────────────┼────────────────────┘
                                   ↓
                             Memory Engine
                                   |
                     ┌─────────────┼─────────────┐
                     ↓             ↓             ↓
                Extraction     Retrieval      Ranking
                     |             |             |
                     └─────────────┼─────────────┘
                                   ↓
                              PostgreSQL
                             (+ pgvector)
                                   |
                                   ↓
                              OpenAI API
                       (Embeddings & Reasoning)
```

---

## Default Ports & Demo Credentials

| Service | Port / URL | Description |
| :--- | :--- | :--- |
| **Frontend UI** | `http://localhost:5173` | Modern Dark-mode React Dashboard & Chat |
| **Backend API** | `http://127.0.0.1:8005` | FastAPI service (`/api`) |
| **Swagger Docs** | `http://127.0.0.1:8005/docs` | OpenAPI Interactive Documentation |
| **Demo User** | `rahul@example.com` / `password123` | Pre-configured with benchmark memories |

*(Port `8005` is used to prevent collisions with existing Windows port `8000` processes).*

---

## 1-Click Fast Start (PowerShell)

To launch both backend and frontend servers simultaneously:

```powershell
.\start-dev.ps1
```

This launches:
- Backend on `http://127.0.0.1:8005`
- Frontend on `http://localhost:5173` (with `/api` proxy configured)

---

## Manual Setup

### 1. Backend Setup
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --app-dir backend --port 8005 --reload
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

### 3. Run Automated Pytest Suite
```powershell
backend\venv\Scripts\pytest backend\tests -v
```
All 10 test suites will verify:
- Demo seeding & cleanup
- Complete CRUD memory lifecycle
- Multi-factor vector search and ranking
- Duplicate detection & confidence reinforcement
- Conflict detection & lineage pointer tracking
- End-to-end Section 33 Acceptance Scenario
- Complete per-user tenant isolation
