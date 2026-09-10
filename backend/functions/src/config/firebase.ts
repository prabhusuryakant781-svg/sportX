import * as admin from 'firebase-admin';

// In local development/testing without production credentials, default to local Firestore emulator
if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.NODE_ENV !== 'production' && !process.env.K_SERVICE) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'demo-sportx';

// Detect and parse optional Firebase credentials for production/serverless
let credential: admin.credential.Credential | undefined = undefined;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(sa);
  } catch (err) {
    console.warn('[Firebase] Warning: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON');
  }
} else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  credential = admin.credential.cert({
    projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: projectId,
    ...(credential ? { credential } : {})
  });
}

export const hasFirebaseCredentials = Boolean(
  credential ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.K_SERVICE ||
  process.env.FIRESTORE_EMULATOR_HOST
);

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export const messaging = admin.messaging();

