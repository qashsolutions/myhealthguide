# MyHealthGuide PWA - Agency Owner Dashboard & Missing Gaps Implementation

> **Purpose**: This prompt handles the Agency Owner Dashboard (HIGH priority) and all identified gaps from the SVG mockup comparison. Run this AFTER the main UI/UX overhaul phases (Jan22_UpdatedPrompt_v2.md) are complete — specifically after Phase 3 (Guided Home) is done.
>
> **CRITICAL**: Same rules apply — plan first, present table, wait for approval.

***ITERATE AND PRODUCTION READY, FLAGSHIP QUALITY***
**YOU HAVE ACCESS TO FIRESTORE FROM THE JSON FILE IN /scripts folder**
**all variables are set correctly in vercel**

---

## WHY THIS PROMPT EXISTS

Claude Code identified 7 gaps between our SVG mockups and the current implementation. These are features the mockups show but the app doesn't have yet. This prompt addresses ALL of them in priority order.

### Gaps Identified

| # | Gap | Priority | Skill File |
|---|-----|----------|-----------|
| A | Agency Owner Dashboard (completely new screen) | HIGH | skill-agency-owner-dashboard |
| B | Voice Input Area on home screen | MEDIUM | skill-voice-input-area |
| C | Quick Action Chips | MEDIUM | skill-quick-action-chips |
| D | Greeting with shift context | LOW | (included in skill-agency-owner-dashboard) |
| E | Elder Detail Cards (caregiver-detail view) | LOW | skill-elder-detail-cards |
| F | End of Day Reports card | LOW | (included in skill-elder-detail-cards) |
| G | "Team" nav item for agency owner | LOW | (included in skill-agency-owner-dashboard) |

---

## GUARDRAILS (Same as Main Prompt)

```
DO NOT MODIFY:
- Authentication logic, API routes, Payment flows, Firestore rules
- Cloud Functions, Service worker, Database schemas, Env variables

DO NOT:
- Create new Firestore collections
- Install new UI libraries
- Display raw minutes (use formatTimeDistance() always)
- Put avatar or bell in the header (header = logo text ONLY)
- Use emojis (use Lucide React icons)
- Remove existing features (hide in More menu)
- Break ANY existing working functionality — this includes but is not limited to:
  · Login/logout/signup flows
  · Stripe subscription checkout, billing, cancellation, refund
  · Elder CRUD (create, read, update, delete)
  · Medication/supplement CRUD and logging
  · Daily care tab functionality (medications, supplements, diet, activity)
  · PDF report generation and email delivery (7/8/9 PM)
  · FCM push notification registration and delivery
  · Voice command recognition and routing
  · AI chat (Gemini/Vertex/Claude) functionality
  · Caregiver onboarding, assignment, scheduling
  · Safety alerts (drug interactions, incidents, screening)
  · Notes creation and sharing
  · Data export, QR code scanning
  · Offline PWA behavior (service worker caching, sync)
  · Role-based access control (all 4 roles)
  · Responsive rendering on all breakpoints
  · The GuidedHome screen for family plan users (your changes are ADDITIVE for agency owner only)

GOLDEN RULE: If you didn't build it in THIS session, don't break it.
Before modifying ANY existing file, understand what it currently does and ensure
your changes preserve ALL its existing behavior. When adding conditional rendering
(e.g., agency owner vs family plan), the ELSE branch must behave EXACTLY as before.

YOU MUST:
- READ the relevant SKILL.md before each gap
- Present plan table before any code
- Wait for approval
- Test after each gap is implemented
- Use existing hooks, contexts, and components
```

---

## GAP A: AGENCY OWNER DASHBOARD (HIGH PRIORITY)

### SKILL FILE TO READ FIRST
```
cat .claude/skills/skill-agency-owner-dashboard/SKILL.md
```

### What to Build

This is a COMPLETELY DIFFERENT home screen for the Super Admin (agency owner) role. When `subscription.plan === 'multi-agency' && user.role === 'super_admin'`, the dashboard page renders `<AgencyOwnerDashboard />` instead of `<GuidedHome />`.

### Screen Layout (Mobile - 390px)

```
┌─────────────────────────────────────────┐
│ MyHealthGuide                           │
│                                         │
│  Hi Venkata                             │
│  SunnyCare Agency                       │  ← Agency name from Firestore
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ 10      │ │ 30      │ │ 3       │  │  ← Quick Stats
│  │Caregivers│ │ Elders  │ │ Pending │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│  Needs Attention                        │
│  ┌───────────────────────────────────┐  │
│  │ [!] 2 slots awaiting response  > │  │  ← Alert cards
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ [!] 1 elder needs assignment    > │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Manage                                 │
│  ┌────────┐ ┌────────┐                 │
│  │ Assign │ │ Send   │                 │  ← Action grid (2x2)
│  │ Elder  │ │ Slots  │                 │
│  ├────────┤ ├────────┤                 │
│  │Onboard │ │ Create │                 │
│  │Caregvr │ │Schedule│                 │
│  └────────┘ └────────┘                 │
│                                         │
│  Today's Shifts                         │
│  ┌───────────────────────────────────┐  │
│  │ Sarah J. │ Martha, John │ Active  │  │
│  │ 7AM-3PM  │              │ [green] │  │
│  ├───────────────────────────────────┤  │
│  │ Mike T.  │ Betty, Sam   │ Upcoming│  │
│  │ 3PM-11PM │              │ [gray]  │  │
│  └───────────────────────────────────┘  │
│                                         │
│ [Home] [Team] [Schedule] [🔔] [More]   │  ← "Team" not "Staff"
└─────────────────────────────────────────┘
```

### Components to Build

**1. AgencyOwnerDashboard** (`src/components/dashboard/AgencyOwnerDashboard.tsx`)
- Full page component, replaces GuidedHome for super admin
- Sections: Greeting → Stats → Needs Attention → Manage → Today's Shifts

**2. AgencyQuickStats** (`src/components/agency/AgencyQuickStats.tsx`)
- 3 stat cards in a row: Caregivers (count), Elders (count), Pending Slots (count)
- Data from: `caregiver_assignments`, `elders`, `scheduledShifts` (status=pending)
- Cards use existing shadcn/ui Card component

**3. NeedsAttentionList** (`src/components/agency/NeedsAttentionList.tsx`)
- Scans for: uncovered shifts, unassigned elders, low compliance, caregiver absences
- Each item: icon + description + chevron (tap to navigate)
- Max 3 items shown, "View all" link if more
- Empty state: green checkmark "All good!"

**4. ManageActionGrid** (`src/components/agency/ManageActionGrid.tsx`)
- 2x2 grid of action cards
- Each: icon + label + tap action
- Items:
  1. Assign Elder → navigate to elder assignment flow
  2. Send Slots → navigate to slot scheduling
  3. Onboard Caregiver → navigate to caregiver invite
  4. Create Schedule → navigate to schedule builder

**5. TodaysShiftsList** (`src/components/agency/TodaysShiftsList.tsx`)
- Lists today's shifts with: caregiver name, assigned elders, time range, status badge
- Status: Active (green), Upcoming (gray), Completed (blue), Missed (red)
- Tap row → navigate to caregiver detail
- Data from: `scheduledShifts` (where date = today)

### Agency Owner Bottom Nav (Gap G addressed here)
```typescript
// Super Admin bottom nav items:
[
  { icon: House, label: 'Home', href: '/dashboard' },
  { icon: Users, label: 'Team', href: '/dashboard/caregivers' },  // "Team" NOT "Staff"
  { icon: Calendar, label: 'Schedule', href: '/dashboard/scheduling' },
  { icon: Bell, label: 'Alerts', href: '/dashboard/alerts', badge: unreadCount },  // Bell with count
  { icon: Menu, label: 'More' },
]
```

### Agency Owner Icon Rail (Desktop)
```
┌──┐
│🏠│  Home
│👥│  Team (caregivers)
│📅│  Schedule
│❤️│  Elders
│📊│  Reports
│⏰│  Timesheets
│  │  ← spacer
│🔔│  Bell (with badge)
│VC│  Avatar
└──┘
```

### Conditional Rendering
```typescript
// In src/app/dashboard/page.tsx:
import { AgencyOwnerDashboard } from '@/components/dashboard/AgencyOwnerDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const { subscription, isMultiAgency } = useSubscription();
  const isSuperAdmin = user?.role === 'super_admin';

  if (isMultiAgency && isSuperAdmin) {
    return <AgencyOwnerDashboard />;
  }

  if (isMultiAgency) {
    return <GuidedHomeWithElderTabs />;  // Agency caregiver
  }

  return <GuidedHome />;  // Family plan
}
```

---

## GAP B: VOICE INPUT AREA (MEDIUM PRIORITY)

### SKILL FILE TO READ FIRST
```
cat .claude/skills/skill-voice-input-area/SKILL.md
```

### What to Build

**VoiceInputArea** (`src/components/dashboard/VoiceInputArea.tsx`)

```
┌─────────────────────────────────────────────┐
│ [🎤]  Say or type what happened...          │
└─────────────────────────────────────────────┘
```

- Rounded input bar on the home screen (below progress bar, above chips)
- Left side: microphone icon button
- Right side: text input with placeholder "Say or type what happened..."
- Tap mic: activates Web Speech API (existing voice system)
- Type text: routes through existing `processVoiceCommand()`
- States:
  - Idle: gray mic, placeholder text
  - Listening: pulsing blue mic, "Listening..."
  - Processing: spinner, transcription text
  - Error: red mic, "Tap to try again"
- DO NOT rebuild voice logic — wire into existing `src/lib/voice/voiceNavigation.ts`
- This appears on BOTH family caregiver and agency caregiver home screens (NOT agency owner)

---

## GAP C: QUICK ACTION CHIPS (MEDIUM PRIORITY)

### SKILL FILE TO READ FIRST
```
cat .claude/skills/skill-quick-action-chips/SKILL.md
```

### What to Build

**SuggestionChips** (`src/components/dashboard/SuggestionChips.tsx`)

```
[Log medications] [Log meal] [Supplements] [Add note] [Shift handoff] [Ask AI]
```

- Horizontal scrollable row of pill-shaped buttons
- Each chip: Lucide icon (16px) + label text (14px)
- Tap chip = navigate to that action OR pre-fill voice input
- Contextual chips change based on:
  - Time of day (morning = breakfast, evening = dinner)
  - Role (agency caregiver gets "Shift handoff", family gets "Ask AI")
  - Task state (if meds overdue, "Log medications" chip is highlighted/first)
- Max visible: 4-5 on mobile (scroll for more), 6 on desktop (wrapped)
- Height: 36px, rounded-full, border with subtle fill on tap
- NOT shown on agency owner dashboard (they get the Manage grid instead)

---

## GAP D: GREETING WITH SHIFT CONTEXT (LOW PRIORITY)

### Included in Agency Caregiver Home

Modify `HomeGreeting` component to show shift context for agency caregivers:

```typescript
// For agency caregivers:
Greeting: "Hi Maria"
Subtitle: "Morning Shift · 7:00 AM – 3:00 PM"  // From shiftSessions

// For family caregivers:
Greeting: "Good morning, Maria"
Subtitle: "Caring for Rod Laver"

// For agency owner:
Greeting: "Hi Venkata"
Subtitle: "SunnyCare Agency"  // Agency name
```

Data source: `shiftSessions` collection (existing) — find today's active shift for this caregiver.

---

## GAP E: ELDER DETAIL CARDS (LOW PRIORITY)

### SKILL FILE TO READ FIRST
```
cat .claude/skills/skill-elder-detail-cards/SKILL.md
```

### What to Build

**ElderDetailCard** (`src/components/agency/ElderDetailCard.tsx`)

For the agency caregiver detail view (when super admin taps a caregiver):

```
┌─────────────────────────────────────────┐
│  [Avatar]  Martha Williams              │
│            86 years old                 │
│            Status: 3 tasks remaining    │
│                                         │
│  Member Emails (PDF report recipients): │
│  · john@email.com                       │
│  · mary@email.com                       │
│                                         │
│  [View Details]                         │
└─────────────────────────────────────────┘
```

- Shows: avatar, name, age, task status, member emails
- Member emails: from `elder.reportRecipients[]` (existing field)
- "Active" badge if this is the caregiver's currently selected elder
- Checkmark badge if all tasks completed for this elder today
- Used inside `CaregiverDetailView` (agency owner viewing a caregiver's assignments)

---

## GAP F: END OF DAY REPORTS CARD (LOW PRIORITY)

### Included in Elder Detail View

**EndOfDayReportsCard** (`src/components/agency/EndOfDayReportsCard.tsx`)

```
┌─────────────────────────────────────────┐
│  [FileText icon]  End of Day Reports    │
│                                         │
│  Auto-sent daily at 7 PM to:           │
│  · john@email.com                       │
│  · mary@email.com                       │
│                                         │
│  Last sent: Jan 22, 2026 at 7:02 PM   │
│  Status: ✓ Delivered                   │
└─────────────────────────────────────────┘
```

- Green-themed card showing PDF report status
- Data: reads from `mail` collection (existing — Firebase Trigger Email)
- Shows recipient emails from `elder.reportRecipients[]`
- Shows last successful send timestamp
- Status: Delivered, Pending, Failed
- Placed below elder detail cards in the caregiver detail view
- INFORMATIONAL ONLY — no actions needed (reports are automatic at 7/8/9 PM)

---

## GAP G: "TEAM" NAV ITEM FOR OWNER (LOW PRIORITY)

### Addressed in Gap A

The agency owner's bottom nav uses "Team" (Users icon) instead of "Care" or "Ask AI":
```
[Home] [Team] [Schedule] [🔔] [More]
```

This is handled by the role-specific `getBottomNavItems()` function in the layout system. Already specified in Gap A above.

---

## IMPLEMENTATION ORDER

```
1. Gap C: Quick Action Chips (foundation for home screen, needed by all roles)
2. Gap B: Voice Input Area (wires into existing voice system)
3. Gap D: Greeting with Shift Context (small change to existing HomeGreeting)
4. Gap A: Agency Owner Dashboard (biggest piece, needs chips/voice done first)
5. Gap E: Elder Detail Cards (used by agency owner's caregiver detail view)
6. Gap F: End of Day Reports Card (used inside elder detail view)
7. Gap G: Already covered by Gap A's bottom nav spec
```

---

## PLAN TABLE FORMAT (Same as Main Prompt)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GAP [X]: [Gap Name]                                                         │
│ SKILL FILE: .claude/skills/skill-[name]/SKILL.md                           │
│ WHY: [1-line reason]                                                        │
├──────┬──────────────────────────┬────────────────┬──────────┬───────────────┤
│  #   │ Action                   │ File           │ Type     │ Risk Level    │
├──────┼──────────────────────────┼────────────────┼──────────┼───────────────┤
│  1   │ ...                      │ ...            │ NEW      │ LOW           │
├──────┴──────────────────────────┴────────────────┴──────────┴───────────────┤
│ NEW PACKAGES: none                                                          │
│ TESTS AFFECTED: ...                                                         │
│ ROLLBACK: git revert                                                        │
│ SKILL FILE READ: YES/NO                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FINAL VERIFICATION

After all gaps implemented:

```
┌──────┬──────────────────────────────────────────────────┬──────────┐
│  #   │ Verification Item                                │ Status   │
├──────┼──────────────────────────────────────────────────┼──────────┤
│  1   │ Agency owner sees AgencyOwnerDashboard           │ PASS/FAIL│
│  2   │ Quick Stats show correct caregiver/elder counts  │ PASS/FAIL│
│  3   │ Needs Attention shows real issues                │ PASS/FAIL│
│  4   │ Manage grid navigates to correct pages           │ PASS/FAIL│
│  5   │ Today's Shifts shows correct shift data          │ PASS/FAIL│
│  6   │ Owner bottom nav has "Team" not "Staff"          │ PASS/FAIL│
│  7   │ Voice input area works on caregiver home         │ PASS/FAIL│
│  8   │ Quick action chips are contextual                │ PASS/FAIL│
│  9   │ Agency caregiver greeting shows shift time       │ PASS/FAIL│
│ 10   │ Elder detail cards show member emails            │ PASS/FAIL│
│ 11   │ End of Day Reports card shows last sent time     │ PASS/FAIL│
│ 12   │ Family plan user unaffected by all changes       │ PASS/FAIL│
│ 13   │ All 230+ existing tests still pass              │ PASS/FAIL│
│ 14   │ Build succeeds                                   │ PASS/FAIL│
│ 15   │ Responsive at all 3 breakpoints                  │ PASS/FAIL│
└──────┴──────────────────────────────────────────────────┴──────────┘
```

---

## HOW TO START

```
1. Confirm Phase 3 (Guided Home) from Jan22_UpdatedPrompt_v2.md is COMPLETE
2. Read this entire document
3. Start with Gap C (Quick Action Chips):
   → Read: .claude/skills/skill-quick-action-chips/SKILL.md
   → Present plan table
   → Wait for approval
4. Proceed through Gaps B → D → A → E → F in order
5. Present final verification checklist
```

**Remember: The agency owner manages 10 caregivers and 30 elders. Their dashboard is an OVERVIEW — not a place to do caregiving tasks. Show them WHAT NEEDS ATTENTION and give them QUICK ACTIONS to manage their team.**
