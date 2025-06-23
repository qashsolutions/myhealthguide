/**
 * Firebase configuration has been moved to server-side only
 * This file is deprecated and will be removed
 * 
 * All authentication is now handled through:
 * - Server-side: /src/lib/firebase/admin.ts
 * - Session management: /src/lib/auth/session.ts
 * - API routes: /src/app/api/auth/*
 * 
 * Client-side components should use:
 * - useAuth() hook for auth state
 * - API calls for auth operations
 */

// Log deprecation warning in development
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '[DEPRECATED] firebase/config.ts: Client-side Firebase is no longer used.\n' +
    'Use server-side authentication via API routes instead.'
  );
}

// Export empty objects to prevent immediate breaks
// These will be removed once all imports are updated
export const auth = null;
export const db = null;
export default null;