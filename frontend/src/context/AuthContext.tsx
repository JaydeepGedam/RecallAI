import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, password?: string) => Promise<void>;
  quickDemoLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('episodic_token') || localStorage.getItem('recallai_token')
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('episodic_token') || localStorage.getItem('recallai_token');
      if (storedToken) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
          setToken(storedToken);
          localStorage.setItem('episodic_user_id', profile.id);
          localStorage.setItem('episodic_user_name', profile.name);
          localStorage.setItem('recallai_user_id', profile.id);
          localStorage.setItem('recallai_user_name', profile.name);
        } catch {
          // Token invalid or expired
          localStorage.removeItem('episodic_token');
          localStorage.removeItem('episodic_user_id');
          localStorage.removeItem('episodic_user_name');
          localStorage.removeItem('recallai_token');
          localStorage.removeItem('recallai_user_id');
          localStorage.removeItem('recallai_user_name');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string = 'password123') => {
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setUser(res.user);
      setToken(res.access_token);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string = 'password123') => {
    setLoading(true);
    try {
      const res = await authApi.register(email, name, password);
      setUser(res.user);
      setToken(res.access_token);
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = async () => {
    return login('rahul@example.com', 'password123');
  };

  const logout = () => {
    localStorage.removeItem('episodic_token');
    localStorage.removeItem('episodic_user_id');
    localStorage.removeItem('episodic_user_name');
    localStorage.removeItem('recallai_token');
    localStorage.removeItem('recallai_user_id');
    localStorage.removeItem('recallai_user_name');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        quickDemoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
