- review the documents. build prod ready files, do not add To-Dos. do not assume-ask me when in doubt.
- today is Nov 25, 2025.

## CRITICAL: Authentication & Firestore Best Practices

### 1. Firestore Timestamp Conversion (CRITICAL BUG FIXED: Nov 25, 2025)

**Problem:**
Firestore returns date fields as Timestamp objects with structure `{seconds: number, nanoseconds: number}`, NOT as JavaScript Date objects or date strings. Using `new Date(firestoreTimestamp)` directly returns "Invalid Date".

**Example of the bug:**
```typescript
// ❌ WRONG - Returns "Invalid Date"
const trialEndDate = new Date(user.trialEndDate);

// ✅ CORRECT - Properly converts Firestore Timestamp
let trialEndDate: Date | null = null;
if (user.trialEndDate) {
  if (typeof user.trialEndDate === 'object' && 'seconds' in user.trialEndDate) {
    trialEndDate = new Date((user.trialEndDate as any).seconds * 1000);
  } else if (user.trialEndDate instanceof Date) {
    trialEndDate = user.trialEndDate;
  } else {
    trialEndDate = new Date(user.trialEndDate);
  }
}
```

**Files affected:**
- `src/components/auth/ProtectedRoute.tsx` (lines 43-53, 119-129) - FIXED
- Any other file that reads date fields from Firestore (medications, appointments, etc.)

**Impact:**
This bug caused authenticated users with active trials to be incorrectly redirected to the pricing page because trial validation failed.

**Prevention:**
- ALWAYS check if a Firestore field is a Timestamp object before converting to Date
- NEVER assume date fields from Firestore are Date objects
- Use the helper pattern above for ALL date conversions from Firestore

### 2. Environment Variables for Production

**CRITICAL:** Environment variables in `.env.local` only work in local development. For production deployment on Vercel, you MUST add all `NEXT_PUBLIC_*` variables to Vercel's environment variables.

**Required environment variables for production:**
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` - Required for FCM push notifications
- All `NEXT_PUBLIC_FIREBASE_*` config variables
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - Required for App Check

**How to add to Vercel:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add each variable with the same name and value as in `.env.local`
3. Select all environments: Production, Preview, Development
4. Click "Redeploy" after adding variables

**Missing this will cause:**
- "VAPID key not configured" errors in production
- FCM push notifications fail
- reCAPTCHA/App Check failures

### 3. Firestore Security Rules - Session Management

**IMPORTANT:** The session management system writes to TWO collections:
1. `sessions` - User session tracking
2. `sessionEvents` - Event logs for each session

**Both collections need Firestore rules:**
```javascript
// sessions collection
match /sessions/{sessionId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if true; // Anonymous users need to create sessions
  allow update: if request.auth != null;
  allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
}

// sessionEvents collection
match /sessionEvents/{eventId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if true; // Anonymous users need to log events
  allow update: if false; // Immutable audit trail
  allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

**Missing these rules causes:**
- "Missing or insufficient permissions" errors on sign-in
- Session association failures
- Event logging failures

### 4. Before Making Auth/Session Updates

**CHECKLIST - MUST verify before any changes to authentication or session code:**

1. **Check Firestore Timestamp handling:**
   - Are you reading any date fields from Firestore?
   - Are you properly converting Timestamps to Dates?
   - Test with console logs to verify date values

2. **Check Firestore rules:**
   - Do new collections have proper security rules?
   - Are you writing to any new collections?
   - Test rules with Firebase Console

3. **Check environment variables:**
   - Are new env vars added to `.env.local`?
   - Are they added to Vercel environment variables?
   - Do they start with `NEXT_PUBLIC_` if used in client code?

4. **Test authentication flow:**
   - Can users sign up with email?
   - Can users sign up with phone?
   - Can users access dashboard after sign-in?
   - Check browser console for errors
   - Verify trial/subscription validation works

5. **Check session management:**
   - Does session initialize correctly?
   - Does session associate with user after login?
   - Are session events being logged?
   - Check Firestore for session/sessionEvents documents

### 5. Debugging Authentication Issues

**Step-by-step debugging approach:**

1. **Check Firebase Authentication:**
   ```typescript
   const idTokenResult = await firebaseUser.getIdTokenResult();
   console.log('Sign in provider:', idTokenResult.signInProvider);
   console.log('Token claims:', idTokenResult.claims);
   ```

2. **Check Firestore User Document:**
   ```typescript
   const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
   console.log('User document exists:', userDoc.exists());
   console.log('User data:', userDoc.data());
   ```

3. **Check Trial/Subscription Status:**
   ```typescript
   console.log('Subscription status:', user.subscriptionStatus);
   console.log('Trial end date (raw):', user.trialEndDate);
   // Check if it's a Timestamp object
   console.log('Is Timestamp?', typeof user.trialEndDate === 'object' && 'seconds' in user.trialEndDate);
   ```

4. **Check Firestore Rules:**
   - Deploy rules: `firebase deploy --only firestore:rules`
   - Check for compilation errors
   - Test specific rules in Firebase Console

**Common error patterns:**
- "Invalid Date" → Firestore Timestamp conversion issue
- "Missing or insufficient permissions" → Firestore rules missing
- "VAPID key not configured" → Environment variable missing
- "User data is NULL" → Firestore document doesn't exist or can't be read

### 6. Phone Authentication +1 Prefix

**Implementation:** Phone numbers are automatically prefixed with +1 for US numbers.
- UI shows "+1" prefix in a disabled input element
- Input field only accepts 10 digits
- Code automatically prepends "+1" before sending to Firebase
- This simplifies UX and ensures consistency

**Files:**
- `src/app/(auth)/phone-signup/page.tsx` (lines 67-78, 115-117)
- `src/app/(auth)/phone-login/page.tsx`

**Do NOT remove** the +1 prefix logic - it's required for Firebase phone authentication to work correctly for US numbers.
- Today is Nov 28, 2025
- the firebase config will not work in local

### 7. Unified AI & Medical Consent System (IMPLEMENTED: Nov 28, 2025)

**IMPORTANT:** All AI and Medical features now use a SINGLE unified consent system.

**Active Component:**
- `src/components/consent/UnifiedAIConsentDialog.tsx` - The ONLY consent dialog to use
- `src/lib/consent/unifiedConsentManagement.ts` - Consent management library

**DEPRECATED Components (fully commented out - DO NOT USE):**
- `src/components/ai/AIFeaturesConsentDialog.tsx` - DEPRECATED
- `src/components/medical/MedicalDisclaimerConsent.tsx` - DEPRECATED
- `src/components/medgemma/MedGemmaConsentDialog.tsx` - DEPRECATED

**Unified Consent Features:**
- 60-second mandatory reading time (user must wait before checkboxes enable)
- Must scroll to bottom of terms
- 4 required checkboxes:
  1. AI Features understanding
  2. Google MedGemma/HAI-DEF terms
  3. Medical disclaimer acknowledgment
  4. Data processing consent
- 90-day expiry with automatic re-consent requirement
- Model preference selection (MedGemma 27B or 4B)
- Access logging for audit trail

**Firestore Collections:**
- `unifiedAIConsents` - Stores consent records
- `unifiedConsentAccessLogs` - Stores access logs for audit

**Firestore Rules Required:**
```javascript
// Unified AI Consents
match /unifiedAIConsents/{consentId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
  allow update: if request.auth != null && resource.data.userId == request.auth.uid;
  allow delete: if false; // Audit trail - never delete
}

// Consent Access Logs
match /unifiedConsentAccessLogs/{logId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null;
  allow update, delete: if false; // Immutable audit trail
}
```

**Pages Using Unified Consent:**
- Settings > AI Features (`src/components/settings/AIFeaturesSettings.tsx`)
- Health Chat (`src/app/dashboard/health-chat/page.tsx`)
- Drug Interactions (`src/app/dashboard/drug-interactions/page.tsx`)
- Dementia Screening (`src/app/dashboard/dementia-screening/page.tsx`)

**How to Check Consent:**
```typescript
import { verifyAndLogAccess } from '@/lib/consent/unifiedConsentManagement';

const { allowed, consent, reason } = await verifyAndLogAccess(
  userId,
  groupId,
  'health_chat', // feature name
  elderId
);

if (!allowed) {
  // Show UnifiedAIConsentDialog
}
```

### 8. Insights & Compliance System Architecture (CONSOLIDATED: Dec 1, 2025)

**IMPORTANT:** The insights system uses shared utilities to prevent code duplication.

**Shared Compliance Calculation Utility:**
- `src/lib/utils/complianceCalculation.ts` - Single source of truth for compliance calculations

**Available Functions:**
```typescript
import {
  calculateComplianceStats,
  calculateMedicationCompliance,
  calculateSupplementCompliance,
  countTodaysMeals,
  calculateQuickInsightsFromSchedule, // For Activity page (schedule-based)
  calculateQuickInsightsFromLogs,     // For Insights page (log-based)
  getComplianceStatus,
  type QuickInsightsData
} from '@/lib/utils/complianceCalculation';
```

**Shared QuickInsights Component:**
- `src/components/insights/QuickInsightsCard.tsx` - Reusable quick insights display

**Usage:**
```typescript
// Activity page - collapsible mode
<QuickInsightsCard
  insights={insights}
  isOpen={insightsOpen}
  onOpenChange={setInsightsOpen}
  showCollapsible={true}
/>

// Insights page - static mode
<QuickInsightsCard
  insights={quickInsights}
  showCollapsible={false}
/>
```

**Component Hierarchy (No Duplicates):**
| Component | Purpose | Used In |
|-----------|---------|---------|
| `QuickInsightsCard` | Quick stats (meds/supps/meals/status) | Activity, Insights |
| `DailySummaryCard` | AI-generated daily summary | Insights |
| `WeeklySummaryCard` | Weekly summaries with export | Insights |
| `WeeklyTrendsDashboard` | Line charts for trends | Insights |
| `AIInsightsContainer` | Health alerts, refill predictions | Insights |
| `AIInsightCard` | Individual AI insight cards | Insights |

**Type Definitions:**
- Medication uses `frequency.times` (NOT `schedule.times`)
- MedicationLog status: `'scheduled' | 'taken' | 'missed' | 'skipped'` (NO 'late')
- UI 'late' action maps to 'taken' status in database

**Firestore Collections for Insights:**
- `weeklySummaries` - Stored weekly summaries
- `user_notifications` - In-app notifications including weekly_summary type
- `notification_logs` - Notification audit trail

**Do NOT:**
- Create new compliance calculation functions - use shared utility
- Create new QuickInsights-style components - use `QuickInsightsCard`
- Use 'late' as a database status - map to 'taken' instead

### 9. Gemini API Configuration (CONFIRMED: Dec 2, 2025)

**Model:** `gemini-3-pro-preview` with thinking mode

**API Endpoint:**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent
```

**Configuration:**
```typescript
generationConfig: {
  temperature: 0.7,
  maxOutputTokens: 1024,
  thinking_config: {
    include_thoughts: false // Set to true for deep reasoning tasks
  }
}
```

**Environment Variables:**
- `GEMINI_API_KEY` - Primary AI provider (Vercel environment variable)
- `ANTHROPIC_API_KEY` - Claude fallback when Gemini unavailable (Vercel environment variable)

**Files using Gemini 3 Pro Preview:**
- `src/lib/ai/chatService.ts` - Smart Assistant chat
- `src/lib/ai/geminiService.ts` - General AI service
- `src/lib/ai/voiceSearch.ts` - Voice search
- `src/lib/ai/medgemmaService.ts` - Medical AI fallback
- `src/lib/ai/agenticAnalytics.ts` - AI-driven analytics (with Claude fallback)

**DO NOT:**
- Change the model to gemini-1.5-flash or other models without confirming
- Remove thinking_config - it's required for gemini-3-pro-preview
- Expose GEMINI_API_KEY or ANTHROPIC_API_KEY to client-side (must go through API routes)

### 10. Agentic AI Analytics (IMPLEMENTED: Dec 8, 2025)

**Primary:** Gemini 3 Pro Preview with thinking mode
**Fallback:** Claude Opus 4.5 (`claude-opus-4-5-20250514`)

**How Fallback Works:**
```typescript
// In agenticAnalytics.ts - automatic fallback chain:
// 1. Try Gemini API
// 2. If Gemini fails → Try Claude API
// 3. If both fail → Intelligent rule-based fallback
```

**Environment Variables Required:**
```
GEMINI_API_KEY=your-gemini-key
ANTHROPIC_API_KEY=your-anthropic-key  # Optional but recommended
```

**AI Analytics Features (all use Gemini → Claude fallback):**
1. Medication Adherence Prediction - Personalized risk assessment
2. Caregiver Burnout Detection - Trajectory prediction with adaptive thresholds
3. Medication Refill Prediction - Smart supply forecasting
4. Trend Change Detection - Adaptive significance thresholds
5. Alert System Intelligence - Prioritization & grouping
6. Compliance Status - Context-aware status labels

**Files:**
- `src/lib/ai/agenticAnalytics.ts` - Core AI analytics service
- `src/app/api/ai-analytics/route.ts` - API endpoint
- `src/app/api/caregiver-burnout/route.ts` - Uses AI analytics (useAI=true param)

**Usage:**
```typescript
// API call with AI analytics
const response = await authenticatedFetch('/api/ai-analytics', {
  method: 'POST',
  body: JSON.stringify({
    type: 'adherence', // or 'burnout', 'refill', 'trends', 'alerts', 'compliance-status'
    groupId: '...',
    elderId: '...',
    data: { ... }
  })
});
```