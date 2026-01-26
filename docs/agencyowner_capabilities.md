# Agency Owner (Super Admin) Capabilities

**Last Updated:** January 26, 2026

This document lists all actions and capabilities available to agency owners in MyHealthGuide.

---

## Permission Check

Agency owner status is determined by:
```typescript
isSuperAdmin = agency.superAdminId === userId
```

---

## 1. Caregiver Management

### Invite & Onboarding

| Action | Description | File |
|--------|-------------|------|
| Send SMS Invites | Send invite to caregiver phone number | `CaregiverInviteManager.tsx` |
| Copy Invite Code | Share invite code offline | `CaregiverInviteManager.tsx` |
| Track Invite Status | View pending, accepted, expired, cancelled | `CaregiverInviteManager.tsx` |
| Cancel Pending Invite | Revoke unaccepted invites | `CaregiverInviteManager.tsx` |

### Approval & Status Management

| Action | Description | API Route |
|--------|-------------|-----------|
| Approve Caregiver | Accept pending applications | `/api/caregiver/approve` |
| Suspend Caregiver | Temporary disable with optional expiration | `/api/caregiver/manage` |
| Revoke Caregiver | Permanent removal of access | `/api/caregiver/manage` |
| Reactivate Caregiver | Re-enable suspended/revoked | `/api/caregiver/manage` |
| Set Suspension Reason | Document why caregiver was suspended | `/api/caregiver/manage` |

### Profile Management

| Action | Description | API Route |
|--------|-------------|-----------|
| Edit Caregiver Profile | Update caregiver details | `/api/caregiver/update-profile` |
| Sync Permissions | Batch sync all caregiver access rights | `/api/agency/sync` |
| View Caregiver Stats | See active status and statistics | `AgencyDashboard.tsx` |

### AI-Powered Recommendations

| Action | Description | File |
|--------|-------------|------|
| Get Caregiver Suggestions | AI recommends best-fit caregivers | `CaregiverMatchRecommendations.tsx` |
| Workload Balance Analysis | Identify under/over-utilized caregivers | `/api/caregiver-matching` |

---

## 2. Schedule & Shift Management

### Create Shifts

| Action | Description | File |
|--------|-------------|------|
| Create Single Shift | Add shift with date, time, caregiver, elder | `CreateShiftDialog.tsx` |
| Bulk Create Shifts | Multiple shifts with date range | `BulkCreateShiftDialog.tsx` |
| Cascade Assignment | Auto-assign to primary, fallback to backup | `/api/shifts/create-cascade` |

### Manage Shifts

| Action | Description | File |
|--------|-------------|------|
| Edit Shift | Update time, caregiver, notes | `ShiftDetailsPopover.tsx` |
| Delete Shift | Remove shift with confirmation | `ShiftDetailsPopover.tsx` |
| Clone Shift | Copy shift to other dates | `ShiftDetailsPopover.tsx` |
| Copy Week Schedule | Duplicate entire week's schedule | `CopyWeekSheet.tsx` |

### Shift Confirmation

| Action | Description | File |
|--------|-------------|------|
| Mark as Confirmed | Owner confirms on behalf of caregiver | `TodaysShiftsList.tsx` |
| Send Assignment Notifications | Email + In-App + FCM to caregivers | `/api/shifts/notify-assignment` |
| Track Confirmation Status | View pending, confirmed, declined | `TodaysShiftsList.tsx` |
| Update No-Show Status | Mark past shifts as no-show | `/api/shifts/update-no-shows` |

### View Schedule

| Action | Description | File |
|--------|-------------|------|
| Week Summary View | Overview with fill rates | `WeekSummaryTab.tsx` |
| By Caregiver View | Individual caregiver schedules | `ByCaregiverTab.tsx` |
| Gaps Only View | Unassigned/partially assigned shifts | `GapsOnlyTab.tsx` |
| Day Detail View | Full day view with shift details | `DayShiftList.tsx` |

### Business Rules Enforced

| Rule | Constraint | Type |
|------|------------|------|
| Minimum Shift Duration | 2 hours (120 mins) | Hard block |
| Max Elders per Caregiver per Day | 3 | Hard block |
| Shift Times | Flexible - elder decides | No restriction |

---

## 3. Loved One Assignment

### Assign Caregivers

| Action | Description | File |
|--------|-------------|------|
| Assign Caregiver to Elder | Select caregiver → select loved ones | `CaregiverAssignmentManager.tsx` |
| Set Caregiver Role | Caregiver or Caregiver Admin | `CaregiverAssignmentManager.tsx` |
| Set Primary Caregiver | Designate main caregiver | `CaregiverAssignmentManager.tsx` |
| Transfer Primary | Change primary with conflict resolution | `PrimaryCaregiverTransferDialog.tsx` |
| Remove Assignment | Deactivate caregiver-elder link | `CaregiverAssignmentManager.tsx` |

### Role Definitions

| Role | Permissions |
|------|-------------|
| Caregiver | View/log doses only |
| Caregiver Admin | Edit medications, manage schedules, invite family |

### Validate Constraints

| Action | Description | API Route |
|--------|-------------|-----------|
| Check Conflicts | Validate assignment limits | `/api/agency/check-conflicts` |
| Enforce Plan Limits | Max 3 elders per caregiver (Plan C) | `/api/agency/check-conflicts` |

---

## 4. Team & Group Management

### Groups

| Action | Description | File |
|--------|-------------|------|
| View All Groups | See groups under agency | `AgencyDashboard.tsx` |
| Rename Groups | Edit group names | `AgencyDashboard.tsx` |
| View Group Stats | Member count, loved one count | `AgencyDashboard.tsx` |

### Team Monitoring

| Action | Description | File |
|--------|-------------|------|
| View Pending Caregivers | Review approval requests | `PendingCaregiversSection.tsx` |
| View Active Caregivers | See all active caregivers | `ActiveCaregiversSection.tsx` |
| Monitor Caregiver Burnout | AI-powered workload alerts | `BurnoutAlertPanel.tsx` |
| Sync Permissions | One-click sync all caregiver access | `AgencyDashboard.tsx` |

---

## 5. Analytics (Plan C Only)

| Action | Description | File |
|--------|-------------|------|
| View Billable Hours | Track by time period | `AgencyAnalyticsDashboard.tsx` |
| Staff Utilization | Workload metrics per caregiver | `AgencyAnalyticsDashboard.tsx` |
| Burnout Risk Alerts | AI-detected burnout cases | `AgencyAnalyticsDashboard.tsx` |
| Schedule Coverage | Fill rates and gap analysis | `AgencyAnalyticsDashboard.tsx` |
| Performance Leaderboard | Top-performing caregivers | `AgencyAnalyticsDashboard.tsx` |
| Monthly Summary | Hours, daily avg, projected revenue | `AgencyAnalyticsDashboard.tsx` |

---

## 6. Billing (Plan C Only)

| Action | Description | File |
|--------|-------------|------|
| View Plan Details | Current subscription info | `AgencyBillingDashboard.tsx` |
| View Billing History | Past invoices | `AgencyBillingDashboard.tsx` |
| Manage Payment Methods | Update card on file | `AgencyBillingDashboard.tsx` |
| Access Stripe Portal | Full billing management | `/api/billing/portal` |

---

## 7. Timesheet Management

| Action | Description | File |
|--------|-------------|------|
| View Timesheets | See all caregiver timesheets | `TimesheetApprovalDashboard.tsx` |
| Approve Timesheets | Review and approve hours | `TimesheetApprovalDashboard.tsx` |
| Compare Hours | Match logged vs scheduled | `TimesheetApprovalDashboard.tsx` |
| Track Submissions | Monitor timesheet status | `TimesheetApprovalDashboard.tsx` |

---

## 8. Shift Tracking

| Action | Description | File |
|--------|-------------|------|
| Compare Actual vs Planned | Track schedule adherence | `ShiftTrackingDashboard.tsx` |
| Monitor Completion Rates | See actual completion % | `ShiftTrackingDashboard.tsx` |
| Identify Issues | Spot scheduling problems | `ShiftTrackingDashboard.tsx` |

---

## 9. Family Notifications

| Action | Description | Location |
|--------|-------------|----------|
| Add Email Recipients | Add family emails for daily notes | Settings → Daily Report Recipients |
| Remove Recipients | Remove from notification list | Settings → Daily Report Recipients |
| Automated Daily Notes | Sent at 7 PM PST with activity summary | Cloud Function |

---

## 10. Documents

| Action | Description | File |
|--------|-------------|------|
| Upload Documents | Add files to elder profiles | `/dashboard/documents` |
| View/Download | Access uploaded documents | `/dashboard/documents` |
| Delete Documents | Remove files | `/dashboard/documents` |
| AI Analysis | Analyze documents with AI | `/dashboard/documents` |

---

## 11. Dashboard Features

### Quick Actions

| Action | Description | Disabled When |
|--------|-------------|---------------|
| Assign Elder | Assign caregiver to elder | At capacity (30/30 elders) |
| Send Shifts/Slots | Create and send shifts | - |
| Onboard Caregiver | Invite new caregiver | At capacity (10/10 caregivers) |
| Create Schedule | Build weekly schedule | - |

### Status Indicators

| Indicator | Description |
|-----------|-------------|
| Super Admin Badge | Shows owner status |
| Sync Status | Last sync timestamp |
| Approval Counter | Pending caregiver approvals |
| Assignment Metrics | Active/inactive counts |

---

## 12. Plan Limits (Hard Blocks)

| Limit | Value | Plan |
|-------|-------|------|
| Max Caregivers | 10 | Plan C |
| Max Elders | 30 | Plan C |
| Elders per Caregiver | 3 per day | Plan C |
| Min Shift Duration | 2 hours | All Plans |

---

## 13. API Endpoints (Owner-Only)

| Endpoint | Action |
|----------|--------|
| `/api/caregiver/approve` | Approve pending caregivers |
| `/api/caregiver/manage` | Suspend/revoke/reactivate caregivers |
| `/api/caregiver/update-profile` | Edit caregiver details |
| `/api/caregiver/assign-elder` | Assign caregiver to elder |
| `/api/sms/send-invite` | Send SMS caregiver invites |
| `/api/agency/check-conflicts` | Validate assignment conflicts |
| `/api/agency/caregiver-names` | Fetch caregiver names |
| `/api/agency/sync` | Sync caregiver permissions |
| `/api/shifts/create-cascade` | Create cascading shift assignments |
| `/api/shifts/notify-assignment` | Send assignment notifications |
| `/api/shifts/confirm` | Mark shift confirmed |
| `/api/shifts/update-no-shows` | Update no-show statuses |
| `/api/caregiver-burnout` | Get burnout analysis data |
| `/api/caregiver-matching` | Get caregiver recommendations |
| `/api/timesheet` | Manage timesheets |

---

## 14. What Caregivers CANNOT Do

| Action | Reason |
|--------|--------|
| Manage other caregivers | Owner-only |
| Access analytics | Plan C owner-only |
| Modify billing | Owner-only |
| Copy schedules | Owner-only |
| Bulk assign shifts | Owner-only |
| View other caregivers' shifts | Isolation enforced |
| Assign caregivers to elders | Owner-only |
| Approve/suspend caregivers | Owner-only |
| Access documents page | Owner-only |
| View caregiver burnout | Owner-only |

---

## Related Documentation

| Document | Contents |
|----------|----------|
| `CLAUDE.md` | Main project instructions |
| `CLAUDE-ARCHITECTURE.md` | Technical systems |
| `docs/PERMISSION_SYSTEM.md` | Permission system details |
| `docs/skills.md` | Notification capabilities |
| `SCHEDULE_RULES_CHECKLIST.md` | Schedule business rules |
