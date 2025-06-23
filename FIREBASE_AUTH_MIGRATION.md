# Firebase Authentication Migration Guide

## Overview
This guide documents the migration from hybrid custom sessions + Firebase Auth to pure Firebase Auth with server-side session cookies.

## What Changed

### Before (Hybrid Approach)
- Custom JWT session management in `/lib/auth/session.ts`
- Mixed authentication patterns
- Client-side Firebase operations
- Session conflicts between custom sessions and Firebase Auth
- Issues with plus-addressed emails (e.g., user+tag@gmail.com)

### After (Pure Firebase Auth)
- Firebase Admin SDK session cookies
- Server-side only authentication
- Consistent auth state management
- Full support for plus-addressed emails
- Better security for healthcare data

## Key Improvements

1. **Email Normalization**
   - Plus-addressed emails now work correctly
   - Emails are normalized before all operations
   - Example: `user+tag@gmail.com` → `user@gmail.com`

2. **Session Management**
   - Firebase session cookies (14-day expiration)
   - Automatic token refresh
   - Secure httpOnly cookies
   - No client-side token exposure

3. **Email Verification**
   - Custom verification tokens stored in Firestore
   - Branded emails via Resend
   - No session creation until after login
   - Clear user flow

## Migration Checklist

### Environment Variables (Vercel)
Ensure these are set in your Vercel project:
```
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_PRIVATE_KEY=your-private-key
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email
FIREBASE_SERVER_API_KEY=your-server-api-key
RESEND_API_KEY=your-resend-api-key
BASE_URL=https://your-domain.com
```

### Code Changes
✅ **New Files Added:**
- `/src/lib/auth/firebase-auth.ts` - Core authentication utilities

✅ **Files Updated:**
- `/src/app/api/auth/signup/route.ts` - Uses Firebase Admin SDK
- `/src/app/api/auth/login/route.ts` - Creates Firebase session cookies
- `/src/app/api/auth/verify-email/route.ts` - No session creation
- `/src/app/api/auth/session/route.ts` - Checks Firebase session
- `/src/app/api/auth/logout/route.ts` - Revokes Firebase tokens
- `/src/app/api/auth/resend-verification/route.ts` - Normalized emails

✅ **Files Deprecated:**
- `/src/lib/auth/session.ts` - Custom session management (marked deprecated)

## API Changes

### Signup Flow
```typescript
// POST /api/auth/signup
{
  email: string,    // Automatically normalized
  password: string,
  name: string
}
// Returns: Success message, no session created
```

### Login Flow
```typescript
// POST /api/auth/login
{
  email: string,    // Automatically normalized
  password: string
}
// Returns: User data, session cookie set
```

### Email Verification
```typescript
// POST /api/auth/verify-email
{
  token: string
}
// Returns: Success message, user must login
```

## Security Improvements

1. **No Client-Side Keys**
   - All Firebase operations server-side
   - Better HIPAA compliance
   - Reduced attack surface

2. **Session Security**
   - httpOnly cookies prevent XSS
   - Secure flag for HTTPS only
   - SameSite protection

3. **Token Management**
   - Automatic token refresh
   - Token revocation on logout
   - Session expiration handling

## Testing Checklist

### Basic Auth Flow
- [ ] User can sign up with regular email
- [ ] User can sign up with plus-addressed email
- [ ] Email verification link works
- [ ] User can login after verification
- [ ] Session persists across page refreshes
- [ ] Logout clears session properly

### Edge Cases
- [ ] Plus-addressed emails can login
- [ ] Expired sessions redirect to login
- [ ] Invalid tokens show proper errors
- [ ] Rate limiting works correctly

### Accessibility
- [ ] Error messages are clear for elderly users
- [ ] Font sizes remain large (1.2rem+)
- [ ] Touch targets are 44px minimum
- [ ] Loading states are visible

## Deployment Steps

1. **Deploy to Vercel**
   ```bash
   git add .
   git commit -m "Migrate to pure Firebase Auth with session cookies"
   git push origin main
   ```

2. **Verify Environment Variables**
   - Check all Firebase Admin variables are set
   - Ensure RESEND_API_KEY is configured
   - Verify BASE_URL matches your domain

3. **Test Authentication**
   - Create a test account
   - Verify email
   - Login and check session
   - Test logout

4. **Monitor Logs**
   - Check Vercel function logs
   - Look for any Firebase errors
   - Monitor session creation/verification

## Rollback Plan

If issues arise:
1. The old session code is still available (deprecated but functional)
2. Revert the API route changes
3. Re-enable custom session management

## Common Issues & Solutions

### Issue: "Invalid email or password"
- Check email normalization is working
- Verify Firebase Admin SDK is initialized
- Check API key permissions

### Issue: "Session expired"
- Normal after 14 days
- User needs to login again
- Check cookie settings

### Issue: Email verification fails
- Check Resend API key
- Verify email templates
- Check token expiration (24 hours)

## Support

For issues with this migration:
1. Check Vercel function logs
2. Review Firebase Admin SDK logs
3. Test with regular and plus-addressed emails
4. Ensure all environment variables are set

## Next Steps

After successful migration:
1. Remove deprecated session.ts file
2. Update documentation
3. Monitor user feedback
4. Consider implementing refresh tokens