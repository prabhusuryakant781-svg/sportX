import * as admin from 'firebase-admin';

// In local development/testing without production credentials, default to local Firestore emulator
if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.NODE_ENV !== 'production' && !process.env.K_SERVICE) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'demo-sportx';

// Initialize Firebase Admin SDK with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: projectId
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export const messaging = admin.messaging();
