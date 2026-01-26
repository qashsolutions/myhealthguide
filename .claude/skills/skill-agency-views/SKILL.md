---
name: skill-agency-views
description: Agency owner and multi-agency caregiver role-specific screens and components. Use when implementing agency super admin dashboard, caregiver management, multi-elder views, shift management, or agency-specific features. Depends on all other skills being complete.
---

## Objective

Build role-specific views for Multi-Agency Plan users:
1. **Agency Owner (Super Admin)**: Management dashboard with 10 caregivers, 30 elders, scheduling, timesheets
2. **Agency Caregiver**: Multi-elder quick-switch view with shift context

These views use the same layout system (bottom nav + icon rail) but show different content based on role.

## Constraints

- DO NOT modify Firestore rules (already support all needed queries)
- DO NOT modify existing caregiver/elder assignment logic
- MUST use existing `caregiver_assignments` collection for data
- MUST use existing scheduling collections (`scheduledShifts`, `shiftSessions`)
- MUST reuse layout components from skill-layout-system
- MUST show role-appropriate data only (use existing RBAC checks)
- Agency features only visible when `subscription.plan === 'multi-agency'`

## Files to Read First

- `src/types/index.ts` -- Agency, CaregiverAssignment, ScheduledShift interfaces
- `src/hooks/useAgency.ts` -- If exists, agency data hook
- `src/app/dashboard/caregivers/page.tsx` -- Existing caregiver management
- `src/app/dashboard/scheduling/page.tsx` -- Existing scheduling page
- `src/contexts/ElderContext.tsx` -- Elder switching logic
- `src/lib/firebase/firestore.ts` -- Existing Firestore queries

## Agency Owner (Super Admin) Home Screen

### Modified Guided Home for Super Admin

```
+------------------------------------------+
| [Logo]              [Bell] [Avatar]       |
+------------------------------------------+
|                                          |
|  Good morning, Lisa                      |
|  10 caregivers on shift today            |
|                                          |
+------------------------------------------+
| ATTENTION NEEDED                         |
| +--------------------------------------+ |
| | [AlertTriangle] 2 shifts uncovered   | |
| | Tomorrow 6 AM - Martha (Caregiver A  | |
| | called in sick)                       | |
| | [ Find Coverage ] [ View Schedule ]  | |
| +--------------------------------------+ |
+------------------------------------------+
|                                          |
|  Quick Stats                             |
|  +--------+ +--------+ +--------+      |
|  | 10     | | 30     | | 94%    |      |
|  | Active | | Elders | | Compl. |      |
|  | Staff  | | Served | | Rate   |      |
|  +--------+ +--------+ +--------+      |
|                                          |
+------------------------------------------+
|  Today's Activity                        |
|  Sarah logged 12 tasks  [View]           |
|  Mike started shift     [View]           |
|  Emma ended shift       [View]           |
|  ...                                     |
+------------------------------------------+
|                                          |
| [Home] [Staff] [Schedule] [Notes] [More] |
+------------------------------------------+
```

### Super Admin Bottom Nav Items
1. Home (House) -- Agency dashboard
2. Staff (Users) -- Caregiver management
3. Schedule (Calendar) -- Shift scheduling
4. Alerts (AlertTriangle) -- Issues needing attention
5. More (Menu) -- All other features

### Super Admin Icon Rail Items (Desktop)
1. Home (House)
2. Staff (Users)
3. Schedule (Calendar)
4. Elders (Heart)
5. Reports (FileText)
6. Timesheets (Clock)
7. Alerts (AlertTriangle)
8. More (Menu)

## Implementation Steps

### Step 1: Create AgencyDashboard Component

Create `src/components/dashboard/AgencyDashboard.tsx`:

```typescript
Purpose: Super Admin home screen (replaces guided home for this role)

Sections:
1. Greeting (same pattern as HomeGreeting but agency context)
2. Attention Card (priority issues: uncovered shifts, overdue caregivers, compliance alerts)
3. Quick Stats (caregivers active, elders served, compliance rate, hours today)
4. Activity Feed (recent caregiver actions, condensed)

Data sources:
- caregiver_assignments (count active)
- elders (count served)
- scheduledShifts (today's coverage)
- shiftSessions (active shifts)
- medication_logs (today's compliance aggregate)
```

### Step 2: Create CaregiverListView Component

Create `src/components/agency/CaregiverListView.tsx`:

```typescript
Purpose: List of 10 caregivers with status and quick actions

Display per caregiver:
+------------------------------------------+
| [Avatar] Sarah Johnson     [On Shift]    |
|          3 elders assigned               |
|          Last active: 5 min ago          |
|          Today: 8/12 tasks done          |
+------------------------------------------+

Features:
- Search/filter bar at top
- Sort by: name, status, compliance, last active
- Tap row = navigate to caregiver detail
- Status badges: On Shift (green), Off Shift (gray), Late (red)
- Quick actions: Message, View Schedule, View Tasks
```

### Step 3: Create CaregiverDetailView Component

Create `src/components/agency/CaregiverDetailView.tsx`:

```typescript
Purpose: Super Admin's view of a specific caregiver

Shows:
1. Caregiver info (name, phone, certifications, start date)
2. Assigned elders list (3 elders with their status):
   +------------------------------------------+
   | Martha Williams                          |
   |   Meds: 4/6 logged | Diet: 2/3 meals   |
   |   Members: john@email.com, mary@email.com|
   |   [View Details] [PDF Report]           |
   +------------------------------------------+
3. Today's task completion rate
4. This week's hours
5. Shift history

Member emails section per elder:
- Shows 2 member emails (who receive PDF reports)
- Add/remove member button (super admin can manage)
- Last report sent timestamp
```

### Step 4: Multi-Elder Caregiver Home Screen

For agency caregivers (not super admin), modify guided home:

```
+------------------------------------------+
| [Logo]              [Bell] [Avatar]       |
+------------------------------------------+
|                                          |
|  Good morning, Sarah                     |
|  You have 3 elders today                 |
|                                          |
|  +--------+ +--------+ +--------+       |  <- Elder tabs
|  | Martha | | John   | | Betty  |       |
|  | 2 due  | | 1 due  | | 0 due  |       |
|  +--------+ +--------+ +--------+       |
|                                          |
+------------------------------------------+
| [PRIORITY CARD for selected elder]       |
| Metformin 500mg for Martha               |
| Due at 8:00 AM                           |
| [ Mark as Given ] [ Skip ]              |
+------------------------------------------+
| [===========--------] 8/12 done         |
+------------------------------------------+
| Shift: 6:00 AM - 2:00 PM               |  <- Shift info bar
| [Clock] 4h 23m elapsed                  |
+------------------------------------------+
|                                          |
| [Home] [Care] [Voice] [Notes] [More]    |
+------------------------------------------+
```

### Step 5: Create ElderTabSelector Component

Create `src/components/agency/ElderTabSelector.tsx`:

```typescript
Purpose: Horizontal tab row for switching between assigned elders

Props:
- elders: Elder[]
- selectedElderId: string
- onSelect: (elderId: string) => void
- taskCounts: Record<string, { due: number; overdue: number }>

Display:
- Horizontal scrollable tabs
- Each tab: elder name + task count badge
- Selected tab: primary color highlight
- Overdue badge: red dot
- Tap = switch ElderContext to selected elder
```

### Step 6: Create ShiftInfoBar Component

Create `src/components/agency/ShiftInfoBar.tsx`:

```typescript
Purpose: Shows current shift status for agency caregivers

Display:
- Compact bar (36px height) below progress bar
- Shows: shift time range + elapsed time
- If shift not started: "Shift starts at 6:00 AM" + [Start Shift] button
- If on shift: "4h 23m elapsed" + running clock
- If shift ending soon: "Shift ends in 30 min" (amber warning)
- If shift ended: "Shift ended at 2:00 PM" + [End Shift] button (if not ended)

Data: reads from shiftSessions collection (existing)
```

### Step 7: Conditional Home Screen Rendering

In `src/app/dashboard/page.tsx`:

```typescript
export default function DashboardPage() {
  const { user } = useAuth();
  const { subscription } = useSubscription();

  const isAgencyPlan = subscription?.plan === 'multi-agency';
  const isSuperAdmin = user?.role === 'super_admin';

  if (isAgencyPlan && isSuperAdmin) {
    return <AgencyDashboard />;
  }

  if (isAgencyPlan && !isSuperAdmin) {
    // Agency caregiver: guided home with elder tabs + shift bar
    return <GuidedHomeWithElderTabs />;
  }

  // Family plan: standard guided home
  return <GuidedHome />;
}
```

## Role-Specific Bottom Nav

```typescript
function getBottomNavItems(role: string, plan: string) {
  if (plan === 'multi-agency' && role === 'super_admin') {
    return [
      { icon: House, label: 'Home', href: '/dashboard' },
      { icon: Users, label: 'Staff', href: '/dashboard/caregivers' },
      { icon: Calendar, label: 'Schedule', href: '/dashboard/scheduling' },
      { icon: AlertTriangle, label: 'Alerts', href: '/dashboard/alerts' },
      { icon: Menu, label: 'More' },
    ];
  }
  if (plan === 'multi-agency') {
    // Agency caregiver
    return [
      { icon: House, label: 'Home', href: '/dashboard' },
      { icon: Heart, label: 'Care', href: '/dashboard/daily-care' },
      { icon: Mic, label: 'Voice' },
      { icon: Calendar, label: 'Shift', href: '/dashboard/scheduling' },
      { icon: Menu, label: 'More' },
    ];
  }
  // Family plan (default)
  return [
    { icon: House, label: 'Home', href: '/dashboard' },
    { icon: Heart, label: 'Care', href: '/dashboard/daily-care' },
    { icon: Mic, label: 'Voice' },
    { icon: FileText, label: 'Notes', href: '/dashboard/notes' },
    { icon: Menu, label: 'More' },
  ];
}
```

## Testing Requirements

- Super Admin sees AgencyDashboard, not GuidedHome
- Agency Caregiver sees elder tabs + shift bar
- Family Plan user sees standard GuidedHome
- Elder tab switching updates PriorityCard context
- Shift bar shows correct elapsed time
- Caregiver list shows all 10 caregivers
- Caregiver detail shows 3 elders with 2 member emails each
- Quick stats match Firestore data
- Activity feed shows recent actions
- Run: `npm test -- --testPathPattern=agency`
