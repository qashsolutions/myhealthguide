'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  SkipForward,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskPriority } from '@/hooks/useTaskPriority';
import { logMedicationDoseOfflineAware } from '@/lib/offline';
import { SupplementService } from '@/lib/firebase/supplements';
import { useSuggestions } from '@/hooks/useSuggestions';
import { SuggestionBanner } from '@/components/dashboard/SuggestionBanner';
import type { PrioritizedTask } from '@/lib/prioritization/taskPriorityEngine';
import type { TriggerAction } from '@/lib/suggestions/suggestionEngine';

function formatTime12h(time24: string): string {
  const { hours, minutes } = parseTime24(time24);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function parseTime24(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

function formatOverdue(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getUserRole(user: any): 'admin' | 'caregiver' | 'member' {
  if (!user) return 'member';
  const agencyRole = user.agencies?.[0]?.role;
  if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') return 'admin';
  if (agencyRole === 'caregiver') return 'caregiver';
  const groupRole = user.groups?.[0]?.role;
  if (groupRole === 'admin') return 'admin';
  return 'member';
}

export function PriorityCard() {
  const { user } = useAuth();
  const { nextTask, tasks, completedCount, totalCount, refreshPriorities, isLoading } = useTaskPriority();
  const { suggestions, visible: suggestionsVisible, triggerSuggestion, dismissSuggestions } = useSuggestions();
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = useCallback((message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  const handleMarkComplete = async (task: PrioritizedTask) => {
    if (!user || actionLoading) return;
    setActionLoading(true);

    try {
      const role = getUserRole(user);

      if (task.type === 'medication') {
        const doseData: any = {
          medicationId: task.itemId,
          groupId: '', // Will be filled from medication data
          elderId: task.elderId,
          scheduledTime: task.scheduledDate,
          actualTime: new Date(),
          status: 'taken',
          method: 'manual',
          loggedBy: user.id,
          createdAt: new Date(),
        };

        // Get groupId from user's group membership
        const groupId = user.groups?.[0]?.groupId || user.agencies?.[0]?.assignedGroupIds?.[0] || '';
        doseData.groupId = groupId;

        const result = await logMedicationDoseOfflineAware(doseData, user.id, role);
        if (!result.success) {
          throw new Error(result.error || 'Failed to log medication');
        }
      } else if (task.type === 'supplement') {
        const groupId = user.groups?.[0]?.groupId || user.agencies?.[0]?.assignedGroupIds?.[0] || '';
        await SupplementService.logIntake(
          {
            supplementId: task.itemId,
            groupId,
            elderId: task.elderId,
            scheduledTime: task.scheduledDate,
            actualTime: new Date(),
            status: 'taken',
            method: 'manual',
            loggedBy: user.id,
            createdAt: new Date(),
          },
          user.id,
          role
        );
      }

      showFeedback(`${task.name} logged at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, 'success');
      await refreshPriorities();
      const action: TriggerAction = task.type === 'medication' ? 'LOG_MEDICATION' : 'LOG_SUPPLEMENT';
      triggerSuggestion(action);
    } catch (error) {
      console.error('[PriorityCard] Error logging task:', error);
      showFeedback('Failed to log. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async (task: PrioritizedTask) => {
    if (!user || actionLoading) return;
    setActionLoading(true);

    try {
      const role = getUserRole(user);

      if (task.type === 'medication') {
        const groupId = user.groups?.[0]?.groupId || user.agencies?.[0]?.assignedGroupIds?.[0] || '';
        const doseData: any = {
          medicationId: task.itemId,
          groupId,
          elderId: task.elderId,
          scheduledTime: task.scheduledDate,
          status: 'skipped',
          method: 'manual',
          loggedBy: user.id,
          notes: 'Skipped via priority card',
          createdAt: new Date(),
        };

        const result = await logMedicationDoseOfflineAware(doseData, user.id, role);
        if (!result.success) {
          throw new Error(result.error || 'Failed to skip medication');
        }
      } else if (task.type === 'supplement') {
        const groupId = user.groups?.[0]?.groupId || user.agencies?.[0]?.assignedGroupIds?.[0] || '';
        await SupplementService.logIntake(
          {
            supplementId: task.itemId,
            groupId,
            elderId: task.elderId,
            scheduledTime: task.scheduledDate,
            status: 'skipped',
            method: 'manual',
            loggedBy: user.id,
            notes: 'Skipped via priority card',
            createdAt: new Date(),
          },
          user.id,
          role
        );
      }

      showFeedback(`${task.name} skipped`, 'success');
      await refreshPriorities();
      const action: TriggerAction = task.type === 'medication' ? 'LOG_MEDICATION' : 'LOG_SUPPLEMENT';
      triggerSuggestion(action);
    } catch (error) {
      console.error('[PriorityCard] Error skipping task:', error);
      showFeedback('Failed to skip. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[160px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </Card>
    );
  }

  // No tasks at all (no medications/supplements configured)
  if (totalCount === 0) {
    return null;
  }

  // All done state
  if (!nextTask) {
    const upcomingTasks = tasks.filter(t => t.status === 'upcoming');
    const nextUpcoming = upcomingTasks.length > 0 ? upcomingTasks[0] : null;

    return (
      <Card className="p-5 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
          <span className="text-lg font-semibold text-green-800 dark:text-green-200">
            All caught up!
          </span>
        </div>
        <p className="text-sm text-green-700 dark:text-green-300 ml-10">
          {completedCount}/{totalCount} tasks completed today
        </p>
        {nextUpcoming && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 ml-10">
            Next: {nextUpcoming.name} at {formatTime12h(nextUpcoming.scheduledTime)}
          </p>
        )}
      </Card>
    );
  }

  // Active task state (overdue, due_now, or upcoming)
  const task = nextTask;
  const isOverdue = task.status === 'overdue';
  const isDueNow = task.status === 'due_now';

  return (
    <div className="relative">
      {/* Feedback toast */}
      {feedback && (
        <div
          className={cn(
            'absolute -top-12 left-0 right-0 z-10 px-4 py-2 rounded-lg text-sm font-medium text-center transition-opacity',
            feedback.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
          )}
        >
          {feedback.message}
        </div>
      )}

      {/* CTA Banner style */}
      <div
        className={cn(
          'rounded-lg border px-4 py-3 transition-colors',
          isOverdue && 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
          isDueNow && 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20',
          !isOverdue && !isDueNow && 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
        )}
      >
        {/* Overdue / Due Now: compact CTA with inline action */}
        {(isOverdue || isDueNow) ? (
          <div className="flex items-center gap-3">
            {/* Status icon + text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {isOverdue ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
                <span className={cn(
                  'font-semibold text-sm truncate',
                  isOverdue ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'
                )}>
                  {task.name} {task.dosage || ''}
                </span>
                <span className={cn(
                  'text-xs whitespace-nowrap',
                  isOverdue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                )}>
                  — {isOverdue ? `${formatOverdue(task.overdueMinutes || 0)} overdue` : 'due now'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-5.5 pl-px">
                for {task.elderName} · {isOverdue ? 'was due' : 'due'} at {formatTime12h(task.scheduledTime)}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleMarkComplete(task)}
                disabled={actionLoading}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors disabled:opacity-50',
                  isOverdue
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {actionLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Mark as Given'
                )}
              </button>
              <button
                onClick={() => handleSkip(task)}
                disabled={actionLoading}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                aria-label="Skip this task"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Upcoming: compact informational */
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Next: <span className="font-medium text-gray-800 dark:text-gray-200">{task.name}</span> at {formatTime12h(task.scheduledTime)}
            </span>
          </div>
        )}
      </div>

      {/* Auto-suggest banner */}
      <SuggestionBanner
        suggestions={suggestions}
        visible={suggestionsVisible}
        onDismiss={dismissSuggestions}
        onSelect={dismissSuggestions}
      />
    </div>
  );
}
