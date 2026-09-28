# Memory System & Lifecycle

## 1. Memory Types
Every atomic piece of knowledge extracted by RecallAI belongs to one of the following categories:
- **`fact`**: Objective information stated by the user (e.g., *"User lives in Seattle"*).
- **`preference`**: Subjective preference or choice (e.g., *"User prefers WhatsApp notifications"*).
- **`skill`**: Tech stack, tool, or expertise (e.g., *"User builds backends using FastAPI and PostgreSQL"*).
- **`project`**: Active initiatives or repositories (e.g., *"User is building RecallAI"*).
- **`goal`**: Future targets or deadlines (e.g., *"User preparing for launch next month"*).
- **`event`**: Dated occurrences or milestones.
- **`temporary`**: Transient context that will expire after a designated TTL (`expires_at`).

## 2. Memory Lifecycle States
- **`active`**: Normal memory available for semantic search and LLM context building.
- **`superseded`**: An old memory that has been contradicted or replaced by newer information. It remains in the database to preserve evolution history but is excluded from active retrieval.
- **`expired`**: A temporary memory whose expiration date has passed (`expires_at < now`).
- **`deleted`**: A memory soft-deleted by the user.

## 3. Deduplication (Reinforcement)
When a user repeats a memory (e.g. *"I work with React"* followed by *"I build my UI primarily in React"*):
1. The system computes cosine similarity against active memories.
2. If similarity $\ge 0.88$, it recognizes that no new entity needs to be created.
3. Instead, it **reinforces** the existing memory:
   - Updates `confidence_score` ($+0.05$ up to $1.0$).
   - Bumps `last_accessed_at` to the current timestamp.
   - Prevents database bloat and vector pollution.

## 4. Conflict Detection & Evolution History
When a user updates a preference (e.g. *"I no longer want email notifications, notify me on WhatsApp"*):
1. The memory engine detects topic overlap ($sim \ge 0.65$ or identical category).
2. The LLM (or heuristic fallback) evaluates whether the new statement updates or contradicts the old one.
3. If confirmed:
   - The old memory transitions to `status = superseded`.
   - The old memory stores `superseded_by_id = new_memory.id`.
   - The new memory is created with `status = active`.
4. The dashboard displays the full visual timeline:
   ```text
   Jan 10: Email notifications  [superseded]
              ↓ (superseded by)
   Feb 04: WhatsApp notifications [active]
   ```
