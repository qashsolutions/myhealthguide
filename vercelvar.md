# Vercel Environment Variables

This file documents all environment variables configured in Vercel for the MyHealth Guide project.

## Google Cloud / Vertex AI Variables
- `GOOGLE_CLOUD_PROJECT_ID` - Added 3d ago
- `GOOGLE_CLOUD_PROJECT_NUMBER` - Added 3d ago
- `GOOGLE_APPLICATION_CREDENTIALS` - Added 3d ago

## Firebase Configuration
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Added Jun 19
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Added Jun 19
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Added Jun 19
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Added Jun 19
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Added Jun 19
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Added Jun 19

## Email Service
- `RESEND_API_KEY` - Added Jun 18

## Additional Variables Needed (from .env.example)
These should be added if not already present:
- `NEXT_PUBLIC_APP_URL` - The production URL (https://www.myguide.health)
- `JWT_SECRET` - For session management
- `FIREBASE_ADMIN_PROJECT_ID` - For server-side Firebase operations
- `FIREBASE_ADMIN_CLIENT_EMAIL` - For server-side Firebase operations
- `FIREBASE_ADMIN_PRIVATE_KEY` - For server-side Firebase operations

## Notes
- All variables are configured for "All Environments"
- RESEND_API_KEY is properly configured (added Jun 18)
- Email functionality was previously working with signup confirmations and OTP