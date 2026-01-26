---
name: skill-agency-owner-dashboard
description: Agency owner (super admin) management dashboard showing team overview, attention items, quick stats, manage actions, and today's shifts. Use when implementing the agency owner home screen, super admin dashboard, team management overview, or agency-specific home page. Only for Multi-Agency plan super admins.
---

## Objective

Build a completely separate home screen for the agency owner (super admin). This is NOT a caregiving screen — it's a MANAGEMENT overview. The owner needs to see: who's on shift, what needs attention, and quick actions to manage their team.

## Constraints

- ONLY shown when `subscription.plan === 'multi-agency' && user.role === 'super_admin'`
- DO NOT modify GuidedHome — this is a SEPARATE component
- DO NOT create new Firestore collections — read from existing ones
- MUST reuse layout components (MinimalHeader, BottomNav/IconRail)
- MUST use existing data hooks and Firestore queries where possible
- MUST use Lucide React icons, shadcn/ui components, Tailwind classes
- NO avatar in header, NO bell in header (same rules as all screens)
- Bottom nav for owner: Home, Team, Schedule, Bell (with badge), More
- Time displays use formatTimeDistance() — NEVER raw minutes

## Files to Read First

- `src/app/dashboard/page.tsx` — Where conditional rendering goes
- `src/types/index.ts` — Agency, CaregiverAssignment, ScheduledShift, ShiftSession interfaces
- `src/hooks/useAgency.ts` — If exists, agency data fetching
- `src/app/dashboard/caregivers/page.tsx` — Existing caregiver list page
- `src/app/dashboard/scheduling/page.tsx` — Existing scheduling page
- `src/lib/firebase/firestore.ts` — Existing Firestore query patterns
- `src/contexts/AuthContext.tsx` — User role access
- `src/lib/subscription.ts` — Subscription plan detection

## Component Architecture

```
AgencyOwnerDashboard
├── AgencyGreeting (name + agency name)
├── AgencyQuickStats (3 stat cards)
├── NeedsAttentionList (alert cards)
├── ManageActionGrid (2x2 action buttons)
└── TodaysShiftsList (shift cards)
```

## Implementation Steps

### Step 1: Create AgencyOwnerDashboard

Create `src/components/dashboard/AgencyOwnerDashboard.tsx`:

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/lib/subscription';
import { AgencyGreeting } from '@/components/agency/AgencyGreeting';
import { AgencyQuickStats } from '@/components/agency/AgencyQuickStats';
import { NeedsAttentionList } from '@/components/agency/NeedsAttentionList';
import { ManageActionGrid } from '@/components/agency/ManageActionGrid';
import { TodaysShiftsList } from '@/components/agency/TodaysShiftsList';

export function AgencyOwnerDashboard() {
  return (
    <div className="flex flex-col gap-6 px-4 py-4 max-w-2xl mx-auto">
      <AgencyGreeting />
      <AgencyQuickStats />
      <NeedsAttentionList />
      <ManageActionGrid />
      <TodaysShiftsList />
    </div>
  );
}
```

### Step 2: Create AgencyGreeting

Create `src/components/agency/AgencyGreeting.tsx`:

```typescript
Props: none (reads from AuthContext)

Display:
- "Hi {firstName}" — 24px semibold
- "{agencyName}" — 16px regular, secondary color
- Agency name from user's agency document in Firestore

Data: user.agencyId → fetch agency document → agency.name
```

### Step 3: Create AgencyQuickStats

Create `src/components/agency/AgencyQuickStats.tsx`:

```typescript
Display: 3 stat cards in horizontal row (flex, gap-3)

Card 1: Caregivers
- Count of active caregiver_assignments where agencyId matches
- Icon: Users (blue)

Card 2: Elders
- Count of elders assigned to this agency
- Icon: Heart (rose)

Card 3: Pending Slots
- Count of scheduledShifts where status === 'pending' (awaiting response)
- Icon: Clock (amber)

Each card: shadcn Card component, compact (80px height)
- Large number (24px bold)
- Label below (12px, secondary color)
- Icon top-right corner (16px, muted)
```

### Step 4: Create NeedsAttentionList

Create `src/components/agency/NeedsAttentionList.tsx`:

```typescript
Purpose: Show issues that need the owner's action

Scans for:
1. Uncovered shifts (scheduledShifts where date is upcoming AND no caregiver assigned)
2. Elders without caregiver assignment
3. Caregivers with low compliance (<70% today)
4. Shifts with no response (sent but not accepted/rejected)

Display per item:
┌─────────────────────────────────────────┐
│ [AlertTriangle] 2 slots awaiting     >  │
│                 response                │
└─────────────────────────────────────────┘

- Icon color: amber for warnings, red for urgent
- Chevron right → navigates to relevant page
- Max 3 shown, "View all" button if more
- Empty state: green CheckCircle + "All good! No issues right now."
```

### Step 5: Create ManageActionGrid

Create `src/components/agency/ManageActionGrid.tsx`:

```typescript
Display: 2x2 grid of action cards

1. Assign Elder
   - Icon: UserPlus
   - Navigate: /dashboard/caregivers (with assign modal pre-opened)

2. Send Slots
   - Icon: CalendarPlus
   - Navigate: /dashboard/scheduling/create

3. Onboard Caregiver
   - Icon: UserCheck
   - Navigate: /dashboard/caregivers/invite

4. Create Schedule
   - Icon: Calendar
   - Navigate: /dashboard/scheduling

Each card:
- 48px icon (centered, muted color)
- Label below (14px, center-aligned)
- Tap: navigate to action
- Subtle border, rounded-lg, hover:bg-gray-50
```

### Step 6: Create TodaysShiftsList

Create `src/components/agency/TodaysShiftsList.tsx`:

```typescript
Purpose: Show all shifts scheduled for today

Data: scheduledShifts where date = today, joined with caregiver names and elder names

Display per shift:
┌─────────────────────────────────────────┐
│ Sarah J.  │ Martha, John  │  [Active]   │
│ 7AM-3PM   │               │  [green]    │
└─────────────────────────────────────────┘

Columns: caregiver name | assigned elders | status badge
Status badges:
- Active (green) — currently on shift
- Upcoming (gray) — shift hasn't started
- Completed (blue) — shift ended
- Missed (red) — shift time passed, no clock-in

Tap row → navigate to caregiver detail view
Empty state: "No shifts scheduled today" + [Create Schedule] button
```

### Step 7: Wire into Dashboard Page

Modify `src/app/dashboard/page.tsx`:

```typescript
// Add at top of component:
const { isMultiAgency } = useSubscription();
const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'agency_owner';

// Conditional rendering:
if (isMultiAgency && isSuperAdmin) {
  return <AgencyOwnerDashboard />;
}
```

### Step 8: Owner-Specific Bottom Nav

The bottom nav items for super admin (handled in BottomNav component):

```typescript
if (isMultiAgency && isSuperAdmin) {
  return [
    { icon: House, label: 'Home', href: '/dashboard' },
    { icon: Users, label: 'Team', href: '/dashboard/caregivers' },
    { icon: Calendar, label: 'Schedule', href: '/dashboard/scheduling' },
    { icon: Bell, label: 'Alerts', badge: unreadCount },  // Opens notification dropdown
    { icon: Menu, label: 'More' },
  ];
}
```

Note: "Team" (NOT "Staff") — matches the mockup exactly.

### Step 9: Owner-Specific Icon Rail (Desktop)

```
TOP:
1. Home (House)
2. Team (Users) — /dashboard/caregivers
3. Schedule (Calendar) — /dashboard/scheduling
4. Elders (Heart) — /dashboard/elder-profile
5. Reports (FileText) — /dashboard/analytics
6. Timesheets (Clock) — /dashboard/timesheet
7. More (Menu)

BOTTOM (after spacer):
8. Bell (with badge)
9. Avatar (profile/settings/sign-out)
```

## Testing Requirements

- Super Admin sees AgencyOwnerDashboard, NOT GuidedHome
- AgencyQuickStats shows correct counts from Firestore
- NeedsAttentionList correctly identifies issues
- ManageActionGrid navigates to correct pages
- TodaysShiftsList shows today's shifts accurately
- Bottom nav shows "Team" for super admin
- Icon rail shows agency-specific items on desktop
- Family plan users are completely unaffected
- Agency caregivers (non-admin) still see GuidedHome with elder tabs
- All existing tests pass
- Build succeeds
- Run: `npm test -- --testPathPattern="agency|Agency|dashboard"`
