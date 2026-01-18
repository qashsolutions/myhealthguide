# MyHealthGuide - Claude Code Instructions

- Review the documents. Build prod ready files, do not add To-Dos. Do not assume - ask me when in doubt.
- Today is Jan 17, 2026.
- The firebase config will not work in local.

## Related Documentation

| File | Contents |
|------|----------|
| `CLAUDE-ARCHITECTURE.md` | Technical systems (AI, Auth, Firestore, Navigation, Testing) |
| `CLAUDE-HISTORY.md` | Completed phases, changelogs, test results |

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

- 199/199 tests passed (109 E2E + 65 RBAC + 18 Subscription + 7 Stripe Payment)
- All 3 subscription plans live and verified
- HIPAA compliance verified
- SEO infrastructure complete
- RBAC security verified (Jan 17, 2026)
- Subscription limits verified (Jan 17, 2026)
- Storage quota & downgrade validation (Jan 18, 2026)
- Stripe payment error handling verified (Jan 18, 2026)
