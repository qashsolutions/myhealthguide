import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  normalizeEmail,
  generateVerificationToken,
  isEmailVerified,
  getUserData
} from '@/lib/auth/firebase-auth';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/resend';
import { getVerificationEmailHtml, getVerificationEmailText } from '@/lib/email/templates/verification';
import { ApiResponse } from '@/types';
import { 
  VALIDATION_MESSAGES, 
  ERROR_MESSAGES, 
  APP_NAME, 
  APP_URL 
} from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/resend-verification
 * Resend email verification link
 * 
 * Flow:
 * 1. Normalize and validate email
 * 2. Check if user exists and needs verification
 * 3. Generate new verification token
 * 4. Send verification email via Resend
 */

const resendSchema = z.object({
  email: z
    .string()
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .min(1, VALIDATION_MESSAGES.REQUIRED),
});

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      // Parse request body
      const body = await request.json();
      
      // Validate input
      const validationResult = resendSchema.safeParse(body);
      
      if (!validationResult.success) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Please enter a valid email address',
          },
          { status: 400 }
        );
      }
      
      const { email } = validationResult.data;
      
      // Normalize email to handle plus-addressing
      const normalizedEmail = normalizeEmail(email);
      
      try {
        // Get user by email
        const user = await adminAuth().getUserByEmail(normalizedEmail);
        
        if (!user) {
          // Don't reveal if user exists
          return NextResponse.json<ApiResponse>(
            {
              success: true,
              message: 'If an account exists with this email, we\'ve sent a verification link.',
            },
            { status: 200 }
          );
        }
        
        // Check if already verified
        const emailVerified = await isEmailVerified(user.uid);
        
        if (emailVerified) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'This email is already verified. You can sign in to your account.',
              code: 'auth/email-already-verified',
            },
            { status: 400 }
          );
        }
        
        // Get user data for name
        const userData = await getUserData(user.uid);
        const userName = userData?.displayName || userData?.name || 'User';
        
        // Invalidate old tokens
        const oldTokens = await adminDb()
          .collection('emailVerifications')
          .where('email', '==', normalizedEmail)
          .where('used', '==', false)
          .get();
        
        const batch = adminDb().batch();
        oldTokens.forEach(doc => {
          batch.update(doc.ref, { 
            used: true,
            invalidatedAt: Date.now(),
          });
        });
        await batch.commit();
        
        // Generate new verification token
        const verificationToken = await generateVerificationToken(normalizedEmail);
        
        // Create verification URL
        const verificationUrl = `${APP_URL}/auth/verify-email?token=${verificationToken}`;
        
        // Send verification email via Resend
        await sendEmail({
          to: email, // Use original email for sending
          subject: `Welcome back to ${APP_NAME} - Please verify your email`,
          html: getVerificationEmailHtml(userName, verificationUrl, true),
          text: getVerificationEmailText(userName, verificationUrl, true),
        });
        
        console.log(`[Resend Verification] New verification email sent to ${normalizedEmail}`);
        
        return NextResponse.json<ApiResponse>(
          {
            success: true,
            message: 'Verification email sent! Please check your inbox.',
            data: {
              email: normalizedEmail,
            },
          },
          { status: 200 }
        );
        
      } catch (error: any) {
        console.error('[Resend Verification] Error:', error);
        
        // Don't reveal if user exists
        if (error.code === 'auth/user-not-found') {
          return NextResponse.json<ApiResponse>(
            {
              success: true,
              message: 'If an account exists with this email, we\'ve sent a verification link.',
            },
            { status: 200 }
          );
        }
        
        throw error;
      }
      
    } catch (error: any) {
      console.error('[Resend Verification] Unexpected error:', error);
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Failed to send verification email. Please try again later.',
        },
        { status: 500 }
      );
    }
  }, rateLimiters.auth);
}