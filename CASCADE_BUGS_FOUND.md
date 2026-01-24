# CASCADE SHIFT SCHEDULING - BUGS FOUND

**Test Date:** January 24, 2026
**Environment:** Production (https://myguide.health)

---

## BUG-1: Default Assignment Mode is "Direct Assign" instead of "Auto-Assign"

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Test Case** | CAS-1A.6 |
| **Expected** | Auto-Assign mode should be the default when creating a new shift |
| **Actual** | Direct Assign is the default (requires manual toggle to Auto-Assign) |
| **File** | `src/app/dashboard/agency/schedule/page.tsx` |
| **Line** | ~134 |
| **Code** | `assignmentMode: 'direct' as 'direct' \| 'cascade'` |
| **Fix** | Change default to `'cascade'` |
| **Impact** | Owner must manually switch to Auto-Assign every time, reducing cascade feature discoverability |

---

## BUG-2: Caregiver Label Text Mismatch in Auto-Assign Mode

| Field | Detail |
|-------|--------|
| **Severity** | Low (cosmetic) |
| **Test Case** | CAS-1A.7 |
| **Expected** | "Preferred First (optional)" |
| **Actual** | "Preferred Caregiver (optional)" |
| **File** | `src/app/dashboard/agency/schedule/page.tsx` |
| **Line** | ~1168 |
| **Code** | `createForm.assignmentMode === 'cascade' ? 'Preferred Caregiver (optional)' : 'Caregiver'` |
| **Fix** | Change to `'Preferred First (optional)'` if spec requires exact wording |
| **Impact** | Minimal - functionally correct, just label wording differs from spec |

---

## BUG-3: No Validation for Past Dates in Create Shift

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Test Case** | CAS-1E.6 |
| **Expected** | Error or warning when creating a shift for a past date |
| **Actual** | Shift created successfully on Dec 1, 2025 (past) with no validation error, API returned 200 |
| **Client File** | `src/app/dashboard/agency/schedule/page.tsx` |
| **Server File** | `src/app/api/shifts/create-cascade/route.ts` |
| **Fix** | Add date validation: `if (shiftDate < todayStart) return error('Cannot create shifts in the past')` |
| **Impact** | Owner can accidentally schedule shifts in the past, triggering cascade offers for past dates |

---

## Summary

| Bug ID | Severity | Status | Guardrail Safe |
|--------|----------|--------|----------------|
| BUG-1 | Medium | FIXED | Yes (UI-only change) |
| BUG-2 | Low | FIXED | Yes (UI-only change) |
| BUG-3 | Medium | DOCUMENTED | Yes (validation addition) |
