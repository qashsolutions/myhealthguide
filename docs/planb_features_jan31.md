# Family Plan B — Feature Status (Jan 31, 2026)

## Plan Details

| Property | Value |
|----------|-------|
| Plan ID | `single_agency` |
| Display Name | Family Plan B |
| Price | $10.99/month |
| Trial | 15 days |
| Max Elders | 1 |
| Max Members | 1 admin + 3 read-only |
| Max Report Recipients | 3 per elder |
| Storage | 50 MB |

---

## Navigation

**4 icons, no hamburger menu** (identical to Plan A):

| Position | Icon | Route |
|----------|------|-------|
| 1 | Home | `/dashboard` |
| 2 | Health Profile | `/dashboard/elder-profile` |
| 3 | Insights | `/dashboard/insights` |
| 4 | Health Chat | `/dashboard/health-chat` |

Settings, Help, and Sign Out are accessible via the avatar dropdown in the header.

---

## Active Features (Plan B Admin)

### Dashboard & Home
| Feature | Route | Status |
|---------|-------|--------|
| Dashboard Home | `/dashboard` | Active |
| Greeting, Priority Card, Day Progress | `/dashboard` | Active |
| Voice Input, Suggestion Chips | `/dashboard` | Active |
| Weekly Summary Panel | `/dashboard` | Active |

### Elder Management
| Feature | Route | Status |
|---------|-------|--------|
| View Elder Profile | `/dashboard/elder-profile` | Active |
| Edit Elder Profile | `/dashboard/elder-profile` | Active |
| Add Elder (max 1) | `/dashboard/elders` | Active |

### Medications
| Feature | Route | Status |
|---------|-------|--------|
| View Medications | `/dashboard/medications` | Active |
| Add Medication | `/dashboard/medications/new` | Active |
| Edit Medication | `/dashboard/medications/[id]/edit` | Active |
| Delete Medication | `/dashboard/medications` | Active |

### Supplements
| Feature | Route | Status |
|---------|-------|--------|
| View Supplements | `/dashboard/supplements` | Active |
| Add Supplement | `/dashboard/supplements/new` | Active |
| Edit Supplement | `/dashboard/supplements/[id]/edit` | Active |
| Delete Supplement | `/dashboard/supplements` | Active |

### Diet
| Feature | Route | Status |
|---------|-------|--------|
| View Diet Entries | `/dashboard/diet` | Active |
| Log Meal (with AI analysis) | `/dashboard/diet/new` | Active |
| Edit Diet Entry | `/dashboard/diet/[id]/edit` | Active |
| Delete Diet Entry | `/dashboard/diet` | Active |

### Activity
| Feature | Route | Status |
|---------|-------|--------|
| Today's Focus (medication tracking) | `/dashboard/activity` | Active |
| Mark as Taken/Skipped/Late | `/dashboard/activity` | Active |
| Quick Insights & Progress | `/dashboard/activity` | Active |

### Insights
| Feature | Route | Status |
|---------|-------|--------|
| Health Trends (compliance charts) | `/dashboard/insights` | Active |
| Clinical Notes (doctor visit prep) | `/dashboard/insights` | Active |
| Reports (medication + nutrition) | `/dashboard/insights` | Active |

### Health Chat
| Feature | Route | Status |
|---------|-------|--------|
| AI Health Data Queries | `/dashboard/health-chat` | Active |
| Suggestion Chips | `/dashboard/health-chat` | Active |
| Voice Input | `/dashboard/health-chat` | Active |

### Alerts
| Feature | Route | Status |
|---------|-------|--------|
| Group-based Alerts | `/dashboard/alerts` | Active |

### Documents
| Feature | Route | Status |
|---------|-------|--------|
| Upload Documents/Images | `/dashboard/documents` | Active |
| View/Delete Documents | `/dashboard/documents` | Active |
| Edit Description | `/dashboard/documents` | Active |
| Storage Quota (50 MB) | `/dashboard/documents` | Enforced |

### Notifications
| Feature | Status |
|---------|--------|
| FCM Push Notifications | Active |
| In-app Notifications (bell icon) | Active |
| Daily Email Reports (7 PM PST) | Active |
| Email PDF Attachment | Active |
| 8 PM / 9 PM Fallback Triggers | Active |

### Settings (All 8 Tabs)
| Tab | Status |
|-----|--------|
| Profile | Active |
| Security & Activity | Active |
| Subscription | Active |
| Notifications | Active |
| Group Management | Active |
| Smart Features | Active |
| Alert Preferences | Active |
| Privacy & Data | Active |

### Subscription Management
| Feature | Status |
|---------|--------|
| View Current Plan | Active |
| Upgrade to Multi Agency | Active |
| Downgrade to Plan A | Active (only plan with downgrade) |
| Cancel Subscription | Active |
| Manage Billing (Stripe) | Active |

---

## Disabled / Redirected Features

| Feature | Route | Behavior | Reason |
|---------|-------|----------|--------|
| Safety Alerts | `/dashboard/safety-alerts` | Redirects to `/dashboard/insights` | Professional caregiving feature (drug interactions, incident reports) |
| Analytics | `/dashboard/analytics` | Redirects to `/dashboard/insights` | Disabled for ALL users, redundant with Insights |
| Calendar | `/dashboard/calendar` | FeatureGate upgrade prompt | Multi-Agency only |
| Shift Handoff | `/dashboard/shift-handoff` | FeatureGate upgrade prompt | Multi-Agency only |
| Availability | `/dashboard/availability` | FeatureGate upgrade prompt | Multi-Agency only |
| Care Management | `/dashboard/care-management` | "Agency Feature" block | Multi-Agency only |
| Agency Dashboard | `/dashboard/agency` | Not linked in nav | Multi-Agency only |
| Caregiver Burnout | `/dashboard/caregiver-burnout` | Not linked in nav | Multi-Agency only |
| Timesheet | `/dashboard/timesheet` | Redirects | Disabled for ALL users |

---

## Plan B Members

Members do **NOT** create accounts. They are email-only recipients.

| Capability | Status |
|------------|--------|
| Login to app | No |
| Receive daily email report (7 PM PST) | Yes |
| Receive PDF attachment | Yes |
| Max recipients per elder | 3 |

Members are added via **Settings > Group Management > Daily Report Recipients**.

---

## Differences from Plan A

| Property | Plan A | Plan B |
|----------|--------|--------|
| Price | $8.99/mo | $10.99/mo |
| Members | 1 admin + 1 member | 1 admin + 3 members |
| Report Recipients | 1 per elder | 3 per elder |
| Storage | 25 MB | 50 MB |
| Downgrade | No | Yes (to Plan A) |
| All other features | Identical | Identical |

The code uses `isFamilyPlan()` which returns `true` for both Plan A (`family`) and Plan B (`single_agency`). All feature access, navigation, page routing, and component visibility is identical. Only quantitative limits differ.

---

## Key Code References

| File | Purpose |
|------|---------|
| `src/lib/subscription/subscriptionService.ts:94-111` | Plan B limits definition |
| `src/lib/firebase/planLimits.ts:225-233` | Elder limit enforcement |
| `src/lib/firebase/planLimits.ts:393-394` | Member limit enforcement |
| `src/lib/firebase/storage.ts:42` | Storage quota (50 MB) |
| `src/lib/utils/getUserRole.ts:12-24` | `isFamilyPlan()` — treats A and B identically |
| `src/components/navigation/IconRail.tsx:121-135` | 4-icon nav for family plans |
| `src/components/navigation/BottomNav.tsx:50-63` | Mobile nav for family plans |
| `src/app/dashboard/safety-alerts/page.tsx:57-62` | Redirect non-multiagency to insights |
