# Implementation Plan: Schedule Assignment

## Summary

Replace the current Week Strip view with a **Copy + Adjust** assignment interface that:
1. Shows ALL 30 elders (not just existing shifts)
2. Allows bulk assignment with checkboxes
3. Supports copying last week's schedule
4. Marks caregivers as unavailable

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

## Phase 1.5: Click-to-Assign for Unfilled Shifts

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
- Click unfilled shift row → Assign Caregiver sheet opens
- Select caregiver → Shift updated with caregiverId
- Sheet closes and shift shows as assigned

---

## Phase 2: Elder-Centric Day List

Replace shift-centric view with elder-centric checklist.

### New Component: `ElderAssignmentList.tsx`

```typescript
interface ElderAssignmentListProps {
  date: Date;
  elders: Elder[];
  shifts: Map<string, ScheduledShift>; // elderId -> shift
  onAssign: (elderId: string, caregiverId: string) => void;
  onBulkSelect: (elderIds: string[]) => void;
}

// Renders:
// ☑ Elder 1 ............ Caregiver 2 ✓
// ☑ Elder 2 ............ --
// □ Elder 3 ............ Caregiver 1 ✓
```

### Files to Create
- `src/components/agency/schedule/ElderAssignmentList.tsx`

### Files to Modify
- `src/components/agency/schedule/DayShiftList.tsx` (replace or extend)

---

## Phase 3: Bulk Assignment

### New Component: `BulkAssignSheet.tsx`

```typescript
interface BulkAssignSheetProps {
  selectedElders: Elder[];
  caregivers: Caregiver[];
  date: Date;
  onAssign: (caregiverId: string) => void;
  onClose: () => void;
}

// Shows:
// - Selected elders count
// - Caregiver list with workload bars
// - Assign button
```

### Files to Create
- `src/components/agency/schedule/BulkAssignSheet.tsx`

### Logic
1. User checks multiple elders
2. Opens bulk assign sheet
3. Picks caregiver
4. System creates/updates shifts for all selected elders

---

## Phase 4: Copy Last Week

### New Component: `WeekSetupSheet.tsx`

```typescript
// Shows when entering schedule for a new week:
// - "Copy Last Week" button
// - "Start Blank" button
// - Caregiver availability toggles
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

## Phase 5: Caregiver Availability

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

## Phase 6: Conflict Detection

When copying schedule or toggling availability:

1. Find shifts where caregiver is unavailable
2. Highlight these in UI
3. Show conflict resolution sheet

### Conflict Types

| Conflict | Detection | Resolution |
|----------|-----------|------------|
| Caregiver unavailable | shift.caregiverId in unavailableDays | Reassign to available caregiver |
| Over capacity | caregiver has >3 elders/day | Warning only (allow override) |
| No caregiver | shift.caregiverId empty | Assign from available list |

---

## Execution Order

| Phase | Priority | Effort | Dependencies | Status |
|-------|----------|--------|--------------|--------|
| 1. Fix Gap Detection | HIGH | Small | None | ✅ DONE |
| 1.5. Click-to-Assign | HIGH | Small | Phase 1 | 🔲 TODO |
| 2. Elder-Centric List | HIGH | Medium | Phase 1.5 | 🔲 TODO |
| 3. Bulk Assignment | HIGH | Medium | Phase 2 | 🔲 TODO |
| 4. Copy Last Week | MEDIUM | Medium | Phase 3 | 🔲 TODO |
| 5. Caregiver Availability | MEDIUM | Medium | Phase 4 | 🔲 TODO |
| 6. Conflict Detection | LOW | Small | Phase 4, 5 | 🔲 TODO |

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

---

## Success Criteria

1. ✅ All 30 elders visible in schedule view (Phase 1 - DONE)
2. ✅ Accurate gap count per day (Phase 1 - DONE)
3. 🔲 Click unfilled shift → opens assign sheet (Phase 1.5)
4. 🔲 Bulk select and assign works (Phase 3)
5. 🔲 Copy last week creates shifts (Phase 4)
6. 🔲 Caregiver unavailability reflected (Phase 5)
7. 🔲 Conflicts highlighted and resolvable (Phase 6)
8. ✅ Mobile responsive
9. ✅ Grade 5 student can understand the UI
