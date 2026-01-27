# MyHealthGuide - Claude Code Instructions

- Review the documents. Build prod ready files, do not add To-Dos. Do not assume - ask me when in doubt.
- Today is Jan 26, 2026.
- See `docs/skills.md` for detailed system capabilities and notification flows.
- The firebase config will not work in local.

---

## Index

1. [Related Documentation](#related-documentation)
2. [Quick Reference](#quick-reference)
   - [Key Constraints](#key-constraints)
   - [Terminology Rules](#terminology-rules)
   - [Testing Workflow](#testing-workflow)
   - [Quick Checklist](#quick-checklist)
3. [Subscription Plans](#subscription-plans)
4. [Multi-Agency System](#multi-agency-system)
   - [Roles & Permissions](#roles--permissions)
   - [Caregiver Invite System](#caregiver-invite-system)
   - [Analytics Tab](#analytics-tab)
   - [Storage Quota](#storage-quota--downgrade-validation)
   - [Disabled Features](#disabled-features) (Care section, Insights section, Timesheets, Elders for owners, Documents simplified)
   - [Caregiver Burnout Page](#caregiver-burnout-page)
5. [Features](#features)
   - [Notification System](#notification-system)
   - [Shift Confirmation System](#shift-confirmation-system)
   - [Week Strip Schedule View](#week-strip-schedule-view)
   - [Schedule Assignment System](#schedule-assignment-system)
   - [Daily Family Notes Email](#daily-family-notes---email-integration)
   - [Phase 14 UI/UX Overhaul](#phase-14---uiux-overhaul)
6. [Testing Results](#testing-results)
   - [RBAC Testing (Phase 12)](#phase-12---rbac-testing-complete)
   - [Subscription Testing (Phase 13)](#phase-13---subscription-testing-complete)
7. [Deployment & Environment](#deployment--environment)
   - [Deployment URLs](#deployment-urls)
   - [Environment Variables](#vercel-environment-variables)
   - [Claude Code Commands](#claude-code-testing-commands)
8. [Production Status](#production-status)

---

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

## Quick Reference

### Key Constraints

**DO NOT MODIFY:**
- Authentication logic
- API calls or data fetching
- Payment/subscription flows
- Database queries
- Service worker / PWA config
- Variable names (elderId, elderData, etc.)

### Terminology Rules

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

### Testing Workflow

```
1. FIX CODE → npm run build
2. PUSH → git add . && git commit && git push
3. WAIT → gh run list --limit 1
4. VERIFY → Claude Chrome extension
5. REPORT → PASS/FAIL for each test
```

### Quick Checklist

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

## Subscription Plans

| Plan | Price | Trial | Elders | Caregivers | Members | Storage |
|------|-------|-------|--------|------------|---------|---------|
| **Plan A** (Family) | $8.99/mo | 45 days | 1 | 1 (admin) | 1 (read-only) | 25 MB |
| **Plan B** (Family) | $18.99/mo | 45 days | 1 | 1 (admin) | 3 (read-only) | 50 MB |
| **Plan C** (Multi Agency) | $55/elder/mo | 30 days | 3/caregiver | 10 max | 2/elder (read-only) | 500 MB |

---

## Multi-Agency System

### Roles & Permissions

**Updated:** Jan 26, 2026

#### Roles

| Role | Description | Can Login? |
|------|-------------|------------|
| **Owner** | Agency owner (super admin) - manages caregivers, elders, scheduling | ✅ Yes |
| **Caregiver** | Care provider - handles shifts, logs care activities | ✅ Yes |
| **Family Member** | Receives daily health reports via email | ❌ No (email-only) |

#### Family Members (Report Recipients)

Family members **do NOT create accounts**. They are added as email recipients only:

1. Owner/Caregiver adds email via **Settings → Daily Report Recipients**
2. Family member receives **automated daily health email** at 7 PM PST
3. No login, no app access - just email notifications

**Legacy System (DISABLED):** The old `SuperAdminFamilyOverview` component that allowed family members to create accounts has been disabled. Code is preserved but commented out.

#### Page Access by Role

| Page | Owner | Caregiver |
|------|-------|-----------|
| **Documents** (`/dashboard/documents`) | ✅ Upload/View/Delete | ❌ No access |
| **Shift Handoff** (`/dashboard/shift-handoff`) | ❌ Not shown | ✅ Full access |
| **Timesheet** (`/dashboard/timesheet`) | ⏸️ DISABLED | ⏸️ DISABLED |
| **Elders** (`/dashboard/elders`) | ⏸️ Redirects to /agency | ✅ View assigned elders |
| **Caregiver Burnout** (`/dashboard/caregiver-burnout`) | ✅ Monitor team | ❌ No access |
| **Schedule** (`/dashboard/agency/schedule`) | ✅ Full access | ✅ View own shifts |
| **Alerts** (`/dashboard/alerts`) | ⏸️ HIDDEN (uses groups) | ✅ View assigned elders |
| **Analytics** (`/dashboard/analytics`) | ⏸️ HIDDEN (not actionable) | ✅ View assigned elders |

#### Care Management Page Cards

| Card | Owner | Caregiver |
|------|-------|-----------|
| Documents | ✅ Shown | ❌ Hidden |
| Caregiver Burnout | ✅ Shown | ❌ Hidden |
| Alerts | ✅ Shown | ✅ Shown |
| Shift Handoff | ❌ Hidden | ✅ Shown |
| Timesheet | ⏸️ DISABLED | ⏸️ DISABLED |
| Family Updates | ❌ Removed (automated) | ❌ Removed (automated) |

---

### Caregiver Invite System

**Updated:** Jan 26, 2026
**Status:** ✅ IMPLEMENTED (No SMS)

#### Overview

Offline shareable invite links for adding caregivers to an agency. SMS has been disabled - owners share invite links manually (copy, share button, verbally, text message outside the app).

#### Invite Flow

```
1. Owner clicks "Invite New Caregiver" in Agency Dashboard
2. Enters caregiver's phone number (for OTP verification at signup)
3. Clicks "Create Invite" → Gets shareable link
4. Owner shares link OFFLINE (copy, share button, verbally, text)
5. Caregiver visits link → /caregiver-invite?token=xxx
6. Caregiver creates account, verifies phone (Firebase OTP) + email
7. Caregiver is linked to agency (status: pending_approval)
8. Owner approves caregiver → Assigns elders
```

#### Why Phone Number is Required

- Phone is NOT for SMS (SMS is disabled)
- Phone is verified via **Firebase OTP** at signup
- Ensures only the intended person can use the invite
- Caregiver must sign up with the **exact phone number** on the invite

#### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/agency/caregiver-invite` | Create invite (returns shareable URL) |
| `GET` | `/api/agency/caregiver-invite?agencyId=x&superAdminId=y` | List invites for agency |
| `DELETE` | `/api/agency/caregiver-invite` | Cancel invite |
| `GET` | `/api/caregiver-invite/verify?token=x` | Verify invite token (landing page) |
| `POST` | `/api/caregiver-invite/accept` | Accept invite (link caregiver to agency) |

#### Firestore Collection: `caregiver_invites`

```typescript
{
  id: string,
  agencyId: string,
  superAdminId: string,        // Owner who created invite
  phoneNumber: string,         // +1XXXXXXXXXX format
  inviteToken: string,         // 64-char hex token
  inviteUrl: string,           // Full URL for sharing
  status: 'pending' | 'accepted' | 'expired' | 'cancelled',
  createdAt: Timestamp,
  expiresAt: Timestamp,        // 7 days from creation
  acceptedAt?: Timestamp,
  acceptedByUserId?: string
}
```

#### Key Files

| File | Purpose |
|------|---------|
| `src/app/api/agency/caregiver-invite/route.ts` | Create/List/Cancel invites (NEW) |
| `src/app/api/caregiver-invite/verify/route.ts` | Verify invite token |
| `src/app/api/caregiver-invite/accept/route.ts` | Accept invite, link to agency |
| `src/app/(auth)/caregiver-invite/page.tsx` | Landing page for invite links |
| `src/components/agency/CaregiverInviteManager.tsx` | UI for creating/managing invites |

#### Disabled: SMS Invites

The old SMS-based invite system (`/api/sms/send-invite`) is disabled. See `docs/removetwilio.md` for details.

---

### Analytics Tab

**Updated:** Jan 26, 2026

#### Overview

Cleaned up Analytics tab for Multi-Agency SuperAdmins. Removed billing-related metrics (no agency billing rates configured) and fixed caregiver name display issues.

#### Current Analytics Components

| Component | What It Shows | Status |
|-----------|---------------|--------|
| **MonthSummaryCards** | Total Hours, Avg Per Day, Fill Rate (3 cards) | ✅ Active |
| **AssignmentsOverviewChart** | Bar chart - caregivers vs loved ones by month | ✅ Active |
| **StaffUtilizationChart** | Caregiver utilization % with names | ✅ Active |
| **BurnoutAlertPanel** | At-risk caregivers (from API) | ✅ Active |
| **ScheduleCoverageChart** | Weekly coverage by day | ✅ Active |
| **PerformanceLeaderboard** | Hours worked, No-Shows | ❌ Commented out |

#### What's Disabled (Re-enable Later)

| Feature | Status | Requirements to Re-enable |
|---------|--------|---------------------------|
| **PerformanceLeaderboard** | Commented out | Needs real ratings/compliance data |
| Ratings | Not implemented | Need owner feedback/rating system |
| Compliance | Not implemented | Need medication adherence, on-time tracking |
| Revenue Projection | Removed | Need agency billing rates configured |

#### Key Files

| File | Purpose |
|------|---------|
| `src/components/agency/analytics/AgencyAnalyticsDashboard.tsx` | Main dashboard |
| `src/components/agency/analytics/AssignmentsOverviewChart.tsx` | Caregiver/Elder bar chart |
| `src/components/agency/analytics/MonthSummaryCards.tsx` | 3 summary cards |
| `src/components/agency/analytics/PerformanceLeaderboard.tsx` | Commented out |
| `src/lib/firebase/agencyAnalytics.ts` | Data fetching functions |

---

### Storage Quota & Downgrade Validation

**Implemented:** Jan 18, 2026

#### Downgrade Validation Rules

| Resource | Validation | Enforcement |
|----------|------------|-------------|
| **Members** | Must fit target plan limit BEFORE downgrade | ❌ Hard block - must remove members first |
| **Storage** | Warning shown if over target limit | ⚠️ Soft block - can downgrade but access blocked |

#### Storage Quota Enforcement (Post-Downgrade)

| Action | When Under Quota | When Over Quota |
|--------|------------------|-----------------|
| Upload files | ✅ Allowed | ❌ Blocked |
| View/Download files | ✅ Allowed | ❌ Blocked |
| Analyze with AI | ✅ Allowed | ❌ Blocked |
| **Delete files** | ✅ Allowed | ✅ **Always Allowed** |

#### Key Files

| File | Purpose |
|------|---------|
| `src/lib/firebase/storage.ts` | `checkStorageQuota()`, `checkStorageAccessAllowed()` |
| `src/lib/firebase/planLimits.ts` | `validateDowngrade()` - checks members & storage |
| `src/app/api/documents/route.ts` | Returns `storageInfo.isOverQuota` flag |
| `src/app/dashboard/documents/page.tsx` | UI blocking when over quota |
| `src/components/subscription/DowngradeBlockedModal.tsx` | Modal showing downgrade blockers |

---

### Disabled Features

**Updated:** Jan 26, 2026

#### Timesheet Management (DISABLED)

| Item | Status |
|------|--------|
| **Feature** | Timesheet approval workflow for caregivers |
| **Status** | ⏸️ DISABLED - code preserved with redirects |
| **Reason** | Overhead for small agencies not tracking billing; shift sessions capture work time |
| **Date** | Jan 26, 2026 |

**Why Disabled:**
1. App is not currently tracking billing/payroll
2. Shift sessions already capture all work time (check-in/check-out)
3. Formal timesheet approval adds overhead for caregivers
4. Small agencies don't need formal timesheet management without payroll integration

**Current Behavior:**
- `/dashboard/timesheet` redirects agency owners to `/dashboard/agency`
- `/dashboard/timesheet` redirects caregivers to `/dashboard/shift-handoff`
- Nav items hidden in IconRail and MoreMenuDrawer

**To Re-enable:**
1. Remove redirect useEffect in `src/app/dashboard/timesheet/page.tsx`
2. Uncomment nav items in:
   - `src/components/navigation/IconRail.tsx` (line ~95)
   - `src/components/navigation/MoreMenuDrawer.tsx` (line ~209)
3. Update this documentation

#### Analytics Page for Agency Owners (HIDDEN)

| Item | Status |
|------|--------|
| **Feature** | Individual elder health analytics (medication adherence, nutrition, trends) |
| **Status** | ⏸️ HIDDEN - redirects to /dashboard/agency |
| **Reason** | Not actionable for agency owners managing 30+ elders; caregivers still see it |
| **Date** | Jan 26, 2026 |

**Why Hidden:**
1. Agency owners focus on business ops (scheduling, staffing, billing)
2. Medication adherence and nutrition are caregiver/family concerns
3. Managing 30+ elders, individual health trends aren't useful for daily decisions
4. Caregivers still see this page for their assigned elders (max 3 per day)

**Current Behavior:**
- Super admins visiting `/dashboard/analytics` are redirected to `/dashboard/agency`
- Reports/Analytics nav items hidden in IconRail and MoreMenuDrawer for agency owners
- Caregivers and Family Plan users still have full access

**To Re-enable:**
1. Remove redirect useEffect in `src/app/dashboard/analytics/page.tsx`
2. Uncomment nav items in:
   - `src/components/navigation/IconRail.tsx` (Agency Owner section)
   - `src/components/navigation/MoreMenuDrawer.tsx` (Insights section)
3. Consider building an aggregated agency-wide view instead of individual elder analytics

---

#### Care Section for Agency Owners (HIDDEN)

| Item | Status |
|------|--------|
| **Feature** | Health Profile, Daily Care (medications, supplements, diet, activity) |
| **Status** | ⏸️ HIDDEN - entire Care section hidden, pages redirect to /dashboard/agency |
| **Reason** | Agency owners do NOT directly care for elders - that's the caregiver's job |
| **Date** | Jan 26, 2026 |

**Why Hidden:**
1. Agency owners do NOT directly provide hands-on care to elders
2. They manage business operations (scheduling, staffing, compliance)
3. Health profile management and daily care logging is the caregiver's responsibility

**Current Behavior:**
- Entire "Care" section hidden in MoreMenuDrawer for agency owners
- `/dashboard/elder-profile` redirects super admins to `/dashboard/agency`
- `/dashboard/daily-care` redirects super admins to `/dashboard/agency`
- Agency caregivers and Family Plan admins still have full access

**Note:** Members (all plans) do NOT have login access. They only receive automated daily email reports.

**To Re-enable:**
1. Remove redirect useEffect in:
   - `src/app/dashboard/elder-profile/page.tsx`
   - `src/app/dashboard/daily-care/page.tsx`
2. Remove the `!(isMultiAgency && userIsSuperAdmin)` condition in `MoreMenuDrawer.tsx` (Care section)

---

#### Insights Section for Agency Owners (HIDDEN)

| Item | Status |
|------|--------|
| **Feature** | AI Insights, Safety Alerts, Analytics |
| **Status** | ⏸️ HIDDEN - entire Insights section hidden, pages redirect to /dashboard/agency |
| **Reason** | Per-elder features are caregiver/family responsibility, not agency owner ops |
| **Date** | Jan 26, 2026 |

**Why Hidden:**
1. Agency owners focus on business operations (scheduling, staffing, compliance)
2. Individual elder monitoring (AI chat, safety alerts, analytics) is the caregiver's responsibility
3. Managing 30+ elders, per-elder features aren't practical for owners

**Current Behavior:**
- Entire "Insights" section hidden in MoreMenuDrawer for agency owners
- `/dashboard/ask-ai` redirects super admins to `/dashboard/agency`
- `/dashboard/safety-alerts` redirects super admins to `/dashboard/agency`
- `/dashboard/analytics` redirects super admins to `/dashboard/agency`
- Agency caregivers and Family Plan admins still have full access

**Note:** Members (all plans) do NOT have login access. They only receive automated daily email reports.

**To Re-enable:**
1. Remove redirect useEffect in:
   - `src/app/dashboard/ask-ai/page.tsx`
   - `src/app/dashboard/safety-alerts/page.tsx`
   - `src/app/dashboard/analytics/page.tsx`
2. Uncomment Insights section in `src/components/navigation/MoreMenuDrawer.tsx`
3. Consider building aggregated agency-wide summaries instead

---

#### Alerts Page for Agency Owners (HIDDEN)

| Item | Status |
|------|--------|
| **Feature** | Group-based alerts dashboard |
| **Status** | ⏸️ HIDDEN - redirects to /dashboard/agency |
| **Reason** | Uses `user.groups` which agency owners don't have (they have `user.agencies`) |
| **Date** | Jan 26, 2026 |

**Why Hidden:**
1. Agency owners have `user.agencies`, not `user.groups` - groupId is always undefined
2. Page shows "No group found" which is not useful
3. Agency owners get notifications via other channels:
   - Bell icon in header (user_notifications collection)
   - Dashboard Today's Shifts card (shift-related alerts)
   - Caregiver Burnout page (team health monitoring)
4. Caregivers still have access for their assigned elders' alerts

**Current Behavior:**
- Super admins visiting `/dashboard/alerts` are redirected to `/dashboard/agency`
- Alerts card removed from Care Management page for agency owners
- Caregivers and Family Plan users still have full access

**To Re-enable:**
1. Remove redirect useEffect in `src/app/dashboard/alerts/page.tsx`
2. Add Alerts back to `ownerOnlyFeatures` in `src/app/dashboard/care-management/page.tsx`
3. Consider building an agency-wide alerts view that queries by agencyId instead of groupId

---

#### Elders Page for Agency Owners (HIDDEN)

| Item | Status |
|------|--------|
| **Feature** | Standalone elders list for agency owners |
| **Status** | ⏸️ HIDDEN - redirects to /dashboard/agency |
| **Reason** | Redundant - agency dashboard already shows all elders grouped by caregiver |
| **Date** | Jan 26, 2026 |

**Why Hidden:**
1. `/dashboard/agency` already shows ALL elders grouped by caregiver
2. `/dashboard/agency` provides elder assignment management
3. `/dashboard/agency` shows unassigned elders section
4. Individual elder profiles accessible from agency dashboard
5. The elders page was designed for Family Plan users who don't have the agency dashboard

**Current Behavior:**
- Super admins visiting `/dashboard/elders` are redirected to `/dashboard/agency`
- Heart icon removed from IconRail for agency owners
- Caregivers still see the elders page (shows their assigned elders)

**To Re-enable:**
1. Remove redirect useEffect in `src/app/dashboard/elders/page.tsx`
2. Uncomment nav item in `src/components/navigation/IconRail.tsx` (line ~85)
3. Update this documentation

---

#### Documents Page (SIMPLIFIED)

| Item | Status |
|------|--------|
| **Feature** | Document storage for agency owners |
| **Status** | ✅ SIMPLIFIED - category filters removed |
| **Reason** | Avoid liability from categorizing medical/legal/insurance documents |
| **Date** | Jan 26, 2026 |

**Changes Made:**
1. Removed category filters (Medical Records, Insurance, Legal Documents, Care Plans, Other)
2. Added sort dropdown (Newest First, Oldest First, Name A-Z, Name Z-A)
3. Added inline editable description field for each document
4. Removed "View" and "Analyze with AI" buttons (just storage needed)
5. Updated storage rules to allow both documents AND images

**Current Behavior:**
- Upload any document (PDF, Word, Excel) or image (JPG, PNG)
- Add/edit one-line description per document
- Sort by filename or upload date
- Delete documents
- Storage quota enforced per plan (25 MB / 50 MB / 500 MB)

**Key Files:**
| File | Purpose |
|------|---------|
| `src/app/dashboard/documents/page.tsx` | Main documents page |
| `src/app/api/documents/route.ts` | GET documents list |
| `src/app/api/documents/description/route.ts` | POST update description |
| `storage.rules` | Firebase Storage security rules |

**Storage Path:** `documents/{userId}/{elderId}/{filename}`

---

### Caregiver Burnout Page

**Updated:** Jan 26, 2026

#### Overview

Redesigned burnout analysis page for agency owners. Shows ALL caregivers (not just those with recent shifts) with summary cards and categorized sections.

#### Features

| Feature | Description |
|---------|-------------|
| **Summary Cards** | Total, At Risk, Healthy, Inactive counts at top |
| **Needs Attention** | High/Critical risk caregivers highlighted first |
| **Healthy Section** | Moderate/Low risk caregivers |
| **Inactive Section** | Collapsible - caregivers with no shifts in 14 days |

#### API Changes

| Change | Before | After |
|--------|--------|-------|
| Inactive caregivers | Excluded (returned `null`) | Included with `riskScore: -1` |
| Burnout risk status | `low`, `moderate`, `high`, `critical` | + `inactive` for no recent shifts |
| Sorting | By risk score only | At-risk first, inactive last |

#### Key Files

| File | Purpose |
|------|---------|
| `src/app/api/caregiver-burnout/route.ts` | Returns all caregivers including inactive |
| `src/app/dashboard/caregiver-burnout/page.tsx` | Redesigned UI with summary cards |

---

## Features

### Notification System

**Updated:** Jan 25, 2026

#### Active Channels

| Channel | Target | Purpose |
|---------|--------|---------|
| **FCM Push** | Agency owners, caregivers | Real-time alerts |
| **Email** | Family members, caregivers | Daily reports, shift notifications |
| **In-App** | All users | `user_notifications` collection |
| **Dashboard Alerts** | All users | `alerts` collection |

#### Disabled

| Channel | Status | Documentation |
|---------|--------|---------------|
| **Twilio SMS** | Code preserved, credentials secured | `docs/removetwilio.md` |
| **SMS Invites** | Replaced with offline link sharing | See [Caregiver Invite System](#caregiver-invite-system) |

---

### Shift Confirmation System

**Implemented:** Jan 25, 2026

#### Overview

Multi-channel notification system for shift assignments with caregiver confirmation workflow.

#### Status Lifecycle

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

#### Key Files

| File | Purpose |
|------|---------|
| `src/app/api/shifts/confirm/route.ts` | Confirm shift API |
| `src/app/api/shifts/decline/route.ts` | Decline shift API |
| `src/app/api/shifts/notify-assignment/route.ts` | Send notifications |
| `src/app/dashboard/my-shifts/page.tsx` | Caregiver pending shifts UI |
| `src/components/agency/TodaysShiftsList.tsx` | Owner Today's Shifts |

---

### Week Strip Schedule View

**Implemented:** Jan 25, 2026

#### Overview

Simplified schedule interface replacing the complex calendar view. Mobile-friendly "Week Strip + Day Expand" design.

#### Components

| Component | File | Purpose |
|-----------|------|---------|
| `WeekStripSchedule` | `src/components/agency/schedule/WeekStripSchedule.tsx` | Main component |
| `WeekStrip` | `src/components/agency/schedule/WeekStrip.tsx` | 7-day horizontal bar |
| `DayShiftList` | `src/components/agency/schedule/DayShiftList.tsx` | Expandable day accordion |
| `ScheduleAlertsBanner` | `src/components/agency/schedule/ScheduleAlertsBanner.tsx` | Gap/unconfirmed alerts |

#### Features

- Week Strip with coverage bars (green/amber/red)
- Click day to expand and see shifts
- Gap detection with "Assign" button
- Real-time Firestore updates
- Role-based filtering

---

### Schedule Assignment System

**Implemented:** Jan 26, 2026 (Phase 1, 1.5)
**Skill Documentation:** `.claude/skills/schedule-assignment/SKILL.md`

#### Overview

"Copy + Adjust" workflow for weekly elder-caregiver assignments. Shows ALL 30 elders needing care with simple assignment tools.

#### Caregiver Assignment Constraints

| Rule | Constraint | Enforcement |
|------|------------|-------------|
| **Daily Elder Limit** | Max 3 elders per caregiver per day | Hard block |
| **Time Slot Conflict** | Max 1 elder per 2-hour window | Hard block |

#### Completed Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Gap Detection (show ALL elders) | ✅ Complete |
| 1.5 | Click-to-Assign for unfilled shifts | ✅ Complete |

---

### Daily Family Notes - Email Integration

**Added:** Jan 20, 2026

#### How It Works

1. Scheduled Cloud Function runs at 7 PM PST
2. For each elder with activity, generates a daily report
3. For each group member:
   - Creates in-app notification
   - Queues FCM push notification
   - Writes email to `mail` collection (Firebase Trigger Email)

#### Email Subject Format

```
Daily Care Update for {Elder Name} - {Day, Month Date, Year}
```

---

### Phase 14 - UI/UX Overhaul

**Added:** Jan 22, 2026
**Reference Documents:** `docs/Jan22_UpdatePrompt_v1.md`, `docs/Jan22_UpdatedPrompt_v2.md`

#### Overview

Claude.ai-inspired navigation redesign. Responsive icon rail (desktop) and bottom nav (mobile), task priority engine, auto-suggestions.

#### Navigation by Role

| Role | Bottom Nav Items | Icon Rail Items |
|------|-----------------|-----------------|
| Family (Plan A/B) | Home, Reports, Ask AI, More | Home, Reports, Medications, Supplements, Care Logs, Ask AI |
| Agency Caregiver | Home, Schedule, Reports, Alerts, More | Home, Schedule, Reports, Alerts |
| Agency Owner | Home, Team, Schedule, Reports, More | Home, Team, Schedule, Reports |

**Note:** Timesheets and Elders nav items removed for agency owners (Jan 26, 2026). See [Disabled Features](#disabled-features).

---

## Testing Results

### Phase 12 - RBAC Testing Complete

**Status:** ✅ COMPLETE (Jan 17, 2026)
**Reference:** `refactor-12.md`

| Category | Tests | Passed | Status |
|----------|-------|--------|--------|
| Multi-Agency Caregiver Isolation | 24 | 24 | ✅ 100% |
| Read-Only Member Access | 9 | 9 | ✅ 100% |
| Super Admin (Agency Owner) | 9 | 9 | ✅ 100% |
| Family Plan A | 8 | 8 | ✅ 100% |
| Family Plan B | 15 | 15 | ✅ 100% |
| **TOTAL** | **65** | **65** | ✅ **100%** |

#### Test Accounts Pattern

- Agency Owner: `ramanac+owner@gmail.com`
- Caregivers 1-10: `ramanac+c1@gmail.com` through `ramanac+c10@gmail.com`
- Family Members: `ramanac+c{1-10}m{1-6}@gmail.com`
- Family Plan A: `ramanac+a1@gmail.com` (admin), `ramanac+a2@gmail.com` (member)
- Family Plan B: `ramanac+b1@gmail.com` (admin), `ramanac+b2-b4@gmail.com` (members)
- Password (all accounts): `AbcD12!@`

---

### Phase 13 - Subscription Testing Complete

**Status:** ✅ COMPLETE (Jan 17, 2026)

| Plan | Tests | Passed | Status |
|------|-------|--------|--------|
| Family Plan A (SUB-1A) | 5 | 5 | ✅ 100% |
| Family Plan B (SUB-1B) | 6 | 6 | ✅ 100% |
| Multi-Agency (SUB-1C) | 7 | 7 | ✅ 100% |
| **TOTAL** | **18** | **18** | ✅ **100%** |

#### Additional Test Suites

| Suite | Tests | Status |
|-------|-------|--------|
| Stripe Payment Error Handling (SUB-3B) | 7/7 | ✅ PASS |
| Subscription Management (SUB-4A) | 8/8 | ✅ PASS |
| Cancel Subscription (SUB-4B) | 6/6 | ✅ PASS |
| Billing Portal (SUB-5) | 5/5 | ✅ PASS |
| Trial Expiration (SUB-5A) | 12/12 | ✅ PASS |
| Storage Quota | 18/18 | ✅ PASS |

---

## Deployment & Environment

### Deployment URLs

| Environment | URL |
|-------------|-----|
| Production | https://myguide.health |
| Preview/Staging | https://myhealthguide.vercel.app |

### Vercel Environment Variables

#### Firebase Configuration
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

#### Stripe Payment
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

#### AI Services
| Variable | Purpose | Last Updated |
|----------|---------|--------------|
| `GEMINI_API_KEY` | Google Gemini 3 Pro Preview (Primary AI) | Nov 15, 2025 |
| `ANTHROPIC_API_KEY` | Claude Opus 4.5 (Fallback AI) | Dec 8, 2025 |
| `VERTEX_AI_LOCATION` | Vertex AI region | Nov 30, 2025 |

#### Google Cloud
| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLOUD_PROJECT_ID` | GCP project ID |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | GCP service account JSON |

#### Application
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_NAME` | Application name |
| `NEXT_PUBLIC_APP_URL` | Production URL |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA/Turnstile site key |

### Claude Code Testing Commands

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

## Production Status

**Launch Date:** January 11, 2026
**Version:** v1.0.0
**Status:** ✅ LIVE

### Test Summary

- 230/230 tests passed
- All 3 subscription plans live and verified
- HIPAA compliance verified
- SEO infrastructure complete

### Recent Updates

| Date | Update |
|------|--------|
| Jan 26, 2026 | Care section HIDDEN for agency owners (Health Profile, Daily Care) |
| Jan 26, 2026 | Insights section HIDDEN for agency owners (AI Insights, Safety Alerts, Analytics) |
| Jan 26, 2026 | Documents page SIMPLIFIED - removed category filters, added descriptions |
| Jan 26, 2026 | Alerts page HIDDEN for agency owners - uses groups, not agencies |
| Jan 26, 2026 | Analytics page HIDDEN for agency owners - not actionable for 30+ elders |
| Jan 26, 2026 | Timesheet feature DISABLED - shift sessions track work time |
| Jan 26, 2026 | Elders page HIDDEN for agency owners - redirects to /agency |
| Jan 26, 2026 | Caregiver Burnout redesign - summary cards, inactive section |
| Jan 26, 2026 | Caregiver Invite System (no SMS, offline links) |
| Jan 26, 2026 | Analytics Tab fixes - removed billing, fixed caregiver names |
| Jan 26, 2026 | Firestore rules fix - super admin can sync group permissions |
| Jan 25, 2026 | Week Strip Schedule View - mobile-friendly interface |
| Jan 25, 2026 | Shift Confirmation System with multi-channel notifications |
| Jan 25, 2026 | Twilio SMS disabled - FCM push notifications only |
| Jan 22, 2026 | UI/UX Overhaul - Claude.ai-inspired navigation |
| Jan 20, 2026 | Daily Family Notes email integration |
| Jan 19, 2026 | Trial expiration blocking verified |
| Jan 18, 2026 | Storage quota & downgrade validation |
| Jan 17, 2026 | RBAC security verified (65/65 tests) |
| Jan 17, 2026 | Subscription limits verified (18/18 tests) |
