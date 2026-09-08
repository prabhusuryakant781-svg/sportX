import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (safely prevents multiple initializations)
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (error) {
    admin.initializeApp({
      projectId: process.env.GCLOUD_PROJECT || 'sportx-app'
    });
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export const messaging = admin.messaging();
