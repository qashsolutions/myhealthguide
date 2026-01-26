---
name: skill-guided-home
description: Guided home screen with greeting, voice input, suggestion chips, and priority card assembly. Use when implementing the main dashboard home page, greeting message, suggestion chips, or the Claude.ai-inspired conversational home layout. Depends on skill-layout-system and skill-priority-card.
---

## Objective

Replace the current dashboard overview (stat cards grid) with a guided, conversational home screen inspired by Claude.ai's layout. Optimized for a 65-year-old caregiver who needs clear, simple guidance on what to do next.

## Constraints

- DO NOT remove the existing dashboard/page.tsx -- refactor it in place
- MUST preserve existing data fetching (elder data, compliance stats)
- MUST integrate with TaskPriorityContext
- MUST work with existing voice command system
- Target: one glance tells the caregiver what to do next
- No information overload -- progressive disclosure only

## Files to Read First

- `src/app/dashboard/page.tsx` -- Current dashboard (to be refactored)
- `src/components/dashboard/PriorityCard.tsx` -- From skill-priority-card
- `src/lib/voice/voiceNavigation.ts` -- Existing voice system
- `src/hooks/useTaskPriority.ts` -- Priority data
- `src/contexts/ElderContext.tsx` -- Elder data provider

## Screen Layout (Mobile - 390px)

```
+------------------------------------------+
| [Logo]              [Bell] [Avatar]       |  <- MinimalHeader (48px)
+------------------------------------------+
|                                          |
|  Good morning, Sarah                     |  <- Time-aware greeting
|  Martha has 3 tasks today                |  <- Context summary
|                                          |
+------------------------------------------+
|  [PRIORITY CARD - DUE NOW]              |  <- PriorityCard component
|  Metformin 500mg for Martha              |
|  Due at 8:00 AM                          |
|  [ Mark as Given ] [ Skip ]             |
+------------------------------------------+
|  [===========--------] 8/12 done        |  <- DayProgress bar
+------------------------------------------+
|                                          |
|  Suggested actions:                      |
|  +----------+ +----------+ +--------+   |
|  | Log meal | | Add note | | Voice  |   |  <- Suggestion chips
|  +----------+ +----------+ +--------+   |
|                                          |
+------------------------------------------+
|  [Mic icon]  "What would you like to do?" |  <- Voice input area
|  Tap to speak or type...                 |
+------------------------------------------+
|                                          |
| [Home] [Care] [Voice] [Notes] [More]    |  <- BottomNav (56px)
+------------------------------------------+
```

## Implementation Steps

### Step 1: Create Greeting Component

Create `src/components/dashboard/HomeGreeting.tsx`:

```typescript
Purpose: Time-aware personalized greeting

Logic:
- 5-11 AM: "Good morning, {firstName}"
- 12-16 PM: "Good afternoon, {firstName}"
- 17-20 PM: "Good evening, {firstName}"
- 21-4 AM: "Welcome back, {firstName}"

Subtitle (contextual):
- If overdue tasks: "{elderName} has {count} overdue tasks"
- If due soon: "{elderName}'s next task is in {minutes} min"
- If all done: "All caught up! Great job today"
- If multiple elders: "You have {count} elders to check on"

Font: greeting 24px semibold, subtitle 16px regular secondary
```

### Step 2: Create Suggestion Chips Component

Create `src/components/dashboard/SuggestionChips.tsx`:

```typescript
Purpose: Pre-populated action shortcuts (like Claude.ai's suggested prompts)

Chips are contextual based on:
1. Time of day:
   - Morning: "Log breakfast", "Morning meds"
   - Afternoon: "Log lunch", "Afternoon check"
   - Evening: "Log dinner", "Evening meds", "End-of-day notes"
2. Task state:
   - Overdue tasks: "Log overdue meds"
   - No meals logged: "Log meal"
   - No notes today: "Add observation"
3. Role:
   - Agency caregiver: "Start shift", "Switch elder"
   - Agency owner: "View schedule", "Check hours"

Display:
- Horizontal scrollable row
- Pill-shaped chips with icon + text
- Max 4-5 visible, scroll for more
- Tap = navigate to action or pre-fill voice input
- 36px height, 14px text, 8px padding

Behavior:
- Chips update dynamically as tasks are completed
- After logging a med, chip changes to next suggestion
- "Voice" chip opens voice modal with pre-filled prompt
```

### Step 3: Create Voice Input Area

Create `src/components/dashboard/VoiceInputArea.tsx`:

```typescript
Purpose: Always-visible voice/text input (like Claude.ai's message box)

Display:
- Rounded input field with mic icon on left
- Placeholder: "What would you like to do?"
- Tap mic = start voice recognition
- Tap text area = show keyboard with autocomplete

Integration:
- Connects to existing voiceNavigation.ts command system
- Recognized commands trigger navigation
- Unrecognized input goes to AI chat
- Shows real-time transcription while listening

States:
- Idle: gray mic icon, placeholder text
- Listening: pulsing blue mic icon, "Listening..."
- Processing: spinner, "Understanding..."
- Error: red mic icon, "Tap to try again"
```

### Step 4: Refactor Dashboard Page

Modify `src/app/dashboard/page.tsx`:

```typescript
Replace current content with:

export default function DashboardPage() {
  const { nextTask, overdueTasks, completedCount, totalCount } = useTaskPriority();
  const { currentElder } = useElder();
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-4 px-4 py-4 max-w-lg mx-auto">
      <HomeGreeting
        userName={user.displayName}
        elderName={currentElder?.name}
        overdueCount={overdueTasks.length}
      />

      <PriorityCard
        task={nextTask}
        onMarkComplete={handleComplete}
        onSkip={handleSkip}
        completionStats={{ completed: completedCount, total: totalCount }}
      />

      <DayProgress completed={completedCount} total={totalCount} />

      <SuggestionChips
        overdueCount={overdueTasks.length}
        currentElder={currentElder}
        timeOfDay={getTimeOfDay()}
      />

      <VoiceInputArea />
    </div>
  );
}
```

### Step 5: Desktop/Tablet Adaptation

On wider screens (>=640px):
```
- Content centered with max-width: 640px
- PriorityCard can show 2-3 upcoming tasks in a mini-list below
- Suggestion chips in 2 rows instead of scrollable
- Voice input area wider but same functionality
- Optional: right sidebar showing today's full schedule
```

## Auto-Suggest Flow (After Action)

When a user completes a task:
1. Priority card animates out (slide up/fade)
2. Brief success toast (2 seconds)
3. Next task slides in from bottom
4. Suggestion chips update
5. If all done: show celebration state ("All caught up!")

## Edge Cases

- **No elders assigned**: Show onboarding prompt ("Add your first Loved One")
- **No medications set up**: Show setup prompt ("Set up medications to get reminders")
- **First visit of day**: Show daily summary instead of greeting
- **Offline mode**: Show cached last-known state with "Offline" badge
- **Family member (read-only)**: Hide action buttons, show status only

## Testing Requirements

- Greeting matches time of day
- Suggestion chips are contextual
- Voice input integrates with existing voiceNavigation
- PriorityCard displays correctly in all states
- Auto-advance works after task completion
- Responsive: mobile, tablet, desktop render correctly
- Run: `npm test -- --testPathPattern=dashboard`
