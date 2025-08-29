import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let app: App;

if (!getApps().length) {
  // Initialize Firebase Admin
  // For production, use environment variables for service account
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || 'healthguide-bc3ba';
  
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    // Production: Use service account from environment variables
    app = initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Development: Initialize with project ID only (requires gcloud auth)
    app = initializeApp({
      projectId: projectId,
    });
    
    console.warn('Firebase Admin initialized without service account credentials. Some features may be limited.');
  }
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export default app;