import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import admin from 'firebase-admin';
import { ApiResponse } from '@/types';
import { verifyOTP, consumeOTP } from '@/lib/auth/otp';
import { sendEmail } from '@/lib/email/resend';
import { APP_NAME, APP_URL, ERROR_MESSAGES } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/account/verify-deletion
 * Verify OTP and complete account deletion
 * 
 * Flow:
 * 1. Verify the OTP code
 * 2. Find user by email
 * 3. Initialize Firebase Admin (only when needed)
 * 4. Delete user from Firebase Auth
 * 5. Delete user data from Firestore
 * 6. Send confirmation email
 * 
 * This completes the secure deletion process
 */

// Validation schema for OTP verification
const verifyDeletionSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
});

/**
 * Initialize Firebase Admin SDK
 * Only initialize when actually needed to avoid build issues
 */
const getFirebaseAdmin = () => {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin;
  }

  // Get credentials from environment
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  // Check if all required credentials are present
  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase Admin credentials missing');
    return null;
  }

  try {
    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    
    console.log('Firebase Admin initialized successfully');
    return admin;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return null;
  }
};

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validationResult = verifyDeletionSchema.safeParse(body);
      
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
      
      const { email, otp } = validationResult.data;
      
      // Verify the OTP
      const otpResult = verifyOTP(email, otp, 'delete');
      
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
      
      // Extract deletion reason from OTP metadata
      const { reason } = otpResult.metadata || { reason: 'User requested' };
      
      try {
        // Initialize Firebase Admin only when needed
        const firebaseAdmin = getFirebaseAdmin();
        
        if (!firebaseAdmin) {
          console.error('Firebase Admin not available for deletion');
          
          // In development, we can simulate deletion
          if (process.env.NODE_ENV === 'development') {
            console.log(`[DEV] Would delete account for: ${email}`);
            
            // Send confirmation email anyway
            await sendDeletionConfirmationEmail(email);
            
            return NextResponse.json<ApiResponse>(
              {
                success: true,
                message: 'Account deletion completed (development mode)',
              },
              { status: 200 }
            );
          }
          
          // In production, this is an error
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Account deletion service temporarily unavailable',
              code: 'deletion/service-unavailable',
            },
            { status: 503 }
          );
        }
        
        // Find user by email
        let userRecord;
        try {
          userRecord = await firebaseAdmin.auth().getUserByEmail(email);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            return NextResponse.json<ApiResponse>(
              {
                success: false,
                error: 'No account found with this email address',
                code: 'auth/user-not-found',
              },
              { status: 404 }
            );
          }
          throw error;
        }
        
        const userId = userRecord.uid;
        
        // Create audit log before deletion
        try {
          const db = firebaseAdmin.firestore();
          await db.collection('deletion_audit').add({
            userId,
            email: email.substring(0, 3) + '***', // Partially anonymized
            reason,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedBy: 'user-otp-verification',
          });
        } catch (error) {
          console.error('Failed to create deletion audit log:', error);
          // Continue with deletion even if audit fails
        }
        
        // Delete user data from Firestore
        try {
          const db = firebaseAdmin.firestore();
          
          // Delete user document
          await db.collection('users').doc(userId).delete();
          
          // Delete related collections (add more as needed)
          const collections = ['medications', 'health_checks', 'preferences'];
          
          for (const collection of collections) {
            const snapshot = await db
              .collection(collection)
              .where('userId', '==', userId)
              .get();
            
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            
            if (!snapshot.empty) {
              await batch.commit();
            }
          }
          
          console.log(`Deleted Firestore data for user: ${userId}`);
        } catch (error) {
          console.error('Failed to delete Firestore data:', error);
          // Continue with auth deletion even if Firestore fails
        }
        
        // Delete user from Firebase Auth
        await firebaseAdmin.auth().deleteUser(userId);
        console.log(`Deleted Firebase Auth user: ${userId}`);
        
        // Send confirmation email (non-blocking)
        sendDeletionConfirmationEmail(email).catch(error => {
          console.error('Failed to send deletion confirmation email:', error);
        });
        
        // Now that everything succeeded, consume the OTP
        consumeOTP(email, 'delete');
        
        // Return success
        return NextResponse.json<ApiResponse>(
          {
            success: true,
            message: 'Your account has been successfully deleted.',
          },
          { status: 200 }
        );
        
      } catch (error: any) {
        console.error('Account deletion error:', error);
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Failed to complete account deletion. Please contact support.',
            code: 'deletion/failed',
          },
          { status: 500 }
        );
      }
      
    } catch (error) {
      console.error('Verify deletion API error:', error);
      
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
 * Send account deletion confirmation email
 * This confirms the account has been deleted
 */
async function sendDeletionConfirmationEmail(email: string) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deleted - ${APP_NAME}</title>
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
            background-color: #4a5568;
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
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
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
          .footer a {
            color: #3182ce;
            text-decoration: none;
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
            <h1>Account Deleted</h1>
            <p style="margin: 10px 0; opacity: 0.9;">Your ${APP_NAME} account has been removed</p>
          </div>
          
          <div class="content">
            <h2>We're sorry to see you go</h2>
            
            <p>Your ${APP_NAME} account and all associated data have been permanently deleted as requested.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0;">What has been deleted:</h3>
              <ul>
                <li>Your account information</li>
                <li>All medication history</li>
                <li>Saved health information</li>
                <li>Email preferences</li>
              </ul>
            </div>
            
            <p>You will no longer receive any emails from ${APP_NAME}.</p>
            
            <p>If you deleted your account by mistake or change your mind, you're always welcome to create a new account at any time by visiting <a href="${APP_URL}">${APP_URL}</a>.</p>
            
            <p>Thank you for using ${APP_NAME}. We hope we were able to help you manage your health safely.</p>
            
            <p>Take care,<br>The ${APP_NAME} Team</p>
          </div>
          
          <div class="footer">
            <p>© 2025 <a href="https://www.myguide.health">https://www.myguide.health</a> - A unit of QaSH Solutions Inc.<br>
            D-U-N-S® Number: 119536275</p>
            
            <p>
              <a href="${APP_URL}/privacy">Privacy Policy</a> • 
              <a href="${APP_URL}/medical-disclaimer">Medical Disclaimer</a>
            </p>
            
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  await sendEmail({
    to: email,
    subject: `Account Deleted - ${APP_NAME}`,
    html: emailHtml,
  });
}