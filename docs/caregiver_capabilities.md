# Caregiver Capabilities

**Last Updated:** January 26, 2026

This document lists all actions and capabilities available to caregivers in MyHealthGuide (Multi-Agency Plan).

---

## Permission Check

Caregiver status is determined by:
```typescript
isCaregiver = user.agencies?.some(a => a.role === 'caregiver')
isAgencyCaregiver = user.agencies && user.agencies.length > 0 && !isFamilyMember
```

---

## 1. Shift Management

### View Shifts

| Action | Description | File |
|--------|-------------|------|
| View Pending Shifts | See shifts awaiting confirmation | `my-shifts/page.tsx` |
| View Upcoming Shifts | See confirmed future shifts | `my-shifts/page.tsx` |
| View Agency Schedule | See all agency shifts (read-only) | `agency/schedule/page.tsx` |

### Confirm & Decline Shifts

| Action | Description | API Route |
|--------|-------------|-----------|
| Confirm Shift | Accept assigned shift | `/api/shifts/confirm` |
| Decline Shift | Decline with optional reason | `/api/shifts/decline` |
| Confirm via Email | One-click confirm from email link | `/api/shifts/confirm` |
| Decline via Email | One-click decline from email link | `/api/shifts/decline` |

### Email Deep Links

| URL Pattern | Action |
|-------------|--------|
| `/dashboard/my-shifts?action=confirm&shiftId=xxx` | Auto-confirm shift |
| `/dashboard/my-shifts?action=decline&shiftId=xxx` | Open decline flow |

---

## 2. Shift Handoff (Clock In/Out)

### Clock In

| Action | Description | File |
|--------|-------------|------|
| Clock In via Schedule | Start shift within ±10 min of scheduled time | `shift-handoff/page.tsx` |
| Clock In via QR Code | Scan elder's QR code + GPS verification | `shift-handoff/page.tsx` |
| Location Override | Override GPS with documented reason | `shift-handoff/page.tsx` |

### Clock Out

| Action | Description | File |
|--------|-------------|------|
| End Shift | Clock out and end session | `shift-handoff/page.tsx` |
| Auto-Generate SOAP Notes | AI generates clinical summary | `shiftHandoffGeneration.ts` |
| View Handoff Notes | See previous shift summaries | `shift-handoff/page.tsx` |

### GPS Verification States

| Status | Description |
|--------|-------------|
| `idle` | Not started |
| `capturing` | Getting GPS location |
| `verified` | Location matches elder address |
| `override` | Location overridden with reason |
| `error` | GPS capture failed |

---

## 3. Timesheet

### View & Submit

| Action | Description | API Route |
|--------|-------------|-----------|
| View Completed Shifts | See shifts by week/month/all | `/api/timesheet` |
| Submit Timesheet | Submit weekly hours for approval | `/api/timesheet` |
| Track Status | View submitted/approved/rejected | `/api/timesheet` |
| Export CSV | Download timesheet data | `timesheet/page.tsx` |

### Timesheet Statuses

| Status | Description |
|--------|-------------|
| `pending` | Not yet submitted |
| `submitted` | Awaiting owner approval |
| `approved` | Approved by owner |
| `rejected` | Rejected with notes |

---

## 4. Availability Management

### Weekly Availability

| Action | Description | API Route |
|--------|-------------|-----------|
| Set Weekly Schedule | Configure recurring availability by day | `/api/caregiver-availability` |
| Add Time Slots | Set available hours for each day | `/api/caregiver-availability` |
| Mark Days Unavailable | Block entire days | `/api/caregiver-availability` |

### Date Overrides

| Action | Description | API Route |
|--------|-------------|-----------|
| Add Date Override | Mark specific date unavailable | `/api/caregiver-availability` |
| Set Override Reason | Document reason (vacation, sick, etc.) | `/api/caregiver-availability` |
| Remove Override | Delete a date override | `/api/caregiver-availability` |

### Preferences

| Action | Description | File |
|--------|-------------|------|
| Max Shifts Per Week | Set preferred shift limit | `availability/page.tsx` |
| Max Hours Per Week | Set preferred hour limit | `availability/page.tsx` |
| Preferred Elders | Select elders you prefer | `availability/page.tsx` |
| Unavailable Elders | Select elders you cannot serve | `availability/page.tsx` |

---

## 5. Medication Management

### CRUD Operations

| Action | Description | File |
|--------|-------------|------|
| View Medications | See all medications for assigned elders | `medications/page.tsx` |
| Add Medication | Create new medication with schedule | `medications/new/page.tsx` |
| Edit Medication | Update medication details | `medications/[id]/edit/page.tsx` |
| Delete Medication | Remove medication | `medications/page.tsx` |

### Dose Logging

| Action | Description | File |
|--------|-------------|------|
| Log Dose (Taken) | Record medication was taken | `activity/page.tsx` |
| Log Dose (Skipped) | Record medication was skipped with reason | `activity/page.tsx` |
| Voice Logging | Log doses via voice input | `medications/voice/page.tsx` |
| Offline Logging | Log when offline, auto-syncs later | `logMedicationDoseOfflineAware` |

### Schedule Management

| Action | Description | File |
|--------|-------------|------|
| Set Medication Times | Configure daily/weekly schedule | `medications/new/page.tsx` |
| Set Frequency | Daily, weekly, as needed, etc. | `medications/new/page.tsx` |
| Set Reminders | Configure notification times | `medications/new/page.tsx` |

---

## 6. Supplement Management

| Action | Description | File |
|--------|-------------|------|
| View Supplements | See all supplements for assigned elders | `supplements/page.tsx` |
| Add Supplement | Create new supplement | `supplements/new/page.tsx` |
| Edit Supplement | Update supplement details | `supplements/[id]/edit/page.tsx` |
| Delete Supplement | Remove supplement | `supplements/page.tsx` |
| Log Intake | Record supplement taken | `activity/page.tsx` |

---

## 7. Diet & Nutrition

| Action | Description | File |
|--------|-------------|------|
| View Meals | See meal history | `diet/page.tsx` |
| Add Meal | Log new meal entry | `diet/new/page.tsx` |
| Voice Meal Logging | Log meals via voice input | `diet/voice/page.tsx` |
| Nutrition Analysis | View nutrition breakdown | `nutrition-analysis/page.tsx` |

---

## 8. Activity Dashboard

| Action | Description | File |
|--------|-------------|------|
| View Today's Schedule | See medications/supplements due today | `activity/page.tsx` |
| Quick Log Actions | One-tap logging for due items | `activity/page.tsx` |
| View Activity Timeline | See recent logs and events | `activity/page.tsx` |
| Track Compliance | View adherence metrics | `activity/page.tsx` |

---

## 9. Reports & Analytics

### Analytics Dashboard

| Action | Description | File |
|--------|-------------|------|
| Overview Tab | General care metrics | `analytics/page.tsx` |
| Medication Tab | Adherence analysis | `analytics/page.tsx` |
| Nutrition Tab | Diet analytics | `analytics/page.tsx` |
| Trends Tab | Health trend detection | `analytics/page.tsx` |
| Insights Tab | AI-powered recommendations | `analytics/page.tsx` |

### Alerts (Read-Only)

| Action | Description | File |
|--------|-------------|------|
| View Alerts | See system-generated alerts | `alerts/page.tsx` |
| View Alert Details | Read full alert information | `alerts/page.tsx` |

---

## 10. AI Features

| Action | Description | File |
|--------|-------------|------|
| Ask AI | Chat with health AI assistant | `ask-ai/page.tsx` |
| Symptom Checker | AI symptom analysis | `symptom-checker/page.tsx` |
| Get Predictions | Medication adherence/refill predictions | `/api/ai-analytics` |

---

## 11. Notifications

### Receive Notifications

| Channel | Description |
|---------|-------------|
| Email | Shift assignments, confirmations, reminders |
| FCM Push | Real-time mobile/browser notifications |
| In-App | Notification center in dashboard |

### Manage Preferences

| Action | Description | File |
|--------|-------------|------|
| Configure Channels | Enable/disable email, push, in-app | `settings/page.tsx` |
| Set Quiet Hours | Pause notifications during specific times | `settings/page.tsx` |

---

## 12. Settings & Profile

| Action | Description | File |
|--------|-------------|------|
| Update Profile | Change name, phone number | `settings/page.tsx` |
| Update Email | Change email address | `/api/auth/update-email` |
| Notification Settings | Configure notification preferences | `settings/page.tsx` |
| View Subscription | See plan details (read-only) | `settings/page.tsx` |
| Add Report Recipients | Add family emails for daily notes | `settings/page.tsx` |

---

## 13. Elder Access

| Action | Description | File |
|--------|-------------|------|
| View Assigned Elders | See list of elders assigned to you | `elders/page.tsx` |
| Switch Active Elder | Change which elder you're working with | `ElderContext.tsx` |
| View Elder Profile | See elder details | `elders/page.tsx` |

---

## 14. Page Access Summary

### Accessible Pages

| Page | Path | Purpose |
|------|------|---------|
| My Shifts | `/dashboard/my-shifts` | Confirm/decline shifts |
| Shift Handoff | `/dashboard/shift-handoff` | Clock in/out |
| Timesheet | `/dashboard/timesheet` | Track hours |
| Availability | `/dashboard/availability` | Set schedule |
| Medications | `/dashboard/medications` | Manage medications |
| Supplements | `/dashboard/supplements` | Manage supplements |
| Diet | `/dashboard/diet` | Log meals |
| Activity | `/dashboard/activity` | Daily dashboard |
| Analytics | `/dashboard/analytics` | View reports |
| Alerts | `/dashboard/alerts` | View alerts (read-only) |
| Ask AI | `/dashboard/ask-ai` | AI chat |
| Settings | `/dashboard/settings` | Profile settings |
| Elders | `/dashboard/elders` | View assigned elders |
| Schedule | `/dashboard/agency/schedule` | View agency schedule |

### Blocked Pages

| Page | Path | Reason |
|------|------|--------|
| Documents | `/dashboard/documents` | Owner-only |
| Caregiver Burnout | `/dashboard/caregiver-burnout` | Owner-only |
| Agency Dashboard | `/dashboard/agency` (admin features) | Owner-only |

---

## 15. API Endpoints

### Shift APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shifts/confirm` | POST | Confirm assigned shift |
| `/api/shifts/decline` | POST | Decline assigned shift |
| `/api/shift-handoff` | GET/POST | Clock in/out, get shift data |

### Timesheet APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/timesheet` | GET | Get completed shifts |
| `/api/timesheet` | POST | Submit timesheet |

### Availability APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/caregiver-availability` | GET | Get availability settings |
| `/api/caregiver-availability` | POST | Update availability |

### Care Data APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/medications` | GET/POST/PUT/DELETE | Medication CRUD |
| `/api/supplements` | GET/POST/PUT/DELETE | Supplement CRUD |
| `/api/diet` | GET/POST | Diet logging |
| `/api/activity-logs` | GET | Load activity logs |

### AI APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | AI assistant |
| `/api/ai-analytics` | POST | AI predictions |

---

## 16. What Caregivers CANNOT Do

| Action | Reason |
|--------|--------|
| Upload/view documents | Owner-only feature |
| Monitor caregiver burnout | Owner-only feature |
| Assign caregivers to elders | Owner-only |
| Approve/suspend caregivers | Owner-only |
| Manage other caregivers | Owner-only |
| Copy week schedules | Owner-only |
| Bulk assign shifts | Owner-only |
| Mark shifts confirmed (for others) | Owner-only |
| Access billing/subscription | Owner-only |
| View other caregivers' shifts | Isolation enforced |
| Approve/reject timesheets | Owner/admin only |
| Add/remove elders | Owner-only |

---

## 17. Business Rules Applied to Caregivers

| Rule | Constraint |
|------|------------|
| Shift duration | Minimum 2 hours |
| Elders per day | Max 3 unique elders |
| Clock-in window | ±10 minutes of scheduled start |
| GPS verification | Required for QR clock-in (can override with reason) |
| Data access | Only for assigned elders |

---

## Related Documentation

| Document | Contents |
|----------|----------|
| `docs/agencyowner_capabilities.md` | Owner capabilities |
| `CLAUDE.md` | Main project instructions |
| `CLAUDE-ARCHITECTURE.md` | Technical systems |
| `docs/PERMISSION_SYSTEM.md` | Permission system details |
| `SCHEDULE_RULES_CHECKLIST.md` | Schedule business rules |
