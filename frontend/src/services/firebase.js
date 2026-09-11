/**
 * SportX Firebase Client SDK Configuration & Initialization
 * Project: sportx-ab5f
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoSportXKeyForDevelopmentOnly',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sportx-ab55f.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sportx-ab55f',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'sportx-ab55f.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '936318210167',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:936318210167:web:demoSportXAppId',
};

// Initialize Firebase client app (singleton)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication & Storage
export const auth = getAuth(app);
export const storage = getStorage(app);

// Providers
export const googleProvider = new GoogleAuthProvider();

export const isRealFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  !import.meta.env.VITE_FIREBASE_API_KEY.includes('Demo')
);
