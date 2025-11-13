# 🔥 Firebase SDK Configuration Guide

## Project Verified ✅

Your project is correctly configured to use:
- **Project ID:** `healthguide-bc3ba`
- **Project Name:** `healthguide`
- **Project Number:** `401590339271`

## Configuration Status

### ✅ CLI Configuration (Complete)
- `.firebaserc` → Points to `healthguide-bc3ba`
- `firebase.json` → Firestore, Storage, and Hosting configured
- Rules deployed successfully

### ⚠️ SDK Configuration (Needs Setup)

You need to add your Firebase Web App SDK credentials to `.env.local`

## How to Get Your SDK Credentials

### Step 1: Go to Firebase Console
Open: https://console.firebase.google.com/project/healthguide-bc3ba/settings/general

### Step 2: Find Your Web App
1. Scroll down to "Your apps" section (as shown in your screenshot)
2. You should see a web app listed
3. Click on the web app or click "Add app" if you haven't created one yet

### Step 3: Get SDK Configuration
You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "healthguide-bc3ba.firebaseapp.com",
  projectId: "healthguide-bc3ba",
  storageBucket: "healthguide-bc3ba.appspot.com",
  messagingSenderId: "401590339271",
  appId: "1:401590339271:web:..."
};
```

### Step 4: Add to .env.local

Open `/Users/cvr/Documents/Project/healthweb/.env.local` and update these values:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...  # Your apiKey
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=healthguide-bc3ba.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=healthguide-bc3ba
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=healthguide-bc3ba.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=401590339271
NEXT_PUBLIC_FIREBASE_APP_ID=1:401590339271:web:...  # Your appId
```

## Known Values (Based on Your Project)

You can already fill in these values:

```bash
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=healthguide-bc3ba.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=healthguide-bc3ba
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=healthguide-bc3ba.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=401590339271
```

## Values You Need from Firebase Console

1. **API Key** (`NEXT_PUBLIC_FIREBASE_API_KEY`)
   - Usually starts with `AIza...`
   - Safe to expose in client-side code (Firebase restricts by domain)

2. **App ID** (`NEXT_PUBLIC_FIREBASE_APP_ID`)
   - Format: `1:401590339271:web:xxxxxxxxxxxx`
   - Unique identifier for your web app

## Verification

After adding the values, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

Then test Firebase connection:
1. Open http://localhost:3001
2. Try to sign up/sign in
3. Check browser console for Firebase errors

## Security Notes

### ✅ Safe to Commit (Already in Repo)
- `.env.local.example` - Template with empty values
- `firebase.json` - Public configuration
- `.firebaserc` - Project name only

### ❌ Never Commit (Gitignored)
- `.env.local` - Contains your actual API keys
- `.env.production.local` - Production secrets

### 🔐 API Key Security
Firebase API keys in `NEXT_PUBLIC_*` variables are safe to expose because:
- They're restricted by domain in Firebase Console
- Firebase Security Rules protect your data
- Rate limiting prevents abuse

However, **never expose** server-side keys like:
- `STRIPE_SECRET_KEY`
- `TWILIO_AUTH_TOKEN`
- `GEMINI_API_KEY`

## Next Steps

1. ✅ Get SDK credentials from Firebase Console
2. ✅ Add them to `.env.local`
3. ✅ Restart dev server
4. ✅ Test authentication
5. ✅ Test Firestore operations

## Troubleshooting

### Error: "Firebase: No Firebase App '[DEFAULT]' has been created"
**Solution:** Check that `.env.local` has all 6 Firebase variables filled

### Error: "Firebase: Error (auth/invalid-api-key)"
**Solution:** Verify `NEXT_PUBLIC_FIREBASE_API_KEY` is correct

### Error: "Missing or insufficient permissions"
**Solution:**
- Make sure you deployed the rules: `firebase deploy --only firestore:rules`
- Check that your user is authenticated
- Verify you're a group admin for GDPR operations

## Firebase Console Quick Links

- **Project Overview:** https://console.firebase.google.com/project/healthguide-bc3ba/overview
- **Authentication:** https://console.firebase.google.com/project/healthguide-bc3ba/authentication/users
- **Firestore Database:** https://console.firebase.google.com/project/healthguide-bc3ba/firestore
- **Storage:** https://console.firebase.google.com/project/healthguide-bc3ba/storage
- **Project Settings (SDK):** https://console.firebase.google.com/project/healthguide-bc3ba/settings/general
