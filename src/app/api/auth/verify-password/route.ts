import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { ApiResponse } from '@/types';

/**
 * POST /api/auth/verify-password
 * Verify user password for sensitive operations
 * Internal endpoint for password verification
 */

// Validation schema
const verifyPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = verifyPasswordSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid request data',
        },
        { status: 400 }
      );
    }
    
    const { email, password } = validationResult.data;
    
    try {
      // Attempt to sign in with the provided credentials
      await signInWithEmailAndPassword(auth, email, password);
      
      // If successful, password is correct
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: 'Password verified',
        },
        { status: 200 }
      );
    } catch (error: any) {
      // If sign in fails, password is incorrect
      console.error('Password verification failed:', error.code);
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid password',
          code: error.code || 'auth/wrong-password',
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Verify password API error:', error);
    
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to verify password',
      },
      { status: 500 }
    );
  }
}