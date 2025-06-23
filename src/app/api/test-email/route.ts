import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { APP_NAME, APP_URL } from '@/lib/constants';

/**
 * GET /api/test-email
 * Test email configuration
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 404 }
    );
  }

  // Get email from query params
  const searchParams = request.nextUrl.searchParams;
  const testEmail = searchParams.get('email');

  if (!testEmail) {
    return NextResponse.json(
      { error: 'Email parameter required' },
      { status: 400 }
    );
  }

  try {
    await sendEmail({
      to: testEmail,
      subject: `Test Email - ${APP_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Test Email</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Test Email from ${APP_NAME}</h1>
            <p>This is a test email to verify email configuration.</p>
            <p>If you received this email, your email configuration is working correctly!</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">
              © 2025 <a href="${APP_URL}">${APP_URL}</a> - A unit of QaSH Solutions Inc.<br>
              D-U-N-S® Number: 119536275
            </p>
          </body>
        </html>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error.message,
      },
      { status: 500 }
    );
  }
}