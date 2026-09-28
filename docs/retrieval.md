# Retrieval & Multi-Factor Ranking

Rather than relying purely on vector similarity (which can return obsolete or trivial memories that happened to share keywords), RecallAI employs a **4-Factor Composite Ranking Formula**.

## The Formula

$$\text{Final Score} = (S \times 0.60) + (I \times 0.20) + (C \times 0.10) + (R \times 0.10)$$

Where:
- **$S$ = Semantic Cosine Similarity ($60\%$)**: Range $[0.0, 1.0]$. Compares query vector against memory embedding vector in 1536-dimensional space.
- **$I$ = Importance Score ($20\%$)**: Range $[0.0, 1.0]$. Measures long-term value (e.g. core tech stack = $0.90$, minor interest = $0.40$).
- **$C$ = Confidence Score ($10\%$)**: Range $[0.0, 1.0]$. Reflects certainty (explicit declarative statements = $0.95$, speculative statements = $0.50$).
- **$R$ = Recency Decay Score ($10\%$)**: Range $[0.0, 1.0]$. Exponential half-life decay based on elapsed time since the memory was last accessed.

---

## Recency Mathematical Decay Formula

Let $\Delta t$ be the elapsed days since `last_accessed_at` (or `created_at` if never accessed):

$$R = \exp\left(-\frac{\ln(2) \cdot \Delta t}{T_{1/2}}\right)$$

Where $T_{1/2}$ is the configurable half-life (default: `30.0` days).

### Properties:
- When $\Delta t = 0$ days (used today): $R = 1.0$.
- When $\Delta t = 30$ days: $R = 0.5$.
- When $\Delta t = 60$ days: $R = 0.25$.
- As $\Delta t \to \infty$: $R \to 0.0$.

Every time a memory is retrieved by an AI query, its `last_accessed_at` timestamp is updated to the current time, reinforcing frequently accessed context.
