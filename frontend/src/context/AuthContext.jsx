import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sportx_token') || '');
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    if (token) {
      api.getProfile()
        .then(r => setUser(r.data))
        .catch(() => { localStorage.removeItem('sportx_token'); setToken(''); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const r = await api.login(credentials);
    const { token: t, user: u } = r.data;
    localStorage.setItem('sportx_token', t);
    setToken(t);
    setUser(u);
    return r;
  };

  const signup = async (userData) => {
    const r = await api.signup(userData);
    const { token: t, user: u } = r.data;
    localStorage.setItem('sportx_token', t);
    setToken(t);
    setUser(u);
    return r;
  };

  const logout = () => {
    localStorage.removeItem('sportx_token');
    setToken('');
    setUser(null);
  };

  const refreshUser = async () => {
    const r = await api.getProfile();
    setUser(r.data);
    return r.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
