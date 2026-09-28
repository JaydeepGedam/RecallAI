import json
import re
from typing import List, Dict, Any, Optional
from openai import OpenAI
from app.core.config import settings
from app.core.logging import logger
from app.models.memory import MemoryType


class LLMService:
    """
    Handles LLM interactions:
    1. Automatic structured memory extraction from conversations.
    2. Conflict and contradiction analysis between old and new memories.
    3. Context-augmented chatbot responses utilizing retrieved memories.
    """

    def __init__(self):
        self.model = settings.OPENAI_MODEL
        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> Optional[OpenAI]:
        if not self._client and settings.OPENAI_API_KEY:
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    def extract_memories(
        self,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Analyzes a user statement to extract structured memory objects.
        Returns a list of dicts with:
        - content (str)
        - memory_type (str)
        - importance_score (float 0.0 - 1.0)
        - confidence_score (float 0.0 - 1.0)
        """
        user_message = user_message.strip()
        if not user_message:
            return []

        # Check if OpenAI is available
        if self.client:
            try:
                system_prompt = (
                    "You are RecallAI's Memory Extraction Engine. Your task is to extract useful, "
                    "long-term facts, preferences, skills, projects, goals, or events from the user's message.\n\n"
                    "RULES:\n"
                    "1. DO NOT extract transient chit-chat, greetings, or momentary states (e.g. 'I am tired', 'ok', 'hello').\n"
                    "2. Extract clear, atomic statements written in the third person (e.g., 'User prefers WhatsApp notifications').\n"
                    "3. Assign an importance_score between 0.0 and 1.0:\n"
                    "   - Core tech stack, primary contact preference, critical constraints: 0.8 - 1.0\n"
                    "   - Minor preferences, general interests: 0.4 - 0.7\n"
                    "   - Temporary or transient mentions: 0.1 - 0.3\n"
                    "4. Assign a confidence_score between 0.0 and 1.0:\n"
                    "   - Direct explicit statements ('I use React', 'I prefer dark mode'): 0.95 - 1.0\n"
                    "   - Probable or qualified statements ('I usually use Python'): 0.75 - 0.90\n"
                    "   - Uncertain or exploratory statements ('I think I might switch to Vue'): 0.40 - 0.70\n"
                    "5. Choose memory_type strictly from: 'fact', 'preference', 'skill', 'project', 'goal', 'event', 'temporary'.\n"
                    "6. Return ONLY a valid JSON object matching this schema:\n"
                    "   {\n"
                    "     \"memories\": [\n"
                    "       {\n"
                    "         \"content\": \"string\",\n"
                    "         \"memory_type\": \"preference\",\n"
                    "         \"importance_score\": 0.9,\n"
                    "         \"confidence_score\": 0.95\n"
                    "       }\n"
                    "     ]\n"
                    "   }\n"
                    "If no long-term memory is present, return {\"memories\": []}."
                )

                history_context = ""
                if conversation_history:
                    history_context = "Recent conversation context:\n" + "\n".join(
                        [f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in conversation_history[-4:]]
                    ) + "\n\n"

                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"{history_context}Current user message: \"{user_message}\""}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1
                )
                raw_json = response.choices[0].message.content or "{}"
                data = json.loads(raw_json)
                memories = data.get("memories", [])
                logger.info(f"LLM extracted {len(memories)} memories from user message.")
                return memories
            except Exception as e:
                logger.warning(f"LLM memory extraction failed: {e}. Utilizing heuristic extractor.")

        # Heuristic rule-based extractor fallback
        return self._heuristic_extract(user_message)

    def _heuristic_extract(self, text: str) -> List[Dict[str, Any]]:
        """
        Rule-based heuristic extractor used when OpenAI is offline or in demo mode.
        Recognizes common preference, tech stack, and intent patterns.
        """
        memories = []
        lower = text.lower().strip()

        # Ignore greetings & trivialities
        trivial_phrases = ["hi", "hello", "hey", "how are you", "what can you do", "thanks", "thank you", "bye", "ok", "cool"]
        if lower in trivial_phrases or len(lower.split()) < 3:
            return []

        # Backend tech patterns
        if "backend" in lower and ("using" in lower or "with" in lower or "building" in lower or "moved" in lower or "switched" in lower):
            if "fastapi" in lower and "postgresql" in lower:
                memories.append({
                    "content": "User is building backend using FastAPI and PostgreSQL.",
                    "memory_type": MemoryType.SKILL.value,
                    "importance_score": 0.85,
                    "confidence_score": 0.98
                })
            elif "node" in lower:
                memories.append({
                    "content": "User uses Node.js for backend development.",
                    "memory_type": MemoryType.SKILL.value,
                    "importance_score": 0.85,
                    "confidence_score": 0.95
                })
            elif "fastapi" in lower:
                memories.append({
                    "content": "User is building backend using FastAPI.",
                    "memory_type": MemoryType.SKILL.value,
                    "importance_score": 0.85,
                    "confidence_score": 0.95
                })

        # Notification preference patterns
        if "prefer" in lower or "notification" in lower or "contact" in lower:
            if "whatsapp" in lower:
                memories.append({
                    "content": "User prefers WhatsApp notifications.",
                    "memory_type": MemoryType.PREFERENCE.value,
                    "importance_score": 0.90,
                    "confidence_score": 0.95
                })
            elif "email" in lower:
                memories.append({
                    "content": "User prefers email notifications.",
                    "memory_type": MemoryType.PREFERENCE.value,
                    "importance_score": 0.85,
                    "confidence_score": 0.95
                })

        # Frontend tech patterns
        if "react" in lower and ("work" in lower or "use" in lower or "frontend" in lower):
            memories.append({
                "content": "User works with React for frontend development.",
                "memory_type": MemoryType.SKILL.value,
                "importance_score": 0.85,
                "confidence_score": 0.95
            })

        # Style preference
        if "concise" in lower:
            memories.append({
                "content": "User prefers concise explanations.",
                "memory_type": MemoryType.PREFERENCE.value,
                "importance_score": 0.90,
                "confidence_score": 0.95
            })
        if "dark mode" in lower:
            memories.append({
                "content": "User prefers dark mode interface.",
                "memory_type": MemoryType.PREFERENCE.value,
                "importance_score": 0.70,
                "confidence_score": 0.95
            })

        # Generic statement catch-all if explicitly stating "I use..." or "I prefer..."
        if not memories and (lower.startswith("i use ") or lower.startswith("i prefer ") or lower.startswith("i am building ")):
            statement = text.strip()
            # Convert first person to third person
            statement = re.sub(r"\bI am\b", "User is", statement, flags=re.IGNORECASE)
            statement = re.sub(r"\bI\b", "User", statement, flags=re.IGNORECASE)
            statement = re.sub(r"\bmy\b", "their", statement, flags=re.IGNORECASE)
            memories.append({
                "content": statement,
                "memory_type": MemoryType.FACT.value,
                "importance_score": 0.75,
                "confidence_score": 0.90
            })

        return memories

    def detect_conflict(self, existing_memory: str, new_memory: str) -> Dict[str, Any]:
        """
        Determines whether a new memory contradicts, replaces, or supersedes an existing memory.
        Returns:
        {
            "is_conflict": bool,
            "explanation": str,
            "should_supersede": bool
        }
        """
        if self.client:
            try:
                system_prompt = (
                    "You are a Memory Conflict Resolution Engine. Compare an existing memory with a new memory.\n"
                    "Determine whether the new memory updates, supersedes, or directly contradicts the existing memory.\n\n"
                    "EXAMPLES OF CONFLICT/SUPERSEDING:\n"
                    "- Existing: 'User prefers email notifications.' vs New: 'User prefers WhatsApp notifications.' -> Conflict (preference changed)\n"
                    "- Existing: 'User backend is built with FastAPI.' vs New: 'User backend is built with Node.js.' -> Conflict (tech stack updated)\n"
                    "- Existing: 'User lives in London.' vs New: 'User moved to New York.' -> Conflict (location updated)\n\n"
                    "EXAMPLES OF NON-CONFLICT:\n"
                    "- Existing: 'User uses React.' vs New: 'User uses PostgreSQL.' -> No conflict (complementary skills)\n"
                    "- Existing: 'User likes coffee.' vs New: 'User prefers dark mode.' -> No conflict\n\n"
                    "Return ONLY valid JSON:\n"
                    "{\n"
                    "  \"is_conflict\": true/false,\n"
                    "  \"explanation\": \"short reasoning\",\n"
                    "  \"should_supersede\": true/false\n"
                    "}"
                )

                user_content = f"Existing Memory: \"{existing_memory}\"\nNew Memory: \"{new_memory}\""
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.0
                )
                data = json.loads(response.choices[0].message.content or "{}")
                logger.info(f"Conflict check between '{existing_memory}' and '{new_memory}': {data.get('is_conflict')}")
                return data
            except Exception as e:
                logger.warning(f"LLM conflict detection failed: {e}. Using heuristic conflict check.")

        # Heuristic conflict check fallback
        return self._heuristic_conflict_check(existing_memory, new_memory)

    def _heuristic_conflict_check(self, existing: str, new_str: str) -> Dict[str, Any]:
        """
        Heuristic fallback conflict detector.
        Compares topic domains (notification preference, backend stack, database, etc.).
        """
        e_low = existing.lower()
        n_low = new_str.lower()

        # Notification preference conflict
        if ("notification" in e_low or "notif" in e_low or "alert" in e_low) and ("notification" in n_low or "notif" in n_low or "alert" in n_low):
            channels = ["whatsapp", "email", "sms", "slack", "discord"]
            e_chan = [c for c in channels if c in e_low]
            n_chan = [c for c in channels if c in n_low]
            if e_chan and n_chan and e_chan[0] != n_chan[0]:
                return {
                    "is_conflict": True,
                    "explanation": f"Notification preference updated from {e_chan[0]} to {n_chan[0]}.",
                    "should_supersede": True
                }

        # Backend framework conflict
        if ("backend" in e_low or "api" in e_low) and ("backend" in n_low or "node" in n_low or "fastapi" in n_low):
            frameworks = ["fastapi", "node", "django", "express", "flask", "spring", "rails"]
            e_fw = [f for f in frameworks if f in e_low]
            n_fw = [f for f in frameworks if f in n_low]
            if e_fw and n_fw and e_fw[0] != n_fw[0]:
                return {
                    "is_conflict": True,
                    "explanation": f"Backend technology changed from {e_fw[0]} to {n_fw[0]}.",
                    "should_supersede": True
                }

        return {
            "is_conflict": False,
            "explanation": "No direct contradiction detected.",
            "should_supersede": False
        }

    def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        retrieved_memories: List[Dict[str, Any]]
    ) -> str:
        """
        Generates context-aware chatbot response using retrieved supporting memories.
        Strictly instructs LLM not to reveal internal scores and prioritize newer memories.
        """
        memories_text = ""
        if retrieved_memories:
            memories_list = [f"- {m.get('content', '')}" for m in retrieved_memories]
            memories_text = "SUPPORTING USER MEMORIES (Context only):\n" + "\n".join(memories_list)
        else:
            memories_text = "SUPPORTING USER MEMORIES: None available."

        system_prompt = (
            "You are RecallAI, an intelligent conversational AI assistant equipped with long-term memory.\n\n"
            f"{memories_text}\n\n"
            "INSTRUCTIONS:\n"
            "1. Use the supporting memories to personalize your answers and recall facts the user previously shared.\n"
            "2. Memories are supporting context, not absolute ground truth. If the user explicitly states something new, prefer their current statement.\n"
            "3. If memories conflict, prefer the newer information.\n"
            "4. Never invent or hallucinate facts that are not present in memories or current dialogue.\n"
            "5. NEVER reveal internal memory mechanics, scores (importance, confidence, recency, similarity), or metadata to the user.\n"
            "6. Keep responses clear, helpful, natural, and friendly."
        )

        if self.client:
            try:
                full_messages = [{"role": "system", "content": system_prompt}]
                for m in messages[-8:]:
                    full_messages.append({
                        "role": m.get("role", "user"),
                        "content": m.get("content", "")
                    })

                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=full_messages,
                    temperature=0.7
                )
                return response.choices[0].message.content or "I understand."
            except Exception as e:
                logger.warning(f"LLM chat response failed: {e}. Generating contextual fallback.")

        latest_user_message = messages[-1].get("content", "") if messages else ""
        return self._heuristic_chat_response(latest_user_message, retrieved_memories)

    def _heuristic_chat_response(self, user_query: str, memories: List[Dict[str, Any]]) -> str:
        query_low = user_query.lower()

        # Check for backend query
        if "backend" in query_low:
            backend_mems = [m for m in memories if "backend" in m.get("content", "").lower() or "node" in m.get("content", "").lower() or "fastapi" in m.get("content", "").lower()]
            if backend_mems:
                top_mem = backend_mems[0].get("content", "")
                text_clean = top_mem
                for prefix in ["User is building backend using ", "User uses ", "User works with "]:
                    if text_clean.startswith(prefix):
                        text_clean = text_clean[len(prefix):]
                        break
                return f"You are using {text_clean}"
            return "I don't have a record of what backend technology you are currently using yet."

        # Check for notification query
        if "notif" in query_low or "reach" in query_low or "contact" in query_low or "how will you" in query_low:
            notif_mems = [m for m in memories if "whatsapp" in m.get("content", "").lower() or "email" in m.get("content", "").lower() or "sms" in m.get("content", "").lower()]
            if notif_mems:
                top_mem = notif_mems[0].get("content", "")
                return f"According to your preferences, {top_mem.lower().replace('user prefers', 'I will notify you via')}"
            return "I don't have a saved preference for your notification channel yet."

        if memories:
            top_mem = memories[0].get("content", "")
            return f"I remember that {top_mem.lower().replace('user ', 'you ')}. How can I help you today?"

        return "Got it! Let me know how I can help you with your project."



llm_service = LLMService()
