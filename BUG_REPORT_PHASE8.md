# Phase 8 Bug Report

**Test Date:** January 11, 2026
**Application:** MyHealthGuide (myguide.health)

---

## Critical Bugs (P0 - Must Fix Before Launch)

*No critical bugs found yet*

---

## High Priority Bugs (P1 - Should Fix Before Launch)

### BUG-001: Plan A Elder Limit Not Enforced at Navigation Level

**Priority:** P1
**Category:** RBAC / Subscription Limits
**Status:** Fixed

**Steps to Reproduce:**
1. Login as Family Plan A user (ramanac+a1@gmail.com)
2. User already has 1 elder (at Plan A limit of 1)
3. Click "+ Add Loved One" button on dashboard

**Expected Result:**
User should see an upgrade prompt indicating they've reached their plan limit and need to upgrade to add more loved ones.

**Actual Result:**
User is taken to the full "Add New Loved One" form with no limit warning. The form appears fully functional.

**Screenshot/Evidence:**
Form visible at /dashboard/elders/new despite being at limit.

**Impact:**
Users may fill out the entire form only to be blocked at submission (if limit is enforced there), leading to poor UX. Or worse, if not enforced at all, data integrity issue.

**Suggested Fix:**
Check elder count against plan limit in the `/dashboard/elders/new` page component and redirect to upgrade page if at limit.

**Fix Applied:**
Added plan limit check to `/src/app/dashboard/elders/new/page.tsx`:
- Imported `canCreateElder` from `@/lib/firebase/planLimits`
- Added `useEffect` to check plan limits on component mount
- Shows loading state while checking limits
- If at limit (`allowed: false`), displays amber-colored "Plan Limit Reached" card with:
  - Current/limit count display
  - "View Plans" button linking to /pricing
  - "Return to Dashboard" button
- Only shows full form if plan limit check passes

**Verified By:** Claude Code
**Verified Date:** January 11, 2026

---

### BUG-002: Phone Authentication Fails with Permissions Error for New Users

**Priority:** P1
**Category:** Authentication / Phone Auth
**Status:** Fixed

**Steps to Reproduce:**
1. Go to /phone-login
2. Enter test phone number 555-555-0100 (configured in Firebase Console)
3. Click "Send Verification Code"
4. Enter verification code 123456
5. Click "Verify & Sign In"

**Expected Result:**
For new phone users, should redirect to /phone-signup to complete profile.

**Actual Result:**
Error displayed: "Missing or insufficient permissions"
Console shows: "Error fetching user data: Missing or insufficient permissions"

**Root Cause:**
Race condition between Firebase Auth and Firestore. After phone verification:
1. Firebase Auth is updated with new user
2. Code immediately tries to read Firestore user document
3. Firestore client hasn't received the new auth token yet
4. Firestore security rules deny access

**Fix Applied:**
Three-part fix:

1. **auth.ts - signInWithPhone()**: Added token refresh and delay:
   - `await firebaseUser.getIdToken(true)` - Force token refresh
   - 300ms delay for auth state propagation
   - Catch permissions errors and treat as "new user"

2. **phone-login/page.tsx**: Enhanced error handling:
   - Check for both "User data required" and "permission" errors
   - Redirect both to phone-signup for profile completion

3. **phone-signup/page.tsx**: Added complete_profile flow:
   - Detect if user redirected from phone-login (already authenticated)
   - Show simplified form that just collects name
   - New `handleCompleteProfile()` function
   - New `createPhoneUser()` method in AuthService

**Files Modified:**
- `src/lib/firebase/auth.ts`
- `src/app/(auth)/phone-login/page.tsx`
- `src/app/(auth)/phone-signup/page.tsx`

**Verification Notes:**
- Test phone number +1 555-555-0100 with code 123456
- Verification code step works correctly
- Instead of "Missing or insufficient permissions" error, user is now redirected to phone-signup
- Phone-signup shows "Complete your profile" with green "Phone verified" badge
- First/Last name form displayed correctly

**Verified By:** Claude Code
**Verified Date:** January 11, 2026

---

## Medium Priority Bugs (P2 - Fix Soon After Launch)

*No medium priority bugs found yet*

---

## Low Priority Bugs (P3 - Nice to Have)

### BUG-003: Plan Limit Message Shows "Plan A" for All Plans

**Priority:** P3
**Category:** UI / Display
**Status:** Fixed

**Steps to Reproduce:**
1. Login as Family Plan B user (ramanac+b1@gmail.com)
2. Navigate to /dashboard/elders/new (Add Loved One page)
3. User already has 1 elder (at Plan B limit of 1)

**Expected Result:**
Message should say "Family Plan B is limited to 1 elder per group"

**Actual Result:**
Message says "Family Plan A is limited to 1 elder per group" even though the user is on Plan B.

**Root Cause:**
In `getUserTier()` function in `planLimits.ts`, the code was returning `'family'` for ALL trial users regardless of their actual subscription tier. This caused the message to always display "Family Plan A".

**Fix Applied:**
Updated `src/lib/firebase/planLimits.ts` - `getUserTier()` function:
- Now checks `userData.subscriptionTier` for trial users first
- Only falls back to `'family'` if no tier is set
- This ensures the correct plan name is displayed (e.g., "Family Plan B" for single_agency tier)

**Commit:** d88dd11

**Verified By:** Claude Code
**Verified Date:** January 11, 2026

---

## Bug Template

```
### BUG-XXX: [Title]

**Priority:** P0/P1/P2/P3
**Category:** Auth/RBAC/UI/Security/etc.
**Status:** Open/In Progress/Fixed/Verified

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**

**Actual Result:**

**Screenshot/Evidence:**

**Fix Applied:**

**Verified By:**
**Verified Date:**
```

---

## Summary

| Priority | Count | Fixed | Pending |
|----------|-------|-------|---------|
| P0 Critical | 0 | 0 | 0 |
| P1 High | 2 | 2 | 0 |
| P2 Medium | 0 | 0 | 0 |
| P3 Low | 1 | 1 | 0 |
| **Total** | **3** | **3** | **0** |
