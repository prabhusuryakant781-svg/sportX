import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  onIdTokenChanged,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { auth, googleProvider, isRealFirebaseConfigured } from '../services/firebase.js';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sportx_token') || '');
  const [loading, setLoading] = useState(true);

  // Monitor Firebase Auth state & auto-refresh ID tokens
  useEffect(() => {
    let unsubscribe = () => {};

    if (auth) {
      unsubscribe = onIdTokenChanged(auth, async (currentFbUser) => {
        if (currentFbUser) {
          try {
            const idToken = await currentFbUser.getIdToken();
            setFirebaseUser(currentFbUser);
            setToken(idToken);
            localStorage.setItem('sportx_token', idToken);

            // Fetch profile from backend using the verified token
            const profileRes = await api.getProfile().catch(() => null);
            if (profileRes && profileRes.data) {
              setUser(profileRes.data);
            } else {
              setUser({
                id: currentFbUser.uid,
                name: currentFbUser.displayName || 'Athlete',
                email: currentFbUser.email,
                totalXp: 0,
                currentStreak: 0,
                level: 1
              });
            }
          } catch (err) {
            console.warn('[AuthContext] Failed to sync Firebase user:', err);
          }
        } else {
          setFirebaseUser(null);
          // If not in demo mode, clear session
          const savedToken = localStorage.getItem('sportx_token');
          if (savedToken && !savedToken.startsWith('demo')) {
            localStorage.removeItem('sportx_token');
            setToken('');
            setUser(null);
          }
        }
        setLoading(false);
      });
    } else {
      // Fallback if Firebase not available
      if (token) {
        api.getProfile()
          .then(r => setUser(r.data))
          .catch(() => {
            localStorage.removeItem('sportx_token');
            setToken('');
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }

    return () => unsubscribe();
  }, []);

  /**
   * Log in user using Firebase Authentication
   */
  const login = async (credentials) => {
    const { email, password } = credentials;

    // Demo bypass for local automated testing or demo user
    if (email === 'demo' || email === 'demo@sportx.app' || !isRealFirebaseConfigured) {
      try {
        const r = await api.login(credentials);
        if (r && r.data) {
          const { token: t, user: u } = r.data;
          localStorage.setItem('sportx_token', t);
          setToken(t);
          setUser(u);
          return r;
        }
      } catch (err) {
        if (!isRealFirebaseConfigured) {
          // Local offline fallback
          const demoUser = {
            id: 'demo_student_01',
            name: 'Aarav Sharma',
            email: 'aarav@campus.edu',
            collegeName: 'Campus University',
            totalXp: 450,
            currentStreak: 4,
            level: 3
          };
          localStorage.setItem('sportx_token', 'demo');
          setToken('demo');
          setUser(demoUser);
          return { success: true, data: { token: 'demo', user: demoUser } };
        }
        throw err;
      }
    }

    // Real Firebase Auth client sign-in
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    localStorage.setItem('sportx_token', idToken);
    setToken(idToken);
    setFirebaseUser(userCredential.user);

    // Sync with backend profile
    const profileRes = await api.getProfile().catch(() => null);
    const finalUser = profileRes?.data || {
      id: userCredential.user.uid,
      name: userCredential.user.displayName || email.split('@')[0],
      email: userCredential.user.email,
    };
    setUser(finalUser);

    return { success: true, data: { token: idToken, user: finalUser } };
  };

  /**
   * Sign up user using Firebase Authentication
   */
  const signup = async (userData) => {
    const { email, password, name, collegeName, department, fitnessLevel, selectedSports } = userData;

    if (!isRealFirebaseConfigured) {
      const r = await api.signup(userData);
      const { token: t, user: u } = r.data;
      localStorage.setItem('sportx_token', t);
      setToken(t);
      setUser(u);
      return r;
    }

    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    // 2. Set display name
    if (name) {
      await updateFirebaseProfile(fbUser, { displayName: name }).catch(() => {});
    }

    const idToken = await fbUser.getIdToken();
    localStorage.setItem('sportx_token', idToken);
    setToken(idToken);
    setFirebaseUser(fbUser);

    // 3. Initialize profile in backend Firestore
    const profilePayload = {
      name: name || fbUser.displayName || 'Athlete',
      email: fbUser.email,
      collegeName: collegeName || 'Campus University',
      department: department || 'Engineering',
      fitnessLevel: fitnessLevel || 'beginner',
      selectedSports: selectedSports || []
    };

    try {
      await api.updateProfile(profilePayload);
    } catch (err) {
      console.warn('[AuthContext] Backend profile init warning:', err);
    }

    const updatedUser = {
      id: fbUser.uid,
      ...profilePayload,
      totalXp: 0,
      currentStreak: 0,
      level: 1
    };
    setUser(updatedUser);

    return { success: true, data: { token: idToken, user: updatedUser } };
  };

  /**
   * Sign in with Google Popup
   */
  const loginWithGoogle = async () => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const fbUser = userCredential.user;
    const idToken = await fbUser.getIdToken();
    localStorage.setItem('sportx_token', idToken);
    setToken(idToken);
    setFirebaseUser(fbUser);

    const profileRes = await api.getProfile().catch(() => null);
    const finalUser = profileRes?.data || {
      id: fbUser.uid,
      name: fbUser.displayName || 'Athlete',
      email: fbUser.email,
    };
    setUser(finalUser);
    return { success: true, data: { token: idToken, user: finalUser } };
  };

  /**
   * Send Password Reset Email
   */
  const resetPassword = async (email) => {
    if (auth) {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Password reset email sent' };
    }
  };

  /**
   * Log out current session
   */
  const logout = async () => {
    try {
      if (auth && auth.currentUser) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn('[AuthContext] SignOut error:', err);
    }
    localStorage.removeItem('sportx_token');
    setToken('');
    setFirebaseUser(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const r = await api.getProfile().catch(() => null);
    if (r && r.data) {
      setUser(r.data);
      return r.data;
    }
    return user;
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      token,
      loading,
      login,
      signup,
      loginWithGoogle,
      resetPassword,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
