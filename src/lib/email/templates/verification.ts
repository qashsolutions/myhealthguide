import { APP_NAME, APP_URL, DISCLAIMERS } from '@/lib/constants';

/**
 * Email template for account verification
 * Eldercare-optimized with large fonts and clear CTAs
 */
export const getVerificationEmailHtml = (
  name: string, 
  verificationUrl: string,
  isResend = false
): string => {
  const subject = isResend 
    ? `Verify your ${APP_NAME} account (Resent)`
    : `Welcome to ${APP_NAME} - Verify your email`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
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
      font-size: 20px;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #2563eb;
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
    .footer a:hover {
      text-decoration: underline;
    }
    h1 { 
      font-size: 32px; 
      margin: 0;
      font-weight: bold;
    }
    h2 { 
      font-size: 26px; 
      color: #1a202c;
      margin-bottom: 20px;
    }
    p { 
      margin: 16px 0;
      font-size: 18px;
      line-height: 1.7;
    }
    .icon {
      display: inline-block;
      vertical-align: middle;
      width: 20px;
      height: 20px;
    }
    .url-box {
      background-color: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      word-break: break-all;
      font-family: monospace;
      font-size: 14px;
      color: #2563eb;
    }
    .features {
      background-color: #f7fafc;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
    }
    .feature-item {
      display: flex;
      align-items: start;
      margin-bottom: 16px;
    }
    .feature-icon {
      color: #059669;
      margin-right: 12px;
      flex-shrink: 0;
    }
    @media only screen and (max-width: 600px) {
      .container {
        padding: 20px 10px;
      }
      .content {
        padding: 30px 20px;
      }
      h1 {
        font-size: 28px;
      }
      h2 {
        font-size: 22px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p style="margin: 10px 0; opacity: 0.9; font-size: 18px;">
        AI-powered medication safety for seniors
      </p>
    </div>
    
    <div class="content">
      <h2>Hello ${name},</h2>
      
      <p>
        ${isResend 
          ? 'You requested a new verification link for your account.'
          : `Welcome to ${APP_NAME}! We're excited to help you manage your medications safely.`
        }
      </p>
      
      <p>
        To complete your registration and access all features, please verify your email address:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" class="button">
          Verify Email Address
        </a>
      </div>
      
      <p><strong>This link will expire in 24 hours for your security.</strong></p>
      
      ${!isResend ? `
      <div class="features">
        <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 20px;">
          What you'll get access to:
        </h3>
        <div class="feature-item">
          <svg xmlns="http://www.w3.org/2000/svg" class="feature-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong>AI Medication Checks:</strong> Instant analysis for drug interactions
          </div>
        </div>
        <div class="feature-item">
          <svg xmlns="http://www.w3.org/2000/svg" class="feature-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <div>
            <strong>Voice Input:</strong> Speak your medications instead of typing
          </div>
        </div>
        <div class="feature-item">
          <svg xmlns="http://www.w3.org/2000/svg" class="feature-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <strong>Secure Storage:</strong> Your health data is protected and private
          </div>
        </div>
      </div>
      ` : ''}
      
      <p style="color: #4a5568; font-size: 16px;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <div class="url-box">
        ${verificationUrl}
      </div>
      
      <div class="disclaimer">
        <strong style="display: flex; align-items: center; gap: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="#3182ce">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Important:
        </strong>
        ${DISCLAIMERS.GENERAL}
      </div>
      
      <p style="color: #4a5568; font-size: 16px; margin-top: 30px;">
        If you didn't create an account with ${APP_NAME}, please ignore this email.
      </p>
    </div>
    
    <div class="footer">
      <p>© 2025 <a href="${APP_URL}">${APP_URL}</a> - A unit of QaSH Solutions Inc.<br>
      D-U-N-S® Number: 119536275</p>
      
      <p>
        <a href="${APP_URL}/privacy">Privacy Policy</a> • 
        <a href="${APP_URL}/medical-disclaimer">Medical Disclaimer</a> • 
        <a href="${APP_URL}/account/delete">Unsubscribe</a>
      </p>
      
      <p style="color: #718096; margin-top: 20px;">
        Made with care for seniors managing their health
      </p>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Get plain text version of the email for accessibility
 */
export const getVerificationEmailText = (
  name: string,
  verificationUrl: string,
  isResend = false
): string => {
  return `
Hello ${name},

${isResend 
  ? 'You requested a new verification link for your account.'
  : `Welcome to ${APP_NAME}! We're excited to help you manage your medications safely.`
}

To complete your registration and access all features, please verify your email address by visiting:

${verificationUrl}

This link will expire in 24 hours for your security.

${!isResend ? `
What you'll get access to:
- AI Medication Checks: Instant analysis for drug interactions
- Voice Input: Speak your medications instead of typing  
- Secure Storage: Your health data is protected and private
` : ''}

Important: ${DISCLAIMERS.GENERAL}

If you didn't create an account with ${APP_NAME}, please ignore this email.

---
© 2025 ${APP_URL} - A unit of QaSH Solutions Inc.
D-U-N-S® Number: 119536275

Privacy Policy: ${APP_URL}/privacy
Medical Disclaimer: ${APP_URL}/medical-disclaimer
Unsubscribe: ${APP_URL}/account/delete

Made with care for seniors managing their health
`;
};