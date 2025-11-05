# Claude Code Prompt: Caregiver Management Webapp

## Project Overview
Build a modern, scalable Next.js webapp for caregiving agencies and families to manage elder care. Features include multi-group management, voice-powered logging, AI-driven insights, real-time collaboration, and SMS notifications. Hosted on Vercel with Firebase backend.

## Core Architecture

### Tech Stack
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **AI**: Google Gemini API (summaries, pattern detection)
- **Voice**: Google Cloud Speech-to-Text API
- **Payments**: Stripe (subscriptions)
- **Auth**: Cloudflare Turnstile + OTP (email + SMS via Twilio/Firebase)
- **Hosting**: Vercel
- **State**: Zustand + React Query (server state caching)
- **Notifications**: Twilio SMS API

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth layout group
│   ├── (dashboard)/       # Main app layout group
│   ├── (agency)/          # Agency-specific routes
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── voice/             # Voice input components
│   ├── care/              # Care tracking components
│   ├── agency/            # Agency dashboard components
│   └── shared/            # Reusable components
├── lib/
│   ├── firebase/          # Firebase services
│   ├── ai/                # Gemini AI services
│   ├── voice/             # Speech-to-text services
│   ├── payments/          # Stripe integration
│   ├── notifications/     # SMS notification services
│   └── utils/             # Helper functions
├── hooks/                 # Custom React hooks
├── store/                 # Zustand stores
├── types/                 # TypeScript definitions
└── middleware.ts          # Next.js middleware (auth)
```

## Database Schema (Firestore)

### Collections Structure

#### `agencies` Collection
```typescript
{
  id: string,                     // Agency ID
  name: string,                   // Agency name
  adminId: string,                // Owner user ID
  subscription: {
    tier: 'agency',               // Always 'agency'
    status: 'trial' | 'active' | 'cancelled',
    trialEndsAt: Timestamp,
    currentPeriodEnd: Timestamp,
    stripeCustomerId: string,
    stripeSubscriptionId: string
  },
  groups: string[],               // Array of group IDs (max 10)
  settings: {
    notificationPreferences: {
      enabled: boolean,
      frequency: 'realtime' | 'daily' | 'weekly',
      types: ('missed_doses' | 'diet_alerts' | 'supplement_alerts')[]
    }
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `groups` Collection
```typescript
{
  id: string,                     // Group ID
  name: string,                   // Group name (e.g., "Smith Family", "Client - Mary Jones")
  type: 'family' | 'agency',      // Group type
  agencyId?: string,              // If agency group
  adminId: string,                // Primary admin user ID
  members: {
    userId: string,
    role: 'admin' | 'member',
    permissions: string[],        // e.g., ['edit_meds', 'view_only']
    addedAt: Timestamp,
    addedBy: string
  }[],                            // Max 4 members
  elders: {
    id: string,
    name: string,
    dateOfBirth: Date,
    userId?: string,              // If elder has account
    profileImage?: string,
    notes: string,
    createdAt: Timestamp
  }[],                            // Max 2 elders per caregiver
  subscription: {
    tier: 'single' | 'family' | 'agency',
    status: 'trial' | 'active' | 'cancelled',
    trialEndsAt: Timestamp,
    currentPeriodEnd: Timestamp,
    stripeCustomerId: string,
    stripeSubscriptionId: string
  },
  settings: {
    notificationRecipients: string[], // Max 2 user IDs
    notificationPreferences: {
      enabled: boolean,
      frequency: 'realtime' | 'daily' | 'weekly',
      types: ('missed_doses' | 'diet_alerts' | 'supplement_alerts')[]
    }
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `users` Collection
```typescript
{
  id: string,                     // User ID
  email: string,
  phoneNumber: string,            // US format only
  phoneNumberHash: string,        // For trial tracking
  firstName: string,
  lastName: string,
  profileImage?: string,
  groups: {
    groupId: string,
    role: 'admin' | 'member',
    joinedAt: Timestamp
  }[],
  agencies: {
    agencyId: string,
    role: 'owner' | 'admin' | 'member',
    joinedAt: Timestamp
  }[],
  preferences: {
    theme: 'light' | 'dark',
    notifications: {
      sms: boolean,
      email: boolean
    }
  },
  trialUsed: boolean,             // Phone-based trial tracking
  createdAt: Timestamp,
  lastLoginAt: Timestamp
}
```

#### `medications` Collection
```typescript
{
  id: string,
  groupId: string,
  elderId: string,                // Which elder
  name: string,
  dosage: string,                 // e.g., "10mg"
  frequency: {
    type: 'daily' | 'weekly' | 'asNeeded',
    times: string[],              // e.g., ["08:00", "20:00"]
    days?: number[]               // For weekly: [0,2,4] = Sun, Tue, Thu
  },
  instructions?: string,
  prescribedBy?: string,
  startDate: Date,
  endDate?: Date,
  reminders: boolean,
  createdBy: string,              // User ID
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `medication_logs` Collection
```typescript
{
  id: string,
  groupId: string,
  elderId: string,
  medicationId: string,
  scheduledTime: Timestamp,       // When it should be taken
  actualTime?: Timestamp,         // When it was taken
  status: 'scheduled' | 'taken' | 'missed' | 'skipped',
  loggedBy?: string,              // User ID
  method: 'manual' | 'voice',     // How it was logged
  voiceTranscript?: string,       // If logged via voice
  notes?: string,
  aiAnalysis?: {
    flag: boolean,
    reason: string,               // e.g., "Dose taken 3 hours late"
    severity: 'low' | 'medium' | 'high'
  },
  createdAt: Timestamp
}
```

#### `supplements` Collection
```typescript
{
  id: string,
  groupId: string,
  elderId: string,
  name: string,
  dosage: string,
  frequency: {
    type: 'daily' | 'weekly' | 'asNeeded',
    times: string[],
    days?: number[]
  },
  notes?: string,
  createdBy: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `supplement_logs` Collection
```typescript
{
  id: string,
  groupId: string,
  elderId: string,
  supplementId: string,
  scheduledTime: Timestamp,
  actualTime?: Timestamp,
  status: 'scheduled' | 'taken' | 'missed' | 'skipped',
  loggedBy?: string,
  method: 'manual' | 'voice',
  voiceTranscript?: string,
  notes?: string,
  createdAt: Timestamp
}
```

#### `diet_entries` Collection
```typescript
{
  id: string,
  groupId: string,
  elderId: string,
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  items: string[],                // Food items
  timestamp: Timestamp,
  loggedBy: string,
  method: 'manual' | 'voice',
  voiceTranscript?: string,
  notes?: string,
  aiAnalysis?: {
    nutritionScore: number,       // 0-100
    concerns: string[],           // e.g., ["High sodium"]
    recommendations: string[]
  },
  createdAt: Timestamp
}
```

#### `activity_logs` Collection
```typescript
{
  id: string,
  groupId: string,
  elderId?: string,
  userId: string,                 // Who performed action
  action: string,                 // e.g., "added_medication", "updated_dose"
  entityType: 'medication' | 'supplement' | 'diet' | 'group' | 'user',
  entityId: string,
  details: object,                // Action-specific details
  timestamp: Timestamp
}
```

#### `ai_summaries` Collection
```typescript
{
  id: string,
  groupId: string,
  elderId: string,
  date: Date,                     // Summary date
  summary: {
    medicationCompliance: {
      taken: number,
      missed: number,
      percentage: number
    },
    supplementCompliance: {
      taken: number,
      missed: number,
      percentage: number
    },
    dietSummary: {
      mealsLogged: number,
      concernsDetected: string[],
      recommendations: string[]
    },
    overallInsights: string[],    // AI-generated insights
    missedDoses: {
      medicationName: string,
      scheduledTime: string,
      elderId: string
    }[]
  },
  generatedAt: Timestamp
}
```

## Authentication System

### Registration Flow
1. **Email + Phone Input**
   - Collect email (any valid email)
   - Collect US phone number (validate format)
   - Show Cloudflare Turnstile challenge

2. **OTP Verification**
   - Send 6-digit OTP to email (via SendGrid/AWS SES)
   - Send 6-digit OTP to phone (via Twilio)
   - User enters both OTPs (60-second expiry)
   - Hash phone number to check trial usage

3. **Profile Creation**
   - First name, last name
   - Select role: Individual/Family or Agency
   - Create first group or agency

4. **Trial Activation**
   - Start 7-day free trial
   - No credit card required for trial

### Authentication Middleware
```typescript
// middleware.ts - Protect all /dashboard routes
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Verify Firebase token
  const isValid = await verifyToken(token.value);
  
  if (!isValid) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/agency/:path*']
};
```

## Feature Implementation Requirements

### Phase 1: Foundation & Authentication (Week 1)

**Goal**: Set up project, authentication, and basic dashboard structure

#### Task 1.1: Project Initialization
- Initialize Next.js 14 with TypeScript and Tailwind
- Install dependencies: Firebase, shadcn/ui, Zustand, React Query
- Set up environment variables for all services
- Configure Vercel deployment

#### Task 1.2: Authentication System
**Files to create:**
- `app/(auth)/login/page.tsx` - Login page with email/phone input
- `app/(auth)/verify/page.tsx` - OTP verification page
- `app/(auth)/signup/page.tsx` - New user signup flow
- `lib/firebase/auth.ts` - Firebase Auth service
- `lib/notifications/otp.ts` - OTP sending service (email + SMS)
- `lib/utils/phoneValidation.ts` - US phone number validation
- `components/auth/TurnstileWidget.tsx` - Cloudflare Turnstile component

**Requirements:**
- Cloudflare Turnstile integration
- Dual OTP (email + SMS) verification
- Phone number hashing for trial tracking
- Session management with HTTP-only cookies
- Auto-redirect based on user role (individual/family vs agency)

#### Task 1.3: Basic Dashboard Layout
**Files to create:**
- `app/(dashboard)/layout.tsx` - Main dashboard layout with sidebar
- `app/(dashboard)/page.tsx` - Dashboard home/overview
- `components/shared/Sidebar.tsx` - Navigation sidebar
- `components/shared/Header.tsx` - Top header with user menu
- `components/ui/*` - Install shadcn/ui components (button, card, dropdown, etc.)

**Dashboard Structure:**
```
Sidebar Navigation:
├── Overview (dashboard home)
├── Elders (list of elders in group)
├── Medications
├── Supplements
├── Diet Tracking
├── Activity Log
├── Settings
└── (If agency) Agency Dashboard
```

### Phase 2: Core Care Tracking (Week 2)

**Goal**: Implement medication, supplement, and diet tracking with manual entry

#### Task 2.1: Elder Management
**Files to create:**
- `app/(dashboard)/elders/page.tsx` - List all elders in group
- `app/(dashboard)/elders/[id]/page.tsx` - Individual elder details
- `app/(dashboard)/elders/new/page.tsx` - Add new elder
- `lib/firebase/elders.ts` - Elder CRUD operations
- `components/care/ElderCard.tsx` - Elder profile card
- `components/care/ElderForm.tsx` - Add/edit elder form

**Requirements:**
- Max 2 elders per caregiver (validation)
- Optional profile image upload
- Date of birth, notes
- Option to create member account for elder

#### Task 2.2: Medication Management
**Files to create:**
- `app/(dashboard)/medications/page.tsx` - All medications list
- `app/(dashboard)/medications/[id]/page.tsx` - Medication details & logs
- `app/(dashboard)/medications/new/page.tsx` - Add medication
- `lib/firebase/medications.ts` - Medication CRUD + scheduling
- `components/care/MedicationCard.tsx` - Medication display card
- `components/care/MedicationForm.tsx` - Add/edit medication form
- `components/care/MedicationSchedule.tsx` - Visual schedule display
- `components/care/LogDoseModal.tsx` - Manual dose logging modal

**Requirements:**
- Scheduling: daily, weekly, as-needed
- Multiple daily doses support
- Prescription information
- Manual "Mark as Taken" / "Mark as Missed" / "Skip"
- Visual schedule with color-coded status

#### Task 2.3: Supplement Management
**Files to create:**
- `app/(dashboard)/supplements/page.tsx` - All supplements list
- `app/(dashboard)/supplements/new/page.tsx` - Add supplement
- `lib/firebase/supplements.ts` - Supplement CRUD operations
- `components/care/SupplementCard.tsx` - Supplement display
- `components/care/SupplementForm.tsx` - Add/edit form

**Requirements:**
- Similar to medications but simpler (no prescription info)
- Scheduling support
- Manual logging

#### Task 2.4: Diet Tracking
**Files to create:**
- `app/(dashboard)/diet/page.tsx` - Diet log view (calendar/list)
- `app/(dashboard)/diet/new/page.tsx` - Add diet entry
- `lib/firebase/diet.ts` - Diet entry CRUD
- `components/care/DietEntryCard.tsx` - Diet entry display
- `components/care/DietForm.tsx` - Add diet entry form
- `components/care/DietCalendar.tsx` - Calendar view of diet logs

**Requirements:**
- Meal type selection (breakfast, lunch, dinner, snack)
- Multiple food items per entry
- Free-form text input
- Timestamp for each entry

### Phase 3: Voice Input Integration (Week 3)

**Goal**: Add voice-powered logging for meds, supplements, and diet

#### Task 3.1: Voice Input Service
**Files to create:**
- `lib/voice/speechToText.ts` - Google Cloud Speech-to-Text integration
- `lib/voice/voiceParser.ts` - Parse voice transcripts to structured data
- `hooks/useVoiceInput.ts` - Custom hook for voice recording
- `components/voice/VoiceButton.tsx` - Microphone button component
- `components/voice/VoiceModal.tsx` - Voice recording modal

**Voice Input Examples:**
```
Medications:
"John took Lisinopril at 9am"
"Mary took her evening meds"
"Skip afternoon Aspirin for John"

Supplements:
"John took Vitamin D at breakfast"
"Mary took fish oil this morning"

Diet:
"John had oatmeal and coffee for breakfast"
"Mary ate chicken salad for lunch"
"John had a banana as a snack"
```

**Requirements:**
- Real-time audio streaming to Google Speech-to-Text
- Visual feedback (waveform or recording indicator)
- Parse transcript to extract:
  - Elder name (match to group's elders)
  - Medication/supplement/food name
  - Time (if mentioned, else use current time)
  - Action (took, missed, skipped)
- Confirmation screen before saving
- Fallback to manual edit if parsing fails

#### Task 3.2: Voice-Enabled Logging
**Files to create:**
- `components/care/VoiceLogMedication.tsx` - Voice log for meds
- `components/care/VoiceLogSupplement.tsx` - Voice log for supplements
- `components/care/VoiceLogDiet.tsx` - Voice log for diet
- `lib/voice/intentRecognition.ts` - Determine intent from transcript

**Requirements:**
- Add voice button to medication, supplement, and diet pages
- Auto-match elder name from transcript to group's elders
- Auto-match medication/supplement name (fuzzy matching)
- Show transcript + parsed data for confirmation
- Save with `method: 'voice'` and store transcript
- Error handling for unclear transcripts

### Phase 4: AI Integration with Gemini (Week 4)

**Goal**: Add AI-powered summaries and pattern detection (NO medical advice)

#### Task 4.1: Gemini AI Service
**Files to create:**
- `lib/ai/gemini.ts` - Gemini API client
- `lib/ai/summaries.ts` - Daily summary generation
- `lib/ai/patterns.ts` - Pattern detection (missed doses, diet issues)
- `lib/ai/prompts.ts` - Prompt templates for Gemini

**AI Capabilities:**
1. **Daily Summary Generation** (run via cron at 8 PM)
   - Count taken/missed medications
   - Count taken/missed supplements
   - List diet entries with basic analysis
   - Identify patterns (e.g., "3 missed morning doses this week")
   
2. **Medication Compliance Analysis**
   - Calculate compliance percentage
   - Flag missed doses
   - Detect late doses (e.g., "Taken 2 hours late")

3. **Diet Analysis** (very basic)
   - Detect repeated food items
   - Flag potential concerns (e.g., "No vegetables logged today")
   - NO nutritional calculations or medical advice

**CRITICAL RESTRICTIONS:**
- **NO drug interaction checking** (liability risk)
- **NO dosage recommendations**
- **NO medical advice of any kind**
- Only summarize and detect patterns
- All AI output labeled as "informational only"

**Gemini Prompts:**
```typescript
// Example: Daily Summary Prompt
const summaryPrompt = `
You are a caregiving assistant. Summarize today's care activities for ${elderName}.

Medications taken: ${takenMeds.join(', ')}
Medications missed: ${missedMeds.join(', ')}
Supplements taken: ${takenSupplements.join(', ')}
Diet logged: ${dietEntries.join(', ')}

Provide a brief, factual summary in 3-4 sentences. Focus on compliance and patterns.
Do NOT provide medical advice. Do NOT suggest dosage changes.
`;
```

#### Task 4.2: AI Dashboard Integration
**Files to create:**
- `app/(dashboard)/insights/page.tsx` - AI insights dashboard
- `components/ai/SummaryCard.tsx` - Daily summary display
- `components/ai/ComplianceChart.tsx` - Visual compliance chart
- `components/ai/PatternAlert.tsx` - Alert cards for detected patterns

**Requirements:**
- Show daily summaries on Overview page
- Dedicated Insights page with weekly/monthly views
- Compliance charts (line/bar charts)
- Pattern alerts with severity indicators
- Disclaimer: "AI-generated, not medical advice"

### Phase 5: SMS Notifications (Week 5)

**Goal**: Implement SMS notifications for missed doses

#### Task 5.1: Notification Service
**Files to create:**
- `lib/notifications/sms.ts` - Twilio SMS integration
- `lib/notifications/scheduler.ts` - Notification scheduling logic
- `app/api/notifications/route.ts` - API route for sending notifications

**Notification Types:**
1. **Missed Dose Alert** (sent 30 min after scheduled time)
   ```
   Alert: John missed Lisinopril 10mg at 9:00 AM.
   Log it now: [link to app]
   ```

2. **Daily Summary** (optional, customizable time)
   ```
   Daily Summary for John:
   ✓ 3 meds taken
   ✗ 1 med missed (Aspirin 9 AM)
   View details: [link]
   ```

**Requirements:**
- Only admin receives by default
- Admin can add 1 additional recipient
- Customizable frequency: realtime, daily, weekly
- Customizable notification types (meds, supplements, diet)
- User can enable/disable via Settings
- SMS rate limiting to prevent spam
- Store notification preferences in Firestore

#### Task 5.2: Notification Settings
**Files to create:**
- `app/(dashboard)/settings/notifications/page.tsx` - Notification settings page
- `components/settings/NotificationForm.tsx` - Notification preferences form

**Settings Options:**
- Enable/disable SMS notifications
- Add secondary recipient (dropdown of group members)
- Set frequency (realtime, daily at X time, weekly)
- Select notification types (checkboxes)
- Test notification button

### Phase 6: Group & Member Management (Week 6)

**Goal**: Multi-user collaboration, invites, and permissions

#### Task 6.1: Group Management
**Files to create:**
- `app/(dashboard)/settings/group/page.tsx` - Group settings page
- `app/(dashboard)/invite/[code]/page.tsx` - Join group via invite
- `lib/firebase/groups.ts` - Group management operations
- `lib/utils/inviteCode.ts` - Generate 6-character codes
- `components/group/MemberList.tsx` - List group members
- `components/group/InviteModal.tsx` - Generate and share invite

**Requirements:**
- Generate unique 6-character alphanumeric invite codes
- Invite link: `yourapp.com/invite/ABC123`
- Max 4 members per group (validate on join)
- Admin can remove members
- Admin can promote member to admin
- Show member roles and join dates

#### Task 6.2: Permissions System
**Files to create:**
- `lib/permissions/roles.ts` - Role-based access control
- `lib/permissions/check.ts` - Permission checking utilities
- `hooks/usePermissions.ts` - Permission hook for components

**Permission Levels:**
```typescript
type Permission = 
  | 'view_all'           // Can view all data
  | 'edit_medications'   // Can add/edit medications
  | 'edit_supplements'   // Can add/edit supplements
  | 'edit_diet'          // Can add/edit diet entries
  | 'log_doses'          // Can log medication doses
  | 'manage_members'     // Can invite/remove members
  | 'manage_settings'    // Can change group settings
  | 'view_insights';     // Can view AI insights

const rolePermissions = {
  admin: ['all permissions'],
  member: ['view_all', 'log_doses', 'edit_diet', 'view_insights']
};
```

#### Task 6.3: Real-time Collaboration
**Files to create:**
- `hooks/useRealtimeData.ts` - Firestore realtime listeners
- `lib/firebase/realtime.ts` - Realtime sync utilities
- `components/shared/OnlineIndicator.tsx` - Show online users

**Requirements:**
- Firestore onSnapshot listeners for real-time updates
- Show when other users are online
- Optimistic updates (show immediately, sync in background)
- Conflict resolution (last write wins)
- Activity indicators (e.g., "Sarah logged a dose 2 minutes ago")

### Phase 7: Agency Features (Week 7)

**Goal**: Agency dashboard, multi-group management, analytics

#### Task 7.1: Agency Dashboard
**Files to create:**
- `app/(agency)/dashboard/page.tsx` - Agency overview dashboard
- `app/(agency)/groups/page.tsx` - All groups list
- `app/(agency)/groups/[id]/page.tsx` - Individual group view
- `app/(agency)/analytics/page.tsx` - Agency-wide analytics
- `lib/firebase/agencies.ts` - Agency management operations
- `components/agency/GroupCard.tsx` - Group summary card
- `components/agency/AgencyStats.tsx` - Key metrics display

**Agency Dashboard Content:**
```
Agency Overview
├── Total Groups: 7/10
├── Total Caregivers: 24
├── Total Elders: 14
├── Compliance This Week: 94%
├── Active Alerts: 3
└── Recent Activity (all groups)

Groups List
├── Group 1: Smith Family (4 members, 2 elders)
├── Group 2: Johnson Care (3 members, 1 elder)
└── [Add New Group] button
```

**Requirements:**
- Aggregate stats across all groups
- Quick filters (by compliance, recent activity)
- Drill-down to individual group details
- Max 10 groups (enforce on creation)
- Bulk actions (export data, send notifications)

#### Task 7.2: Agency Analytics
**Files to create:**
- `lib/analytics/groupAnalytics.ts` - Analytics calculation
- `components/agency/ComplianceTable.tsx` - Group compliance table
- `components/agency/TrendChart.tsx` - Compliance trends over time
- `components/agency/ExportButton.tsx` - Export data to CSV

**Analytics Features:**
- Overall medication compliance (% per group)
- Missed dose trends (chart over time)
- Caregiver activity levels (who's logging most)
- Elder-specific compliance reports
- Export to CSV for external analysis

#### Task 7.3: Agency Settings & Billing
**Files to create:**
- `app/(agency)/settings/page.tsx` - Agency settings
- `app/(agency)/billing/page.tsx` - Billing and subscription
- `components/agency/BillingCard.tsx` - Subscription details

**Settings:**
- Agency name and info
- Notification preferences (agency-wide defaults)
- Add/remove admin users
- Manage groups (view all, remove)

### Phase 8: Subscription & Payments (Week 8)

**Goal**: Stripe integration, trial management, and billing

#### Task 8.1: Stripe Integration
**Files to create:**
- `lib/payments/stripe.ts` - Stripe client setup
- `app/api/checkout/route.ts` - Create checkout session
- `app/api/webhooks/stripe/route.ts` - Stripe webhook handler
- `app/(dashboard)/upgrade/page.tsx` - Upgrade page (post-trial)
- `components/payments/PricingCard.tsx` - Pricing plan display

**Pricing Tiers:**
1. **Single + 1**: $8.99/month
   - 1 admin + 1 member
   - 1 group
   - All features

2. **Family**: $14.99/month
   - 1 admin + up to 3 members
   - 1 group
   - All features

3. **Agency**: $199/month
   - Up to 10 groups
   - 4 members per group
   - Agency dashboard
   - Priority support

**Requirements:**
- 7-day free trial (no credit card required)
- Show trial countdown in header
- Upgrade modal on trial expiry
- Stripe Checkout integration
- Webhook handling for payment events
- Downgrade/cancel options
- Proration handling

#### Task 8.2: Trial Management
**Files to create:**
- `lib/utils/trial.ts` - Trial calculation utilities
- `hooks/useTrialStatus.ts` - Trial status hook
- `components/shared/TrialBanner.tsx` - Trial countdown banner
- `app/api/trial/check/route.ts` - Check trial eligibility

**Trial Logic:**
- Check phone number hash on signup
- One trial per phone number (lifetime)
- Show days remaining in UI
- Gentle upgrade prompts (3 days before expiry)
- Block access on trial expiry (redirect to upgrade)
- Allow access if payment succeeds

#### Task 8.3: Subscription Management
**Files to create:**
- `app/(dashboard)/settings/subscription/page.tsx` - Manage subscription
- `components/payments/SubscriptionCard.tsx` - Current plan display
- `components/payments/UpgradeModal.tsx` - Upgrade plan modal

**Requirements:**
- View current plan and billing cycle
- Upgrade/downgrade between tiers
- Cancel subscription
- Update payment method
- View billing history
- Download invoices

### Phase 9: Activity Logging & Audit Trail (Week 9)

**Goal**: Comprehensive activity logs for compliance and troubleshooting

#### Task 9.1: Activity Logging System
**Files to create:**
- `lib/firebase/activityLogs.ts` - Activity log operations
- `app/(dashboard)/activity/page.tsx` - Activity log viewer
- `components/activity/ActivityItem.tsx` - Activity log entry display
- `components/activity/ActivityFilters.tsx` - Filter by user, type, date

**Logged Activities:**
- User actions (login, logout, profile changes)
- Care actions (add/edit/delete meds, log doses)
- Group actions (invite user, remove user, change permissions)
- Settings changes (notification preferences)
- AI summaries generated
- Notifications sent

**Activity Log Format:**
```
[Timestamp] [User] [Action] [Entity]
"2:30 PM - Sarah logged medication dose for John (Lisinopril 10mg)"
"9:15 AM - Admin added new member: Mike"
"8:00 PM - AI generated daily summary for Mary"
```

**Requirements:**
- Store all significant actions
- Filterable by date range, user, action type
- Searchable
- Exportable to CSV
- Pagination for large logs

#### Task 9.2: Audit Dashboard (Agency Only)
**Files to create:**
- `app/(agency)/audit/page.tsx` - Agency audit dashboard
- `components/agency/AuditTable.tsx` - Audit log table
- `components/agency/ComplianceReport.tsx` - Compliance report generator

**Requirements:**
- View activity across all groups
- Filter by group, caregiver, or elder
- Compliance reports (for regulatory purposes)
- Export audit logs

### Phase 10: Settings & User Management (Week 10)

**Goal**: Comprehensive settings for all user types

#### Task 10.1: User Settings
**Files to create:**
- `app/(dashboard)/settings/profile/page.tsx` - User profile settings
- `app/(dashboard)/settings/account/page.tsx` - Account settings
- `app/(dashboard)/settings/security/page.tsx` - Security settings
- `components/settings/ProfileForm.tsx` - Edit profile form
- `components/settings/PasswordChange.tsx` - Change password

**Profile Settings:**
- First name, last name
- Profile image upload
- Email (view only, verify to change)
- Phone number (view only, verify to change)
- Theme preference (light/dark)

**Account Settings:**
- Email notifications (enable/disable)
- SMS notifications (enable/disable)
- Language preference (future: multi-language)
- Time zone
- Delete account

**Security Settings:**
- Two-factor authentication (future)
- Active sessions
- Login history

#### Task 10.2: Group Settings
**Files to create:**
- `app/(dashboard)/settings/group/page.tsx` - Group settings
- `components/settings/GroupForm.tsx` - Edit group details
- `components/settings/DangerZone.tsx` - Dangerous actions (delete group)

**Group Settings:**
- Group name
- Group description
- Member list (view only, link to manage members)
- Notification preferences
- Delete group (admin only, requires confirmation)

### Phase 11: Performance & Optimization (Week 11)

**Goal**: Optimize for speed, scalability, and user experience

#### Task 11.1: Performance Optimization
**Files to optimize:**
- Implement lazy loading for images
- Add React.memo to expensive components
- Optimize Firestore queries with indexes
- Implement pagination for large lists
- Add loading skeletons for better perceived performance
- Optimize bundle size (code splitting)

**Requirements:**
- Lighthouse score 90+ on all pages
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Implement service worker for offline support
- Add optimistic UI updates

#### Task 11.2: Error Handling & Monitoring
**Files to create:**
- `lib/monitoring/sentry.ts` - Error tracking setup
- `components/shared/ErrorBoundary.tsx` - React error boundary
- `app/error.tsx` - Next.js error page

**Requirements:**
- Integrate Sentry or similar error tracking
- User-friendly error messages
- Retry logic for failed requests
- Toast notifications for errors
- Offline detection and messaging

#### Task 11.3: Testing Setup
**Files to create:**
- `__tests__/lib/voice/voiceParser.test.ts` - Voice parsing tests
- `__tests__/lib/firebase/medications.test.ts` - Medication logic tests
- `__tests__/components/care/MedicationForm.test.tsx` - Component tests

**Requirements:**
- Jest + React Testing Library setup
- Unit tests for critical utilities
- Integration tests for API routes
- E2E tests for critical flows (Playwright)

### Phase 12: Polish & Launch Prep (Week 12)

**Goal**: Final touches, documentation, and deployment

#### Task 12.1: UI/UX Polish
- Consistent spacing and typography
- Smooth animations and transitions
- Mobile responsiveness (all screen sizes)
- Accessibility (ARIA labels, keyboard navigation)
- Loading states for all async operations
- Empty states with helpful CTAs

#### Task 12.2: Documentation
**Files to create:**
- `README.md` - Project overview and setup
- `DEPLOYMENT.md` - Deployment instructions
- `API.md` - API documentation (if exposing APIs)
- `CONTRIBUTING.md` - Contribution guidelines (if open source)

**User Documentation:**
- Help center (in-app or separate site)
- Video tutorials (recording demos)
- FAQ section
- Privacy policy
- Terms of service

#### Task 12.3: Pre-Launch Checklist
- [ ] All features tested on staging
- [ ] Stripe live mode configured
- [ ] Firebase security rules reviewed
- [ ] Environment variables set on Vercel
- [ ] Domain configured (custom domain)
- [ ] SSL certificate active
- [ ] Monitoring and alerts set up
- [ ] Backup strategy in place
- [ ] Support email/system ready
- [ ] Analytics tracking (Google Analytics, Mixpanel)
- [ ] SEO optimization (meta tags, sitemap)

## Code Quality Standards

### File Organization
- Max 600 lines per file
- Single responsibility principle
- Clear naming conventions
- Group related functions

### TypeScript Standards
```typescript
// ✅ Good: Explicit types
interface User {
  id: string;
  email: string;
  groups: GroupMembership[];
}

async function getUser(userId: string): Promise<User> {
  // ...
}

// ❌ Bad: Any types
async function getUser(userId): Promise<any> {
  // ...
}
```

### React Best Practices
- Use functional components
- Custom hooks for reusable logic
- Proper dependency arrays in useEffect
- Error boundaries for error handling
- Loading and error states for async data

### Firestore Best Practices
- Use compound indexes for complex queries
- Paginate large lists (limit + startAfter)
- Batch writes for multiple operations
- Use transactions for critical updates
- Security rules for all collections

### Security Checklist
- [ ] All API routes authenticated
- [ ] Firestore security rules tested
- [ ] User input sanitized
- [ ] Rate limiting on sensitive endpoints
- [ ] CORS configured correctly
- [ ] Environment variables never exposed
- [ ] Phone numbers hashed consistently

## Testing Strategy

### Unit Tests
- Utility functions (phone validation, date formatting)
- Voice parsing logic
- AI prompt generation
- Permission checking

### Integration Tests
- API routes (auth, payments, notifications)
- Firebase operations (CRUD)
- Stripe webhook handling

### E2E Tests (Critical Flows)
1. **New User Signup**
   - Enter email/phone → Verify OTP → Create profile → Start trial

2. **Add Medication**
   - Navigate to Medications → Add new → Fill form → Save

3. **Voice Log Dose**
   - Click voice button → Record → Confirm → Verify saved

4. **Upgrade Subscription**
   - Navigate to Upgrade → Select plan → Checkout → Verify active

## Deployment Guide

### Environment Variables (Vercel)
```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Google Cloud (Speech-to-Text)
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_API_KEY=

# Google AI (Gemini)
GEMINI_API_KEY=

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Cloudflare
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# App
NEXT_PUBLIC_APP_URL=https://myguide.health
NEXT_PUBLIC_APP_NAME=myguide.health
```

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add STRIPE_SECRET_KEY
```

### Firebase Setup
1. Create new Firebase project (separate from mobile app)
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Deploy security rules: `firebase deploy --only firestore:rules`
5. Enable Storage for file uploads
6. Set up Firebase Functions for cron jobs (AI summaries, notifications)

### Post-Deployment
- Test payment flow in Stripe live mode
- Verify SMS notifications working
- Check AI summaries generating correctly
- Monitor error logs in Sentry
- Set up uptime monitoring (Uptime Robot, Pingdom)

## Success Metrics

### User Engagement
- Daily active users (DAU)
- Medication logging frequency
- Voice input usage rate
- Group collaboration metrics (multi-user activity)

### Subscription Metrics
- Trial-to-paid conversion rate (target: 20%+)
- Churn rate (target: <5% monthly)
- Average revenue per user (ARPU)
- Agency tier adoption rate

### Technical Metrics
- Page load time (target: <2s)
- API response time (target: <500ms)
- Error rate (target: <1%)
- Uptime (target: 99.9%)

## Future Enhancements (Post-Launch)

1. **Mobile App Parity**
   - Progressive Web App (PWA)
   - Push notifications (web)
   - Offline mode

2. **Advanced AI Features**
   - Natural language queries ("Show me John's medications")
   - Predictive alerts (early detection of patterns)
   - Custom AI insights per elder

3. **Integrations**
   - Apple Health export
   - Google Fit export
   - Electronic Health Records (EHR) integration
   - Pharmacy integrations

4. **Enterprise Features**
   - White-label solution
   - SSO (Single Sign-On)
   - Custom branding
   - API for third-party integrations

5. **Internationalization**
   - Multi-language support
   - International phone numbers
   - Currency localization

---

## Important Reminders

1. **Keep it simple** - Don't over-engineer
2. **Security first** - Never expose sensitive data
3. **User experience** - Prioritize speed and clarity
4. **Mobile responsive** - Most caregivers use mobile
5. **Accessibility** - WCAG 2.1 AA compliance
6. **No medical advice** - AI is informational only
7. **Privacy** - HIPAA awareness (though not required)
8. **Scalability** - Design for growth (1000+ agencies)

Start with Phase 1 and build incrementally. Test thoroughly at each phase before moving forward.
