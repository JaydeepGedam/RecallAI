# RecallAI — Architecture & Data Flow

RecallAI is a developer-first memory infrastructure layer built for AI agents and conversational applications.

## High-Level Architecture

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
             |                     |                     |
             ↓                     ↓                     ↓
       Memory Service      Retrieval Service         Auth / Stats
             |                     |                     |
             └──────────────┬──────┴─────────────────────┘
                            ↓
                    SQLAlchemy 2.0 ORM
                            |
                            ↓
             PostgreSQL with pgvector Extension
             (Tables: users, conversations, messages, memories)
                            |
                            ↓
                        OpenAI API
             (text-embedding-3-small & gpt-4o-mini)
```

## Core Components

### 1. Memory Engine (`app/services/memory_service.py`)
Responsible for the lifecycle of memories:
- **Creation**: Runs deduplication and conflict detection prior to writing.
- **Deduplication**: Semantically compares incoming memories against existing active memories. If cosine similarity $\ge 0.88$, it reinforces importance and bumps access timestamps rather than creating redundant duplicates.
- **Conflict Resolution**: If a new memory contradicts an existing one (e.g. changing notification channels from Email to WhatsApp, or moving from FastAPI to Node.js), it marks the old memory as `superseded` and records `superseded_by_id = new_memory.id` to preserve evolution history.
- **Lineage Traversal**: Allows developers to visualize how a user's preferences evolved over time.

### 2. Semantic Vector Retrieval (`app/services/retrieval_service.py`)
Performs 4-factor composite ranking:
1. **Semantic Similarity ($60\%$)**: Cosine similarity between query vector and candidate memory embeddings.
2. **Importance ($20\%$)**: LLM-assigned weight ($0.0 \dots 1.0$) distinguishing critical constraints from casual mentions.
3. **Confidence ($10\%$)**: Certainty score ($0.0 \dots 1.0$) distinguishing direct declarations ("I use React") from speculations ("I might switch to Vue").
4. **Recency Decay ($10\%$)**: Smooth mathematical exponential decay half-life ($30$ days), ensuring inactive memories gradually yield to fresher context.

### 3. Reasoning & Chat Service (`app/services/llm_service.py`)
- Extracts structured facts from natural conversation using `gpt-4o-mini`.
- Generates context-aware responses with explicit instructions to treat memories as supporting context and never leak internal scoring metrics to end users.
