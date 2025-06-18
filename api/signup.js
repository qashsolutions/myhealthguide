import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract form data
    const { firstName, email, zipCode } = req.body;

    // Validate inputs
    if (!firstName || !email || !zipCode) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate first name
    if (firstName.length < 2 || firstName.length > 50) {
      return res.status(400).json({ error: 'First name must be 2-50 characters' });
    }

    if (!/^[a-zA-Z\s]+$/.test(firstName)) {
      return res.status(400).json({ error: 'First name can only contain letters and spaces' });
    }

    // Validate ZIP code
    if (!/^\d{5}$/.test(zipCode)) {
      return res.status(400).json({ error: 'ZIP code must be 5 digits' });
    }

    // Rate limiting check (simple timestamp-based)
    const now = Date.now();
    const lastSubmission = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // In production, use a proper rate limiting solution like Upstash Redis
    // For now, we'll skip complex rate limiting

    // Store signup data (in production, save to database)
    const signupData = {
      firstName,
      email,
      zipCode,
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    };

    // Log signup (in production, save to database)
    console.log('New signup:', signupData);

    // Send confirmation email
    const emailData = {
      from: 'My Guide Health <noreply@my-guide.health>',
      to: [email],
      subject: 'Welcome to My Guide Health - Launch Notification Confirmed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4ecdc4, #44a08d); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to My Guide Health!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">AI-powered elder care made simple</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${firstName},</h2>
            <p style="color: #666; line-height: 1.6;">Thank you for signing up! We'll notify you as soon as My Guide Health launches in your area (${zipCode}).</p>
            
            <h3 style="color: #4a90e2; margin-bottom: 15px;">Our app will help you and your family with:</h3>
            <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
              <li><strong>Voice-powered medication tracking</strong> - Simply speak to add medications using Siri</li>
              <li><strong>AI-powered safety checks</strong> - Claude Sonnet 4 prevents dangerous drug interactions</li>
              <li><strong>Smart caregiver coordination</strong> - Secure family access with privacy controls</li>
              <li><strong>Local doctor network</strong> - Voice-import your doctors and specialists</li>
            </ul>
          </div>
          
          <div style="background: white; border: 2px solid #4ecdc4; border-radius: 10px; padding: 25px; text-align: center;">
            <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
            <p style="color: #666; margin-bottom: 20px;">We're putting the finishing touches on our iOS app. You'll be among the first to know when it's ready!</p>
            <a href="https://my-guide.health" style="background: linear-gradient(135deg, #4ecdc4, #44a08d); color: white; padding: 12px 25px; border-radius: 25px; text-decoration: none; font-weight: bold;">Visit Our Website</a>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 14px;">
              Best regards,<br>
              <strong>The My Guide Health Team</strong>
            </p>
            <p style="color: #ccc; font-size: 12px; margin-top: 20px;">
              If you no longer wish to receive these emails, you can unsubscribe at any time.
            </p>
          </div>
        </div>
      `
    };

    await resend.emails.send(emailData);

    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: 'Signup successful. Check your email for confirmation.' 
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle specific Resend errors
    if (error.message?.includes('API key')) {
      return res.status(500).json({ error: 'Email service configuration error' });
    }
    
    if (error.message?.includes('rate limit')) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}