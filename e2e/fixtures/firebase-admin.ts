/**
 * Firebase Admin SDK utilities for E2E tests
 * Connects to Firebase emulators for test data setup and verification
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { TEST_CONFIG } from './test-config';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

/**
 * Initialize Firebase Admin SDK for emulator testing
 */
export function initializeTestAdmin(): { auth: Auth; db: Firestore } {
  if (adminApp && adminAuth && adminDb) {
    return { auth: adminAuth, db: adminDb };
  }

  // Set emulator environment variables
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${TEST_CONFIG.emulators.auth.host}:${TEST_CONFIG.emulators.auth.port}`;
  process.env.FIRESTORE_EMULATOR_HOST = `${TEST_CONFIG.emulators.firestore.host}:${TEST_CONFIG.emulators.firestore.port}`;

  // Initialize admin app for emulators (no credentials needed for emulators)
  if (getApps().length === 0) {
    adminApp = initializeApp({
      projectId: 'demo-myguide-health',
    });
  } else {
    adminApp = getApps()[0];
  }

  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);

  return { auth: adminAuth, db: adminDb };
}

/**
 * Create a test user directly in Auth emulator
 */
export async function createTestUserInAuth(
  email: string,
  password: string,
  displayName?: string
): Promise<string> {
  const { auth } = initializeTestAdmin();

  try {
    // Check if user already exists
    const existingUser = await auth.getUserByEmail(email).catch(() => null);
    if (existingUser) {
      return existingUser.uid;
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
      emailVerified: false,
    });

    return userRecord.uid;
  } catch (error: any) {
    console.error('Error creating test user in auth:', error.message);
    throw error;
  }
}

/**
 * Create user document in Firestore emulator
 */
export async function createTestUserDocument(
  uid: string,
  userData: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    subscriptionStatus?: 'trial' | 'active' | 'expired' | 'canceled';
    subscriptionTier?: 'family' | 'single_agency' | 'multi_agency' | null;
    trialDaysRemaining?: number;
  }
): Promise<void> {
  const { db } = initializeTestAdmin();

  const now = new Date();
  const trialDays = userData.trialDaysRemaining ?? TEST_CONFIG.trial.familyDays;
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const passwordExpiry = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000);

  const userDoc = {
    id: uid,
    email: userData.email,
    phoneNumber: userData.phoneNumber || '',
    phoneNumberHash: '',
    emailVerified: false,
    phoneVerified: false,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    firstName: userData.firstName,
    lastName: userData.lastName,
    groups: [],
    agencies: [],
    preferences: {
      theme: 'light',
      notifications: {
        sms: true,
        email: true,
      },
    },
    trialStartDate: now,
    trialEndDate: trialEnd,
    gracePeriodStartDate: null,
    gracePeriodEndDate: null,
    dataExportRequested: false,
    subscriptionStatus: userData.subscriptionStatus || 'trial',
    subscriptionTier: userData.subscriptionTier || null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStartDate: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    pendingPlanChange: null,
    storageUsed: 0,
    storageLimit: 25 * 1024 * 1024,
    lastPasswordChange: now,
    passwordExpiresAt: passwordExpiry,
    passwordResetRequired: false,
    createdAt: now,
    lastLoginAt: now,
  };

  await db.collection('users').doc(uid).set(userDoc);
}

/**
 * Create a complete test user (Auth + Firestore)
 */
export async function createCompleteTestUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'canceled';
  subscriptionTier?: 'family' | 'single_agency' | 'multi_agency' | null;
  trialDaysRemaining?: number;
}): Promise<string> {
  const uid = await createTestUserInAuth(
    userData.email,
    userData.password,
    `${userData.firstName} ${userData.lastName}`
  );

  await createTestUserDocument(uid, userData);

  return uid;
}

/**
 * Get user document from Firestore
 */
export async function getTestUserDocument(uid: string): Promise<any | null> {
  const { db } = initializeTestAdmin();

  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Get user by email from Firestore
 */
export async function getTestUserByEmail(email: string): Promise<any | null> {
  const { db } = initializeTestAdmin();

  const snapshot = await db
    .collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

/**
 * Delete test user (Auth + Firestore)
 */
export async function deleteTestUser(uid: string): Promise<void> {
  const { auth, db } = initializeTestAdmin();

  // Delete from Firestore
  await db.collection('users').doc(uid).delete();

  // Delete from Auth
  try {
    await auth.deleteUser(uid);
  } catch (error: any) {
    // User might not exist in auth
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  }
}

/**
 * Delete user by email
 */
export async function deleteTestUserByEmail(email: string): Promise<void> {
  const { auth, db } = initializeTestAdmin();

  try {
    const userRecord = await auth.getUserByEmail(email);
    await deleteTestUser(userRecord.uid);
  } catch (error: any) {
    // User might not exist
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  }
}

/**
 * Clear all test data from Firestore collection
 */
export async function clearCollection(collectionName: string): Promise<void> {
  const { db } = initializeTestAdmin();

  const snapshot = await db.collection(collectionName).get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

/**
 * Get all documents from a collection
 */
export async function getCollectionDocuments(collectionName: string): Promise<any[]> {
  const { db } = initializeTestAdmin();

  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Verify session was created for user
 */
export async function verifySessionCreated(userId: string): Promise<boolean> {
  const { db } = initializeTestAdmin();

  const snapshot = await db
    .collection('sessions')
    .where('userId', '==', userId)
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Get session events for user
 */
export async function getSessionEvents(userId: string): Promise<any[]> {
  const { db } = initializeTestAdmin();

  const snapshot = await db
    .collection('sessionEvents')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Verify group was created for user
 */
export async function verifyGroupCreated(userId: string): Promise<{ exists: boolean; groupId?: string }> {
  const { db } = initializeTestAdmin();

  const snapshot = await db
    .collection('groups')
    .where('adminId', '==', userId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { exists: false };
  }

  return { exists: true, groupId: snapshot.docs[0].id };
}

/**
 * Verify agency was created for user
 */
export async function verifyAgencyCreated(userId: string): Promise<{ exists: boolean; agencyId?: string }> {
  const { db } = initializeTestAdmin();

  const snapshot = await db
    .collection('agencies')
    .where('superAdminId', '==', userId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { exists: false };
  }

  return { exists: true, agencyId: snapshot.docs[0].id };
}

/**
 * Update user subscription status
 */
export async function updateUserSubscription(
  uid: string,
  status: 'trial' | 'active' | 'expired' | 'canceled',
  options?: {
    tier?: 'family' | 'single_agency' | 'multi_agency';
    trialEndDate?: Date;
    gracePeriodEndDate?: Date;
  }
): Promise<void> {
  const { db } = initializeTestAdmin();

  const updates: any = {
    subscriptionStatus: status,
  };

  if (options?.tier) {
    updates.subscriptionTier = options.tier;
  }

  if (options?.trialEndDate) {
    updates.trialEndDate = options.trialEndDate;
  }

  if (status === 'expired') {
    const now = new Date();
    updates.gracePeriodStartDate = now;
    updates.gracePeriodEndDate =
      options?.gracePeriodEndDate ||
      new Date(now.getTime() + TEST_CONFIG.trial.gracePeriodHours * 60 * 60 * 1000);
  }

  await db.collection('users').doc(uid).update(updates);
}
