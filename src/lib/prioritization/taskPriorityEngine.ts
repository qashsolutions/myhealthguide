import { Medication, Supplement, MedicationLog, SupplementLog } from '@/types';

// ============= Types =============

export type TaskStatus = 'overdue' | 'due_now' | 'upcoming' | 'completed' | 'skipped';

export interface PrioritizedTask {
  id: string; // `${type}-${itemId}-${scheduledTime}`
  type: 'medication' | 'supplement';
  itemId: string;
  elderId: string;
  elderName: string;
  name: string;
  scheduledTime: string; // "08:00" in 24hr
  scheduledDate: Date; // full date-time for today
  status: TaskStatus;
  priority: number; // 1 (highest) to 100 (lowest)
  overdueMinutes: number;
  instructions?: string;
  dosage?: string;
}

// ============= Constants =============

const DUE_NOW_WINDOW_MINUTES = 15; // ±15 min from scheduled time
const LOG_MATCH_WINDOW_MINUTES = 30; // ±30 min window for log matching

// ============= Core Functions =============

/**
 * Parse a "HH:MM" time string into hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

/**
 * Create a Date object for today at a given "HH:MM" time
 */
function todayAtTime(timeStr: string, referenceDate: Date): Date {
  const { hours, minutes } = parseTime(timeStr);
  const d = new Date(referenceDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Get difference in minutes between two dates
 */
function diffMinutes(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / (1000 * 60);
}

/**
 * Check if a log matches a scheduled time within the ±30 min window
 */
function logMatchesScheduledTime(
  log: { scheduledTime: Date; createdAt: Date; status: string },
  scheduledDate: Date
): boolean {
  // Check against both scheduledTime and createdAt for flexibility
  const logTime = log.scheduledTime || log.createdAt;
  const diff = Math.abs(diffMinutes(logTime, scheduledDate));
  return diff <= LOG_MATCH_WINDOW_MINUTES;
}

/**
 * Calculate the status of a task based on scheduled time and logs
 */
export function calculateTaskStatus(
  scheduledTime: string,
  logs: Array<{ scheduledTime: Date; createdAt: Date; status: string }>,
  currentTime: Date
): { status: TaskStatus; overdueMinutes: number } {
  const scheduledDate = todayAtTime(scheduledTime, currentTime);

  // Find matching log for this time slot
  const matchingLog = logs.find(log => logMatchesScheduledTime(log, scheduledDate));

  if (matchingLog) {
    if (matchingLog.status === 'skipped') {
      return { status: 'skipped', overdueMinutes: 0 };
    }
    if (matchingLog.status === 'taken') {
      return { status: 'completed', overdueMinutes: 0 };
    }
  }

  // No matching log - calculate time-based status
  const minutesUntilDue = diffMinutes(scheduledDate, currentTime);

  if (minutesUntilDue < -DUE_NOW_WINDOW_MINUTES) {
    // Past the due window - overdue
    return { status: 'overdue', overdueMinutes: Math.abs(Math.round(minutesUntilDue)) };
  } else if (minutesUntilDue >= -DUE_NOW_WINDOW_MINUTES && minutesUntilDue <= DUE_NOW_WINDOW_MINUTES) {
    // Within ±15 min - due now
    return { status: 'due_now', overdueMinutes: 0 };
  } else {
    // Future - upcoming
    return { status: 'upcoming', overdueMinutes: 0 };
  }
}

/**
 * Calculate priority score based on status and overdue time
 * Lower number = higher priority
 */
function calculatePriority(status: TaskStatus, overdueMinutes: number): number {
  switch (status) {
    case 'overdue':
      // Most overdue = highest priority. Cap at priority 1
      return Math.max(1, 10 - Math.floor(overdueMinutes / 30));
    case 'due_now':
      return 20;
    case 'upcoming':
      return 50;
    case 'completed':
      return 90;
    case 'skipped':
      return 95;
    default:
      return 100;
  }
}

/**
 * Sort tasks by priority:
 * OVERDUE (by minutes late, desc) > DUE_NOW > UPCOMING (by time, asc) > COMPLETED
 */
export function prioritizeTasks(tasks: PrioritizedTask[]): PrioritizedTask[] {
  return [...tasks].sort((a, b) => {
    // Primary: status priority
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Secondary: overdue tasks sorted by most overdue first
    if (a.status === 'overdue' && b.status === 'overdue') {
      return b.overdueMinutes - a.overdueMinutes;
    }
    // Tertiary: upcoming tasks sorted by soonest first
    if (a.status === 'upcoming' && b.status === 'upcoming') {
      return a.scheduledDate.getTime() - b.scheduledDate.getTime();
    }
    // Default: by scheduled time
    return a.scheduledDate.getTime() - b.scheduledDate.getTime();
  });
}

/**
 * Get the highest priority non-completed task
 */
export function getNextTask(tasks: PrioritizedTask[]): PrioritizedTask | null {
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'skipped');
  if (activeTasks.length === 0) return null;
  return prioritizeTasks(activeTasks)[0];
}

/**
 * Check if a medication should generate tasks for today
 */
function shouldGenerateTasksToday(medication: Medication | Supplement, today: Date): boolean {
  const freq = medication.frequency;

  // As-needed medications don't generate timed tasks
  if (freq.type === 'asNeeded') return false;

  // No scheduled times means nothing to generate
  if (!freq.times || freq.times.length === 0) return false;

  // Weekly medications: check if today is one of the scheduled days
  if (freq.type === 'weekly' && freq.days && freq.days.length > 0) {
    const todayDay = today.getDay(); // 0=Sun, 1=Mon, ...
    return freq.days.includes(todayDay);
  }

  // Daily, twice_daily, three_times, four_times, custom: always generate
  return true;
}

/**
 * Generate all tasks for a given day from medications and supplements
 */
export function generateDayTasks(
  medications: Medication[],
  supplements: Supplement[],
  medicationLogs: MedicationLog[],
  supplementLogs: SupplementLog[],
  elderName: string,
  currentTime: Date
): PrioritizedTask[] {
  const tasks: PrioritizedTask[] = [];

  // Process medications
  for (const med of medications) {
    if (!shouldGenerateTasksToday(med, currentTime)) continue;

    // Filter logs for this medication today
    const medLogs = medicationLogs.filter(log => log.medicationId === med.id);

    for (const time of med.frequency.times) {
      const scheduledDate = todayAtTime(time, currentTime);
      const { status, overdueMinutes } = calculateTaskStatus(time, medLogs, currentTime);

      tasks.push({
        id: `medication-${med.id}-${time}`,
        type: 'medication',
        itemId: med.id,
        elderId: med.elderId,
        elderName,
        name: med.name,
        scheduledTime: time,
        scheduledDate,
        status,
        priority: calculatePriority(status, overdueMinutes),
        overdueMinutes,
        instructions: med.instructions,
        dosage: med.dosage,
      });
    }
  }

  // Process supplements
  for (const supp of supplements) {
    if (!shouldGenerateTasksToday(supp, currentTime)) continue;

    // Filter logs for this supplement today
    const suppLogs = supplementLogs.filter(log => log.supplementId === supp.id);

    for (const time of supp.frequency.times) {
      const scheduledDate = todayAtTime(time, currentTime);
      const { status, overdueMinutes } = calculateTaskStatus(time, suppLogs, currentTime);

      tasks.push({
        id: `supplement-${supp.id}-${time}`,
        type: 'supplement',
        itemId: supp.id,
        elderId: supp.elderId,
        elderName,
        name: supp.name,
        scheduledTime: time,
        scheduledDate,
        status,
        priority: calculatePriority(status, overdueMinutes),
        overdueMinutes,
        dosage: supp.dosage,
      });
    }
  }

  return prioritizeTasks(tasks);
}
