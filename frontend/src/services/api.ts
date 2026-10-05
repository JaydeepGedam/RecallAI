import axios from 'axios';
import { 
  Memory, 
  ScoredMemory, 
  MemoryStats, 
  HealthStatus, 
  User, 
  Conversation, 
  MemoryLineageResponse, 
  ChatResponse,
  MemoryType,
  MemoryStatus
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach active auth token & user ID
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('recallai_token');
  const currentUserId = localStorage.getItem('recallai_user_id');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (currentUserId) {
    config.headers['X-User-Id'] = currentUserId;
  }
  return config;
});

// Interceptor to handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 && 
      !window.location.pathname.includes('/login') && 
      !window.location.pathname.includes('/signup')
    ) {
      localStorage.removeItem('recallai_token');
      localStorage.removeItem('recallai_user_id');
      localStorage.removeItem('recallai_user_name');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  getUsers: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/auth/users');
    return res.data;
  },
  login: async (email: string, password: string = 'password123') => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.access_token) {
      localStorage.setItem('recallai_token', res.data.access_token);
      localStorage.setItem('recallai_user_id', res.data.user.id);
      localStorage.setItem('recallai_user_name', res.data.user.name);
    }
    return res.data;
  },
  register: async (email: string, name: string, password: string = 'password123') => {
    const res = await api.post('/auth/register', { email, name, password });
    if (res.data.access_token) {
      localStorage.setItem('recallai_token', res.data.access_token);
      localStorage.setItem('recallai_user_id', res.data.user.id);
      localStorage.setItem('recallai_user_name', res.data.user.name);
    }
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  }
};

export const memoriesApi = {
  list: async (params?: { 
    user_id?: string; 
    memory_type?: MemoryType; 
    status?: MemoryStatus; 
    search?: string; 
    skip?: number; 
    limit?: number; 
  }): Promise<{ total: number; memories: Memory[] }> => {
    const res = await api.get<{ total: number; memories: Memory[] }>('/memories', { params });
    return res.data;
  },

  get: async (id: string): Promise<Memory> => {
    const res = await api.get<Memory>(`/memories/${id}`);
    return res.data;
  },

  create: async (data: {
    user_id: string;
    content: string;
    memory_type?: MemoryType;
    importance_score?: number;
    confidence_score?: number;
  }): Promise<Memory> => {
    const res = await api.post<Memory>('/memories', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Memory>): Promise<Memory> => {
    const res = await api.patch<Memory>(`/memories/${id}`, data);
    return res.data;
  },

  delete: async (id: string, hardDelete: boolean = false): Promise<void> => {
    await api.delete(`/memories/${id}`, { params: { hard_delete: hardDelete } });
  },

  getLineage: async (id: string): Promise<MemoryLineageResponse> => {
    const res = await api.get<MemoryLineageResponse>(`/memories/${id}/lineage`);
    return res.data;
  },

  search: async (user_id: string, query: string, limit: number = 5): Promise<ScoredMemory[]> => {
    const res = await api.post<ScoredMemory[]>('/memories/search', { user_id, query, limit });
    return res.data;
  },

  extract: async (user_id: string, text: string, autoStore: boolean = true) => {
    const res = await api.post('/memories/extract', { user_id, text, auto_store: autoStore });
    return res.data;
  }
};

export const chatApi = {
  send: async (data: { user_id: string; message: string; conversation_id?: string }): Promise<ChatResponse> => {
    const res = await api.post<ChatResponse>('/chat', data);
    return res.data;
  },

  listConversations: async (user_id: string): Promise<Conversation[]> => {
    const res = await api.get<Conversation[]>('/conversations', { params: { user_id } });
    return res.data;
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const res = await api.get<Conversation>(`/conversations/${id}`);
    return res.data;
  }
};

export const usersApi = {
  getStats: async (userId: string): Promise<MemoryStats> => {
    const res = await api.get<MemoryStats>(`/users/${userId}/memory-stats`);
    return res.data;
  }
};

export const demoApi = {
  seed: async () => {
    const res = await api.post('/demo/seed');
    return res.data;
  },
  reset: async () => {
    const res = await api.post('/demo/reset');
    return res.data;
  }
};

export const healthApi = {
  check: async (): Promise<HealthStatus> => {
    const res = await api.get<HealthStatus>('/health');
    return res.data;
  }
};

export default api;
