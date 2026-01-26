---
name: skill-elder-detail-cards
description: Elder detail cards and end-of-day reports card for the agency caregiver detail view. Use when implementing elder assignment cards, member email display, PDF report status cards, or the caregiver-to-elder relationship view. Used by super admin when viewing a specific caregiver's assignments.
---

## Objective

Build the elder detail cards and end-of-day reports card shown in the agency caregiver detail view. When a super admin taps on a caregiver, they see that caregiver's assigned elders with full status, member emails, and PDF report information.

## Constraints

- DO NOT modify Firestore rules or create new collections
- MUST read from existing `elders`, `caregiver_assignments`, `medication_logs`, `reportRecipients` data
- MUST use existing `elder.reportRecipients[]` field for member emails
- MUST read from `mail` collection for last-sent report status (Firebase Trigger Email extension)
- MUST use Lucide React icons, shadcn/ui Card component, Tailwind classes
- Only visible to super admin (agency owner) viewing a specific caregiver
- Time displays use formatTimeDistance() — NEVER raw minutes

## Files to Read First

- `src/types/index.ts` — Elder interface with reportRecipients field
- `src/app/dashboard/caregivers/page.tsx` — Existing caregiver list
- `src/hooks/useElders.ts` — If exists, elder data fetching
- `src/lib/firebase/firestore.ts` — Firestore query patterns
- `functions/src/index.ts` — Search for sendDailyFamilyNotes to understand mail collection structure

## Component Design

### ElderDetailCard

```
┌─────────────────────────────────────────┐
│  [Avatar circle]  Martha Williams       │
│                   86 years old    [●]   │  ← Active indicator (green dot)
│                                         │
│  Tasks: 3 remaining · 5 completed      │
│  Meds: 4/6 logged │ Meals: 2/3        │
│                                         │
│  Member Emails:                         │
│  · john.smith@email.com                 │
│  · mary.williams@email.com              │
│                                         │
│  [View Care Details →]                  │
└─────────────────────────────────────────┘
```

### EndOfDayReportsCard

```
┌─────────────────────────────────────────┐
│  [FileCheck icon]  End of Day Reports   │
│                                         │
│  Auto-sent daily at 7 PM PST to        │
│  member emails listed above.            │
│                                         │
│  Last sent: Jan 22, 2026 · 7:02 PM     │
│  Status: ✓ Delivered (2 recipients)    │
│                                         │
│  Next report: Today at 7:00 PM         │
└─────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Create ElderDetailCard Component

Create `src/components/agency/ElderDetailCard.tsx`:

```typescript
'use client';

interface ElderDetailCardProps {
  elder: Elder;
  taskStats: {
    remaining: number;
    completed: number;
    medsLogged: number;
    medsTotal: number;
    mealsLogged: number;
    mealsTotal: number;
  };
  isActive?: boolean;  // Currently selected elder for this caregiver
  onViewDetails?: (elderId: string) => void;
}

// Display:
// - Avatar: first letter of name in colored circle (40px)
// - Name: 16px semibold
// - Age: calculated from elder.dateOfBirth, "~86 years old"
// - Active indicator: green dot (8px) top-right if isActive
// - Task stats: two lines showing completion
// - Member emails: from elder.reportRecipients[].email
// - "View Care Details" link → /dashboard/daily-care?elderId={id}
```

### Step 2: Create EndOfDayReportsCard Component

Create `src/components/agency/EndOfDayReportsCard.tsx`:

```typescript
'use client';

interface EndOfDayReportsCardProps {
  elders: Elder[];  // All elders for this caregiver (to get recipient emails)
  caregiverId: string;
}

// Data fetching:
// Query `mail` collection for latest document where:
//   - to includes any of the reportRecipients emails
//   - createdAt is within last 24 hours
//   - template.name matches daily report template

// Display:
// - Green-themed card (bg-green-50, border-green-200)
// - FileCheck icon (green)
// - Title: "End of Day Reports"
// - Subtitle: "Auto-sent daily at 7 PM PST to member emails listed above."
// - Last sent: timestamp from mail collection
// - Status: "Delivered" (if mail.delivery.state === 'SUCCESS'), "Pending", "Failed"
// - Recipient count: total unique emails across all elders
// - Next report: "Today at 7:00 PM" or "Tomorrow at 7:00 PM" (based on current time)
```

### Step 3: Create CaregiverDetailView (if not exists)

Create or modify `src/components/agency/CaregiverDetailView.tsx`:

```typescript
Purpose: Super admin's view when they tap a caregiver from the team list

Layout:
1. Caregiver header (name, avatar, shift time)
2. "Your Elders" section heading
3. ElderDetailCard × 3 (for each assigned elder)
4. EndOfDayReportsCard (below elder cards)
5. VoiceInputArea (for super admin to dictate notes about this caregiver)
6. Quick action chips (specific to this context)

Data flow:
- caregiverId from route params or navigation state
- Fetch caregiver_assignments where caregiverId matches
- Fetch elder details for each assignment
- Fetch today's medication_logs for each elder
- Fetch latest mail document for report status
```

### Step 4: Calculate Task Stats

```typescript
function getElderTaskStats(elderId: string, medications: Medication[], logs: MedicationLog[]): TaskStats {
  const elderMeds = medications.filter(m => m.elderId === elderId);
  const todayLogs = logs.filter(l =>
    l.elderId === elderId &&
    isToday(l.loggedAt)
  );

  const medsTotal = elderMeds.reduce((sum, m) => sum + (m.frequency.times?.length || 1), 0);
  const medsLogged = todayLogs.length;

  // Meals: check diet_entries for today
  // const mealsLogged = ... (from existing diet logging)

  return {
    remaining: medsTotal - medsLogged,
    completed: medsLogged,
    medsLogged,
    medsTotal,
    mealsLogged: mealsLogged || 0,
    mealsTotal: 3, // breakfast, lunch, dinner
  };
}
```

### Step 5: Report Status Query

```typescript
// Query the mail collection for latest report
async function getLastReportStatus(recipientEmails: string[]) {
  const mailRef = collection(db, 'mail');
  const q = query(
    mailRef,
    where('to', 'array-contains-any', recipientEmails),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const mailDoc = snapshot.docs[0].data();
  return {
    sentAt: mailDoc.createdAt?.toDate(),
    status: mailDoc.delivery?.state || 'PENDING',
    recipientCount: mailDoc.to?.length || 0,
  };
}
```

## Accessibility

- Elder cards: `role="article"`, `aria-label="Elder: {name}, {remaining} tasks remaining"`
- Active indicator: `aria-label="Currently active elder"` (not just a visual dot)
- Member emails: not interactive (informational display only)
- View Details link: proper anchor with descriptive text
- Report card: `aria-label="End of day report status"`

## Testing Requirements

- Elder cards show correct name, age, task counts
- Member emails display from elder.reportRecipients
- Active elder has green indicator
- Completed elder has checkmark
- Report card shows correct last-sent time
- Report status matches mail collection data
- "View Care Details" navigates correctly
- Empty state: "No elders assigned" if caregiver has no assignments
- Run: `npm test -- --testPathPattern="elder|Elder|report|Report"`
