# Agency Bugs Found - Refactor 12

**Date:** January 13, 2026
**Tester:** Claude Code AI

---

## Bug Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| Critical | 0 | 0 |
| High | 3 | **3** |
| Medium | 2 | **2** |
| Low | 1 | **1** |
| **Total** | **6** | **6** |

---

## Bugs

### BUG-001: Family Member Can Upload Documents

**Feature Area:** Documents / RBAC
**Severity:** High
**Status:** ✅ FIXED

**Steps to Reproduce:**
1. Login as Family Member (ramanac+c1m1@gmail.com)
2. Navigate to Care Management
3. Click "Documents" → Open
4. Observe "Upload Document" button is visible and accessible

**Expected Behavior:**
Family Members should have READ-ONLY access. The "Upload Document" button should be hidden or disabled.

**Actual Behavior:**
Family Member can see and potentially click "Upload Document" button.

**Screenshots/Notes:**
- Page URL: /dashboard/documents
- Button visible in top-right corner (blue button)
- Also shows "Upload Your First Document" button in empty state

**Fix Applied:**
Added `isReadOnly` check based on `user?.agencies?.[0]?.role === 'family_member'`. Hidden upload buttons and delete button for family members. File: `src/app/dashboard/documents/page.tsx`

---

### BUG-002: Family Member Can Generate Family Updates

**Feature Area:** Family Updates / RBAC
**Severity:** High
**Status:** ✅ FIXED

**Steps to Reproduce:**
1. Login as Family Member (ramanac+c1m1@gmail.com)
2. Navigate to Care Management → Family Updates
3. Observe "Generate New Report" button is visible

**Expected Behavior:**
Family Members should RECEIVE family update reports, not generate them. The generate functionality should be Caregiver/Admin only.

**Actual Behavior:**
Family Member has access to "Generate New Report" and "Generate First Report" buttons.

**Screenshots/Notes:**
- Page URL: /dashboard/family-updates
- Both buttons are visible (green and purple)
- This feature is designed for caregivers to send TO family members

**Fix Applied:**
Added `isReadOnly` check based on `user?.agencies?.[0]?.role === 'family_member'`. Hidden "Generate New Report" button in header, "Generate First Report" in empty state, Edit button, and Send Report section for family members. Updated info card text to explain view-only access. File: `src/app/dashboard/family-updates/page.tsx`

---

### BUG-003: Shift-Caregiver Data Linkage Issue

**Feature Area:** Shift Management
**Severity:** Medium
**Status:** ✅ FIXED

**Steps to Reproduce:**
1. Login as Agency Owner (ramanac+owner@gmail.com)
2. Go to Agency Management → Scheduling
3. Create a shift for "Caregiver 1" with LO-C1-1
4. Logout
5. Login as Caregiver (ramanac+c1@gmail.com)
6. Go to Shift Handoff page

**Expected Behavior:**
The shift created for "Caregiver 1" should appear in the caregiver's Shift Handoff page.

**Actual Behavior:**
Shift Handoff shows "No Shift Scheduled" and Clock In is "Not Available".

**Screenshots/Notes:**
- The seeded "Caregiver 1" user in Agency Management appears to be a different user record than the test account ramanac+c1@gmail.com
- This is a data architecture/linkage issue between seeded agency caregivers and actual user accounts

**Fix Applied:**
Created `scripts/fixCaregiverDataLinkage.ts` script that:
1. Looks up current Firebase UIDs for all test account emails
2. Updates `caregiver_assignments` with correct UIDs
3. Updates `scheduledShifts` with correct UIDs
4. Updates `shiftSessions` with correct UIDs
Run with: `npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fixCaregiverDataLinkage.ts`

---

### BUG-004: Agency Owner Timesheet Shows Caregiver View

**Feature Area:** Timesheet Management
**Severity:** Medium
**Status:** ✅ FIXED

**Steps to Reproduce:**
1. Login as Agency Owner (ramanac+owner@gmail.com)
2. Navigate to /dashboard/timesheet

**Expected Behavior:**
Agency Owner should see an administrative view with:
- List of all caregivers' timesheets
- Pending approval queue
- Approve/Reject buttons

**Actual Behavior:**
Shows the caregiver timesheet view with:
- "My Shifts" toggle
- Personal summary (0 shifts, 0 hours)
- Weekly submission form

**Screenshots/Notes:**
- No timesheet approval workflow exists
- Agency Owners need a different view to manage caregiver timesheets

**Fix Applied:**
1. Fixed API typo: Changed `'superadmin'` to `'super_admin'` in timesheet route.ts role checks (also added `'caregiver_admin'` support)
2. Added admin view to timesheet page for `super_admin` and `caregiver_admin` roles:
   - Shows "Timesheet Management" header
   - Displays "Pending Timesheet Approvals" card with count badge
   - Lists all pending submissions with caregiver name, week, hours, shifts
   - Approve/Reject buttons with loading states
Files: `src/app/api/timesheet/route.ts`, `src/app/dashboard/timesheet/page.tsx`

---

### BUG-005: No Logout Button in Settings

**Feature Area:** Settings / Navigation
**Severity:** Low
**Status:** ✅ FIXED

**Steps to Reproduce:**
1. Login to any account
2. Navigate to Settings
3. Check Security & Activity section
4. Scroll through entire settings page

**Expected Behavior:**
A logout button should be easily accessible in Settings or profile menu.

**Actual Behavior:**
No logout button found. User must navigate directly to /login to be logged out.

**Screenshots/Notes:**
- Workaround: Navigate to /login directly
- Profile icon click doesn't show dropdown menu
- Security section only has password change and delete account

**Fix Applied:**
Added "Sign Out" button to the settings page sidebar at the bottom below the Advanced section. Button uses red styling to indicate it's a destructive/sign-out action with a loading state during logout. Uses the `signOut` function from `useAuth()`. File: `src/app/dashboard/settings/page.tsx`

---

### BUG-006: Family Member Can Access Timesheet Page

**Feature Area:** Timesheet / RBAC
**Severity:** High
**Status:** ✅ FIXED

**Steps to Reproduce:**
1. Login as Family Member (ramanac+c1m1@gmail.com)
2. Navigate directly to /dashboard/timesheet

**Expected Behavior:**
Family Members should not have access to the Timesheet page. Should show "Access Denied" or redirect.

**Actual Behavior:**
Family Member can access the full Timesheet page showing:
- My Shifts / Elder Shifts toggle
- Summary section
- Submit Weekly Timesheet option
- Shift History

**Screenshots/Notes:**
- Page URL: /dashboard/timesheet
- The "Submit Weekly Timesheet" feature is caregiver-specific
- Family Members should only view care reports, not manage timesheets

**Fix Applied:**
Added access block for family members. When `user?.agencies?.[0]?.role === 'family_member'`, the page now shows "Caregiver Access Required" message with Lock icon instead of the timesheet interface. Explains that this feature is only for agency caregivers and administrators. File: `src/app/dashboard/timesheet/page.tsx`

---

## Negative Test Results

### Routes Properly Blocked for Family Member:
| Route | Result |
|-------|--------|
| /dashboard/agency-management | 404 (Blocked) |
| /dashboard/elder-profile | Access Denied message |
| /dashboard/shift-handoff | "Caregiver Access Required" message |

### Routes Improperly Accessible:
| Route | Result |
|-------|--------|
| /dashboard/timesheet | Full access (should be blocked) |
| /dashboard/documents | Can upload (should be view-only) |
| /dashboard/family-updates | Can generate reports (should be view-only) |

---

## Feature Gaps (Not Bugs)

These are missing features, not bugs in existing functionality:

1. **Add New Caregiver** - No invite/add caregiver feature exists
2. **Timesheet Approval Workflow** - No approve/reject buttons for Agency Owner
3. **Caregiver Profile Page** - No detailed view of individual caregivers
4. **Shift Coverage Request** - Feature not implemented
5. **Recent Activity Feed** - No activity section on Agency dashboard
6. **Available Shifts View** - Caregivers cannot see/claim open shifts
