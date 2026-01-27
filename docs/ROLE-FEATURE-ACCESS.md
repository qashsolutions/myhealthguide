# Role & Feature Access Matrix

**Generated:** January 26, 2026
**Status:** Comprehensive Analysis of All User Roles & Features

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [User Roles Defined](#user-roles-defined)
3. [Subscription Plans](#subscription-plans)
4. [Member Login Behavior](#member-login-behavior)
5. [Page Access by Role](#page-access-by-role)
6. [Navigation Items by Role](#navigation-items-by-role)
7. [Settings Tabs by Role](#settings-tabs-by-role)
8. [Care Management Cards by Role](#care-management-cards-by-role)
9. [API Access by Role](#api-access-by-role)
10. [Potential Improvements](#potential-improvements)

---

## Executive Summary

### Roles That CAN Login

| Role | Plan Type | Login Method | Access Level |
|------|-----------|--------------|--------------|
| **Family Admin** | Family A/B | Email+Password or Phone | Full access |
| **Family Member** | Family A/B | Email+Password or Phone | Read-only access |
| **Agency Owner** | Multi-Agency | Email+Password or Phone | Business ops only |
| **Agency Caregiver** | Multi-Agency | Email+Password or Phone | Care for assigned elders |

### Roles That CANNOT Login (Email-Only)

| Role | Plan Type | Receives | Access |
|------|-----------|----------|--------|
| **Report Recipient** | All Plans | Daily email report at 7 PM PST | None |
| **Agency Family Member** | Multi-Agency | Daily email report at 7 PM PST | None |

---

## User Roles Defined

### Source Files
- `/src/lib/utils/getUserRole.ts` - Role detection functions
- `/src/types/index.ts` - Type definitions

### Role Enum (Code)

```typescript
export type UserRole = 'admin' | 'caregiver' | 'caregiver_admin' | 'super_admin';
export type AgencyRole = 'super_admin' | 'caregiver_admin' | 'caregiver' | 'family_member';
```

### Role Mapping Explained

| Internal Role | Plan Type | Group/Agency Role | UserRole Mapping | Permission Level |
|---------------|-----------|-------------------|------------------|------------------|
| **Family Admin** | Family A/B | `group.role='admin'` | `UserRole='admin'` | `admin` |
| **Family Member** | Family A/B | `group.role='member'` | `UserRole='caregiver'` | `read` |
| **Agency Owner** | Multi-Agency | `agency.role='super_admin'` | `UserRole='super_admin'` | `admin` |
| **Agency Caregiver Admin** | Multi-Agency | `agency.role='caregiver_admin'` | `UserRole='caregiver_admin'` | `write` |
| **Agency Caregiver** | Multi-Agency | `agency.role='caregiver'` | `UserRole='caregiver'` | `write` |
| **Agency Family Member** | Multi-Agency | `agency.role='family_member'` | N/A - no login | `read` |

### Role Detection Functions

```typescript
// Key functions in /src/lib/utils/getUserRole.ts

isSuperAdmin(user)        // Agency owner (manages business ops)
isAgencyCaregiver(user)   // Caregiver in agency (provides care)
isFamilyAdmin(user)       // Family plan admin (manages household)
isFamilyMember(user)      // Family plan read-only member
isReadOnlyUser(user)      // Any read-only role
isReadOnlyForElderCare(user) // Read-only + super admin (neither can log care)
```

---

## Subscription Plans

### Plan Comparison

| Aspect | Family Plan A | Family Plan B | Multi-Agency |
|--------|---------------|---------------|--------------|
| **Price** | $8.99/elder/mo | $10.99/mo | $16.99/elder/mo |
| **Trial** | 45 days | 45 days | 30 days |
| **Max Elders** | 1 | 1 | 30 total |
| **Max Group Members** | 2 (1 admin + 1 member) | 4 (1 admin + 3 members) | 4 per group |
| **Max Report Recipients** | 1 email | 3 emails | 2 per elder |
| **Max Caregivers** | N/A | N/A | 10 per agency |
| **Elders per Caregiver** | N/A | N/A | 3 max |
| **Storage** | 25 MB | 50 MB | 500 MB |

### Distinction: Members vs Recipients

| Concept | Has App Login? | Storage Location | Purpose |
|---------|---------------|------------------|---------|
| **Group Member** | YES | `groups.members[]` | Read-only app access |
| **Report Recipient** | NO | `elders[].reportRecipients[]` | Email reports only |

---

## Member Login Behavior

### Family Plan Members (Intentional Design)

**Family Plan Members (role='member') CAN log into the app** with read-only access:

1. Admin invites member via invite code
2. Member signs up and creates account
3. Member added to `groups.members[]` with `role: 'member'`
4. Member added to `users` collection with valid credentials
5. Member CAN login via `/login` page
6. Member has read-only access to elder data

### Evidence in Code

```typescript
// /src/app/api/caregiver/invite-member/accept/route.ts
// Lines 113-127: Creates user account for members

const newMember = {
  userId,                    // <-- Member has a user account
  role: 'member',
  permissionLevel: 'read',   // <-- Read-only
  permissions: ['view_all', 'view_insights'],
  // ...
};
```

### Multi-Agency Family Members (NO Login)

Multi-Agency `family_member` role is DIFFERENT:
- Stored only as `agency.role='family_member'`
- No user account created
- Receives daily email reports only
- Uses `reportRecipients` system

### Design Decision (Confirmed Jan 26, 2026)

Family Plan members having read-only app access is **intentional behavior**:
- Members can view elder health data but cannot modify it
- This allows family members to stay informed via the app
- Report Recipients (email-only) remain a separate concept for those who prefer email updates only

---

## Page Access by Role

### Legend
- ✅ = Full access
- ✅ RO = Read-only access (view but cannot modify)
- ❌ = No access
- ➡️ = Redirects to another page
- ⏸️ = Feature disabled

### Dashboard Pages

| Page | Route | Family Admin | Family Member | Agency Owner | Agency Caregiver |
|------|-------|--------------|---------------|--------------|------------------|
| **Home** | `/dashboard` | ✅ | ✅ RO | ✅ | ✅ |
| **Activity** | `/dashboard/activity` | ✅ | ✅ RO | ✅ | ✅ |
| **Reports** | `/dashboard/reports` | ✅ | ✅ RO | N/A | ✅ |
| **Settings** | `/dashboard/settings` | ✅ | ✅ (limited) | ✅ (limited) | ✅ |
| **Export Data** | `/dashboard/export-all` | ✅ | ✅ | ✅ | ✅ |
| **Notifications** | `/dashboard/notifications` | ✅ | ✅ | ✅ | ✅ |

### Care Pages

| Page | Route | Family Admin | Family Member | Agency Owner | Agency Caregiver |
|------|-------|--------------|---------------|--------------|------------------|
| **Medications** | `/dashboard/medications` | ✅ | ✅ RO | ❌ | ✅ |
| **Supplements** | `/dashboard/supplements` | ✅ | ✅ RO | ❌ | ✅ |
| **Diet** | `/dashboard/diet` | ✅ | ✅ RO | ❌ | ✅ |
| **Daily Care** | `/dashboard/daily-care` | ✅ | ✅ RO | ➡️ /agency | ✅ |
| **Health Profile** | `/dashboard/elder-profile` | ✅ | ✅ RO | ➡️ /agency | ✅ |
| **Elders List** | `/dashboard/elders` | ✅ | ✅ RO | ➡️ /agency | ✅ |
| **Clinical Notes** | `/dashboard/clinical-notes` | ✅ | ✅ RO | ❌ | ✅ |
| **Incidents** | `/dashboard/incidents` | ✅ | ✅ RO | ❌ | ✅ |

### Insights Pages

| Page | Route | Family Admin | Family Member | Agency Owner | Agency Caregiver |
|------|-------|--------------|---------------|--------------|------------------|
| **Ask AI** | `/dashboard/ask-ai` | ✅ | ✅ RO | ➡️ /agency | ✅ |
| **Analytics** | `/dashboard/analytics` | ✅ | ✅ RO | ➡️ /agency | ✅ |
| **Safety Alerts** | `/dashboard/safety-alerts` | ✅ | ❌ | ➡️ /agency | ✅ |
| **Drug Interactions** | `/dashboard/drug-interactions` | ✅ | ✅ RO | ❌ | ✅ |
| **Dementia Screening** | `/dashboard/dementia-screening` | ✅ | ✅ RO | ❌ | ✅ |
| **Symptom Checker** | `/dashboard/symptom-checker` | ✅ | ✅ RO | ❌ | ✅ |

### Agency Pages

| Page | Route | Family Admin | Family Member | Agency Owner | Agency Caregiver |
|------|-------|--------------|---------------|--------------|------------------|
| **Agency Dashboard** | `/dashboard/agency` | N/A | N/A | ✅ | ✅ (limited) |
| **Agency Schedule** | `/dashboard/agency/schedule` | N/A | N/A | ✅ | ✅ |
| **Care Management** | `/dashboard/care-management` | N/A | N/A | ✅ | ✅ |
| **Caregiver Burnout** | `/dashboard/caregiver-burnout` | N/A | N/A | ✅ | ❌ |
| **Documents** | `/dashboard/documents` | ✅ | ❌ | ✅ | ❌ |
| **My Shifts** | `/dashboard/my-shifts` | N/A | N/A | N/A | ✅ |
| **Shift Handoff** | `/dashboard/shift-handoff` | N/A | N/A | ❌ | ✅ |
| **Family Updates** | `/dashboard/family-updates` | ✅ | ❌ | ✅ | ✅ |
| **Alerts** | `/dashboard/alerts` | ✅ | ✅ | ➡️ /agency | ✅ |

### Admin Pages

| Page | Route | Family Admin | Family Member | Agency Owner | Agency Caregiver |
|------|-------|--------------|---------------|--------------|------------------|
| **Subscription** | `/dashboard/subscription` | ✅ | ❌ | ✅ | ❌ |
| **Timesheet** | `/dashboard/timesheet` | N/A | N/A | ⏸️ Disabled | ⏸️ Disabled |
| **Availability** | `/dashboard/availability` | N/A | N/A | ✅ | ✅ |
| **Calendar** | `/dashboard/calendar` | N/A | N/A | ✅ | ✅ |

---

## Navigation Items by Role

### Icon Rail (Desktop)

| Nav Item | Family Admin | Family Member | Agency Owner | Agency Caregiver |
|----------|--------------|---------------|--------------|------------------|
| Home | ✅ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ❌ Hidden | ✅ |
| Ask AI | ✅ | ✅ | ❌ Hidden | ❌ |
| Alerts | ✅ | ✅ | ❌ Hidden | ✅ |
| Team | N/A | N/A | ✅ | ❌ |
| Schedule | N/A | N/A | ✅ | ✅ |

### Bottom Navigation (Mobile)

Same as Icon Rail, adapted for mobile.

### More Menu Drawer

| Section | Family Admin | Family Member | Agency Owner | Agency Caregiver |
|---------|--------------|---------------|--------------|------------------|
| **Care Section** | ✅ | ✅ RO | ❌ Hidden | ✅ |
| - Health Profile | ✅ | ✅ RO | ❌ | ✅ |
| - Daily Care | ✅ | ✅ RO | ❌ | ✅ |
| **Insights Section** | ✅ | ✅ RO | ❌ Hidden | ✅ |
| - AI Insights | ✅ | ✅ RO | ❌ | ✅ |
| - Safety Alerts | ✅ | ❌ | ❌ | ✅ |
| - Analytics | ✅ | ❌ | ❌ | ✅ |
| **Care Tools** | N/A | N/A | ❌ | ✅ |
| - Shift Handoff | N/A | N/A | ❌ | ✅ |
| - Documents | N/A | N/A | ❌ | ✅ |
| - Family Updates | N/A | N/A | ❌ | ✅ |
| **Personal** | ✅ | ❌ | ✅ | ✅ |
| - My Notes | ✅ | ❌ | ✅ | ✅ |
| **Agency** | N/A | N/A | ✅ | ✅ |
| - Care Management | N/A | N/A | ✅ | ✅ |
| - Agency Management | N/A | N/A | ✅ | ❌ |
| **System** | ✅ | ✅ | ✅ | ✅ |
| - Settings | ✅ | ✅ | ✅ | ✅ |
| - Help | ✅ | ✅ | ✅ | ✅ |
| - Sign Out | ✅ | ✅ | ✅ | ✅ |

---

## Settings Tabs by Role

| Tab | Family Admin | Family Member | Agency Owner | Agency Caregiver |
|-----|--------------|---------------|--------------|------------------|
| Profile | ✅ | ✅ | ✅ | ✅ |
| Security & Activity | ✅ | ✅ | ✅ | ✅ |
| Subscription | ✅ | ❌ | ✅ | ❌ |
| Notifications | ✅ | ✅ RO | ❌ Hidden | ✅ |
| Group Management | ✅ | ❌ | ❌ Hidden | ✅ |
| Smart Features | ✅ | ✅ RO | ❌ Hidden | ✅ |
| Alert Preferences | ✅ | ✅ RO | ❌ Hidden | ✅ |
| Privacy & Data | ✅ | ✅ | ✅ | ✅ |

---

## Care Management Cards by Role

| Card | Agency Owner | Agency Caregiver |
|------|--------------|------------------|
| Documents | ✅ | ❌ |
| Caregiver Burnout | ✅ | ❌ |
| Alerts | ✅ | ✅ |
| Shift Handoff | ❌ | ✅ |
| Timesheet | ⏸️ Disabled | ⏸️ Disabled |

---

## API Access by Role

### Care Data APIs

| Endpoint | Family Admin | Family Member | Agency Owner | Agency Caregiver |
|----------|--------------|---------------|--------------|------------------|
| GET /api/medications | ✅ | ✅ | ❌ | ✅ |
| POST /api/medications | ✅ | ❌ | ❌ | ✅ |
| PUT /api/medications | ✅ | ❌ | ❌ | ✅ |
| DELETE /api/medications | ✅ | ❌ | ❌ | ✅ |

### Agency APIs

| Endpoint | Family Admin | Family Member | Agency Owner | Agency Caregiver |
|----------|--------------|---------------|--------------|------------------|
| GET /api/agency | N/A | N/A | ✅ | ✅ |
| POST /api/agency/caregiver-invite | N/A | N/A | ✅ | ❌ |
| GET /api/caregiver-burnout | N/A | N/A | ✅ | ❌ |

### Subscription APIs

| Endpoint | Family Admin | Family Member | Agency Owner | Agency Caregiver |
|----------|--------------|---------------|--------------|------------------|
| POST /api/subscribe | ✅ | ❌ | ✅ | ❌ |
| POST /api/cancel-subscription | ✅ | ❌ | ✅ | ❌ |
| POST /api/billing-portal | ✅ | ❌ | ✅ | ❌ |

---

## Potential Improvements

### NOTE #1: Terminology Clarification (Members vs Recipients)

**Issue:** Two different concepts share similar names:
- `maxMembers` - Group members with app access
- `maxRecipients` - Email-only report recipients

**Recommendation:**
Rename `maxMembers` to `maxViewers` or `maxReadOnlyUsers` for clarity.

### NOTE #2: Agency Owner Alerts Page Uses Groups

**Severity:** Low (already hidden via redirect)

**Issue:**
The `/dashboard/alerts` page queries `user.groups` which agency owners don't have.
This is already mitigated by redirecting agency owners to `/dashboard/agency`.

**File:** `/src/app/dashboard/alerts/page.tsx`

---

## Hidden Features for Agency Owners

### Summary

Agency owners focus on **business operations** (scheduling, staffing, compliance), NOT hands-on elder care. The following are hidden:

**Pages (Redirect to /dashboard/agency):**
- Health Profile, Daily Care, AI Insights, Safety Alerts, Analytics, Elders, Alerts

**Menu Items:**
- Entire Care section
- Entire Insights section

**Settings Tabs:**
- Notifications, Group Management, Smart Features, Alert Preferences

**What Owners CAN Access:**
- Agency Management, Schedule, Care Management, Documents, Caregiver Burnout
- Settings: Profile, Security & Activity, Subscription, Privacy & Data

---

## Appendix: Key Files Reference

| File | Purpose |
|------|---------|
| `/src/lib/utils/getUserRole.ts` | Role detection functions |
| `/src/lib/subscription/subscriptionService.ts` | Plan configs and limits |
| `/src/types/index.ts` | Type definitions |
| `/src/components/navigation/IconRail.tsx` | Desktop nav |
| `/src/components/navigation/BottomNav.tsx` | Mobile nav |
| `/src/components/navigation/MoreMenuDrawer.tsx` | More menu |
| `/src/app/dashboard/settings/page.tsx` | Settings page with tab controls |
| `/src/contexts/AuthContext.tsx` | Auth provider |
| `/src/lib/subscription/useSubscription.ts` | Subscription hook |

---

## Change Log

| Date | Change |
|------|--------|
| Jan 27, 2026 | Pricing updated: Plan B $18.99→$10.99, Multi-Agency $55→$16.99 |
| Jan 26, 2026 | Initial comprehensive analysis created |
