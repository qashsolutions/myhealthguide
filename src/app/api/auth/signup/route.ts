import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email/resend';
import { getVerificationEmailHtml, getVerificationEmailText } from '@/lib/email/templates/verification';
import admin, { adminAuth, adminDb } from '@/lib/firebase/admin';
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
 * Create user account and send email verification link
 * 
 * Flow:
 * 1. Validate email, password, and name
 * 2. Create Firebase user (unverified)
 * 3. Generate verification token
 * 4. Store token in Firestore
 * 5. Send verification email via Resend
 * 6. Return success response
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
    .optional(),
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
      
      const { email, password, name, phoneNumber } = validationResult.data;
      
      try {
        // Check if user already exists
        let existingUser;
        try {
          existingUser = await adminAuth().getUserByEmail(email);
        } catch (error: any) {
          // If user not found, that's fine
          if (error.code === 'auth/user-not-found') {
            existingUser = null;
          } else {
            // Log the actual error for debugging
            console.error('[Signup] Error checking existing user:', error);
            throw error;
          }
        }
        
        if (existingUser) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'An account with this email already exists',
              code: 'auth/email-already-exists',
            },
            { status: 400 }
          );
        }
        
        // Create Firebase user (unverified)
        const userRecord = await adminAuth().createUser({
          email,
          password,
          displayName: name,
          phoneNumber: phoneNumber || undefined,
          emailVerified: false, // Important: starts unverified
        });
        
        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 24); // 24 hour expiry
        
        // Store token in Firestore
        await adminDb().collection('emailVerifications').doc(verificationToken).set({
          userId: userRecord.uid,
          email,
          expires: admin.firestore.Timestamp.fromDate(expires),
          used: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          type: 'signup',
        });
        
        // Create user profile in Firestore
        await adminDb().collection('users').doc(userRecord.uid).set({
          email,
          name,
          phoneNumber: phoneNumber || null,
          emailVerified: false,
          disclaimerAccepted: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'active',
        });
        
        // Send verification email
        const verificationUrl = `${APP_URL}/auth/verify-email?token=${verificationToken}`;
        
        await sendEmail({
          to: email,
          subject: `Verify your ${APP_NAME} account`,
          html: getVerificationEmailHtml(name, verificationUrl),
          text: getVerificationEmailText(name, verificationUrl),
        });
        
        // Log success
        console.log(`[Signup] Account created for ${email} (${userRecord.uid})`);
        
        // Return success response
        return NextResponse.json<ApiResponse>(
          {
            success: true,
            message: 'Account created successfully! Please check your email to verify your account.',
            data: {
              email,
              requiresVerification: true,
            },
          },
          { status: 201 }
        );
        
      } catch (authError: any) {
        console.error('Firebase auth error:', authError);
        
        // Handle specific Firebase errors
        if (authError.code === 'auth/email-already-exists') {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'An account with this email already exists',
              code: 'auth/email-already-exists',
            },
            { status: 400 }
          );
        }
        
        if (authError.code === 'auth/invalid-password') {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Password does not meet security requirements',
              code: 'auth/weak-password',
            },
            { status: 400 }
          );
        }
        
        throw authError;
      }
      
    } catch (error: any) {
      console.error('[Signup] API error:', error);
      console.error('[Signup] Error message:', error.message);
      console.error('[Signup] Error code:', error.code);
      
      // In production, log error details for debugging
      if (process.env.NODE_ENV === 'production') {
        console.error('[Signup] Full error object:', JSON.stringify({
          message: error.message,
          code: error.code,
          stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
        }));
      }
      
      // Always use generic message in production for security
      const errorMessage = ERROR_MESSAGES.GENERIC;
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  }, rateLimiters.auth);
}