import { App, initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * Firebase Admin SDK Configuration
 * Used for server-side operations with elevated privileges
 */

let app: App | undefined;

const initializeFirebaseAdmin = () => {
  // Return existing app if already initialized
  if (getApps().length > 0) {
    return getApp();
  }

  // Skip initialization during build time or if credentials are missing
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.log('Firebase Admin SDK not initialized: Missing credentials');
    return null;
  }

  try {
    const serviceAccount = {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n')
    };

    app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });

    return app;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return null;
  }
};

// Initialize on first import (will be null during build)
const firebaseApp = initializeFirebaseAdmin();

// Export admin services (will be null during build, initialized at runtime)
export const auth = firebaseApp ? getAuth(firebaseApp) : null as any;
export const db = firebaseApp ? getFirestore(firebaseApp) : null as any;
export const storage = firebaseApp ? getStorage(firebaseApp) : null as any;

export default firebaseApp;