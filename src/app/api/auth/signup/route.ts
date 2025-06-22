import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signUp } from '@/lib/firebase/auth';
import { sendWelcomeEmail } from '@/lib/email/resend';
import { ApiResponse, SignupData } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/signup
 * Create new user account with email/password
 */

// Validation schema
const signupSchema = z.object({
  email: z
    .string()
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .min(1, VALIDATION_MESSAGES.REQUIRED),
  password: z
    .string()
    .min(6, VALIDATION_MESSAGES.PASSWORD_MIN),
  name: z
    .string()
    .min(1, VALIDATION_MESSAGES.REQUIRED)
    .max(100),
  phoneNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[\d\s\-\(\)]+$/.test(val),
      VALIDATION_MESSAGES.PHONE_INVALID
    ),
});

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      // Parse request body
      const body = await request.json();
    
    // Validate input
    const validationResult = signupSchema.safeParse(body);
    
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
    
    const signupData: SignupData = validationResult.data;
    
    // Create user account
    const authResponse = await signUp(signupData);
    
    if (!authResponse.success || !authResponse.user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: authResponse.error || ERROR_MESSAGES.SIGNUP_FAILED,
          code: authResponse.code,
        },
        { status: 400 }
      );
    }
    
    // Send welcome email asynchronously
    try {
      await sendWelcomeEmail({
        userName: authResponse.user.name,
        userEmail: authResponse.user.email,
      });
      console.log('Welcome email sent successfully to:', authResponse.user.email);
    } catch (error: any) {
      console.error('Failed to send welcome email:', error);
      console.error('Email error details:', {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response
      });
      // Don't fail the signup if email fails
    }
    
    // Return success response
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          user: authResponse.user,
          token: authResponse.token,
        },
        message: SUCCESS_MESSAGES.SIGNUP,
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Signup API error:', error);
    
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