---
name: Schedule Assignment
description: Copy + Adjust scheduling for weekly elder-caregiver assignments. Displays all elders needing care with simple bulk assignment tools.
---

## Overview

The Schedule Assignment system allows agency owners to assign caregivers to elders for the week using a **Copy + Adjust** workflow instead of complex auto-assignment algorithms.

### Why Copy + Adjust (Not Auto-Assign)

| What System Knows | What Owner Knows (Offline) |
|-------------------|---------------------------|
| Caregiver max load (3 elders) | "Caregiver 2 texted - sick tomorrow" |
| Previous assignments | "Caregiver 5 doesn't get along with Elder 12" |
| Basic time slots | "Elder 8 lives 45 mins from Elder 3" |
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

## UI Components

### 1. Week Setup Screen

```
┌─────────────────────────────────────────────────┐
│  SCHEDULE WEEK: Jan 27 - Feb 2                  │
│                                                 │
│  How do you want to start?                      │
│                                                 │
│  [📋 Copy Last Week]  [📄 Start Blank]          │
│                                                 │
│  Caregivers available this week:                │
│  ✓ Caregiver 1     ✓ Caregiver 6               │
│  ✓ Caregiver 2     ✗ Caregiver 7  (OFF)        │
│  ✓ Caregiver 3     ✓ Caregiver 8               │
│  ...                                            │
│                                                 │
│  [Continue →]                                   │
└─────────────────────────────────────────────────┘
```

### 2. Day Assignment View

```
┌─────────────────────────────────────────────────┐
│  MONDAY, JAN 27                    [< Day >]    │
│                                                 │
│  ⚠️ 5 elders need caregivers                    │
│                                                 │
│  [Select All Unassigned]  [Assign Selected ▼]   │
└─────────────────────────────────────────────────┘

│ ☑ Elder 1 ............ --                       │
│ ☑ Elder 2 ............ --                       │
│ □ Elder 3 ............ Caregiver 2 ✓            │
│ □ Elder 4 ............ Caregiver 1 ✓            │
│ ☑ Elder 5 ............ --                       │
│ ...                                             │

┌─────────────────────────────────────────────────┐
│  Assign 3 selected elders to:                   │
│                                                 │
│  ○ Caregiver 1  ████████░░  2/3                 │
│  ○ Caregiver 3  ████░░░░░░  1/3  ← capacity    │
│  ○ Caregiver 4  ██████████  3/3  FULL          │
└─────────────────────────────────────────────────┘
```

### 3. Conflict Resolution

```
┌─────────────────────────────────────────────────┐
│  ⚠️ CONFLICTS FOUND                              │
│                                                 │
│  Caregiver 7 is unavailable Monday              │
│  3 elders need reassignment:                    │
│                                                 │
│  Elder 17 → [Select Caregiver ▼]                │
│  Elder 21 → [Select Caregiver ▼]                │
│  Elder 28 → [Select Caregiver ▼]                │
│                                                 │
│  [Auto-distribute to available caregivers]      │
└─────────────────────────────────────────────────┘
```

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

## Business Rules

### Caregiver Limits
- Multi-agency plan: Max 3 elders per caregiver per day
- Show warning (not block) if exceeded

### Conflict Detection
1. Caregiver marked unavailable for a day they have assignments
2. Elder has no caregiver assigned for a day
3. Caregiver over max capacity

### Warnings (Not Blocks)
```
⚠️ Warning: Caregiver 1 already has 3 elders for Monday.
   Assigning Elder 5 will exceed recommended limit.

   [Assign Anyway]  [Choose Different]
```

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/agency/schedule/assignment/page.tsx` | Week assignment page |
| `src/components/agency/schedule/WeekSetupSheet.tsx` | Copy/blank setup bottom sheet |
| `src/components/agency/schedule/DayAssignmentList.tsx` | Elder list with checkboxes |
| `src/components/agency/schedule/CaregiverAvailabilityGrid.tsx` | Toggle caregiver availability |
| `src/components/agency/schedule/BulkAssignSheet.tsx` | Assign selected elders to caregiver |
| `src/components/agency/schedule/ConflictResolutionSheet.tsx` | Fix conflicts UI |
| `src/lib/firebase/scheduleTemplates.ts` | Template CRUD operations |
| `src/lib/firebase/caregiverAvailability.ts` | Availability CRUD |

### Modify Files

| File | Changes |
|------|---------|
| `src/components/agency/schedule/WeekStripSchedule.tsx` | Add link to assignment page |
| `src/components/agency/schedule/ScheduleAlertsBanner.tsx` | Show "X elders need assignment" |

---

## Implementation Phases

### Phase 1: Display All Elders
- Query all elders for agency (from groups)
- For selected day, show each elder with current assignment (or "unassigned")
- Show count of unassigned

### Phase 2: Single Assignment
- Tap elder row → open caregiver picker
- Show caregiver workload (X/3)
- On select → create/update scheduledShift

### Phase 3: Bulk Assignment
- Checkbox to select multiple elders
- "Assign Selected" → pick caregiver → create shifts for all

### Phase 4: Copy Last Week
- Load last week's shifts as template
- Apply to current week
- Highlight conflicts

### Phase 5: Caregiver Availability
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
