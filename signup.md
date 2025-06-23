# MyHealth Guide - Signup Flow Documentation

## Overview

The MyHealth Guide signup flow uses email verification links (magic links) instead of OTP codes. This approach was chosen due to serverless environment limitations where instances don't share memory, making OTP storage problematic.

## Environment Variables Required

### Firebase Configuration

#### Client-side Firebase (Public)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=          # Firebase Web API Key (with referrer restrictions)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=      # Firebase Auth Domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=       # Firebase Project ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=   # Firebase Storage Bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID= # Firebase Messaging Sender ID
NEXT_PUBLIC_FIREBASE_APP_ID=           # Firebase App ID
```

#### Server-side Firebase (Private)
```env
FIREBASE_SERVER_API_KEY=               # Firebase Web API Key (NO referrer restrictions)
FIREBASE_ADMIN_PROJECT_ID=             # Firebase Admin Project ID
FIREBASE_ADMIN_CLIENT_EMAIL=           # Service Account Email
FIREBASE_ADMIN_PRIVATE_KEY=            # Service Account Private Key (with \n preserved)
```

### Email Service (Resend)
```env
RESEND_API_KEY=                        # Resend API Key for sending emails
RESEND_FROM_EMAIL=                     # From email address (e.g., noreply@myguide.health)
```

### Application Configuration
```env
NEXT_PUBLIC_APP_URL=                   # Application URL (e.g., https://www.myguide.health)
JWT_SECRET=                            # Secret for signing session JWTs (min 32 chars)
```

## File Structure and Functions

### 1. Frontend Components

#### `/src/components/auth/AuthToggle.tsx`
- **Function**: Main authentication UI component with signup/login toggle
- **Features**:
  - Form validation using react-hook-form and zod
  - Eldercare-optimized UI with large touch targets
  - Success state showing email verification instructions
  - Resend verification email functionality

#### `/src/app/auth/page.tsx`
- **Function**: Auth page wrapper that renders AuthToggle
- **Purpose**: Entry point for authentication flow

### 2. API Routes

#### `/src/app/api/auth/signup/route.ts`
- **Function**: Handles new user registration
- **Process**:
  1. Validates input (email, password, name, phone)
  2. Creates user in Firebase Auth using Admin SDK
  3. Generates email verification token
  4. Stores token in Firestore with expiry
  5. Sends verification email via Resend
  6. Creates user document in Firestore
- **Rate Limited**: Yes (5 requests per minute)

#### `/src/app/api/auth/verify-email/route.ts`
- **Function**: Verifies email verification tokens
- **Process**:
  1. Validates token from URL
  2. Checks token exists and hasn't expired
  3. Updates user's email verification status
  4. Marks token as used
  5. Creates session for auto-login
  6. Redirects to login page

#### `/src/app/api/auth/login/route.ts`
- **Function**: Authenticates existing users
- **Process**:
  1. Validates credentials
  2. Checks email verification status
  3. Verifies password using Firebase REST API
  4. Creates server-side session
  5. Returns user data and token
- **Rate Limited**: Yes (with lockout after 5 failed attempts)

#### `/src/app/api/auth/resend-verification/route.ts`
- **Function**: Resends verification email
- **Process**:
  1. Validates user exists
  2. Generates new verification token
  3. Sends new verification email
- **Rate Limited**: Yes (3 requests per hour)

#### `/src/app/api/auth/session/route.ts`
- **Function**: Checks current session status
- **Purpose**: Allows client to verify server-side auth state

#### `/src/app/api/auth/logout/route.ts`
- **Function**: Clears server-side session
- **Purpose**: Ensures complete logout

### 3. Email Templates

#### `/src/lib/email/templates/emailVerification.tsx`
- **Function**: React Email template for verification emails
- **Features**:
  - Eldercare-friendly design with large fonts
  - Clear call-to-action button
  - Fallback text link
  - 24-hour expiry notice

### 4. Authentication Utilities

#### `/src/lib/firebase/admin.ts`
- **Function**: Firebase Admin SDK initialization
- **Features**:
  - Lazy initialization
  - Credential validation
  - Error handling

#### `/src/lib/firebase/auth.ts`
- **Function**: Client-side Firebase auth utilities
- **Note**: Mostly unused in favor of server-side auth

#### `/src/lib/auth/session.ts`
- **Function**: Server-side session management
- **Features**:
  - JWT-based sessions
  - HttpOnly cookies
  - 7-day expiry

#### `/src/hooks/useAuth.tsx`
- **Function**: React hook for auth state management
- **Features**:
  - Checks server session first
  - Falls back to Firebase client auth
  - Provides auth context to entire app

### 5. Supporting Files

#### `/src/lib/email/resend.ts`
- **Function**: Resend email service wrapper
- **Features**:
  - Email sending with templates
  - Error handling
  - Development mode logging

#### `/src/lib/middleware/rate-limit.ts`
- **Function**: Rate limiting for API endpoints
- **Purpose**: Prevents abuse and brute force attacks

## Signup Flow Sequence

### 1. User Initiates Signup
```
User fills form → AuthToggle component → POST /api/auth/signup
```

### 2. Server Creates Account
```typescript
// In /api/auth/signup/route.ts
1. Validate input data
2. Create Firebase Auth user (disabled by default)
3. Generate verification token (crypto.randomBytes)
4. Store token in Firestore:
   {
     email,
     token,
     expires: 24 hours,
     used: false
   }
5. Send verification email via Resend
6. Create user document in Firestore
```

### 3. Email Sent
```typescript
// Email contains:
- Verification link: https://www.myguide.health/auth/verify-email?token=xxx
- Expires in 24 hours
- Eldercare-friendly formatting
```

### 4. User Clicks Verification Link
```
Click link → /auth/verify-email page → GET /api/auth/verify-email?token=xxx
```

### 5. Server Verifies Email
```typescript
// In /api/auth/verify-email/route.ts
1. Validate token exists in Firestore
2. Check not expired and not used
3. Enable user account in Firebase Auth
4. Update emailVerified flag
5. Mark token as used
6. Create session cookie
7. Redirect to login with success message
```

### 6. User Can Now Login
```
Login form → POST /api/auth/login → Session created → Redirect to dashboard
```

## Authentication Architecture

### Server-Side (Primary)
- Firebase Admin SDK for user management
- Firebase REST API for password verification
- JWT sessions in httpOnly cookies
- Firestore for storing verification tokens

### Client-Side (Secondary)
- Firebase Client SDK for auth state
- Used primarily for real-time auth updates
- Falls back to server session checks

## Security Measures

1. **Rate Limiting**
   - Signup: 5 requests per minute per IP
   - Login: 5 failed attempts trigger 15-minute lockout
   - Resend: 3 requests per hour per email

2. **Token Security**
   - Cryptographically random tokens (32 bytes)
   - Single-use tokens
   - 24-hour expiry
   - Stored separately from user data

3. **Session Security**
   - HttpOnly cookies (XSS protection)
   - Secure flag in production (HTTPS only)
   - SameSite=lax (CSRF protection)
   - 7-day expiry with refresh

4. **API Key Security**
   - Client API key has referrer restrictions
   - Server API key has no restrictions (server-only)
   - Admin credentials never exposed to client

## Error Handling

### Common Error Scenarios

1. **Email Already Exists**
   - Returns generic "Failed to create account"
   - Prevents email enumeration

2. **Invalid Verification Token**
   - Shows "Invalid or expired link"
   - Provides option to request new link

3. **Unverified Email Login**
   - Shows "Please verify your email"
   - Offers resend verification option

4. **Rate Limit Exceeded**
   - Shows appropriate wait time
   - Prevents brute force attacks

## Development vs Production

### Development
- Console logs for debugging
- Relaxed HTTPS requirements
- Detailed error messages

### Production
- No console logs for sensitive data
- Strict HTTPS enforcement
- Generic error messages
- Full security measures enabled

## Testing the Flow

1. **Signup Test**
   ```bash
   curl -X POST https://www.myguide.health/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "securePassword123",
       "name": "Test User"
     }'
   ```

2. **Check Email Service**
   - Verify Resend API key is set
   - Check email logs in Resend dashboard
   - Ensure from email is verified in Resend

3. **Verify Firebase Setup**
   - Client API key has correct referrer restrictions
   - Server API key has NO restrictions
   - Admin service account has correct permissions

## Troubleshooting

### Email Not Received
1. Check Resend API key in environment
2. Verify from email is authorized in Resend
3. Check spam folder
4. Look for errors in Vercel logs

### "Requests from referer <empty> are blocked"
- Using wrong API key (client key on server)
- Need separate FIREBASE_SERVER_API_KEY without restrictions

### Cannot Login After Verification
1. Check session creation in verify-email route
2. Verify cookies are being set
3. Check auth state synchronization

### Firebase Admin Errors
1. Verify all three admin credentials are set:
   - FIREBASE_ADMIN_PROJECT_ID
   - FIREBASE_ADMIN_CLIENT_EMAIL
   - FIREBASE_ADMIN_PRIVATE_KEY (with \n preserved)
2. Check service account permissions in Firebase Console

## Migration Notes

This system replaced an OTP-based flow due to:
- Serverless instances don't share memory
- OTP storage in database added complexity
- Email links provide better UX for elderly users
- Single-click verification is more accessible

Files removed during migration:
- `/src/lib/auth/otp.ts`
- OTP-related API routes
- OTP verification components