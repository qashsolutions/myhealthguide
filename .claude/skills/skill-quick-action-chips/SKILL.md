---
name: skill-quick-action-chips
description: Contextual quick action chips (suggestion buttons) on the home screen. Use when implementing suggestion chips, quick action buttons, contextual shortcuts, or the Claude.ai-inspired pre-filled action pattern. Changes based on time of day, role, and task state.
---

## Objective

Build a row of contextual "quick action" chips that appear on the home screen, below the voice input area. These are inspired by Claude.ai's suggestion prompts — pre-filled actions the user can execute with one tap.

## Constraints

- MUST be contextual (chips change based on time, role, task state)
- MUST use Lucide React icons (16px) inside each chip
- MUST be horizontally scrollable on mobile, wrapped grid on desktop
- MUST be large enough for elderly fingers (36px height minimum, 14px text)
- DO NOT show on agency owner dashboard (they have ManageActionGrid instead)
- Tap chip = navigate to action page OR pre-fill voice input

## Files to Read First

- `src/app/dashboard/page.tsx` — Where chips will be rendered
- `src/hooks/useTaskPriority.ts` — Task state for context
- `src/contexts/ElderContext.tsx` — Current elder context
- `src/lib/voice/voiceNavigation.ts` — Route mapping for commands
- `src/contexts/AuthContext.tsx` — User role for filtering

## Component Design

### Visual Layout

Mobile (horizontal scroll):
```
[💊 Log medications] [🍽️ Log meal] [💊 Supplements] [📝 Add note] [▶️ more...]
```

Desktop (wrapped, 2 rows):
```
[💊 Log medications] [🍽️ Log meal] [💊 Supplements]
[📝 Add note] [🔄 Shift handoff] [🤖 Ask AI]
```

### Chip Appearance

```
┌──────────────────────┐
│  [icon]  Label text  │
└──────────────────────┘

- Height: 36px
- Border-radius: rounded-full (pill shape)
- Border: 1px border-gray-200
- Background: bg-white (idle), bg-primary/10 (highlighted)
- Text: 14px, medium weight
- Icon: 16px, same color as text
- Padding: px-4 py-2
- Gap between icon and text: 6px
```

## Implementation Steps

### Step 1: Create SuggestionChips Component

Create `src/components/dashboard/SuggestionChips.tsx`:

```typescript
'use client';

interface ChipConfig {
  id: string;
  icon: LucideIcon;
  label: string;
  action: string; // route path or 'voice:command'
  highlighted?: boolean; // visually emphasize (e.g., overdue meds)
}

interface SuggestionChipsProps {
  overdueCount?: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  userRole: string;
  plan: string;
  mealsLoggedToday?: number;
}
```

### Step 2: Contextual Chip Logic

```typescript
function getChips(props: SuggestionChipsProps): ChipConfig[] {
  const chips: ChipConfig[] = [];

  // Always show:
  chips.push({
    id: 'log-meds',
    icon: Pill,
    label: 'Log medications',
    action: '/dashboard/daily-care?tab=medications',
    highlighted: props.overdueCount > 0,  // highlight if overdue
  });

  // Time-based meal chip:
  if (props.timeOfDay === 'morning' && props.mealsLoggedToday === 0) {
    chips.push({ id: 'breakfast', icon: UtensilsCrossed, label: 'Log breakfast', action: '/dashboard/daily-care?tab=diet' });
  } else if (props.timeOfDay === 'afternoon') {
    chips.push({ id: 'lunch', icon: UtensilsCrossed, label: 'Log lunch', action: '/dashboard/daily-care?tab=diet' });
  } else if (props.timeOfDay === 'evening') {
    chips.push({ id: 'dinner', icon: UtensilsCrossed, label: 'Log dinner', action: '/dashboard/daily-care?tab=diet' });
  } else {
    chips.push({ id: 'meal', icon: UtensilsCrossed, label: 'Log meal', action: '/dashboard/daily-care?tab=diet' });
  }

  // Supplements:
  chips.push({
    id: 'supplements',
    icon: Pill,  // or Leaf icon
    label: 'Supplements',
    action: '/dashboard/daily-care?tab=supplements',
  });

  // Add note:
  chips.push({
    id: 'note',
    icon: FileText,
    label: 'Add note',
    action: '/dashboard/notes/new',
  });

  // Role-specific:
  if (props.plan === 'multi-agency' && props.userRole !== 'super_admin') {
    chips.push({
      id: 'handoff',
      icon: ArrowRightLeft,
      label: 'Shift handoff',
      action: '/dashboard/shift-handoff',
    });
  }

  // Always available:
  chips.push({
    id: 'ask-ai',
    icon: Sparkles,
    label: 'Ask AI',
    action: '/dashboard/ask-ai',
  });

  return chips;
}
```

### Step 3: Render Component

```tsx
export function SuggestionChips(props: SuggestionChipsProps) {
  const router = useRouter();
  const chips = getChips(props);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide sm:flex-wrap sm:overflow-visible">
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={() => router.push(chip.action)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-full border whitespace-nowrap',
            'text-sm font-medium transition-colors',
            'hover:bg-gray-50 active:bg-gray-100',
            chip.highlighted
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-gray-200 bg-white text-gray-700'
          )}
          aria-label={chip.label}
        >
          <chip.icon className="w-4 h-4" />
          {chip.label}
        </button>
      ))}
    </div>
  );
}
```

### Step 4: Update Chips After Task Completion

When a task is completed (medication logged, meal logged, etc.), the chips should update:

```typescript
// Subscribe to task state changes:
const { tasks, stats } = useTaskPriority();

// Recalculate chips when stats change:
const chips = useMemo(
  () => getChips({ overdueCount: stats.overdue, ... }),
  [stats.overdue, timeOfDay, userRole, mealsLoggedToday]
);
```

### Step 5: Integrate into GuidedHome

Place after VoiceInputArea in the home screen:

```tsx
<VoiceInputArea />
<SuggestionChips
  overdueCount={stats.overdue}
  timeOfDay={getTimeOfDay()}
  userRole={user.role}
  plan={subscription.plan}
  mealsLoggedToday={mealsToday}
/>
```

## Accessibility

- Each chip: `role="button"`, `aria-label="{label}"`
- Highlighted chip: `aria-label="{label} - urgent"`
- Scroll container: `aria-label="Quick actions"`
- Tab-navigable (keyboard accessible)
- Focus ring visible on keyboard navigation

## Testing Requirements

- Correct chips shown for each time of day
- Highlighted chip when overdue tasks exist
- Role-specific chips (shift handoff for agency, not family)
- Tap navigates to correct route
- Horizontal scroll works on mobile
- Wrapped grid on desktop (>=640px)
- Chips update after task completion
- Agency owner does NOT see chips (sees ManageActionGrid)
- Run: `npm test -- --testPathPattern="chip|Chip|suggestion|Suggestion"`
