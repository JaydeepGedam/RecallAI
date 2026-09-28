# Database Architecture & pgvector Integration

RecallAI is powered by PostgreSQL with the `pgvector` extension for high-performance vector indexing and exact nearest-neighbor search.

## Entity-Relationship Schema

```text
  +------------------+           +----------------------+
  |      users       |           |    conversations     |
  +------------------+           +----------------------+
  | id (UUID, PK)    |<---\      | id (UUID, PK)        |<---\
  | email (Unique)   |    |      | user_id (FK -> users)|    |
  | name             |    \------| title                |    |
  | hashed_password  |           | created_at           |    |
  | created_at       |           | updated_at           |    |
  +------------------+           +----------------------+    |
         ^                                                   |
         |                                                   |
         +-------------------------------+                   |
         |                               |                   |
         |                               v                   |
  +-----------------------+      +-----------------------+   |
  |       memories        |      |       messages        |   |
  +-----------------------+      +-----------------------+   |
  | id (UUID, PK)         |      | id (UUID, PK)         |   |
  | user_id (FK -> users) |      | conversation_id (FK) -+---/
  | content (Text)        |      | role (user/assistant) |
  | memory_type (Enum)    |      | content (Text)        |
  | importance (Float)    |      | created_at            |
  | confidence (Float)    |      +-----------------------+
  | embedding (Vector1536)|                  ^
  | status (Enum)         |                  |
  | source_message_id ----+------------------+
  | superseded_by_id -----+--> [points to newer memory id]
  | created_at            |
  | updated_at            |
  | last_accessed_at      |
  | expires_at            |
  +-----------------------+
```

## pgvector Implementation Details

When running with PostgreSQL:
1. `init_db()` automatically runs `CREATE EXTENSION IF NOT EXISTS vector;`.
2. The `embedding` column is defined with `Vector(1536)` matching OpenAI's `text-embedding-3-small`.
3. Cosine distance queries use the `<=>` operator.
4. For developer local testing or zero-dependency unit tests, [`app/db/vector_type.py`](file:///c:/Users/jaydeep-vm-new/Documents/RecallAI/backend/app/db/vector_type.py) includes a transparent SQLite JSON fallback that preserves vector operations without crashing.
