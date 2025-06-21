import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendWelcomeEmail } from '@/lib/email/resend';
import { ApiResponse, WelcomeEmailData } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';

/**
 * POST /api/email/welcome
 * Send welcome email to new users
 * This is typically called internally after signup
 */

// Validation schema
const welcomeEmailSchema = z.object({
  userName: z
    .string()
    .min(1, VALIDATION_MESSAGES.REQUIRED),
  userEmail: z
    .string()
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .min(1, VALIDATION_MESSAGES.REQUIRED),
});

// Simple API key check (in production, use proper authentication)
const verifyApiKey = (request: NextRequest): boolean => {
  const apiKey = request.headers.get('x-api-key');
  return apiKey === process.env.INTERNAL_API_KEY;
};

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key
    if (!verifyApiKey(request)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Unauthorized',
          code: 'auth/unauthorized',
        },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = welcomeEmailSchema.safeParse(body);
    
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
    
    const emailData: WelcomeEmailData = validationResult.data;
    
    // Send welcome email
    await sendWelcomeEmail(emailData);
    
    // Return success response
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Welcome email sent successfully',
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Welcome email API error:', error);
    
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to send welcome email',
      },
      { status: 500 }
    );
  }
}