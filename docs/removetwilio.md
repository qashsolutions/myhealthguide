# Twilio SMS Removal Documentation

**Date:** January 25, 2026
**Status:** DISABLED (code preserved for future use)

---

## Overview

This document explains the Twilio SMS integration that was built but is now disabled. The code is preserved with inline comments for potential future reactivation.

---

## Why Twilio Was Disabled

1. **Not needed for current workflow** - Caregiver invites use offline code sharing
2. **FCM push notifications are sufficient** - Agency owners and caregivers receive real-time alerts via Firebase Cloud Messaging
3. **Email covers daily reports** - Family members receive end-of-day PDF reports via email
4. **Cost reduction** - SMS incurs per-message costs vs free FCM/email
5. **Simplification** - Fewer third-party dependencies to maintain

---

## Current Notification System (Active)

| Channel | Provider | Who Receives | Purpose |
|---------|----------|-------------|---------|
| **FCM Push** | Firebase Cloud Messaging | Agency owners, Caregivers | Real-time alerts |
| **Email + PDF** | Firebase Trigger Email Extension | All members | Daily family notes |
| **In-App** | Firestore `user_notifications` | Everyone | Persistent notifications |

---

## Disabled Twilio Components

### 1. Caregiver Invite SMS API
**File:** `src/app/api/sms/send-invite/route.ts`

**Original Purpose:** Send SMS invite links to caregivers when agency owner invites by phone number.

**Why Disabled:** Replaced by offline invite code sharing:
- Agency owner generates invite code via `InviteCodeDialog.tsx`
- Shares code offline (copy, share button, verbally)
- Caregiver enters code at `/dashboard/join` or `/invite/[code]`

---

### 2. SMS Channel in Delivery Service
**File:** `src/lib/notifications/deliveryService.ts`

**Original Purpose:** Queue SMS notifications to `sms_queue` collection for Twilio extension to process.

**Why Disabled:** FCM push notifications provide equivalent functionality for real-time alerts.

---

### 3. SMS Toggle in Alert Preferences
**File:** `src/components/settings/AlertPreferencesSettings.tsx`

**Original Purpose:** Allow users to enable/disable SMS notifications.

**Why Disabled:** SMS channel no longer active; toggle would be misleading.

---

### 4. Firebase Twilio Extension
**File:** `extensions/twilio-send-message.yaml`

**Original Purpose:** Firebase extension that watches `sms_queue` collection and sends SMS via Twilio API.

**Why Disabled:** Extension configuration removed. Credentials moved to `.env.local` for security.

---

### 5. Test SMS Page
**File:** `src/app/dashboard/notifications/test/page.tsx`

**Status:** DELETED (not disabled)

**Original Purpose:** Developer testing page for Twilio SMS integration.

**Why Deleted:** Confusing for users who might accidentally navigate to it; served no production purpose.

---

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| `src/app/api/sms/send-invite/route.ts` | Disabled | Entire route disabled with comments |
| `src/lib/notifications/deliveryService.ts` | Disabled | SMS channel code commented out |
| `src/components/settings/AlertPreferencesSettings.tsx` | Disabled | SMS toggle hidden |
| `extensions/twilio-send-message.yaml` | Modified | Credentials removed, uses env vars |
| `src/app/dashboard/notifications/test/page.tsx` | Deleted | Test page removed |
| `.gitignore` | Updated | Added Twilio credential patterns |
| `.env.local.example` | Updated | Added Twilio env var placeholders |

---

## Twilio Credentials

**IMPORTANT:** Twilio credentials have been moved out of the repository.

### Previous Location (INSECURE)
```yaml
# extensions/twilio-send-message.yaml - DO NOT COMMIT CREDENTIALS
params:
  - param: TWILIO_ACCOUNT_SID
    value: AC5171da10575a33d677a99c51fe1ef9b2  # EXPOSED - ROTATE THIS
  - param: TWILIO_AUTH_TOKEN
    value: a239376f4edf286755314a25e85df9ed     # EXPOSED - ROTATE THIS
```

### New Location (SECURE)
```bash
# .env.local (not committed)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_phone_number_here
```

### Action Required
1. **Rotate Twilio credentials** in Twilio Console (old ones were exposed in git history)
2. Add new credentials to `.env.local` if reactivating SMS
3. Configure Firebase Extension to use environment variables

---

## How to Reactivate Twilio SMS

If SMS functionality is needed in the future:

### Step 1: Configure Credentials
```bash
# Add to .env.local
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### Step 2: Uncomment Code
1. `src/app/api/sms/send-invite/route.ts` - Remove `DISABLED` wrapper
2. `src/lib/notifications/deliveryService.ts` - Uncomment SMS channel code
3. `src/components/settings/AlertPreferencesSettings.tsx` - Show SMS toggle

### Step 3: Reconfigure Firebase Extension
```bash
firebase ext:configure twilio-send-message
```

### Step 4: Test
- Use a test phone number (555-xxx-xxxx for dev)
- Verify SMS delivery in Twilio Console logs

---

## Dependencies

The `twilio` package remains in `package.json` for future use:

```json
// package.json
"twilio": "^5.2.2"

// functions/package.json
"twilio": "^5.10.6"
```

To fully remove Twilio (if never needed):
```bash
npm uninstall twilio
cd functions && npm uninstall twilio
```

---

## Related Files (Reference Only - Not Modified)

| File | Purpose |
|------|---------|
| `src/lib/sms/twilioService.ts` | Already disabled (empty export) |
| `src/lib/notifications/otp.ts` | Already disabled (console.log only) |
| `functions/src/index.ts` | SMS queue processor already commented out |

---

## Summary

- **Twilio SMS is DISABLED but code preserved**
- **Credentials moved to environment variables**
- **Test page deleted**
- **FCM + Email handles all notification needs**
- **Can be reactivated if SMS becomes necessary**
