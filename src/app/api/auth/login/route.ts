import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Removed client-side Firebase imports - using REST API instead
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { createSession } from '@/lib/auth/session';
import { ApiResponse, LoginData } from '@/types';
import { 
  VALIDATION_MESSAGES, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/login
 * Sign in existing user with email/password
 * Checks email verification status
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

// Track failed login attempts (in production, use Redis or similar)
const failedAttempts = new Map<string, { count: number; timestamp: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Clean up old attempts periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of failedAttempts.entries()) {
    if (now - data.timestamp > LOCKOUT_DURATION) {
      failedAttempts.delete(email);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

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
            error: 'Validation failed',
            errors,
          },
          { status: 400 }
        );
      }
      
      const { email, password } = validationResult.data;
      
      // Check for account lockout
      const attempts = failedAttempts.get(email);
      if (attempts) {
        const timeSinceLastAttempt = Date.now() - attempts.timestamp;
        
        if (attempts.count >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_DURATION) {
          const remainingTime = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 60000);
          
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: `Account temporarily locked due to too many failed attempts. Please try again in ${remainingTime} minutes.`,
              code: 'auth/too-many-requests',
            },
            { status: 429 }
          );
        }
        
        // Reset attempts if lockout period has passed
        if (timeSinceLastAttempt >= LOCKOUT_DURATION) {
          failedAttempts.delete(email);
        }
      }
      
      try {
        // First, get the user by email using Admin SDK
        let userRecord;
        try {
          userRecord = await adminAuth().getUserByEmail(email);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            throw new Error('Invalid email or password');
          }
          throw error;
        }
        
        // Check if email is verified using Admin SDK data
        if (!userRecord.emailVerified) {
          // Track this as a failed attempt (to prevent brute force on unverified accounts)
          const current = failedAttempts.get(email) || { count: 0, timestamp: Date.now() };
          current.count++;
          current.timestamp = Date.now();
          failedAttempts.set(email, current);
          
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Please verify your email before signing in. Check your inbox for the verification link.',
              code: 'auth/email-not-verified',
              data: {
                email,
                requiresVerification: true,
              },
            },
            { status: 403 }
          );
        }
        
        // We can't use client SDK on server. Instead, we'll use Firebase REST API to verify password
        // Get the API key - it should be available even on server side since it's NEXT_PUBLIC
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (!apiKey) {
          console.error('[Login] Firebase API key not found in environment');
          throw new Error('Configuration error');
        }
        
        const verifyPasswordResponse = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true,
            }),
          }
        );

        if (!verifyPasswordResponse.ok) {
          const errorData = await verifyPasswordResponse.json();
          console.error('[Login] Password verification failed:', errorData);
          console.error('[Login] Error details:', {
            status: verifyPasswordResponse.status,
            message: errorData.error?.message,
            code: errorData.error?.code,
            errors: errorData.error?.errors
          });
          
          if (errorData.error?.message === 'INVALID_PASSWORD' || 
              errorData.error?.message === 'INVALID_LOGIN_CREDENTIALS' ||
              errorData.error?.message === 'INVALID_EMAIL') {
            throw { code: 'auth/wrong-password', message: 'Invalid password' };
          }
          throw { code: 'auth/invalid-credential', message: errorData.error?.message || 'Authentication failed' };
        }

        const authData = await verifyPasswordResponse.json();
        
        // Get user profile from Firestore
        const userDoc = await adminDb().collection('users').doc(userRecord.uid).get();
        const userData = userDoc.data();
        
        // Update last login
        await adminDb().collection('users').doc(userRecord.uid).update({
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Use the ID token from the REST API response
        const token = authData.idToken;
        
        // Create session
        await createSession({
          userId: userRecord.uid,
          email: userRecord.email!,
          emailVerified: userRecord.emailVerified,
          name: userData?.name || userRecord.displayName || undefined,
          disclaimerAccepted: userData?.disclaimerAccepted || false,
        });
        
        // Clear failed attempts on successful login
        failedAttempts.delete(email);
        
        // Log successful login
        console.log(`[Login] User ${email} logged in successfully`);
        
        // Return success response
        return NextResponse.json<ApiResponse>(
          {
            success: true,
            message: SUCCESS_MESSAGES.LOGIN,
            data: {
              user: {
                id: userRecord.uid,
                email: userRecord.email,
                name: userData?.name || userRecord.displayName,
                emailVerified: userRecord.emailVerified,
                phoneNumber: userData?.phoneNumber || userRecord.phoneNumber,
                disclaimerAccepted: userData?.disclaimerAccepted || false,
              },
              token,
            },
          },
          { status: 200 }
        );
        
      } catch (authError: any) {
        // Track failed attempt
        const current = failedAttempts.get(email) || { count: 0, timestamp: Date.now() };
        current.count++;
        current.timestamp = Date.now();
        failedAttempts.set(email, current);
        
        console.error('[Login] Firebase auth error:', authError);
        console.error('[Login] Error code:', authError.code);
        console.error('[Login] Error message:', authError.message);
        
        // Handle specific Firebase errors
        if (authError.code === 'auth/user-not-found') {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'No account found with this email address',
              code: 'auth/user-not-found',
            },
            { status: 401 }
          );
        }
        
        if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-password' || authError.code === 'auth/invalid-credential') {
          const attemptsLeft = MAX_ATTEMPTS - current.count;
          const warningMessage = attemptsLeft > 0 
            ? ` You have ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining.`
            : '';
          
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: `Incorrect password.${warningMessage}`,
              code: 'auth/wrong-password',
              data: {
                attemptsRemaining: Math.max(0, attemptsLeft),
              },
            },
            { status: 401 }
          );
        }
        
        if (authError.code === 'auth/user-disabled') {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'This account has been disabled. Please contact support.',
              code: 'auth/user-disabled',
            },
            { status: 403 }
          );
        }
        
        if (authError.code === 'auth/invalid-credential') {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Invalid email or password',
              code: 'auth/invalid-credential',
            },
            { status: 401 }
          );
        }
        
        // Generic error for other cases
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: ERROR_MESSAGES.AUTH_FAILED,
            code: authError.code || 'auth/unknown',
          },
          { status: 401 }
        );
      }
      
    } catch (error) {
      console.error('Login API error:', error);
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: ERROR_MESSAGES.GENERIC,
        },
        { status: 500 }
      );
    }
  }, rateLimiters.auth);
}