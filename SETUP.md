# Setup Instructions for myguide.health

## Initial Setup

### 1. Install Node.js Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Go to https://console.firebase.google.com
2. Create a new project (or use existing)
3. Enable these services:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage

4. Get your Firebase config:
   - Project Settings → General → Your apps → Web app
   - Copy the configuration values

5. Add to `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

### 3. Set Up Firestore Security Rules

In Firebase Console → Firestore Database → Rules, add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Elders collection
    match /elders/{elderId} {
      allow read, write: if request.auth != null;
    }
    
    // Medications collection
    match /medications/{medicationId} {
      allow read, write: if request.auth != null;
    }
    
    // Medication logs
    match /medication_logs/{logId} {
      allow read, write: if request.auth != null;
    }
    
    // Supplements
    match /supplements/{supplementId} {
      allow read, write: if request.auth != null;
    }
    
    // Supplement logs
    match /supplement_logs/{logId} {
      allow read, write: if request.auth != null;
    }
    
    // Diet entries
    match /diet_entries/{entryId} {
      allow read, write: if request.auth != null;
    }
    
    // Groups
    match /groups/{groupId} {
      allow read, write: if request.auth != null;
    }
    
    // Agencies
    match /agencies/{agencyId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Configure Stripe (Optional - for payments)

1. Go to https://stripe.com and create account
2. Get API keys from Dashboard → Developers → API keys
3. Add to `.env.local`:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### 5. Configure Twilio (Optional - for SMS)

1. Go to https://twilio.com and create account
2. Get credentials from Console
3. Purchase a phone number
4. Add to `.env.local`:
```
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### 6. Configure Cloudflare Turnstile (Optional - for bot protection)

1. Go to https://dash.cloudflare.com → Turnstile
2. Create a new site
3. Add to `.env.local`:
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=xxx
TURNSTILE_SECRET_KEY=xxx
```

### 7. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Testing the Application

1. **Public Site**: Visit http://localhost:3000
   - Should see landing page with header/footer
   - Navigate to Features, Pricing, About, etc.

2. **Authentication**: Click "Sign Up"
   - Form should appear (auth will work once Firebase is configured)

3. **Dashboard**: After login (or visit /dashboard directly)
   - Should see sidebar navigation
   - Elders, Medications, Supplements, Diet pages

## Production Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

## Troubleshooting

### "Firebase not initialized" error
- Make sure all Firebase environment variables are set in `.env.local`
- Restart dev server after adding variables

### Build errors
- Run `npm run type-check` to find TypeScript errors
- Run `npm run lint` to find code quality issues

### Styling issues
- Make sure Tailwind CSS is configured properly
- Check `tailwind.config.js` and `globals.css`

## Next Development Steps

1. Connect authentication forms to Firebase
2. Implement actual CRUD operations for elders, medications, etc.
3. Add form validation
4. Implement voice input (Phase 3)
5. Add AI integration with Gemini (Phase 4)
6. Add SMS notifications (Phase 5)
7. Implement groups and collaboration (Phase 6)
8. Add agency features (Phase 7)
9. Integrate Stripe payments (Phase 8)

Refer to the documentation files for detailed implementation guides.
