import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Firebase Authentication utilities
 * Pure server-side implementation for healthcare app
 */

// Session cookie configuration
const SESSION_COOKIE_NAME = 'session';
const SESSION_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 14 * 1000, // 14 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? 'www.myguide.health' : undefined,
};

// Email verification token expiry (24 hours)
const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * Normalize email address for consistent handling
 * Handles plus-addressing and ensures lowercase
 */
export function normalizeEmail(email: string): string {
  const trimmedEmail = email.trim().toLowerCase();
  const [localPart, domain] = trimmedEmail.split('@');
  
  if (!localPart || !domain) {
    throw new Error('Invalid email format');
  }
  
  // Remove plus-addressing (e.g., user+tag@gmail.com → user@gmail.com)
  const cleanLocal = localPart.split('+')[0];
  
  return `${cleanLocal}@${domain}`;
}

/**
 * Create a session cookie for authenticated user
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  try {
    // Verify the ID token
    const decodedToken = await adminAuth().verifyIdToken(idToken);
    
    // Create session cookie with 14-day expiration
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn });
    
    return sessionCookie;
  } catch (error) {
    console.error('[Auth] Session cookie creation failed:', error);
    throw new Error('Failed to create session');
  }
}

/**
 * Set session cookie in response
 */
export async function setSessionCookie(sessionCookie: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, SESSION_COOKIE_OPTIONS);
}

/**
 * Get session cookie from request
 */
export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Verify session cookie and return user data
 */
export async function verifySessionCookie(sessionCookie: string): Promise<DecodedIdToken | null> {
  try {
    // Verify the session cookie
    const decodedClaims = await adminAuth().verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    console.error('[Auth] Session verification failed:', error);
    return null;
  }
}

/**
 * Get current authenticated user from session
 */
export async function getCurrentUser(): Promise<DecodedIdToken | null> {
  const sessionCookie = await getSessionCookie();
  
  if (!sessionCookie) {
    return null;
  }
  
  return verifySessionCookie(sessionCookie);
}

/**
 * Check if user email is verified
 */
export async function isEmailVerified(uid: string): Promise<boolean> {
  try {
    const user = await adminAuth().getUser(uid);
    return user.emailVerified;
  } catch (error) {
    console.error('[Auth] Failed to check email verification:', error);
    return false;
  }
}

/**
 * Generate verification token for email
 */
export async function generateVerificationToken(email: string): Promise<string> {
  const token = generateRandomToken();
  const expiresAt = Date.now() + VERIFICATION_TOKEN_EXPIRY;
  
  // Store token in Firestore
  await adminDb().collection('emailVerifications').doc(token).set({
    email: normalizeEmail(email),
    createdAt: Date.now(),
    expiresAt,
    used: false,
  });
  
  return token;
}

/**
 * Verify email verification token
 */
export async function verifyEmailToken(token: string): Promise<{ email: string; uid?: string } | null> {
  try {
    const doc = await adminDb().collection('emailVerifications').doc(token).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data()!;
    
    // Check if token is expired or already used
    if (data.expiresAt < Date.now() || data.used) {
      return null;
    }
    
    // Mark token as used
    await doc.ref.update({ used: true });
    
    return { email: data.email, uid: data.uid };
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return null;
  }
}

/**
 * Create user account with Firebase Auth
 */
export async function createUserAccount(email: string, password: string, displayName: string) {
  const normalizedEmail = normalizeEmail(email);
  
  try {
    // Check if user already exists
    try {
      const existingUser = await adminAuth().getUserByEmail(normalizedEmail);
      if (existingUser) {
        throw new Error('An account with this email already exists');
      }
    } catch (error: any) {
      // User doesn't exist, continue with creation
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }
    
    // Create user in Firebase Auth
    const userRecord = await adminAuth().createUser({
      email: normalizedEmail,
      password,
      displayName,
      emailVerified: false,
    });
    
    // Create user document in Firestore
    await adminDb().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: normalizedEmail,
      displayName,
      emailVerified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      medications: [],
      profile: {
        age: '',
        conditions: [],
      },
    });
    
    return userRecord;
  } catch (error: any) {
    console.error('[Auth] User creation failed:', error);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/email-already-exists' || error.message?.includes('already exists')) {
      throw new Error('An account with this email already exists');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters');
    }
    
    throw new Error('Failed to create account. Please try again.');
  }
}

/**
 * Verify user password
 */
export async function verifyUserPassword(email: string, password: string): Promise<string | null> {
  const normalizedEmail = normalizeEmail(email);
  
  try {
    // Get user by email
    const user = await adminAuth().getUserByEmail(normalizedEmail);
    
    if (!user) {
      return null;
    }
    
    // Since Firebase Admin SDK doesn't verify passwords directly,
    // we'll use the REST API with the server API key
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_SERVER_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          returnSecureToken: true,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('[Auth] Password verification failed:', error);
      return null;
    }
    
    const data = await response.json();
    return data.idToken;
  } catch (error) {
    console.error('[Auth] Password verification error:', error);
    return null;
  }
}

/**
 * Update user email verification status
 */
export async function markEmailAsVerified(uid: string): Promise<void> {
  try {
    // Update Firebase Auth
    await adminAuth().updateUser(uid, {
      emailVerified: true,
    });
    
    // Update Firestore
    await adminDb().collection('users').doc(uid).update({
      emailVerified: true,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('[Auth] Failed to mark email as verified:', error);
    throw new Error('Failed to verify email');
  }
}

/**
 * Revoke all refresh tokens for user
 */
export async function revokeUserTokens(uid: string): Promise<void> {
  try {
    await adminAuth().revokeRefreshTokens(uid);
  } catch (error) {
    console.error('[Auth] Failed to revoke tokens:', error);
  }
}

/**
 * Generate random token
 */
function generateRandomToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Get user data from Firestore
 */
export async function getUserData(uid: string) {
  try {
    const doc = await adminDb().collection('users').doc(uid).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data();
  } catch (error) {
    console.error('[Auth] Failed to get user data:', error);
    return null;
  }
}