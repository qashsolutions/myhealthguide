# Firebase Database Setup

## 🔥 Database: Cloud Firestore

We're using **Google Cloud Firestore** (NoSQL) for the database.

### Why Firestore?

✅ **Real-time sync** - Perfect for collaborative caregiving
✅ **Scalable** - Handles growth from 1 to millions of users
✅ **Offline support** - Works without internet, syncs later
✅ **Built-in security** - Granular security rules
✅ **No server management** - Fully managed by Google
✅ **Fast queries** - Optimized for mobile/web apps

## 📁 Collections Structure

```
firestore/
├── users/                  # User accounts
├── phone_index/            # Phone number uniqueness (phoneHash -> userId)
├── groups/                 # Care groups (families)
├── elders/                 # Elder profiles
├── medications/            # Medication schedules
├── medication_logs/        # Dose tracking
├── supplements/            # Supplement schedules
├── supplement_logs/        # Supplement tracking
├── diet_entries/           # Meal logs
├── ai_summaries/           # AI-generated summaries
├── activity_logs/          # Audit trail
├── invites/                # Invite codes
├── invite_acceptances/     # Invite usage tracking
├── notification_logs/      # SMS notification history
├── reminder_schedules/     # Scheduled reminders
└── agencies/               # Agency accounts (Phase 7)
```

## 🔒 Security Rules

### Files Created

1. **firestore.rules** - Firestore security rules
2. **firestore.indexes.json** - Database indexes for performance
3. **storage.rules** - Firebase Storage security rules
4. **firebase.json** - Firebase project configuration

### Security Model

**Trial & Subscription Enforcement**

- **14-day trial**: Starts from FIRST USE (not signup)
- **Email OR Phone**: Each user tied to unique email OR phone number
- **Auto-blocking**: Access denied when trial expires without subscription

**Role-Based Access Control (RBAC)**

- **Admin**: Full control over group
- **Member**: View and log care data
- **Permissions**: Granular control per feature

**Key Security Features:**

✅ **Trial enforcement on ALL operations** (except user profile read for billing)
✅ Authentication required for all operations
✅ Users can only access their groups
✅ Phone number uniqueness enforced (via phone_index collection)
✅ Email uniqueness enforced (via Firebase Auth)
✅ Group admins can manage members
✅ Members can only edit their own logs
✅ Audit trails cannot be modified/deleted
✅ Invite codes publicly readable (for validation)
✅ AI summaries created by Cloud Functions only

## 🚀 Deployment Instructions

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase (if not already done)

```bash
firebase init
```

Select:
- ☑ Firestore
- ☑ Hosting
- ☑ Storage

### 4. Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy Storage rules
firebase deploy --only storage

# Deploy everything
firebase deploy
```

### 5. Verify Rules are Active

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Rules** tab
4. You should see the deployed rules
5. Check **Last deployed** timestamp

## 📊 Database Indexes

### What are indexes?

Indexes make queries fast. Without them, complex queries would be slow or fail.

### Indexes Created

1. **medication_logs** - For filtering by group, elder, date, status
2. **supplement_logs** - For filtering by group and elder
3. **diet_entries** - For filtering by group and elder
4. **activity_logs** - For filtering by group and type
5. **notification_logs** - For filtering by group
6. **invites** - For code lookup and group filtering

### Auto-Generated Indexes

Firebase will suggest additional indexes when you run queries. To add them:

1. Run your app
2. Check browser console for index creation links
3. Click the link to auto-create the index
4. Wait 2-5 minutes for index to build

## 🔐 Environment Variables Needed

Add to `.env.local`:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Where to find these values:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon → **Project Settings**
4. Scroll to "Your apps" section
5. Select your web app or create one
6. Copy the config values

## 🧪 Testing Security Rules

### Option 1: Rules Playground (Firebase Console)

1. Firebase Console → Firestore → Rules tab
2. Click "Rules Playground"
3. Test read/write operations
4. Simulate authenticated users

### Option 2: Firebase Emulator

```bash
# Install emulator
firebase init emulators

# Select Firestore and Auth

# Start emulator
firebase emulators:start

# Update .env.local to use emulator
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST=localhost:8080
```

## ⚠️ Common Issues

### Issue 1: "Missing or insufficient permissions"

**Cause:** Security rules deny the operation
**Fix:** Check rules in Firebase Console, ensure user is authenticated and has correct role

### Issue 2: "PERMISSION_DENIED: Missing or insufficient permissions"

**Cause:** Rules not deployed or incorrect
**Fix:**
```bash
firebase deploy --only firestore:rules
```

### Issue 3: "The query requires an index"

**Cause:** Complex query needs an index
**Fix:** Click the link in error message to create index, wait 2-5 minutes

### Issue 4: Rules not updating

**Cause:** Cache or deployment delay
**Fix:**
```bash
# Force deploy
firebase deploy --only firestore:rules --force

# Clear Firebase cache
firebase --clear-cache
```

## 📈 Performance Best Practices

### 1. Use Indexes

All queries with `where()` + `orderBy()` need indexes.

### 2. Limit Query Results

```typescript
// Good
const q = query(collection(db, 'medications'), limit(50));

// Bad (fetches everything)
const q = query(collection(db, 'medications'));
```

### 3. Use Pagination

```typescript
// Use startAfter() for pagination
const next = query(
  collection(db, 'logs'),
  orderBy('createdAt'),
  startAfter(lastDoc),
  limit(20)
);
```

### 4. Denormalize Data

Store commonly accessed data together to reduce reads.

### 5. Batch Operations

```typescript
// Use batches for multiple writes
const batch = writeBatch(db);
batch.set(doc1, data1);
batch.set(doc2, data2);
await batch.commit(); // Single write operation
```

## 💰 Cost Optimization

### Firestore Pricing (as of 2024)

**Free Tier:**
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1 GB storage

**After Free Tier:**
- $0.06 per 100,000 reads
- $0.18 per 100,000 writes
- $0.02 per 100,000 deletes
- $0.18/GB storage

### Tips to Minimize Costs

1. **Cache aggressively** - Use React Query or SWR
2. **Limit queries** - Don't fetch unnecessary data
3. **Use listeners wisely** - Real-time listeners count as reads
4. **Archive old data** - Move to cheaper storage after 90 days
5. **Optimize indexes** - Remove unused indexes

### Estimated Costs

**Single User (1 group, 2 elders, 6 meds):**
- ~500 reads/day (free tier)
- ~50 writes/day (free tier)
- **Cost: $0/month** ✅

**Family Plan (1 group, 2 elders, 4 members):**
- ~2,000 reads/day (free tier)
- ~150 writes/day (free tier)
- **Cost: $0/month** ✅

**Agency (10 groups, 50 elders, 40 members):**
- ~50,000 reads/day (free tier limit)
- ~1,500 writes/day (free tier)
- **Cost: $0-3/month** ✅

Most users will stay in free tier!

## 🔄 Migration Path

If you need to migrate to a different database later:

1. **Export data**: Use Firebase data export
2. **Transform**: Convert Firestore format to target DB
3. **Import**: Load into new database
4. **Update code**: Swap out Firebase SDK
5. **Test**: Verify all operations work

**Recommended alternative if needed:** PostgreSQL with Supabase (similar real-time features)

## 🎯 Trial Period Implementation

### How It Works

**On Signup:**
```typescript
// User created with:
trialStartDate: null  // Not started yet
trialEndDate: null
subscriptionStatus: 'trial'
```

**On First Actual Use:**
```typescript
import { TrialService } from '@/lib/firebase/trial';

// Call this when user first logs in after signup
await TrialService.activateTrialOnFirstUse(userId);

// This sets:
// trialStartDate: now
// trialEndDate: now + 14 days
// subscriptionStatus: 'trial'
```

**Checking Access:**
```typescript
const hasAccess = await TrialService.hasActiveAccess(userId);
// Returns true if:
// - subscriptionStatus === 'active' OR
// - subscriptionStatus === 'trial' AND current date < trialEndDate
```

**Getting Remaining Days:**
```typescript
const daysLeft = await TrialService.getRemainingTrialDays(userId);
// Show in UI: "Trial ends in 7 days"
```

### Phone Number Uniqueness

**During Signup:**
```typescript
import { TrialService } from '@/lib/firebase/trial';
import crypto from 'crypto';

// Hash the phone number
const phoneHash = crypto.createHash('sha256')
  .update(phoneNumber)
  .digest('hex');

// Check if available
const isAvailable = await TrialService.isPhoneNumberAvailable(phoneHash);

if (!isAvailable) {
  throw new Error('Phone number already registered');
}

// Register it
await TrialService.registerPhoneNumber(phoneHash, userId);
```

### Access Denied UI

When trial expires, users can:
- ✅ Read their profile (to access billing)
- ❌ Cannot read groups, elders, medications, logs
- ❌ Cannot create/update any data

Show upgrade prompt:
```typescript
if (!hasAccess) {
  router.push('/dashboard/settings?tab=subscription');
}
```

## 🎯 Summary

✅ **Database**: Cloud Firestore (NoSQL)
✅ **Security**: Role-based rules with trial enforcement
✅ **Trial**: 14 days from FIRST USE (not signup)
✅ **Uniqueness**: Email (Firebase Auth) + Phone (phone_index)
✅ **Indexes**: Optimized for all queries
✅ **Cost**: Free tier covers most usage
✅ **Performance**: Fast, scalable, real-time
✅ **Ready**: Deploy rules and start building!

**Next Steps:**
1. Create Firebase project
2. Add credentials to `.env.local`
3. Deploy rules: `firebase deploy --only firestore:rules`
4. Implement trial activation on first login
5. Test trial expiration flow
6. Start the app: `npm run dev`

🔥 Your database is production-ready with trial enforcement!
