# MyGuide.Health PWA - UI/UX Overhaul Implementation Prompt

> **Purpose**: Provide this prompt to Claude Code in terminal to guide the complete UI/UX overhaul of the MyGuide.Health PWA. Share the SVG mockups from `/docs/mockups/` alongside this prompt.
>
> **CRITICAL**: Execute in PHASES. Do NOT skip ahead. Each phase MUST be planned, presented as a table, and approved before any code changes.

---

## CHUNK 1: CONTEXT & GUARDRAILS

### What This App Is
- **MyGuide.Health** is a LIVE PRODUCTION Progressive Web App (PWA) for elder care management
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

YOU MUST:
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

1. **Read** all files listed in the relevant SKILL.md under "Files to Read First"
2. **Plan** your changes in a structured table format
3. **Present** the plan table for approval
4. **Wait** for explicit "proceed" confirmation

### Plan Table Format (REQUIRED)

Present your plan EXACTLY like this for each phase:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE [N]: [Phase Name]                                                     │
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
- **Header**: Minimal (logo + notification bell + avatar only)

### Reference Skill
Read: `.claude/skills/skill-layout-system/SKILL.md`

### What to Build

**1. BottomNav Component** (`src/components/navigation/BottomNav.tsx`)
- 5 items max: Home, Care, Voice (mic icon), Notes/Schedule, More
- Active state: filled icon + label + primary color
- Inactive: outline icon + gray
- Height: 64px with safe area padding for notched phones
- Items change based on role (see skill-agency-views for role-specific items)
- Voice (center) button is 56px circle, raised above nav bar
- MUST include `pb-safe` for iOS PWA home screen

**2. IconRail Component** (`src/components/navigation/IconRail.tsx`)
- 56px wide, left-aligned, full height
- Logo at top (32px)
- Nav icons vertically centered (24px icons, 48px tap targets)
- Avatar at bottom
- Tooltip on hover (desktop only)
- Items: Home, Care/Schedule, Reports, AI Chat, Alerts, More
- Active: primary background circle behind icon

**3. MinimalHeader Component** (`src/components/navigation/MinimalHeader.tsx`)
- Height: 48px (mobile), 56px (desktop)
- Contents: Logo (left) + Bell with badge (right) + Avatar (right)
- NO other icons, search bars, or buttons
- Bell badge shows unread notification count from FCM

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

### Reference Skill
Read: `.claude/skills/skill-task-prioritization/SKILL.md`

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

### Reference Skills
Read: `.claude/skills/skill-priority-card/SKILL.md`
Read: `.claude/skills/skill-guided-home/SKILL.md`

### What to Build

**1. PriorityCard Component** (`src/components/dashboard/PriorityCard.tsx`)
- 4 states: OVERDUE (red), DUE_NOW (blue), UPCOMING (gray), ALL_DONE (green)
- Large text (20px task name, 16px details)
- 48px minimum touch targets for all buttons
- "Mark as Given" button: logs dose using EXISTING LogDoseModal logic (reuse, don't rewrite)
- "Skip" button: marks task as skipped
- After action: auto-advance to next task
- Shows elder name prominently (for multi-elder caregivers)

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
2. Auto-suggest - next action recommendations
3. Voice integration - wiring into new components

### Reference Skills
Read: `.claude/skills/skill-more-menu/SKILL.md`
Read: `.claude/skills/skill-auto-suggest/SKILL.md`
Read: `.claude/skills/skill-voice-integration/SKILL.md`

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

### Reference Skill
Read: `.claude/skills/skill-agency-views/SKILL.md`

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

## APPENDIX A: CLAUDE.AI LAYOUT REFERENCE (For Visual Guidance)

### What to Learn From Claude.ai's UI Pattern

**HOME SCREEN (Empty State):**
```
┌─────────────────────────────────────────────────────────────┐
│ ┌──┐                                              [?] [U]  │
│ │☰ │  Claude.ai (logo)                                      │
│ └──┘                                                        │
│                                                             │
│                                                             │
│                        How can I                            │
│                        help you today?                      │
│                                                             │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Ask Claude anything...                         [↑]  │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [✦ Write code]  [📊 Analyze data]  [📝 Create content]   │
│   [💡 Brainstorm]  [🔍 Research]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**DESKTOP WITH ICON RAIL:**
```
┌──┬──────────────────────────────────────────────────────────┐
│  │                                                          │
│🏠│              How can I help you today?                   │
│  │                                                          │
│💬│   ┌────────────────────────────────────────────────┐     │
│  │   │ Ask Claude anything...                    [↑]  │     │
│⭐│   └────────────────────────────────────────────────┘     │
│  │                                                          │
│⚙️│   [Chip 1]  [Chip 2]  [Chip 3]  [Chip 4]               │
│  │                                                          │
│👤│                                                          │
└──┴──────────────────────────────────────────────────────────┘

Left rail: ~56px, icons only, tooltips on hover
Main area: centered content, generous whitespace
Input: single prominent text field
Chips: contextual suggestions that pre-fill the input
```

**KEY PRINCIPLES FROM CLAUDE.AI:**
1. ONE input field dominates the screen
2. Suggestion chips below the input (not above, not in sidebar)
3. Icon rail is NARROW (56px) - icons only, no text labels
4. Content is CENTERED with max-width (720px)
5. Background is CLEAN (no cards, no grids, no stats on home)
6. Navigation is MINIMAL (3-5 items in rail)
7. Everything else is behind the hamburger/menu
8. The greeting text is LARGE and friendly

### Mapping Claude.ai → MyGuide.Health

| Claude.ai Element | MyGuide.Health Equivalent |
|---|---|
| "How can I help you today?" | "Good morning, Maria" + care context |
| Text input field | Voice/text observation input |
| Suggestion chips | Quick action chips (Log meds, Log meal, etc.) |
| Icon rail (desktop) | 56px icon rail with care-specific nav |
| Hamburger menu | "More" button in bottom nav/icon rail |
| Previous chats | Care history, past notes |
| Clean empty state | Priority card (if task due) OR greeting (if all done) |
| [↑] send button | [🎤] mic button |

---

## APPENDIX B: DOs AND DON'Ts QUICK REFERENCE

### DOs
- DO read the relevant SKILL.md before each phase
- DO present plan table BEFORE writing code
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

### DON'Ts
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

---

## APPENDIX C: EXISTING SKILLS DIRECTORY

The implementation details for each phase live in:
```
.claude/skills/
├── skill-layout-system/SKILL.md        ← Phase 1
├── skill-task-prioritization/SKILL.md  ← Phase 2
├── skill-priority-card/SKILL.md        ← Phase 3
├── skill-guided-home/SKILL.md          ← Phase 3
├── skill-more-menu/SKILL.md            ← Phase 4
├── skill-auto-suggest/SKILL.md         ← Phase 4
├── skill-voice-integration/SKILL.md    ← Phase 4
└── skill-agency-views/SKILL.md         ← Phase 5
```

**Before each phase, run:** `/skill-[name]` to load the detailed implementation instructions.

---

## HOW TO START

1. Read this entire document
2. Read CLAUDE.md in the project root
3. Start with Phase 1: run `/skill-layout-system`
4. Present your plan table
5. Wait for approval
6. Implement
7. Test
8. Commit
9. Move to next phase

**Remember: You are building for a 65-year-old caregiver who may have never used a smartphone app before. When in doubt, make it SIMPLER, BIGGER, and MORE OBVIOUS.**
