---
name: skill-priority-card
description: Single-focus DUE NOW priority card component showing the most urgent task. Use when implementing the priority card, task card, due-now display, or the main action card on the home screen. Depends on skill-task-prioritization being complete.
---

## Objective

Build a single-focus "Priority Card" component that displays the most urgent task prominently, with a one-tap action to complete it. This is the centerpiece of the guided home screen.

## Constraints

- MUST depend on `useTaskPriority()` hook from skill-task-prioritization
- MUST be accessible (large touch targets, high contrast, readable at arm's length)
- MUST use existing shadcn/ui Card component patterns
- MUST use Lucide React icons
- MUST handle all task states (overdue, due_now, upcoming, completed-all)
- Target user: 65-year-old with limited tech skills -- BIG text, CLEAR actions

## Files to Read First

- `src/hooks/useTaskPriority.ts` -- Priority data source
- `src/components/ui/card.tsx` -- Existing Card component (shadcn)
- `src/components/ui/button.tsx` -- Existing Button component
- `src/app/dashboard/daily-care/page.tsx` -- Current log modal patterns
- `src/components/daily-care/LogDoseModal.tsx` -- Existing dose logging modal

## CRITICAL: Time Display Format

NEVER show raw minutes to the user. Always convert to human-readable:
```
Under 60 min:  "~45 min late" or "in ~30 min"
1-2 hours:     "~1 hour late" or "in ~1.5 hours"
2-24 hours:    "~3 hours late" or "~21 hours late"
Over 24 hours: "~1 day late" or "~2 days late"

✓ "OVERDUE — ~21 hours late"
✓ "OVERDUE — ~3 hours late"
✗ "OVERDUE — 1258 MIN LATE" ← NEVER
✗ "OVERDUE — 1313 MIN LATE" ← NEVER
```

## Component Design

### PriorityCard States

**State 1: OVERDUE** (Red theme)
```
+------------------------------------------+
|  !! OVERDUE — ~45 min late               |
|                                          |
|  [Pill icon]  Metformin 500mg            |
|               for Martha                 |
|               Was due at 8:00 AM         |
|                                          |
|  "Take 1 tablet with breakfast"          |
|                                          |
|  [ Mark as Given ]  [ Skip ]            |
+------------------------------------------+
```

**State 2: DUE_NOW** (Blue/Primary theme)
```
+------------------------------------------+
|  DUE NOW                                 |
|                                          |
|  [Pill icon]  Lisinopril 10mg            |
|               for Martha                 |
|               Due at 2:00 PM             |
|                                          |
|  "Take 1 tablet"                         |
|                                          |
|  [ Mark as Given ]  [ Skip ]            |
+------------------------------------------+
```

**State 3: ALL DONE** (Green theme)
```
+------------------------------------------+
|  All caught up!                          |
|                                          |
|  [CheckCircle icon]                      |
|  12/12 tasks completed today             |
|                                          |
|  Next: Vitamin D at 8:00 PM             |
|                                          |
+------------------------------------------+
```

**State 4: UPCOMING** (Gray/Neutral theme - when nothing is due now)
```
+------------------------------------------+
|  Next up in 45 minutes                   |
|                                          |
|  [Pill icon]  Evening Medications        |
|               for Martha                 |
|               Due at 8:00 PM             |
|                                          |
|  [Set Reminder]                          |
+------------------------------------------+
```

## Implementation Steps

### Step 1: Create PriorityCard Component

Create `src/components/dashboard/PriorityCard.tsx`:

```typescript
Props:
- task: PrioritizedTask | null
- onMarkComplete: (taskId: string) => void
- onSkip: (taskId: string) => void
- completionStats: { completed: number; total: number }

Features:
- Color-coded border/background based on status
- Large icon (32px) for task type
- Task name in 18px+ font
- Elder name in 14px secondary text
- Time display in 16px
- Instructions in 14px italic
- Action buttons: min 48px height, full-width on mobile
- Swipe gesture support (swipe right = complete, swipe left = skip)
- Haptic feedback on action (if supported)
```

### Step 2: Create Quick Log Handler

Create `src/components/dashboard/QuickLogHandler.tsx`:

```typescript
Purpose: Handles the "Mark as Given" action without opening a full modal

Flow:
1. User taps "Mark as Given"
2. Show brief confirmation toast ("Metformin logged at 2:05 PM")
3. Write to medication_logs or supplement_logs collection
4. Auto-advance to next task
5. If details needed, show mini-modal (not full page)

Reuse:
- Existing log creation logic from LogDoseModal
- Existing Firestore write patterns
- Existing toast/notification patterns
```

### Step 3: Create Progress Indicator

Create `src/components/dashboard/DayProgress.tsx`:

```typescript
Purpose: Shows overall day completion

Display:
- Horizontal progress bar (full width, 8px height)
- "8 of 12 done" text below
- Color: green gradient as completion increases
- Position: directly below PriorityCard

Props:
- completed: number
- total: number
```

### Step 4: Handle Multiple Elders (Agency)

For agency caregivers with multiple elders:
```
- Show elder name prominently on card
- If multiple tasks are overdue for different elders, show most urgent first
- Allow swipe between elder-specific views
- Tab row above card: [Martha] [John] [Betty] (elder selector)
```

## Accessibility Requirements

- Minimum font size: 16px for body, 20px for task name
- Touch targets: minimum 48x48px
- Color contrast: WCAG AA minimum (4.5:1)
- Screen reader: Announce task status, name, time, and actions
- Reduce motion: Disable swipe animations if prefers-reduced-motion

## Testing Requirements

- Render each state (overdue, due_now, upcoming, all_done)
- Tap "Mark as Given" creates correct log entry
- Tap "Skip" marks task as skipped
- Auto-advance shows next task after completion
- Multiple elders: elder selector works
- Responsive: card fills width on mobile, max-width on desktop
- Run: `npm test -- --testPathPattern=PriorityCard`
