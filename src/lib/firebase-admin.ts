import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * Firebase Admin SDK Configuration
 * Used for server-side operations with elevated privileges
 */

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // In production, use environment variables for service account
  const serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "your-project-id",
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "your-client-email",
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n') || "your-private-key"
  };

  try {
    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-storage-bucket"
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    // Return a mock app for development
    return initializeApp({
      credential: cert({
        projectId: "development-project",
        clientEmail: "dev@example.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9W8bA\n-----END PRIVATE KEY-----\n"
      })
    });
  }
};

const app = initializeFirebaseAdmin();

// Export admin services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;