import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'sportx-fitness-app',
  region: process.env.FUNCTION_REGION || 'us-central1',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '8000', 10),
  appCheckEnforced: process.env.APP_CHECK_ENFORCED === 'true',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'sportx-fitness-app.appspot.com',
};
