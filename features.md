# Careguide Features by Pricing Plan

## Pricing Tiers Overview

| Plan | Price | Max Elders | Max Members | Storage |
|------|-------|------------|-------------|---------|
| **Family** | $8.99/elder/month | 1 | 2 | 25 MB |
| **Single Agency** | $14.99/elder/month | 1 | 4 | 50 MB |
| **Multi Agency** | $30/elder/month | 30 | 10 caregivers | 500 MB |

**Free Trial:** 45 days with all Family plan features

---

## Family Plan — $8.99/elder/month

### Dashboard & Elder Management
- **Dashboard Overview** — Aggregate stats across all elders (compliance %, medications, meals)
- **Manage Elders** — Add, edit, archive, restore elder profiles
- **Elder Health Profile** — Detailed health information view

### Daily Care Logging
- **Medications** — Add/edit medications, dosage tracking, voice input, log doses
- **Supplements** — Track vitamins and supplements with compliance
- **Diet** — Meal logging (breakfast, lunch, dinner, snacks) with voice input
- **Activity** — Daily schedule view with take/miss/skip actions
- **Quick Insights** — Collapsible compliance summary cards

### Medical Safety
- **Incident Reports** — Document falls, injuries, medication errors, behavioral incidents
  - Severity levels: minor, moderate, serious, critical
  - Witness tracking, family/doctor notification
- **Drug Interactions** — FDA drug label checking with interaction detection
- **Schedule Conflicts** — Detect overlapping medication times
- **Dementia Screening** — Hybrid cognitive assessment
  - Q&A Assessment: 13 MoCA-adapted questions across 6 cognitive domains
  - AI adaptive branching for follow-up questions
  - Behavioral Detection: Automated pattern analysis from care notes
  - Risk levels: urgent, concerning, moderate, low

### Health Analytics
- **Medication Adherence** — AI-driven prediction of missed medications
  - High-risk medications & times identification
  - Intervention suggestions
- **Nutrition Analysis** — Eating patterns and food variety analysis
  - Nutrition score, hydration tracking
  - Meal patterns & frequency
- **Health Trends/Insights** — Comprehensive analytics dashboard
  - Weekly summaries with export
  - Compliance pattern charts (12-week trends)
  - AI-generated daily summaries
  - Refill predictions

### Care Documentation
- **Clinical Notes** — Doctor visit preparation reports
  - Patient info, medications overview
  - 14-day adherence data
  - Discussion points & provider questions
  - PDF download & print
- **Documents** — Medical records storage (25 MB limit)
  - Categories: medical, insurance, legal, care_plan, other
  - File preview and management
- **My Notes** — Caregiver journaling
  - Voice input support
  - Search with fuzzy matching
  - Publish to community option
  - Tag management
- **Family Updates** — AI-generated weekly family reports
  - Editable before sending
  - Narrative generation

### Communication & Alerts
- **Alerts** — Notification center with filtering
- **Push Notifications** — Medication reminders via FCM
- **PHI Disclosures** — Protected Health Information access log

### Settings & Management
- **Profile** — User info, avatar, contact details
- **Notifications** — Preference configuration
- **Notification History** — Log of all sent notifications
- **AI Features Settings** — Consent status, model preferences
- **Activity History** — User action audit log
- **Alert Preferences** — Configure alert triggers
- **Group Management** — Member invites, permission management, approval queue
- **Subscription Settings** — Plan info, billing portal
- **Data Management** — Export (CSV, JSON, PDF) and deletion

### AI Features (Requires Unified Consent)
- **Health Chat** — Natural language queries about logged data
- **Health Assistant Hub** — AI feature landing page
- **Voice Search** — Voice input across features
- **AI Document Analysis** — Analyze uploaded documents

---

## Single Agency Plan — $14.99/elder/month

*Includes ALL Family Plan features PLUS:*

### Additional Features
| Feature | Code Name | Description |
|---------|-----------|-------------|
| Real-time Collaboration | `real_time_collaboration` | Live dashboard updates for team members |
| Agency Dashboard | `agency_dashboard` | Agency-level monitoring and overview |

### Enhanced Limits
- **Max Members:** 4 (1 admin + 3 members)
- **Storage:** 50 MB

---

## Multi Agency Plan — $30/elder/month

*Includes ALL Single Agency features PLUS:*

### Agency Management Suite
| Feature | Code Name | Description |
|---------|-----------|-------------|
| Agency Overview | — | Multi-tab agency management hub |
| Shift Calendar | `calendar` | Visual week/month shift scheduling |
| Shift Handoff | `shift_handoff` | AI-generated caregiver handoff notes |
| Caregiver Assignments | `multi_caregiver` | Assign caregivers to elders |
| Caregiver Availability | `availability_scheduling` | Track scheduling preferences |
| Advanced Analytics | `advanced_analytics` | Agency-wide analytics dashboard |
| Timesheet | — | Track caregiver hours worked |
| Caregiver Burnout | — | AI-driven burnout detection (admin only) |

### Shift Management Features
- **Shift Calendar**
  - Week/month view
  - Create shift requests
  - Shift swap requests
  - Schedule conflict checking
  - Shift confirmation/cancellation
  - Caregiver filtering

- **Shift Handoff**
  - Active shift tracking
  - Session management
  - AI-generated shift summaries
  - Recent handoff notes

- **Caregiver Burnout Detection**
  - Risk levels: critical, high, moderate, low
  - Burnout trajectory predictions
  - Adaptive thresholds via AI
  - Customizable analysis period

### Enhanced Limits
- **Max Elders:** 30
- **Max Caregivers:** 10
- **Max Elders per Caregiver:** 3
- **Max Groups:** 10
- **Storage:** 500 MB

---

## Feature Gating Matrix

| Feature | Family | Single Agency | Multi Agency |
|---------|:------:|:-------------:|:------------:|
| Core Care Logging | ✅ | ✅ | ✅ |
| AI Health Chat | ✅ | ✅ | ✅ |
| Drug Interactions | ✅ | ✅ | ✅ |
| Dementia Screening | ✅ | ✅ | ✅ |
| Clinical Notes | ✅ | ✅ | ✅ |
| Family Updates | ✅ | ✅ | ✅ |
| Incident Reports | ✅ | ✅ | ✅ |
| Health Analytics | ✅ | ✅ | ✅ |
| Document Storage | 25 MB | 50 MB | 500 MB |
| Real-time Collaboration | ❌ | ✅ | ✅ |
| Agency Dashboard | ❌ | ✅ | ✅ |
| Shift Calendar | ❌ | ❌ | ✅ |
| Shift Handoff | ❌ | ❌ | ✅ |
| Multi-Caregiver Coordination | ❌ | ❌ | ✅ |
| Caregiver Availability | ❌ | ❌ | ✅ |
| Advanced Analytics | ❌ | ❌ | ✅ |
| Caregiver Burnout Detection | ❌ | ❌ | ✅ |
| Max Elders | 1 | 1 | 30 |
| Max Members | 2 | 4 | 10 |

---

## Consent-Gated Features

These features require **Unified AI & Medical Consent**:
- 60-second mandatory reading time
- 4 required checkboxes (AI understanding, MedGemma terms, medical disclaimer, data processing)
- 90-day expiry with automatic re-consent

**Consent Required For:**
- Health Chat / Health Records Lookup
- Drug Interactions
- Dementia Screening (Q&A Assessment)
- Document Analysis (AI)
- Health Assistant Hub features

---

## Technical Implementation

### Feature Gating Code
```typescript
// Check feature access
import { useSubscription } from '@/lib/subscription/useSubscription';

const { hasFeature, isMultiAgency } = useSubscription();

// Component-level gating
<FeatureGate feature="calendar">
  <CalendarComponent />
</FeatureGate>
```

### Feature Names (TypeScript)
```typescript
type FeatureName =
  | 'real_time_collaboration'
  | 'agency_dashboard'
  | 'calendar'
  | 'shift_handoff'
  | 'multi_caregiver'
  | 'advanced_analytics'
  | 'availability_scheduling';
```

---

## API Endpoints by Feature Area

### Core (All Plans)
- `/api/medgemma/query` — Health chat
- `/api/medgemma/clinical-note` — Clinical notes
- `/api/drug-interactions` — Drug interaction checking
- `/api/dementia-assessment/*` — Cognitive assessments
- `/api/medication-adherence` — Adherence prediction
- `/api/family-updates` — Family report generation
- `/api/documents` — File management
- `/api/notes` — Caregiver notes

### Agency Features (Multi Agency)
- `/api/shift-handoff` — Shift notes
- `/api/caregiver-burnout` — Burnout analysis
- `/api/timesheet` — Hour tracking
- `/api/billing/*` — Subscription management

### AI Analytics
- `/api/ai-analytics` — AI-driven insights (Gemini → Claude fallback)
- `/api/voice-search` — Voice input processing

---

## Statistics

| Metric | Count |
|--------|-------|
| Total Dashboard Pages | 36 |
| Total API Endpoints | 41+ |
| Core Features (All Plans) | ~25 |
| Single Agency Exclusive | 2 |
| Multi Agency Exclusive | 8 |
| AI-Powered Features | 12 |
| Consent-Gated Features | 5 |

---

*Last updated: December 24, 2025*
