import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { ApiResponse } from '@/types';

// Session configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-min-32-characters-long'
);
const COOKIE_NAME = 'mhg-auth-session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

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
    const token = await new SignJWT(data)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    cookies().set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION,
      path: '/',
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    throw new Error('Session creation failed');
  }
}

/**
 * Retrieves the current session data
 * Returns null if no valid session exists
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionData;
  } catch (error) {
    // Invalid or expired token
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
 */
export function clearSession(): void {
  cookies().delete(COOKIE_NAME);
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