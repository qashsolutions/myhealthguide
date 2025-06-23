import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import admin from 'firebase-admin';
import { sendEmail } from '@/lib/email/resend';
import { ApiResponse } from '@/types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, APP_NAME, APP_URL } from '@/lib/constants';

/**
 * POST /api/account/confirm-deletion
 * Confirm account deletion using token from email
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
  token: z.string().min(1),
  uid: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
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

    const { token, uid } = validationResult.data;

    // Verify deletion token in Firestore
    if (!admin.apps.length) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Service temporarily unavailable',
        },
        { status: 503 }
      );
    }

    const db = admin.firestore();
    const tokenDoc = await db.collection('deletion_requests').doc(token).get();

    if (!tokenDoc.exists) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid or expired deletion link',
        },
        { status: 400 }
      );
    }

    const tokenData = tokenDoc.data()!;

    // Verify token matches user and hasn't expired
    if (tokenData.userId !== uid) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid deletion link',
        },
        { status: 400 }
      );
    }

    if (tokenData.used) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'This deletion link has already been used',
        },
        { status: 400 }
      );
    }

    const expiresAt = tokenData.expiresAt.toDate();
    if (new Date() > expiresAt) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'This deletion link has expired. Please request a new one.',
        },
        { status: 400 }
      );
    }

    // Mark token as used
    await db.collection('deletion_requests').doc(token).update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create deletion record with 30-day grace period
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    await db.collection('account_deletions').doc(uid).set({
      userId: uid,
      email: tokenData.email,
      reason: tokenData.reason || 'User requested deletion',
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledDeletionDate: deletionDate,
      status: 'pending',
      canRecover: true,
    });

    // Update user status to mark for deletion
    await admin.auth().updateUser(uid, {
      disabled: true,
    });

    // Update user document
    await db.collection('users').doc(uid).update({
      accountStatus: 'pending_deletion',
      deletionRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledDeletionDate: deletionDate,
    });

    // Create audit log
    await db.collection('audit_logs').add({
      userId: uid,
      action: 'account_deletion_confirmed',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        email: tokenData.email,
        reason: tokenData.reason,
        scheduledDeletionDate: deletionDate,
      },
    });

    // Send confirmation email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Deletion Confirmed - ${APP_NAME}</title>
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
            .info-box {
              background-color: #f3f4f6;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .recovery-box {
              background-color: #dbeafe;
              border: 2px solid #60a5fa;
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
              <h1>Account Deletion Confirmed</h1>
              <p style="margin: 10px 0; opacity: 0.9;">30-Day Recovery Period Started</p>
            </div>
            
            <div class="content">
              <h2>Your Account Has Been Scheduled for Deletion</h2>
              
              <p>We've received your confirmation and your ${APP_NAME} account has been deactivated.</p>
              
              <div class="info-box">
                <p><strong>What happens now:</strong></p>
                <ul>
                  <li>Your account is immediately deactivated</li>
                  <li>You cannot log in or access your data</li>
                  <li>Your data will be permanently deleted on: <strong>${deletionDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</strong></li>
                </ul>
              </div>
              
              <div class="recovery-box">
                <p><strong>🔄 Changed your mind?</strong></p>
                <p>You can recover your account within the next 30 days by simply signing in again at:</p>
                <p><a href="${APP_URL}/auth" style="color: #2563eb; font-weight: 600;">${APP_URL}/auth</a></p>
                <p>After 30 days, recovery will not be possible.</p>
              </div>
              
              <p>We're sorry to see you go. If you had any issues with ${APP_NAME} that led to this decision, we'd love to hear your feedback at <a href="mailto:feedback@myguide.health">feedback@myguide.health</a>.</p>
              
              <p>Thank you for being part of our community.</p>
              
              <p>Best regards,<br>The ${APP_NAME} Team</p>
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
      to: tokenData.email,
      subject: `Account Deletion Confirmed - ${APP_NAME}`,
      html: emailHtml,
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Your account has been successfully scheduled for deletion. You have 30 days to recover it by signing in again.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Confirm deletion error:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error.message || ERROR_MESSAGES.GENERIC,
      },
      { status: 500 }
    );
  }
}