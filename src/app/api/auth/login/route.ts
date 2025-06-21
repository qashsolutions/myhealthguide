import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signIn, resetPassword } from '@/lib/firebase/auth';
import { sendPasswordResetEmail } from '@/lib/email/resend';
import { ApiResponse, LoginData } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES, SUCCESS_MESSAGES, APP_URL } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/login
 * Sign in existing user with email/password
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
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

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
    
    const loginData: LoginData = validationResult.data;
    
    // Check for account lockout
    const attempts = failedAttempts.get(loginData.email);
    if (attempts) {
      const timeSinceLastAttempt = Date.now() - attempts.timestamp;
      
      if (attempts.count >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_DURATION) {
        const remainingTime = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 60000);
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: `Account temporarily locked. Please try again in ${remainingTime} minutes.`,
            code: 'auth/too-many-requests',
          },
          { status: 429 }
        );
      }
      
      // Reset attempts if lockout period has passed
      if (timeSinceLastAttempt >= LOCKOUT_DURATION) {
        failedAttempts.delete(loginData.email);
      }
    }
    
    // Attempt login
    const authResponse = await signIn(loginData);
    
    if (!authResponse.success || !authResponse.user) {
      // Track failed attempt
      const current = failedAttempts.get(loginData.email) || { count: 0, timestamp: Date.now() };
      current.count++;
      current.timestamp = Date.now();
      failedAttempts.set(loginData.email, current);
      
      // Send password reset email after 3 failed attempts
      if (current.count === MAX_ATTEMPTS) {
        // Generate reset link (in production, use proper token generation)
        const resetToken = Buffer.from(`${loginData.email}:${Date.now()}`).toString('base64');
        const resetLink = `${APP_URL}/auth/reset-password?token=${resetToken}`;
        
        // Send reset email (don't wait)
        sendPasswordResetEmail({
          userName: 'User',
          userEmail: loginData.email,
          resetLink,
        }).catch(error => {
          console.error('Failed to send password reset email:', error);
        });
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Too many failed attempts. We\'ve sent a password reset email to your address.',
            code: 'auth/too-many-requests',
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: authResponse.error || ERROR_MESSAGES.AUTH_FAILED,
          code: authResponse.code,
        },
        { status: 401 }
      );
    }
    
    // Clear failed attempts on successful login
    failedAttempts.delete(loginData.email);
    
    // Return success response
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          user: authResponse.user,
          token: authResponse.token,
        },
        message: SUCCESS_MESSAGES.LOGIN,
      },
      { status: 200 }
    );
    
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