# Authentication System Updates - Session Summary

## Overview
This document summarizes all authentication system updates made to migrate from hybrid custom sessions + Firebase Auth to pure Firebase Auth with server-side session cookies.

## Problems Solved

### 1. Plus-Addressed Email Issues
**Problem**: Gmail plus-addressed emails (e.g., `user+tag@gmail.com`) could sign up but couldn't log in.
**Solution**: Implemented email normalization that strips plus-addressing before all auth operations.

### 2. Session State Conflicts
**Problem**: Mixed authentication patterns between custom JWT sessions and Firebase Auth causing conflicts.
**Solution**: Migrated to pure Firebase Auth with session cookies managed by Firebase Admin SDK.

### 3. User ID Mismatches
**Problem**: Different user IDs in session vs client causing 403 errors on disclaimer acceptance.
**Solution**: Standardized all APIs to use Firebase session as single source of truth.

### 4. Authentication Redirect Loop
**Problem**: After login, users were stuck on signup page or experienced redirect loops.
**Solution**: Fixed login redirect logic and ensured consistent email handling across the system.

## Key Changes Made

### 1. New Firebase Auth Utilities (`/src/lib/auth/firebase-auth.ts`)
Created comprehensive auth utilities with:
- Email normalization function (strips plus-addressing)
- Session cookie management (14-day expiration)
- Firebase Admin SDK integration
- Custom email verification tokens
- User data management

```typescript
// Key functions added:
normalizeEmail(email: string): string
createSessionCookie(idToken: string): Promise<string>
getCurrentUser(): Promise<DecodedIdToken | null>
verifyEmailToken(token: string): Promise<{email: string} | null>
createUserAccount(email: string, password: string, displayName: string)
```

### 2. Updated API Routes

#### `/api/auth/signup`
- Uses normalized emails for account creation
- Generates custom verification tokens
- Sends branded emails via Resend
- No session creation until after verification

#### `/api/auth/login`
- Added `credentials: 'include'` for cookie support
- Verifies passwords using Firebase Admin SDK
- Creates Firebase session cookies
- Returns original signup email when login email differs
- Checks disclaimer status before redirect

#### `/api/auth/verify-email`
- Uses custom token verification
- Updates Firebase Auth verification status
- No automatic session creation (user must login)

#### `/api/auth/session`
- Uses Firebase session cookies exclusively
- Always returns normalized email for consistency
- Handles expired/invalid sessions gracefully

#### `/api/auth/logout`
- Clears session cookies
- Revokes Firebase refresh tokens

#### `/api/user/accept-disclaimer`
- Updated to use `getCurrentUser()` from Firebase auth
- No longer requires userId parameter
- Trusts session as source of truth

#### `/api/user/profile`
- Migrated from deprecated session.ts to Firebase auth
- Uses session-based user identification

### 3. Client-Side Updates

#### AuthToggle Component (`/src/components/auth/AuthToggle.tsx`)
- Added `credentials: 'include'` to login fetch
- Removed localStorage token storage
- Added disclaimer check before redirect
- Shows info message when user logs in with different email variant
- Displays original signup email (e.g., "You originally signed up as: user+tag@gmail.com")

#### useAuth Hook (`/src/hooks/useAuth.tsx`)
- Reduced session polling from 30s to 5 minutes
- Fixed state cleanup when session is invalid
- Removed immediate session re-check after login
- Updated to call `acceptDisclaimer()` without userId

### 4. Removed Client-Side Firebase
- Deleted `/src/lib/firebase/config.ts`
- Removed all `NEXT_PUBLIC_FIREBASE_*` environment variables
- Updated all pages to remove `getAuthToken()` usage
- No more client-side Firebase SDK references

## Email Normalization Strategy

```typescript
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
```

This ensures:
- `user@gmail.com` and `user+tag@gmail.com` are treated as the same account
- Prevents duplicate accounts with plus-addressed emails
- Maintains consistency across the system

## Session Cookie Configuration

```typescript
const SESSION_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 14 * 1000, // 14 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? 'www.myguide.health' : undefined,
};
```

## Environment Variables Required

### Server-Side Only (Vercel)
```
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_SERVER_API_KEY=your-server-api-key
RESEND_API_KEY=your-resend-api-key
BASE_URL=https://www.myguide.health
```

### Removed (No Longer Needed)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

## Authentication Flow

### Signup Flow
1. User enters email (e.g., `user+tag@gmail.com`)
2. Email is normalized to `user@gmail.com`
3. Account created in Firebase Auth with normalized email
4. Original email stored in Firestore user document
5. Verification email sent to original email address
6. User must verify email before logging in

### Login Flow
1. User enters email (normalized before processing)
2. Password verified via Firebase Admin SDK
3. Session cookie created (14-day expiration)
4. Check if disclaimer accepted
5. Redirect to medical disclaimer or dashboard
6. If logged in with different variant, show info message

### Session Management
1. Session cookies managed by Firebase Admin SDK
2. Automatic token refresh handled by Firebase
3. Session checked on page load and every 5 minutes
4. Session cleared on logout with token revocation

## Security Improvements

1. **No Client-Side Keys**: All Firebase operations server-side only
2. **httpOnly Cookies**: Prevents XSS attacks
3. **Secure Flag**: HTTPS only in production
4. **SameSite Protection**: CSRF protection
5. **Token Revocation**: Logout revokes all refresh tokens
6. **Session-Based Auth**: No client-side token management

## Common Issues Resolved

### Issue: "An account with this email already exists"
**Cause**: Email normalization creating conflicts
**Fix**: Consistent normalization across all operations

### Issue: User ID Mismatch (403 errors)
**Cause**: Session had different user ID than client expected
**Fix**: APIs trust session as single source of truth

### Issue: Redirect Loop After Login
**Cause**: Email mismatch causing auth state confusion
**Fix**: Always return normalized email from session

### Issue: Can't Login with Plus-Addressed Email
**Cause**: Firebase treats `user@gmail.com` and `user+tag@gmail.com` as different
**Fix**: Normalize emails before all operations

## Testing Checklist

- [x] Regular email signup/login
- [x] Plus-addressed email signup (`user+test@gmail.com`)
- [x] Login with base email after plus-addressed signup
- [x] Email verification flow
- [x] Session persistence across refreshes
- [x] Logout clears session properly
- [x] Medical disclaimer acceptance
- [x] Redirect to dashboard after disclaimer

## Migration Notes

1. **Deprecated Files**:
   - `/src/lib/auth/session.ts` - Marked as deprecated
   - `/src/lib/firebase/config.ts` - Deleted

2. **Breaking Changes**:
   - No more client-side Firebase configuration
   - Authentication purely server-side
   - Email verification doesn't create sessions

3. **Backward Compatibility**:
   - Old session tokens automatically cleared
   - Stale sessions handled gracefully
   - Email normalization transparent to users

## Future Considerations

1. **Session Duration**: Currently 14 days, consider user preferences
2. **Remember Me**: Could implement longer sessions for "remember me"
3. **Email Change**: Need strategy for users wanting to change email
4. **Rate Limiting**: Currently uses middleware, consider Redis for production
5. **Audit Trail**: Consider logging all auth operations for compliance

## Deployment Steps

1. Set all required environment variables in Vercel
2. Deploy changes
3. Test with both regular and plus-addressed emails
4. Monitor logs for any session errors
5. Clear any cached sessions if needed

---

Last Updated: June 2024
Migration Completed Successfully ✅