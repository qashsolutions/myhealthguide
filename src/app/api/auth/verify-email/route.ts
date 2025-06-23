import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  verifyEmailToken,
  markEmailAsVerified,
  getUserData 
} from '@/lib/auth/firebase-auth';
import { adminAuth } from '@/lib/firebase/admin';
import { ApiResponse } from '@/types';
import { ERROR_MESSAGES } from '@/lib/constants';

/**
 * POST /api/auth/verify-email
 * Verify email using custom token
 * 
 * Flow:
 * 1. Validate token from request
 * 2. Verify token in Firestore
 * 3. Mark email as verified in Firebase Auth
 * 4. Update user profile
 * 5. Return success (no session created - user must login)
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
          error: 'Invalid verification link',
        },
        { status: 400 }
      );
    }
    
    const { token } = validationResult.data;
    
    // Verify the token
    const tokenData = await verifyEmailToken(token);
    
    if (!tokenData) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'This verification link is invalid or has expired. Please request a new one.',
          code: 'auth/invalid-token',
        },
        { status: 400 }
      );
    }
    
    try {
      // Get user by email to find their UID
      const user = await adminAuth().getUserByEmail(tokenData.email);
      
      if (!user) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Account not found. Please sign up again.',
            code: 'auth/user-not-found',
          },
          { status: 404 }
        );
      }
      
      // Mark email as verified
      await markEmailAsVerified(user.uid);
      
      // Get user data for response
      const userData = await getUserData(user.uid);
      
      console.log(`[Email Verification] User ${tokenData.email} verified successfully`);
      
      // Return success without creating session
      // User must login after verification
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: 'Email verified successfully! Please sign in to access your account.',
          data: {
            email: tokenData.email,
            name: userData?.name || userData?.displayName || '',
            redirectTo: '/auth/login',
          },
        },
        { status: 200 }
      );
      
    } catch (error: any) {
      console.error('[Email Verification] Error updating user:', error);
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Failed to verify email. Please try again.',
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('[Email Verification] Unexpected error:', error);
    
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Something went wrong. Please try again later.',
      },
      { status: 500 }
    );
  }
}