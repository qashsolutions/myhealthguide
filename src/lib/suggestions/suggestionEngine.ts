import type { PrioritizedTask } from '@/lib/prioritization/taskPriorityEngine';

export type SuggestionAction =
  | 'LOG_MEDICATION'
  | 'LOG_SUPPLEMENT'
  | 'LOG_MEAL'
  | 'ADD_NOTE'
  | 'VIEW_REPORT'
  | 'GO_HOME'
  | 'DISMISS';

export interface Suggestion {
  id: string;
  text: string;
  icon: 'Pill' | 'Leaf' | 'Utensils' | 'FileText' | 'BarChart3' | 'Home' | 'Check';
  action: SuggestionAction;
  href?: string; // Navigation path
  priority: 'recommended' | 'normal';
}

export type TriggerAction =
  | 'LOG_MEDICATION'
  | 'LOG_SUPPLEMENT'
  | 'LOG_MEAL'
  | 'ADD_NOTE'
  | 'COMPLETE_ALL_TASKS';

interface SuggestionState {
  tasks: PrioritizedTask[];
  currentTime: Date;
}

/**
 * Get contextual suggestions after an action is completed
 */
export function getSuggestions(
  afterAction: TriggerAction,
  state: SuggestionState
): Suggestion[] {
  const { tasks, currentTime } = state;
  const hour = currentTime.getHours();

  const dueTasks = tasks.filter(t => t.status === 'due_now' || t.status === 'overdue');
  const upcomingMeds = tasks.filter(t => t.type === 'medication' && t.status === 'upcoming');
  const upcomingSupps = tasks.filter(t => t.type === 'supplement' && t.status === 'upcoming');

  const suggestions: Suggestion[] = [];

  switch (afterAction) {
    case 'LOG_MEDICATION': {
      // If there are more due medications, suggest those first
      const nextDueMed = dueTasks.find(t => t.type === 'medication');
      if (nextDueMed) {
        suggestions.push({
          id: `log-med-${nextDueMed.itemId}`,
          text: `Log ${nextDueMed.name}`,
          icon: 'Pill',
          action: 'LOG_MEDICATION',
          priority: 'recommended',
        });
      }

      // If supplements are due
      const nextDueSupp = dueTasks.find(t => t.type === 'supplement');
      if (nextDueSupp) {
        suggestions.push({
          id: `log-supp-${nextDueSupp.itemId}`,
          text: `Log ${nextDueSupp.name}`,
          icon: 'Leaf',
          action: 'LOG_SUPPLEMENT',
          priority: suggestions.length === 0 ? 'recommended' : 'normal',
        });
      }

      // Time-based meal suggestion
      if (hour >= 6 && hour < 10) {
        suggestions.push({
          id: 'log-breakfast',
          text: 'Log breakfast',
          icon: 'Utensils',
          action: 'LOG_MEAL',
          href: '/dashboard/daily-care?tab=diet',
          priority: 'normal',
        });
      } else if (hour >= 11 && hour < 14) {
        suggestions.push({
          id: 'log-lunch',
          text: 'Log lunch',
          icon: 'Utensils',
          action: 'LOG_MEAL',
          href: '/dashboard/daily-care?tab=diet',
          priority: 'normal',
        });
      } else if (hour >= 17 && hour < 21) {
        suggestions.push({
          id: 'log-dinner',
          text: 'Log dinner',
          icon: 'Utensils',
          action: 'LOG_MEAL',
          href: '/dashboard/daily-care?tab=diet',
          priority: 'normal',
        });
      }
      break;
    }

    case 'LOG_SUPPLEMENT': {
      // More supplements due
      const nextSupp = dueTasks.find(t => t.type === 'supplement');
      if (nextSupp) {
        suggestions.push({
          id: `log-supp-${nextSupp.itemId}`,
          text: `Log ${nextSupp.name}`,
          icon: 'Leaf',
          action: 'LOG_SUPPLEMENT',
          priority: 'recommended',
        });
      }

      // Medications due
      const nextMed = dueTasks.find(t => t.type === 'medication');
      if (nextMed) {
        suggestions.push({
          id: `log-med-${nextMed.itemId}`,
          text: `Log ${nextMed.name}`,
          icon: 'Pill',
          action: 'LOG_MEDICATION',
          priority: suggestions.length === 0 ? 'recommended' : 'normal',
        });
      }
      break;
    }

    case 'LOG_MEAL': {
      // If medications are due, suggest those
      const nextMed = dueTasks.find(t => t.type === 'medication');
      if (nextMed) {
        suggestions.push({
          id: `log-med-${nextMed.itemId}`,
          text: `Log ${nextMed.name} with meal`,
          icon: 'Pill',
          action: 'LOG_MEDICATION',
          priority: 'recommended',
        });
      }

      // Supplements with meal
      const nextSupp = dueTasks.find(t => t.type === 'supplement');
      if (nextSupp) {
        suggestions.push({
          id: `log-supp-${nextSupp.itemId}`,
          text: `Log ${nextSupp.name}`,
          icon: 'Leaf',
          action: 'LOG_SUPPLEMENT',
          priority: suggestions.length === 0 ? 'recommended' : 'normal',
        });
      }
      break;
    }

    case 'ADD_NOTE': {
      // After note, check for overdue tasks
      if (dueTasks.length > 0) {
        suggestions.push({
          id: 'handle-overdue',
          text: `${dueTasks.length} task${dueTasks.length > 1 ? 's' : ''} due`,
          icon: 'Pill',
          action: 'GO_HOME',
          href: '/dashboard',
          priority: 'recommended',
        });
      }
      break;
    }

    case 'COMPLETE_ALL_TASKS': {
      // All done - suggest end-of-day actions
      if (hour >= 17) {
        suggestions.push({
          id: 'add-observations',
          text: 'Add daily observations',
          icon: 'FileText',
          action: 'ADD_NOTE',
          href: '/dashboard/notes/new',
          priority: 'recommended',
        });
      }
      suggestions.push({
        id: 'view-report',
        text: 'View today\'s report',
        icon: 'BarChart3',
        action: 'VIEW_REPORT',
        href: '/dashboard/activity',
        priority: 'normal',
      });
      break;
    }
  }

  // Default fallback if no suggestions
  if (suggestions.length === 0 && dueTasks.length === 0) {
    suggestions.push({
      id: 'all-done',
      text: 'All caught up!',
      icon: 'Check',
      action: 'DISMISS',
      priority: 'recommended',
    });
  }

  // Limit to 3 suggestions max
  return suggestions.slice(0, 3);
}
