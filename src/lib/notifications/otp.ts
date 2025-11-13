/**
 * Send OTP via email
 */
export async function sendEmailOTP(email: string, otp: string): Promise<void> {
  // Implement email sending logic with SendGrid or AWS SES
  // For development, log to console
  console.log(`[DEV] Email OTP for ${email}: ${otp}`);

  // Production implementation example with SendGrid:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  await sgMail.send({
    to: email,
    from: process.env.FROM_EMAIL!,
    subject: 'Your myguide.health Verification Code',
    text: `Your verification code is: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Verification Code</h2>
        <p>Enter this code to verify your account:</p>
        <div style="background: #f0f0f0; padding: 20px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px;">
          ${otp}
        </div>
        <p style="color: #666; margin-top: 20px;">This code will expire in 10 minutes.</p>
        <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
      </div>
    `
  });
  */
}

/**
 * Send OTP via SMS using Twilio
 */
export async function sendSMSOTP(phoneNumber: string, otp: string): Promise<void> {
  // For development, log to console
  console.log(`[DEV] SMS OTP for ${phoneNumber}: ${otp}`);

  // Production implementation with Twilio:
  /*
  const twilio = require('twilio');
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  await client.messages.create({
    body: `Your myguide.health verification code is: ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  });
  */
}
