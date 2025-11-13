# 🚨 URGENT: API Key Exposed in Git History

## ⚠️ CRITICAL SECURITY ISSUE DETECTED

**Date:** November 13, 2024
**Severity:** HIGH
**Status:** REQUIRES IMMEDIATE ACTION

---

## Problem Identified

Your **Firebase API key** was accidentally committed to Git history in a source code file (appears to be a Firebase configuration file with hardcoded credentials).

### Evidence
```
File: (appears to be a config file - based on imports)
Commit: In git history
API Key: AIzaSyDT-wnOiaMtzb72nXfT-QvuoKpEHis9C0k
```

The API key appears in git history with this context:
```javascript
// Your new Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDT-wnOiaMtzb72nXfT-QvuoKpEHis9C0k",
  authDomain: "healthguide-bc3ba.firebaseapp.com",
  projectId: "healthguide-bc3ba",
  ...
```

## ⚠️ Current Risk Level

### MODERATE RISK (Mitigated by Firebase Security)

**Why it's a concern:**
- API key is visible in git history
- If repository is pushed to GitHub/GitLab, key could be scraped by bots
- Potential for unauthorized API calls

**Why it's not catastrophic:**
- Firebase client API keys are designed to be public
- Your Firestore Security Rules protect the data
- API key can only be used from authorized domains
- You can restrict the key and rotate it

**BUT:** It's still best practice to keep API keys out of source code!

---

## ✅ IMMEDIATE ACTION PLAN

### Step 1: Check Repository Status (NOW)

```bash
# Check if you've pushed to a remote repository
git remote -v
```

**If you see a remote (GitHub, GitLab, etc.):**
- ⚠️ **CRITICAL**: The key may be public - proceed to Step 2 immediately
- If remote exists, assume the key has been exposed

**If you see "No remote" or empty:**
- 🟡 **MODERATE**: Key is only in local git history - safer but still fix it

### Step 2: Restrict the Firebase API Key (IMMEDIATELY)

Do this RIGHT NOW before continuing:

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/apis/credentials?project=healthguide-bc3ba

2. **Find your API key:**
   - Look for key starting with `AIzaSyDT-wnOiaMtzb72nXfT`
   - Click on it to edit

3. **Restrict the API key:**
   - **Application restrictions:**
     - Select "HTTP referrers (web sites)"
     - Add these referrers:
       ```
       http://localhost:3001/*
       http://localhost:3000/*
       https://yourproductiondomain.com/*
       ```
   - **API restrictions:**
     - Select "Restrict key"
     - Enable only:
       - Firebase Authentication API
       - Cloud Firestore API
       - Firebase Storage API
   - Click **SAVE**

4. **Verify restrictions applied:**
   - Test your app at http://localhost:3001
   - Try to sign in - should still work
   - If it works, restrictions are applied correctly

### Step 3: Rotate the API Key (Recommended)

**After restricting, consider rotating for extra security:**

1. **Create a new Web App in Firebase:**
   - Go to: https://console.firebase.google.com/project/healthguide-bc3ba/settings/general
   - Scroll to "Your apps"
   - Click "Add app" → Select Web (</>)
   - Register app with nickname: "healthguide-web-v2"
   - Copy the NEW API key

2. **Update your .env.local:**
   ```bash
   # Replace with NEW API key from step above
   NEXT_PUBLIC_FIREBASE_API_KEY=NEW_KEY_HERE
   ```

3. **Test the new key:**
   ```bash
   npm run dev
   # Test sign in/sign up
   ```

4. **Delete the old API key:**
   - Go to Google Cloud Console
   - Delete the old key (`AIzaSyDT-wnOiaMtzb72nXfT...`)

### Step 4: Clean Git History

**Option A: If Repository is ONLY Local (Recommended)**

Since you haven't pushed to remote yet, simply:

```bash
# Find the file with hardcoded credentials
find src -name "*.ts" -o -name "*.js" | xargs grep -l "AIzaSyDT" 2>/dev/null

# Once you find it, edit the file to remove hardcoded credentials
# Make sure it uses environment variables instead:
# const firebaseConfig = {
#   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
#   ...
# }
```

**Then commit the fix:**
```bash
git add <the-file-you-fixed>
git commit -m "security: remove hardcoded Firebase API key, use env vars"
```

**Option B: If Already Pushed to GitHub/GitLab (CRITICAL)**

You MUST remove the key from ALL git history:

```bash
# Install git-filter-repo (if not already installed)
# On Mac:
brew install git-filter-repo

# Find the exact file path
git log -p --all -S "AIzaSyDT-wnOiaMtzb72nXfT" | grep "diff --git"

# Remove the file from entire history (replace PATH with actual file)
git filter-repo --invert-paths --path PATH_TO_FILE

# Or remove just the sensitive line from all commits:
git filter-repo --replace-text <(echo "AIzaSyDT-wnOiaMtzb72nXfT-QvuoKpEHis9C0k==>REDACTED_API_KEY")

# Force push to remote
git push origin --force --all
git push origin --force --tags
```

⚠️ **WARNING:** `git filter-repo` rewrites history. All collaborators must re-clone the repository!

### Step 5: Update Your Code

**Find and fix any hardcoded credentials:**

```bash
# Search for hardcoded API keys
grep -r "AIzaSy" src/ --include="*.ts" --include="*.js"

# If found, replace with environment variable usage:
# OLD: apiKey: "AIzaSy...",
# NEW: apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
```

**Verify your config file uses environment variables:**

Check `src/lib/firebase/config.ts` - it should look like:
```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
```

---

## Prevention Checklist

After fixing the immediate issue:

- [ ] Verify NO hardcoded credentials in src/ directory
- [ ] Confirm all config uses `process.env.VARIABLE_NAME`
- [ ] Check `.env.local` is in `.gitignore`
- [ ] Run: `git ls-files | grep "\.env"` → Should return NOTHING
- [ ] Set up pre-commit hook to detect secrets
- [ ] Enable GitHub secret scanning (if using GitHub)
- [ ] Add team policy: Never commit credentials

---

## Long-term Security Measures

### 1. Set up Git Hooks

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Prevent committing files with API keys

if git diff --cached --name-only | grep -E "\.env|\.key|\.pem"; then
    echo "❌ ERROR: Attempting to commit sensitive files!"
    exit 1
fi

if git diff --cached -G "AIzaSy[a-zA-Z0-9_-]{33}"; then
    echo "❌ ERROR: Possible API key detected in commit!"
    exit 1
fi
```

### 2. Use Environment-Specific Configs

```bash
# Development
.env.local (gitignored)

# Production
Use Vercel environment variables (encrypted)

# Staging
.env.staging.local (gitignored)
```

### 3. Monitor for Exposed Secrets

- Enable GitHub Advanced Security (if using GitHub)
- Use tools like:
  - `gitleaks` - scan for secrets in git history
  - `trufflehog` - find secrets in code
  - `git-secrets` - prevent committing secrets

---

## Current Status

### ✅ What's Already Secure
- `.env.local` is gitignored ✅
- New code uses environment variables ✅
- Firestore Security Rules protect data ✅
- Storage Rules protect file uploads ✅

### ⚠️ What Needs Fixing
- [ ] Restrict Firebase API key (Step 2 above)
- [ ] Find and fix hardcoded credentials in source
- [ ] Verify no remote repository exposure
- [ ] (Optional) Rotate API key for extra safety
- [ ] Clean git history if needed

---

## FAQ

### Q: Is my data compromised?
**A:** No. Firebase Security Rules protect your Firestore data. The API key alone cannot access your data without passing the security rules.

### Q: Can someone access my Firebase project?
**A:** Limited risk. An exposed API key can:
- Make authentication requests (rate-limited by Firebase)
- Attempt Firestore operations (blocked by security rules)
- Try Storage operations (blocked by storage rules)

An exposed API key CANNOT:
- Access your Firestore data (blocked by rules)
- Access Storage files (blocked by rules)
- Change Firebase project settings
- See other users' data (blocked by rules)
- Delete data without authentication (blocked by rules)

### Q: Should I regenerate the key?
**A:**
- If NOT pushed to remote: Restrict the key + clean local git history = GOOD
- If pushed to public GitHub: Rotate the key ASAP = RECOMMENDED
- If paranoid or this is production: Always rotate = SAFEST

### Q: How long does key rotation take?
**A:**
- Create new key: 2 minutes
- Update .env.local: 30 seconds
- Test: 5 minutes
- Delete old key: 1 minute
- **Total: ~10 minutes**

---

## Verification

After completing the steps above, verify security:

```bash
# 1. Check no credentials in tracked files
git ls-files | xargs grep -l "AIzaSy" 2>/dev/null
# Should return: Nothing

# 2. Check .env.local is ignored
git check-ignore .env.local
# Should return: .gitignore:26:.env*.local	.env.local

# 3. Check API key is restricted
# Go to: https://console.cloud.google.com/apis/credentials?project=healthguide-bc3ba
# Verify restrictions are applied

# 4. Test app still works
npm run dev
# Sign in should work
```

---

## Summary

| Action | Priority | Time | Status |
|--------|----------|------|--------|
| Restrict API key | 🔴 CRITICAL | 5 min | ⏳ TODO |
| Find hardcoded credentials | 🔴 HIGH | 10 min | ⏳ TODO |
| Fix source code | 🔴 HIGH | 15 min | ⏳ TODO |
| Check if pushed to remote | 🟡 MEDIUM | 1 min | ⏳ TODO |
| Rotate API key | 🟡 MEDIUM | 10 min | 📋 OPTIONAL |
| Clean git history | 🟢 LOW | 20 min | 📋 IF NEEDED |

**Total time to secure:** 30-60 minutes

---

## Need Help?

If you're unsure about any step:

1. **FIRST:** Complete Step 2 (Restrict API key) - this is the most important
2. **THEN:** We can help with the rest

The API key restriction protects you while you work on the other steps.

---

**Created:** November 13, 2024
**Updated:** November 13, 2024
**Next Review:** After completing all action items
