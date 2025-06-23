import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
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
 * 1. Validate email
 * 2. Check if user exists and needs verification
 * 3. Invalidate old tokens
 * 4. Generate new verification token
 * 5. Send new verification email
 * 6. Return success response
 */

const resendSchema = z.object({
  email: z
    .string()
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .min(1, VALIDATION_MESSAGES.REQUIRED),
});

// Track resend attempts in memory (for rate limiting beyond middleware)
const resendAttempts = new Map<string, { count: number; lastAttempt: Date }>();

// Clean up old attempts periodically
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [email, data] of resendAttempts.entries()) {
    if (data.lastAttempt < oneHourAgo) {
      resendAttempts.delete(email);
    }
  }
}, 30 * 60 * 1000); // Clean up every 30 minutes

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
            error: 'Invalid email address',
          },
          { status: 400 }
        );
      }
      
      const { email } = validationResult.data;
      
      // Check additional rate limiting (max 3 attempts per hour per email)
      const attempts = resendAttempts.get(email);
      if (attempts) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
        const oneHour = 60 * 60 * 1000;
        
        if (timeSinceLastAttempt < oneHour && attempts.count >= 3) {
          const minutesRemaining = Math.ceil((oneHour - timeSinceLastAttempt) / 60000);
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: `Too many attempts. Please try again in ${minutesRemaining} minutes.`,
              data: { retryAfter: minutesRemaining },
            },
            { status: 429 }
          );
        }
      }
      
      // Get user by email
      const user = await adminAuth.getUserByEmail(email).catch(() => null);
      
      if (!user) {
        // Don't reveal if user exists for security
        return NextResponse.json<ApiResponse>(
          {
            success: true,
            message: 'If an account exists with this email, we\'ve sent a verification link.',
          },
          { status: 200 }
        );
      }
      
      // Check if already verified
      if (user.emailVerified) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'This email is already verified. You can sign in to your account.',
            code: 'auth/email-already-verified',
          },
          { status: 400 }
        );
      }
      
      // Get user profile for name
      const userDoc = await adminDb.collection('users').doc(user.uid).get();
      const userData = userDoc.data();
      const userName = userData?.name || user.displayName || 'User';
      
      // Invalidate old tokens for this email
      const oldTokens = await adminDb
        .collection('emailVerifications')
        .where('email', '==', email)
        .where('used', '==', false)
        .get();
      
      const batch = adminDb.batch();
      oldTokens.forEach(doc => {
        batch.update(doc.ref, { 
          invalidated: true,
          invalidatedAt: new Date(),
        });
      });
      await batch.commit();
      
      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + 24); // 24 hour expiry
      
      // Store new token in Firestore
      await adminDb.collection('emailVerifications').doc(verificationToken).set({
        userId: user.uid,
        email,
        expires: expires,
        used: false,
        createdAt: new Date(),
        type: 'resend',
        resent: true,
      });
      
      // Send new verification email
      const verificationUrl = `${APP_URL}/auth/verify-email?token=${verificationToken}`;
      
      await sendEmail({
        to: email,
        subject: `Verify your ${APP_NAME} account (Resent)`,
        html: getVerificationEmailHtml(userName, verificationUrl, true),
        text: getVerificationEmailText(userName, verificationUrl, true),
      });
      
      // Update rate limiting
      resendAttempts.set(email, {
        count: (attempts?.count || 0) + 1,
        lastAttempt: new Date(),
      });
      
      console.log(`[Resend Verification] New verification email sent to ${email}`);
      
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: 'Verification email sent successfully. Please check your inbox.',
          data: {
            email,
          },
        },
        { status: 200 }
      );
      
    } catch (error) {
      console.error('Resend verification error:', error);
      
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