import admin from 'firebase-admin';

/**
 * Firebase Admin SDK utilities
 * Server-side only functions for authentication and user management
 */

// Initialize Firebase Admin if needed
export const initializeFirebaseAdmin = () => {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        console.log('Firebase Admin initialized successfully');
      } catch (error) {
        console.error('Firebase admin initialization error:', error);
        throw error;
      }
    } else {
      console.warn('Firebase Admin credentials not found in environment');
    }
  }
};

// Initialize on module load
initializeFirebaseAdmin();

// Export admin instance
export default admin;

// Export getters to ensure initialization
export const adminAuth = () => {
  initializeFirebaseAdmin();
  return admin.auth();
};

export const adminDb = () => {
  initializeFirebaseAdmin();
  return admin.firestore();
};

/**
 * Verify Firebase ID token
 * @param token - The ID token to verify
 * @returns Decoded token or null if invalid
 */
export const verifyAuth = async (token: string): Promise<admin.auth.DecodedIdToken | null> => {
  if (!admin.apps.length) {
    console.error('Firebase Admin not initialized');
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

/**
 * Get user by ID
 * @param uid - The user ID
 * @returns User record or null if not found
 */
export const getUserById = async (uid: string): Promise<admin.auth.UserRecord | null> => {
  if (!admin.apps.length) {
    console.error('Firebase Admin not initialized');
    return null;
  }

  try {
    const user = await admin.auth().getUser(uid);
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

/**
 * Get user by email
 * @param email - The user email
 * @returns User record or null if not found
 */
export const getUserByEmail = async (email: string): Promise<admin.auth.UserRecord | null> => {
  if (!admin.apps.length) {
    console.error('Firebase Admin not initialized');
    return null;
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    return user;
  } catch (error) {
    console.error('Get user by email error:', error);
    return null;
  }
};

/**
 * Delete user account
 * @param uid - The user ID to delete
 * @returns Success boolean
 */
export const deleteUser = async (uid: string): Promise<boolean> => {
  if (!admin.apps.length) {
    console.error('Firebase Admin not initialized');
    return false;
  }

  try {
    await admin.auth().deleteUser(uid);
    return true;
  } catch (error) {
    console.error('Delete user error:', error);
    return false;
  }
};

/**
 * Create custom token for user
 * @param uid - The user ID
 * @param claims - Optional custom claims
 * @returns Custom token or null if failed
 */
export const createCustomToken = async (
  uid: string,
  claims?: Record<string, any>
): Promise<string | null> => {
  if (!admin.apps.length) {
    console.error('Firebase Admin not initialized');
    return null;
  }

  try {
    const token = await admin.auth().createCustomToken(uid, claims);
    return token;
  } catch (error) {
    console.error('Create custom token error:', error);
    return null;
  }
};

/**
 * Set custom user claims
 * @param uid - The user ID
 * @param claims - Custom claims to set
 * @returns Success boolean
 */
export const setCustomUserClaims = async (
  uid: string,
  claims: Record<string, any>
): Promise<boolean> => {
  if (!admin.apps.length) {
    console.error('Firebase Admin not initialized');
    return false;
  }

  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    return true;
  } catch (error) {
    console.error('Set custom claims error:', error);
    return false;
  }
};

/**
 * Generate email verification link
 * @param email - The user email
 * @param actionCodeSettings - Optional action code settings
 * @returns Verification link or null if failed
 */
export const generateEmailVerificationLink = async (
  email: string,
  actionCodeSettings?: admin.auth.ActionCodeSettings
): Promise<string | null> => {
  if (!admin.apps.length) {
    console.error('Firebase Admin not initialized');
    return null;
  }

  try {
    const link = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
    return link;
  } catch (error) {
    console.error('Generate email verification link error:', error);
    return null;
  }
};

/**
 * Get Firestore instance
 * @returns Firestore instance or null
 */
export const getFirestore = (): admin.firestore.Firestore | null => {
  if (!admin.apps.length) {
    console.error('Firebase Admin not initialized');
    return null;
  }

  return admin.firestore();
};