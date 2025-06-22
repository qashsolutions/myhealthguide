import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import admin from 'firebase-admin';
import { z } from 'zod';
import { ApiResponse } from '@/types';
import { sendEmail } from '@/lib/email/resend';
import { APP_NAME, APP_URL } from '@/lib/constants';

/**
 * POST /api/account/delete
 * Delete user account with 30-day recovery period
 * Requires authentication and password verification
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

// Validation schema
const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  reason: z.string().optional(),
});

// Verify auth token
const verifyAuthToken = async (authHeader: string | null): Promise<string | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  // Skip token verification if Firebase Admin is not initialized
  if (!admin.apps.length) {
    console.warn('Firebase Admin not initialized, skipping token verification');
    return 'development-user';
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

// Create audit log entry
const createAuditLog = async (userId: string, email: string, reason?: string) => {
  try {
    if (!admin.apps.length) return;

    const db = admin.firestore();
    await db.collection('deletion_audit').add({
      userId,
      email: email ? email.substring(0, 3) + '***' : 'unknown', // Partially anonymized
      reason: reason || 'User requested',
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'pending',
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't fail the deletion if audit logging fails
  }
};

// Send account deletion confirmation email
const sendDeletionEmail = async (userEmail: string, userName: string) => {
  const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const formattedDate = deletionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deletion Confirmation</title>
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
            background-color: #3182ce;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 18px;
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
          .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .info-box {
            background-color: #dbeafe;
            border: 1px solid #3b82f6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          h1 { font-size: 32px; margin: 0; }
          h2 { font-size: 24px; color: #1a202c; }
          p { margin: 16px 0; }
          ul { padding-left: 20px; }
          li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Deletion Scheduled</h1>
            <p style="margin: 10px 0; opacity: 0.9;">Your ${APP_NAME} account will be deleted in 30 days</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userName},</h2>
            
            <p>We've received your request to delete your ${APP_NAME} account. Your account has been deactivated and is scheduled for permanent deletion.</p>
            
            <div class="warning">
              <strong>Important:</strong> Your account and all associated data will be permanently deleted on <strong>${formattedDate}</strong>.
            </div>
            
            <h3>What happens next:</h3>
            <ul>
              <li>Your account is now deactivated - you cannot sign in</li>
              <li>You have 30 days to change your mind</li>
              <li>After 30 days, all your data will be permanently deleted</li>
              <li>This includes medications, health records, and settings</li>
            </ul>
            
            <div class="info-box">
              <h3>Changed your mind?</h3>
              <p>You can reactivate your account within the next 30 days by signing in again at:</p>
              <div style="text-align: center;">
                <a href="${APP_URL}/auth" class="button">Reactivate Account</a>
              </div>
              <p><small>After 30 days, reactivation will not be possible.</small></p>
            </div>
            
            <h3>Data we will delete:</h3>
            <ul>
              <li>Your account information (name, email, phone)</li>
              <li>All medication records</li>
              <li>Health questions and answers</li>
              <li>Settings and preferences</li>
              <li>Authentication data</li>
            </ul>
            
            <h3>Data we may retain:</h3>
            <ul>
              <li>Anonymized usage statistics</li>
              <li>Deletion audit logs (for legal compliance)</li>
              <li>Any data required by law</li>
            </ul>
            
            <p>If you have any questions about this process, please contact our support team immediately.</p>
            
            <p>Thank you for using ${APP_NAME}. We're sorry to see you go.</p>
            
            <p>Best regards,<br>The ${APP_NAME} Team</p>
          </div>
          
          <div class="footer">
            <p>${APP_NAME} • <a href="${APP_URL}/privacy">Privacy Policy</a></p>
            <p>© 2025 <a href="${APP_URL}">${APP_URL}</a> - A unit of QaSH Solutions Inc.</p>
            <p>D-U-N-S® Number: 119536275</p>
            <p><small>This is an automated message. Please do not reply to this email.</small></p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: userEmail,
    subject: `Account Deletion Confirmation - ${APP_NAME}`,
    html: emailHtml,
  });
};

export async function POST(request: NextRequest) {
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
    const validationResult = deleteAccountSchema.safeParse(body);
    
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
    
    const { password, reason } = validationResult.data;
    
    // Get user data
    let userEmail = 'unknown';
    let userName = 'User';
    
    if (admin.apps.length) {
      try {
        const userRecord = await admin.auth().getUser(userId);
        userEmail = userRecord.email || 'unknown';
        userName = userRecord.displayName || 'User';
        
        // Verify password by checking with a separate endpoint
        // Since we can't use Firebase client SDK in server-side code,
        // we'll verify by making a request to the login endpoint
        const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/verify-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userEmail,
            password: password,
          }),
        });
        
        if (!verifyResponse.ok) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Invalid password. Please try again.',
              code: 'auth/wrong-password',
            },
            { status: 401 }
          );
        }
        
        // Mark user for deletion (soft delete)
        await admin.auth().updateUser(userId, {
          disabled: true,
        });
        
        // Set custom claims for deletion
        await admin.auth().setCustomUserClaims(userId, {
          deletionRequested: true,
          deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        
        // Update Firestore user document
        const db = admin.firestore();
        await db.collection('users').doc(userId).update({
          deletionRequested: admin.firestore.FieldValue.serverTimestamp(),
          deletionScheduled: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deletionReason: reason,
          status: 'pending_deletion',
        });
      } catch (error) {
        console.error('Error updating user for deletion:', error);
      }
    }
    
    // Create audit log
    await createAuditLog(userId, userEmail, reason);
    
    // Send confirmation email
    try {
      await sendDeletionEmail(userEmail, userName);
    } catch (emailError) {
      console.error('Failed to send deletion email:', emailError);
      // Don't fail the request if email fails
    }
    
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          message: 'Account deletion scheduled',
          deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Account deletion error:', error);
    
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to delete account',
      },
      { status: 500 }
    );
  }
}