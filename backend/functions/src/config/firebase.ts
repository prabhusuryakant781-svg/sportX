import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Read project ID from environment variables (canonical: sportx-ab55f)
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'sportx-ab55f';

// Parse optional Firebase Admin credentials for Vercel serverless / production
let credential: admin.credential.Credential | undefined = undefined;

if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
    credential = admin.credential.cert({
      projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL.trim(),
      privateKey,
    });
  } catch (err: any) {
    console.warn('[Firebase Admin] Notice: Could not parse FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY:', err.message);
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(sa);
  } catch (err) {
    console.warn('[Firebase Admin] Warning: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON');
  }
}

// Initialize Firebase Admin SDK using Application Default Credentials in production Cloud Functions runtime
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
  process.env.FUNCTION_TARGET ||
  process.env.FIREBASE_CONFIG ||
  process.env.FIRESTORE_EMULATOR_HOST
);

// Support named database 'default' (without parentheses) configured on Google Cloud project sportx-ab55f
const firestoreDbName = process.env.FIRESTORE_DATABASE_ID || 'default';
export const db = getFirestore(admin.app(), firestoreDbName);
export const auth = admin.auth();
export const storage = admin.storage();
export const messaging = admin.messaging();

