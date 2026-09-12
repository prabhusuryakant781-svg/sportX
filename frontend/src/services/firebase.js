/**
 * SportX Firebase Client SDK Configuration & Initialization
 * Project: sportx-ab5f
 * Strictly uses Vite public variables (VITE_*) for public Firebase configuration.
 * Server secrets (GEMINI_API_KEY, FIREBASE_PRIVATE_KEY, etc.) must NEVER be present here.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sportx-ab5f';
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '936318210167';
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

export const isRealFirebaseConfigured = Boolean(
  apiKey &&
  apiKey !== 'demo-api-key' &&
  !apiKey.includes('Demo') &&
  !apiKey.includes('unconfigured')
);

if (!isRealFirebaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[SportX Firebase Config Notice] Missing or invalid VITE_FIREBASE_API_KEY in environment variables. ' +
    'Real Firebase Authentication and Cloud storage require valid Firebase public web credentials.'
  );
}

const firebaseConfig = {
  apiKey: apiKey || 'UNCONFIGURED_FIREBASE_API_KEY',
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId: appId || '1:936318210167:web:unconfigured',
};

// Initialize Firebase client app (singleton)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication & Storage
export const auth = getAuth(app);
export const storage = getStorage(app);

// Google OAuth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('email');
googleProvider.addScope('profile');
