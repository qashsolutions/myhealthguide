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

    // Skip initialization if credentials are not available
    // This is normal during build time
    if (!projectId || !clientEmail || !privateKey) {
      // Only log during actual runtime failures
      if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
        const missingVars = [];
        if (!projectId) missingVars.push('Project ID');
        if (!clientEmail) missingVars.push('Client Email');
        if (!privateKey) missingVars.push('Private Key');
        
        console.error('[Firebase Admin] Missing required configuration:', missingVars.join(', '));
      }
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\\\n/g, '\n'),
        }),
      });
      console.log('[Firebase Admin] Service initialized successfully');
    } catch (error) {
      console.error('[Firebase Admin] Initialization failed:', error);
      // Log additional context for debugging
      console.error('[Firebase Admin] Project ID present:', !!projectId);
      console.error('[Firebase Admin] Client email present:', !!clientEmail);
      console.error('[Firebase Admin] Private key present:', !!privateKey);
      console.error('[Firebase Admin] Private key length:', privateKey ? privateKey.length : 0);
      
      // Check if it's a common formatting issue
      if (privateKey && !privateKey.includes('BEGIN PRIVATE KEY')) {
        console.error('[Firebase Admin] Private key may be incorrectly formatted');
      }
      
      throw new Error('Firebase Admin initialization failed. Please check server configuration.');
    }
  }
};

// Don't initialize on module load - let it happen lazily
// initializeFirebaseAdmin();

// Export admin instance
export default admin;

// Helper to check if Firebase Admin is initialized
export const isFirebaseAdminInitialized = (): boolean => {
  return admin.apps.length > 0;
};

// Export getters to ensure initialization
export const adminAuth = () => {
  try {
    initializeFirebaseAdmin();
    
    if (!admin.apps.length) {
      console.error('[Firebase Admin] Cannot access auth service - not initialized');
      console.error('[Firebase Admin] Environment check:', {
        hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
      });
      throw new Error('Authentication service is temporarily unavailable. Please try again later.');
    }
    
    return admin.auth();
  } catch (error: any) {
    console.error('[Firebase Admin] adminAuth() failed:', error.message);
    throw error;
  }
};

export const adminDb = () => {
  try {
    initializeFirebaseAdmin();
    
    if (!admin.apps.length) {
      console.error('[Firebase Admin] Cannot access Firestore service - not initialized');
      console.error('[Firebase Admin] Environment check:', {
        hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
      });
      throw new Error('Database service is temporarily unavailable. Please try again later.');
    }
    
    return admin.firestore();
  } catch (error: any) {
    console.error('[Firebase Admin] adminDb() failed:', error.message);
    throw error;
  }
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