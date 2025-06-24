import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/resend';
import { getVerificationEmailHtml, getVerificationEmailText } from '@/lib/email/templates/verification';
import { 
  createUserAccount, 
  generateVerificationToken
} from '@/lib/auth/firebase-auth';
import { ApiResponse } from '@/types';
import { 
  VALIDATION_MESSAGES, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES, 
  APP_NAME, 
  APP_URL, 
  EMAIL_CONFIG 
} from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/signup
 * Create user account with pure Firebase Auth
 * 
 * Flow:
 * 1. Validate and normalize email
 * 2. Create Firebase user with normalized email
 * 3. Generate custom verification token
 * 4. Send branded verification email via Resend
 * 5. Return success (no session until verified)
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
            error: 'Please check your information and try again',
            errors,
          },
          { status: 400 }
        );
      }
      
      const { email, password, name } = validationResult.data;
      
      try {
        // Use email exactly as entered (no normalization)
        const originalEmail = email.trim();
        
        // Create user account
        const userRecord = await createUserAccount(originalEmail, password, name);
        
        // Generate verification token
        const verificationToken = await generateVerificationToken(originalEmail);
        
        // Create verification URL
        const verificationUrl = `${APP_URL}/auth/verify-email?token=${verificationToken}`;
        
        // Send verification email via Resend
        await sendEmail({
          to: email, // Use original email for sending
          subject: `Welcome to ${APP_NAME} - Please verify your email`,
          html: getVerificationEmailHtml(name, verificationUrl),
          text: getVerificationEmailText(name, verificationUrl),
        });
        
        // Log success
        console.log(`[Signup] Account created for ${originalEmail} (${userRecord.uid})`);
        
        // Return success response (no session created)
        return NextResponse.json<ApiResponse>(
          {
            success: true,
            message: 'Account created successfully! Please check your email to verify your account.',
            data: {
              email: originalEmail,
              requiresVerification: true,
            },
          },
          { status: 201 }
        );
        
      } catch (error: any) {
        console.error('[Signup] Error:', error);
        
        // User-friendly error messages for elderly users
        let errorMessage = 'We couldn\'t create your account. Please try again.';
        
        if (error.message?.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please try logging in.';
        } else if (error.message?.includes('valid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message?.includes('at least 6 characters')) {
          errorMessage = 'Your password must be at least 6 characters long.';
        }
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: errorMessage,
          },
          { status: 400 }
        );
      }
      
    } catch (error: any) {
      console.error('[Signup] Unexpected error:', error);
      
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