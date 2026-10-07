import React, { createContext, useContext, useState, useEffect } from 'react';
import { ScoredMemory, Memory } from '../types';

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  retrievedMemories?: ScoredMemory[];
  extractedMemories?: Memory[];
  actionNotes?: string[];
  timestamp: string;
}

interface ChatContextType {
  messages: ChatTurn[];
  conversationId: string | undefined;
  setMessages: React.Dispatch<React.SetStateAction<ChatTurn[]>>;
  setConversationId: React.Dispatch<React.SetStateAction<string | undefined>>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY_MESSAGES = 'recallai_active_messages';
const STORAGE_KEY_CONV_ID = 'recallai_active_conv_id';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatTurn[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_MESSAGES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [conversationId, setConversationId] = useState<string | undefined>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_CONV_ID) || undefined;
    } catch {
      return undefined;
    }
  });

  // Sync with sessionStorage whenever state updates
  useEffect(() => {
    try {
      if (messages.length > 0) {
        sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
      } else {
        sessionStorage.removeItem(STORAGE_KEY_MESSAGES);
      }
    } catch (e) {
      console.warn('Failed to save chat messages to sessionStorage', e);
    }
  }, [messages]);

  useEffect(() => {
    try {
      if (conversationId) {
        sessionStorage.setItem(STORAGE_KEY_CONV_ID, conversationId);
      } else {
        sessionStorage.removeItem(STORAGE_KEY_CONV_ID);
      }
    } catch (e) {
      console.warn('Failed to save conversation ID to sessionStorage', e);
    }
  }, [conversationId]);

  const clearChat = () => {
    setMessages([]);
    setConversationId(undefined);
    sessionStorage.removeItem(STORAGE_KEY_MESSAGES);
    sessionStorage.removeItem(STORAGE_KEY_CONV_ID);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        conversationId,
        setMessages,
        setConversationId,
        clearChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
