import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../services/api';
import type { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>(() => localStorage.getItem('sportx_token') || '');
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    if (token) {
      api.getProfile()
        .then((r: any) => setUser(r.data))
        .catch(() => { localStorage.removeItem('sportx_token'); setToken(''); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const r: any = await api.login(credentials);
    const { token: t, user: u } = r.data;
    localStorage.setItem('sportx_token', t);
    setToken(t);
    setUser(u);
  };

  const signup = async (userData: Partial<User> & { password: string }) => {
    const r: any = await api.signup(userData as any);
    const { token: t, user: u } = r.data;
    localStorage.setItem('sportx_token', t);
    setToken(t);
    setUser(u);
  };

  const loginWithGoogle = async () => {
    // Simulated Google OAuth — in production, use Firebase client SDK
    const r: any = await api.loginWithGoogle({ idToken: 'demo_google_token' });
    const { token: t, user: u } = r.data;
    localStorage.setItem('sportx_token', t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('sportx_token');
    setToken('');
    setUser(null);
  };

  const refreshUser = async (): Promise<User> => {
    const r: any = await api.getProfile();
    setUser(r.data);
    return r.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
