---
name: Schedule Assignment
description: Tab-based scheduling interface for weekly elder-caregiver assignments. Week Summary grid as default view with drill-down options.
---

## Overview

The Schedule Assignment system allows agency owners to assign caregivers to elders for the week using a **Copy + Adjust** workflow instead of complex auto-assignment algorithms.

### Why Copy + Adjust (Not Auto-Assign)

| What System Knows | What Owner Knows (Offline) |
|-------------------|---------------------------|
| Caregiver max load (3 elders) | "Caregiver 2 texted - sick tomorrow" |
| Previous assignments | "Caregiver 5 doesn't get along with Elder 12" |
| Time conflict detection | "Elder 8 lives 45 mins from Elder 3" |
| Nothing about distance | "Caregiver 1 prefers morning shifts only" |

**The owner always knows more than the system.** So we make manual assignment fast and easy.

---

## User Workflow (5 Steps)

```
1. Copy last week's schedule (or start blank)
2. Mark caregivers unavailable this week
3. System highlights conflicts
4. Owner fixes conflicts manually
5. Done (~5 minutes for 30 elders)
```

---

## UI Layout: Tab-Based Navigation

The schedule page uses **4 tabs** to provide different views of the same data:

```
┌─────────────────────────────────────────────────────────────────┐
│  WEEK: Jan 26 - Feb 1                    [< Prev]  [Next >]     │
├─────────────────────────────────────────────────────────────────┤
│  [Week Summary]  [By Caregiver]  [By Elder]  [Gaps Only]        │
│       ↑ DEFAULT                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Tab | Purpose | When to Use |
|-----|---------|-------------|
| **Week Summary** | Grid overview of caregiver load + elder coverage | Default view, quick status check |
| **By Caregiver** | Grouped list showing each caregiver's assignments | Check workload distribution |
| **By Elder** | Day-expand view showing each elder's coverage | Assign specific elders |
| **Gaps Only** | Filtered list of unfilled shifts only | Quick gap resolution |

---

## Tab 1: Week Summary (Default)

Grid showing caregiver load and elder coverage at a glance.

```
┌─────────────────────────────────────────────────────────────────┐
│  CAREGIVER LOAD                                                 │
│                    Mon  Tue  Wed  Thu  Fri  Sat    Total        │
│  ─────────────────────────────────────────────────────────      │
│  Caregiver 1        3    3    3    2    3    -      14          │
│  Caregiver 2        3    2    3    3    2    -      13          │
│  Caregiver 3        2    3    3    3    3    -      14          │
│  Caregiver 4        3    3    2    3    3    -      14          │
│  ...                                                            │
│  ─────────────────────────────────────────────────────────      │
│  TOTAL             28   28   27   28   28   12     151          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ELDER COVERAGE                                                 │
│                    Mon  Tue  Wed  Thu  Fri  Sat    Status       │
│  ─────────────────────────────────────────────────────────      │
│  LO-C1-1            ✓    ✓    ✓    ✓    ✓    -      5/5 ✓       │
│  LO-C4-1            ✓    ⚠    ✓    ✓    ✓    -      4/5 ⚠       │
│  LO-C7-3            ⚠    ⚠    ✓    ✓    ⚠    -      2/5 ⚠       │
│  ...                                                            │
│  ─────────────────────────────────────────────────────────      │
│  ⚠ = Missing coverage                                           │
│  Click any cell to assign/edit                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click caregiver row → Switch to "By Caregiver" tab, scrolled to that caregiver
- Click elder row → Switch to "By Elder" tab, scrolled to that elder
- Click any ⚠ cell → Open Assign Caregiver sheet for that elder+day

---

## Tab 2: By Caregiver

Grouped list showing each caregiver's weekly assignments.

```
┌─────────────────────────────────────────────────────────────────┐
│  ▼ Caregiver 1                               14 shifts (3/day)  │
├─────────────────────────────────────────────────────────────────┤
│    MONDAY                                                       │
│    • LO-C1-1    7:00 AM – 9:00 AM       ✓ Confirmed             │
│    • LO-C1-2    9:30 AM – 11:30 AM      ✓ Confirmed             │
│    • LO-C1-3    2:00 PM – 4:00 PM       ⏳ Awaiting             │
│                                                                 │
│    TUESDAY                                                      │
│    • LO-C1-1    8:00 AM – 10:00 AM      ✓ Confirmed             │
│    • LO-C2-3    11:00 AM – 1:00 PM      ✓ Confirmed             │
│    • LO-C3-2    3:00 PM – 5:00 PM       ⏳ Awaiting             │
│    ...                                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ▶ Caregiver 2                               13 shifts          │
│     (click to expand)                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click caregiver header → Expand/collapse
- Click shift row → Open shift details or Assign sheet (if unfilled)

---

## Tab 3: By Elder (Current Day-Expand View)

The existing day-expand view, showing shifts grouped by day.

```
┌─────────────────────────────────────────────────────────────────┐
│  ▼ MONDAY, JAN 27 — 2 gaps                              [+ Add] │
├─────────────────────────────────────────────────────────────────┤
│    ✓ Caregiver 1 → LO-C1-1    7AM–9AM       Confirmed           │
│    ✓ Caregiver 2 → LO-C2-1    8AM–10AM      Confirmed           │
│    ⚠ Unassigned  → LO-C4-1    --            [Assign]            │
│    ...                                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ▶ TUESDAY, JAN 28 — All covered ✓                      [+ Add] │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tab 4: Gaps Only

Filtered view showing ONLY unfilled shifts across the week.

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠ 24 GAPS THIS WEEK                                            │
├─────────────────────────────────────────────────────────────────┤
│  MONDAY (5 gaps)                                                │
│  • LO-C4-1     No caregiver assigned          [Assign]          │
│  • LO-C7-3     No caregiver assigned          [Assign]          │
│  • LO-C8-2     No caregiver assigned          [Assign]          │
│  ...                                                            │
│                                                                 │
│  TUESDAY (3 gaps)                                               │
│  • LO-C2-2     No caregiver assigned          [Assign]          │
│  • LO-C5-1     No caregiver assigned          [Assign]          │
│  ...                                                            │
├─────────────────────────────────────────────────────────────────┤
│  [Select All]  [Bulk Assign Selected →]                         │
└─────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click [Assign] → Open Assign Caregiver sheet
- Check multiple gaps → [Bulk Assign Selected] opens bulk assign sheet

---

## Data Model

### Existing Collections (No Changes)

**`scheduledShifts`** - Individual shift records
```typescript
{
  id: string;
  agencyId: string;
  elderId: string;
  elderName: string;
  caregiverId: string;       // Empty if unassigned
  caregiverName: string;
  date: Timestamp;
  startTime: string;         // "09:00"
  endTime: string;           // "17:00"
  status: 'unfilled' | 'scheduled' | 'confirmed' | ...;
}
```

### New Collections

**`weeklyScheduleTemplates`** - Saved schedule patterns
```typescript
{
  id: string;
  agencyId: string;
  weekStart: Timestamp;      // Sunday of the week
  name?: string;             // "Default" or custom name
  assignments: {
    [elderId: string]: {
      elderName: string;
      days: {
        [dayIndex: number]: {  // 0=Sun, 1=Mon, ...
          caregiverId: string;
          caregiverName: string;
          startTime: string;
          endTime: string;
        } | null;
      }
    }
  };
  createdAt: Timestamp;
  createdBy: string;
}
```

**`caregiverAvailability`** - Weekly availability overrides
```typescript
{
  id: string;
  agencyId: string;
  caregiverId: string;
  caregiverName: string;
  weekStart: Timestamp;
  availability: {
    [dayIndex: number]: 'available' | 'unavailable' | 'partial';
    partialHours?: {
      [dayIndex: number]: { start: string; end: string };
    }
  };
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## Row Interaction Behavior

### Shift Row Types

| Row Type | Visual | Click Action |
|----------|--------|--------------|
| **Assigned & Confirmed** | Green checkmark, "Confirmed" badge | View shift details (future: edit) |
| **Assigned & Awaiting** | Amber clock, "Awaiting" badge | View shift details + option to confirm |
| **Unfilled** | Red warning, "Unfilled" badge | **Open Assign Caregiver sheet** |
| **Missing Shift** | Red background, "Assign" button | **Open Assign Caregiver sheet** |

### Click Behavior Rules

1. **Unfilled shifts** (status: `unfilled` or no `caregiverId`):
   - Clicking anywhere on the row opens the Assign Caregiver bottom sheet
   - Shows elder name, date, and time slot
   - Lists all available caregivers with workload indicators

2. **Assigned shifts** (has `caregiverId`):
   - Clicking the row shows shift details (future: edit capability)
   - If status is `scheduled`/`pending_confirmation`, shows "Mark Confirmed" button

3. **Missing shifts** (elder has no shift for the day):
   - Displayed as gap row with red background
   - Click "Assign" button to open Assign Caregiver sheet
   - Creates new shift when caregiver is selected

### Assign Caregiver Sheet

```
┌─────────────────────────────────────────────────┐
│  Assign Caregiver                           ✕   │
│  LO-C7-1 • Mon, Jan 26                          │
├─────────────────────────────────────────────────┤
│  🕐 9:00 AM - 5:00 PM                           │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐    │
│  │ 👤 Caregiver 1                          │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │ 👤 Caregiver 2                          │    │
│  └─────────────────────────────────────────┘    │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

---

## Color Coding & Visual States

### Status Badges (No Action Needed)

| Badge | Color | Meaning |
|-------|-------|---------|
| **Confirmed** | Green | Shift is confirmed, no action needed |
| **Awaiting** | Amber | Waiting for caregiver to respond |
| **Unfilled** | Red | No caregiver assigned |
| **Completed** | Gray | Shift is done |

### Action Buttons (Click Required)

| Button | Color | Meaning |
|--------|-------|---------|
| **Confirm** | Blue | Owner needs to click to confirm shift |
| **Assign** | Red | Click to assign caregiver to gap |

**Design Principle:** Action buttons use distinct colors from status badges to clearly indicate "click me" vs "information only".

- **Blue** = Primary action (Confirm, Save, Submit)
- **Green** = Success/completed state (Confirmed badge)
- **Red** = Urgent action or warning (Assign gap, Unfilled badge)
- **Amber** = Pending/waiting state (Awaiting badge)

---

## Business Rules

### Caregiver Assignment Constraints

| Rule | Constraint | Enforcement |
|------|------------|-------------|
| **Daily Elder Limit** | Max 3 elders per caregiver per day | Hard block |
| **Minimum Time Gap** | Min 2-hour gap between shift end and next shift start | Hard block |

#### Rule 1: Daily Elder Limit

A caregiver cannot be assigned to more than **3 elders** on any given day.

```
✅ Valid: Caregiver 1 has 3 elders on Monday
❌ Invalid: Caregiver 1 has 4 elders on Monday
```

#### Rule 2: Minimum Time Gap (2 Hours)

There must be at least **2 hours** between a caregiver's shift ending and their next shift starting. This allows for travel time between elders.

**Important:** Time slots are NOT fixed. The owner picks ANY start/end time based on each elder's needs (7 AM, 5 PM, etc.). The system only validates the 2-hour gap.

```
✅ Valid Schedule (2+ hour gaps):
   Caregiver 1 → Elder A: 7:00 AM – 9:00 AM
   Caregiver 1 → Elder B: 11:00 AM – 1:00 PM    (2hr gap after 9AM ✓)
   Caregiver 1 → Elder C: 3:30 PM – 5:30 PM     (2.5hr gap after 1PM ✓)

❌ Invalid Schedule (overlapping or too close):
   Caregiver 1 → Elder A: 9:00 AM – 11:00 AM
   Caregiver 1 → Elder B: 11:30 AM – 1:30 PM    (only 30min gap ✗)

❌ Invalid Schedule (same time):
   Caregiver 1 → Elder A: 9:00 AM – 5:00 PM
   Caregiver 1 → Elder B: 9:00 AM – 5:00 PM     (overlap ✗)
```

### Flexible Time Slots

The owner sets shift times based on elder needs. Common patterns:

| Pattern | Example | Use Case |
|---------|---------|----------|
| Early morning | 6:00 AM – 8:00 AM | Elder needs help getting ready |
| Standard morning | 9:00 AM – 11:00 AM | Typical visit |
| Afternoon | 2:00 PM – 4:00 PM | Post-lunch care |
| Evening | 5:00 PM – 7:00 PM | Dinner assistance |

**The system does NOT enforce specific time slots.** It only validates:
1. Max 3 elders per caregiver per day
2. Min 2-hour gap between shifts for same caregiver

### Conflict Detection

| Conflict Type | Detection | Resolution |
|---------------|-----------|------------|
| Daily limit exceeded | Caregiver has ≥3 elders on day | Block assignment, show "Caregiver full" |
| Time gap too short | <2 hours between shifts | Block assignment, show conflict |
| Time overlap | Shifts overlap same time period | Block assignment, show conflict |
| Caregiver unavailable | Marked as unavailable for that day | Hide from caregiver list |
| Elder has no caregiver | No shift or unfilled shift | Show as gap, prompt to assign |

### Warning Messages

```
❌ Cannot assign: Caregiver 1 already has 3 elders on Monday.
   Choose a different caregiver.

❌ Cannot assign: Caregiver 1's shift ends at 11:00 AM.
   Next shift must start at 1:00 PM or later (2-hour minimum gap).

❌ Cannot assign: Caregiver 1 is already scheduled for 9AM-11AM.
   This overlaps with the requested time. Choose a different time or caregiver.
```

---

## Files to Create/Modify

### New Files (Tab-Based UI)

| File | Purpose |
|------|---------|
| `src/components/agency/schedule/ScheduleTabs.tsx` | Tab navigation component |
| `src/components/agency/schedule/WeekSummaryTab.tsx` | Tab 1: Grid view of caregiver load + elder coverage |
| `src/components/agency/schedule/ByCaregiverTab.tsx` | Tab 2: Grouped list by caregiver |
| `src/components/agency/schedule/ByElderTab.tsx` | Tab 3: Day-expand view (refactored from current) |
| `src/components/agency/schedule/GapsOnlyTab.tsx` | Tab 4: Filtered unfilled shifts |
| `src/components/agency/schedule/BulkAssignSheet.tsx` | Assign selected elders to caregiver |
| `src/components/agency/schedule/WeekSetupSheet.tsx` | Copy/blank setup bottom sheet |
| `src/components/agency/schedule/CaregiverAvailabilityGrid.tsx` | Toggle caregiver availability |
| `src/lib/firebase/scheduleTemplates.ts` | Template CRUD operations |
| `src/lib/firebase/caregiverAvailability.ts` | Availability CRUD |

### Modify Files

| File | Changes |
|------|---------|
| `src/app/dashboard/agency/schedule/page.tsx` | Add tab navigation, integrate all 4 tabs |
| `src/components/agency/schedule/WeekStripSchedule.tsx` | Refactor to support tab switching |
| `src/components/agency/schedule/DayShiftList.tsx` | Reuse in ByElderTab |

---

## Implementation Phases

### Phase 1: Tab Navigation ✅ DONE
- Tab bar with 4 tabs: Week Summary, By Caregiver, By Elder, Gaps Only
- Week Summary as default tab
- Tab state persists during session

### Phase 2: Week Summary Tab (Default)
- Caregiver load grid (caregivers × days)
- Elder coverage grid (elders × days)
- Click cell → opens Assign sheet
- Totals row/column

### Phase 3: By Caregiver Tab
- Expandable sections per caregiver
- Shows all shifts grouped by day
- Workload indicator (X/3 per day)

### Phase 4: By Elder Tab (Existing)
- Refactor current day-expand view
- Keep existing functionality
- Add checkbox for bulk select

### Phase 5: Gaps Only Tab
- Filtered view of unfilled shifts
- Grouped by day
- Bulk select + assign

### Phase 6: Bulk Assignment
- Checkbox to select multiple gaps
- "Assign Selected" → pick caregiver → create shifts for all

### Phase 7: Copy Last Week
- Load last week's shifts as template
- Apply to current week
- Highlight conflicts

### Phase 8: Caregiver Availability
- Grid to mark caregivers unavailable
- Auto-highlight affected assignments

---

## Test Accounts

From CLAUDE.md:

| Role | Email | Password |
|------|-------|----------|
| Agency Owner | ramanac+owner@gmail.com | AbcD12!@ |
| Caregiver 1 | ramanac+c1@gmail.com | AbcD12!@ |
| Caregiver 2 | ramanac+c2@gmail.com | AbcD12!@ |
| ... | ... | ... |
| Caregiver 10 | ramanac+c10@gmail.com | AbcD12!@ |

### Test Data Requirements
- 10 caregivers (c1-c10)
- 30 elders (3 per caregiver)
- Each elder needs daily shift coverage

---

## References

- `myguide-scheduling` skill - Basic shift CRUD
- `src/lib/firebase/scheduleShifts.ts` - Existing shift operations
- `scripts/createTestShift.ts` - Example seeding script
