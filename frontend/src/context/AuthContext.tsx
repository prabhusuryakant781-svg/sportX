import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { api } from '../services/api';
import type { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>(() => {
    const stored = localStorage.getItem('sportx_token') || '';
    if (stored === 'demo' || stored.startsWith('demo_')) {
      localStorage.removeItem('sportx_token');
      return '';
    }
    return stored;
  });
  const [loading, setLoading] = useState(true);

  // Synchronize with Firebase Auth lifecycle and restore user profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const freshIdToken = await firebaseUser.getIdToken();
          localStorage.setItem('sportx_token', freshIdToken);
          setToken(freshIdToken);

          const r: any = await api.getProfile();
          setUser(r.data);
        } catch (err) {
          console.error('[Auth] Failed to restore profile from API:', err);
        }
      } else {
        localStorage.removeItem('sportx_token');
        setToken('');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Real email/password login verified through Firebase Auth
   */
  const login = async (credentials: { email: string; password: string }) => {
    // 1. Authenticate with Firebase Authentication
    const credential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    // 2. Obtain real Firebase ID Token
    const idToken = await credential.user.getIdToken(true);
    localStorage.setItem('sportx_token', idToken);
    setToken(idToken);

    // 3. Inform backend and synchronize profile
    const r: any = await api.login({ idToken, email: credentials.email, password: credentials.password });
    const userData = r.data?.user;
    if (userData) {
      setUser(userData);
    } else {
      const profileRes: any = await api.getProfile();
      setUser(profileRes.data);
    }
  };

  /**
   * Real user signup through Firebase Auth
   */
  const signup = async (userData: Partial<User> & { password: string }) => {
    // 1. Create account in Firebase Authentication
    const credential = await createUserWithEmailAndPassword(auth, userData.email!, userData.password);
    const idToken = await credential.user.getIdToken(true);
    localStorage.setItem('sportx_token', idToken);
    setToken(idToken);

    // 2. Initialize Firestore profile via API
    const r: any = await api.signup(userData as any);
    const createdUser = r.data?.user;
    if (createdUser) {
      setUser(createdUser);
    } else {
      const profileRes: any = await api.getProfile();
      setUser(profileRes.data);
    }
  };

  /**
   * Real Google OAuth sign-in via Firebase popup
   */
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken(true);
    localStorage.setItem('sportx_token', idToken);
    setToken(idToken);

    const r: any = await api.loginWithGoogle({ idToken });
    const googleUser = r.data?.user;
    if (googleUser) {
      setUser(googleUser);
    } else {
      const profileRes: any = await api.getProfile();
      setUser(profileRes.data);
    }
  };

  /**
   * Password reset: dispatches reset email without exposing reset link
   */
  const resetPassword = async (email: string) => {
    // Dispatch via backend API (or client SDK as fallback)
    try {
      await api.resetPassword(email);
    } catch (_) {
      await sendPasswordResetEmail(auth, email);
    }
  };

  /**
   * Secure sign out: revokes tokens and clears storage
   */
  const logout = async () => {
    try {
      await api.logout();
    } catch (_) {}
    try {
      await signOut(auth);
    } catch (_) {}
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
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        resetPassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
