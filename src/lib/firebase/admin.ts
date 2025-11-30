/**
 * Firebase Admin SDK Configuration
 *
 * For SERVER-SIDE use only (API routes).
 * Uses Admin SDK to bypass Firestore security rules with proper authentication.
 *
 * NEVER import this file in client-side code.
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | undefined;
let adminDb: Firestore | undefined;
let adminAuth: Auth | undefined;

function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // Get credentials from environment variable
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson);
      adminApp = initializeApp({
        credential: cert(credentials),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } catch (error) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
      throw new Error('Invalid Firebase Admin credentials');
    }
  } else {
    // Fallback for local development with GOOGLE_APPLICATION_CREDENTIALS file path
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  return adminApp;
}

/**
 * Get Firebase Admin Firestore instance
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
  }
  return adminDb;
}

/**
 * Get Firebase Admin Auth instance
 */
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}
