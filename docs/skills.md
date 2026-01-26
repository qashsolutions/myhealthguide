# MyHealthGuide Notification System - Skills & Capabilities

**Last Updated:** January 25, 2026

---

## Overview

MyHealthGuide uses a multi-channel notification system to keep users informed about care activities, health trends, and urgent situations. This document describes all active notification channels, their capabilities, and who receives what.

---

## Active Notification Channels

### 1. FCM Push Notifications

**Provider:** Firebase Cloud Messaging (FCM)
**Status:** ACTIVE

#### How It Works
```
Event Triggered → Queue to fcm_notification_queue → Cloud Function processes → FCM delivers to device
```

#### Key Files
| File | Purpose |
|------|---------|
| `src/lib/firebase/fcm.ts` | Client-side FCM setup, token management |
| `src/components/notifications/FCMProvider.tsx` | React provider, foreground listener |
| `public/firebase-messaging-sw.js` | Service worker for background notifications |
| `functions/src/index.ts` → `processFCMNotificationQueue` | Hourly queue processor |

#### Token Storage
- Location: `users/{userId}/fcmTokens` (array)
- Multiple tokens per user (multiple devices/browsers)
- Invalid tokens auto-removed on delivery failure

#### Who Receives
| Role | Notifications |
|------|--------------|
| **Agency Owner** | All activity for all elders in agency |
| **Caregiver** | Only activity for elders assigned TODAY (via `scheduledShifts`) |
| **Family Member** | All activity for their loved ones |

#### Notification Types via FCM
- Medication logged (taken/skipped/missed)
- Missed dose alerts
- Daily family notes summary
- Emergency pattern detection
- Medication refill predictions
- Trial expiration warnings
- Shift offers and assignments

---

### 2. Email Notifications

**Provider:** Firebase Trigger Email Extension
**Status:** ACTIVE

#### How It Works
```
Event Triggered → Write to 'mail' collection → Firebase Extension sends email
```

#### Key Files
| File | Purpose |
|------|---------|
| `functions/src/index.ts` → `processDailyFamilyNotes` | Generates daily email + PDF |
| `extensions/firestore-send-email.yaml` | Firebase extension configuration |

#### Email Types

##### Daily Family Notes (Automated)
- **Schedule:** 7 PM, 8 PM, 9 PM PST (fallbacks)
- **Content:**
  - Medication compliance (taken/missed counts)
  - Supplements taken
  - Meals logged with AI nutrition analysis
  - Flagged concerns (red/amber severity)
  - Caregiver notes with timestamps
- **Attachment:** PDF report (`{ElderName}_{MMDDYYYY}.pdf`)
- **Recipients:**
  - All group members with email on file
  - Report recipients (email-only family, no app account)

##### Trial Expiration Emails
- **Schedule:** 9 AM daily
- **Triggers:** 3 days, 1 day, 0 days remaining
- **Content:** Warning about trial ending, CTA to subscribe

---

### 3. In-App Notifications

**Provider:** Firestore
**Status:** ACTIVE

#### How It Works
```
Event Triggered → Write to 'user_notifications' collection → UI polls/subscribes → Displays in bell icon
```

#### Key Files
| File | Purpose |
|------|---------|
| `src/lib/notifications/userNotifications.ts` | CRUD operations |
| `src/hooks/useNotifications.ts` | Real-time subscription hook |
| `src/components/notifications/NotificationItem.tsx` | UI component |

#### Collection Schema
```typescript
user_notifications/{id}: {
  userId: string,
  groupId: string,
  elderId?: string,
  type: string,           // 'shift_offer', 'medication_logged', etc.
  title: string,
  message: string,
  priority: 'low' | 'medium' | 'high',
  actionUrl?: string,
  sourceCollection?: string,
  sourceId?: string,
  data?: object,
  read: boolean,
  dismissed: boolean,
  actionRequired: boolean,
  expiresAt?: Timestamp,
  createdAt: Timestamp
}
```

#### Notification Types
- Shift offers (Accept/Decline buttons)
- Shift assignments confirmed
- Shift unfilled alerts
- Medication events
- Join requests
- System announcements

---

### 4. Dashboard Alerts

**Provider:** Firestore
**Status:** ACTIVE

#### How It Works
```
Event Triggered → Write to 'alerts' collection → Dashboard displays → User acknowledges
```

#### Key Files
| File | Purpose |
|------|---------|
| `src/lib/notifications/deliveryService.ts` | Alert delivery |
| `src/components/dashboard/AlertsPanel.tsx` | UI component |

#### Collection Schema
```typescript
alerts/{id}: {
  userId: string,
  groupId: string,
  elderId?: string,
  type: string,           // 'emergency_pattern', 'medication_refill', etc.
  severity: 'info' | 'warning' | 'critical',
  title: string,
  message: string,
  data?: object,
  actionUrl?: string,
  actionButtons?: Array<{label, action, url?}>,
  status: 'active' | 'acknowledged' | 'dismissed',
  read: boolean,
  dismissed: boolean,
  acknowledged: boolean,
  createdAt: Timestamp,
  expiresAt: Timestamp    // 7 days default
}
```

#### Alert Types
- Emergency pattern detection (risk score)
- Medication refill predictions
- Health change alerts
- Compliance warnings

---

## Disabled Channels

### SMS (Twilio)
**Status:** DISABLED
**Reason:** FCM push notifications provide equivalent functionality
**Documentation:** See `docs/removetwilio.md`

---

## Scheduled Background Jobs

| Function | Schedule | Purpose |
|----------|----------|---------|
| `sendDailyFamilyNotes` | 7 PM PST | Daily email + PDF reports (primary) |
| `sendDailyFamilyNotes8PM` | 8 PM PST | Fallback trigger |
| `sendDailyFamilyNotes9PM` | 9 PM PST | Fallback trigger |
| `processFCMNotificationQueue` | Hourly | Send queued push notifications |
| `detectMissedDoses` | Hourly | Create missed dose alerts |
| `checkMedicationReminders` | Hourly | Check due medication reminders |
| `runEmergencyPatternDetection` | 2 AM daily | Detect health risk patterns |
| `runMedicationRefillPredictions` | 3 AM daily | Predict supply depletion |
| `sendTrialExpirationWarnings` | 9 AM daily | Warn about expiring trials |
| `generateWeeklySummaries` | Sunday 8 AM | Weekly compliance summaries |

---

## User Preferences

**Collection:** `userAlertPreferences`

Users can configure:
- Which alert types to receive
- Which channels to use (dashboard, push, email)
- Quiet hours (suppress non-critical alerts)
- Medication refill threshold (days)
- Emergency alert sensitivity
- Digest mode (batch notifications)

**Key File:** `src/lib/ai/userAlertPreferences.ts`

---

## Notification Flow by Event

### Medication Logged
```
Caregiver logs dose
    ↓
Write to medication_logs
    ↓
┌─────────────────────────────────────┐
│ For each group member:              │
│  • In-app notification              │
│  • FCM push (if enabled)            │
│  • Dashboard alert (if missed)      │
└─────────────────────────────────────┘
```

### Shift Offer (Cascade)
```
Shift created with Auto-Assign
    ↓
First caregiver offered
    ↓
┌─────────────────────────────────────┐
│ Caregiver receives:                 │
│  • In-app notification (actionable) │
│  • FCM push                         │
└─────────────────────────────────────┘
    ↓
Decline → Next caregiver offered
Accept → Shift confirmed notification
```

### Daily Family Notes
```
7 PM PST (Cloud Function)
    ↓
Query day's activity
    ↓
Generate summary + PDF
    ↓
┌─────────────────────────────────────┐
│ For each recipient:                 │
│  • Email with PDF attachment        │
│  • In-app notification              │
│  • FCM push                         │
└─────────────────────────────────────┘
```

---

## Firestore Collections Summary

| Collection | Purpose |
|------------|---------|
| `user_notifications` | In-app notifications (bell icon) |
| `alerts` | Dashboard alerts (health, compliance) |
| `fcm_notification_queue` | Queued push notifications |
| `mail` | Queued emails (Trigger Email extension) |
| `daily_family_notes` | Stored daily report summaries |
| `userAlertPreferences` | User notification settings |

---

## Multi-Agency Roles & Permissions

### User Roles

| Role | Description | Has App Account? |
|------|-------------|------------------|
| **Owner** | Agency super admin - manages caregivers, elders, scheduling, documents | ✅ Yes |
| **Caregiver** | Care provider - shift handoffs, timesheets, logs care activities | ✅ Yes |
| **Family Member** | Receives daily email reports only | ❌ No (email-only) |

### Family Members (Report Recipients)

Family members **do NOT create accounts**. The legacy family member account system has been **DISABLED**.

**Current Flow:**
```
Owner/Caregiver → Settings → Daily Report Recipients
      ↓
Add family email under specific Elder
      ↓
Family receives automated daily email at 7 PM PST
      ↓
No login, no app access - email notifications only
```

**Key Points:**
- No accounts needed for family members
- Added via Settings → "Daily Report Recipients"
- Stored as `reportRecipients` array on elder document
- Receive Daily Family Notes email with PDF attachment
- Cannot log in or access the app

**Legacy System (DISABLED):**
- `SuperAdminFamilyOverview.tsx` - commented out
- Family member invite links - disabled
- `family_member` role checks - disabled
- Code preserved for potential future reactivation

### Feature Access by Role

| Feature | Owner | Caregiver | Family Member |
|---------|-------|-----------|---------------|
| **Documents** | ✅ Upload/View/Delete | ❌ No access | ❌ No access |
| **Shift Handoff** | ❌ Not applicable | ✅ Full access | ❌ No access |
| **Timesheet (own)** | ❌ Not applicable | ✅ Log hours | ❌ No access |
| **Timesheet (review all)** | ✅ View all | ❌ No access | ❌ No access |
| **Schedule** | ✅ Create/Edit/Assign | ✅ View own shifts | ❌ No access |
| **Caregiver Burnout** | ✅ Monitor team | ❌ No access | ❌ No access |
| **Alerts** | ✅ Read-only | ✅ Read-only | ❌ No access |
| **Daily Email Reports** | ✅ Receives | ❌ No | ✅ Receives |

### Care Management Page

Role-based card visibility:

| Card | Owner | Caregiver |
|------|-------|-----------|
| Documents | ✅ Shown | ❌ Hidden |
| Caregiver Burnout | ✅ Shown | ❌ Hidden |
| Alerts | ✅ Shown | ✅ Shown |
| Shift Handoff | ❌ Hidden | ✅ Shown |
| Timesheet | ❌ Hidden | ✅ Shown |
| Family Updates | ❌ Removed | ❌ Removed |

**Note:** Family Updates card removed entirely - daily emails are automated, not manual.

### Key Files for Role Management

| File | Purpose |
|------|---------|
| `src/app/dashboard/care-management/page.tsx` | Role-based card visibility |
| `src/app/dashboard/documents/page.tsx` | Owner-only document access |
| `src/app/dashboard/settings/page.tsx` | Report Recipients management |
| `src/lib/firebase/groups.ts` | `addReportRecipient()`, `removeReportRecipient()` |
| `src/components/agency/AgencyDashboard.tsx` | Legacy family overview (disabled) |

---

## Caregiver Burnout Analysis

**Location:** `/dashboard/caregiver-burnout`
**Access:** Agency Owner only

The system offers two analysis modes, selectable via toggle:

### Traditional Analysis (Rule-Based)

Uses fixed thresholds and a point-based scoring system to assess burnout risk.

**How It Works:**
- Analyzes last 14 days of completed shift sessions
- Calculates workload metrics from shift data
- Assigns points based on threshold breaches
- Sums points to determine risk level

**Factors Analyzed:**

| Factor | Threshold | Severity | Points |
|--------|-----------|----------|--------|
| **Overtime Hours** | >10 hrs/week | Moderate | 20 |
| | >20 hrs/week | High | 30 |
| **Consecutive Days** | 7-9 days | Moderate | 15 |
| | 10+ days | High | 25 |
| **Elder Count** | 4-5 elders | Moderate | 10 |
| | 6+ elders | High | 20 |
| **Avg Shift Length** | >10 hours | Moderate | 10 |
| | >12 hours | High | 15 |

**Risk Levels (based on total score):**

| Score | Risk Level |
|-------|------------|
| 0-29 | Low |
| 30-49 | Moderate |
| 50-69 | High |
| 70+ | Critical |

**Adaptive Thresholds:**
The traditional analysis also applies adaptive adjustments:
- High volume (>50 hrs/week): Lowers thresholds by 5-10 points
- High complexity (>4 elders): Lowers thresholds by 3-5 points
- 10+ consecutive days: Further reduces thresholds

**Recommendations Generated:**
- Reduce overtime, redistribute shifts
- Schedule mandatory days off
- Reduce assigned elders
- Consider shorter shifts
- Schedule check-in meeting
- Monitor for stress signs

---

### AI Analysis (Gemini)

Uses **Google Gemini AI** for deep pattern analysis and personalized predictions.

**How It Works:**
- Sends workload data to Gemini AI
- AI calculates personalized thresholds per caregiver
- Predicts burnout trajectory (improving/stable/worsening)
- Estimates days until high risk
- Generates urgency-prioritized interventions

**Data Sent to AI:**
- Total hours worked (last 14 days)
- Overtime hours
- Consecutive days worked
- Number of elders cared for
- Average shift length
- Individual shift breakdown (up to 20 shifts)
- Previous period data (for trend comparison)

**AI Analysis Outputs:**

| Output | Description |
|--------|-------------|
| **Personalized Risk Score** | 0-100 based on workload sustainability |
| **Trajectory** | Improving, stable, or worsening trend |
| **Days to High Risk** | Predicted when burnout may occur |
| **Personalized Thresholds** | Custom low/moderate/high/critical levels |
| **Workload Analysis** | Optimal vs actual hours comparison |
| **Interventions** | Urgency-prioritized (immediate/soon/scheduled) |

**AI Guidelines Used:**
- Industry standard: 35-40 hours/week sustainable
- Overtime >10h/week = significant burnout risk
- 6+ consecutive days = major red flag
- 3+ elders = increased cognitive load
- 10+ hour shifts = compounded fatigue

**HIPAA Compliance:**
- All AI calls are logged in PHI audit trail
- Data shared: shift_data, work_hours, elder_assignments
- Service: Google Gemini AI
- Purpose: Burnout prediction and intervention recommendations

---

### Comparison: Traditional vs AI Analysis

| Aspect | Traditional | AI (Gemini) |
|--------|-------------|-------------|
| **Thresholds** | Fixed (30/50/70) with adaptive adjustments | Fully personalized per caregiver |
| **Scoring** | Static point system | 0-100 sustainability score |
| **Trajectory** | Not tracked | Predicts improving/stable/worsening |
| **Days to Risk** | Not calculated | Predicts when burnout may occur |
| **Recommendations** | Generic list | Urgency-prioritized interventions |
| **Context** | Current period with adaptive thresholds | Compares to previous period |
| **Speed** | Instant | 2-5 seconds (API call) |
| **Cost** | Free | Gemini API usage |

---

### Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/caregiver-burnout/page.tsx` | UI with toggle switch |
| `src/app/api/caregiver-burnout/route.ts` | API endpoint, both analysis modes |
| `src/lib/medical/caregiverBurnoutDetection.ts` | Client-side traditional analysis |
| `src/lib/ai/agenticAnalytics.ts` | `analyzeBurnoutWithAI()` function |

---

## Caregiver Burnout Test Data

**Purpose:** Test both Traditional and AI burnout analysis modes with realistic data

### Test Data Requirements

The burnout analysis reads from the `shiftSessions` collection with the following query:
- `agencyId` = Agency ID
- `caregiverId` = Caregiver ID
- `status` = 'completed'
- Date filtered in memory for last 14 days

### shiftSessions Document Schema

```typescript
shiftSessions/{id}: {
  agencyId: string,        // Required: K9AYIGQR2RCInk7nVMSd
  caregiverId: string,     // Required: User ID
  elderId: string,         // Required: Elder ID
  elderName: string,       // For display
  groupId: string,         // Elder's group ID
  status: 'completed',     // Required for burnout analysis
  startTime: Timestamp,    // When shift started
  endTime: Timestamp,      // When shift ended
  actualDuration: number,  // Duration in MINUTES (e.g., 480 = 8 hours)
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Test Caregiver Profiles

| Caregiver | Email | Risk Level | Profile |
|-----------|-------|------------|---------|
| **Caregiver 1** | ramanac+c1@gmail.com | Critical | 14 consecutive days, 12-hour shifts, 5 elders |
| **Caregiver 2** | ramanac+c2@gmail.com | High | 10 consecutive days, 10-hour shifts, 4 elders |
| **Caregiver 3** | ramanac+c3@gmail.com | Moderate | 7 days worked, 8-hour shifts, 3 elders |
| **Caregiver 4** | ramanac+c4@gmail.com | Low | 5 days worked, 8-hour shifts, 2 elders, 2 days off |

### Detailed Test Scenarios

#### Caregiver 1: Critical Risk
- **Days worked:** 14 consecutive days (no breaks)
- **Shift length:** 12 hours average (720 minutes)
- **Elders:** 5 different loved ones
- **Total hours:** 168 hours (12h × 14 days)
- **Overtime:** 56 hours (168 - 112 regular = 56 OT)
- **Expected Score (Traditional):** 70+ points
  - Overtime >20h/week: 30 points
  - 10+ consecutive days: 25 points
  - 5+ elders: 20 points
  - Avg shift >12h: 15 points = **90 points**

#### Caregiver 2: High Risk
- **Days worked:** 10 consecutive days
- **Shift length:** 10 hours average (600 minutes)
- **Elders:** 4 different loved ones
- **Total hours:** 100 hours (10h × 10 days)
- **Overtime:** 20 hours
- **Expected Score (Traditional):** 50-69 points
  - Overtime 10-20h/week: 20 points
  - 10+ consecutive days: 25 points
  - 4-5 elders: 10 points = **55 points**

#### Caregiver 3: Moderate Risk
- **Days worked:** 7 days (with 2 days off in between)
- **Shift length:** 9 hours average (540 minutes)
- **Elders:** 3 different loved ones
- **Total hours:** 63 hours (9h × 7 days)
- **Overtime:** 7 hours
- **Expected Score (Traditional):** 30-49 points
  - 7-9 consecutive days: 15 points
  - Overtime >10h: 20 points (borderline) = **35 points**

#### Caregiver 4: Low Risk
- **Days worked:** 5 days (spread across 2 weeks with breaks)
- **Shift length:** 8 hours average (480 minutes)
- **Elders:** 2 different loved ones
- **Total hours:** 40 hours
- **Overtime:** 0 hours
- **Expected Score (Traditional):** <30 points = **0 points** (healthy)

### Script: Create Burnout Test Data

**File:** `scripts/createBurnoutTestData.ts`

**Run command:**
```bash
npx tsx scripts/createBurnoutTestData.ts
```

**What it does:**
1. Clears existing shiftSessions for test caregivers (C1-C4)
2. Creates shiftSessions spanning last 14 days
3. Each caregiver gets appropriate shift patterns per profile

### Verification Steps

1. Run the script to create test data
2. Login as agency owner (ramanac+owner@gmail.com)
3. Navigate to Care Management → Caregiver Burnout
4. Toggle between Traditional and AI Analysis
5. Verify each caregiver shows expected risk level

### Expected Results

| Caregiver | Traditional Risk | AI Risk | Key Factors Shown |
|-----------|------------------|---------|-------------------|
| C1 | Critical (90 pts) | Critical | Overtime, consecutive days, elder count, shift length |
| C2 | High (55 pts) | High | Overtime, consecutive days, elder count |
| C3 | Moderate (35 pts) | Moderate | Consecutive days, borderline overtime |
| C4 | Low (0 pts) | Low | No risk factors |

---

## Security & Privacy

- **FCM tokens** stored only in authenticated user documents
- **Notification permissions** only requested for active subscribers
- **Role-based filtering** caregivers only see assigned elders
- **Email addresses** treated as sensitive data
- **Report recipients** can receive emails without app accounts
- **Documents** accessible only by agency owner (not caregivers or family)

---

## Testing Notifications

### FCM Push
1. Enable notifications in browser
2. Trigger an event (log medication)
3. Check browser notification appears

### Email
1. Check `mail` collection in Firestore Console
2. Verify email received (check spam folder)
3. Verify PDF attachment opens correctly

### In-App
1. Click bell icon in header
2. Verify notifications appear
3. Test mark as read / dismiss

---

## Troubleshooting

### FCM Not Working
1. Check browser notification permissions
2. Verify `fcmTokens` array in user document
3. Check `fcm_notification_queue` for stuck messages
4. Look for `processFCMNotificationQueue` errors in Cloud Functions logs

### Email Not Sending
1. Check `mail` collection for documents
2. Verify Firebase Trigger Email extension is installed
3. Check extension logs in Firebase Console
4. Verify user has email on file

### In-App Not Showing
1. Check `user_notifications` collection
2. Verify `userId` matches current user
3. Check `dismissed` is false
4. Verify subscription in `useNotifications` hook
