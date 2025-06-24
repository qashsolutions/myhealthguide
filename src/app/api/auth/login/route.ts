import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  normalizeEmail,
  verifyUserPassword,
  createSessionCookie,
  setSessionCookie,
  isEmailVerified,
  getUserData
} from '@/lib/auth/firebase-auth';
import { ApiResponse } from '@/types';
import { 
  VALIDATION_MESSAGES, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/login
 * Authenticate user with Firebase Auth
 * 
 * Flow:
 * 1. Normalize email to handle plus-addressing
 * 2. Verify password with Firebase
 * 3. Check email verification status
 * 4. Create Firebase session cookie
 * 5. Return user data
 */

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .min(1, VALIDATION_MESSAGES.REQUIRED),
  password: z
    .string()
    .min(1, VALIDATION_MESSAGES.REQUIRED),
});

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      // Parse request body
      const body = await request.json();
      
      // Validate input
      const validationResult = loginSchema.safeParse(body);
      
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(issue => ({
          field: issue.path[0] as string,
          message: issue.message,
        }));
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Please check your email and password',
            errors,
          },
          { status: 400 }
        );
      }
      
      const { email, password } = validationResult.data;
      
      try {
        // Normalize email to handle plus-addressing
        const normalizedEmail = normalizeEmail(email);
        
        // Verify password and get ID token
        const idToken = await verifyUserPassword(normalizedEmail, password);
        
        if (!idToken) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Invalid email or password. Please try again.',
              code: 'auth/invalid-credential',
            },
            { status: 401 }
          );
        }
        
        // Create session cookie from ID token
        const sessionCookie = await createSessionCookie(idToken);
        
        // Set session cookie in response
        await setSessionCookie(sessionCookie);
        
        // Get user data from token (contains uid)
        const { adminAuth } = await import('@/lib/firebase/admin');
        const decodedToken = await adminAuth().verifyIdToken(idToken);
        
        // Check if email is verified
        const emailVerified = await isEmailVerified(decodedToken.uid);
        
        if (!emailVerified) {
          // Clear the session cookie we just set
          const { clearSessionCookie } = await import('@/lib/auth/firebase-auth');
          await clearSessionCookie();
          
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Please verify your email before signing in. Check your inbox for the verification link.',
              code: 'auth/email-not-verified',
              data: {
                email: normalizedEmail,
                requiresVerification: true,
              },
            },
            { status: 403 }
          );
        }
        
        // Get user data from Firestore
        const userData = await getUserData(decodedToken.uid);
        
        // Check if user logged in with different email variant
        let loginMessage = 'Welcome back!';
        let originalSignupEmail = null;
        
        if (userData && userData.email && normalizeEmail(userData.email) === normalizedEmail && userData.email !== email) {
          // User logged in with normalized version but signed up with plus-addressed email
          originalSignupEmail = userData.email;
          loginMessage = `Welcome back! Note: You originally signed up as ${userData.email}`;
        }
        
        // Log successful login
        console.log(`[Login] User ${normalizedEmail} logged in successfully`);
        
        // Return success response
        return NextResponse.json<ApiResponse>(
          {
            success: true,
            message: loginMessage,
            data: {
              user: {
                id: decodedToken.uid,
                email: normalizedEmail,
                name: userData?.displayName || userData?.name || '',
                emailVerified: true,
                disclaimerAccepted: userData?.disclaimerAccepted || false,
              },
              originalSignupEmail, // Include this for client to display if needed
            },
          },
          { status: 200 }
        );
        
      } catch (error: any) {
        console.error('[Login] Authentication error:', error);
        
        // User-friendly error messages for elderly users
        let errorMessage = 'Invalid email or password. Please try again.';
        
        if (error.message?.includes('user-not-found')) {
          errorMessage = 'No account found with this email address.';
        } else if (error.message?.includes('too-many-requests')) {
          errorMessage = 'Too many failed attempts. Please try again later.';
        } else if (error.message?.includes('user-disabled')) {
          errorMessage = 'This account has been disabled. Please contact support.';
        }
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: errorMessage,
          },
          { status: 401 }
        );
      }
      
    } catch (error: any) {
      console.error('[Login] Unexpected error:', error);
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Something went wrong. Please try again later.',
        },
        { status: 500 }
      );
    }
  }, rateLimiters.auth);
}