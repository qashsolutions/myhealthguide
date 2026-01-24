# CASCADE SHIFT SCHEDULING - FEATURE STATUS

**Assessment Date:** January 24, 2026
**Environment:** Production (https://myguide.health)

---

## What Works

| Feature | Status | Evidence |
|---------|--------|----------|
| Schedule page loads for Agency Owner | Working | Schedule visible with Day/Week views |
| Create Shift FAB button (SuperAdmin only) | Working | Blue "+" button visible at bottom-right |
| Create Shift dialog opens | Working | "New Shift" bottom sheet with all fields |
| Assignment Mode toggle (Direct/Auto) | Working | Segmented toggle switches correctly |
| Auto-Assign mode shows optional caregiver | Working | "Preferred Caregiver (optional)" label, "None (auto-rank)" default |
| Direct Assign mode requires caregiver | Working | Red asterisk (*) on Caregiver field |
| Date field pre-fills from selected date | Working | Shows current calendar date |
| Start/End time fields | Working | Default 09:00-17:00 |
| Elder dropdown (30 elders) | Working | All LO-C1-1 through LO-C10-3 listed |
| Caregiver dropdown (10 caregivers) | Working | Caregivers 1-10 listed |
| Repeat options (none/daily/weekdays/custom) | Working | All 4 options in dropdown |
| Notes field (optional) | Working | Textarea with placeholder |
| Create Shift submit button | Working | Blue button at bottom |
| Shift cards on schedule | Working | Shows time, elder, caregiver, status |
| Shift status badges | Working | "Pending" (offered), unfilled shown |
| Assign Caregiver button (unfilled shifts) | Working | Black button on unfilled shift cards |
| Edit shift (pencil icon) | Working | Visible on shift cards for SuperAdmin |

---

## What Doesn't Match Spec

| Feature | Issue | Severity |
|---------|-------|----------|
| Default assignment mode | Should be "Auto-Assign" but defaults to "Direct Assign" | Medium |
| Caregiver label in Auto-Assign | Shows "Preferred Caregiver (optional)" instead of "Preferred First (optional)" | Low |

---

## Not Yet Tested (Pending CAS-1B+ tests)

| Feature | Test Required |
|---------|---------------|
| Cascade scoring algorithm | Verify correct caregiver ranking |
| 30-min offer window | Verify timeout behavior |
| Offer accept/decline flow | Test from caregiver perspective |
| Cascade to next caregiver | Verify after decline/timeout |
| Unfilled notification to owner | Verify after all exhausted |
| Shift status transitions | offered → scheduled/unfilled |
| Multiple concurrent cascades | Race condition testing |
| Preferred caregiver boost | +10 points verification |

---

## Architecture Confirmed

| Component | Location | Purpose |
|-----------|----------|---------|
| Schedule UI | `src/app/dashboard/agency/schedule/page.tsx` | Full schedule CRUD |
| Shift creation (direct) | `src/lib/firebase/scheduleShifts.ts` → `createScheduledShift` | Direct caregiver assignment |
| Shift creation (cascade) | `src/lib/firebase/scheduleShifts.ts` → `createCascadeShift` | Cascade offer system |
| Shift offer API | `/api/shift-offer/*` | Offer management (DO NOT MODIFY) |
| Cloud Functions | Firebase Functions | Scoring, timeout, notifications |
