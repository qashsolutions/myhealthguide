import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/resend';
import { storeOTP, hasValidOTP, getOTPRemainingTime } from '@/lib/auth/otp';
import { ApiResponse } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES, SUCCESS_MESSAGES, APP_NAME, APP_URL, DISCLAIMERS } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/signup
 * Generate and send OTP for email verification during signup
 * 
 * Flow:
 * 1. Validate email and name
 * 2. Check if OTP already exists (prevent spam)
 * 3. Generate 6-digit OTP
 * 4. Send OTP via Resend email
 * 5. Return success with remaining time
 */

// Validation schema for welcome email
const welcomeEmailSchema = z.object({
  email: z
    .string()
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .min(1, VALIDATION_MESSAGES.REQUIRED),
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
    
      const { email, name } = validationResult.data;
      
      // Check if user already has a valid OTP to prevent spam
      if (hasValidOTP(email, 'signup')) {
        const remainingTime = getOTPRemainingTime(email, 'signup');
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: `An OTP was already sent to this email. Please wait ${remainingTime} seconds before requesting a new one.`,
            data: { remainingTime },
          },
          { status: 429 } // Too Many Requests
        );
      }
    
      try {
        // Generate and store OTP with user metadata
        const otpData = storeOTP(email, 'signup', { name });
        
        // Log OTP generation (remove in production for security)
        console.log(`[Signup] Generated OTP for ${email}: ${otpData.code}`);
        
        // Send OTP email via Resend
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to ${APP_NAME}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.7;
                color: #1a202c;
                font-size: 18px;
                margin: 0;
                padding: 0;
                background-color: #f7fafc;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 40px 20px;
              }
              .header {
                background-color: #3182ce;
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 12px 12px 0 0;
              }
              .content {
                background-color: #ffffff;
                padding: 40px 30px;
                border: 1px solid #e2e8f0;
                border-radius: 0 0 12px 12px;
              }
              .button {
                display: inline-block;
                padding: 16px 32px;
                background-color: #3182ce;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 18px;
                margin: 20px 0;
              }
              .disclaimer {
                background-color: #EBF8FF;
                border: 1px solid #3182ce;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                font-size: 16px;
              }
              .disclaimer strong {
                display: inline-flex;
                align-items: center;
                gap: 8px;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                text-align: center;
                font-size: 14px;
                color: #4a5568;
              }
              .footer a {
                color: #3182ce;
                text-decoration: none;
              }
              .footer a:hover {
                text-decoration: underline;
              }
              h1 { font-size: 32px; margin: 0; }
              h2 { font-size: 24px; color: #1a202c; }
              p { margin: 16px 0; }
              .icon {
                display: inline-block;
                vertical-align: middle;
                width: 20px;
                height: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${APP_NAME}</h1>
                <p style="margin: 10px 0; opacity: 0.9;">AI-powered medication safety for seniors</p>
              </div>
              
              <div class="content">
                <h2>Hello ${name},</h2>
                
                <p>Welcome to ${APP_NAME}! To complete your registration, please enter the verification code below:</p>
                
                <!-- OTP Code Display -->
                <div style="background-color: #f7fafc; border: 2px solid #3182ce; border-radius: 8px; padding: 30px; margin: 30px 0; text-align: center;">
                  <p style="margin: 0 0 10px 0; font-size: 16px; color: #4a5568;">Your verification code is:</p>
                  <h1 style="font-size: 48px; letter-spacing: 8px; color: #3182ce; margin: 0; font-family: monospace;">${otpData.code}</h1>
                  <p style="margin: 10px 0 0 0; font-size: 14px; color: #718096;">This code expires in 10 minutes</p>
                </div>
                
                <p><strong>Why verification is needed:</strong></p>
                <ul style="margin: 20px 0; padding-left: 20px;">
                  <li>Ensures your email address is correct</li>
                  <li>Protects your health information</li>
                  <li>Prevents unauthorized access</li>
                </ul>
                
                <p>If you didn't create an account with ${APP_NAME}, please ignore this email.</p>
                
                <div class="disclaimer">
                  <strong>
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="#3182ce">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Important:
                  </strong>
                  ${DISCLAIMERS.GENERAL}
                </div>
              </div>
              
              <div class="footer">
                <p>© 2025 <a href="https://www.myguide.health">https://www.myguide.health</a> - A unit of QaSH Solutions Inc.<br>
                D-U-N-S® Number: 119536275</p>
                
                <p>
                  <a href="${APP_URL}/privacy">Privacy Policy</a> • 
                  <a href="${APP_URL}/medical-disclaimer">Medical Disclaimer</a> • 
                  <a href="${APP_URL}/account/delete">Unsubscribe</a>
                </p>
                
                <p>Made with care for seniors managing their health</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
        await sendEmail({
          to: email,
          subject: `Your ${APP_NAME} Verification Code: ${otpData.code}`,
          html: emailHtml,
        });
        
        // Return success response with OTP expiry info
        return NextResponse.json<ApiResponse>(
          {
            success: true,
            message: 'Verification code sent successfully. Please check your email.',
            data: {
              email,
              expiresAt: otpData.expiresAt.toISOString(),
              createdAt: otpData.createdAt.toISOString(),
            },
          },
          { status: 200 }
        );
      } catch (emailError: any) {
        console.error('Failed to send OTP email:', emailError);
        
        // Return error response
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Failed to send verification code. Please try again.',
            code: 'email/send-failed',
          },
          { status: 500 }
        );
      }
    
  } catch (error) {
    console.error('Signup API error:', error);
    
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