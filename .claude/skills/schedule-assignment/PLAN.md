# Implementation Plan: Schedule Assignment

## Summary

Replace the current day-list view with a **Tab-Based** schedule interface that:
1. **Week Summary** (default) - Grid showing caregiver load + elder coverage
2. **By Caregiver** - Grouped list showing each caregiver's weekly assignments
3. **By Elder** - Current day-expand view (existing)
4. **Gaps Only** - Filtered list of unfilled shifts for quick resolution

Plus Copy + Adjust workflow:
- Copy last week's schedule
- Mark caregivers unavailable
- Bulk assignment for gaps

---

## Phase 1: Fix Gap Detection ✅ COMPLETE

**Problem:** Current view only shows existing shifts, not elders without shifts.

**Solution:** Query elders independently, then cross-reference with shifts.

### Changes to `WeekStripSchedule.tsx`

```typescript
// BEFORE (only shows existing shifts):
const gapsByDate = shifts.filter(s => s.status === 'unfilled' || !s.caregiverId);

// AFTER (shows ALL elders needing coverage):
// 1. Get all elders for agency
// 2. For each day, check which elders have shifts
// 3. Elders without shifts = gaps (with shiftId: '')
```

### Files Modified
- `src/components/agency/schedule/WeekStripSchedule.tsx`

### Test Results
- ✅ 30 elders visible in week view
- ✅ Days with missing shifts show correct gap count
- ✅ Assign creates new shift when none exists

---

## Phase 1.5: Click-to-Assign for Unfilled Shifts ✅ COMPLETE

**Problem:** Clicking an unfilled shift row does nothing (just logs to console).

**Solution:** Make unfilled shift rows clickable to open the Assign Caregiver sheet.

### Current Behavior

| Row Type | Current Click Action |
|----------|---------------------|
| Assigned shift | `console.log()` (does nothing) |
| Unfilled shift | `console.log()` (does nothing) |
| Missing shift (gap) | "Assign" button opens sheet ✅ |

### Target Behavior

| Row Type | Target Click Action |
|----------|---------------------|
| Assigned shift | View details / edit (future) |
| Unfilled shift | **Open Assign Caregiver sheet** |
| Missing shift (gap) | "Assign" button opens sheet ✅ |

### Changes to `DayShiftList.tsx`

```typescript
// For unfilled shifts, clicking the row should trigger assignment
// instead of just viewing details
onClick={() => {
  if (isUnfilled) {
    onAssignGap({
      shiftId: shift.id,
      elderId: shift.elderId,
      elderName: shift.elderName,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
    });
  } else {
    onShiftClick(shift);
  }
}}
```

### Files to Modify
- `src/components/agency/schedule/DayShiftList.tsx`

### Test
- ✅ Click unfilled shift row → Assign Caregiver sheet opens
- ✅ Select caregiver → Shift updated with caregiverId
- ✅ Sheet closes and shift shows as assigned

---

## Phase 2: Tab Navigation + Week Summary Tab 🔲 TODO

**Goal:** Add tab navigation and implement the Week Summary grid as default view.

### New Components

#### `ScheduleTabs.tsx` - Tab Navigation

```typescript
interface ScheduleTabsProps {
  activeTab: 'summary' | 'caregiver' | 'elder' | 'gaps';
  onTabChange: (tab: string) => void;
  gapsCount: number;  // Show badge on Gaps tab
}

// Renders:
// [Week Summary]  [By Caregiver]  [By Elder]  [Gaps Only (5)]
//      ↑ active
```

#### `WeekSummaryTab.tsx` - Default Tab

```typescript
interface WeekSummaryTabProps {
  weekStart: Date;
  shifts: ScheduledShift[];
  caregivers: Caregiver[];
  elders: Elder[];
  onCellClick: (elderId: string, date: Date) => void;
}

// Renders two grids:
// 1. Caregiver Load (caregivers × days → count)
// 2. Elder Coverage (elders × days → ✓/⚠)
```

### Grid Interactions

| Click Target | Action |
|--------------|--------|
| Caregiver row | Switch to "By Caregiver" tab, scroll to caregiver |
| Elder row | Switch to "By Elder" tab, scroll to elder |
| ⚠ (gap cell) | Open Assign Caregiver sheet |
| ✓ (assigned cell) | Open shift details |

### Files to Create
- `src/components/agency/schedule/ScheduleTabs.tsx`
- `src/components/agency/schedule/WeekSummaryTab.tsx`

### Files to Modify
- `src/app/dashboard/agency/schedule/page.tsx` - Add tab state, render tabs

### Test
- [ ] Tab navigation works
- [ ] Week Summary shows correct caregiver counts
- [ ] Week Summary shows correct elder coverage (✓/⚠)
- [ ] Click ⚠ opens Assign sheet
- [ ] Mobile responsive (horizontal scroll for grid)

---

## Phase 3: By Caregiver Tab 🔲 TODO

**Goal:** Grouped list showing each caregiver's weekly assignments.

### New Component: `ByCaregiverTab.tsx`

```typescript
interface ByCaregiverTabProps {
  weekStart: Date;
  shifts: ScheduledShift[];
  caregivers: Caregiver[];
  onShiftClick: (shift: ScheduledShift) => void;
}

// Renders expandable sections:
// ▼ Caregiver 1 (14 shifts)
//   MONDAY
//   • LO-C1-1  7:00 AM – 9:00 AM   ✓ Confirmed
//   • LO-C1-2  11:00 AM – 1:00 PM  ⏳ Awaiting
//   ...
// ▶ Caregiver 2 (13 shifts)
```

### Features
- Expandable/collapsible caregiver sections
- Shifts grouped by day within each caregiver
- Shows total shift count per caregiver
- Workload indicator (X/3 per day)

### Files to Create
- `src/components/agency/schedule/ByCaregiverTab.tsx`

### Test
- [ ] Caregivers listed with shift counts
- [ ] Expand/collapse works
- [ ] Shifts grouped by day
- [ ] Click shift → opens details/assign sheet

---

## Phase 4: By Elder Tab (Refactor Existing) 🔲 TODO

**Goal:** Refactor existing day-expand view into a tab component.

### Changes to Existing Components

The current `WeekStripSchedule.tsx` + `DayShiftList.tsx` become the "By Elder" tab.

```typescript
interface ByElderTabProps {
  weekStart: Date;
  shifts: ScheduledShift[];
  elders: Elder[];
  onAssignGap: (gap: Gap) => void;
  onShiftClick: (shift: ScheduledShift) => void;
}

// Renders existing day-expand view:
// ▼ MONDAY, JAN 27 — 2 gaps
//   ✓ Caregiver 1 → LO-C1-1  7AM–9AM   Confirmed
//   ⚠ Unassigned  → LO-C4-1  --        [Assign]
// ▶ TUESDAY, JAN 28 — All covered ✓
```

### Files to Create
- `src/components/agency/schedule/ByElderTab.tsx` (wrapper around existing components)

### Files to Modify
- `src/components/agency/schedule/WeekStripSchedule.tsx` - Extract logic for reuse
- `src/components/agency/schedule/DayShiftList.tsx` - Keep as-is, used by ByElderTab

### Test
- [ ] Existing day-expand functionality preserved
- [ ] Works within tab context
- [ ] Click-to-assign still works

---

## Phase 5: Gaps Only Tab 🔲 TODO

**Goal:** Filtered view showing only unfilled shifts for quick gap resolution.

### New Component: `GapsOnlyTab.tsx`

```typescript
interface GapsOnlyTabProps {
  weekStart: Date;
  gaps: Gap[];  // All unfilled shifts across the week
  onAssignGap: (gap: Gap) => void;
  onBulkAssign: (gaps: Gap[], caregiverId: string) => void;
}

// Renders:
// ⚠ 24 GAPS THIS WEEK
//
// MONDAY (5 gaps)
// ☑ LO-C4-1   No caregiver   [Assign]
// ☑ LO-C7-3   No caregiver   [Assign]
// ...
//
// [Select All]  [Bulk Assign Selected →]
```

### Features
- Shows only unfilled shifts
- Grouped by day
- Checkbox for multi-select
- Bulk assign button

### Files to Create
- `src/components/agency/schedule/GapsOnlyTab.tsx`

### Test
- [ ] Only shows unfilled shifts
- [ ] Multi-select works
- [ ] Bulk assign creates shifts for all selected

---

## Phase 6: Bulk Assignment 🔲 TODO

### New Component: `BulkAssignSheet.tsx`

```typescript
interface BulkAssignSheetProps {
  selectedGaps: Gap[];
  caregivers: Caregiver[];
  onAssign: (caregiverId: string) => void;
  onClose: () => void;
}

// Shows:
// Assign 5 elders to:
// ○ Caregiver 1  ████████░░  2/3
// ○ Caregiver 3  ████░░░░░░  1/3
// ○ Caregiver 4  ██████████  3/3  FULL
```

### Files to Create
- `src/components/agency/schedule/BulkAssignSheet.tsx`

### Logic
1. User checks multiple gaps (from Gaps Only tab or By Elder tab)
2. Opens bulk assign sheet
3. Picks caregiver (with workload shown)
4. System validates constraints (max 3/day, 2hr gap)
5. Creates shifts for valid assignments, shows errors for conflicts

---

## Phase 7: Copy Last Week 🔲 TODO

### New Component: `WeekSetupSheet.tsx`

```typescript
// Shows when entering schedule for a new week:
// - "Copy Last Week" button
// - "Start Blank" button
// - Preview of what will be copied
```

### New Service: `src/lib/firebase/scheduleTemplates.ts`

```typescript
// Copy shifts from one week to another
async function copyWeekSchedule(
  agencyId: string,
  sourceWeekStart: Date,
  targetWeekStart: Date
): Promise<void>;

// Get last week with scheduled shifts
async function getLastScheduledWeek(agencyId: string): Promise<Date | null>;
```

### Files to Create
- `src/components/agency/schedule/WeekSetupSheet.tsx`
- `src/lib/firebase/scheduleTemplates.ts`

---

## Phase 8: Caregiver Availability 🔲 TODO

### New Component: `CaregiverAvailabilityGrid.tsx`

```typescript
// Grid showing:
//              Mon  Tue  Wed  Thu  Fri  Sat
// Caregiver 1   ✓    ✓    ✓    ✓    ✓    ✓
// Caregiver 2   ✓    ✗    ✓    ✓    ✓    ✓  ← Tuesday off
// Caregiver 3   ✓    ✓    ✓    ✗    ✗    ✓  ← Thu/Fri off
```

### New Collection: `caregiverAvailability`

```typescript
{
  agencyId: string;
  caregiverId: string;
  weekStart: Timestamp;
  unavailableDays: number[]; // [2, 4] = Tue, Thu
}
```

### Files to Create
- `src/components/agency/schedule/CaregiverAvailabilityGrid.tsx`
- `src/lib/firebase/caregiverAvailability.ts`

---

## Phase 1.6: Fix Test Data Seeding ✅ COMPLETE

**Problem:** Seeding script creates unrealistic shifts:
- Same caregiver assigned to multiple elders at same time (9AM-5PM)
- Caregiver assigned to >3 elders per day

**Solution:** Update seeding script with realistic constraints.

### Constraints Enforced

| Rule | Constraint |
|------|------------|
| Daily elder limit | Max 3 elders per caregiver per day |
| Minimum time gap | 2+ hours between shifts for same caregiver |

### Time Slots (Flexible)

Owner can set ANY time. For test data, we use sample staggered slots:
- Varied start times (7AM, 8AM, 9AM, 11AM, 2PM, 4PM, etc.)
- Min 2-hour gap between shifts
- Max 3 elders per caregiver per day

**Note:** These are NOT fixed slots. The system only validates the 2-hour gap and 3-elder limit. Owner picks any time based on elder needs.

### Files Modified
- `.claude/skills/schedule-assignment/scripts/seedWeeklyShifts.ts`

### Test Results
- ✅ Each caregiver has max 3 elders per day
- ✅ No overlapping shifts for same caregiver
- ✅ Min 2-hour gap between shifts

---

## Phase 6: Conflict Detection & Constraint Validation

When assigning caregivers, the system must validate:

### Hard Constraints (Block Assignment)

| Constraint | Check | Error Message |
|------------|-------|---------------|
| Daily limit | Count caregiver's shifts on that day | "Caregiver X already has 3 elders on this day" |
| Time overlap | Check if new shift overlaps existing | "Caregiver X is already scheduled for this time" |

### Soft Constraints (Warning Only)

| Constraint | Check | Warning Message |
|------------|-------|-----------------|
| Caregiver preference | Check caregiver-elder history | "Caregiver X hasn't worked with this elder before" |

### Validation Logic

```typescript
function canAssignCaregiver(
  caregiverId: string,
  date: Date,
  startTime: string,
  endTime: string,
  existingShifts: ScheduledShift[]
): { valid: boolean; error?: string } {
  // 1. Check daily limit (max 3 elders)
  const sameDayShifts = existingShifts.filter(
    s => s.caregiverId === caregiverId && isSameDay(s.date, date)
  );
  if (sameDayShifts.length >= 3) {
    return { valid: false, error: 'Caregiver already has 3 elders on this day' };
  }

  // 2. Check time overlap (2-hour window)
  const hasOverlap = sameDayShifts.some(s => timesOverlap(s, startTime, endTime));
  if (hasOverlap) {
    return { valid: false, error: 'Caregiver is already scheduled for this time' };
  }

  return { valid: true };
}
```

### Conflict Types

| Conflict | Detection | Resolution |
|----------|-----------|------------|
| Caregiver unavailable | shift.caregiverId in unavailableDays | Reassign to available caregiver |
| Over capacity | caregiver has ≥3 elders/day | Block assignment, suggest different caregiver |
| Time conflict | shift overlaps existing shift | Block assignment, suggest different time |
| No caregiver | shift.caregiverId empty | Assign from available list |

---

## Execution Order

| Phase | Description | Priority | Effort | Dependencies | Status |
|-------|-------------|----------|--------|--------------|--------|
| 1 | Fix Gap Detection | HIGH | Small | None | ✅ DONE |
| 1.5 | Click-to-Assign | HIGH | Small | Phase 1 | ✅ DONE |
| 1.6 | Fix Test Data | HIGH | Small | Phase 1.5 | ✅ DONE |
| 2 | Tab Nav + Week Summary | HIGH | Medium | Phase 1.6 | 🔲 TODO |
| 3 | By Caregiver Tab | HIGH | Medium | Phase 2 | 🔲 TODO |
| 4 | By Elder Tab (refactor) | MEDIUM | Small | Phase 2 | 🔲 TODO |
| 5 | Gaps Only Tab | HIGH | Medium | Phase 2 | 🔲 TODO |
| 6 | Bulk Assignment | HIGH | Medium | Phase 5 | 🔲 TODO |
| 7 | Copy Last Week | MEDIUM | Medium | Phase 6 | 🔲 TODO |
| 8 | Caregiver Availability | MEDIUM | Medium | Phase 7 | 🔲 TODO |
| 9 | Conflict Detection | HIGH | Medium | Phase 2 | 🔲 TODO |

---

## Test Data

Run seeding script to create test shifts:

```bash
npx ts-node --project tsconfig.scripts.json \
  .claude/skills/schedule-assignment/scripts/seedWeeklyShifts.ts
```

This creates:
- 30 elders with shifts across the week
- Varying assignment states (assigned, unassigned)
- Different patterns per day (more gaps later in week)
- Realistic time slots with 2+ hour gaps
- Max 3 elders per caregiver per day

---

## Success Criteria

### Completed
1. ✅ All 30 elders visible in schedule view (Phase 1)
2. ✅ Accurate gap count per day (Phase 1)
3. ✅ Click unfilled shift → opens assign sheet (Phase 1.5)
4. ✅ Realistic test data with constraints (Phase 1.6)
5. ✅ Mobile responsive
6. ✅ Grade 5 student can understand the UI

### Pending
7. 🔲 Tab navigation with 4 tabs (Phase 2)
8. 🔲 Week Summary grid shows caregiver load (Phase 2)
9. 🔲 Week Summary grid shows elder coverage (Phase 2)
10. 🔲 By Caregiver grouped view (Phase 3)
11. 🔲 Gaps Only filtered view (Phase 5)
12. 🔲 Bulk select and assign works (Phase 6)
13. 🔲 Copy last week creates shifts (Phase 7)
14. 🔲 Caregiver unavailability reflected (Phase 8)
15. 🔲 Conflicts highlighted and resolvable (Phase 9)
