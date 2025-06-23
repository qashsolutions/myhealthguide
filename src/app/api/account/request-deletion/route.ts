import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/types';
import { sendEmail } from '@/lib/email/resend';
import { storeOTP, hasValidOTP, getOTPRemainingTime } from '@/lib/auth/otp';
import { APP_NAME, APP_URL, DISCLAIMERS } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/account/request-deletion
 * Request account deletion by sending OTP
 * 
 * Flow:
 * 1. Validate email address
 * 2. Check for existing OTP (prevent spam)
 * 3. Generate 6-digit OTP
 * 4. Send OTP via email with deletion warning
 * 5. User must verify OTP to complete deletion
 * 
 * This two-step process prevents accidental deletions and provides
 * a secure audit trail without requiring password verification
 */

// Validation schema - only email needed for OTP-based deletion
const requestDeletionSchema = z.object({
  email: z.string().email('Invalid email address'),
  reason: z.string().optional(), // Optional reason for deletion
});

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      // Parse request body
      const body = await request.json();
      
      // Validate input
      const validationResult = requestDeletionSchema.safeParse(body);
      
      if (!validationResult.success) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Invalid request data',
            errors: validationResult.error.issues.map(issue => ({
              field: issue.path[0] as string,
              message: issue.message,
            })),
          },
          { status: 400 }
        );
      }
      
      const { email, reason } = validationResult.data;
      
      // Check if user already has a valid OTP to prevent spam
      if (hasValidOTP(email, 'delete')) {
        const remainingTime = getOTPRemainingTime(email, 'delete');
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: `A deletion code was already sent. Please wait ${remainingTime} seconds before requesting a new one.`,
            data: { remainingTime },
          },
          { status: 429 } // Too Many Requests
        );
      }
      
      try {
        // Generate and store OTP with deletion metadata
        const otpData = storeOTP(email, 'delete', { reason });
        
        // Log OTP generation (remove in production for security)
        console.log(`[Account Deletion] Generated OTP for ${email}: ${otpData.code}`);
        
        // Send deletion OTP email via Resend
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Account Deletion Request - ${APP_NAME}</title>
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
                  background-color: #dc2626;
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
                .warning-box {
                  background-color: #fef2f2;
                  border: 2px solid #dc2626;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 20px 0;
                }
                .otp-box {
                  background-color: #f7fafc;
                  border: 2px solid #dc2626;
                  border-radius: 8px;
                  padding: 30px;
                  margin: 30px 0;
                  text-align: center;
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
                h1 { font-size: 32px; margin: 0; }
                h2 { font-size: 24px; color: #1a202c; }
                ul { padding-left: 20px; }
                li { margin: 8px 0; }
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
                  <h1>Account Deletion Request</h1>
                  <p style="margin: 10px 0; opacity: 0.9;">Please confirm this action</p>
                </div>
                
                <div class="content">
                  <h2>Important: Account Deletion Request</h2>
                  
                  <p>We received a request to delete the ${APP_NAME} account associated with this email address.</p>
                  
                  <div class="warning-box">
                    <strong>
                      <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="#dc2626">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Warning: This action cannot be undone
                    </strong>
                    <p style="margin-top: 10px;">Deleting your account will:</p>
                    <ul>
                      <li>Remove all your medication history</li>
                      <li>Delete all your saved health information</li>
                      <li>Cancel any active subscriptions</li>
                      <li>Remove you from our mailing list</li>
                    </ul>
                  </div>
                  
                  <p>If you want to proceed with account deletion, please enter the verification code below:</p>
                  
                  <!-- OTP Code Display -->
                  <div class="otp-box">
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #4a5568;">Your deletion confirmation code is:</p>
                    <h1 style="font-size: 48px; letter-spacing: 8px; color: #dc2626; margin: 0; font-family: monospace;">${otpData.code}</h1>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #718096;">This code expires in 10 minutes</p>
                  </div>
                  
                  <p><strong>Didn't request this?</strong></p>
                  <p>If you didn't request account deletion, please ignore this email. Your account will remain active and no changes will be made.</p>
                  
                  <div style="text-align: center;">
                    <a href="${APP_URL}/account" class="button">Keep My Account</a>
                  </div>
                  
                  <div class="disclaimer">
                    <strong>
                      <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="#3182ce">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Note:
                    </strong>
                    If you're having issues with ${APP_NAME}, our support team is here to help. Contact us at 
                    <a href="mailto:support@myguide.health">support@myguide.health</a> before deleting your account.
                  </div>
                </div>
                
                <div class="footer">
                  <p>© 2025 <a href="https://www.myguide.health">https://www.myguide.health</a> - A unit of QaSH Solutions Inc.<br>
                  D-U-N-S® Number: 119536275</p>
                  
                  <p>
                    <a href="${APP_URL}/privacy">Privacy Policy</a> • 
                    <a href="${APP_URL}/medical-disclaimer">Medical Disclaimer</a>
                  </p>
                  
                  <p>Made with care for seniors managing their health</p>
                </div>
              </div>
            </body>
          </html>
        `;
        
        await sendEmail({
          to: email,
          subject: `Account Deletion Request - Action Required`,
          html: emailHtml,
        });
        
        // Return success response with server timestamps
        return NextResponse.json<ApiResponse>(
          {
            success: true,
            message: 'Deletion confirmation code sent. Please check your email.',
            data: {
              email,
              expiresIn: 600, // 10 minutes in seconds
              expiresAt: otpData.expiresAt.toISOString(),
              createdAt: otpData.createdAt.toISOString(),
            },
          },
          { status: 200 }
        );
        
      } catch (emailError: any) {
        console.error('Failed to send deletion OTP email:', emailError);
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Failed to send confirmation email. Please try again.',
            code: 'email/send-failed',
          },
          { status: 500 }
        );
      }
      
    } catch (error) {
      console.error('Request deletion API error:', error);
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'An unexpected error occurred. Please try again.',
        },
        { status: 500 }
      );
    }
  }, rateLimiters.auth);
}