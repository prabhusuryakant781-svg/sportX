import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
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

  // Check for redirect result from Google OAuth (mobile/popup-blocked fallback)
  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth)
      .then(async (cred) => {
        if (cred && cred.user) {
          try {
            const idToken = await cred.user.getIdToken();
            localStorage.setItem('sportx_token', idToken);
            setToken(idToken);
            setFirebaseUser(cred.user);

            let profileData: any = null;
            try {
              const res: any = await api.loginWithGoogle({ idToken });
              if (res?.data?.user) profileData = res.data.user;
            } catch (_) {
              const profileRes: any = await api.getProfile().catch(() => null);
              if (profileRes?.data) profileData = profileRes.data;
            }

            if (profileData) {
              setUser(profileData);
            }
          } catch (e) {
            console.error('[AuthContext] Redirect result processing error:', e);
          }
        }
      })
      .catch((err) => {
        console.warn('[AuthContext] Redirect sign-in notice:', err.message);
      });
  }, []);

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

    // Development fallback when real Firebase credentials are not provided in local environment
    if (!isRealFirebaseConfigured && import.meta.env.DEV) {
      console.info('[SportX Auth] Development Google login active.');
      const devId = 'athlete_google_' + Date.now();
      const devToken = 'dev_google_token_' + Date.now();
      const devUser: User = {
        id: devId,
        name: 'Google Athlete (Dev)',
        email: 'google.athlete@sportx.app',
        collegeName: 'Campus University',
        department: 'Athletics',
        fitnessLevel: 'intermediate',
        fitnessGoal: 'general_fitness',
        availableTimeMinutes: 30,
        selectedSports: ['basketball', 'badminton'],
        totalXp: 150,
        currentStreak: 3,
        longestStreak: 5,
        lastWorkoutDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('sportx_token', devToken);
      setToken(devToken);
      setUser(devUser);
      return;
    }

    try {
      let cred: any;
      try {
        cred = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        // If popup was blocked by browser or adblocker, fallback to redirect
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupErr;
      }

      const idToken = await cred.user.getIdToken();
      localStorage.setItem('sportx_token', idToken);
      setToken(idToken);
      setFirebaseUser(cred.user);

      // Synchronize with backend Google login endpoint to ensure Firestore user document exists
      let profileData: User | null = null;
      try {
        const backendRes: any = await api.loginWithGoogle({ idToken });
        if (backendRes?.data?.user) {
          profileData = backendRes.data.user;
        }
      } catch (backendErr: any) {
        console.warn('[AuthContext] Backend /auth/google notice:', backendErr.message);
        const profileRes: any = await api.getProfile().catch(() => null);
        if (profileRes?.data) {
          profileData = profileRes.data;
        }
      }

      if (profileData) {
        setUser(profileData);
      } else {
        setUser({
          id: cred.user.uid,
          name: cred.user.displayName || 'Google Athlete',
          email: cred.user.email || '',
          profileImage: cred.user.photoURL || undefined,
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
      console.error('[AuthContext] Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in was cancelled.');
      } else if (err.code === 'auth/unauthorized-domain') {
        throw new Error('Current domain is not authorized in Firebase Console (Authentication -> Settings -> Authorized Domains).');
      } else if (err.code === 'auth/operation-not-allowed') {
        throw new Error('Google sign-in is not enabled in Firebase Console (Authentication -> Sign-in method).');
      } else if (err.code === 'auth/invalid-api-key' || err.code === 'auth/api-key-not-valid') {
        throw new Error('Invalid Firebase API key. Please check your VITE_FIREBASE_API_KEY.');
      } else if (err.code === 'auth/network-request-failed') {
        throw new Error('Network error during Google sign-in. Please check your connection.');
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

  const resetPassword = async (email: string) => {
    if (!auth) {
      throw new Error('Firebase Authentication is not configured.');
    }
    await sendPasswordResetEmail(auth, email.trim());
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
        resetPassword,
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

