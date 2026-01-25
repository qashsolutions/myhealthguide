# MyHealthGuide PWA - UI/UX Overhaul Implementation Prompt

> **Purpose**: Provide this prompt to Claude Code in terminal to guide the complete UI/UX overhaul of the MyHealthGuide PWA. Share the SVG mockups from `/docs/mockups/` alongside this prompt.
>
> **CRITICAL**: Execute in PHASES. Do NOT skip ahead. Each phase MUST be planned, presented as a table, and approved before any code changes.
***ITERATE AND PRODUCTION READY, FLAGSHIP QUALITY***
**YOU HAVE ACCESS TO FIRESTORE FROM THE JSON FILE IN /scripts folder***
**you have access to github and vercel**
**all variables are set correctly in vercel***
**YOU HAVE ACCESS TO STRIPE MCP - TEST ENVIONMENT**
---

## CHUNK 0: WHY WE ARE DOING THIS (Critical Context)

### The Problem

MyHealthGuide is a production PWA for elder care. Our primary user is a **65-year-old rural caregiver** — often a family member or agency employee with **limited tech skills** who may have never used a smartphone app before.

Our current UI has:
- A 256px sidebar with 8+ navigation items across 5 sections
- A header with 7+ icons
- A dashboard with stat cards, grids, and multi-tab layouts
- 42+ pages of features scattered across a complex navigation tree

**This overwhelms our target user.** They don't need a dashboard — they need to know: "What do I do RIGHT NOW for my loved one?"

### The Inspiration

We studied how Claude.ai, ChatGPT, and Gemini handle complexity:
- **Claude.ai** has a clean main screen with just a text input and suggestion chips. ALL features hide behind a narrow icon rail. The UI breathes. One action dominates. This works for first-time users AND power users.
- **Claude Code terminal** auto-suggests the next logical action after you complete something (e.g., after writing code, it suggests "run tests").

**We want that same pattern** — but for caregiving tasks instead of AI prompts.

### The Goal

Transform the app from a "complex dashboard for tech-savvy users" into a "guided assistant that tells you what to do next" — while keeping ALL existing features accessible behind menus.

**Before**: Open app → See 15+ items → Feel overwhelmed → Close app
**After**: Open app → See ONE priority task → Tap to complete → Get next suggestion → Feel accomplished

### Who Benefits

| User | Current Pain | New Experience |
|------|-------------|---------------|
| Family caregiver (65yo) | "Too many buttons, I don't know where to start" | "It tells me Mom's medication is due NOW - just tap" |
| Agency caregiver | "Switching between 3 elders is confusing" | "Tabs show each elder, priority card shows what's urgent" |
| Agency owner | "I can't see who's on shift quickly" | "Dashboard shows attention items + staff status" |

### What Does NOT Change

- All existing features remain (hidden in "More" menu, not deleted)
- All backend systems untouched (Firestore, Cloud Functions, Auth, Payments)
- All 230+ tests must continue passing
- The app stays a PWA (same responsive codebase, no native app)
- End-of-day PDF reports keep working (7/8/9 PM triggers)
- FCM push notifications keep working

---

## CHUNK 0.5: HOW TO USE THE SKILL.MD FILES (Implementation Protocol)

### What Are Skill Files?

We have created 8 detailed SKILL.md files in `.claude/skills/`. Each one is a **focused implementation guide** for a specific part of this overhaul. They contain:

1. **Objective** — What this skill builds and why
2. **Constraints** — Hard boundaries (what NOT to touch)
3. **Files to Read First** — Mandatory reading before any code changes
4. **Component Designs** — Visual ASCII layouts, props, states
5. **Implementation Steps** — Ordered steps with code patterns
6. **Testing Requirements** — What to test and how

### WHY Skill Files?

This overhaul is too large for one prompt. Skill files:
- **Prevent context loss** — each skill is self-contained with all needed info
- **Enforce order** — Phase 1 must complete before Phase 2 (dependencies)
- **Reduce errors** — each skill explicitly lists what NOT to modify
- **Enable incremental work** — finish one skill, commit, move to next
- **Act as living documentation** — future developers understand WHY each component exists

### HOW To Use Them (MANDATORY)

**For EVERY phase, you MUST follow this exact workflow:**

```
1. READ the relevant SKILL.md file(s) for that phase
   → Run: cat .claude/skills/skill-[name]/SKILL.md
   → Or invoke: /skill-[name]

2. READ all files listed in "Files to Read First" section of the skill
   → Understand existing patterns, interfaces, hooks before writing new code

3. PLAN your implementation in the required table format (see Chunk 2)
   → List every file you'll create or modify
   → List any new packages needed
   → List affected tests

4. PRESENT the plan table — STOP and WAIT for approval

5. IMPLEMENT only after approval
   → Follow the Implementation Steps in the SKILL.md exactly
   → Use the component designs as your spec
   → Reuse existing patterns from the "Files to Read First"

6. TEST using the commands in "Testing Requirements"
   → If tests fail, fix before moving on
   → Run full build: npm run build

7. COMMIT with a descriptive message for that phase
   → e.g., "feat: Phase 1 - replace sidebar with bottom nav and icon rail"

8. MOVE to next phase only after tests pass and commit succeeds
```

### Skill File Locations (Reference)

```
.claude/skills/
├── skill-layout-system/SKILL.md        ← Phase 1: Bottom Nav + Icon Rail + Header
├── skill-task-prioritization/SKILL.md  ← Phase 2: Due/Overdue/Upcoming Engine
├── skill-priority-card/SKILL.md        ← Phase 3: Single-Focus DUE NOW Card
├── skill-guided-home/SKILL.md          ← Phase 3: Home Screen Assembly
├── skill-more-menu/SKILL.md            ← Phase 4: Hidden Features Drawer
├── skill-auto-suggest/SKILL.md         ← Phase 4: Next Action Recommendations
├── skill-voice-integration/SKILL.md    ← Phase 4: Voice Into New Layout
└── skill-agency-views/SKILL.md         ← Phase 5: Agency-Specific Screens
```

### Skill Dependencies (Cannot Skip Ahead)

```
Phase 1: skill-layout-system
    ↓ (provides BottomNav, IconRail, MinimalHeader)
Phase 2: skill-task-prioritization
    ↓ (provides useTaskPriority hook)
Phase 3: skill-priority-card + skill-guided-home
    ↓ (provides PriorityCard, GuidedHome, SuggestionChips)
Phase 4: skill-more-menu + skill-auto-suggest + skill-voice-integration
    ↓ (provides MoreMenu, SuggestionBanner, VoiceInputArea)
Phase 5: skill-agency-views
    (provides AgencyDashboard, ElderTabSelector, ShiftInfoBar)
```

**If a skill references a component from a previous phase and that component doesn't exist yet — STOP. Go back and complete the earlier phase first.**

---

## CHUNK 1: CONTEXT & GUARDRAILS

### What This App Is
- **MyHealthGuide** is a LIVE PRODUCTION Progressive Web App (PWA) for elder care management
- Built with: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Firebase (Auth/Firestore/Functions/FCM), Serwist (service worker)
- 3 subscription plans: Family Plan A ($8.99/mo), Family Plan B ($18.99/mo), Multi-Agency ($55/elder/mo)
- 4 user roles: Super Admin (agency owner), Caregiver Admin, Caregiver, Family Member (read-only)
- Target user: A 65-year-old rural caregiver with limited tech skills

### Design Inspiration: Claude.ai Layout Pattern
The new UI is inspired by how Claude.ai handles complexity:

**Claude.ai does this well:**
1. Clean, minimal main screen - just a text input and suggestion chips
2. Features hidden behind an icon rail (left side on desktop) - not scattered everywhere
3. Hovering/clicking a suggestion chip pre-fills the input area
4. No overwhelming dashboards, stat grids, or multi-section layouts on the home screen
5. One primary action dominates the viewport
6. "New chat" button is always accessible but not distracting
7. Previous conversations (history) tucked into a collapsible sidebar
8. The layout BREATHES - generous whitespace, nothing cluttered

**Apply to our app like this:**
- Claude.ai's text input → Our voice/text input bar for observations
- Claude.ai's suggestion chips → Our quick action chips (Log meds, Log meal, Add note)
- Claude.ai's icon rail (desktop) → Our 56px icon rail with nav icons
- Claude.ai's clean main area → Our priority card + greeting (ONE focus area)
- Claude.ai's sidebar history → Our "More" drawer with all hidden features
- Claude.ai's new chat button → Our "Start shift" or "New observation" button

**Claude Code terminal does this well:**
1. After completing an action, it auto-suggests what to do next
2. The suggestion is pre-populated — just press Enter to accept
3. It learns from patterns (if you always run tests after builds, it suggests that)

**Apply to our app like this:**
- After logging medication → suggest "Log breakfast too?" or "Next: Vitamin D"
- After adding a note → suggest "Back to home" or "Log evening meds"
- Pre-populated actions: one tap to execute, not a multi-step flow

### STRICT GUARDRAILS - DO NOT VIOLATE

```
DO NOT MODIFY:
- Authentication logic (src/lib/firebase/auth.ts)
- API route handlers (src/app/api/*)
- Payment/subscription flows (Stripe integration)
- Firestore security rules (firestore.rules)
- Cloud Functions (functions/src/index.ts)
- Service worker configuration (src/app/sw.ts, serwist.config.ts)
- Database queries or collection schemas
- Environment variable names
- Any existing TypeScript interfaces/types (you may ADD new ones)
- Firebase extensions configuration

DO NOT:
- Add new npm packages without listing them in your plan table first
- Create new Firestore collections (compute everything client-side)
- Change any variable names (elderId stays elderId, NOT lovedOneId)
- Remove any existing functionality (hide it, don't delete it)
- Break the 230+ existing tests
- Modify the daily family notes email system (7/8/9 PM triggers)
- Change FCM notification logic
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
  · Data export functionality
  · QR code scanning
  · Offline PWA behavior (service worker caching, sync)
  · Role-based access control (all 4 roles)
  · Responsive rendering on all breakpoints
  · Accessibility features (keyboard nav, screen reader, reduced motion)

GOLDEN RULE: If you didn't build it in THIS session, don't break it.
Before modifying ANY existing file, understand what it currently does and ensure
your changes preserve ALL its existing behavior. If unsure, ASK before modifying.

YOU MUST:
- READ the relevant SKILL.md before starting each phase
- Use existing shadcn/ui components wherever possible
- Use Lucide React icons (already installed) - NO emojis, NO icon libraries
- Follow existing code patterns (check how other components are structured)
- Keep "Elder" in code, show "Loved One" in user-facing text only
- Maintain full offline PWA capability
- Support responsive breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
- Run existing tests after each phase to verify nothing broke
```

---

## CHUNK 2: PLANNING PROTOCOL

### Before Writing ANY Code

For each phase, you MUST:

1. **Read** the SKILL.md file for that phase (see Chunk 0.5 for locations)
2. **Read** all files listed in the SKILL.md's "Files to Read First" section
3. **Plan** your changes in a structured table format
4. **Present** the plan table for approval
5. **Wait** for explicit "proceed" confirmation

### Plan Table Format (REQUIRED)

Present your plan EXACTLY like this for each phase:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE [N]: [Phase Name]                                                     │
│ SKILL FILE: .claude/skills/skill-[name]/SKILL.md                           │
│ WHY: [1-line reason this phase exists]                                      │
├──────┬──────────────────────────┬────────────────┬──────────┬───────────────┤
│  #   │ Action                   │ File           │ Type     │ Risk Level    │
├──────┼──────────────────────────┼────────────────┼──────────┼───────────────┤
│  1   │ Create BottomNav         │ src/comp/...   │ NEW      │ LOW           │
│  2   │ Create IconRail          │ src/comp/...   │ NEW      │ LOW           │
│  3   │ Modify dashboard layout  │ src/app/...    │ MODIFY   │ MEDIUM        │
│  4   │ Remove Sidebar import    │ src/app/...    │ MODIFY   │ LOW           │
├──────┴──────────────────────────┴────────────────┴──────────┴───────────────┤
│ NEW PACKAGES: none                                                          │
│ TESTS AFFECTED: layout.test.tsx (update), sidebar.test.tsx (remove)         │
│ ROLLBACK: git stash / revert to pre-phase-N commit                          │
│ SKILL FILE READ: YES/NO                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Risk Levels:**
- LOW = New file, no existing code touched
- MEDIUM = Modifying existing file, but not core logic
- HIGH = Touching layout/routing that affects multiple pages

---

## CHUNK 3: PHASE 1 - LAYOUT SYSTEM (Foundation)

### Goal
Replace the 256px sidebar + complex header with:
- **Mobile**: Bottom navigation bar (5 items max)
- **Desktop/Tablet**: 56px icon rail (left side)
- **Header**: Minimal (logo text only on left — NOTHING on the right. Bell moves to icon rail/bottom nav)

### IMPORTANT: Avatar, Bell & Settings Placement Rules
- The **notification bell** moves to the **icon rail** (desktop) or **bottom nav** (mobile) — NOT in the header
- The user avatar (initials circle, e.g. "VC") appears ONLY at the **bottom** of the icon rail (desktop) or as part of the "More" menu (mobile)
- **DO NOT** place the avatar in the top-right header — that's the old pattern we're removing
- **DO NOT** place the bell in the header — it belongs in the icon rail / bottom nav alongside other navigation icons
- **DO NOT** show a separate Settings/gear icon — it duplicates the avatar menu. The avatar IS the entry point to settings/profile/sign-out
- **DO NOT** show the "MG" app icon badge in the top-left of the icon rail — just show the logo text "MyHealthGuide" in the header
- The app name is **MyHealthGuide** (one word, no dots, no split). In UI: render as `<span class="font-bold">MyHealth</span><span class="font-light text-blue-600">Guide</span>`

### SKILL FILE TO READ FIRST
```
cat .claude/skills/skill-layout-system/SKILL.md
```
This contains the full component specs, responsive breakpoints, accessibility requirements, and implementation steps.

### What to Build

**1. BottomNav Component** (`src/components/navigation/BottomNav.tsx`)
- 5 items max: Home, Care, Voice (mic icon), Bell (with badge), More
- Active state: filled icon + label + primary color
- Inactive: outline icon + gray
- Bell shows red badge with unread count (same as current notification bell behavior)
- Height: 64px with safe area padding for notched phones
- Items change based on role (see skill-agency-views for role-specific items)
- Voice (center) button is 56px circle, raised above nav bar
- MUST include `pb-safe` for iOS PWA home screen

**2. IconRail Component** (`src/components/navigation/IconRail.tsx`)
- 56px wide, left-aligned, full height
- NO logo or "MG" badge at top — the header already shows the logo text
- Nav icons in TOP section (24px icons, 48px tap targets): Home, Care/Schedule, Reports, AI Chat, Alerts, More
- BOTTOM section (after flex-grow spacer):
  - **Bell icon (with red badge)** — just above avatar
  - **Avatar (initials circle)** — at the very bottom, opens profile/settings/sign-out
- NO separate settings/gear icon (the avatar IS the settings entry point)
- Tooltip on hover (desktop only)
- Active: primary background circle behind icon

**Icon Rail visual layout:**
```
┌──┐
│🏠│  ← Top: Primary nav
│❤️│
│📋│
│⭐│
│☰ │
│  │
│  │  ← flex-grow spacer
│  │
│🔔│  ← Bottom: Utility (bell + avatar)
│VC│
└──┘
```

**3. MinimalHeader Component** (`src/components/navigation/MinimalHeader.tsx`)
- Height: 48px (mobile), 56px (desktop)
- Contents: Logo text "MyHealthGuide" (left) — THAT'S IT. Nothing on the right.
- NO avatar in the header
- NO bell in the header (bell is in icon rail / bottom nav now)
- NO "MG" icon/badge
- NO search, theme toggle, accessibility button, or any other icons
- The header is ONLY the app name. Ultra-minimal. Just a brand anchor.
- On mobile: logo text only. On desktop: same but with left padding to account for icon rail

**4. Modify DashboardLayout** (`src/app/dashboard/layout.tsx`)
- Remove `<Sidebar>` import and rendering
- Remove old `<DashboardHeader>` import and rendering
- Add `<MinimalHeader>` at top
- Add `<BottomNav>` at bottom (mobile only, hidden lg+)
- Add `<IconRail>` at left (hidden below lg)
- Main content: full width mobile, `ml-14` on desktop (56px offset)
- Main content: `pb-16` on mobile (bottom nav offset)

### Visual Reference
Check mockup: `docs/mockups/v2-caregiver-home-mobile.svg` (bottom nav)
Check mockup: `docs/mockups/v2-desktop-tablet-view.svg` (icon rail + minimal header)

### Test After Phase 1
```bash
npm test -- --testPathPattern="layout|navigation|sidebar|header"
npm run build
```
If any test references old Sidebar/Header, update the test (not the component).

---

## CHUNK 4: PHASE 2 - TASK PRIORITIZATION ENGINE (Core Logic)

### Goal
Build a client-side engine that reads medication/supplement schedules and computes what's due NOW, what's OVERDUE, and what's UPCOMING.

### SKILL FILE TO READ FIRST
```
cat .claude/skills/skill-task-prioritization/SKILL.md
```
This contains the full priority algorithm, sorting rules, status thresholds, and data sources.

### What to Build

**1. useTaskPriority Hook** (`src/hooks/useTaskPriority.ts`)

```typescript
// Input: reads from existing Firestore collections:
// - medications (has frequency.times[] array like ["08:00", "14:00", "20:00"])
// - supplements (has frequency/schedule data)
// - medication_logs (today's logged doses)
// - supplement_logs (today's logged supplements)

// Output:
interface PrioritizedTask {
  id: string;
  type: 'medication' | 'supplement' | 'meal' | 'activity';
  name: string;
  elderId: string;
  elderName: string;
  scheduledTime: string; // "08:00"
  status: 'overdue' | 'due_now' | 'upcoming' | 'completed' | 'skipped';
  minutesUntilDue: number; // negative = overdue
  instructions?: string;
  priority: number; // lower = more urgent
}

function useTaskPriority(elderId?: string): {
  tasks: PrioritizedTask[];
  currentTask: PrioritizedTask | null; // most urgent incomplete
  stats: { completed: number; total: number; overdue: number };
  isLoading: boolean;
}
```

**2. Priority Logic**
- OVERDUE: scheduled time passed AND not logged (>15 min past = overdue)
- DUE_NOW: within 15 minutes of scheduled time AND not logged
- UPCOMING: more than 15 minutes in the future
- COMPLETED: has matching entry in today's logs

**3. Sorting Rules**
1. Overdue (most overdue first - longest wait)
2. Due Now (earliest scheduled first)
3. Upcoming (next scheduled first)
4. Completed (most recent first)

**4. Human-Readable Time Formatting**
The `minutesUntilDue` value is for internal sorting ONLY. When displaying to the user, convert to human-readable format:
```typescript
function formatTimeDistance(minutes: number): string {
  const absMin = Math.abs(minutes);
  if (absMin < 60) return `~${absMin} min`;
  if (absMin < 120) return `~1 hour`;
  if (absMin < 1440) return `~${Math.round(absMin / 60)} hours`;
  return `~${Math.round(absMin / 1440)} day${Math.round(absMin / 1440) > 1 ? 's' : ''}`;
}
// Append "late" for overdue, "in X" for upcoming
// NEVER show raw minutes to the user
```

### Critical: NO New Collections
This hook reads ONLY from existing Firestore collections. All computation is client-side. Use `useMemo` for expensive sorts.

### Test After Phase 2
```bash
npm test -- --testPathPattern="taskPriority|prioritization"
```
Write unit tests for the priority logic with mock medication schedules.

---

## CHUNK 5: PHASE 3 - PRIORITY CARD & GUIDED HOME (Core UI)

### Goal
Build the two centerpiece components:
1. Priority Card: Single-focus "do this NOW" card
2. Guided Home: The new home screen assembly

### SKILL FILES TO READ FIRST
```
cat .claude/skills/skill-priority-card/SKILL.md
cat .claude/skills/skill-guided-home/SKILL.md
```
These contain state designs (OVERDUE/DUE_NOW/UPCOMING/ALL_DONE), accessibility specs, and the full home screen layout.

### What to Build

**1. PriorityCard Component** (`src/components/dashboard/PriorityCard.tsx`)
- 4 states: OVERDUE (red), DUE_NOW (blue), UPCOMING (gray), ALL_DONE (green)
- Large text (20px task name, 16px details)
- 48px minimum touch targets for all buttons
- "Mark as Given" button: logs dose using EXISTING LogDoseModal logic (reuse, don't rewrite)
- "Skip" button: marks task as skipped
- After action: auto-advance to next task
- Shows elder name prominently (for multi-elder caregivers)
- **TIME DISPLAY MUST BE HUMAN-READABLE** (see time format rules below)

### Time Display Format Rules (MANDATORY)
Overdue and upcoming times MUST be displayed in human-friendly format, NOT raw minutes:
```
- Under 60 min: "~45 min late" or "in ~30 min"
- 1-2 hours: "~1 hour late" or "in ~1.5 hours"
- 2-24 hours: "~3 hours late" or "~21 hours late"
- Over 24 hours: "~1 day late" or "~2 days late"

NEVER show raw minutes like "1258 MIN LATE" — that means nothing to our user.
Always round to nearest sensible unit with ~ prefix for approximation.
Use "late" for overdue, "ago" for past events, "in X" for upcoming.

Examples:
✓ "OVERDUE — ~21 hours late"
✓ "OVERDUE — ~3 hours late"
✓ "OVERDUE — ~45 min late"
✓ "Coming up in ~2 hours"
✗ "OVERDUE — 1258 MIN LATE" ← NEVER do this
✗ "OVERDUE — 1313 MIN LATE" ← NEVER do this
```

**2. GuidedHome Component** (`src/app/dashboard/page.tsx` - REPLACE current content)

Layout (top to bottom, mobile):
```
1. Greeting: "Good morning, [Name]" + context line
2. PriorityCard: The ONE thing to do now
3. DayProgress: Horizontal bar (8/12 done)
4. VoiceInputArea: Text/voice input for observations
5. SuggestionChips: 4-6 quick action buttons
6. UpcomingList: Next 3 tasks with times
```

**3. HomeGreeting Component** (`src/components/dashboard/HomeGreeting.tsx`)
- Time-of-day greeting (morning/afternoon/evening)
- Context line:
  - Family plan: "Caring for [Elder Name]"
  - Agency: "3 elders on your shift"
- Font: 24px greeting, 14px context

**4. SuggestionChips Component** (`src/components/dashboard/SuggestionChips.tsx`)
- Horizontal scrollable row (mobile) or wrapped grid (desktop)
- Each chip: icon + short label
- Tap chip = navigate to that feature OR pre-fill voice input
- Default chips: Log meds, Log meal, Supplements, Add note, Ask AI, View reports
- Chips should reflect what's RELEVANT now (morning = breakfast chip, evening = dinner chip)

**5. VoiceInputArea Component** (`src/components/dashboard/VoiceInputArea.tsx`)
- Rounded input field with placeholder "Type or say something..."
- Mic icon button (right side) - triggers existing voice recognition
- On voice activation: show listening animation (pulsing circle)
- On text/voice input: route through existing voiceNavigation.ts
- DO NOT rebuild voice logic - just wire into existing `processVoiceCommand()`

### Visual Reference
Check mockup: `docs/mockups/v2-caregiver-home-mobile.svg` (full home screen)
Check mockup: `docs/mockups/v2-desktop-tablet-view.svg` (desktop version)

### Test After Phase 3
```bash
npm test -- --testPathPattern="PriorityCard|GuidedHome|greeting|suggestion"
npm run build
```

---

## CHUNK 6: PHASE 4 - MORE MENU, AUTO-SUGGEST, VOICE (Enhancement)

### Goal
Build the features that complete the experience:
1. "More" menu drawer - where all hidden features live
2. Auto-suggest - next action recommendations (Claude Code terminal pattern)
3. Voice integration - wiring into new components

### SKILL FILES TO READ FIRST
```
cat .claude/skills/skill-more-menu/SKILL.md
cat .claude/skills/skill-auto-suggest/SKILL.md
cat .claude/skills/skill-voice-integration/SKILL.md
```
These contain the drawer design, suggestion rules engine, and voice wiring points.

### What to Build

**1. MoreMenu Drawer** (`src/components/navigation/MoreMenu.tsx`)
- Opens from bottom (mobile) or side (desktop) when "More" nav item is tapped
- Contains ALL features not in bottom nav:
  - Settings, Profile, Elders Management, Reports History, Alert Settings, Activity Log, AI Chat, Help, Logout
- Grouped by section with subtle dividers
- Search/filter at top (for desktop with many items)
- Each item: icon + label + optional badge
- Role-filtered: Agency owner sees different items than family caregiver
- Animated: slide-up with backdrop (mobile), slide-in from rail (desktop)

**2. SuggestionBanner Component** (`src/components/dashboard/SuggestionBanner.tsx`)
- Appears AFTER user completes an action (logs dose, saves note, etc.)
- Shows 2-3 contextual next actions
- Auto-dismisses after 8 seconds
- Swipe down or tap X to dismiss
- Example: After logging medication → "Log breakfast too?" | "Add a note" | "Done for now"
- Inspired by Claude Code terminal: after completing a task, it pre-fills the NEXT logical action

**3. Voice Integration**
- Wire existing `processVoiceCommand()` into VoiceInputArea
- Add voice trigger to bottom nav mic button
- Ensure voice commands navigate to correct new routes
- Add voice feedback: "Logged Metformin at 8:05 AM" (text-to-speech if available)

### Test After Phase 4
```bash
npm test -- --testPathPattern="MoreMenu|suggest|voice"
npm run build
```

---

## CHUNK 7: PHASE 5 - AGENCY VIEWS (Role-Specific)

### Goal
Build role-specific screens for Multi-Agency Plan users.

### SKILL FILE TO READ FIRST
```
cat .claude/skills/skill-agency-views/SKILL.md
```
This contains the full agency owner dashboard, elder tab selector, shift bar, and conditional rendering logic.

### What to Build

**1. AgencyDashboard** (`src/components/dashboard/AgencyDashboard.tsx`)
- Replaces GuidedHome for Super Admin role
- Shows: Quick Stats (10 caregivers, 30 elders, compliance rate)
- Attention Card (uncovered shifts, pending assignments)
- Activity Feed (recent caregiver actions)
- Manage section (Assign Elder, Send Slots, Onboard, Schedule)

**2. ElderTabSelector** (`src/components/agency/ElderTabSelector.tsx`)
- For agency caregivers with multiple elders
- Horizontal scrollable tabs above PriorityCard
- Shows elder name + task count badge
- Tap = switch ElderContext

**3. ShiftInfoBar** (`src/components/agency/ShiftInfoBar.tsx`)
- Compact bar below progress indicator
- Shows shift time range + elapsed clock
- Start/End shift buttons when applicable

**4. Conditional Rendering in Dashboard**
```typescript
// In page.tsx:
if (isMultiAgency && isSuperAdmin) → <AgencyDashboard />
if (isMultiAgency && isCaregiver) → <GuidedHome with ElderTabs + ShiftBar />
else → <GuidedHome /> // Family plan
```

### Visual Reference
Check mockup: `docs/mockups/v2-agency-owner-mobile.svg`
Check mockup: `docs/mockups/v2-agency-caregiver-detail-mobile.svg`

### Test After Phase 5
```bash
npm test -- --testPathPattern="agency|Agency|elder-tab|shift"
npm run build
```

---

## CHUNK 8: FINAL VERIFICATION & COMPLETION CHECKLIST

### After ALL Phases Complete

Run the full test suite:
```bash
npm test
npm run build
npm run lint
```

### Verify Checklist (Present as Table)

```
┌──────┬────────────────────────────────────────────┬──────────┐
│  #   │ Verification Item                          │ Status   │
├──────┼────────────────────────────────────────────┼──────────┤
│  1   │ All 230+ existing tests pass               │ PASS/FAIL│
│  2   │ Build succeeds with no errors              │ PASS/FAIL│
│  3   │ Mobile: bottom nav visible, sidebar gone   │ PASS/FAIL│
│  4   │ Desktop: icon rail visible, sidebar gone   │ PASS/FAIL│
│  5   │ Priority card shows correct DUE NOW task   │ PASS/FAIL│
│  6   │ Mark as Given logs to Firestore correctly  │ PASS/FAIL│
│  7   │ Voice input triggers existing commands     │ PASS/FAIL│
│  8   │ More menu shows all hidden features        │ PASS/FAIL│
│  9   │ Auto-suggest appears after completing task │ PASS/FAIL│
│ 10   │ Agency owner sees AgencyDashboard          │ PASS/FAIL│
│ 11   │ Agency caregiver sees elder tabs           │ PASS/FAIL│
│ 12   │ Family plan user sees standard GuidedHome  │ PASS/FAIL│
│ 13   │ FCM notifications still work              │ PASS/FAIL│
│ 14   │ End-of-day PDF reports unaffected          │ PASS/FAIL│
│ 15   │ PWA installs correctly on mobile           │ PASS/FAIL│
│ 16   │ Offline mode works (service worker intact) │ PASS/FAIL│
│ 17   │ Stripe payment flow unaffected             │ PASS/FAIL│
│ 18   │ Auth login/logout/RBAC unaffected          │ PASS/FAIL│
│ 19   │ No new Firestore collections created       │ PASS/FAIL│
│ 20   │ Responsive: renders correctly at all 3 bp  │ PASS/FAIL│
└──────┴────────────────────────────────────────────┴──────────┘
```

---

## APPENDIX A: CLAUDE.AI LAYOUT REFERENCE (Visual Guidance)

### What to Learn From Claude.ai's UI Pattern

**HOME SCREEN (Empty State) — Mobile (Claude.ai reference):**
```
┌─────────────────────────────────────────┐
│ [=]  Claude            [?] [Avatar]     │  ← Claude.ai pattern
│                                         │
│         How can I                       │
│         help you today?                 │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Message Claude...              [↑]  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Write code]  [Analyze]  [Research]     │
│ [Brainstorm]  [Summarize]              │
│                                         │
└─────────────────────────────────────────┘

OUR EQUIVALENT — Mobile:
┌─────────────────────────────────────────┐
│ MyHealthGuide                           │  ← ONLY logo text. Nothing else.
│                                         │
│  Good morning, Maria                    │
│  Caring for Rod Laver                   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ OVERDUE — ~21 hours late          │  │  ← Human-readable time
│  │ Lisinopril 10mg for Rod Laver     │  │
│  │ [ Mark as Given ] [ Skip ]        │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [===-------] 1 of 4 done              │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Type or say something...      [mic] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Log meds] [Log meal] [Add note] [Ask]  │
│                                         │
│ [Home] [Care] [🎤] [🔔 3] [More]      │  ← Bell in bottom nav, avatar in "More"
└─────────────────────────────────────────┘

KEY:
- Header: ONLY logo text. Nothing else. No bell, no avatar, no icons.
- Bell (with badge) lives in bottom nav (mobile) or icon rail (desktop)
- Avatar lives inside "More" menu (mobile) or icon rail bottom (desktop)
- Only 4 things visible: greeting, priority card, input, chips
- The PRIORITY CARD is the hero element (not the input)
- Chips are BELOW the input (suggestions)
```

**DESKTOP WITH ICON RAIL:**
```
┌──┬──────────────────────────────────────────────────────────┐
│  │  MyHealthGuide                                           │
│🏠│                                                          │
│❤️│              Good morning, Maria                         │
│📋│              Caring for Rod Laver                        │
│⭐│                                                          │
│☰ │   ┌────────────────────────────────────────────────┐     │
│  │   │ OVERDUE — ~21 hours late                       │     │
│  │   │ Lisinopril 10mg for Rod Laver                  │     │
│  │   │ [ Mark as Given ] [ Skip ]                     │     │
│  │   └────────────────────────────────────────────────┘     │
│  │                                                          │
│🔔│   [Log meds] [Log meal] [Add note] [Ask AI]             │  ← Bell bottom-left
│VC│                                                          │  ← Avatar at very bottom
└──┴──────────────────────────────────────────────────────────┘

KEY:
- Left rail is EXACTLY 56px — icons only, no text
- TOP of rail: primary nav (Home, Care, Notes, AI, More)
- BOTTOM of rail: utility (Bell with badge, then Avatar)
- Spacer (flex-grow) separates top nav from bottom utility
- NO logo/badge at top of rail — logo is in the header
- NO settings/gear icon — avatar (VC) IS the settings entry
- Header: ONLY logo text — nothing else (no bell, no avatar)
- Tooltips appear on HOVER (desktop only)
- Main content is CENTERED with max-width (~720px)
- Massive whitespace — the UI BREATHES
```

**AFTER INTERACTION (Auto-suggest pattern):**
```
┌──┬──────────────────────────────────────────────────────────┐
│  │  MyHealthGuide                                           │
│🏠│                                                          │
│❤️│  [Completed: Lisinopril marked as given at 8:05 AM]     │
│📋│                                                          │
│⭐│  ─────────────────────────────────────────               │
│☰ │                                                          │
│  │  [Log breakfast too?]  [Add a note]  [Done for now]     │
│  │                                                          │
│  │  ┌────────────────────────────────────────────────┐      │
│🔔│  │ Type or say something...                 [mic] │      │
│VC│  └────────────────────────────────────────────────┘      │
└──┴──────────────────────────────────────────────────────────┘

KEY:
- After completing an action, NEW contextual chips appear
- This is the AUTO-SUGGEST pattern we want
- Chips change based on what just happened
- Top of rail: nav icons. Bottom of rail: Bell + Avatar
- Header is ONLY logo text — nothing else
```

**CLAUDE CODE TERMINAL AUTO-SUGGEST PATTERN:**
```
┌─────────────────────────────────────────────────────────────┐
│ $ claude                                                     │
│                                                             │
│ > Fix the auth bug in login.ts                              │
│                                                             │
│ Claude: I've fixed the authentication bug by...             │
│ [shows code diff]                                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Run tests to verify the fix? (press Enter)         [↑]  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ KEY: After completing one action, the NEXT logical          │
│ action is PRE-FILLED. User just presses Enter.             │
│ No thinking needed. No navigation needed.                   │
└─────────────────────────────────────────────────────────────┘

OUR EQUIVALENT:
- After "Mark as Given" on medication →
  Banner slides up: "Log breakfast too?" [tap to execute]
- After logging a meal →
  Banner: "Afternoon meds in 30 min" [set reminder]
- The NEXT action is already figured out for the user
```

### Mapping Claude.ai → MyHealthGuide

| Claude.ai Element | MyHealthGuide Equivalent | Why |
|---|---|---|
| "How can I help you today?" | "Good morning, Maria" + care context | Friendly, personal, not corporate |
| Text input field | Voice/text observation input | Same pattern, but voice-first for elderly |
| Suggestion chips | Quick action chips (Log meds, Log meal, etc.) | Pre-filled actions, one tap |
| Icon rail (desktop) | 56px icon rail with care-specific nav (NO logo badge at top, NO gear icon) | Same narrow, icon-only approach |
| Avatar in header (top-right) | Avatar at BOTTOM of icon rail only (NOT in header) | Cleaner header, less clutter |
| Settings gear icon | REMOVED — avatar menu handles settings/profile/sign-out | Reduce duplication |
| Hamburger menu | "More" button in bottom nav/icon rail | Same: hide complexity behind one button |
| Previous chats | Care history, past notes | Tucked away, not on home screen |
| Clean empty state | Priority card OR greeting (if all done) | ONE thing dominates the viewport |
| [↑] send button | [mic] voice button | Input confirmation |
| Post-response chips | SuggestionBanner after completing task | Contextual next actions |
| Pre-filled follow-up | Auto-suggested next medication/meal | User just taps, no typing needed |
| Logo in header | "MyHealthGuide" text ONLY — nothing else in header | Ultra-minimal header, bell moved to rail/nav |

---

## APPENDIX B: DOs AND DON'Ts QUICK REFERENCE

### DOs
- DO read the relevant SKILL.md BEFORE each phase (mandatory, not optional)
- DO present plan table BEFORE writing code
- DO explain WHY you're making each change (in commit messages and plan table)
- DO reuse existing components (LogDoseModal, Toast, Button, Card, etc.)
- DO use Tailwind classes (existing config, don't modify tailwind.config)
- DO handle loading states (skeleton screens, not spinners)
- DO support keyboard navigation and screen readers
- DO test after EVERY phase
- DO commit after each successful phase (small, reviewable commits)
- DO use existing React contexts (AuthContext, ElderContext, SubscriptionContext)
- DO keep existing page routes intact (features move to menus, not new URLs)
- DO add `aria-label` attributes to all interactive elements
- DO use `prefers-reduced-motion` for animations
- DO use existing color variables from Tailwind config
- DO display "Loved One" in UI text but keep `elder` in code
- DO reference the SVG mockups for visual guidance
- DO follow the Implementation Steps in each SKILL.md in order
- DO verify that ALL existing functionality still works after each phase (not just tests — manually check key flows)
- DO treat every existing file as "working production code" — understand it fully before modifying
- DO use conditional rendering (if/else) when adding role-specific views — the ELSE path must remain unchanged

### DON'Ts
- DON'T put the user avatar in the header/top-right — avatar belongs ONLY at the bottom of the icon rail (desktop) or in the "More" menu (mobile)
- DON'T put the notification bell in the header — bell belongs in the icon rail (desktop) or bottom nav (mobile)
- DON'T add a separate Settings/gear icon — the avatar menu IS the settings entry point
- DON'T show an "MG" badge/icon at the top of the icon rail — NO app icon badge anywhere
- DON'T call the app "MyGuide" or "MyGuide.Health" in the UI — it's "MyHealthGuide"
- DON'T display raw minutes for overdue/upcoming times — ALWAYS convert to human-readable (~3 hours late, ~21 hours late, ~2 days late)
- DON'T skip reading the SKILL.md for each phase
- DON'T modify any file under `src/app/api/`
- DON'T modify `functions/src/index.ts`
- DON'T modify `firestore.rules`
- DON'T modify `src/lib/firebase/auth.ts`
- DON'T modify `src/app/sw.ts` or service worker files
- DON'T add new Firestore collections or documents
- DON'T install new UI component libraries (no Material UI, no Chakra, etc.)
- DON'T use emoji characters in the UI (use Lucide React icons)
- DON'T use `!important` in CSS
- DON'T create separate mobile/desktop page components (use responsive classes)
- DON'T hardcode colors (use Tailwind theme colors)
- DON'T remove any existing feature (hide in More menu instead)
- DON'T skip the planning table step
- DON'T proceed to next phase until tests pass
- DON'T modify existing TypeScript interfaces (add new ones if needed)
- DON'T change env variable names or Vercel configuration
- DON'T rename any Firestore collection or document field
- DON'T implement a phase if its dependency phase isn't complete

---

## HOW TO START

```
1. Read this ENTIRE document (IMPLEMENTATION-PROMPT.md)
2. Read CLAUDE.md in the project root (project constraints & history)
3. Read the SVG mockups in docs/mockups/ (visual reference)
4. Start Phase 1:
   → Read: .claude/skills/skill-layout-system/SKILL.md
   → Read all files listed in "Files to Read First"
   → Present your plan table
   → Wait for approval
5. Implement Phase 1
6. Test Phase 1
7. Commit Phase 1
8. Repeat for Phases 2-5
9. Present final verification checklist (Chunk 8)
```

**Remember: You are building for a 65-year-old caregiver who may have never used a smartphone app before. When in doubt, make it SIMPLER, BIGGER, and MORE OBVIOUS. The app should feel like a helpful assistant whispering "do this next" — not a complex dashboard demanding attention.**
