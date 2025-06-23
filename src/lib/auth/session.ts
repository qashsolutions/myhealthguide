/**
 * @deprecated This file is deprecated and will be removed soon.
 * 
 * Authentication has been migrated to pure Firebase Auth with session cookies.
 * Please use the new authentication utilities in /lib/auth/firebase-auth.ts
 * 
 * DO NOT USE THIS FILE FOR NEW CODE.
 * 
 * Migration notes:
 * - createSession() → Use Firebase session cookies via firebase-auth.ts
 * - getSession() → Use getCurrentUser() from firebase-auth.ts
 * - clearSession() → Use clearSessionCookie() from firebase-auth.ts
 */

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { ApiResponse } from '@/types';

// Session configuration
// IMPORTANT: JWT_SECRET must be set in production environment variables
// This secret is used to sign and verify JWT tokens in session cookies
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-min-32-characters-long'
);

// Cookie configuration constants
// COOKIE_NAME must match exactly between set and get operations
const COOKIE_NAME = 'mhg-auth-session';

// Session duration: 7 days (in seconds)
// This should match the JWT expiration time for consistency
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

// Get the app domain for cookie configuration
// In production: www.myguide.health or myguide.health
// In development: localhost
const getAppDomain = () => {
  if (process.env.NODE_ENV === 'production') {
    // USE SERVER SIDE BASE_URL DO NOT USE CLIENT SIDE NEXT_PUBLIC
    const appUrl = process.env.BASE_URL || 'https://www.myguide.health';
    try {
      const url = new URL(appUrl);
      // Return domain without subdomain for broader cookie access
      // This allows cookie to work on both www.myguide.health and myguide.health
      const parts = url.hostname.split('.');
      if (parts.length > 2) {
        return `.${parts.slice(-2).join('.')}`; // e.g., .myguide.health
      }
      return url.hostname;
    } catch {
      return '.myguide.health'; // Fallback domain
    }
  }
  // In development, don't set domain (uses current domain automatically)
  return undefined;
};

export interface SessionData {
  userId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  disclaimerAccepted?: boolean;
}

/**
 * Creates a new session after successful authentication
 * Uses httpOnly cookies for security
 */
export async function createSession(data: SessionData): Promise<void> {
  try {
    // Create JWT token with session data
    // The token contains user information and is cryptographically signed
    const token = await new SignJWT({ ...data })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // Must match SESSION_DURATION
      .sign(JWT_SECRET);

    // Get the cookie domain
    const domain = getAppDomain();

    // Log cookie configuration in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Session] Creating session cookie with config:', {
        name: COOKIE_NAME,
        domain: domain || 'current domain',
        secure: false, // Always false in development
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_DURATION,
        httpOnly: true,
      });
    }

    // Set the session cookie with security best practices
    cookies().set(COOKIE_NAME, token, {
      // HttpOnly prevents JavaScript access (XSS protection)
      httpOnly: true,
      
      // Secure flag ensures cookie is only sent over HTTPS in production
      // In development, this is false to allow http://localhost
      secure: process.env.NODE_ENV === 'production',
      
      // SameSite=lax provides CSRF protection while allowing navigation
      // 'lax' allows cookies on navigation but not on cross-site POST/GET
      // 'strict' would be more secure but breaks OAuth flows
      // 'none' would require secure=true and is less secure
      sameSite: 'lax',
      
      // Cookie lifetime in seconds (7 days)
      maxAge: SESSION_DURATION,
      
      // Path=/ makes cookie available to entire application
      // Don't restrict to /api or specific routes
      path: '/',
      
      // Domain configuration for production
      // Setting domain allows cookie to work across subdomains
      // e.g., cookie set on www.myguide.health works on myguide.health
      ...(domain && { domain }),
    });

    // Log successful session creation
    console.log(`[Session] Session created successfully for user: ${data.email}`);
  } catch (error) {
    console.error('[Session] Failed to create session:', error);
    console.error('[Session] Session data:', { 
      userId: data.userId, 
      email: data.email,
      emailVerified: data.emailVerified 
    });
    throw new Error('Session creation failed');
  }
}

/**
 * Retrieves the current session data
 * Returns null if no valid session exists
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    // Attempt to retrieve the session cookie
    // cookies() is a Next.js function that accesses request cookies
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    // Log cookie retrieval attempt in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Session] Attempting to get session cookie:', {
        cookieName: COOKIE_NAME,
        cookieExists: !!sessionCookie,
        cookieValue: sessionCookie?.value ? 'exists (hidden)' : 'not found',
        allCookies: cookieStore.getAll().map(c => c.name), // List all cookie names for debugging
      });
    }

    if (!sessionCookie?.value) {
      // No session cookie found
      console.log('[Session] No session cookie found');
      return null;
    }

    // Verify and decode the JWT token
    // This validates the signature and checks expiration
    const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
    
    // Cast the payload to our SessionData type
    const sessionData = payload as unknown as SessionData;
    
    // Log successful session retrieval
    if (process.env.NODE_ENV === 'development') {
      console.log('[Session] Session retrieved successfully:', {
        userId: sessionData.userId,
        email: sessionData.email,
        emailVerified: sessionData.emailVerified,
      });
    }
    
    return sessionData;
  } catch (error) {
    // Handle token verification errors
    // This could be due to:
    // 1. Invalid signature (tampered token)
    // 2. Expired token
    // 3. Malformed token
    console.error('[Session] Failed to verify session token:', error);
    
    // Clear invalid cookie if it exists
    try {
      // Note: We can't directly clear cookies in getSession since it's often
      // called in non-mutation contexts. The clearing should happen in logout.
      console.log('[Session] Invalid or expired session token detected');
    } catch {}
    
    return null;
  }
}

/**
 * Updates the current session with new data
 * Preserves existing session data while updating specified fields
 */
export async function updateSession(updates: Partial<SessionData>): Promise<void> {
  const currentSession = await getSession();
  
  if (!currentSession) {
    throw new Error('No active session to update');
  }

  const updatedSession = {
    ...currentSession,
    ...updates,
  };

  await createSession(updatedSession);
}

/**
 * Clears the current session (logout)
 * IMPORTANT: Cookie deletion must match the same parameters used when setting
 */
export function clearSession(): void {
  try {
    // Get the cookie domain for consistency
    const domain = getAppDomain();
    
    // Log cookie deletion attempt
    console.log('[Session] Clearing session cookie:', {
      name: COOKIE_NAME,
      domain: domain || 'current domain',
      path: '/',
    });
    
    // Delete the cookie with matching parameters
    // IMPORTANT: path and domain must match what was used in createSession
    cookies().set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Setting maxAge to 0 deletes the cookie
      path: '/', // Must match the path used when setting
      ...(domain && { domain }), // Must match the domain used when setting
    });
    
    console.log('[Session] Session cookie cleared successfully');
  } catch (error) {
    console.error('[Session] Failed to clear session cookie:', error);
  }
}

/**
 * Refreshes session expiry on user activity
 * Call this on important user actions to keep session alive
 */
export async function refreshSession(): Promise<void> {
  const session = await getSession();
  if (session) {
    await createSession(session);
  }
}

/**
 * Validates if the current session has required permissions
 * Used by middleware to protect routes
 */
export async function validateSession(
  requireEmailVerification = false,
  requireDisclaimerAccepted = false
): Promise<ApiResponse<SessionData>> {
  const session = await getSession();

  if (!session) {
    return {
      success: false,
      error: 'Authentication required',
      code: 'auth/unauthenticated',
    };
  }

  if (requireEmailVerification && !session.emailVerified) {
    return {
      success: false,
      error: 'Email verification required',
      code: 'auth/email-not-verified',
    };
  }

  if (requireDisclaimerAccepted && !session.disclaimerAccepted) {
    return {
      success: false,
      error: 'Medical disclaimer acceptance required',
      code: 'disclaimer/not-accepted',
    };
  }

  return {
    success: true,
    data: session,
  };
}