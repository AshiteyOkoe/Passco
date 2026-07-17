import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import * as api from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    institution?: string;
    gradeLevel?: string;
    dateOfBirth: string;
  }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateAvatar: (file: File) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('passco-token');
    const storedUser = localStorage.getItem('passco-user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('passco-token');
        localStorage.removeItem('passco-user');
      }
    }
    setLoading(false);
  }, []);

  const persistUser = (u: User) => {
    setUser(u);
    localStorage.setItem('passco-user', JSON.stringify(u));
  };

  const loginHandler = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('passco-token', res.token);
    localStorage.setItem('passco-user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const registerHandler = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    institution?: string;
    gradeLevel?: string;
    dateOfBirth: string;
  }) => {
    const res = await api.register(data);
    localStorage.setItem('passco-token', res.token);
    localStorage.setItem('passco-user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('passco-token');
    localStorage.removeItem('passco-user');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    const res = await api.updateProfile(data);
    persistUser(res.user);
  };

  const updateAvatar = async (file: File): Promise<string> => {
    const res = await api.uploadAvatar(file);
    if (user) {
      const updated = { ...user, avatar: res.avatar };
      persistUser(updated);
    }
    return res.avatar;
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login: loginHandler, register: registerHandler, logout, updateProfile, updateAvatar }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
