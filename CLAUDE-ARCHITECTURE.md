# MyHealthGuide - Technical Architecture

This document contains technical systems documentation for AI, Authentication, Firestore, Navigation, and Testing.

---

## 1. Firestore Timestamp Conversion (CRITICAL)

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
- `src/lib/ai/shiftHandoffGeneration.ts` - FIXED Jan 9, 2026
- `src/components/shift-handoff/SOAPNoteDisplay.tsx` - FIXED Jan 9, 2026
- Any other file that reads date fields from Firestore

**Prevention:**
- ALWAYS check if a Firestore field is a Timestamp object before converting to Date
- NEVER assume date fields from Firestore are Date objects
- Use the helper pattern above for ALL date conversions from Firestore

---

## 2. Environment Variables for Production

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

### Stripe Pricing Configuration

**Current Pricing (Updated Jan 27, 2026):**
| Plan | Price | Stripe Price ID Env Var |
|------|-------|------------------------|
| Family Plan A | $8.99/elder/month | `STRIPE_FAMILY_PRICE_ID` |
| Family Plan B | $10.99/month | `STRIPE_SINGLE_AGENCY_PRICE_ID` |
| Multi Agency | $16.99/elder/month | `STRIPE_MULTI_AGENCY_PRICE_ID` |

**Source of Truth:**
- Display pricing: `src/lib/subscription/subscriptionService.ts` (PLAN_CONFIG)
- Stripe charges: Determined by the price ID in environment variables

**Trial Periods:**
- All plans: 15 days (TRIAL_DURATION_DAYS / MULTI_AGENCY_TRIAL_DAYS)

---

## 3. Firestore Security Rules - Session Management

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

---

## 4. Before Making Auth/Session Updates

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

---

## 5. Debugging Authentication Issues

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

---

## 6. Phone Authentication +1 Prefix

**Implementation:** Phone numbers are automatically prefixed with +1 for US numbers.
- UI shows "+1" prefix in a disabled input element
- Input field only accepts 10 digits
- Code automatically prepends "+1" before sending to Firebase
- This simplifies UX and ensures consistency

**Files:**
- `src/app/(auth)/phone-signup/page.tsx` (lines 67-78, 115-117)
- `src/app/(auth)/phone-login/page.tsx`

**Do NOT remove** the +1 prefix logic - it's required for Firebase phone authentication to work correctly for US numbers.

---

## 7. Unified AI & Medical Consent System

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
  2. Google AI terms (Vertex AI / Gemini)
  3. Medical disclaimer acknowledgment
  4. Data processing consent
- 90-day expiry with automatic re-consent requirement
- Model preference selection (Accurate or Fast mode)
- Access logging for audit trail

**Firestore Collections:**
- `unifiedAIConsents` - Stores consent records
- `unifiedConsentAccessLogs` - Stores access logs for audit

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

---

## 8. Insights & Compliance System Architecture

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

**Type Definitions:**
- Medication uses `frequency.times` (NOT `schedule.times`)
- MedicationLog status: `'scheduled' | 'taken' | 'missed' | 'skipped'` (NO 'late')
- UI 'late' action maps to 'taken' status in database

**DO NOT:**
- Create new compliance calculation functions - use shared utility
- Create new QuickInsights-style components - use `QuickInsightsCard`
- Use 'late' as a database status - map to 'taken' instead

---

## 9. Gemini API Configuration

**Model:** `gemini-3-pro-preview` with thinking mode

**CRITICAL - Google Model Retirement Notice (Jan 2026):**
| Model | Retirement Date | Status |
|-------|-----------------|--------|
| gemini-2.5-flash-preview-09-2025 | Jan 15, 2026 | ⚠️ Retired |
| gemini-2.0-flash | Mar 3, 2026 | Migrated ✅ |
| gemini-2.0-flash-lite | Mar 3, 2026 | N/A |
| gemini-1.5-pro | Older | Migrated ✅ |

**All files now use `gemini-3-pro-preview`** - migration completed Jan 3, 2026.

**API Endpoint (Direct Gemini API):**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent
```

**Configuration for Direct Gemini API:**
```typescript
generationConfig: {
  temperature: 0.7,
  maxOutputTokens: 1024,
  thinkingConfig: {
    thinkingLevel: 'medium'  // 'low' | 'medium' | 'high'
  }
}
```

**Configuration for Vertex AI SDK (@google-cloud/vertexai):**
```typescript
// Gemini 3 uses thinkingConfig at model level (NOT inside generationConfig)
const model = vertex.preview.getGenerativeModel({
  model: 'gemini-3-pro-preview',
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 8192,
  },
  // @ts-ignore - thinkingConfig is valid for Gemini 3
  thinkingConfig: {
    thinkingLevel: 'medium'  // 'low' | 'medium' | 'high'
  },
});
```

**Thinking Levels:**
- `low` - Fast, minimal reasoning
- `medium` - Balanced (recommended for most tasks)
- `high` - Deep reasoning for complex medical/analytical queries

**Environment Variables:**
- `GEMINI_API_KEY` - Primary AI provider for direct Gemini API (Vercel environment variable)
- `ANTHROPIC_API_KEY` - Claude fallback when Gemini unavailable (Vercel environment variable)
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` - Service account JSON for Vertex AI SDK
- `GOOGLE_CLOUD_PROJECT_ID` - GCP project ID for Vertex AI

**Files using Gemini 3 Pro Preview (ALL files migrated):**
- `src/lib/ai/chatService.ts` - Smart Assistant chat (Direct API)
- `src/lib/ai/geminiService.ts` - General AI service (Direct API)
- `src/lib/ai/voiceSearch.ts` - Voice search (Direct API)
- `src/lib/ai/medicalAIService.ts` - Medical AI queries (Vertex AI SDK)
- `src/lib/ai/agenticAnalytics.ts` - AI-driven analytics (Direct API with Claude fallback)
- `src/lib/ai/soapNoteGenerator.ts` - SOAP note generation (Direct API)
- `src/lib/ai/elderHealthInsights.ts` - Health insights (Direct API)
- `src/lib/ai/documentAnalysis.ts` - Document analysis (Vertex AI SDK)
- `src/lib/ai/nutritionScoring.ts` - Nutrition analysis (Direct API)
- `src/lib/ai/noteProcessingService.ts` - Note processing (Direct API)
- `src/lib/medical/dementiaAssessment/` - Dementia assessment (Direct API)

**DEPRECATED Models (DO NOT USE):**
- `medlm-large` - Deprecated September 29, 2025
- `gemini-2.0-flash` - Retired March 3, 2026
- `gemini-2.0-flash-lite` - Retired March 3, 2026
- `gemini-1.5-pro` - Superseded by Gemini 3
- `gemini-2.5-flash-preview-09-2025` - Retired January 15, 2026

**DO NOT:**
- Use any deprecated models listed above
- Mix thinkingConfig placement (Direct API: inside generationConfig, Vertex AI: at model level)
- Expose GEMINI_API_KEY or ANTHROPIC_API_KEY to client-side (must go through API routes)
- Forget to add `// @ts-ignore` before thinkingConfig in Vertex AI SDK calls

---

## 10. Agentic AI Analytics

**Primary:** Gemini 3 Pro Preview with thinking mode
**Fallback:** Claude Opus 4.5 (`claude-opus-4-5-20251101`)

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

### 10b. AI Router Service

**IMPORTANT:** Central AI routing service for standardized Gemini/Claude integration.

**Architecture:**
```
User Request → AI Router → Classification → Provider Selection → Response
                              ↓
              ┌─────────────────────────────────────┐
              │ Simple queries → Gemini (primary)   │
              │ Complex queries → Gemini + thinking │
              │ Gemini fails → Fallback to Claude   │
              │ Both fail → Graceful error          │
              └─────────────────────────────────────┘
```

**Files:**
- `src/lib/ai/aiConfig.ts` - Central AI configuration
- `src/lib/ai/aiRouter.ts` - Router service with classification
- `src/app/api/ai-router/route.ts` - API endpoint

**Configuration (aiConfig.ts):**
- Models: `gemini-3-pro-preview` (primary), `claude-opus-4-5-20251101` (fallback)
- Timeouts: 15s (simple), 30s (complex), 60s (extended)
- Retry: 2 attempts with exponential backoff
- Quality validation: min response length, error pattern detection

**Convenience Functions:**
```typescript
import { chat, medicationQuery, checkDrugInteraction, analyzeSymptoms, getCareRecommendation, search, testProviders } from '@/lib/ai/aiRouter';

// Simple chat
await chat('What is diabetes?');

// Drug interactions (always complex)
await checkDrugInteraction(['warfarin', 'aspirin', 'ibuprofen']);

// Test provider connectivity
const status = await testProviders();
```

---

## 11. Hybrid Dementia Q&A Assessment

**IMPORTANT:** This is a caregiver-administered cognitive screening tool, NOT a diagnostic tool.

**Architecture:** Hybrid approach combining:
1. **Baseline**: 13 MoCA-adapted structured questions across 6 cognitive domains
2. **AI Layer**: Adaptive branching - Gemini/Claude generates follow-up questions for concerning answers
3. **Integration**: Tabbed UI with existing behavioral pattern detection

**Cognitive Domains (6 total, 13 questions):**
| Domain | Questions | Focus |
|--------|-----------|-------|
| Memory | 3 | Short-term recall, repetition, recognition |
| Orientation | 2 | Time awareness, place awareness |
| Attention | 2 | Following conversations, distractibility |
| Language | 2 | Word-finding, following instructions |
| Executive | 2 | Judgment, planning/sequencing |
| Mood/Behavior | 2 | Depression/withdrawal, anxiety/agitation |

**Files Structure:**
```
src/types/dementiaAssessment.ts           # TypeScript interfaces
src/lib/medical/dementiaAssessment/
├── index.ts                              # Module exports
├── questionBank.ts                       # 13 MoCA-adapted baseline questions
├── sessionManager.ts                     # Session CRUD operations
├── scoringEngine.ts                      # Domain scores & risk calculation
├── adaptiveBranching.ts                  # AI follow-up question generation
└── resultGenerator.ts                    # AI summary & recommendations
```

**Risk Level Calculation:**
- **Urgent**: Memory AND orientation both concerning
- **Concerning**: 2+ concerning domains OR any priority domain concerning
- **Moderate**: 1 concerning domain OR 2+ moderate domains
- **Low**: No significant concerns

**Professional Disclaimers (REQUIRED):**
Every results page MUST include:
1. "This is NOT a medical diagnosis"
2. "Only a qualified healthcare professional can diagnose cognitive conditions"
3. "Use this information to discuss concerns with a doctor"

**DO NOT:**
- Remove or modify professional disclaimers
- Allow results to be deleted (audit trail)
- Diagnose or use definitive language ("has dementia")
- Skip consent verification before assessment

---

## 12. Navigation Structure

**IMPORTANT:** The navigation has been completely restructured for simplified UX.

### Header Changes
- **Elder Dropdown** moved to header (was in sidebar)
- Component: `src/components/dashboard/ElderDropdown.tsx`
- Shows avatar with gradient + elder name + chevron
- Dropdown includes: elder list, "Add New Elder", "Manage All Elders"

### Sidebar Structure (Simplified)
```
- Overview

[LOVED ONE'S CARE] (green dot indicator)
- Health Profile
- Daily Care

[SMART INSIGHTS]
- Ask AI (New badge)
- Safety Alerts
- Analytics

[PERSONAL]
- My Notes

[AGENCY] (multi_agency tier only)
- Care Management
- Agency Management

[FOOTER]
- Settings
```

### New Merged Pages

| Page | Path | Combines |
|------|------|----------|
| Daily Care | `/dashboard/daily-care` | Medications, Supplements, Diet, Activity (tabs) |
| Safety Alerts | `/dashboard/safety-alerts` | Drug Interactions, Incidents, Conflicts, Screening (tabs) |
| Analytics | `/dashboard/analytics` | Adherence, Nutrition, Health Trends (tabs) |
| Ask AI | `/dashboard/ask-ai` | Health Chat, Clinical Notes, Reports (tabs) |
| Care Management | `/dashboard/care-management` | Agency features hub |

**Tab State:** Uses URL query params (e.g., `?tab=medications`)

### Route Redirects (in next.config.js)

```javascript
// Daily Care
/dashboard/medications → /dashboard/daily-care?tab=medications
/dashboard/supplements → /dashboard/daily-care?tab=supplements
/dashboard/diet → /dashboard/daily-care?tab=diet
/dashboard/activity → /dashboard/daily-care?tab=activity

// Safety Alerts
/dashboard/drug-interactions → /dashboard/safety-alerts?tab=interactions
/dashboard/incidents → /dashboard/safety-alerts?tab=incidents
/dashboard/schedule-conflicts → /dashboard/safety-alerts?tab=conflicts
/dashboard/dementia-screening → /dashboard/safety-alerts?tab=screening

// Analytics
/dashboard/medication-adherence → /dashboard/analytics?tab=adherence
/dashboard/nutrition-analysis → /dashboard/analytics?tab=nutrition
/dashboard/insights → /dashboard/analytics?tab=trends

// Ask AI
/dashboard/medgemma → /dashboard/ask-ai?tab=chat
/dashboard/health-chat → /dashboard/ask-ai?tab=chat
/dashboard/clinical-notes → /dashboard/ask-ai?tab=clinical-notes
/dashboard/reports → /dashboard/ask-ai?tab=reports
```

**DO NOT:**
- Add back collapsible navigation sections
- Move elder selector back to sidebar
- Create separate pages for merged features (use tabs instead)
- Use `permanent: true` for redirects (allows easy rollback)

---

## 13. Smart Learning System

**IMPORTANT:** The app learns and improves based on user feedback and engagement patterns.

**NAMING CONVENTION:** Use "Smart" instead of "AI" in all user-facing text.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA COLLECTION LAYER                     │
├─────────────────────────────────────────────────────────────┤
│  Feature Engagement        │  Smart Quality Metrics         │
│  - Page visits             │  - Response timestamps         │
│  - Time on page            │  - Follow-up detection         │
│  - Action completion       │  - Action completions          │
│  - Abandonment detection   │  - Session continuation        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PREFERENCE LEARNING                       │
├─────────────────────────────────────────────────────────────┤
│  - Analyzes feedback patterns (thumbs up/down)              │
│  - Detects terminology preferences                          │
│  - Identifies focus areas from engagement                   │
│  - Calculates confidence scores (only applies if > 0.6)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PERSONALIZED SMART PROMPTS                │
├─────────────────────────────────────────────────────────────┤
│  - Verbosity: concise | balanced | detailed                 │
│  - Terminology: simple | moderate | clinical                │
│  - Focus areas: medications, nutrition, activity, etc.      │
└─────────────────────────────────────────────────────────────┘
```

### Firestore Collections

| Collection | Purpose |
|------------|---------|
| `featureEngagement` | Raw page view and action events |
| `userFeatureStats` | Aggregated engagement stats per user/feature |
| `smartInteractionMetrics` | Smart response quality tracking |
| `userSmartQualityStats` | Aggregated smart quality stats per user |
| `userSmartPreferences` | Learned and manual preferences |

### Key Files

| File | Purpose |
|------|---------|
| `src/types/engagement.ts` | TypeScript interfaces |
| `src/lib/engagement/featureTracker.ts` | Track page visits, time, actions |
| `src/lib/engagement/smartMetricsTracker.ts` | Track smart response quality |
| `src/lib/engagement/preferenceLearner.ts` | Analyze patterns, derive preferences |
| `src/lib/ai/personalizedPrompting.ts` | Generate personalized system prompts |
| `src/hooks/useFeatureTracking.ts` | React hook for feature tracking |
| `src/hooks/useSmartMetrics.ts` | React hook for smart metrics |

### Learning Configuration

```typescript
const LEARNING_CONFIG = {
  minFeedbackForLearning: 5,      // Minimum events before learning applies
  minEngagementForLearning: 10,
  confidenceThreshold: 0.6,       // Only apply if confidence > 0.6
  relearningInterval: 10,         // Re-analyze after every 10 new events
  followUpTimeWindowMs: 2 * 60 * 1000,  // 2 minutes for follow-up detection
};
```

**DO NOT:**
- Create composite indexes for engagement collections (use SDK queries)
- Apply learned preferences with confidence < 0.6
- Track sensitive data in engagement events (only feature names and timestamps)
- Use "AI" in user-facing text - always use "Smart" instead

---

## 14. Testing Guidelines

### Role Hierarchy

**Plan A & B (Family Plans):**
```
Caregiver (Admin/Subscriber)
├── Full write access to elder data
├── Can invite members
└── Manages medications, supplements, diet, notes

Member (Invited)
├── Read-only access
├── Receives FCM notifications
└── Cannot add/edit/delete any data
```

**Plan C (Multi Agency):**
```
Superadmin (Subscriber)
├── Subscribe & manage billing
├── Add caregivers (max 10)
├── Add elders & assign to caregivers
├── View ALL agency data
└── CANNOT write to elder health data

Caregiver (Added by superadmin)
├── Full write to ASSIGNED elders only
├── Cannot access unassigned elders
├── Can invite members (max 2/elder)
└── Manages meds, supplements, diet for assigned elders

Member (Invited by caregiver)
├── Read-only for specific elder
├── Receives FCM notifications
└── Cannot write any data
```

### Permissions Matrix

| Action | Plan A/B Admin | Plan A/B Member | Plan C Superadmin | Plan C Caregiver | Plan C Member |
|--------|----------------|-----------------|-------------------|------------------|---------------|
| Add elder | ✅ | ❌ | ✅ | ❌ | ❌ |
| Edit elder profile | ✅ | ❌ | ❌ | ✅ (assigned) | ❌ |
| Add medication | ✅ | ❌ | ❌ | ✅ (assigned) | ❌ |
| View medications | ✅ | ✅ | ✅ | ✅ (assigned) | ✅ |
| Add caregiver | N/A | N/A | ✅ | ❌ | ❌ |
| Invite member | ✅ | ❌ | ❌ | ✅ | ❌ |
| View reports | ✅ | ✅ | ✅ | ✅ (assigned) | ✅ |

### Authentication Requirements

**Before Data Entry:**
- Email verification: **REQUIRED**
- Phone verification: **REQUIRED**
- Both must be verified before adding elders or health data

### Public Sections (No Auth Required)

| Page | Path | Description |
|------|------|-------------|
| Symptom Checker | `/symptom-checker` | AI-powered symptom assessment |
| Care Community | `/tips` | Caregiver tips and wisdom |
| Features | `/features` | Feature discovery |
| Pricing | `/pricing` | Subscription plans |
| Home | `/` | Landing page |
| About | `/about` | About page |

---

## 15. Offline Caching (PWA)

**Service Worker Status:**
- ✅ Serwist (Workbox alternative) with precaching
- ✅ 200+ static assets precached
- ✅ API response caching (NetworkFirst, 10s timeout)
- ✅ `useOnlineStatus` hook for online/offline detection
- ✅ `OfflineIndicator` component
- ✅ `OfflineAwareButton` component

### IndexedDB Configuration

**Database:** `myhealthguide_offline`

**Stores:**
- `communityTips` - Cached community tips
- `syncMetadata` - Sync status tracking
- `cachedImages` - Compressed images
- `syncQueue` - Pending write operations

**Cache Limits:**
```typescript
CACHE_CONFIG = {
  MAX_TIPS: 50,
  MAX_CACHE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE_BYTES: 100 * 1024, // 100KB per image
  SYNC_DEBOUNCE_MS: 5000,
  STALE_THRESHOLD_HOURS: 24,
}

SYNC_QUEUE_CONFIG = {
  MAX_QUEUE_SIZE: 100,
  MAX_RETRY_ATTEMPTS: 5,
  RETRY_DELAY_BASE_MS: 1000,
  SYNC_DELAY_MS: 2000,
  SYNC_CHECK_INTERVAL_MS: 30000,
}
```

### Offline Files

| File | Purpose |
|------|---------|
| `src/lib/offline/offlineTypes.ts` | TypeScript interfaces and constants |
| `src/lib/offline/indexedDB.ts` | Generic IndexedDB wrapper utilities |
| `src/lib/offline/cacheManager.ts` | Tip caching with image compression |
| `src/lib/offline/syncManager.ts` | Online/offline detection and background sync |
| `src/lib/offline/offlineSyncService.ts` | Core queue management with auto-sync |
| `src/hooks/useOfflineStatus.ts` | React hook for offline status tracking |
| `src/hooks/useSyncQueue.ts` | React hook for queue status |
| `src/components/OfflineBadge.tsx` | Offline indicator component |
| `src/components/PendingSyncIndicator.tsx` | Header indicator showing sync status |

---

## 16. Subscription Security

### E2E Security Tests

**Test File:** `e2e/subscription.spec.ts` - 28 tests total

**Security Negative Tests:**
```typescript
1. should redirect unauthenticated users from billing settings
2. should redirect unauthenticated users from dashboard
3. should block API checkout endpoint without authentication
4. should block API billing portal endpoint without authentication
5. should block API subscription check without authentication
```

### Running Tests

```bash
# Run against production
PLAYWRIGHT_BASE_URL=https://myguide.health SKIP_WEB_SERVER=1 npx playwright test e2e/subscription.spec.ts

# Run against local
npx playwright test e2e/subscription.spec.ts
```

**DO NOT:**
- Remove negative security tests
- Skip auth checks when adding new billing endpoints
- Allow unauthenticated API access to billing functions
