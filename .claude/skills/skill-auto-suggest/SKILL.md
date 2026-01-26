---
name: skill-auto-suggest
description: Auto-suggest next task system that recommends actions after completing a task. Use when implementing post-action suggestions, next-step prompts, or contextual action recommendations. Similar to Claude Code terminal auto-suggestions. Depends on skill-task-prioritization.
---

## Objective

After a caregiver completes any action (logs medication, adds note, logs meal), automatically suggest the most logical next action. Inspired by Claude Code's terminal auto-suggestions that pre-fill the next command.

## Constraints

- MUST not be intrusive -- suggestions appear subtly, not as blocking modals
- MUST be dismissible (swipe away or tap elsewhere)
- MUST be contextually relevant (not random features)
- MUST feel like a helpful assistant, not a nag
- MUST work offline (suggestions based on local data)
- DO NOT modify existing action completion handlers -- hook into them

## Files to Read First

- `src/hooks/useTaskPriority.ts` -- Priority data for next task
- `src/components/daily-care/LogDoseModal.tsx` -- Current completion flow
- `src/components/dashboard/PriorityCard.tsx` -- Where suggestions appear after
- `src/app/dashboard/daily-care/page.tsx` -- Daily care logging context
- `src/lib/voice/voiceNavigation.ts` -- Voice command integration point

## Suggestion Logic

### Context-Based Rules

```typescript
interface SuggestionRule {
  afterAction: string; // What just happened
  condition?: (state: AppState) => boolean; // When to show
  suggestions: Suggestion[]; // What to suggest
}

const rules: SuggestionRule[] = [
  {
    afterAction: 'LOG_MEDICATION',
    suggestions: [
      { if: 'nextMedDueWithin30Min', text: 'Log {nextMedName} too', action: 'LOG_MEDICATION', prefill: nextMed },
      { if: 'noBreakfastLogged && isMorning', text: 'Log breakfast', action: 'LOG_MEAL' },
      { if: 'hasSupplementDue', text: 'Log {supplementName}', action: 'LOG_SUPPLEMENT' },
      { default: true, text: 'Add a note', action: 'ADD_NOTE' }
    ]
  },
  {
    afterAction: 'LOG_MEAL',
    suggestions: [
      { if: 'hasMedDueNow', text: 'Log {medName} with meal', action: 'LOG_MEDICATION' },
      { if: 'hasSupplementWithMeal', text: 'Log supplements', action: 'LOG_SUPPLEMENT' },
      { default: true, text: 'All done for now', action: 'DISMISS' }
    ]
  },
  {
    afterAction: 'LOG_SUPPLEMENT',
    suggestions: [
      { if: 'hasMoreSupplements', text: 'Log {nextSupplement}', action: 'LOG_SUPPLEMENT' },
      { if: 'hasMedDue', text: 'Log medications', action: 'LOG_MEDICATION' },
      { default: true, text: 'Done', action: 'DISMISS' }
    ]
  },
  {
    afterAction: 'ADD_NOTE',
    suggestions: [
      { if: 'hasOverdueTasks', text: 'Handle overdue tasks', action: 'SHOW_OVERDUE' },
      { default: true, text: 'Back to home', action: 'GO_HOME' }
    ]
  },
  {
    afterAction: 'START_SHIFT', // Agency only
    suggestions: [
      { text: 'Check today\'s tasks', action: 'GO_HOME' },
      { text: 'View schedule', action: 'GO_SCHEDULE' }
    ]
  },
  {
    afterAction: 'COMPLETE_ALL_TASKS',
    suggestions: [
      { text: 'Add end-of-day notes', action: 'ADD_NOTE' },
      { text: 'View today\'s report', action: 'VIEW_REPORT' }
    ]
  }
];
```

### Time-Based Suggestions

```typescript
// Morning (6-10 AM)
- "Log morning medications" (if not logged)
- "Log breakfast" (if no meal logged)

// Midday (11-14 PM)
- "Log lunch" (if no midday meal)
- "Afternoon meds due" (if scheduled)

// Evening (17-21 PM)
- "Log dinner" (if no evening meal)
- "Evening medications" (if scheduled)
- "Add daily observations" (if no notes today)

// After 7 PM (report time)
- "Review today's summary" (before PDF goes out)
```

## Implementation Steps

### Step 1: Create Suggestion Engine

Create `src/lib/suggestions/suggestionEngine.ts`:

```typescript
export function getSuggestions(
  afterAction: string,
  state: {
    tasks: PrioritizedTask[];
    mealsLogged: MealLog[];
    currentTime: Date;
    currentElder: Elder;
    userRole: string;
  }
): Suggestion[] {
  // Apply rules in priority order
  // Return max 3 suggestions
  // First suggestion is "recommended" (highlighted)
}

export interface Suggestion {
  id: string;
  text: string;
  icon: string; // Lucide icon name
  action: string;
  prefill?: any; // Pre-filled data for the action
  priority: 'recommended' | 'normal';
}
```

### Step 2: Create SuggestionBanner Component

Create `src/components/dashboard/SuggestionBanner.tsx`:

```typescript
Purpose: Appears after action completion, slides up from bottom of priority card

Display:
+------------------------------------------+
| What's next?                    [x close]|
| +------------------+ +----------------+ |
| | [Pill] Log next  | | [Edit] Add     | |
| |  medication      | |  a note        | |
| +------------------+ +----------------+ |
+------------------------------------------+

Behavior:
- Appears with slide-up animation (200ms)
- Auto-dismisses after 10 seconds if not interacted with
- Tap suggestion = execute action
- Tap X = dismiss immediately
- Swipe down = dismiss
- Maximum 2-3 suggestions shown
- First suggestion is larger/highlighted
```

### Step 3: Create Suggestion Hook

Create `src/hooks/useSuggestions.ts`:

```typescript
export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [visible, setVisible] = useState(false);
  const { tasks } = useTaskPriority();

  const triggerSuggestion = useCallback((afterAction: string) => {
    const newSuggestions = getSuggestions(afterAction, currentState);
    setSuggestions(newSuggestions);
    setVisible(true);

    // Auto-dismiss after 10s
    setTimeout(() => setVisible(false), 10000);
  }, [currentState]);

  const dismissSuggestions = useCallback(() => {
    setVisible(false);
  }, []);

  const executeSuggestion = useCallback((suggestion: Suggestion) => {
    setVisible(false);
    // Route to appropriate action
    handleSuggestionAction(suggestion);
  }, []);

  return { suggestions, visible, triggerSuggestion, dismissSuggestions, executeSuggestion };
}
```

### Step 4: Integrate with Existing Actions

Hook into existing action completion points:

```typescript
// In PriorityCard.tsx (after Mark as Given):
const { triggerSuggestion } = useSuggestions();

const handleComplete = async (taskId: string) => {
  await logDose(taskId); // existing logic
  triggerSuggestion('LOG_MEDICATION'); // NEW: trigger auto-suggest
};

// In meal logging:
const handleMealLog = async (meal: MealData) => {
  await saveMeal(meal); // existing logic
  triggerSuggestion('LOG_MEAL'); // NEW
};

// In note creation:
const handleNoteCreate = async (note: NoteData) => {
  await saveNote(note); // existing logic
  triggerSuggestion('ADD_NOTE'); // NEW
};
```

## Persistence (Optional)

Store suggestion interaction patterns in `userSmartPreferences` (existing collection):
```typescript
// Track which suggestions are acted on vs dismissed
// Over time, prioritize suggestions the user usually accepts
// This is optional and can be added later
```

## Testing Requirements

- Correct suggestion appears after each action type
- Time-based suggestions match current time
- Suggestions auto-dismiss after 10 seconds
- Tap suggestion executes correct action
- Dismiss button works
- Maximum 3 suggestions shown
- "Recommended" suggestion is visually highlighted
- No suggestions when all tasks are done (show celebration instead)
- Run: `npm test -- --testPathPattern=suggestion`
