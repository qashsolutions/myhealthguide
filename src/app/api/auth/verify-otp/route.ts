import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOTP, consumeOTP } from '@/lib/auth/otp';
import { ApiResponse } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/verify-otp
 * Verify OTP code only - user creation happens client-side
 * 
 * Flow:
 * 1. Validate email and OTP
 * 2. Verify OTP using stored data
 * 3. Return success with user metadata
 * 4. Consume OTP after verification
 */

// Validation schema for OTP verification
const verifyOTPSchema = z.object({
  email: z
    .string()
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .min(1, VALIDATION_MESSAGES.REQUIRED),
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
});

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validationResult = verifyOTPSchema.safeParse(body);
      
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
      
      const { email, otp } = validationResult.data;
      
      // Verify the OTP
      const otpResult = verifyOTP(email, otp, 'signup');
      
      if (!otpResult.success) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: otpResult.error || 'Invalid or expired OTP',
            code: 'otp/invalid',
          },
          { status: 400 }
        );
      }
      
      // Extract user metadata from OTP (name was stored during generation)
      const { name } = otpResult.metadata || { name: '' };
      
      // Consume the OTP now that it's verified
      consumeOTP(email, 'signup');
      
      // Return success with user metadata
      // The client will use this to create the Firebase user
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: 'OTP verified successfully',
          data: {
            email,
            name,
          },
        },
        { status: 200 }
      );
      
    } catch (error) {
      console.error('Verify OTP API error:', error);
      
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

