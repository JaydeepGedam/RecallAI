export type MemoryType = 
  | 'fact' 
  | 'preference' 
  | 'skill' 
  | 'project' 
  | 'goal' 
  | 'event' 
  | 'temporary';

export type MemoryStatus = 
  | 'active' 
  | 'superseded' 
  | 'expired' 
  | 'deleted';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  memory_type: MemoryType;
  importance_score: number;
  confidence_score: number;
  status: MemoryStatus;
  source_message_id?: string | null;
  superseded_by_id?: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  expires_at?: string | null;
}

export interface ScoredMemory extends Memory {
  semantic_similarity: number;
  recency_score: number;
  final_score: number;
}

export interface MemoryStats {
  total: number;
  active: number;
  superseded: number;
  expired: number;
  conversations_count: number;
}

export interface LineageItem {
  id: string;
  content: string;
  memory_type: MemoryType;
  status: MemoryStatus;
  created_at: string;
  importance_score: number;
  confidence_score: number;
  is_current: boolean;
}

export interface MemoryLineageResponse {
  memory_id: string;
  chain: LineageItem[];
}

export interface ChatResponse {
  conversation_id: string;
  message: string;
  retrieved_memories: ScoredMemory[];
  extracted_memories: Memory[];
  action_notes: string[];
}

export interface HealthStatus {
  status: string;
  version: string;
  environment: string;
  database: string;
}

