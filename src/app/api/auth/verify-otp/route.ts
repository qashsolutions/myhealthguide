import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { verifyOTP, consumeOTP } from '@/lib/auth/otp';
import { sendEmail } from '@/lib/email/resend';
import { ApiResponse } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES, SUCCESS_MESSAGES, APP_NAME, APP_URL, DISCLAIMERS } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/verify-otp
 * Verify OTP and complete user registration
 * 
 * Flow:
 * 1. Verify the OTP code
 * 2. Create Firebase Auth user with temporary password
 * 3. Create Firestore user document
 * 4. Send welcome email
 * 5. Return success with auth token
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
  password: z
    .string()
    .min(6, VALIDATION_MESSAGES.PASSWORD_MIN),
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
      
      const { email, otp, password } = validationResult.data;
      
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
      
      try {
        // Create Firebase Auth user with the provided password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        // Update display name if available
        if (name) {
          await updateProfile(firebaseUser, {
            displayName: name,
          });
        }
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: email.toLowerCase(),
          name: name || '',
          phoneNumber: null, // Can be added later
          emailVerified: true, // Verified via OTP
          disclaimerAccepted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'active',
        });
        
        // Get ID token for immediate login
        const idToken = await firebaseUser.getIdToken();
        
        // Now that everything succeeded, consume the OTP
        consumeOTP(email, 'signup');
        
        // Send welcome email (non-blocking - don't wait for it)
        sendWelcomeEmail(email, name).catch(error => {
          console.error('Failed to send welcome email:', error);
          // Don't fail the registration if welcome email fails
        });
        
        // Return success with user data and token
        return NextResponse.json<ApiResponse>(
          {
            success: true,
            message: 'Registration completed successfully!',
            data: {
              user: {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                emailVerified: true,
              },
              token: idToken,
            },
          },
          { status: 201 }
        );
        
      } catch (firebaseError: any) {
        console.error('Firebase error during registration:', firebaseError);
        
        // Handle specific Firebase errors
        let errorMessage = 'Failed to complete registration';
        let errorCode = 'auth/unknown';
        
        if (firebaseError.code === 'auth/email-already-in-use') {
          errorMessage = 'This email is already registered. Please login instead.';
          errorCode = 'auth/email-exists';
        } else if (firebaseError.code === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Please use a stronger password.';
          errorCode = 'auth/weak-password';
        }
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: errorMessage,
            code: errorCode,
          },
          { status: 400 }
        );
      }
      
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

/**
 * Send welcome email after successful registration
 * This is non-blocking to avoid delaying the registration response
 */
async function sendWelcomeEmail(email: string, name: string) {
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
          .feature-list {
            background-color: #f7fafc;
            border-radius: 8px;
            padding: 20px;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${APP_NAME}</h1>
            <p style="margin: 10px 0; opacity: 0.9;">AI-powered medication safety for seniors</p>
          </div>
          
          <div class="content">
            <h2>Welcome aboard, ${name || 'Friend'}!</h2>
            
            <p>Your account has been successfully created. We're excited to help you manage your medications safely.</p>
            
            <div class="feature-list">
              <h3 style="margin-top: 0;">What you can do with ${APP_NAME}:</h3>
              <ul>
                <li><strong>Check Medications:</strong> Get instant analysis of potential drug interactions</li>
                <li><strong>Ask Health Questions:</strong> Get clear, simple answers to your health queries</li>
                <li><strong>Voice Support:</strong> Use voice commands instead of typing</li>
                <li><strong>Safety Alerts:</strong> Easy-to-understand traffic light system for medication safety</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${APP_URL}/medication-check" class="button">Start Checking Your Medications</a>
            </div>
            
            <div class="disclaimer">
              <strong>
                <svg xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle;" fill="none" viewBox="0 0 24 24" stroke="#3182ce">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Important:
              </strong>
              ${DISCLAIMERS.GENERAL}
            </div>
            
            <p>If you have any questions, our support team is here to help at <a href="mailto:support@myguide.health">support@myguide.health</a>.</p>
            
            <p>Stay healthy!<br>The ${APP_NAME} Team</p>
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
    subject: `Welcome to ${APP_NAME} - Your Account is Ready!`,
    html: emailHtml,
  });
}