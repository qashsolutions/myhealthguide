import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import admin from 'firebase-admin';
import { sendEmail } from '@/lib/email/resend';
import { ApiResponse } from '@/types';
import { ERROR_MESSAGES, APP_NAME, APP_URL } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';
import { verifyAuth } from '@/lib/firebase/admin';

/**
 * POST /api/account/request-deletion-link
 * Send account deletion confirmation email
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

// Request schema
const requestSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      // Verify authentication
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Authentication required',
          },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const decodedToken = await verifyAuth(token);

      if (!decodedToken) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Invalid authentication token',
          },
          { status: 401 }
        );
      }

      const userId = decodedToken.uid;
      const userEmail = decodedToken.email;

      if (!userEmail) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Email not found in user profile',
          },
          { status: 400 }
        );
      }

      // Parse request body
      const body = await request.json();
      const validationResult = requestSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Invalid request data',
          },
          { status: 400 }
        );
      }

      const { reason } = validationResult.data;

      // Generate deletion token
      const deletionToken = randomBytes(32).toString('hex');
      const deletionLink = `${APP_URL}/account/delete/confirm?token=${deletionToken}&uid=${userId}`;

      // Store deletion token in Firestore with 1-hour expiry
      if (admin.apps.length) {
        await admin.firestore().collection('deletion_requests').doc(deletionToken).set({
          userId,
          email: userEmail,
          reason: reason || 'User requested deletion',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          used: false,
        });
      }

      // Send deletion confirmation email
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
              .button {
                display: inline-block;
                padding: 16px 32px;
                background-color: #dc2626;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 18px;
                margin: 20px 0;
              }
              .warning {
                background-color: #fef2f2;
                border: 2px solid #fecaca;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                text-align: center;
                font-size: 14px;
                color: #4a5568;
              }
              h1 { font-size: 32px; margin: 0; }
              h2 { font-size: 24px; color: #1a202c; }
              p { margin: 16px 0; }
              ul { margin: 16px 0; padding-left: 20px; }
              li { margin: 8px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Account Deletion Request</h1>
                <p style="margin: 10px 0; opacity: 0.9;">Action Required</p>
              </div>
              
              <div class="content">
                <h2>Confirm Account Deletion</h2>
                
                <p>We received a request to delete your ${APP_NAME} account. If you made this request, click the button below to confirm.</p>
                
                <div class="warning">
                  <p><strong>⚠️ Warning: This action cannot be undone!</strong></p>
                  <p>Confirming will:</p>
                  <ul>
                    <li>Immediately deactivate your account</li>
                    <li>Start a 30-day recovery period</li>
                    <li>Permanently delete all your data after 30 days</li>
                    <li>Remove all medications, health data, and settings</li>
                  </ul>
                </div>
                
                <div style="text-align: center;">
                  <a href="${deletionLink}" class="button">Confirm Account Deletion</a>
                </div>
                
                <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
                
                <p>If you didn't request account deletion, please ignore this email and your account will remain active.</p>
                
                <p>If you're having second thoughts, you can always:</p>
                <ul>
                  <li>Take a break without deleting your account</li>
                  <li>Export your data first (available in Account Settings)</li>
                  <li>Contact our support team if you need help</li>
                </ul>
              </div>
              
              <div class="footer">
                <p>This is an automated message, please do not reply to this email.</p>
                <p>${APP_NAME} • <a href="${APP_URL}/privacy">Privacy Policy</a></p>
                <p>© 2025 <a href="${APP_URL}">${APP_URL}</a> - A unit of QaSH Solutions Inc.</p>
                <p>D-U-N-S® Number: 119536275</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sendEmail({
        to: userEmail,
        subject: `Account Deletion Request - ${APP_NAME}`,
        html: emailHtml,
      });

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: 'Deletion confirmation email sent. Please check your inbox.',
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('Request deletion link error:', error);

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: error.message || ERROR_MESSAGES.GENERIC,
        },
        { status: 500 }
      );
    }
  }, rateLimiters.auth);
}