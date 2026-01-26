# MyHealthGuide - Claude Code Instructions

- Review the documents. Build prod ready files, do not add To-Dos. Do not assume - ask me when in doubt.
- Today is Jan 26, 2026.
- See `docs/skills.md` for detailed system capabilities and notification flows.
- The firebase config will not work in local.

## Related Documentation

| File | Contents |
|------|----------|
| `CLAUDE-ARCHITECTURE.md` | Technical systems (AI, Auth, Firestore, Navigation, Testing) |
| `CLAUDE-HISTORY.md` | Completed phases, changelogs, test results |
| `docs/Jan22_UpdatePrompt_v1.md` | Phase 14 UI/UX Overhaul - original implementation spec |
| `docs/Jan22_UpdatedPrompt_v2.md` | Phase 14 UI/UX Overhaul - enhanced spec with context |
| `docs/mockups/` | SVG mockups for Phase 14 navigation redesign |
| `docs/PERMISSION_SYSTEM.md` | Permission system documentation |
| `docs/removetwilio.md` | Twilio SMS removal documentation and reactivation instructions |
| `docs/skills.md` | Active notification channels and capabilities |
| `.claude/skills/schedule-assignment/SKILL.md` | Copy + Adjust scheduling for weekly elder-caregiver assignments |

---

## Current Phase: Phase 7 - UI/UX Accessibility, Voice Navigation & Landing Page

**Reference Document:** `refactor-7.md`

| Task | Description | Status | Date |
|------|-------------|--------|------|
| 1 | UI/UX Accessibility Audit | ✅ COMPLETE | Jan 10, 2026 |
| 2 | Voice Search Network Error Fix | ✅ COMPLETE | Jan 10, 2026 |
| 3 | Voice Navigation System | ✅ COMPLETE | Jan 10, 2026 |
| 4 | API Branding Audit | ✅ COMPLETE | Jan 10, 2026 |
| 5 | Landing Page Restructure | ✅ COMPLETE | Jan 10, 2026 |
| 6 | 55+ Accessibility Fixes | ✅ COMPLETE | Jan 10, 2026 |
| 7 | E2E Testing | ✅ COMPLETE | Jan 10, 2026 |
| 8 | Modular Accessibility Components | ✅ COMPLETE | Jan 10, 2026 |
| 9 | AI Integration Strategy | 🔲 PENDING | - |
| 10 | MedGemma Branding Cleanup | ✅ COMPLETE | Jan 11, 2026 |

---

## Current Phase: Phase 12 - RBAC Testing Complete

**Reference Document:** `refactor-12.md`
**Status:** ✅ COMPLETE (Jan 17, 2026)

### RBAC Test Results Summary

| Category | Tests | Passed | Status |
|----------|-------|--------|--------|
| Multi-Agency Caregiver Isolation | 24 | 24 | ✅ 100% |
| Read-Only Member Access | 9 | 9 | ✅ 100% |
| Super Admin (Agency Owner) | 9 | 9 | ✅ 100% |
| Family Plan A | 8 | 8 | ✅ 100% |
| Family Plan B | 15 | 15 | ✅ 100% |
| **TOTAL** | **65** | **65** | ✅ **100%** |

### Security Verified

| Control | Status |
|---------|--------|
| Caregiver isolation (C1, C2, C3, C10) | ✅ SECURE |
| Read-only member permissions | ✅ SECURE |
| Super admin read-only for care data | ✅ SECURE |
| Cross-agency isolation | ✅ SECURE |
| Cross-plan isolation | ✅ SECURE |
| IDOR vulnerability fix | ✅ VERIFIED |

### Test Accounts Pattern
- Agency Owner: `ramanac+owner@gmail.com`
- Caregivers 1-10: `ramanac+c1@gmail.com` through `ramanac+c10@gmail.com`
- Family Members: `ramanac+c{1-10}m{1-6}@gmail.com`
- Family Plan A: `ramanac+a1@gmail.com` (admin), `ramanac+a2@gmail.com` (member)
- Family Plan B: `ramanac+b1@gmail.com` (admin), `ramanac+b2-b4@gmail.com` (members)
- Password (all accounts): `AbcD12!@`

---

## Phase 13 - Subscription Testing Complete

**Status:** ✅ COMPLETE (Jan 17, 2026)

### Subscription Test Results Summary

| Plan | Tests | Passed | Status |
|------|-------|--------|--------|
| Family Plan A (SUB-1A) | 5 | 5 | ✅ 100% |
| Family Plan B (SUB-1B) | 6 | 6 | ✅ 100% |
| Multi-Agency (SUB-1C) | 7 | 7 | ✅ 100% |
| **TOTAL** | **18** | **18** | ✅ **100%** |

### Family Plan A Tests (SUB-1A)

| Test | Description | Result |
|------|-------------|--------|
| SUB-1A-01 | Verify Plan A limits (1 loved one) | ✅ PASS |
| SUB-1A-02 | Verify Add Loved One button behavior | ✅ PASS |
| SUB-1A-03 | Verify Settings page shows Plan A ($8.99) | ✅ PASS |
| SUB-1A-04 | Verify trial status display | ✅ PASS |
| SUB-1A-05 | Verify feature access | ✅ PASS |

### Family Plan B Tests (SUB-1B)

| Test | Description | Result |
|------|-------------|--------|
| SUB-1B-01 | Verify Plan B limits (1 loved one) | ✅ PASS |
| SUB-1B-02 | Verify Add Loved One button behavior | ✅ PASS |
| SUB-1B-03 | Verify Settings page shows Plan B ($18.99) | ✅ PASS |
| SUB-1B-04 | Verify trial status display | ✅ PASS |
| SUB-1B-05 | Verify feature access | ✅ PASS |
| SUB-1B-06 | Verify Plan B allows 1 admin + 3 members | ✅ PASS |

### Multi-Agency Plan Tests (SUB-1C)

| Test | Description | Result |
|------|-------------|--------|
| SUB-1C-01 | Verify Plan C elder limits (3 per caregiver) | ✅ PASS |
| SUB-1C-02 | Verify Add Loved One button behavior | ✅ PASS |
| SUB-1C-03 | Verify Settings page shows Plan C ($55/elder/mo) | ✅ PASS |
| SUB-1C-04 | Verify trial status display | ✅ PASS |
| SUB-1C-05 | Verify feature access (RBAC enforced) | ✅ PASS |
| SUB-1C-06 | Verify agency features (Timesheets, Analytics) | ✅ PASS |
| SUB-1C-07 | Verify caregiver/member management | ✅ PASS |

### Subscription Features Verified

| Feature | Plan A | Plan B | Plan C |
|---------|--------|--------|--------|
| Pricing Display | $8.99/mo | $18.99/mo | $55/elder/mo |
| Loved One Limits | 1 | 1 | 30 (3/caregiver) |
| Member Limits | 1 admin + 1 | 1 admin + 3 | 10 caregivers |
| Limit Enforcement | ✅ | ✅ | ✅ |
| Trial Status | ✅ | ✅ | ✅ |
| Feature Access | ✅ | ✅ | ✅ |
| Agency Features | N/A | N/A | ✅ |

### Stripe Payment Error Handling Tests (SUB-3B)

**Status:** ✅ COMPLETE (Jan 18, 2026)

| Test | Description | Result |
|------|-------------|--------|
| SUB-3B.1 | Declined card (4000 0000 0000 0002) → Shows error | ✅ PASS |
| SUB-3B.2 | Error message is user-friendly | ✅ PASS |
| SUB-3B.3 | Can retry with different card | ✅ PASS |
| SUB-3B.4 | Insufficient funds (4000 0000 0000 9995) → Shows error | ✅ PASS |
| SUB-3B.5 | Expired card (4000 0000 0000 0069) → Shows error | ✅ PASS |
| SUB-3B.6 | Back button from Stripe → Returns to app safely | ✅ PASS |
| SUB-3B.7 | Close Stripe window → App handles gracefully | ✅ PASS |

**Total: 7/7 PASS**

#### Stripe Error Messages Verified

| Test Card | Error Message |
|-----------|---------------|
| 4000 0000 0000 0002 (Declined) | "Your credit card was declined. Try paying with a debit card instead." |
| 4000 0000 0000 9995 (Insufficient) | "Your credit card was declined because of insufficient funds. Try paying with a debit card instead." |
| 4000 0000 0000 0069 (Expired) | "Your card is expired. Try a different card." |

### Subscription Management Tests (SUB-4A)

**Status:** ✅ COMPLETE (Jan 18, 2026)

| Test | Description | Result |
|------|-------------|--------|
| SUB-4A.1 | View current subscription | ✅ PASS |
| SUB-4A.2 | Shows active/trial status | ✅ PASS |
| SUB-4A.3 | Shows next billing/trial end date | ✅ PASS |
| SUB-4A.4 | Shows plan amount | ✅ PASS |
| SUB-4A.5 | Cancel Subscription option visible | ✅ PASS |
| SUB-4A.6 | Change Plan option visible | ✅ PASS |
| SUB-4A.7 | Payment method visible | ✅ PASS |
| SUB-4A.8 | Update Payment Method option visible | ✅ PASS |

**Total: 8/8 PASS**

#### Trial Subscription UI Elements Verified

| Element | Display |
|---------|---------|
| Plan Name | "Multi Agency Plan" with blue "Trial" badge |
| Price | "$55/loved one/month" |
| Trial Progress | "Trial Day 1 of 30 • Ends February 16, 2026" |
| Payment Method | "Payment Method on File" with charge notice |
| Cancel Option | "Cancel during your trial to avoid being charged" |
| Billing Actions | Manage Billing, Update Payment Method, View Billing History |

#### Bug Fixes Applied (Jan 18, 2026)

| Issue | Fix |
|-------|-----|
| Trial users didn't see plan name/price | Updated logic to identify subscribed trial users |
| No Cancel option for trial users | Added cancel section with trial-specific messaging |
| No payment method indicator | Added "Payment Method on File" display |
| No Update Payment option | Added billing management section for trial users |

### Cancel Subscription Tests (SUB-4B)

**Status:** ✅ COMPLETE (Jan 18, 2026)

| Test | Description | Result |
|------|-------------|--------|
| SUB-4B.1 | Trial cancel button shows correct messaging | ✅ PASS |
| SUB-4B.2 | Cancel dialog shows "free trial" status | ✅ PASS |
| SUB-4B.3 | Dialog shows "You will not be charged" | ✅ PASS |
| SUB-4B.4 | Cancel Trial button executes cancellation | ✅ PASS |
| SUB-4B.5 | Success message displays correctly | ✅ PASS |
| SUB-4B.6 | Status updates to "Cancelled" | ✅ PASS |

**Total: 6/6 PASS (tested on both Family Plan A and Family Plan B)**

#### Trial Cancellation Flow Verified

| Step | Expected | Actual |
|------|----------|--------|
| Cancel button text | "Cancel during your trial to avoid being charged" | ✅ Correct |
| Cancel dialog title | "Cancel Subscription" | ✅ Correct |
| Trial status message | "You are currently on a free trial" | ✅ Correct |
| Cancellation effects | "You will not be charged" | ✅ Correct |
| Confirm button | "Cancel Trial" | ✅ Correct |
| Success message | "Your trial has been cancelled. You will not be charged." | ✅ Correct |
| Final status | "Cancelled" with red indicator | ✅ Correct |

#### Bug Fix Verified (Jan 18, 2026)

| Issue | Fix Location | Status |
|-------|--------------|--------|
| Trial users without Stripe subscription couldn't cancel | `/api/billing/cancel/route.ts` | ✅ FIXED |

The fix handles trial users who selected a plan but haven't been charged yet (no `stripeSubscriptionId`). These users can now cancel their trial without encountering the "No active subscription found" error.

### Stripe Billing Portal Tests (SUB-5)

**Status:** ✅ COMPLETE (Jan 19, 2026)

| Test | Description | Result |
|------|-------------|--------|
| SUB-5.1 | Manage Billing button hidden for trial users without Stripe | ✅ PASS |
| SUB-5.2 | Trial user without stripeCustomerId sees no error | ✅ PASS |
| SUB-5.3 | Cancelled user with stripeCustomerId sees "View Billing History" | ✅ PASS |
| SUB-5.4 | Cancelled user without stripeCustomerId sees no billing button | ✅ PASS |
| SUB-5.5 | Active subscribers can access Stripe billing portal | ✅ VERIFIED |

**Total: 5/5 PASS**

#### Billing Portal Access Requirements (Updated Jan 19, 2026)

| User State | Has stripeCustomerId | Button Shown | Portal Access |
|------------|----------------------|--------------|---------------|
| Trial (no Stripe) | ❌ No | ❌ Hidden | N/A - No error |
| Trial (with Stripe) | ✅ Yes | ✅ Manage Billing | ✅ Opens Stripe Portal |
| Active (paid) | ✅ Yes | ✅ Manage Billing | ✅ Opens Stripe Portal |
| Cancelled (had Stripe) | ✅ Yes | ✅ View Billing History | ✅ Opens Stripe Portal |
| Cancelled (no Stripe) | ❌ No | ❌ Hidden | N/A - Shows "Choose Your Plan" |

#### Bug Fixes Applied (Jan 19, 2026)

| Issue | Fix | File |
|-------|-----|------|
| Trial users saw error when clicking Manage Billing | Hide button if no `stripeCustomerId` | `SubscriptionSettings.tsx` |
| Cancelled users couldn't access billing history | Show "View Billing History" button if `stripeCustomerId` exists | `SubscriptionSettings.tsx` |

#### Expected Behavior (After Fix)

- **Trial users without `stripeCustomerId`**: Button hidden - no error possible
- **Trial users with `stripeCustomerId`**: "Manage Billing" button visible, opens Stripe portal
- **Cancelled users with `stripeCustomerId`**: "View Billing History" button visible, can view past invoices
- **Cancelled users without `stripeCustomerId`**: No button shown, "Choose Your Plan" pricing options displayed
- **Active subscribers**: "Manage Billing" button visible, full portal access

#### Production Verification (Jan 19, 2026)

| Test | User | Expected | Result |
|------|------|----------|--------|
| SUB-5.1 | Trial user (ramanac+b1) | No "Manage Billing" button | ✅ PASS - Button hidden |
| SUB-5.4 | Cancelled user (ramanac+owner) | No billing button (no stripeCustomerId) | ✅ PASS - Only "Choose Your Plan" shown |

**Verification Method:** Browser automation via Chrome extension on production (myguide.health)

### Trial Expiration Tests (SUB-5A)

**Status:** ✅ COMPLETE (Jan 19, 2026)

Tests what happens when trial expires WITHOUT subscribing.

| Test | Description | Result |
|------|-------------|--------|
| SUB-5A.1 | Login with expired trial account | ✅ PASS - User authenticates successfully |
| SUB-5A.2 | Dashboard shows trial expired message | ✅ PASS - Redirects to `/pricing?upgrade=true&reason=trial_expired` |
| SUB-5A.3 | Cannot access medications | ✅ PASS - Redirected to pricing |
| SUB-5A.4 | Cannot access care logs | ✅ PASS - Redirected to pricing |
| SUB-5A.5 | Cannot access family updates | ✅ PASS - Redirected to pricing |
| SUB-5A.6 | Cannot add new data | ✅ PASS - Cannot access any data entry pages |
| SUB-5A.7 | Shows clear message about subscribing | ✅ PASS - Pricing page shows plan options |
| SUB-5A.8 | Subscribe CTA prominently displayed | ✅ PASS - Pricing page with CTAs displayed |
| SUB-5A.9 | Direct URL to /medications blocked | ✅ PASS - Redirected to pricing |
| SUB-5A.10 | Direct URL to /care-logs blocked | ✅ PASS - Redirected to pricing |
| SUB-5A.11 | API calls blocked at UI level | ✅ PASS - ProtectedRoute blocks all access |
| SUB-5A.12 | Data NOT deleted (just inaccessible) | ✅ PASS - User document intact with all fields |

**Total: 12/12 PASS**

#### Trial Expiration Behavior Verified

| Component | Behavior |
|-----------|----------|
| `ProtectedRoute.tsx` | Checks `subscriptionStatus === 'expired'` and redirects to pricing |
| Redirect URL | `/pricing?upgrade=true&reason=trial_expired` |
| User Data | Preserved in Firestore - status changes to 'expired', data remains |
| Grace Period | 48-hour window to export data before deletion |

#### Test Method

| Step | Action |
|------|--------|
| 1 | Set test account `subscriptionStatus: 'expired'` via Firebase Admin script |
| 2 | Log in with expired account on production |
| 3 | Verify all dashboard routes redirect to pricing |
| 4 | Verify data preserved in Firestore |
| 5 | Restore account to trial status |

**Test Account:** ramanac+b2@gmail.com (Family Plan B member)
**Test Scripts:** `scripts/setTrialExpired.ts`, `scripts/restoreTrialStatus.ts`, `scripts/verifyDataPreserved.ts`

---

## Key Constraints (DO NOT MODIFY)

- Authentication logic
- API calls or data fetching
- Payment/subscription flows
- Database queries
- Service worker / PWA config
- Variable names (elderId, elderData, etc.)

---

## Terminology Rules

| Old Term | New Term | Scope |
|----------|----------|-------|
| Elder | Loved One | All user-facing display text |
| CareGuide | MyHealthGuide | Branding on public pages |

**CHANGE (Display Text Only):**
- JSX text content visible to users
- Labels, placeholders, error messages
- Page titles and descriptions

**PRESERVE (Do NOT Change):**
- Variable names (`elderId`, `elderData`, `elderName`)
- Props and interfaces (`ElderContext`, `ElderCard`)
- CSS class names
- API endpoints and routes (`/dashboard/elders`)
- Firestore collection names

---

## Subscription Plans (Quick Reference)

| Plan | Price | Trial | Elders | Caregivers | Members | Storage |
|------|-------|-------|--------|------------|---------|---------|
| **Plan A** (Family) | $8.99/mo | 45 days | 1 | 1 (admin) | 1 (read-only) | 25 MB |
| **Plan B** (Family) | $18.99/mo | 45 days | 1 | 1 (admin) | 3 (read-only) | 50 MB |
| **Plan C** (Multi Agency) | $55/elder/mo | 30 days | 3/caregiver | 10 max | 2/elder (read-only) | 500 MB |

---

## Multi-Agency Roles & Permissions

**Updated:** Jan 25, 2026

### Roles

| Role | Description | Can Login? |
|------|-------------|------------|
| **Owner** | Agency owner (super admin) - manages caregivers, elders, scheduling | ✅ Yes |
| **Caregiver** | Care provider - handles shifts, logs care activities | ✅ Yes |
| **Family Member** | Receives daily health reports via email | ❌ No (email-only) |

### Family Members (Report Recipients)

Family members **do NOT create accounts**. They are added as email recipients only:

1. Owner/Caregiver adds email via **Settings → Daily Report Recipients**
2. Family member receives **automated daily health email** at 7 PM PST
3. No login, no app access - just email notifications

**Legacy System (DISABLED):** The old `SuperAdminFamilyOverview` component that allowed family members to create accounts has been disabled. Code is preserved but commented out.

### Page Access by Role

| Page | Owner | Caregiver |
|------|-------|-----------|
| **Documents** (`/dashboard/documents`) | ✅ Upload/View/Delete | ❌ No access |
| **Shift Handoff** (`/dashboard/shift-handoff`) | ❌ Not shown | ✅ Full access |
| **Timesheet** (`/dashboard/timesheet`) | ✅ View all (different page) | ✅ Log own hours |
| **Caregiver Burnout** (`/dashboard/caregiver-burnout`) | ✅ Monitor team | ❌ No access |
| **Schedule** (`/dashboard/agency/schedule`) | ✅ Full access | ✅ View own shifts |
| **Alerts** (`/dashboard/alerts`) | ✅ Read-only | ✅ Read-only |

### Care Management Page Cards

| Card | Owner | Caregiver |
|------|-------|-----------|
| Documents | ✅ Shown | ❌ Hidden |
| Caregiver Burnout | ✅ Shown | ❌ Hidden |
| Alerts | ✅ Shown | ✅ Shown |
| Shift Handoff | ❌ Hidden | ✅ Shown |
| Timesheet | ❌ Hidden | ✅ Shown |
| Family Updates | ❌ Removed (automated) | ❌ Removed (automated) |

### Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/care-management/page.tsx` | Role-based card visibility |
| `src/app/dashboard/documents/page.tsx` | Owner-only document access |
| `src/app/dashboard/settings/page.tsx` | Report Recipients management |
| `src/components/agency/AgencyDashboard.tsx` | Legacy family overview disabled |

---

## Storage Quota & Downgrade Validation

**Implemented:** Jan 18, 2026

### Downgrade Validation Rules

| Resource | Validation | Enforcement |
|----------|------------|-------------|
| **Members** | Must fit target plan limit BEFORE downgrade | ❌ Hard block - must remove members first |
| **Storage** | Warning shown if over target limit | ⚠️ Soft block - can downgrade but access blocked |

### Storage Quota Enforcement (Post-Downgrade)

When a user downgrades to a plan with lower storage limits and exceeds the new limit:

| Action | When Under Quota | When Over Quota |
|--------|------------------|-----------------|
| Upload files | ✅ Allowed | ❌ Blocked |
| View/Download files | ✅ Allowed | ❌ Blocked |
| Analyze with AI | ✅ Allowed | ❌ Blocked |
| **Delete files** | ✅ Allowed | ✅ **Always Allowed** |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/firebase/storage.ts` | `checkStorageQuota()`, `checkStorageAccessAllowed()` |
| `src/lib/firebase/planLimits.ts` | `validateDowngrade()` - checks members & storage |
| `src/app/api/documents/route.ts` | Returns `storageInfo.isOverQuota` flag |
| `src/app/dashboard/documents/page.tsx` | UI blocking when over quota |
| `src/components/subscription/DowngradeBlockedModal.tsx` | Modal showing downgrade blockers |

### User Flow

1. User on Plan B (50 MB) tries to downgrade to Plan A (25 MB)
2. If members exceed Plan A limit → **Blocked**, must remove members first
3. If storage exceeds Plan A limit → **Warning shown**, can proceed
4. After downgrade with excess storage → Documents page shows red warning, upload/view/analyze disabled
5. User deletes files to get under 25 MB → Access restored automatically

### Storage Quota Test Results (Jan 18, 2026)

**Status:** ✅ ALL TESTS PASSED (18/18)

#### Backend Logic Tests (15/15)

| Plan | Under Quota | Near Quota (Exceeds) | Near Quota (Fits) | Over Quota | At Exact Quota |
|------|-------------|----------------------|-------------------|------------|----------------|
| Family Plan A (25 MB) | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS |
| Family Plan B (50 MB) | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS |
| Multi Agency (500 MB) | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS |

#### UI Behavior Tests (3/3)

| Test | Description | Result |
|------|-------------|--------|
| Over-quota warning banner | Red alert displayed with usage info | ✅ PASS |
| Upload button disabled | Shows "Storage Over Limit" when over quota | ✅ PASS |
| Delete action message | Shows amount needed to delete (e.g., "Delete 1.0 MB") | ✅ PASS |

#### Test Scripts

| Script | Purpose |
|--------|---------|
| `scripts/testStorageQuota.ts` | Automated quota enforcement tests |
| `scripts/fixStorageLimits.ts` | Fix existing user storage limits |

---

## Deployment URLs

| Environment | URL |
|-------------|-----|
| Production | https://myguide.health |
| Preview/Staging | https://myhealthguide.vercel.app |

---

## Vercel Environment Variables

All environment variables are configured in Vercel for all environments.

### Firebase Configuration
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Google Analytics ID |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | FCM Web Push VAPID key |
| `FIREBASE_ADMIN_CREDENTIALS_JSON` | Firebase Admin SDK service account JSON |

### Stripe Payment
| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe server-side secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client-side publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID` | Plan A price ID (client) |
| `NEXT_PUBLIC_STRIPE_SINGLE_AGENCY_PRICE_ID` | Plan B price ID (client) |
| `NEXT_PUBLIC_STRIPE_MULTI_AGENCY_PRICE_ID` | Plan C price ID (client) |
| `STRIPE_FAMILY_PRICE_ID` | Plan A price ID (server) |
| `STRIPE_SINGLE_AGENCY_PRICE_ID` | Plan B price ID (server) |
| `STRIPE_MULTI_AGENCY_PRICE_ID` | Plan C price ID (server) |

### AI Services
| Variable | Purpose | Last Updated |
|----------|---------|--------------|
| `GEMINI_API_KEY` | Google Gemini 3 Pro Preview (Primary AI) | Nov 15, 2025 |
| `ANTHROPIC_API_KEY` | Claude Opus 4.5 (Fallback AI) | Dec 8, 2025 |
| `VERTEX_AI_LOCATION` | Vertex AI region | Nov 30, 2025 |

### Google Cloud
| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLOUD_PROJECT_ID` | GCP project ID |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | GCP service account JSON |

### Application
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_NAME` | Application name |
| `NEXT_PUBLIC_APP_URL` | Production URL |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA/Turnstile site key |

### AI Fallback Order
1. **Primary:** Gemini 3 Pro Preview (`GEMINI_API_KEY`)
2. **Fallback:** Claude Opus 4.5 (`ANTHROPIC_API_KEY`)

If Gemini fails, the system automatically falls back to Claude for:
- Caregiver Burnout Analysis
- Medication Adherence Prediction
- Medication Refill Prediction
- Trend Change Detection
- Alert Prioritization

---

## Testing Workflow

```
1. FIX CODE → npm run build
2. PUSH → git add . && git commit && git push
3. WAIT → gh run list --limit 1
4. VERIFY → Claude Chrome extension
5. REPORT → PASS/FAIL for each test
```

---

## Claude Code Testing Commands

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

---

## Quick Checklist

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

---

## Production Status (v1.0.0)

**Launch Date:** January 11, 2026
**Status:** ✅ LIVE

- 230/230 tests passed (109 E2E + 65 RBAC + 18 Subscription + 7 Stripe Payment + 8 Sub Management + 6 Cancel Sub + 5 Billing Portal + 12 Trial Expiry)
- All 3 subscription plans live and verified
- HIPAA compliance verified
- SEO infrastructure complete
- RBAC security verified (Jan 17, 2026)
- Subscription limits verified (Jan 17, 2026)
- Storage quota & downgrade validation (Jan 18, 2026)
- Stripe payment error handling verified (Jan 18, 2026)
- Subscription management UI verified (Jan 18, 2026)
- Cancel subscription for trial users verified (Jan 18, 2026)
- Billing portal button visibility fix verified (Jan 19, 2026)
- Trial expiration blocking verified (Jan 19, 2026)
- Daily Family Notes email integration (Jan 20, 2026)
- UI/UX Overhaul - Claude.ai-inspired navigation (Jan 22, 2026)
- Twilio SMS disabled - FCM push notifications only (Jan 25, 2026)
- Calendar page 404 fix - removed broken notification button (Jan 25, 2026)
- Shift unfilled notification 404 fix - corrected actionUrl route (Jan 25, 2026)
- Shift Confirmation System with multi-channel notifications (Jan 25, 2026)
- Week Strip Schedule View - mobile-friendly schedule interface (Jan 25, 2026)
- Analytics Tab fixes - removed billing, fixed caregiver names, assignments chart (Jan 26, 2026)

---

## Notification System (Jan 25, 2026)

**Active Channels:**
- FCM Push Notifications (agency owners, caregivers)
- Email (daily family notes via Firebase Trigger Email)
- In-App Notifications (Firestore `user_notifications` collection)
- Dashboard Alerts (Firestore `alerts` collection)

**Disabled:**
- Twilio SMS (code preserved, credentials secured)
- SMS invites (replaced with offline invite code sharing)

**Bug Fixes (Jan 25, 2026):**
- `/dashboard/schedule` 404 → Changed to `/dashboard/agency/schedule` in shift unfilled notifications
- Files fixed: `shiftOfferNotifications.ts`, `shift-offer/decline/route.ts`

**Documentation:** See `docs/removetwilio.md` and `docs/skills.md`

---

## Shift Confirmation System (Jan 25, 2026)

**Status:** ✅ IMPLEMENTED

### Overview

Multi-channel notification system for shift assignments with caregiver confirmation workflow. Agency owners can assign shifts and track confirmation status; caregivers receive notifications and can confirm/decline.

### Notification Channels

| Channel | When Sent | Required |
|---------|-----------|----------|
| **Email** | Always (verified email) | ✅ Yes |
| **In-App** | Always (user_notifications) | ✅ Yes |
| **FCM Push** | If token available | Optional |

### Status Lifecycle

```
scheduled → pending_confirmation → confirmed/owner_confirmed/declined/expired/no_show
```

| Status | Description | Set By |
|--------|-------------|--------|
| `scheduled` | Initial status when shift created | System |
| `pending_confirmation` | After notification sent | System |
| `confirmed` | Caregiver confirmed | Caregiver |
| `owner_confirmed` | Owner marked as confirmed (phone/offline) | Owner |
| `declined` | Caregiver declined | Caregiver |
| `expired` | No response within deadline | System |
| `no_show` | Past start time with no check-in | System |

### Owner Actions

| Action | Location | Behavior |
|--------|----------|----------|
| **Notify Assignment** | Schedule page | Sends email + in-app + FCM to caregiver |
| **Mark Confirmed** | Today's Shifts card | Owner manually confirms (for phone/offline confirmations) |
| **View Status** | Today's Shifts card | See confirmation status with color-coded badges |

### Caregiver Actions

| Action | Location | Behavior |
|--------|----------|----------|
| **Confirm** | My Shifts page, Email link | Marks shift as confirmed, notifies owner |
| **Decline** | My Shifts page, Email link | Marks shift as declined, notifies owner with reason |

### Status Labels (User-Facing)

| Status | Display Label | Color |
|--------|---------------|-------|
| `pending_confirmation` | Awaiting Response | Amber |
| `scheduled` | Awaiting Response | Amber |
| `confirmed` | Confirmed | Green |
| `owner_confirmed` | Confirmed ✓ | Green |
| `in_progress` | In Progress | Blue |
| `completed` | Completed | Gray |
| `no_show` | No-Show | Red |
| `declined` | Declined | Red |
| `expired` | No Response | Gray |
| `cancelled` | Cancelled | Gray |

### Key Files

| File | Purpose |
|------|---------|
| `src/app/api/shifts/confirm/route.ts` | Confirm shift API (caregiver + owner) |
| `src/app/api/shifts/decline/route.ts` | Decline shift API |
| `src/app/api/shifts/notify-assignment/route.ts` | Send assignment notifications |
| `src/app/dashboard/my-shifts/page.tsx` | Caregiver pending shifts UI |
| `src/components/agency/TodaysShiftsList.tsx` | Owner Today's Shifts with Mark Confirmed |
| `src/app/dashboard/agency/schedule/page.tsx` | STATUS_CONFIG with new statuses |

### Email Template Features

- Professional HTML with mobile-responsive design
- Clear shift details (date, time, loved one)
- One-click Confirm/Decline buttons
- Deep links to `/dashboard/my-shifts?action=confirm&shiftId=xxx`
- 24-hour response reminder

### Firestore Schema Changes

```typescript
// scheduledShifts document
{
  status: 'pending_confirmation' | 'confirmed' | 'owner_confirmed' | 'declined' | 'expired' | 'no_show',
  confirmation: {
    requestedAt: Timestamp,
    requestedBy: string,  // userId who triggered notification
    respondedAt?: Timestamp,
    respondedVia?: 'app' | 'email' | 'owner_manual',
    response?: 'confirmed' | 'declined',
    declineReason?: string,
    remindersSent: number,
    notifications: {
      email: { sent: boolean, sentAt: Timestamp | null, error: string | null },
      inApp: { sent: boolean, sentAt: Timestamp | null },
      fcm: { sent: boolean, sentAt: Timestamp | null, error: string | null }
    }
  }
}
```

---

## Week Strip Schedule View (Jan 25, 2026)

**Status:** ✅ IMPLEMENTED

### Overview

Simplified schedule interface replacing the complex calendar view. Mobile-friendly "Week Strip + Day Expand" design that's easy to scan and act upon.

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `WeekStripSchedule` | `src/components/agency/schedule/WeekStripSchedule.tsx` | Main orchestrating component with Firestore listener |
| `WeekStrip` | `src/components/agency/schedule/WeekStrip.tsx` | Horizontal 7-day bar with coverage indicators |
| `DayShiftList` | `src/components/agency/schedule/DayShiftList.tsx` | Expandable accordion showing shifts per day |
| `ScheduleAlertsBanner` | `src/components/agency/schedule/ScheduleAlertsBanner.tsx` | Clickable alerts for gaps and unconfirmed shifts |

### Features

| Feature | Description |
|---------|-------------|
| Week Strip | 7-day horizontal bar with coverage bars (green/amber/red) |
| Day Expand | Click day to expand and see shifts |
| Coverage Stats | "X/Y confirmed" with visual progress bar |
| Gap Detection | Shows unfilled shifts with "Assign" button |
| Mark Confirmed | Owner can manually confirm shifts |
| Real-time | Firestore `onSnapshot` listener for live updates |
| Role-based | Super admin sees all shifts, caregivers see only their own |

### Routes Updated

All schedule-related routes now point to `/dashboard/agency/schedule`:
- `NeedsAttentionList.tsx` - 5 routes updated
- `ManageActionGrid.tsx` - 2 routes updated
- `TodaysShiftsList.tsx` - 1 route updated
- Agency dashboard Scheduling tab - uses `WeekStripSchedule`

### Replaced Component

The old `ShiftSchedulingCalendar` (month calendar with filters) has been replaced with `WeekStripSchedule` in:
- `/dashboard/agency?tab=scheduling` (agency dashboard tab)
- `/dashboard/agency/schedule` (standalone page)

---

## Schedule Assignment System (Jan 26, 2026)

**Status:** ✅ IMPLEMENTED (Phase 1, 1.5)
**Skill Documentation:** `.claude/skills/schedule-assignment/SKILL.md`

### Overview

"Copy + Adjust" workflow for weekly elder-caregiver assignments. Shows ALL 30 elders needing care with simple assignment tools, rather than complex auto-assignment algorithms.

### Caregiver Assignment Constraints

| Rule | Constraint | Enforcement |
|------|------------|-------------|
| **Daily Elder Limit** | Max 3 elders per caregiver per day | Hard block |
| **Time Slot Conflict** | Max 1 elder per 2-hour window | Hard block |

**Example Valid Schedule (staggered shifts):**
```
Caregiver 1 → Elder A: 9:00 AM - 11:30 AM
Caregiver 1 → Elder B: 11:30 AM - 2:00 PM
Caregiver 1 → Elder C: 2:00 PM - 4:30 PM
```

**Invalid (same time slot):**
```
Caregiver 1 → Elder A: 9:00 AM - 5:00 PM
Caregiver 1 → Elder B: 9:00 AM - 5:00 PM  ← CONFLICT!
```

### Why Copy + Adjust (Not Auto-Assign)

| What System Knows | What Owner Knows (Offline) |
|-------------------|---------------------------|
| Caregiver max load (3 elders) | Caregiver texted - sick tomorrow |
| Previous assignments | Caregiver doesn't get along with Elder X |
| Basic time slots | Elder 8 lives 45 mins from Elder 3 |
| Nothing about distance | Caregiver 1 prefers morning shifts only |

**The owner always knows more than the system.** So we make manual assignment fast and easy.

### Completed Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Gap Detection (show ALL elders) | ✅ Complete |
| 1.5 | Click-to-Assign for unfilled shifts | ✅ Complete |

### Future Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1.6 | Fix test data seeding (realistic shifts) | Pending |
| 2 | Elder-Centric Day List with checkboxes | Pending |
| 3 | Bulk Assignment | Pending |
| 4 | Copy Last Week | Pending |
| 5 | Caregiver Availability | Pending |
| 6 | Conflict Detection & Constraint Validation | Pending |

### Key Files

| File | Purpose |
|------|---------|
| `.claude/skills/schedule-assignment/SKILL.md` | Full skill documentation |
| `.claude/skills/schedule-assignment/PLAN.md` | Implementation plan with phases |
| `.claude/skills/schedule-assignment/scripts/seedWeeklyShifts.ts` | Test data seeding script |

### Test Data

Run seeding script to create test shifts:
```bash
npx ts-node --project tsconfig.scripts.json .claude/skills/schedule-assignment/scripts/seedWeeklyShifts.ts
```

Creates 180 shifts (30 elders x 6 days) with staggered time slots respecting constraints.

---

## Daily Family Notes - Email Integration

**Added:** Jan 20, 2026

### Overview

Daily Family Notes now sends **email** in addition to FCM push notifications via the Firebase Trigger Email extension.

### How It Works

1. Scheduled Cloud Function runs at 7 PM PST (with 8 PM and 9 PM fallbacks)
2. For each elder with activity, generates a daily report
3. For each group member:
   - Creates in-app notification (user_notifications collection)
   - Queues FCM push notification (fcm_notification_queue collection)
   - **NEW:** Writes email to `mail` collection (Trigger Email extension sends it)

### Email Features

| Feature | Implementation |
|---------|---------------|
| Template | Mobile-responsive HTML with inline CSS |
| Logo | Uses favicon-32x32.png from production URL |
| Brand Colors | Blue (#2563eb) primary, professional styling |
| Content | Medications (taken/missed), Supplements, Meals, Active Alerts |
| CTA | "View Full Details" button links to /dashboard/activity |
| Footer | Unsubscribe link to /dashboard/settings |

### Email Subject Format

```
Daily Care Update for {Elder Name} - {Day, Month Date, Year}
```

Example: `Daily Care Update for Mom - Monday, January 20, 2026`

### Missing Email Handling

- If user has no email on file: Logs "Skipping email for user X - no email on file"
- FCM notification still sent regardless of email status
- Email errors are caught and logged, don't break the function

### Key Files

| File | Purpose |
|------|---------|
| `functions/src/index.ts` | processDailyFamilyNotes function, email template |
| `generateDailyReportEmailHTML()` | HTML email template generator |
| `formatDateForEmail()` | Date formatting for email subject |

### Testing

```bash
# Deploy functions
firebase deploy --only functions

# Test by creating a test email document
npx tsx scripts/testTriggerEmail.ts

# Manually trigger for testing (Firebase Console > Functions > sendDailyFamilyNotes > Run)
```

### Firestore Collections

| Collection | Purpose |
|------------|---------|
| `mail` | Email queue (Trigger Email extension reads from here) |
| `daily_family_notes` | Stores daily note summaries |
| `user_notifications` | In-app notifications |
| `fcm_notification_queue` | FCM push notification queue |

---

## Phase 14 - UI/UX Overhaul (Claude.ai-Inspired Navigation)

**Added:** Jan 22, 2026
**Reference Documents:** `docs/Jan22_UpdatePrompt_v1.md`, `docs/Jan22_UpdatedPrompt_v2.md`
**Design Mockups:** `docs/mockups/` (5 SVG files)
**Status:** ✅ COMPLETE

### Overview

Complete navigation and dashboard redesign inspired by Claude.ai's minimal UI pattern. Replaces the traditional sidebar + header with a responsive icon rail (desktop) and bottom nav (mobile), adds a task priority engine, auto-suggestions, and agency-specific views.

### Phases Completed

| Phase | Description | Key Files |
|-------|-------------|-----------|
| 1 | Navigation Layout | BottomNav, IconRail, MinimalHeader, MoreMenuDrawer, layout.tsx |
| 2 | Task Prioritization Engine | taskPriorityEngine, TaskPriorityContext, useTaskPriority |
| 3 | Priority Card UI | PriorityCard, DayProgress |
| 4 | Auto-Suggest System | suggestionEngine, useSuggestions, SuggestionBanner |
| 5 | Agency Views | ElderTabSelector, ShiftInfoBar |

### New Files Created (14 total)

| File | Purpose |
|------|---------|
| `src/components/navigation/BottomNav.tsx` | Mobile bottom navigation (role-based items) |
| `src/components/navigation/IconRail.tsx` | 56px desktop left rail with tooltips |
| `src/components/navigation/MinimalHeader.tsx` | 48px sticky header with notifications/avatar |
| `src/components/navigation/MoreMenuDrawer.tsx` | Bottom sheet (mobile) / side panel (desktop) |
| `src/lib/prioritization/taskPriorityEngine.ts` | Task status calculation and prioritization logic |
| `src/contexts/TaskPriorityContext.tsx` | React context providing prioritized task data |
| `src/hooks/useTaskPriority.ts` | Consumer hooks for task priority state |
| `src/components/dashboard/PriorityCard.tsx` | Hero card showing next/overdue task with actions |
| `src/components/dashboard/DayProgress.tsx` | Horizontal progress bar with completion stats |
| `src/lib/suggestions/suggestionEngine.ts` | Context-based suggestion rules engine |
| `src/hooks/useSuggestions.ts` | Suggestion visibility and trigger management |
| `src/components/dashboard/SuggestionBanner.tsx` | Chip-style suggestion UI with dismiss |
| `src/components/agency/ElderTabSelector.tsx` | Horizontal scrollable tabs for elder switching |
| `src/components/agency/ShiftInfoBar.tsx` | Active shift timer with ending-soon warning |

### Modified Files

| File | Changes |
|------|---------|
| `src/app/dashboard/layout.tsx` | Replaced Sidebar/DashboardHeader with new nav, added TaskPriorityProvider |
| `src/app/dashboard/page.tsx` | Added PriorityCard, DayProgress, ElderTabSelector, ShiftInfoBar |

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Client-side only (no Firestore schema changes) | Preserves existing data layer, zero migration risk |
| Offline-aware medication logging | Uses existing `logMedicationDoseOfflineAware` |
| ±30min log matching window | Prevents duplicate logging for same scheduled time |
| ±15min due window | Task is "due now" within 15 minutes of scheduled time |
| Role-based navigation items | Different nav for Family, Caregiver, Owner roles |
| No toast library | Inline feedback to avoid new dependency |
| 60-second refresh interval | Balances freshness with Firestore read efficiency |

### Navigation by Role

| Role | Bottom Nav Items | Icon Rail Items |
|------|-----------------|-----------------|
| Family (Plan A/B) | Home, Reports, Ask AI, More | Home, Reports, Medications, Supplements, Care Logs, Ask AI |
| Agency Caregiver | Home, Schedule, Reports, Ask AI, More | Home, Schedule, Reports, Medications, Supplements, Care Logs, Ask AI |
| Agency Owner | Home, Team, Schedule, Reports, More | Home, Team, Schedule, Reports, Analytics, Timesheets |

### Task Priority States

| Status | Criteria | Visual |
|--------|----------|--------|
| `overdue` | >15min past scheduled time, no log | Red card with alert icon |
| `due_now` | Within ±15min of scheduled time | Blue card with clock icon |
| `upcoming` | Scheduled later today | Gray card, no action buttons |
| `completed` | Log found within ±30min window | Hidden from priority card |
| `skipped` | Skip log found | Hidden from priority card |

---

## Agency Analytics Tab (Jan 26, 2026)

**Status:** ✅ UPDATED

### Overview

Cleaned up Analytics tab for Multi-Agency SuperAdmins. Removed billing-related metrics (no agency billing rates configured) and fixed caregiver name display issues.

### Changes Made

| Change | Description |
|--------|-------------|
| **Grid cols fixed** | Tab list changed from 5 cols to 4 cols (billing removed) |
| **Revenue Projection removed** | MonthSummaryCards now shows 3 cards instead of 4 |
| **BillableHoursChart replaced** | New `AssignmentsOverviewChart` shows caregiver/elder counts by month |
| **Caregiver names fixed** | Uses `/api/agency/caregiver-names` API (same as Scheduling tab) |
| **Ratings/Compliance hidden** | Removed placeholder values from PerformanceLeaderboard |

### Current Analytics Components

| Component | What It Shows | Status |
|-----------|---------------|--------|
| **MonthSummaryCards** | Total Hours, Avg Per Day, Fill Rate (3 cards) | ✅ Active |
| **AssignmentsOverviewChart** | Bar chart - caregivers vs loved ones by month | ✅ Active |
| **StaffUtilizationChart** | Caregiver utilization % with names | ✅ Active |
| **BurnoutAlertPanel** | At-risk caregivers (from API) | ✅ Active |
| **ScheduleCoverageChart** | Weekly coverage by day | ✅ Active |
| **PerformanceLeaderboard** | Hours worked, No-Shows | ❌ Commented out |

### Key Files

| File | Purpose |
|------|---------|
| `src/components/agency/analytics/AgencyAnalyticsDashboard.tsx` | Main dashboard, API-based name fetching |
| `src/components/agency/analytics/AssignmentsOverviewChart.tsx` | NEW - Caregiver/Elder bar chart |
| `src/components/agency/analytics/MonthSummaryCards.tsx` | 3 summary cards (revenue removed) |
| `src/components/agency/analytics/PerformanceLeaderboard.tsx` | Hours + No-Shows only |
| `src/lib/firebase/agencyAnalytics.ts` | Added `getAssignmentsOverviewData()` |

### What's Disabled (Re-enable Later)

| Feature | Status | Note |
|---------|--------|------|
| **PerformanceLeaderboard** | ❌ Commented out | Requires real ratings/compliance data |
| Ratings | Not implemented | Need owner feedback/rating system |
| Compliance | Not implemented | Need medication adherence, on-time tracking |
| No-Shows | ✅ Real data | Counted from `shift.status === 'no_show'` |

### Sync Permissions Button (Overview Tab)

The "Sync Permissions" button in the Overview tab calls `AgencyService.syncAllCaregiverAssignments()`. It:
- Syncs all caregiver assignments to group members
- Ensures caregivers have proper write access to their assigned groups
- Useful for migrating existing assignments or fixing permission issues
- Records `lastCaregiverSyncAt` timestamp on agency document
