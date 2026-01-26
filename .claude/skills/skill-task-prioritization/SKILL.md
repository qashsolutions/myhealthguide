---
name: skill-task-prioritization
description: Time-based task prioritization engine that calculates due/overdue/upcoming tasks from medication and supplement schedules. Use when implementing the priority system, task ordering, due-now calculations, or overdue detection. Reads from medications and supplements collections using existing Firestore queries.
---

## Objective

Build a client-side task prioritization engine that:
1. Reads medication `times[]` and supplement schedules
2. Calculates task states: OVERDUE, DUE_NOW, UPCOMING, COMPLETED
3. Orders tasks by urgency
4. Provides the "next task" for auto-suggest
5. Runs entirely client-side (no new Firestore collections needed)

## Constraints

- DO NOT create new Firestore collections or modify rules
- DO NOT modify existing API calls or data fetching hooks
- MUST use existing data hooks: `useMedications()`, `useSupplements()`, `useMedicationLogs()`, `useSupplementLogs()`
- MUST handle timezone correctly (user's local time)
- MUST be performant -- recalculate only when data changes or on minute-tick
- Store transient state in React context or Zustand (check which state management exists)

## Files to Read First

- `src/types/index.ts` -- Medication, Supplement, MedicationLog, SupplementLog interfaces
- `src/hooks/useMedications.ts` -- Existing data fetching hook
- `src/hooks/useSupplements.ts` -- Existing data fetching hook
- `src/hooks/useMedicationLogs.ts` -- Existing log fetching
- `src/hooks/useSupplementLogs.ts` -- Existing log fetching
- `src/app/dashboard/daily-care/page.tsx` -- How daily care currently works
- `src/lib/utils.ts` -- Existing utility functions

## Data Model

### Medication `times[]` Structure
```typescript
interface Medication {
  id: string;
  name: string;
  elderId: string;
  groupId: string;
  frequency: {
    type: 'daily' | 'twice_daily' | 'three_times' | 'four_times' | 'as_needed' | 'custom';
    times: string[]; // ["08:00", "14:00", "20:00"] in 24hr format
  };
  dosage: string;
  instructions?: string;
  // ... other fields
}
```

### Task Priority Interface (NEW)
```typescript
interface PrioritizedTask {
  id: string; // `${type}-${itemId}-${scheduledTime}`
  type: 'medication' | 'supplement' | 'meal' | 'appointment';
  itemId: string; // medication/supplement document ID
  elderId: string;
  elderName: string;
  name: string; // "Metformin 500mg" or "Vitamin D"
  scheduledTime: string; // "08:00" in 24hr
  scheduledDate: Date; // full date-time
  status: 'overdue' | 'due_now' | 'upcoming' | 'completed' | 'skipped';
  priority: number; // 1 (highest) to 100 (lowest)
  overdueMinutes: number; // how many minutes past due
  instructions?: string;
  dosage?: string;
}
```

## Implementation Steps

### Step 1: Create Priority Engine

Create `src/lib/prioritization/taskPriorityEngine.ts`:

```
Functions:
1. calculateTaskStatus(scheduledTime: string, logs: Log[], currentTime: Date): TaskStatus
   - OVERDUE: scheduledTime has passed, no log entry within +-30min window
   - DUE_NOW: within 15 minutes before/after scheduledTime
   - UPCOMING: more than 15 minutes until scheduledTime
   - COMPLETED: log entry exists within +-30min window of scheduledTime
   - SKIPPED: explicitly marked as skipped in logs

2. prioritizeTasks(tasks: PrioritizedTask[]): PrioritizedTask[]
   - Sort order: OVERDUE (by minutes late, desc) > DUE_NOW > UPCOMING (by time, asc)
   - Remove COMPLETED from active list

3. getNextTask(tasks: PrioritizedTask[]): PrioritizedTask | null
   - Returns the highest priority non-completed task

4. generateDayTasks(medications: Medication[], supplements: Supplement[], logs: Log[], date: Date): PrioritizedTask[]
   - Expands all scheduled items into individual time-slot tasks for the day
```

### Step 2: Create Priority Context Provider

Create `src/contexts/TaskPriorityContext.tsx`:

```
Provides:
- tasks: PrioritizedTask[] (all today's tasks, sorted)
- nextTask: PrioritizedTask | null
- overdueTasks: PrioritizedTask[]
- completedCount: number
- totalCount: number
- completionPercentage: number
- refreshPriorities(): void

Behavior:
- Wraps inside ElderProvider (needs elder data)
- Re-calculates every 60 seconds via setInterval
- Re-calculates when medication_logs or supplement_logs change
- Handles multiple elders (for agency caregivers)
```

### Step 3: Create Custom Hook

Create `src/hooks/useTaskPriority.ts`:

```
export function useTaskPriority() {
  return useContext(TaskPriorityContext);
}

export function useNextTask() {
  const { nextTask } = useTaskPriority();
  return nextTask;
}

export function useOverdueTasks() {
  const { overdueTasks } = useTaskPriority();
  return overdueTasks;
}
```

### Step 4: Integrate into Dashboard Layout

In `src/app/dashboard/layout.tsx`, wrap content with `TaskPriorityProvider`:

```tsx
<ProtectedRoute>
  <ElderProvider>
    <TaskPriorityProvider>  {/* NEW */}
      <FCMProvider>
        {/* layout content */}
      </FCMProvider>
    </TaskPriorityProvider>
  </ElderProvider>
</ProtectedRoute>
```

### Step 5: Create Human-Readable Time Formatter

Create `src/lib/utils/formatTimeDistance.ts`:

```typescript
/**
 * Converts raw minutes into human-readable time display.
 * NEVER show raw minutes to users — always use this function.
 *
 * Examples:
 *   formatOverdue(45) → "~45 min late"
 *   formatOverdue(180) → "~3 hours late"
 *   formatOverdue(1313) → "~21 hours late"
 *   formatOverdue(2880) → "~2 days late"
 *   formatUpcoming(30) → "in ~30 min"
 *   formatUpcoming(120) → "in ~2 hours"
 */
export function formatTimeDistance(minutes: number, direction: 'overdue' | 'upcoming'): string {
  const absMin = Math.abs(minutes);
  let timeStr: string;

  if (absMin < 60) {
    timeStr = `~${absMin} min`;
  } else if (absMin < 120) {
    timeStr = '~1 hour';
  } else if (absMin < 1440) {
    timeStr = `~${Math.round(absMin / 60)} hours`;
  } else {
    const days = Math.round(absMin / 1440);
    timeStr = `~${days} day${days > 1 ? 's' : ''}`;
  }

  return direction === 'overdue' ? `${timeStr} late` : `in ${timeStr}`;
}
```

This function MUST be used anywhere overdue/upcoming time is displayed in the UI.
NEVER display raw "1258 MIN LATE" or "1313 MIN LATE" — always pass through this formatter.

## Edge Cases

- **As-needed medications**: Do not generate timed tasks; show in "available" section only
- **Multiple elders**: Generate separate task lists per elder; interleave by time for agency caregivers
- **Timezone changes**: Use `Intl.DateTimeFormat` with user's timezone
- **No scheduled times**: If `times[]` is empty, skip that medication
- **Logged early**: A log 30+ min before scheduled time counts as "early" -- still show scheduled task
- **Midnight boundary**: Tasks for "23:30" should not carry over to next day unless still overdue at midnight

## Testing Requirements

- Unit tests for `calculateTaskStatus()` with various time scenarios
- Unit tests for `prioritizeTasks()` sort order
- Unit tests for `generateDayTasks()` expansion
- Integration test: mock medications + logs, verify priority output
- Edge case: empty medications list returns empty tasks
- Edge case: all tasks completed returns 100% completion
- Run: `npm test -- --testPathPattern=prioritization`
