import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import admin from 'firebase-admin';
import { sendEmail } from '@/lib/email/resend';
import { ApiResponse } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES, SUCCESS_MESSAGES, APP_NAME, APP_URL, DISCLAIMERS } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';
import { verifyAuth, getFirestore } from '@/lib/firebase/admin';
import { consumeOTP } from '@/lib/auth/otp';

/**
 * POST /api/auth/complete-profile
 * Complete user profile setup after client-side Firebase user creation
 * 
 * Flow:
 * 1. Verify Firebase ID token
 * 2. Create Firestore user document
 * 3. Send welcome email
 * 4. Consume OTP (marks registration as complete)
 * 5. Return success
 */


// Validation schema
const completeProfileSchema = z.object({
  name: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  email: z.string().email(VALIDATION_MESSAGES.EMAIL_INVALID),
});

// Verify Firebase auth token
const verifyAuthToken = async (authHeader: string | null): Promise<string | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await verifyAuth(token);
    return decodedToken ? decodedToken.uid : null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      // Verify authentication
      const headersList = headers();
      const authHeader = headersList.get('authorization');
      const userId = await verifyAuthToken(authHeader);
      
      if (!userId) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Authentication required',
            code: 'auth/unauthenticated',
          },
          { status: 401 }
        );
      }
      
      // Parse request body
      const body = await request.json();
      
      // Validate input
      const validationResult = completeProfileSchema.safeParse(body);
      
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
      
      const { name, email } = validationResult.data;
      
      // Create or update user document in Firestore
      try {
        const firestore = getFirestore();
        if (firestore) {
          await firestore
            .collection('users')
            .doc(userId)
            .set({
              email: email.toLowerCase(),
              name: name || '',
              emailVerified: true,
              disclaimerAccepted: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              status: 'active',
            }, { merge: true });
        }
      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError);
        // Don't fail if Firestore update fails - user is already created in Auth
      }
      
      // Send welcome email (non-blocking)
      sendWelcomeEmail(email, name).catch(error => {
        console.error('Failed to send welcome email:', error);
      });
      
      // Consume OTP now that the entire flow is complete
      consumeOTP(email, 'signup');
      
      // Return success
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: SUCCESS_MESSAGES.SIGNUP,
        },
        { status: 200 }
      );
      
    } catch (error) {
      console.error('Complete profile API error:', error);
      
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