import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import admin from 'firebase-admin';
import { sendEmail } from '@/lib/email/resend';
import { ApiResponse, SignupData } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES, SUCCESS_MESSAGES, APP_NAME, APP_URL, DISCLAIMERS } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/signup
 * Create new user account with magic link
 */

// Initialize Firebase Admin if needed
const initializeFirebaseAdmin = () => {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      } catch (error) {
        console.error('Firebase admin initialization error:', error);
      }
    }
  }
};

initializeFirebaseAdmin();

// Validation schema (no password needed for magic link)
const signupSchema = z.object({
  email: z
    .string()
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .min(1, VALIDATION_MESSAGES.REQUIRED),
  name: z
    .string()
    .min(1, VALIDATION_MESSAGES.REQUIRED)
    .max(100),
  phoneNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[\d\s\-\(\)]+$/.test(val),
      VALIDATION_MESSAGES.PHONE_INVALID
    ),
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
    
    const { email, name, phoneNumber } = validationResult.data;
    
    try {
      // Generate magic link using Firebase Admin
      let magicLink = '';
      
      if (admin.apps.length) {
        const actionCodeSettings = {
          url: `${APP_URL}/auth/action?email=${encodeURIComponent(email)}`,
          handleCodeInApp: true,
        };
        
        magicLink = await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);
      } else {
        // Fallback for development
        magicLink = `${APP_URL}/auth/action?mode=signIn&email=${encodeURIComponent(email)}&apiKey=development`;
      }
      
      // Store user data temporarily (will be created when they verify)
      // This is handled client-side in the signUp function
      
      // Send magic link email via Resend
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email - ${APP_NAME}</title>
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
                
                <p>Thank you for joining ${APP_NAME}! Please verify your email address to complete your registration.</p>
                
                <p>Click the button below to verify your email and start using our medication safety features:</p>
                
                <div style="text-align: center;">
                  <a href="${magicLink}" class="button">Verify Email & Complete Registration</a>
                </div>
                
                <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
                
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #3182ce; font-size: 14px;">${magicLink}</p>
                
                <p>If you didn't create an account with ${APP_NAME}, you can safely ignore this email.</p>
                
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
        subject: `Verify Your Email - ${APP_NAME}`,
        html: emailHtml,
      });
      
      // Return success response
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: 'Verification email sent successfully. Please check your inbox.',
        },
        { status: 201 }
      );
    } catch (emailError: any) {
      console.error('Failed to send verification email:', emailError);
      
      // Account might have been created but email failed
      // Return partial success with warning
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: 'Account created successfully. However, we could not send the verification email. Please contact support at support@myguide.health.',
          warning: 'email_delivery_failed',
          code: 'email/send-failed',
        },
        { status: 201 }
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