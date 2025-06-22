import { Resend } from 'resend';
import { 
  EmailData, 
  WelcomeEmailData, 
  PasswordResetEmailData 
} from '@/types';
import { APP_NAME, APP_URL, EMAIL_CONFIG } from '@/lib/constants';

/**
 * Resend email service integration
 * Handles welcome emails, password resets, and notifications
 */

// Initialize Resend client with optional API key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Log initialization status for debugging
if (process.env.NODE_ENV !== 'test') {
  console.log('[Resend] Email service initialization:', {
    configured: !!resend,
    hasApiKey: !!process.env.RESEND_API_KEY,
    apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 7) + '...',
  });
}

// Email templates with eldercare-friendly styling
const emailStyles = `
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
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 14px;
      color: #4a5568;
    }
    .disclaimer {
      background-color: #fef5e7;
      border: 1px solid #ed8936;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 16px;
    }
    h1 { font-size: 32px; margin: 0; }
    h2 { font-size: 24px; color: #1a202c; }
    p { margin: 16px 0; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
`;

// Welcome email template
const getWelcomeEmailHtml = (data: WelcomeEmailData): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${APP_NAME}</title>
        ${emailStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${APP_NAME}!</h1>
            <p style="margin: 10px 0; opacity: 0.9;">Your AI-Powered Medication Safety Companion</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.userName},</h2>
            
            <p>Thank you for joining ${APP_NAME}! We're excited to help you manage your medications safely.</p>
            
            <p><strong>What you can do now:</strong></p>
            <ul>
              <li>Check your medications for potential conflicts</li>
              <li>Get answers to health questions in simple language</li>
              <li>Use voice commands instead of typing</li>
              <li>Access clear, traffic-light safety indicators</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${APP_URL}/medication-check" class="button">Check Your Medications</a>
            </div>
            
            <div class="disclaimer">
              <strong>Important:</strong> ${APP_NAME} provides educational information only. Always consult your healthcare provider before making changes to your medications.
            </div>
            
            <p>If you have any questions, please don't hesitate to reach out. We're here to help!</p>
            
            <p>Stay healthy,<br>The ${APP_NAME} Team</p>
          </div>
          
          <div class="footer">
            <p>${APP_NAME} • <a href="${APP_URL}/privacy">Privacy Policy</a> • <a href="${APP_URL}/account/delete">Unsubscribe</a></p>
            <p>© 2025 <a href="${APP_URL}">${APP_URL}</a> - A unit of QaSH Solutions Inc.</p>
            <p>D-U-N-S® Number: 119536275</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Password reset email template
const getPasswordResetEmailHtml = (data: PasswordResetEmailData): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        ${emailStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${data.userName},</h2>
            
            <p>We received a request to reset your password for your ${APP_NAME} account.</p>
            
            <p>If you requested this reset, please click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${data.resetLink}" class="button">Reset My Password</a>
            </div>
            
            <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
            
            <p>If you didn't request this password reset, you can safely ignore this email. Your password won't be changed.</p>
            
            <div class="disclaimer">
              <strong>Security Tip:</strong> Never share your password with anyone. ${APP_NAME} staff will never ask for your password.
            </div>
            
            <p>If you continue to have trouble accessing your account, please contact our support team.</p>
            
            <p>Best regards,<br>The ${APP_NAME} Team</p>
          </div>
          
          <div class="footer">
            <p>${APP_NAME} • <a href="${APP_URL}/privacy">Privacy Policy</a> • <a href="${APP_URL}/account/delete">Unsubscribe</a></p>
            <p>© 2025 <a href="${APP_URL}">${APP_URL}</a> - A unit of QaSH Solutions Inc.</p>
            <p>D-U-N-S® Number: 119536275</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Send welcome email
export const sendWelcomeEmail = async (data: WelcomeEmailData): Promise<void> => {
  if (!resend) {
    const error = new Error('Email service not configured: RESEND_API_KEY is missing or invalid');
    console.error('[Resend] Error:', error.message);
    throw error;
  }

  try {
    const emailData: EmailData = {
      to: data.userEmail,
      subject: EMAIL_CONFIG.SUBJECTS.WELCOME,
      html: getWelcomeEmailHtml(data),
      from: EMAIL_CONFIG.FROM,
      replyTo: EMAIL_CONFIG.REPLY_TO,
    };

    const result = await resend.emails.send({
      from: emailData.from!,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      reply_to: emailData.replyTo,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Send welcome email error:', error);
    throw error;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (
  data: PasswordResetEmailData
): Promise<void> => {
  if (!resend) {
    const error = new Error('Email service not configured: RESEND_API_KEY is missing or invalid');
    console.error('[Resend] Error:', error.message);
    throw error;
  }

  try {
    const emailData: EmailData = {
      to: data.userEmail,
      subject: EMAIL_CONFIG.SUBJECTS.PASSWORD_RESET,
      html: getPasswordResetEmailHtml(data),
      from: EMAIL_CONFIG.FROM,
      replyTo: EMAIL_CONFIG.REPLY_TO,
    };

    const result = await resend.emails.send({
      from: emailData.from!,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      reply_to: emailData.replyTo,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Send password reset email error:', error);
    throw error;
  }
};

// Send generic email
export const sendEmail = async (data: EmailData): Promise<void> => {
  if (!resend) {
    const error = new Error('Email service not configured: RESEND_API_KEY is missing or invalid');
    console.error('[Resend] Error:', error.message);
    throw error;
  }

  try {
    console.log('[Resend] Sending email:', {
      to: data.to,
      subject: data.subject,
      from: data.from || EMAIL_CONFIG.FROM,
    });

    const result = await resend.emails.send({
      from: data.from || EMAIL_CONFIG.FROM,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
      reply_to: data.replyTo || EMAIL_CONFIG.REPLY_TO,
    });

    if (result.error) {
      console.error('[Resend] API error:', result.error);
      throw new Error(`Resend API error: ${result.error.message}`);
    }

    console.log('[Resend] Email sent successfully:', result);
  } catch (error: any) {
    console.error('[Resend] Send email error:', error);
    throw error;
  }
};