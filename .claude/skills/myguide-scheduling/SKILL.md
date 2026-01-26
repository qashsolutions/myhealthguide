---
name: myguide-scheduling
description: Agency scheduling tab with day view, week view, shift creation, and caregiver assignment. Use when implementing the scheduling tab, shifts, day view, week view, or shift management for the agency PWA.
---

## What Exists

### File Paths

| File | Purpose |
|------|---------|
| `src/app/dashboard/calendar/page.tsx` | Current schedule page (week grid, request/swap views) |
| `src/app/dashboard/agency/page.tsx` | Agency management hub |
| `src/components/agency/scheduling/MonthCalendarView.tsx` | Month calendar grid component |
| `src/components/agency/ElderTabSelector.tsx` | Horizontal scrollable elder tabs |
| `src/components/agency/ShiftInfoBar.tsx` | Active shift timer bar |
| `src/components/navigation/MoreMenuDrawer.tsx` | Bottom sheet (mobile) / side panel (desktop) |
| `src/components/ui/dialog.tsx` | Radix Dialog (modal) |
| `src/components/ui/select.tsx` | Radix Select (accessible dropdown) |
| `src/components/dashboard/ElderSelector.tsx` | Elder dropdown picker |
| `src/lib/firebase/scheduleShifts.ts` | Shift CRUD operations |
| `src/lib/firebase/shiftCascade.ts` | Priority cascade auto-assign |
| `src/lib/firebase/shiftSwap.ts` | Swap request logic |
| `src/types/index.ts` | All TypeScript interfaces |

### Reusable Components

- **MoreMenuDrawer** (`isOpen`, `onClose`) — Bottom sheet pattern on mobile, side panel on desktop. Use this pattern for shift forms.
- **ElderTabSelector** (`elders`, `selectedElderId`, `onSelect`, `taskCounts?`) — Horizontal tabs for elder switching.
- **Radix Select** — Accessible dropdown for caregiver/elder picking.
- **Radix Dialog** — Modal overlay for confirmations.
- **`cn()` utility** from `src/lib/utils.ts` — clsx + tailwind-merge.

### Current Firestore Schema

**Collection: `scheduledShifts`**
```typescript
interface ScheduledShift {
  id: string;
  agencyId: string;
  groupId: string;
  elderId: string;
  elderName: string;
  caregiverId: string;
  caregiverName: string;
  date: Date;
  startTime: string;        // "09:00"
  endTime: string;          // "17:00"
  duration: number;         // minutes
  status: 'offered' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'unfilled';
  notes?: string;
  assignmentMode?: 'direct' | 'cascade';
  cascadeState?: CascadeState;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  isRecurring?: boolean;
  recurringScheduleId?: string;
}
```

**Collection: `shiftRequests`**
```typescript
interface ShiftRequest {
  id: string;
  agencyId: string;
  caregiverId: string;
  caregiverName: string;
  requestType: 'specific' | 'recurring';
  specificDate?: Date;
  recurringDays?: number[];  // [0-6] Sun-Sat
  startTime: string;
  endTime: string;
  preferredElders?: string[];
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: Date;
}
```

**Collection: `shiftSwapRequests`**
```typescript
interface ShiftSwapRequest {
  id: string;
  agencyId: string;
  requestingCaregiverId: string;
  targetCaregiverId?: string;
  shiftToSwapId: string;
  shiftToSwap: { elderId, elderName, date, startTime, endTime };
  reason?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'admin_approved';
  requestedAt: Date;
}
```

---

## What We're Building

### Day View (default)
- Single-day timeline showing all shifts for the agency
- Each shift card: elder name, caregiver (or "Unassigned"), time range, status badge
- Tap a shift to open assignment/edit bottom sheet
- Date navigation: prev/next day arrows, "Today" button

### Week View
- 7-day overview as vertical cards (one per day)
- Each day shows shift count, gap count, total hours
- Color-coded: green (filled), yellow (pending), red (gaps/unfilled)
- Tap a day card to switch to Day View for that date

### New Shift Form (bottom sheet)
- Date picker (native `<input type="date">`)
- Start time / End time (native `<input type="time">`)
- Elder picker (Radix Select, populated from agency elders)
- Caregiver picker (Radix Select, populated from agency caregivers)
- Repeat options: None, Daily, Weekdays, Custom (day checkboxes)
- Notes (textarea, optional)
- Submit button: creates `scheduledShift` doc

---

## Implementation Phases

### Phase 1: Day View (read-only)

Create `src/app/dashboard/agency/schedule/page.tsx`:
1. Query `scheduledShifts` where `agencyId == user.agencyId` and `date == selectedDate`
2. Render shift cards sorted by `startTime`
3. Date navigation (prev/next/today) using `date-fns`
4. Status badges with existing color scheme
5. Empty state: "No shifts scheduled for this day"

**Test:** Verify shifts display for a known date. Verify date navigation works. Verify empty state.

### Phase 2: Assign Caregiver

1. Tap shift card → open bottom sheet (reuse MoreMenuDrawer pattern)
2. Bottom sheet shows: shift details (elder, time, status) + caregiver Radix Select
3. On caregiver selection, update `scheduledShift.caregiverId` and `caregiverName`
4. Update status from `unfilled` → `scheduled`
5. Close sheet, refresh list

**Test:** Tap unassigned shift → pick caregiver → verify Firestore update. Verify UI refreshes.

### Phase 3: Week View

1. Add view toggle: Day | Week (pill buttons at top)
2. Query shifts for 7-day window (`startOfWeek` to `endOfWeek`)
3. Render 7 vertical day cards with summary stats
4. Gap detection: compare shifts against expected coverage hours
5. Tap day card → switch to Day View for that date

**Test:** Verify 7 cards render. Verify gap count matches missing coverage. Verify day-tap navigation.

### Phase 4: Create Shift (FAB + bottom sheet)

1. Add FAB (floating action button) — bottom-right, `+` icon, 56px
2. FAB opens bottom sheet with shift form fields
3. Form validation: date required, start < end, elder required
4. On submit: call `createShift()` from `scheduleShifts.ts`
5. Support repeat: if recurring, create shifts for each selected day in next 4 weeks

**Test:** Create single shift → verify in Firestore. Create recurring → verify multiple docs. Validate form errors.

### Phase 5: Edit/Delete Shifts

1. Long-press or tap edit icon on shift card → open edit bottom sheet
2. Pre-populate form with existing shift data
3. "Save Changes" updates doc, "Delete" sets status to `cancelled`
4. Confirmation dialog (Radix Dialog) before delete

**Test:** Edit time → verify update. Delete → verify status change. Verify confirmation dialog.

---

## Data Schema Updates

**None required.** The existing `ScheduledShift` interface covers all needed fields:
- `date`, `startTime`, `endTime` for scheduling
- `caregiverId`, `caregiverName` for assignment
- `elderId`, `elderName` for elder association
- `status` for lifecycle tracking
- `isRecurring`, `recurringScheduleId` for repeat shifts

If gap detection needs explicit coverage hours, add to agency settings later (not blocking).

---

## UX Constraints

- **Responsive PWA**: Mobile-first, consistent with existing Tailwind breakpoints (`<640px` mobile, `640-1024px` tablet, `>1024px` desktop)
- **No drag-and-drop**: All interactions are tap/click. No sortable lists.
- **Bottom sheet pattern**: Reuse `MoreMenuDrawer` slide-up-from-bottom approach for all forms
- **Touch targets**: All interactive elements ≥ 44px height/width on mobile
- **Native inputs**: Use `<input type="date">` and `<input type="time">` (no custom picker library)
- **Dark mode**: Support via existing `dark:` Tailwind classes
- **Offline awareness**: Show stale data indicator if offline (existing PWA pattern)
- **Loading states**: Skeleton or spinner while querying Firestore
- **Terminology**: "Loved One" in user-facing text, `elderId`/`elderName` in code

---

## Auth & Role Requirements

- **SuperAdmin** (`isSuperAdmin(user)`): Full access — create, assign, edit, delete shifts
- **Caregiver** (`isAgencyCaregiver(user)`): View own shifts only, request new shifts
- Use `useAuth()` from `@/contexts/AuthContext` for role detection
- Agency ID from `user.agencyId` or `user.multiAgencyId`

---

## Key Imports

```typescript
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay, isToday } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { isSuperAdmin, isAgencyCaregiver } from '@/lib/firebase/adminUtils';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
```
