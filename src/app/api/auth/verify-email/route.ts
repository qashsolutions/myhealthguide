import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { createSession } from '@/lib/auth/session';
import { ApiResponse } from '@/types';
import { ERROR_MESSAGES } from '@/lib/constants';

/**
 * POST /api/auth/verify-email
 * Verify email using the token sent via email
 * 
 * Flow:
 * 1. Validate token from request
 * 2. Lookup token in Firestore
 * 3. Check if token is valid (not used, not expired)
 * 4. Mark user as email verified in Firebase Auth
 * 5. Mark token as used
 * 6. Update user profile in Firestore
 * 7. Return success response
 */

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = verifyEmailSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid verification token',
        },
        { status: 400 }
      );
    }
    
    const { token } = validationResult.data;
    
    // Get token from Firestore
    const tokenDoc = await adminDb()
      .collection('emailVerifications')
      .doc(token)
      .get();
    
    if (!tokenDoc.exists) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid or expired verification link',
          code: 'auth/invalid-token',
        },
        { status: 400 }
      );
    }
    
    const tokenData = tokenDoc.data()!;
    
    // Check if already used
    if (tokenData.used) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'This verification link has already been used',
          code: 'auth/token-already-used',
        },
        { status: 400 }
      );
    }
    
    // Check if expired
    const expiryDate = tokenData.expires.toDate ? tokenData.expires.toDate() : new Date(tokenData.expires);
    if (new Date() > expiryDate) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'This verification link has expired. Please request a new one.',
          code: 'auth/token-expired',
        },
        { status: 400 }
      );
    }
    
    // Mark user as verified in Firebase Auth
    await adminAuth().updateUser(tokenData.userId, {
      emailVerified: true,
    });
    
    // Mark token as used
    await tokenDoc.ref.update({
      used: true,
      usedAt: new Date(),
    });
    
    // Update user profile in Firestore
    await adminDb().collection('users').doc(tokenData.userId).update({
      emailVerified: true,
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Get user data for response
    const userDoc = await adminDb().collection('users').doc(tokenData.userId).get();
    const userData = userDoc.data();
    
    // Create a session for the verified user
    // This allows them to be automatically logged in after verification
    console.log(`[Email Verification] Creating session for user ${tokenData.email}`);
    
    await createSession({
      userId: tokenData.userId,
      email: tokenData.email,
      emailVerified: true,
      name: userData?.name || undefined,
      disclaimerAccepted: userData?.disclaimerAccepted || false,
    });
    
    console.log(`[Email Verification] User ${tokenData.email} verified successfully with session`);
    
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Email verified successfully! You can now sign in to your account.',
        data: {
          email: tokenData.email,
          name: userData?.name,
        },
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Email verification error:', error);
    
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: ERROR_MESSAGES.GENERIC,
      },
      { status: 500 }
    );
  }
}