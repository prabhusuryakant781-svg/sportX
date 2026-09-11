import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider, isRealFirebaseConfigured } from '../services/firebase';
import { api } from '../services/api';
import type { User, AuthContextType } from '../types';

export interface ExtendedAuthContextType extends AuthContextType {
  firebaseUser: FirebaseUser | null;
  isFirebaseReady: boolean;
}

const AuthContext = createContext<ExtendedAuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>(() => localStorage.getItem('sportx_token') || '');
  const [loading, setLoading] = useState(true);

  // Source of Truth: Listen to Firebase Auth state changes
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          localStorage.setItem('sportx_token', idToken);
          setToken(idToken);

          // Fetch profile from backend (which ensures users/{uid} exists in Firestore)
          const profileRes: any = await api.getProfile().catch((err) => {
            console.warn('[AuthContext] Backend profile fetch notice:', err.message);
            return null;
          });

          if (profileRes?.data) {
            setUser(profileRes.data);
          } else {
            // Fallback initial user object if network or backend unavailable
            setUser({
              id: fbUser.uid,
              name: fbUser.displayName || 'Athlete',
              email: fbUser.email || '',
              collegeName: 'Campus University',
              department: 'General',
              fitnessLevel: 'beginner',
              fitnessGoal: 'general_fitness',
              availableTimeMinutes: 30,
              selectedSports: [],
              totalXp: 0,
              currentStreak: 0,
              longestStreak: 0,
              lastWorkoutDate: null,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err: any) {
          console.error('[AuthContext] Session restore error:', err);
          localStorage.removeItem('sportx_token');
          setToken('');
          setUser(null);
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

  const login = async (credentials: { email: string; password: string }) => {
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Missing VITE_FIREBASE_API_KEY.');
    }
    const cred = await signInWithEmailAndPassword(auth, credentials.email.trim(), credentials.password);
    const idToken = await cred.user.getIdToken();
    localStorage.setItem('sportx_token', idToken);
    setToken(idToken);
    setFirebaseUser(cred.user);

    const profileRes: any = await api.getProfile().catch(() => null);
    if (profileRes?.data) {
      setUser(profileRes.data);
    }
  };

  const signup = async (userData: Partial<User> & { password: string }) => {
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Missing VITE_FIREBASE_API_KEY.');
    }
    const cred = await createUserWithEmailAndPassword(auth, (userData.email || '').trim(), userData.password);
    
    if (userData.name) {
      await updateProfile(cred.user, { displayName: userData.name }).catch(() => {});
    }

    const idToken = await cred.user.getIdToken();
    localStorage.setItem('sportx_token', idToken);
    setToken(idToken);
    setFirebaseUser(cred.user);

    // Synchronize profile details with backend
    await api.updateProfile({
      name: userData.name,
      collegeName: userData.collegeName || 'Campus University',
      department: userData.department || 'General',
      fitnessLevel: userData.fitnessLevel || 'beginner',
      selectedSports: userData.selectedSports || [],
    }).catch(() => {});

    const profileRes: any = await api.getProfile().catch(() => null);
    if (profileRes?.data) {
      setUser(profileRes.data);
    }
  };

  const loginWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Missing VITE_FIREBASE_API_KEY.');
    }
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      localStorage.setItem('sportx_token', idToken);
      setToken(idToken);
      setFirebaseUser(cred.user);

      const profileRes: any = await api.getProfile().catch(() => null);
      if (profileRes?.data) {
        setUser(profileRes.data);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled by user.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        return;
      }
      throw new Error(err.message || 'Failed to sign in with Google');
    }
  };

  const logout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (_) {}
    localStorage.removeItem('sportx_token');
    setToken('');
    setUser(null);
    setFirebaseUser(null);
  };

  const refreshUser = async (): Promise<User> => {
    const res: any = await api.getProfile();
    if (res?.data) {
      setUser(res.data);
      return res.data;
    }
    return user!;
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
        refreshUser,
        firebaseUser,
        isFirebaseReady: isRealFirebaseConfigured
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): ExtendedAuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

