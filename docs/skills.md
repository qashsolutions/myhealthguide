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

## Security & Privacy

- **FCM tokens** stored only in authenticated user documents
- **Notification permissions** only requested for active subscribers
- **Role-based filtering** caregivers only see assigned elders
- **Email addresses** treated as sensitive data
- **Report recipients** can receive emails without app accounts

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
