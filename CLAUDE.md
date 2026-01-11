# MyHealthGuide - Claude Code Instructions

- Review the documents. Build prod ready files, do not add To-Dos. Do not assume - ask me when in doubt.
- Today is Jan 11, 2026.
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

| Plan | Price | Trial | Elders | Caregivers | Members |
|------|-------|-------|--------|------------|---------|
| **Plan A** (Family) | $8.99/mo | 45 days | 1 | 1 (admin) | 1 (read-only) |
| **Plan B** (Family) | $18.99/mo | 45 days | 1 | 1 (admin) | 3 (read-only) |
| **Plan C** (Multi Agency) | $55/elder/mo | 30 days | 3/caregiver | 10 max | 2/elder (read-only) |

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

- 109/109 tests passed
- All 3 subscription plans live
- HIPAA compliance verified
- SEO infrastructure complete
