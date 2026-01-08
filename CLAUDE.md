- review the documents. build prod ready files, do not add To-Dos. do not assume-ask me when in doubt.
- today is Jan 7, 2026.

## UI/UX REORGANIZATION STATUS (Jan 2026)

**Reference Document:** `/healthguide_refactor_jan07.md`

| Phase | Name | Status | Date |
|-------|------|--------|------|
| 1 | Setup & Terminology | ✅ COMPLETE | Jan 7, 2026 |
| 2 | Routes & Redirects | ✅ COMPLETE | Jan 8, 2026 |
| 3 | Navigation Components | ✅ COMPLETE | Jan 8, 2026 |
| 4 | Landing Pages | ✅ COMPLETE | Jan 8, 2026 |
| 5 | Pricing & Footer | ✅ COMPLETE | Jan 8, 2026 |
| 6 | Polish & Final Verification | 🔄 NEXT | - |

### Phase 1 Completion Summary
- All display text changed: "Elder" → "Loved One"
- Variable names, props, CSS classes, API endpoints preserved
- Chrome verified: Dashboard, Pricing, Terms, Privacy pages
- All 278 E2E tests passing
- Commits: dc5ab82, 0060d79, 22f2b51

### Phase 3 Completion Summary
- Navigation components already implemented Vercel-style states
- `Header.tsx` - Underline for active page, gray hover background
- `Sidebar.tsx` - Blue left border accent, background highlight, tooltips
- Section groupings: TEST'S CARE, SMART INSIGHTS, PERSONAL, AGENCY
- Chrome verified: Public nav hover states, dashboard sidebar states
- E2E tests: 64 navigation-related tests passing

### Key Constraints (DO NOT MODIFY)
- Authentication logic
- API calls or data fetching
- Payment/subscription flows
- Database queries
- Service worker / PWA config
- Variable names (elderId, elderData, etc.)

---

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

### 2b. Stripe Pricing Configuration (UPDATED: Jan 1, 2026)

**Current Pricing (in code):**
| Plan | Price | Stripe Price ID Env Var |
|------|-------|------------------------|
| Family Plan A | $8.99/elder/month | `STRIPE_FAMILY_PRICE_ID` |
| Family Plan B | $18.99/month | `STRIPE_SINGLE_AGENCY_PRICE_ID` |
| Multi Agency | $55/elder/month | `STRIPE_MULTI_AGENCY_PRICE_ID` |

**TESTING vs PRODUCTION:**
- **Testing:** `STRIPE_MULTI_AGENCY_PRICE_ID` is set to a $30 test price (Stripe doesn't allow editing prices)
- **Production:** Create a new $55 price in Stripe and update the environment variable

**Before Production Launch:**
1. Create new Stripe price for Multi Agency at $55/elder/month
2. Update `STRIPE_MULTI_AGENCY_PRICE_ID` in Vercel production environment
3. Optionally archive the old $30 test price in Stripe

**Source of Truth:**
- Display pricing: `src/lib/subscription/subscriptionService.ts` (PLAN_CONFIG)
- Stripe charges: Determined by the price ID in environment variables

**Trial Periods:**
- Family Plan A & B: 45 days (TRIAL_DURATION_DAYS)
- Multi Agency: 30 days (MULTI_AGENCY_TRIAL_DAYS)

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
- Today is Jan 3, 2026
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

### 9. Gemini API Configuration (UPDATED: Jan 3, 2026)

**Model:** `gemini-3-pro-preview` with thinking mode

**CRITICAL - Google Model Retirement Notice (Jan 2026):**
| Model | Retirement Date | Status |
|-------|-----------------|--------|
| gemini-2.5-flash-preview-09-2025 | Jan 15, 2026 | ⚠️ Imminent |
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
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` - Service account JSON for Vertex AI SDK (Vercel environment variable)
- `GOOGLE_CLOUD_PROJECT_ID` - GCP project ID for Vertex AI

**Files using Gemini 3 Pro Preview (ALL files migrated):**
- `src/lib/ai/chatService.ts` - Smart Assistant chat (Direct API)
- `src/lib/ai/geminiService.ts` - General AI service (Direct API)
- `src/lib/ai/voiceSearch.ts` - Voice search (Direct API)
- `src/lib/ai/medgemmaService.ts` - Medical AI queries (Vertex AI SDK)
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
- Forget to add `// @ts-ignore` before thinkingConfig in Vertex AI SDK calls (TypeScript types may be outdated)

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

### 11. Hybrid Dementia Q&A Assessment (IMPLEMENTED: Dec 23, 2025)

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

src/app/api/dementia-assessment/
├── route.ts                              # POST: Start session, GET: List sessions
├── [sessionId]/route.ts                  # GET: Session details, DELETE: Abandon
├── [sessionId]/answer/route.ts           # POST: Submit answer
├── [sessionId]/next-question/route.ts    # GET: Next question (with AI branching)
├── [sessionId]/complete/route.ts         # POST: Complete & generate results
└── results/route.ts                      # GET: List results for elder

src/components/dementia-assessment/
├── AssessmentWizard.tsx                  # Main wizard flow
├── QuestionCard.tsx                      # Individual question display
└── ResultsSummary.tsx                    # Final results display
```

**Firestore Collections:**
- `dementiaAssessmentSessions` - In-progress Q&A sessions
- `dementiaAssessmentResults` - Completed assessment results (immutable)

**Firestore Rules:**
```javascript
// Assessment Sessions
match /dementiaAssessmentSessions/{sessionId} {
  allow read: if request.auth != null && resource.data.caregiverId == request.auth.uid;
  allow create: if isSignedIn() && hasActiveAccess(request.auth.uid) &&
    isMemberOfGroup(request.resource.data.groupId);
  allow update: if request.auth != null && resource.data.caregiverId == request.auth.uid;
  allow delete: if request.auth != null && resource.data.caregiverId == request.auth.uid;
}

// Assessment Results (immutable audit trail)
match /dementiaAssessmentResults/{resultId} {
  allow read: if isSignedIn() && (resource.data.caregiverId == request.auth.uid ||
    isGroupAdmin(resource.data.groupId) || isMemberOfGroup(resource.data.groupId));
  allow create: if isSignedIn() && hasActiveAccess(request.auth.uid);
  allow update: if isSignedIn() && (resource.data.caregiverId == request.auth.uid ||
    isGroupAdmin(resource.data.groupId));
  allow delete: if false; // Never delete - audit trail
}
```

**Adaptive Branching Configuration:**
```typescript
const BRANCHING_CONFIG = {
  maxDepthPerDomain: 3,      // Max follow-up questions per concerning answer
  maxAdaptiveTotal: 10,      // Max AI-generated questions per assessment
  domainPriority: {
    memory: 'high',          // More branching allowed
    orientation: 'high',
    executive: 'high',
    attention: 'medium',
    language: 'medium',
    mood_behavior: 'medium',
  }
};
```

**Risk Level Calculation:**
- **Urgent**: Memory AND orientation both concerning
- **Concerning**: 2+ concerning domains OR any priority domain concerning
- **Moderate**: 1 concerning domain OR 2+ moderate domains
- **Low**: No significant concerns

**How to Start an Assessment:**
```typescript
// API call to start assessment
const response = await authenticatedFetch('/api/dementia-assessment', {
  method: 'POST',
  body: JSON.stringify({
    groupId: '...',
    elderId: '...',
    elderName: 'John',
    elderAge: 75,  // Optional
    knownConditions: ['diabetes']  // Optional
  })
});
```

**Page Location:**
- `/dashboard/dementia-screening` - Tabbed UI with:
  - Q&A Assessment tab (new)
  - Behavioral Detection tab (existing keyword-based)
  - History tab (assessment results)

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

### 12. Navigation Structure (RESTRUCTURED: Dec 25, 2025)

**IMPORTANT:** The navigation has been completely restructured for simplified UX.

#### Header Changes
- **Elder Dropdown** moved to header (was in sidebar)
- Component: `src/components/dashboard/ElderDropdown.tsx`
- Shows avatar with gradient + elder name + chevron
- Dropdown includes: elder list, "Add New Elder", "Manage All Elders"
- Logo displayed in header on desktop

#### Sidebar Structure (Simplified)
```
- Overview

[ELDER'S CARE] (green dot indicator)
- Health Profile
- Daily Care

[AI & INSIGHTS]
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

**Key Files:**
- `src/components/shared/Sidebar.tsx` - Restructured sidebar
- `src/components/shared/DashboardHeader.tsx` - Updated header with elder dropdown
- `src/components/dashboard/ElderDropdown.tsx` - New elder selector component

#### New Merged Pages

| Page | Path | Combines |
|------|------|----------|
| Daily Care | `/dashboard/daily-care` | Medications, Supplements, Diet, Activity (tabs) |
| Safety Alerts | `/dashboard/safety-alerts` | Drug Interactions, Incidents, Conflicts, Screening (tabs) |
| Analytics | `/dashboard/analytics` | Adherence, Nutrition, Health Trends (tabs) |
| Ask AI | `/dashboard/ask-ai` | Health Chat, Clinical Notes, Reports (tabs) |
| Care Management | `/dashboard/care-management` | Agency features hub |

**Tab State:** Uses URL query params (e.g., `?tab=medications`)

#### Route Redirects (in next.config.js)

Old routes automatically redirect to new merged pages:

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

#### Overview Page Time Toggle
- Component: `src/components/dashboard/TimeToggle.tsx`
- Options: Today | Week | Month
- Week/Month shows `WeeklySummaryPanel` with aggregated stats

#### Tier-Based Visibility
- **Agency section** only visible for `isMultiAgency` users
- Uses `useSubscription()` hook to check tier

#### Components Created
| Component | Path | Purpose |
|-----------|------|---------|
| ElderDropdown | `src/components/dashboard/ElderDropdown.tsx` | Header elder selector |
| TimeToggle | `src/components/dashboard/TimeToggle.tsx` | Today/Week/Month toggle |
| WeeklySummaryPanel | `src/components/dashboard/WeeklySummaryPanel.tsx` | Weekly/monthly stats display |

**DO NOT:**
- Add back collapsible navigation sections
- Move elder selector back to sidebar
- Create separate pages for merged features (use tabs instead)
- Use `permanent: true` for redirects (allows easy rollback)

### 13. Smart Learning System (IMPLEMENTED: Dec 29, 2025)

**IMPORTANT:** The app learns and improves based on user feedback and engagement patterns.

**NAMING CONVENTION:** Use "Smart" instead of "AI" in all user-facing text. Users don't need to know about AI - they just want smart features.

#### Architecture Overview

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

#### Firestore Collections

| Collection | Purpose |
|------------|---------|
| `featureEngagement` | Raw page view and action events |
| `userFeatureStats` | Aggregated engagement stats per user/feature |
| `smartInteractionMetrics` | Smart response quality tracking |
| `userSmartQualityStats` | Aggregated smart quality stats per user |
| `userSmartPreferences` | Learned and manual preferences |

#### Key Files

| File | Purpose |
|------|---------|
| `src/types/engagement.ts` | TypeScript interfaces |
| `src/lib/engagement/featureTracker.ts` | Track page visits, time, actions |
| `src/lib/engagement/smartMetricsTracker.ts` | Track smart response quality |
| `src/lib/engagement/preferenceLearner.ts` | Analyze patterns, derive preferences |
| `src/lib/ai/personalizedPrompting.ts` | Generate personalized system prompts |
| `src/hooks/useFeatureTracking.ts` | React hook for feature tracking |
| `src/hooks/useSmartMetrics.ts` | React hook for smart metrics |

#### Usage Examples

**Feature Tracking Hook:**
```typescript
import { useFeatureTracking } from '@/hooks/useFeatureTracking';

function MedicationsPage() {
  const { trackAction, completeAction } = useFeatureTracking('daily_care_medications');

  const handleAddMedication = async () => {
    await trackAction('add_medication');
    // Show form...
  };

  const handleSaveMedication = async () => {
    // Save logic...
    await completeAction('add_medication');
  };
}
```

**Smart Metrics Hook:**
```typescript
import { useSmartMetrics } from '@/hooks/useSmartMetrics';

function HealthChatPage() {
  const { trackResponse, trackUserMessage, trackAction } = useSmartMetrics({
    feature: 'health_chat',
  });

  const handleSmartResponse = async (response) => {
    await trackResponse(response.id, response.text);
  };
}
```

#### Learning Configuration

```typescript
const LEARNING_CONFIG = {
  minFeedbackForLearning: 5,      // Minimum events before learning applies
  minEngagementForLearning: 10,
  confidenceThreshold: 0.6,       // Only apply if confidence > 0.6
  relearningInterval: 10,         // Re-analyze after every 10 new events
  followUpTimeWindowMs: 2 * 60 * 1000,  // 2 minutes for follow-up detection
};
```

#### Settings UI

Location: Settings > Smart Caregiver Features > Personalized Responses

Features:
- Toggle auto-learn on/off
- Manual override for response style (concise/balanced/detailed)
- Manual override for language level (simple/moderate/clinical)
- View current learned preferences
- Re-analyze preferences button

#### Integration with Chat Service

The personalization is automatically injected into `chatService.ts`:

```typescript
// In generateChatResponse()
const systemPrompt = await generatePersonalizedSystemPrompt(context.userId, baseSystemPrompt);
```

#### Firestore Rules

Uses simple `userId` field queries (no composite indexes required):
- `featureEngagement`: userId == request.auth.uid
- `userFeatureStats`: userId == request.auth.uid
- `smartInteractionMetrics`: userId == request.auth.uid
- `userSmartQualityStats`: userId == request.auth.uid
- `userSmartPreferences`: userId == request.auth.uid

**DO NOT:**
- Create composite indexes for engagement collections (use SDK queries)
- Apply learned preferences with confidence < 0.6
- Track sensitive data in engagement events (only feature names and timestamps)
- Use "AI" in user-facing text - always use "Smart" instead

### 14. Testing Guidelines (UPDATED: Jan 6, 2026)

#### Subscription Plans

| Plan | Price | Trial | Elders | Caregivers | Members |
|------|-------|-------|--------|------------|---------|
| **Plan A** (Family Plan A) | $8.99/mo | 45 days | 1 | 1 (admin) | 1 (read-only) |
| **Plan B** (Family Plan B) | $18.99/mo | 45 days | 1 | 1 (admin) | 3 (read-only) |
| **Plan C** (Multi Agency) | $55/elder/mo | 30 days | 3/caregiver | 10 max | 2/elder (read-only) |

#### Role Hierarchy

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

#### Permissions Matrix

| Action | Plan A/B Admin | Plan A/B Member | Plan C Superadmin | Plan C Caregiver | Plan C Member |
|--------|----------------|-----------------|-------------------|------------------|---------------|
| Add elder | ✅ | ❌ | ✅ | ❌ | ❌ |
| Edit elder profile | ✅ | ❌ | ❌ | ✅ (assigned) | ❌ |
| Add medication | ✅ | ❌ | ❌ | ✅ (assigned) | ❌ |
| View medications | ✅ | ✅ | ✅ | ✅ (assigned) | ✅ |
| Add caregiver | N/A | N/A | ✅ | ❌ | ❌ |
| Invite member | ✅ | ❌ | ❌ | ✅ | ❌ |
| View reports | ✅ | ✅ | ✅ | ✅ (assigned) | ✅ |

#### Authentication Requirements

**Before Data Entry:**
- Email verification: **REQUIRED**
- Phone verification: **REQUIRED**
- Both must be verified before adding elders or health data

**Verification Flow:**
1. User signs up (email or phone)
2. Verification banner shown until both verified
3. Protected features blocked until verified
4. After verification: full access based on subscription

#### Public Sections (No Auth Required)

| Page | Path | Description |
|------|------|-------------|
| Symptom Checker | `/symptom-checker` | AI-powered symptom assessment |
| Care Community | `/tips` | Caregiver tips and wisdom |
| Features | `/features` | Feature discovery |
| Pricing | `/pricing` | Subscription plans |
| Home | `/` | Landing page |
| About | `/about` | About page |

#### Testing Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. FIX CODE                                                │
│     - Make changes in local environment                     │
│     - Run `npm run build` to verify                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. PUSH TO GITHUB                                          │
│     - `git add . && git commit -m "message"`                │
│     - `git push origin main`                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. WAIT FOR VERCEL DEPLOYMENT                              │
│     - Check: `gh run list --limit 1`                        │
│     - Production: https://myguide.health                    │
│     - Preview: https://myhealthguide.vercel.app             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. VERIFY WITH CHROME EXTENSION                            │
│     - Use Claude Chrome extension for UI testing            │
│     - Test affected pages and flows                         │
│     - Check console for errors                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. REPORT & LOOP                                           │
│     - Document PASS/FAIL for each test                      │
│     - If FAIL: identify fix → return to step 1              │
│     - If PASS: move to next test or complete                │
└─────────────────────────────────────────────────────────────┘
```

#### Deployment URLs

| Environment | URL |
|-------------|-----|
| Production | https://myguide.health |
| Preview/Staging | https://myhealthguide.vercel.app |

#### Claude Code Testing Commands

Use these slash commands for testing workflows:

| Command | Purpose |
|---------|---------|
| `/test-planner` | Generate comprehensive test cases |
| `/verify-app` | Full deployment verification workflow |
| `/rbac-tester` | Test role-based access control |
| `/subscription-tester` | Test plan limits, Stripe, trials |
| `/input-validator` | Test input validation & security |
| `/auth-tester` | Test authentication & sessions |
| `/check-deploy` | Quick deployment status check |
| `/build` | Run production build |
| `/test` | Run test suites |

#### Quick Test Checklist

**Before Every Deploy:**
- [ ] `npm run build` passes
- [ ] No TypeScript errors
- [ ] No console errors in browser

**After Deploy:**
- [ ] Affected pages load correctly
- [ ] Forms validate properly
- [ ] Auth flows work
- [ ] Subscription limits enforced
- [ ] RBAC permissions correct

### 15. UI/UX Terminology Refactoring (COMPLETED: Jan 7, 2026)

**IMPORTANT:** User-facing terminology has been updated for better clarity and empathy.

#### Terminology Changes

| Old Term | New Term | Scope |
|----------|----------|-------|
| Elder | Loved One | All user-facing display text |
| CareGuide | MyHealthGuide | Branding on public pages |

#### Rules for Future Development

**CHANGE (Display Text Only):**
- JSX text content visible to users
- Labels, placeholders, error messages
- Page titles and descriptions
- Filter dropdown options
- CSV export headers

**PRESERVE (Do NOT Change):**
- Variable names (`elderId`, `elderData`, `elderName`)
- Props and interfaces (`ElderContext`, `ElderCard`)
- CSS class names
- API endpoints and routes (`/dashboard/elders`)
- Firestore collection names
- TypeScript types and interfaces

#### Files Modified (27 Total)

**Group 1: Core Navigation & Layout (3 files)**
| File | Changes |
|------|---------|
| `src/components/shared/Sidebar.tsx` | "ELDER'S CARE" → "LOVED ONE'S CARE", section labels |
| `src/components/shared/Footer.tsx` | "CareGuide" → "MyHealthGuide" branding |
| `src/components/dashboard/ElderDropdown.tsx` | "Add New Elder" → "Add Loved One", "Manage All Elders" → "Manage Loved Ones" |

**Group 2: Dashboard Pages (3 files)**
| File | Changes |
|------|---------|
| `src/app/dashboard/elders/page.tsx` | Page title "Elders" → "Loved Ones" |
| `src/app/dashboard/elders/new/page.tsx` | "Add New Elder" form labels |
| `src/app/dashboard/page.tsx` | "ELDERS" stat → "LOVED ONES", "Your Elders" → "Your Loved Ones" |

**Group 3: Agency Components (8 files)**
| File | Changes |
|------|---------|
| `src/components/agency/AgencyOverview.tsx` | Stats: "Elders" → "Loved Ones", "Max Elders/Caregiver" → "Max Loved Ones/Caregiver" |
| `src/components/agency/CaregiverAssignmentManager.tsx` | Assignment labels, counts, descriptions |
| `src/components/agency/PrimaryCaregiverTransferDialog.tsx` | Transfer descriptions |
| `src/components/agency/scheduling/ShiftSchedulingCalendar.tsx` | CSV header, filter dropdown, print table |
| `src/components/agency/scheduling/CreateShiftDialog.tsx` | Labels, placeholders, error messages |
| `src/components/agency/scheduling/BulkCreateShiftDialog.tsx` | Labels, result display |
| `src/components/agency/scheduling/ShiftDetailsPopover.tsx` | Detail labels, dialogs |
| `src/components/agency/billing/AgencyBillingDashboard.tsx` | Stats, subscriptions, dialogs |

**Group 4: Public Pages (2 files)**
| File | Changes |
|------|---------|
| `src/app/(public)/about/page.tsx` | "CareGuide" → "MyHealthGuide", pricing descriptions |
| `src/app/(public)/privacy/page.tsx` | "Elder and Care Information" → "Loved One and Care Information" |

**Group 5: Form Pages - New (3 files)**
| File | Changes |
|------|---------|
| `src/app/dashboard/medications/new/page.tsx` | Label: "Elder" → "Loved One", placeholder: "Select an elder" → "Select a loved one" |
| `src/app/dashboard/supplements/new/page.tsx` | Label: "Elder" → "Loved One", placeholder: "Select an elder" → "Select a loved one" |
| `src/app/dashboard/diet/new/page.tsx` | Label: "Elder" → "Loved One", placeholder: "Select an elder" → "Select a loved one" |

**Group 6: Form Pages - Edit (3 files)**
| File | Changes |
|------|---------|
| `src/app/dashboard/medications/[medicationId]/edit/page.tsx` | Label, "Unknown Elder" → "Unknown", help text |
| `src/app/dashboard/supplements/[supplementId]/edit/page.tsx` | Label, "Unknown Elder" → "Unknown", help text |
| `src/app/dashboard/diet/[mealId]/edit/page.tsx` | Label, "Unknown Elder" → "Unknown", help text |

**Group 7: Dashboard Feature Pages (10 files)**
| File | Changes |
|------|---------|
| `src/app/dashboard/health-chat/page.tsx` | "Select an Elder" → "Select a Loved One" |
| `src/app/dashboard/insights/page.tsx` | "Select Elder" → "Select Loved One" |
| `src/app/dashboard/timesheet/page.tsx` | CSV header, table column: "Elder" → "Loved One" |
| `src/app/dashboard/calendar/page.tsx` | Label: "Elder" → "Loved One", placeholder |
| `src/app/dashboard/availability/page.tsx` | "Preferred Elders" → "Preferred Loved Ones", "Unavailable Elders" → "Unavailable Loved Ones" |
| `src/app/dashboard/phi-disclosures/page.tsx` | CSV header, metadata label: "Elder" → "Loved One" |
| `src/app/dashboard/dementia-screening/page.tsx` | Fallback text: "Elder" → "Loved One" |
| `src/app/dashboard/family-updates/page.tsx` | Fallback text: "Elder" → "Loved One" |
| `src/app/dashboard/nutrition-analysis/page.tsx` | Fallback text: "Elder" → "Loved One" |
| `src/app/dashboard/shift-handoff/page.tsx` | Fallback text: "Elder" → "Loved One" |

**Group 8: Components (4 files)**
| File | Changes |
|------|---------|
| `src/components/admin/DataExportPanel.tsx` | "Elder profiles" → "Loved one profiles" |
| `src/components/admin/DataDeletionPanel.tsx` | "Elders Deleted" → "Loved Ones Deleted" |
| `src/components/voice/VoiceTranscriptDialog.tsx` | Label: "Elder:" → "Loved One:" |
| `src/components/seo/StructuredData.tsx` | "Eldercare" → "Loved one care" in description |

**Group 9: Auth Pages (1 file)**
| File | Changes |
|------|---------|
| `src/app/(auth)/caregiver-family-invite/page.tsx` | "Elders you can view" → "Loved ones you can view" |

#### Verification Summary (Jan 7, 2026)

All changes verified on production (https://myguide.health):

| Page | Status | Verified Elements |
|------|--------|-------------------|
| About | ✅ PASS | "MyHealthGuide" branding, "loved one" pricing text |
| Dashboard Overview | ✅ PASS | "LOVED ONES" stat card, "Your Loved Ones" section |
| Elders Page | ✅ PASS | "Loved Ones" page title |
| Agency Overview | ✅ PASS | "Loved Ones" stats, "Max Loved Ones/Caregiver" |
| Agency Scheduling | ✅ PASS | "All Loved Ones" filter dropdown |
| Agency Assignments | ✅ PASS | "Assign caregivers to specific loved ones" |
| Care Management | ✅ PASS | Hub page displays correctly |
| Footer | ✅ PASS | "MyHealthGuide" branding |
| Medications Form | ✅ PASS | "Loved One" label |

#### Commit History

- `a392567` - fix: update footer branding from CareGuide to MyHealthGuide
- `7184a1a` - feat: complete terminology update - Elder to Loved One (23 files)
- `bf14898` - docs: add terminology refactoring documentation to CLAUDE.md
- `c36abd4` - feat: update terminology - Elder to Loved One, CareGuide to MyHealthGuide (Groups 3-4)

**DO NOT:**
- Change variable names, props, or TypeScript interfaces containing "elder"
- Rename API routes or Firestore collections
- Use "Elder" in any new user-facing text (always use "Loved One")
- Use "CareGuide" in branding (always use "MyHealthGuide")