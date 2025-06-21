import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resetPassword } from '@/lib/firebase/auth';
import { ApiResponse } from '@/types';
import { VALIDATION_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/reset-password
 * Send password reset email
 */

// Validation schema
const resetPasswordSchema = z.object({
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
      const validationResult = resetPasswordSchema.safeParse(body);
      
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
      
      const { email } = validationResult.data;
      
      // Send password reset email
      const result = await resetPassword(email);
      
      if (!result.success) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: result.error,
            code: result.code,
          },
          { status: 400 }
        );
      }
      
      // Return success response
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: SUCCESS_MESSAGES.PASSWORD_RESET,
        },
        { status: 200 }
      );
      
    } catch (error) {
      console.error('Password reset API error:', error);
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Failed to send password reset email',
        },
        { status: 500 }
      );
    }
  }, rateLimiters.auth);
}